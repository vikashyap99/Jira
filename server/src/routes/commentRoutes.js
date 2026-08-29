const express = require('express');
const router = express.Router({ mergeParams: true });
const commentController = require('../controllers/commentController');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { comment } = require('../utils/validators');

router.use(authenticate);

router.get('/', commentController.listComments);
router.post('/', validate(comment.create), commentController.createComment);

router.put('/:commentId', commentController.updateComment);
router.delete('/:commentId', commentController.deleteComment);

module.exports = router;
