const { WorkspaceMember } = require('../models/WorkspaceMember');
const { failure } = require('../utils/apiResponse');

async function ensureMember(req, res, next) {
  const workspaceId = req.params.id || req.params.workspaceId || req.body.workspace;
  if (!workspaceId) {
    return failure(res, 'Workspace identifier missing', 400);
  }

  const membership = await WorkspaceMember.findOne({
    workspace: workspaceId,
    user: req.userId,
  });

  if (!membership) {
    return failure(res, 'You are not a member of this workspace', 403);
  }

  req.membership = membership;
  req.role = membership.role;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.role) {
      return failure(res, 'Workspace membership required', 403);
    }
    if (!roles.includes(req.role)) {
      return failure(res, 'Insufficient permissions for this action', 403);
    }
    next();
  };
}

const requireOwner = requireRole('owner');
const requireOwnerOrReviewer = requireRole('owner', 'reviewer');

module.exports = { ensureMember, requireRole, requireOwner, requireOwnerOrReviewer };
