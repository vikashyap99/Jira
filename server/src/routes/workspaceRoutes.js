const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const authenticate = require('../middleware/auth');
const { ensureMember, requireOwner } = require('../middleware/roles');
const validate = require('../middleware/validate');
const { workspace, idParam } = require('../utils/validators');

router.use(authenticate);

router.get('/', workspaceController.listMyWorkspaces);
router.post('/', validate(workspace.create), workspaceController.createWorkspace);
router.post('/join', validate(workspace.joinByCode), workspaceController.joinByCode);

router.get('/:id', validate(idParam, 'params'), ensureMember, workspaceController.getWorkspace);
router.put('/:id', validate(idParam, 'params'), ensureMember, requireOwner, validate(workspace.update), workspaceController.updateWorkspace);
router.delete('/:id', validate(idParam, 'params'), ensureMember, requireOwner, workspaceController.deleteWorkspace);
router.post('/:id/invite-code', validate(idParam, 'params'), ensureMember, requireOwner, workspaceController.regenerateInviteCode);

router.get('/:id/members', validate(idParam, 'params'), ensureMember, workspaceController.listMembers);
router.post('/:id/members', validate(idParam, 'params'), ensureMember, requireOwner, validate(workspace.addMember), workspaceController.addMember);
router.put('/:id/members/:memberId', validate(idParam, 'params'), ensureMember, requireOwner, validate(workspace.updateMemberRole), workspaceController.updateMemberRole);
router.delete('/:id/members/:memberId', validate(idParam, 'params'), ensureMember, requireOwner, workspaceController.removeMember);

module.exports = router;
