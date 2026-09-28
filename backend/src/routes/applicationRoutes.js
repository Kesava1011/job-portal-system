const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authenticate);

// Job Seeker routes
router.post('/apply', authorize('job_seeker'), upload.single('resume'), applicationController.applyForJob);
router.post('/', authorize('job_seeker'), upload.single('resume'), applicationController.applyForJob);
router.get('/my-applications', authorize('job_seeker'), applicationController.getSeekerApplications);
router.delete('/:id/withdraw', authorize('job_seeker'), applicationController.withdrawApplication);

// Saved jobs
router.post('/saved/toggle', authorize('job_seeker'), applicationController.toggleSaveJob);
router.get('/saved', authorize('job_seeker'), applicationController.getSavedJobs);

// Recruiter routes
router.get('/recruiter/applicants', authorize('recruiter', 'admin'), applicationController.getRecruiterApplicants);
router.get('/recruiter/candidate/:id', authorize('recruiter', 'admin'), applicationController.getCandidateDetail);
router.get('/:id/resume/download', authorize('recruiter', 'admin', 'job_seeker'), applicationController.downloadApplicationResume);
router.get('/:id/resume/view', authorize('recruiter', 'admin', 'job_seeker'), applicationController.viewApplicationResume);
router.put('/:id/status', authorize('recruiter', 'admin'), applicationController.updateApplicationStatus);

module.exports = router;
