const User = require('../models/user');
const Course = require('../models/course');
const Unit = require('../models/unit');
const Problem = require('../models/problem');
const { fn, col, where, literal } = require('sequelize');
const sequelize = require('../configs/database');

// Course(id, created_by, name, description, class_name, join_key, slug, created_at, thumbnail, members[], publish)
// User(id, username, uid, email, role, status, avatar_url, favourite_post, favourite_course, favourite_problem, join_at)
// Problem(id, created_by, name, slug, tags, language, description, input, output, limit, examples[], testcases[], score, type, level)
// UNIT(id, course_id, name, children[])

const createCourse = async (req, res) => {
    try {
        const { name, description, class_name, join_key, thumbnail, slug } = req.body;

        // Kiểm tra null hoặc ""
        if (!name || !description || !thumbnail) {
            return res.status(400).json({ message: 'Please fill in all fields' });
        }

        const course = await Course.create({
            name,
            class_name: class_name.trim().toUpperCase(),
            join_key,
            created_by: req.user.id,
            description,
            slug,
            thumbnail,
            members: [req.user.id]
        });

        res.status(201).json(course);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCourses = async (req, res) => {
    try {
        const courses = await Course.findAll({
            where: {
                publish: true
            },
            order: [['created_at', 'DESC']]
        });

        // Đếm số bài tập trong từng khoá học
        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const unitIds = course.units || [];
            const units = await Unit.findAll({
                where: {
                    id: unitIds
                },
                attributes: ['id', 'children']
            });

            let problemIds = [];
            units.forEach(unit => {
                problemIds = problemIds.concat(unit.children);
            });

            const problems = await Problem.findAll({
                where: {
                    id: problemIds
                },
                attributes: ['id']
            });

            course.dataValues.problem_count = problems.length;
        }

        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getCoursesForAdmin = async (req, res) => {
    try {
        const courses = await Course.findAll({
            order: [['created_at', 'DESC']]
        });

        // Đếm số bài tập trong từng khoá học
        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const unitIds = course.units || [];
            const units = await Unit.findAll({
                where: {
                    id: unitIds
                },
                attributes: ['id', 'children']
            });

            let problemIds = [];
            units.forEach(unit => {
                problemIds = problemIds.concat(unit.children);
            });

            const problems = await Problem.findAll({
                where: {
                    id: problemIds
                },
                attributes: ['id']
            });

            course.dataValues.problem_count = problems.length;
        }

        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getMyCourses = async (req, res) => {
    try {
        const courses = await Course.findAll({
            where: {
                created_by: req.user.id,
            },
            order: [['created_at', 'DESC']]
        });

        // Đếm số bài tập trong từng khoá học
        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const unitIds = course.units || [];
            const units = await Unit.findAll({
                where: {
                    id: unitIds
                },
                attributes: ['id', 'children']
            });

            let problemIds = [];
            units.forEach(unit => {
                problemIds = problemIds.concat(unit.children);
            });

            const problems = await Problem.findAll({
                where: {
                    id: problemIds
                },
                attributes: ['id']
            });

            course.dataValues.problem_count = problems.length;
        }

        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getJoinedCourses = async (req, res) => {
    try {
        let courses = await Course.findAll({
            where: fn('JSON_CONTAINS', col('members'), JSON.stringify(req.user.id))
        });

        // Bỏ đi các course có trường deleted = true
        courses = courses.filter(course => !course.deleted);

        // Bỏ đi các khoá học chưa publish
        courses = courses.filter(course => course.publish);

        // Đếm số bài tập trong từng khoá học
        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            const unitIds = course.units || [];
            const units = await Unit.findAll({
                where: {
                    id: unitIds
                },
                attributes: ['id', 'children']
            });

            let problemIds = [];
            units.forEach(unit => {
                problemIds = problemIds.concat(unit.children);
            });

            const problems = await Problem.findAll({
                where: {
                    id: problemIds
                },
                attributes: ['id']
            });

            course.dataValues.problem_count = problems.length;
        }

        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getCourseByIdOrSlug = async (req, res) => {
    try {
        let course = await Course.findByPk(req.params.id);

        if (!course) {
            course = await Course.findOne({ where: { slug: req.params.id } });
        }

        if (course) {
            const unitIds = course.units || [];
            const units = await Unit.findAll({
                where: {
                    id: unitIds
                },
                attributes: ['id', 'name', 'children', 'course_id']
            });

            // Duyệt qua các units, lấy ra các problem trong children
            for (let i = 0; i < units.length; i++) {
                const unit = units[i];
                const problemIds = unit.children || [];
                const problems = await Problem.findAll({
                    where: {
                        id: problemIds,
                    },
                    attributes: ['id', 'name', 'slug', 'language']
                });

                // Bỏ đi problems.creator
                for (let j = 0; j < problems.length; j++) {
                    delete problems[j].dataValues.creator;
                }

                // Sắp xếp các problems theo thứ tự của children
                problems.sort((a, b) => problemIds.indexOf(a.id) - problemIds.indexOf(b.id));

                // Thêm thông tin các problems vào đối tượng unit
                unit.dataValues.children = problems;
            }

            // Sắp xếp các units theo thứ tự của unitIds
            const orderedUnits = unitIds.map(id => units.find(unit => unit.id === id));

            // Thêm thông tin các units vào đối tượng course
            course.dataValues.units = orderedUnits;

            // Nếu có join_key thì trả về thông tin isPublic
            if (course.join_key) {
                course.dataValues.isPublic = false;
            } else {
                course.dataValues.isPublic = true;
            }

            // Nếu user.id có trong members thì trả về thông tin isJoined
            if (course.members.includes(req.user.id)) {
                course.dataValues.isJoined = true;
            } else {
                course.dataValues.isJoined = false;
            }

            // Lấy ra các user trong members
            const members = await User.findAll({
                where: {
                    id: course.members
                },
                attributes: ['id', 'username', 'avatar_url']
            });

            // Thêm thông tin các members vào đối tượng course
            course.dataValues.members = members;

            // Xoá join_key để tránh lộ thông tin
            delete course.dataValues.join_key;

            res.status(200).json(course);
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const joinCourse = async (req, res) => {
    try {
        let course = await Course.findByPk(req.params.id);
        const { join_key } = req.body;

        if (course) {
            // Kiểm tra xem members có phải là một mảng không
            let members = course.members;

            if (!course.join_key) {
                // Thêm user.id vào members nếu chưa có
                if (!members.includes(req.user.id)) {
                    members.push(req.user.id);
                    course.members = members; // Cập nhật trường members
                    await course.save();
                }
                return res.status(200).json(course);
            } else {
                if (join_key === course.join_key) {
                    // Thêm user.id vào members nếu chưa có
                    if (!members.includes(req.user.id)) {
                        members.push(req.user.id);
                        course.members = members; // Cập nhật trường members
                        await course.save();
                    }
                    return res.status(200).json(course);
                } else {
                    return res.status(403).json({ message: 'Join key is incorrect' });
                }
            }

        } else {
            return res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const getCourseByIDForAdmin = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);

        if (course) {
            const unitIds = course.units || [];
            const units = await Unit.findAll({
                where: {
                    id: unitIds
                },
                attributes: ['id', 'name', 'children', 'course_id']
            });

            // Duyệt qua các units, lấy ra các problem trong children
            for (let i = 0; i < units.length; i++) {
                const unit = units[i];
                const problemIds = unit.children || [];
                const problems = await Problem.findAll({
                    where: {
                        id: problemIds,
                    },
                    attributes: ['id', 'name', 'slug', 'language']
                });

                // Bỏ đi problems.creator
                for (let j = 0; j < problems.length; j++) {
                    delete problems[j].dataValues.creator;
                }

                // Sắp xếp các problems theo thứ tự của children
                problems.sort((a, b) => problemIds.indexOf(a.id) - problemIds.indexOf(b.id));

                // Thêm thông tin các problems vào đối tượng unit
                unit.dataValues.children = problems;
            }

            // Sắp xếp các units theo thứ tự của unitIds
            const orderedUnits = unitIds.map(id => units.find(unit => unit.id === id));

            // Thêm thông tin các units vào đối tượng course
            course.dataValues.units = orderedUnits;

            // Lấy ra các user trong members
            const members = await User.findAll({
                where: {
                    id: course.members
                },
                attributes: ['id', 'username', 'avatar_url', 'role']
            });

            // Thêm thông tin các members vào đối tượng course
            course.dataValues.members = members;

            res.status(200).json(course);
        } else {
            res.status(404).json({ message: 'Course not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUnits = async (req, res) => {
    const { id } = req.params;
    const { units } = req.body;
    const transaction = await sequelize.transaction();

    try {
        if (!units || !Array.isArray(units) || units.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Invalid units data' });
        }

        const course = await Course.findByPk(id, { transaction });

        if (!course) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Course not found' });
        }

        const unitIds = units.map(unit => unit.id);
        const existingUnits = await Unit.findAll({
            where: {
                id: unitIds
            },
            transaction
        });

        if (existingUnits.length !== units.length) {
            await transaction.rollback();
            return res.status(404).json({ error: 'One or more units not found' });
        }

        for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            if (!unit.children || !Array.isArray(unit.children)) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Invalid children data' });
            }

            const childrenIds = unit.children.map(child => child.id);
            const unitRecord = existingUnits.find(u => u.id === unit.id);
            unitRecord.children = childrenIds;
            await unitRecord.save({ transaction });
        }

        course.units = unitIds;
        await course.save({ transaction });

        await transaction.commit();
        res.status(200).json({ message: 'Units updated successfully' });

    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: error.message });
    }
};

const updateKey = async (req, res) => {
    const { id } = req.params;
    const { join_key } = req.body;

    try {
        const course = await Course.findByPk(id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        course.join_key = join_key;
        await course.save();
        res.status(200).json(course);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const togglePublishCourse = async (req, res) => {
    const { id } = req.params;

    try {
        const course = await Course.findByPk(id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        course.publish = !course.publish;
        await course.save();
        res.status(200).json(course);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const togglePublicCourse = async (req, res) => {
    const { id } = req.params;

    try {
        const course = await Course.findByPk(id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        course.public = !course.public;
        await course.save();
        res.status(200).json(course);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const toggleAutoJoin = async (req, res) => {
    const { id } = req.params;

    try {
        const course = await Course.findByPk(id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        course.auto_join = !course.auto_join;
        await course.save();
        res.status(200).json(course);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const updateCourse = async (req, res) => {
    const { id } = req.params;
    const { name, description, class_name, thumbnail, slug } = req.body;

    try {
        const course = await Course.findByPk(id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Nếu biến nào không null thì cập nhật
        if (name) { course.name = name; }

        if (description) { course.description = description; }

        if (class_name) { course.class_name = class_name.trim().toUpperCase(); }

        if (thumbnail) { course.thumbnail = thumbnail; }

        if (slug) { course.slug = slug; }

        await course.save();
        res.status(200).json(course);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        const course = await Course.findByPk(id);

        if (course) {
            await course.destroy();
            res.status(200).json({ message: 'Course deleted' });
        } else {
            res.status(404).json({ message: 'Course not found' });
        }

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createCourse,
    getCourses,
    getMyCourses,
    getCourseByIdOrSlug,
    joinCourse,
    getJoinedCourses,
    getCourseByIDForAdmin,
    updateUnits,
    updateKey,
    togglePublishCourse,
    togglePublicCourse,
    toggleAutoJoin,
    updateCourse,
    deleteCourse,
    // ADMIN
    getCoursesForAdmin
};