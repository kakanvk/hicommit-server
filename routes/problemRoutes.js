const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
    createProblem,
    getProblems,
    getProblemByIDorSlug,
    getProblemByIDForAdmin,
    getTestcasesBySlug,
    updateProblem,
    deleteProblemByID,
    writeResultFromGitHub,
} = require('../controllers/problemController');

router.get('/list', authMiddleware.authenticate, getProblems);
router.get('/admin/:id', authMiddleware.authenticate, authMiddleware.isAdminOrTeacher, getProblemByIDForAdmin);
router.get('/:id', authMiddleware.authenticate, getProblemByIDorSlug);
router.get('/:slug/testcases', getTestcasesBySlug);

router.post('/create', authMiddleware.authenticate, authMiddleware.isAdminOrTeacher, createProblem);

router.put('/:id', authMiddleware.authenticate, authMiddleware.isAdminOrTeacher, updateProblem);

// For SUBMISSIONS
router.post('/:slug/submission/result', writeResultFromGitHub);

router.delete('/:id', authMiddleware.authenticate, authMiddleware.isAdminOrTeacher, deleteProblemByID);

module.exports = router;