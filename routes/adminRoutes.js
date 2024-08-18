const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const { getProblemsForAdmin } = require('../controllers/problemController');
const { getUsers, updateRole, updateStatus } = require('../controllers/userController');
const { getPostsForAdmin, getInActivePosts, togglePublish, activePost, updatePost, deletePostById } = require('../controllers/postController');

// USERS
router.get('/users/list', authMiddleware.authenticate, authMiddleware.isAdmin, getUsers);

router.put('/users/:id/role', authMiddleware.authenticate, authMiddleware.isAdmin, updateRole);
router.put('/users/:id/status', authMiddleware.authenticate, authMiddleware.isAdmin, updateStatus);

// POSTS
router.get('/posts/list', authMiddleware.authenticate, authMiddleware.isAdmin, getPostsForAdmin);
router.get('/posts/inactive', authMiddleware.authenticate, authMiddleware.isAdmin, getInActivePosts);
router.put('/posts/:id/publish', authMiddleware.authenticate, authMiddleware.isAdmin, togglePublish);
router.put('/posts/:id/active', authMiddleware.authenticate, authMiddleware.isAdmin, activePost);
router.put('/posts/:id/edit', authMiddleware.authenticate, authMiddleware.isAdmin, updatePost);
router.delete('/posts/:id', authMiddleware.authenticate, authMiddleware.isAdmin, deletePostById);

// PROBLEMS
router.get('/problems/list', authMiddleware.authenticate, authMiddleware.isAdmin, getProblemsForAdmin);

module.exports = router;