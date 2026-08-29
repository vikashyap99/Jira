const crypto = require('crypto');
const Workspace = require('../models/Workspace');
const { WorkspaceMember } = require('../models/WorkspaceMember');
const User = require('../models/User');
const Board = require('../models/Board');
const { Column, DEFAULT_COLUMNS } = require('../models/Column');
const { success, failure } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const emailService = require('../services/email');

function generateInviteCode() {
  return crypto.randomBytes(5).toString('hex').toUpperCase();
}

const listMyWorkspaces = asyncHandler(async (req, res) => {
  const memberships = await WorkspaceMember.find({ user: req.userId })
    .populate('workspace', 'name description logoUrl inviteCode createdAt');

  const workspaces = memberships
    .filter((m) => m.workspace)
    .map((m) => ({ ...m.workspace.toObject(), role: m.role, membershipId: m._id }));

  return success(res, { workspaces });
});

const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findById(req.params.id);
  if (!workspace) {
    return failure(res, 'Workspace not found', 404);
  }

  const members = await WorkspaceMember.find({ workspace: workspace._id })
    .populate('user', 'firstName lastName email avatarUrl phone');

  const boards = await Board.find({ workspace: workspace._id }).sort('createdAt');

  const sanitizedMembers = members
    .filter((m) => m.user)
    .map((m) => ({
      memberId: m._id,
      role: m.role,
      invitedAt: m.invitedAt,
      user: {
        id: m.user._id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        phone: m.user.phone,
      },
    }));

  return success(res, {
    workspace: { ...workspace.toObject(), members: sanitizedMembers, boards },
  });
});

const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  const workspace = await Workspace.create({
    name,
    description,
    createdBy: req.userId,
    inviteCode: generateInviteCode(),
  });

  await WorkspaceMember.create({
    workspace: workspace._id,
    user: req.userId,
    role: 'owner',
  });

  const board = await Board.create({
    name: `${name} Board`,
    workspace: workspace._id,
    createdBy: req.userId,
    isDefault: true,
  });

  const columnDocs = DEFAULT_COLUMNS.map((c, idx) => ({
    ...c,
    board: board._id,
    order: idx,
  }));
  await Column.insertMany(columnDocs);

  return success(res, { workspace, board }, 201);
});

const updateWorkspace = asyncHandler(async (req, res) => {
  const { name, description, logoUrl } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (logoUrl !== undefined) update.logoUrl = logoUrl;

  const workspace = await Workspace.findByIdAndUpdate(req.params.id, update, { new: true });
  return success(res, { workspace });
});

const deleteWorkspace = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findByIdAndDelete(req.params.id);
  if (!workspace) {
    return failure(res, 'Workspace not found', 404);
  }
  await WorkspaceMember.deleteMany({ workspace: workspace._id });
  const boards = await Board.find({ workspace: workspace._id });
  await Board.deleteMany({ workspace: workspace._id });
  await Promise.all(boards.map((b) => Column.deleteMany({ board: b._id })));
  await require('mongoose').model('Ticket').deleteMany({ workspace: workspace._id });
  return success(res, { message: 'Workspace deleted' });
});

const listMembers = asyncHandler(async (req, res) => {
  const members = await WorkspaceMember.find({ workspace: req.params.id })
    .populate('user', 'firstName lastName email avatarUrl phone');
  const result = members
    .filter((m) => m.user)
    .map((m) => ({
      memberId: m._id,
      role: m.role,
      invitedAt: m.invitedAt,
      user: {
        id: m.user._id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        phone: m.user.phone,
      },
    }));
  return success(res, { members: result });
});

const addMember = asyncHandler(async (req, res) => {
  const { email, role } = req.body;

  const targetUser = await User.findOne({ email });
  const workspace = await Workspace.findById(req.params.id);

  if (!targetUser) {
    if (workspace) {
      emailService.workspaceInvite({
        to: email,
        workspaceName: workspace.name,
        invitedByName: req.user.firstName || 'An owner',
        inviteCode: workspace.inviteCode,
      });
    }
    return failure(res, 'That user does not have an account yet', 400);
  }

  const existing = await WorkspaceMember.findOne({
    workspace: req.params.id,
    user: targetUser._id,
  });
  if (existing) {
    await WorkspaceMember.updateOne({ _id: existing._id }, { role });
    emailService.workspaceInvite({
      to: targetUser.email,
      workspaceName: workspace?.name || 'workspace',
      invitedByName: req.user.firstName || 'An owner',
      inviteCode: workspace?.inviteCode || '',
    });
    return success(res, { message: 'Member already present, role updated' });
  }

  const member = await WorkspaceMember.create({
    workspace: req.params.id,
    user: targetUser._id,
    role,
    invitedBy: req.userId,
  });

  emailService.workspaceInvite({
    to: targetUser.email,
    workspaceName: workspace?.name || 'workspace',
    invitedByName: req.user.firstName || 'An owner',
    inviteCode: workspace?.inviteCode || '',
  });

  return success(res, { member }, 201);
});

const updateMemberRole = asyncHandler(async (req, res) => {
  const member = await WorkspaceMember.findById(req.params.memberId);
  if (!member) {
    return failure(res, 'Member not found', 404);
  }
  if (member.user.toString() === req.userId) {
    return failure(res, 'You cannot change your own role', 400);
  }
  member.role = req.body.role;
  await member.save();
  return success(res, { member });
});

const removeMember = asyncHandler(async (req, res) => {
  const member = await WorkspaceMember.findById(req.params.memberId);
  if (!member) {
    return failure(res, 'Member not found', 404);
  }
  if (member.user.toString() === req.userId) {
    return failure(res, 'You cannot remove yourself', 400);
  }
  await WorkspaceMember.deleteOne({ _id: member._id });
  return success(res, { message: 'Member removed' });
});

const joinByCode = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;
  const workspace = await Workspace.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!workspace) {
    return failure(res, 'Invalid invite code', 400);
  }

  const existing = await WorkspaceMember.findOne({
    workspace: workspace._id,
    user: req.userId,
  });
  if (existing) {
    return failure(res, 'You are already a member', 400);
  }

  const member = await WorkspaceMember.create({
    workspace: workspace._id,
    user: req.userId,
    role: 'member',
    invitedBy: workspace.createdBy,
  });

  return success(res, { workspace, member }, 201);
});

const regenerateInviteCode = asyncHandler(async (req, res) => {
  const workspace = await Workspace.findByIdAndUpdate(
    req.params.id,
    { inviteCode: generateInviteCode() },
    { new: true }
  );
  return success(res, { inviteCode: workspace.inviteCode });
});

module.exports = {
  listMyWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listMembers,
  addMember,
  updateMemberRole,
  removeMember,
  joinByCode,
  regenerateInviteCode,
};
