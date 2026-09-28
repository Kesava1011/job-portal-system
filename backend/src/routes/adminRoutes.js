const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate, authorize('admin'));

router.get('/stats', adminController.getAdminStats);
router.get('/users', adminController.getAllUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.get('/jobs', adminController.getAllJobsAdmin);
router.delete('/jobs/:id', adminController.deleteJobAdmin);
router.get('/applications', adminController.getAllApplicationsAdmin);

module.exports = router;
