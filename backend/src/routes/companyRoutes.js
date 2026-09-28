const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Recruiter routes (defined before :id)
router.get('/recruiter/my-company', authenticate, authorize('recruiter'), companyController.getMyCompany);
router.put('/recruiter/my-company', authenticate, authorize('recruiter'), companyController.updateMyCompany);

// Public routes
router.get('/', companyController.getCompanies);
router.get('/:id', companyController.getCompanyById);

module.exports = router;
