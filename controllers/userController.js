const User = require('../models/user');

// User(id, username, uid, email, role, status, avatar_url, favourite_post, favourite_course, favourite_problem, join_at)

const createUser = async (req, res) => {
    try {
        const { username, uid, email, avatar_url } = req.body;
        const user = await User.create({ username, uid, email, avatar_url });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        users.forEach(user => {
            delete user.dataValues.uid;
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// get user by ID
const getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            delete user.dataValues.uid;
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const toggleCourseFavourite = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        
        if (user) {
            let favourite_course = user.favourite_course || [];
            const index = favourite_course.indexOf(req.params.id);
            if (index === -1) {
                favourite_course.push(req.params.id);
            } else {
                favourite_course.splice(index, 1);
            }
            await user.update({ favourite_course });
            delete user.dataValues.uid;
            return res.status(200).json(user);
        } else {
            return res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateRole = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            await user.update({ role: req.body.role });
            delete user.dataValues.uid;
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (user) {
            await user.update({ status: req.body.status });
            delete user.dataValues.uid;
            res.status(200).json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { 
    createUser, 
    getUsers, 
    getUserById, 
    toggleCourseFavourite,
    updateRole,
    updateStatus
};
