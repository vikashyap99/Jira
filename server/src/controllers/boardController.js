const Board = require('../models/Board');
const { Column, DEFAULT_COLUMNS } = require('../models/Column');
const { Ticket } = require('../models/Ticket');
const { success, failure } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { WorkspaceMember } = require('../models/WorkspaceMember');

async function assertWorkspaceMembership(workspaceId, userId, res) {
  const membership = await WorkspaceMember.findOne({ workspace: workspaceId, user: userId });
  if (!membership) {
    failure(res, 'You are not a member of this workspace', 403);
    return null;
  }
  return membership;
}

const listBoards = asyncHandler(async (req, res) => {
  const workspaceId = req.query.workspace;
  const membership = await assertWorkspaceMembership(workspaceId, req.userId, res);
  if (!membership) return;

  const boards = await Board.find({ workspace: workspaceId })
    .populate({
      path: 'workspace',
      select: 'name',
    })
    .sort('createdAt');
  return success(res, { boards });
});

const getBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) {
    return failure(res, 'Board not found', 404);
  }
  const membership = await assertWorkspaceMembership(board.workspace, req.userId, res);
  if (!membership) return;

  const columns = await Column.find({ board: board._id }).sort('order');
  const tickets = await Ticket.find({ board: board._id }).populate(
    'assignees reporter',
    'firstName lastName email avatarUrl'
  );
  const memberDocs = await require('../models/WorkspaceMember').WorkspaceMember.find({
    workspace: board.workspace,
  }).populate('user', 'firstName lastName email avatarUrl');

  return success(res, {
    board,
    columns,
    tickets: tickets.map((t) => ({ ...t.toObject(), assignees: t.assignees || [], reporter: t.reporter || null })),
    myRole: membership.role,
    members: memberDocs
      .filter((m) => m.user)
      .map((m) => ({
        memberId: m._id,
        role: m.role,
        user: {
          id: m.user._id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
        },
      })),
  });
});

const createBoard = asyncHandler(async (req, res) => {
  const { workspace, name, description } = req.body;
  const membership = await assertWorkspaceMembership(workspace, req.userId, res);
  if (!membership) return;
  if (membership.role === 'member') {
    return failure(res, 'Members cannot create boards', 403);
  }

  const board = await Board.create({
    name,
    description,
    workspace,
    createdBy: req.userId,
  });

  const columnDocs = DEFAULT_COLUMNS.map((c, idx) => ({
    ...c,
    board: board._id,
    order: idx,
  }));
  await Column.insertMany(columnDocs);

  return success(res, { board }, 201);
});

const updateBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) {
    return failure(res, 'Board not found', 404);
  }
  const membership = await assertWorkspaceMembership(board.workspace, req.userId, res);
  if (!membership) return;
  if (membership.role === 'member') {
    return failure(res, 'Members cannot edit boards', 403);
  }

  const { name, description } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;

  const updated = await Board.findByIdAndUpdate(board._id, update, { new: true });
  return success(res, { board: updated });
});

const deleteBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.id);
  if (!board) {
    return failure(res, 'Board not found', 404);
  }
  const membership = await assertWorkspaceMembership(board.workspace, req.userId, res);
  if (!membership) return;
  if (membership.role !== 'owner') {
    return failure(res, 'Only owners can delete boards', 403);
  }

  await Column.deleteMany({ board: board._id });
  await Ticket.deleteMany({ board: board._id });
  await Board.findByIdAndDelete(board._id);
  return success(res, { message: 'Board deleted' });
});

module.exports = { listBoards, getBoard, createBoard, updateBoard, deleteBoard };
