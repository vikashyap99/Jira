const express = require('express');
const router = express.Router();
const columnController = require('../controllers/columnController');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { column, idParam } = require('../utils/validators');

router.use(authenticate);

router.put('/:id', validate(idParam, 'params'), validate(column.update), columnController.updateColumn);
router.delete('/:id', validate(idParam, 'params'), columnController.deleteColumn);

module.exports = router;
