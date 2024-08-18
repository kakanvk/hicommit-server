const express = require('express');
const router = express.Router();
const { createUser, getUserById, toggleCourseFavourite } = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', createUser);
router.get('/:id', getUserById);
router.put('/favourite_course/:id', authMiddleware.authenticate, toggleCourseFavourite);

module.exports = router;
