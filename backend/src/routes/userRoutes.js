const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Public route to get master skill list
router.get('/skills/master', userController.getAllMasterSkills);

// Seeker specific routes
router.use(authenticate);

router.get('/profile', authorize('job_seeker'), userController.getProfile);
router.put('/profile', authorize('job_seeker'), userController.updateProfile);
router.post('/avatar', authorize('job_seeker'), upload.single('avatar'), userController.uploadAvatar);
router.get('/dashboard', authorize('job_seeker'), userController.getSeekerDashboard);

// Skills
router.post('/skills', authorize('job_seeker'), userController.addSkill);
router.delete('/skills/:id', authorize('job_seeker'), userController.removeSkill);

// Education
router.post('/education', authorize('job_seeker'), userController.addEducation);
router.delete('/education/:id', authorize('job_seeker'), userController.deleteEducation);

// Experience
router.post('/experience', authorize('job_seeker'), userController.addExperience);
router.delete('/experience/:id', authorize('job_seeker'), userController.deleteExperience);

// Projects
router.post('/projects', authorize('job_seeker'), userController.addProject);
router.delete('/projects/:id', authorize('job_seeker'), userController.deleteProject);

// Certifications
router.post('/certifications', authorize('job_seeker'), userController.addCertification);
router.delete('/certifications/:id', authorize('job_seeker'), userController.deleteCertification);

module.exports = router;
