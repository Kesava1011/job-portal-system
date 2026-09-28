const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/switch-role', authenticate, authController.switchRole);
router.put('/update-password', authenticate, authController.updatePassword);

module.exports = router;
