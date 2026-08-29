const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { auth } = require('../utils/validators');
const authenticate = require('../middleware/auth');

router.post('/signup', validate(auth.signup), authController.signup);
router.post('/login', validate(auth.login), authController.login);
router.post('/refresh', validate(auth.refresh), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.put('/me', authenticate, validate(auth.updateMe), authController.updateMe);

module.exports = router;
