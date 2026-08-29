const Comment = require('../models/Comment');
const { Ticket } = require('../models/Ticket');
const { WorkspaceMember } = require('../models/WorkspaceMember');
const User = require('../models/User');
const { success, failure } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const emailService = require('../services/email');

async function assertTicketMember(ticketId, userId) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return { error: { message: 'Ticket not found', status: 404 } };
  const membership = await WorkspaceMember.findOne({ workspace: ticket.workspace, user: userId });
  if (!membership)
    return { error: { message: 'You are not a member of this workspace', status: 403 } };
  return { ticket, membership };
}

const listComments = asyncHandler(async (req, res) => {
  const { error } = await assertTicketMember(req.params.ticketId, req.userId);
  if (error) return failure(res, error.message, error.status);

  const comments = await Comment.find({ ticket: req.params.ticketId })
    .populate('author', 'firstName lastName email avatarUrl')
    .sort('createdAt');
  return success(res, { comments });
});

const createComment = asyncHandler(async (req, res) => {
  const { ticket, error } = await assertTicketMember(req.params.ticketId, req.userId);
  if (error) return failure(res, error.message, error.status);

  const comment = await Comment.create({
    ticket: ticket._id,
    author: req.userId,
    body: req.body.body,
  });

  const watchers = new Set([
    ...ticket.assignees.map(String),
    ticket.reporter?.toString(),
    ...ticket.watchers.map(String),
  ]);
  watchers.delete(req.userId);

  if (watchers.size) {
    const users = await User.find({ _id: { $in: [...watchers] } });
    for (const u of users) {
      emailService.newComment({
        to: u.email,
        ticketTitle: ticket.title,
        authorName: req.user.firstName || 'A teammate',
        comment: req.body.body,
      });
    }
  }

  const populated = await Comment.findById(comment._id).populate(
    'author',
    'firstName lastName email avatarUrl'
  );
  return success(res, { comment: populated }, 201);
});

const updateComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    return failure(res, 'Comment not found', 404);
  }
  if (comment.author.toString() !== req.userId) {
    return failure(res, 'You can only edit your own comments', 403);
  }
  comment.body = req.body.body;
  comment.edited = true;
  await comment.save();
  return success(res, { comment });
});

const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) {
    return failure(res, 'Comment not found', 404);
  }
  if (comment.author.toString() !== req.userId) {
    return failure(res, 'You can only delete your own comments', 403);
  }
  await Comment.deleteOne({ _id: comment._id });
  return success(res, { message: 'Comment deleted' });
});

module.exports = { listComments, createComment, updateComment, deleteComment };
