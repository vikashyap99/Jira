const Board = require('../models/Board');
const { Column } = require('../models/Column');
const { Ticket } = require('../models/Ticket');
const { success, failure } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { WorkspaceMember } = require('../models/WorkspaceMember');

async function assertBoardAccess(boardId, userId) {
  const board = await Board.findById(boardId);
  if (!board) return { error: { message: 'Board not found', status: 404 } };
  const membership = await WorkspaceMember.findOne({ workspace: board.workspace, user: userId });
  if (!membership)
    return { error: { message: 'You are not a member of this workspace', status: 403 } };
  return { board, membership };
}

const listColumns = asyncHandler(async (req, res) => {
  const boardId = req.params.boardId || req.query.board;
  const { error } = await assertBoardAccess(boardId, req.userId);
  if (error) return failure(res, error.message, error.status);

  const columns = await Column.find({ board: boardId }).sort('order');
  return success(res, { columns });
});

const createColumn = asyncHandler(async (req, res) => {
  const { board, name, color, wipLimit } = req.body;
  const { error, membership } = await assertBoardAccess(board, req.userId);
  if (error) return failure(res, error.message, error.status);
  if (membership.role === 'member') {
    return failure(res, 'Members cannot create columns', 403);
  }

  const maxOrder = await Column.findOne({ board }).sort('-order').select('order');
  const column = await Column.create({
    board,
    name,
    color,
    wipLimit,
    order: (maxOrder ? maxOrder.order : -1) + 1,
  });

  return success(res, { column }, 201);
});

const updateColumn = asyncHandler(async (req, res) => {
  const column = await Column.findById(req.params.id);
  if (!column) {
    return failure(res, 'Column not found', 404);
  }
  const { error, membership } = await assertBoardAccess(column.board, req.userId);
  if (error) return failure(res, error.message, error.status);
  if (membership.role === 'member') {
    return failure(res, 'Members cannot edit columns', 403);
  }

  const { name, color, wipLimit } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (color !== undefined) update.color = color;
  if (wipLimit !== undefined) update.wipLimit = wipLimit;

  const updated = await Column.findByIdAndUpdate(column._id, update, { new: true });
  return success(res, { column: updated });
});

const deleteColumn = asyncHandler(async (req, res) => {
  const column = await Column.findById(req.params.id);
  if (!column) {
    return failure(res, 'Column not found', 404);
  }
  const { error, membership } = await assertBoardAccess(column.board, req.userId);
  if (error) return failure(res, error.message, error.status);
  if (membership.role === 'member') {
    return failure(res, 'Members cannot delete columns', 403);
  }

  const fallback = await Column.find({ board: column.board, _id: { $ne: column._id } })
    .sort('order')
    .limit(1);

  await Column.deleteOne({ _id: column._id });
  await Ticket.updateMany(
    { column: column._id },
    { $set: { column: fallback[0] ? fallback[0]._id : null } }
  );

  return success(res, { message: 'Column deleted' });
});

const reorderColumns = asyncHandler(async (req, res) => {
  const boardId = req.params.boardId;
  const { orderedIds } = req.body;

  const { error, membership } = await assertBoardAccess(boardId, req.userId);
  if (error) return failure(res, error.message, error.status);
  if (membership.role === 'member') {
    return failure(res, 'Members cannot reorder columns', 403);
  }

  const bulk = orderedIds.map((id, idx) => ({
    updateOne: { filter: { _id: id, board: boardId }, update: { $set: { order: idx } } },
  }));
  await Column.bulkWrite(bulk);

  const columns = await Column.find({ board: boardId }).sort('order');
  return success(res, { columns });
});

module.exports = { listColumns, createColumn, updateColumn, deleteColumn, reorderColumns };
