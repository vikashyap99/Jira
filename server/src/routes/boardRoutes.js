const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const columnController = require('../controllers/columnController');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { board, column, idParam } = require('../utils/validators');

router.use(authenticate);

router.get('/', boardController.listBoards);
router.post('/', validate(board.create), boardController.createBoard);

router.get('/:id', validate(idParam, 'params'), boardController.getBoard);
router.put('/:id', validate(idParam, 'params'), validate(board.update), boardController.updateBoard);
router.delete('/:id', validate(idParam, 'params'), boardController.deleteBoard);

// /boards/:boardId/columns
router.get('/:boardId/columns', columnController.listColumns);
router.post('/:boardId/columns', validate(column.create), columnController.createColumn);
router.put('/:boardId/columns/reorder', validate(column.reorder), columnController.reorderColumns);

module.exports = router;
