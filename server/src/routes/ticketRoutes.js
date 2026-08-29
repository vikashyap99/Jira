const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ticket, idParam } = require('../utils/validators');

router.use(authenticate);

router.get('/', validate(ticket.query, 'query'), ticketController.listTickets);
router.post('/', validate(ticket.create), ticketController.createTicket);

router.get('/:id', validate(idParam, 'params'), ticketController.getTicket);
router.put('/:id', validate(idParam, 'params'), validate(ticket.update), ticketController.updateTicket);
router.put('/:id/move', validate(idParam, 'params'), validate(ticket.move), ticketController.moveTicket);
router.put('/:id/watch', validate(idParam, 'params'), ticketController.watchTicket);
router.delete('/:id', validate(idParam, 'params'), ticketController.deleteTicket);

module.exports = router;
