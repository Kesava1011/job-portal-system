const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate, optionalAuth, authorize } = require('../middleware/authMiddleware');

// Recruiter specific routes (defined before /:id to prevent route shadowing)
router.get('/recruiter/my-jobs', authenticate, authorize('recruiter'), jobController.getRecruiterJobs);
router.get('/recruiter/dashboard', authenticate, authorize('recruiter'), jobController.getRecruiterDashboard);

// Public or optionally authenticated routes
router.get('/', optionalAuth, jobController.getJobs);
router.get('/:id', optionalAuth, jobController.getJobById);

// Job management routes
router.post('/', authenticate, authorize('recruiter'), jobController.createJob);
router.put('/:id', authenticate, authorize('recruiter', 'admin'), jobController.updateJob);
router.delete('/:id', authenticate, authorize('recruiter', 'admin'), jobController.deleteJob);

module.exports = router;
