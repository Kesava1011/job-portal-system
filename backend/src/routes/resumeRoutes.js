const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Job Seeker builder data endpoint (placed before /:id to avoid route shadowing)
router.get('/builder/data', authenticate, authorize('job_seeker'), resumeController.getResumeBuilderData);

// Direct resume file download endpoint (accessible to authorized recruiters, seeker owner, or admin)
router.get('/:id/download', authenticate, resumeController.downloadResumeFile);

// Direct resume file inline view endpoint (accessible to authorized recruiters, seeker owner, or admin)
router.get('/:id/view', authenticate, resumeController.viewResumeFile);

// Get specific resume by ID (allowed for recruiter, seeker, admin)
router.get('/:id', authenticate, resumeController.getResumeById);

// Job Seeker resume management
router.use(authenticate, authorize('job_seeker'));

router.get('/', resumeController.getMyResumes);
router.post('/upload', upload.single('resume'), resumeController.uploadResume);
router.post('/builder', resumeController.saveResumeBuilder);
router.put('/:id/default', resumeController.setDefaultResume);
router.delete('/:id', resumeController.deleteResume);

module.exports = router;

