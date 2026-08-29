const { Ticket } = require('../models/Ticket');
const Board = require('../models/Board');
const { Column } = require('../models/Column');
const { WorkspaceMember } = require('../models/WorkspaceMember');
const User = require('../models/User');
const { success, failure } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const emailService = require('../services/email');

async function assertTicketAccess(ticket, userId) {
  const membership = await WorkspaceMember.findOne({
    workspace: ticket.workspace,
    user: userId,
  });
  if (!membership) return { error: { message: 'You are not a member of this workspace', status: 403 } };
  return { membership };
}

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

// Normalize incoming attachments (client sends base64 data URLs) into the
// shape stored on the ticket. Returns { attachments, error }.
function processAttachments(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return { attachments: [] };
  const attachments = [];
  for (const a of raw) {
    if (!a || typeof a.url !== 'string') return { error: 'Invalid attachment' };
    const url = a.url;
    const isMedia = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/.test(url) ||
      /^data:video\/(mp4|webm|quicktime);base64,/.test(url) ||
      /^data:audio\/(mp3|wav|mpeg);base64,/.test(url);
    if (!isMedia) return { error: 'Only image/media files (PNG, JPEG, GIF, video, audio) can be attached' };
    const b64 = url.split(',')[1] || '';
    const approxBytes = Math.floor((b64.length * 3) / 4);
    if (approxBytes > MAX_ATTACHMENT_BYTES) return { error: 'Attachment exceeds 5 MB limit' };
    attachments.push({
      name: String(a.name || 'attachment').slice(0, 200),
      url,
      size: a.size || approxBytes,
      uploadedBy: a.uploadedBy,
    });
  }
  return { attachments };
}

const listTickets = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = {};

  if (q.workspace) filter.workspace = q.workspace;
  if (q.board) filter.board = q.board;
  if (q.column) filter.column = q.column;
  if (q.assignee) filter.assignees = q.assignee;
  if (q.reporter) filter.reporter = q.reporter;
  if (q.priority) filter.priority = q.priority;
  if (q.label) filter.labels = q.label;

  let mongooseQuery = Ticket.find(filter);

  if (q.q) {
    mongooseQuery = mongooseQuery.find({ $text: { $search: q.q } });
  }

  const sortDir = q.sortDir === 'desc' ? -1 : 1;
  const sortMap = {
    priority: { priority: sortDir },
    dueDate: { dueDate: sortDir },
    createdAt: { createdAt: sortDir },
    updatedAt: { updatedAt: sortDir },
    order: { order: sortDir },
  };
  const sort = sortMap[q.sortBy] || { order: 1 };

  const page = parseInt(q.page, 10) || 1;
  const limit = parseInt(q.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const populated = mongooseQuery
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('assignees reporter', 'firstName lastName email avatarUrl');

  const [tickets, total] = await Promise.all([
    populated,
    Ticket.countDocuments(filter),
  ]);

  const result = tickets.map((t) => ({
    ...t.toObject(),
    assignees: t.assignees || [],
    reporter: t.reporter || null,
    attachments: (t.attachments || []).map((a) => ({ name: a.name, size: a.size, uploadedBy: a.uploadedBy, uploadedAt: a.uploadedAt })),
  }));

  return success(res, {
    tickets: result,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('assignees reporter watchers', 'firstName lastName email avatarUrl')
    .populate('board', 'name workspace');
  if (!ticket) {
    return failure(res, 'Ticket not found', 404);
  }
  const { error } = await assertTicketAccess(ticket, req.userId);
  if (error) return failure(res, error.message, error.status);

  const result = ticket.toObject();
  result.statusHistory = [];
  const columnIds = [...new Set((ticket.statusHistory || []).map((h) => String(h.column)))];
  const userIds = [...new Set((ticket.statusHistory || []).map((h) => String(h.changedBy)))];
  const [columns, historyUsers] = await Promise.all([
    Column.find({ _id: { $in: columnIds } }).select('name'),
    User.find({ _id: { $in: userIds } }).select('firstName lastName email'),
  ]);
  const colMap = new Map(columns.map((c) => [String(c._id), c.name]));
  const userMap = new Map(historyUsers.map((u) => [String(u._id), u]));
  for (const h of ticket.statusHistory || []) {
    result.statusHistory.push({
      column: h.column ? colMap.get(String(h.column)) || h.column : null,
      changedBy: h.changedBy ? userMap.get(String(h.changedBy)) || h.changedBy : null,
      changedAt: h.changedAt,
    });
  }

  return success(res, { ticket: result });
});

const createTicket = asyncHandler(async (req, res) => {
  const { board, title, description, assignees, priority, labels, dueDate, column, attachments: rawAttachments } = req.body;

  const { attachments, error: attachError } = processAttachments(rawAttachments);
  if (attachError) return failure(res, attachError, 400);

  const boardDoc = await Board.findById(board);
  if (!boardDoc) {
    return failure(res, 'Board not found', 404);
  }
  const membership = await WorkspaceMember.findOne({
    workspace: boardDoc.workspace,
    user: req.userId,
  });
  if (!membership) {
    return failure(res, 'You are not a member of this workspace', 403);
  }

  let targetColumn = column;
  if (!targetColumn) {
    const first = await Column.find({ board }).sort('order').limit(1);
    targetColumn = first[0] ? first[0]._id : null;
  }

  const maxOrder = await Ticket.findOne({ board, column: targetColumn }).sort('-order').select('order');
  const ticket = await Ticket.create({
    board,
    workspace: boardDoc.workspace,
    title,
    description,
    assignees,
    reporter: req.userId,
    priority,
    labels,
    dueDate,
    column: targetColumn,
    order: (maxOrder ? maxOrder.order : -1) + 1,
    attachments,
  });

  // NOTE: No email is sent on ticket creation. Notifications are limited to
  // comments and when a ticket moves to "Done" (see moveTicket).

  return success(res, { ticket }, 201);
});

const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return failure(res, 'Ticket not found', 404);
  }
  const { membership } = await assertTicketAccess(ticket, req.userId);

  const fields = ['title', 'description', 'priority', 'labels', 'dueDate', 'column', 'assignees'];
  let oldColumn = null;
  let newAssignees = null;

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      if (field === 'column' && req.body[field] !== ticket.column?.toString()) {
        oldColumn = ticket.column;
      }
      if (field === 'assignees') {
        newAssignees = req.body[field];
      }
      ticket[field] = req.body[field];
    }
  }

  // Members can only edit tickets they created
  if (membership.role === 'member' && ticket.reporter.toString() !== req.userId) {
    return failure(res, 'Members can only edit their own tickets', 403);
  }

  if (req.body.attachments !== undefined) {
    const { attachments, error: attachError } = processAttachments(req.body.attachments);
    if (attachError) return failure(res, attachError, 400);
    ticket.attachments = attachments;
  }

  if (oldColumn) {
    ticket.statusHistory.push({ column: oldColumn, changedBy: req.userId });
  }

  await ticket.save();

  // NOTE: No email on ticket edit. Notifications are limited to comments and
  // when a ticket moves to "Done" (see moveTicket).

  const updated = await Ticket.findById(ticket._id).populate(
    'assignees reporter',
    'firstName lastName email avatarUrl'
  );
  return success(res, { ticket: updated });
});

const moveTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return failure(res, 'Ticket not found', 404);
  }
  const { membership } = await assertTicketAccess(ticket, req.userId);
  if (membership.role === 'member' && ticket.reporter.toString() !== req.userId) {
    return failure(res, 'Members can only move their own tickets', 403);
  }

  const { column, order } = req.body;
  const oldColumn = ticket.column ? ticket.column.toString() : null;
  const requestedColumnId = column ? column.toString() : oldColumn;
  const targetColumnId = requestedColumnId || oldColumn;

  if (!targetColumnId) {
    return failure(res, 'Ticket has no column to move into', 400);
  }

  const columnChanged = column && oldColumn !== requestedColumnId;

  if (columnChanged) {
    ticket.column = targetColumnId;
    ticket.statusHistory.push({ column: oldColumn, changedBy: req.userId });
  }

  const siblings = await Ticket.find({
    board: ticket.board,
    column: targetColumnId,
    _id: { $ne: ticket._id },
  }).sort('order');

  let insertAt = order !== undefined ? order : siblings.length;

  const reordered = [...siblings];
  reordered.splice(insertAt, 0, ticket._id);

  const bulk = reordered.map((tid, idx) => ({
    updateOne: { filter: { _id: tid }, update: { $set: { order: idx } } },
  }));
  bulk.push({ updateOne: { filter: { _id: ticket._id }, update: { $set: { order: insertAt, column: targetColumnId } } } });
  await Ticket.bulkWrite(bulk);

  // Email is sent only when a ticket moves into a "Done" column. All other
  // status changes are silent; notifications are limited to comments and done.
  if (columnChanged) {
    const colTo = await Column.findById(targetColumnId);
    const isDone = String(colTo?.name || '').trim().toLowerCase() === 'done';
    if (isDone) {
      const colFrom = await Column.findById(oldColumn);
      const targetUsers = await User.find({ _id: { $in: [...ticket.assignees, ticket.reporter] } });
      for (const u of targetUsers) {
        if (u._id.toString() === req.userId) continue;
        emailService.ticketStatusChanged({
          to: u.email,
          ticketTitle: ticket.title,
          from: colFrom?.name || 'Unknown',
          to: colTo?.name || 'Unknown',
          changedByName: req.user.firstName || 'Someone',
        });
      }
    }
  }

  return success(res, { ticket });
});

const watchTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return failure(res, 'Ticket not found', 404);
  }
  const { error } = await assertTicketAccess(ticket, req.userId);
  if (error) return failure(res, error.message, error.status);

  const isWatching = ticket.watchers.some((w) => w.toString() === req.userId);
  await Ticket.updateOne(
    { _id: ticket._id },
    isWatching
      ? { $pull: { watchers: req.userId } }
      : { $addToSet: { watchers: req.userId } }
  );

  const refreshed = await Ticket.findById(ticket._id).populate(
    'assignees reporter watchers',
    'firstName lastName email avatarUrl'
  );
  return success(res, { ticket: refreshed, watching: !isWatching });
});

const deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return failure(res, 'Ticket not found', 404);
  }
  const { membership } = await assertTicketAccess(ticket, req.userId);
  if (membership.role === 'member' && ticket.reporter.toString() !== req.userId) {
    return failure(res, 'Members can only delete their own tickets', 403);
  }

  await Ticket.findByIdAndDelete(ticket._id);
  return success(res, { message: 'Ticket deleted' });
});

module.exports = { listTickets, getTicket, createTicket, updateTicket, moveTicket, watchTicket, deleteTicket };
