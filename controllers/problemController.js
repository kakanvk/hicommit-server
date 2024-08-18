const User = require('../models/user');
const Course = require('../models/course');
const Unit = require('../models/unit');
const Problem = require('../models/problem');
const Example = require('../models/example');
const Testcase = require('../models/testcase');
const Submission = require('../models/submission');
const { fn, col, where, literal, Op } = require('sequelize');
const sequelize = require('../configs/database');
const axios = require('axios');
const { getIO } = require('../socket');

const io = getIO();

// Problem(id, created_by, name, slug, tags, language, description, input, output, limit, examples[], testcases[], score, type, level)
// Course(id, created_by, name, description, class_name, join_key, slug, created_at, thumbnail, members[], publish)
// User(id, username, uid, email, role, status, avatar_url, favourite_post, favourite_course, favourite_problem, join_at)
// Example(id, input, output, note)
// Testcase(id, input, output, suggestion)
// UNIT(id, course_id, name, children[])
// submission(id, problem_slug, username, sha, run_id, code, status, duration, result, style_check, pass_count, total_count)

const defaultScore = {
    EASY: 20,
    MEDIUM: 40,
    HARD: 100
}

const createProblem = async (req, res) => {

    const transaction = await sequelize.transaction();

    try {
        const { name, slug, tags, language, description, input, output, limit, examples, testcases, score, type, level, unit, parent } = req.body;

        if (!name || !slug || !tags || !language || !description || !input || !output || !examples || !testcases || !type) {
            return res.status(400).json({ message: 'Please fill in all fields' });
        }

        // Duyệt qua mảng examples và testcases, tạo mới các bản ghi tương ứng
        for (let i = 0; i < examples.length; i++) {
            const { input, output, note } = examples[i];
            const example = await Example.create({ input, output, note }, { transaction });
            examples[i] = example.id;
        }

        for (let i = 0; i < testcases.length; i++) {
            const { input, output, suggestion } = testcases[i];
            const testcase = await Testcase.create({ input, output, suggestion }, { transaction });
            testcases[i] = testcase.id;
        }

        const problem = await Problem.create({
            name,
            slug,
            tags,
            language,
            description,
            input,
            output,
            limit,
            examples,
            testcases,
            created_by: req.user.id,
            type: type || 'FREE',
            level: level,
            score: score || defaultScore.EASY,
            parent: parent || null
        }, { transaction });

        if (unit) {
            const unitRecord = await Unit.findByPk(unit);
            if (!unitRecord) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Unit not found' });
            }
            let children = unitRecord.children;
            children.push(problem.id);
            await unitRecord.update({ children }, { transaction });
        }

        await transaction.commit();
        res.status(201).json(problem);

    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: error.message });
    }
};

const getProblems = async (req, res) => {
    try {
        const problems = await Problem.findAll({
            order: [['createdAt', 'DESC']]
        });

        for (let i = 0; i < problems.length; i++) {
            const problem = problems[i];
            const examples = await Example.findAll({
                where: {
                    id: problem.examples
                }
            });
            problem.examples = examples;
            delete problem.testcases;
        }

        res.status(200).json(problems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getProblemByIDorSlug = async (req, res) => {
    try {
        // Tìm bài tập theo ID hoặc Slug
        let problem = await Problem.findByPk(req.params.id);

        if (!problem) {
            problem = await Problem.findOne({ where: { slug: req.params.id } });
        }

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Tạo một bản sao đối tượng problem để thao tác
        let problemData = problem.toJSON();

        // Tìm các example liên quan đến bài tập
        const examples = await Example.findAll({
            where: {
                id: problem.examples
            }
        });

        problemData.examples = examples;

        // Nếu là bài tập trong khóa học thì trả về thông tin khóa học và unit chứa bài tập này
        if (problem.type === 'COURSE') {
            const course = await Course.findByPk(problem.parent, {
                attributes: ['id', 'name', 'slug'],
            });

            const units = await Unit.findAll({
                where: {
                    course_id: problem.parent
                }
            });

            let foundUnit = null;
            for (let unit of units) {
                if (unit.children && unit.children.includes(problem.id)) {
                    foundUnit = unit;
                    break;
                }
            }

            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }

            problemData.parent = course;
            problemData.unit = foundUnit;
        }

        // Xoá testcases để tránh lộ thông tin
        delete problemData.testcases;

        res.status(200).json(problemData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getProblemByIDForAdmin = async (req, res) => {
    try {
        // Tìm bài tập theo ID hoặc Slug
        let problem = await Problem.findByPk(req.params.id);

        if (!problem) {
            problem = await Problem.findOne({ where: { slug: req.params.id } });
        }

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Tạo một bản sao đối tượng problem để thao tác
        let problemData = problem.toJSON();

        // Tìm các example liên quan đến bài tập
        const examples = await Example.findAll({
            where: {
                id: problem.examples
            }
        });

        // Tìm các testcase liên quan đến bài tập
        const testcases = await Testcase.findAll({
            where: {
                id: problem.testcases
            }
        });

        problemData.examples = examples;
        problemData.testcases = testcases;

        // Nếu là bài tập trong khóa học thì trả về thông tin khóa học và unit chứa bài tập này
        if (problem.type === 'COURSE') {
            const course = await Course.findByPk(problem.parent, {
                attributes: ['id', 'name', 'slug'],
            });

            const units = await Unit.findAll({
                where: {
                    course_id: problem.parent
                }
            });

            let foundUnit = null;
            for (let unit of units) {
                if (unit.children && unit.children.includes(problem.id)) {
                    foundUnit = unit;
                    break;
                }
            }

            if (!course) {
                return res.status(404).json({ error: 'Course not found' });
            }

            problemData.parent = course;
            problemData.unit = foundUnit;
        }



        res.status(200).json(problemData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getTestcasesBySlug = async (req, res) => {
    try {
        // Tìm bài tập theo slug
        const problem = await Problem.findOne({
            where: {
                slug: req.params.slug
            }
        });

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Lấy ra testcases liên quan với các trường id, input, output
        const testcases = await Testcase.findAll({
            where: {
                id: problem.testcases
            },
            attributes: ['id', 'input', 'output'] // Chỉ lấy ra các trường id, input, output
        });

        res.status(200).json(testcases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Ghi kết quả
const writeResultFromGitHub = async (req, res) => {

    try {
        const { problem, actor, job_name, run_id, sha, status, result, pass_count, total_count, duration, code } = req.body;

        if (!problem || !actor || !run_id || !sha || !status || !code) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (status === 'pending') {
            // Xử lý khi status là pending

            // Fetch commit details using the SHA
            const commitResponse = await axios.get(`https://api.github.com/repos/${actor}/hicommit-problems/commits/${sha}`);

            const commitData = commitResponse.data;
            const commitMessage = commitData.commit.message;

            // Nếu commitMessage bắt đầu bằng [config] hoặc Initialize thì không xử lý
            if (commitMessage.startsWith('[config]') || commitMessage.startsWith('Initialize')) {
                return res.status(200).send('Config commit received');
            }

            const submission = await Submission.create({
                id: run_id,
                problem_slug: problem,
                username: actor,
                sha,
                run_id,
                code,
                status: status.toUpperCase(),
                commit: commitMessage
            });

            io.emit('new_submission');

            return res.status(200).send('Result received');
        } else {

            // Lấy ra submission từ database dựa vào run_id
            const submission = await Submission.findByPk(run_id);

            if (!submission) {
                return res.status(404).json({ error: 'Submission not found' });
            }

            // Cập nhật thông tin kết quả
            await submission.update({
                // Nếu result có một testcase nào đó bằng error thì status sẽ là ERROR
                status: result?.some(testcase => testcase.status === 'error') ? 'ERROR' : status.toUpperCase(),
                result,
                pass_count,
                total_count,
                duration
            });

            io.emit('new_submission');

            return res.status(200).send('Result received');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const updateProblem = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { name, slug, tags, description, input, output, limit, examples, testcases, score, level } = req.body;

        if (!name || !slug || !tags || !description || !input || !output || !examples || !testcases) {
            return res.status(400).json({ message: 'Please fill in all fields' });
        }

        const problem = await Problem.findByPk(req.params.id);

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        // Duyệt qua mảng examples và testcases
        for (let i = 0; i < examples.length; i++) {
            const { input, output, note } = examples[i];
            if (examples[i].id) {
                const example = await Example.findByPk(examples[i].id);
                if (example) {
                    if (example.input !== input || example.output !== output || example.note !== note) {
                        await example.update({ input, output, note }, { transaction });
                    }
                }
                examples[i] = example.id;
            } else {
                // Nếu không tồn tại id thì tạo mới example
                const example = await Example.create({ input, output, note }, { transaction });
                examples[i] = example.id;
            }
        }

        for (let i = 0; i < testcases.length; i++) {
            const { input, output, suggestion } = testcases[i];
            if (testcases[i].id) {
                const testcase = await Testcase.findByPk(testcases[i].id);
                if (testcase) {
                    if (testcase.input === input && testcase.output === output && testcase.suggestion === suggestion) {
                        testcases[i] = testcase.id;
                    } else {
                        // tạo mới testcase
                        const new_testcase = await Testcase.create({ input, output, suggestion }, { transaction });
                        testcases[i] = new_testcase.id;
                    }
                }
            } else {
                // Nếu không tồn tại id thì tạo mới testcase
                const new_testcase = await Testcase.create({ input, output, suggestion }, { transaction });
                testcases[i] = new_testcase.id;
            }
        }

        await problem.update({
            name,
            slug,
            tags,
            description,
            input,
            output,
            limit,
            examples,
            testcases,
            level: level,
            score: score || defaultScore.EASY
        }, { transaction });

        await transaction.commit();
        res.status(200).json(problem);

    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: error.message });
    }
};

const deleteProblemByID = async (req, res) => {
    try {
        const problem = await Problem.findByPk(req.params.id);

        if (problem) {
            await problem.destroy();
            res.status(200).json({ message: 'deleted deleted' });
        } else {
            res.status(404).json({ message: 'deleted not found' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// ADMIN
const getProblemsForAdmin = async (req, res) => {
    try {
        const problems = await Problem.findAll({
            order: [['createdAt', 'DESC']],
            where: {
                type: 'FREE'
            }
        });

        for (let i = 0; i < problems.length; i++) {
            const problem = problems[i];
            const examples = await Example.findAll({
                where: {
                    id: problem.examples
                }
            });
            const testcases = await Testcase.findAll({
                where: {
                    id: problem.testcases
                }
            });
            problem.examples = examples;
            problem.testcases = testcases;
        }

        res.status(200).json(problems);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    createProblem,
    getProblems,
    getProblemByIDorSlug,
    getProblemByIDForAdmin,
    getTestcasesBySlug,
    writeResultFromGitHub,
    updateProblem,
    deleteProblemByID,
    // ADMIN
    getProblemsForAdmin
};
