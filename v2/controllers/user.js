const { indexDB } = require("../db/adapters");
const { userDB } = require("../db/adapters/user");

const User = require('../db/models/user');
const Enrollment = require('../db/models/enrollment')
const { success, serverError, successAction } = require("../utils/api_response");
const { SG_sendMail } = require("../utils/mailer/mail");

const user = {
    getMe: async (req, res) => {
        try {
            const { id } = req.user;
            console.log(id);

            const projection = { email: 1, courses: 1, firstName: 1, lastName: 1, phoneNumber: 1, userType: 1 };
            const option = { lean: true };
            const meee = await userDB.findUser({_id: id}, projection, option);

            const populateOptions = {
                path: 'course_id',
                select: 'title description start_end end_date instructors duration location courseType createdDate, image, capacity',
    
                populate: {
                    path: 'instructors.instructor',
                    select: 'firstName lastName email phoneNumber',
                    model: 'User'
                },
    
                model: 'Course'
            };

            const courses = await indexDB.findAndPopulateData(Enrollment, { user_id: id }, {}, option, populateOptions);

            const me = {
                ...meee,
                enrolled_courses: courses
            }

            return success(res, me);
        } catch (error) {
            return serverError(res);
        }
    },

    contact: async (req, res) => {
        try {
            const { name, email, phone, message } = req.body;

            // const msg = await userDB.contact(name, email, message)
            SG_sendMail({ to: process.env.SUPPORT_MAIL, type: 'html', subject: 'Support Ticket', content: `<p>${message}</p> <p>Sender Name: ${name}</p> <p>Sender Email: ${email}</p>  <p>Sender Phone: ${phone}</p>` });

            return successAction(res)
        } catch (error) {
            console.log(error);
            return serverError(res);
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const aggregatePipeline = [
                { $match: {} },
                { $group: { _id: '$userType', count: { $sum: 1 }, docs: { $push: '$$ROOT' } } },
                { $sort: { createdDate: -1 } }
            ];

            const options = { lean: true };

            const users = await indexDB.aggregateData(User, aggregatePipeline, options)

            return success(res, users);
            // return res.status(200).json({ msg: 'All users compiled sucessfully', users })
        } catch (error) {
            return serverError(res, error.message);
            // return res.status(500).json({ msg: 'Server error', error: error.message })
        }
    },

    getAUser: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await userDB.findUser({ _id: id });

            return res.status(200).json({ data: { msg: `${user.firstName}'s details`, user } });
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', error: error.message })
        }
    },

    getAllInstructors: async (req, res) => {
        try {
            const condition = { userType: 'instructor' };
            const projection = { password: 0 };
            const option = { lean: true };

            const instructors = await userDB.find(condition, projection, option);

            // return res.status(200).json({ msg: `Instructors compilled`, instructors });
            return success(res, instructors)
        } catch (error) {
            return serverError(res);
            // return res.status(500).json({ msg: 'Server error', error: error.message })
        }
    },

    getAnInstructor: async (req, res) => {
        try {
            const { id } = req.params;

            const instructor = await User.findById(id);

            if (instructor.userType !== 'instructor') return res.status(400).json({ data: { msg: `User not an instructor` } });
            return res.status(200).json({ msg: `${instructor.firstName}'s details`, instructor });
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', error: error.message })
        }
    },

    getAllStudents: async (req, res) => {
        try {
            const condition = { userType: 'student' };
            const projection = { password: 0 };
            const option = { lean: true };

            const students = await userDB.find(condition, projection, option)

            // return res.status(200).json({ msg: `Students compilled`, students });
            return success(res, students)
        } catch (error) {
            // return res.status(500).json({ msg: 'Server error', error: error.message })
            return serverError(res);
        }
    },

    getAStudent: async (req, res) => {
        try {
            const { id } = req.params;

            const populateOptions = {
                path: 'courses.courseID',
                select: 'title description start_end end_date instructors duration location courseType createdDate',

                populate: {
                    path: 'instructors.instructor',
                    select: 'firstName lastName email phoneNumber',
                    model: 'User'
                },

                model: 'Course'
            };

            const student = await userDB.findUser({ _id: id });
            // const student = await indexDB.populateData(std, populateOptions);

            // return res.status(200).json({ msg: `${student.firstName}'s details`, student });
            return success(res, student, `${student.firstName}'s details`)
        } catch (error) {
            console.log(error);
            // return res.status(500).json({ msg: 'Server error', error: error.message })
            return serverError(res);
        }
    },

    deleteUser: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await userDB.deleteUser({ _id: id });

            return res.status(200).json({ data: { msg: `${user.email}'s accoun deleted successfully` } })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', error: error.message })
        }
    },
}

module.exports = user;