const User = require('../models/user');
const Course = require('../models/course');
const Problem = require('../models/problem');
const Submission = require('../models/submission');
const Contest = require('../models/contest');
const Post = require('../models/post');
const { fn, col, where, literal, Op } = require('sequelize');
const sequelize = require('../configs/database');

// User(id, username, uid, email, role, status, avatar_url, favourite_post, favourite_course, favourite_problem, join_at)
// Problem(id, name, slug, tags, language, description, input, output, limit, examples, testcases, created_by, type, level, score, parent)
// Submission(id, user_id, problem_id, code, status, score, pass_count, total_count, created_at)
// Contest(id, name, slug, description, start_time, end_time, created_by, type, status, problems, posts, users)
// Post(id, title, slug, content, created_by, type, status, parent, comments, likes, tags)

const getAnalysis = async (req, res) => {
    try {

        const analysis = {
            '1_day': {
                users_count: 0,
                problems_count: 0,
                submissions_count: 0,
                posts_count: 0
            },
            '7_day': {
                users_count: 0,
                problems_count: 0,
                submissions_count: 0,
                posts_count: 0
            },
            '30_day': {
                users_count: 0,
                problems_count: 0,
                submissions_count: 0,
                posts_count: 0
            },
            'all_time': {
                users_count: 0,
                problems_count: 0,
                submissions_count: 0,
                posts_count: 0
            }
        };
        // Analysis 1 day ago
        const users_count_all_time = await User.count();
        const problems_count_all_time = await Problem.count();
        const submissions_count_all_time = await Submission.count();
        const posts_count_all_time = await Post.count();

        analysis['all_time'] = {
            users_count: users_count_all_time,
            problems_count: problems_count_all_time,
            submissions_count: submissions_count_all_time,
            posts_count: posts_count_all_time
        };

        // Analysis 7 day ago
        const users_count_7_day = await User.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        });

        const problems_count_7_day = await Problem.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        });

        const submissions_count_7_day = await Submission.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        });

        const posts_count_7_day = await Post.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000)
                }
            }
        });

        analysis['7_day'] = {
            users_count: users_count_7_day,
            problems_count: problems_count_7_day,
            submissions_count: submissions_count_7_day,
            posts_count: posts_count_7_day
        };

        // Analysis 30 day ago
        const users_count_30_day = await User.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
                }
            }
        });

        const problems_count_30_day = await Problem.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
                }
            }
        });

        const submissions_count_30_day = await Submission.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
                }
            }
        });

        const posts_count_30_day = await Post.count({
            where: {
                createdAt: {
                    [Op.gte]: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
                }
            }
        });

        analysis['30_day'] = {
            users_count: users_count_30_day,
            problems_count: problems_count_30_day,
            submissions_count: submissions_count_30_day,
            posts_count: posts_count_30_day
        };

        // Đếm tổng các lượt nộp bài trên hệ thống theo status
        const submissions = await Submission.findAll();

        const submissions_analysis = {
            total: submissions.length,
            PASSED: submissions.filter(submission => submission.status === 'PASSED').length,
            FAILED: submissions.filter(submission => submission.status === 'FAILED').length,
            ERROR: submissions.filter(submission => submission.status === 'ERROR').length,
            COMPILE_ERROR: submissions.filter(submission => submission.status === 'COMPILE_ERROR').length,
        }

        analysis['submissions'] = submissions_analysis;

        res.status(200).json(analysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getRanking = async (req, res) => {
    // Dựa vào Problem, Submission, User để lấy ra ranking
    try {
        const ranking = await User.findAll({
            attributes: [
                'id',
                'username',
                'avatar_url',
                'role',
                [
                    sequelize.literal(`(
                        SELECT COALESCE(SUM(p.score), 0)
                        FROM Submissions s
                        JOIN Problems p ON s.problem_slug = p.slug
                        WHERE s.username = User.username AND s.status = 'PASSED'
                        AND p.parent IS NULL
                    )`),
                    'score'
                ],
                [
                    sequelize.literal(`(
                        SELECT GROUP_CONCAT(DISTINCT p.slug)
                        FROM Submissions s
                        JOIN Problems p ON s.problem_slug = p.slug
                        WHERE s.username = User.username AND s.status = 'PASSED'
                        AND p.parent IS NULL
                    )`),
                    'completed_problems'
                ]
            ],
            order: [[sequelize.literal('score'), 'DESC']]
        });
        res.status(200).json(ranking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAnalysis,
    getRanking
};
