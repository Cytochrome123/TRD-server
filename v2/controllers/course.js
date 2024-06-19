const exceljs = require('exceljs');

const { indexDB } = require("../db/adapters");
const { courseDB } = require("../db/adapters/course");
const { quizDB } = require("../db/adapters/quiz");
const { userDB } = require("../db/adapters/user");
const authClient = require("../utils/googleapis/auth");
const { getQuizResponse } = require("../utils/googleapis/sheet");
const { success, serverError, successAction, created, badRequest } = require('../utils/api_response');
const Enrollment = require('../db/models/enrollment');
const { SG_sendMail, SG_sendBulkMessage } = require('../utils/mailer/mail');
const factory = require('../config/factory');
const { customError } = require('../utils/helper');
// const { default: authClient } = require("../utils/googleapis/auth");

const course = {
    getCourses: async (req, res) => {
        try {

            const courses = await courseDB.getAllCourses({});

            return success(res, courses, 'Courses loaded');
            // return res.status(200).json({ msg: 'Courses loaded', courses })
        } catch (error) {
            console.log(error);
            return serverError(res);
            // return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    getACourse: async (req, res) => {
        try {
            const { id } = req.params;
            let projection = {};
            const option = { lean: true };
            const populateOptions = {
                path: 'instructors.instructor',
                select: 'firstName lastName email phoneNumber',
                model: 'User'
            };

            const [course] = await courseDB.populateData({ _id: id }, projection, option, populateOptions)

            return success(res, course);
        } catch (error) {
            // return res.status(500).json({ msg: 'Server error', err: error.message })
            return serverError(res);
        }
    },

    createCourse: async (req, res) => {
        try {
            const courseDetails = req.body;
            courseDetails['creatorID'] = req.user.id;
            // courseDetails['status'] = 'Upcoming';
            console.log(courseDetails, 'CD')

            const course = await courseDB.createCourse(courseDetails)

            // return res.status(201).json({ msg: 'Course created', course })
            return created(res, course, 'Created');
        } catch (error) {
            if (error.code == 11000) return serverError(res, 'Module zero already exists!')
            console.log((error));
            // return res.status(500).json({ msg: 'Server error', err: error.message })
            return serverError(res);
        }
    },

    getCourseStudents: async (req, res) => {
        try {
            const { id } = req.params;
            const populateOptions = {
                path: 'user_id',
                select: 'firstName lastName email phoneNumber',

                model: 'User'
            };

            const students = await indexDB.findAndPopulateData(Enrollment, { course_id: id }, {}, {}, populateOptions);

            return success(res, students);
        } catch (error) {
            return serverError(res)
        }
    },

    assignInstructor: async (req, res) => {
        try {
            const { instructors } = req.body;

            const condition = { _id: req.params.id };
            const assign = {
                $push: {
                    instructors: {
                        $each: instructors.map((instructor) => ({ instructor: instructor.instructor })),
                    },
                },
            };

            const assigned = await courseDB.updateCourse(condition, assign, { lean: true, new: true })

            return success(res, assigned, 'Intructor(s) assigned successfully')
        } catch (error) {
            console.log(error);
            return serverError(res)
        }
    },

    deassignInstructor: async (req, res) => {
        try {
            const { instructorID, id } = req.params;
            const condition = { instructors: { $elemMatch: { instructorsID: { $in: [instructorID] } } } };

            const projection = { title: 1, description: 1, instructors: 1 };
            const options = { lean: true };

        } catch (error) {

        }
    },

    changeCourseStatus: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status, deadline } = req.body;

            const update = {
                ...(deadline && { deadline }),
                ...(status && { status })
            }

            const updated = await courseDB.updateCourse({ _id: id }, update, { new: true });

            const emails = [];
            const all = [];

            if (updated.status == 'application') {
                // get All users;
                // const students = await userDB.find({ userType: 'student' })
                // const students = await userDB.find({ userType: { $ne: 'admin'} })
                const students = await userDB.find({ userType: { $nin: ['admin', 'instructor'] } })

                if (students) {
                    for (let student of students) {
                        emails.push(student.email);
                    }


                    const msg = {
                        subject: `The wait has finally ended`,
                        text: `${updated.title} is now open to application, kindly get yourselves enrolled before it closes. The deadline for application is ${updated.deadline}. Thanks`
                    }
                    // SG_sendMail({ to: email, type: 'html', subject: 'The wait has finally ended', content: emailContent });
                    const sent = await SG_sendBulkMessage(emails, msg, factory.generateTimestamps(emails.length, 10))
                    if (!sent) return next(`Failed to send mail to ${emails}`)
                    console.log(`Mail sent to ${emails}`)
                };

            };

            const populateOptions = {
                path: 'user_id',
                select: 'firstName lastName email phoneNumber',
                model: 'User'
            };

            const students = await indexDB.findAndPopulateData(Enrollment, { course_id: id }, {}, {}, populateOptions);

            for (let student of students) {
                all.push(student.user_id.email);
            };

            if (updated.status == 'in-progress') {
                if (all.length) {
                    const msg = {
                        subject: `The wait has finally ended`,
                        text: `The course titled ${updated.title} has already begun, log onto the portal and get started`,
                    }

                    const sent = await SG_sendBulkMessage(all, msg, factory.generateTimestamps(all.length, 10))
                    if (!sent) return next(`Failed to send mail to ${all}`)
                    console.log(`Mail sent to ${all}`)
                }
            } else if (updated.status == 'completed') {
                if (all.length) {
                    const msg = {
                        subject: `Congratulations!!!`,
                        text: `The course titled ${updated.title} has now ended, finish up all you need to do in order to be eligible to request for your certificate`,
                    }
                    const sent = await SG_sendBulkMessage(all, msg, factory.generateTimestamps(all.length, 10))
                    if (!sent) return next(`Failed to send mail to ${all}`)
                    console.log(`Mail sent to ${all}`)
                }
            }

            return success(res, { status: updated.status, deadline: updated.deadline }, 'Course status updated succesfully')
        } catch (error) {
            // console.log(error.response?.body);
            console.log(error);
            // return res.status(500).json({ msg: 'Server error', err: error.message })
            return serverError(res);
        }
    },

    getAssignedCourses: async (req, res) => {
        try {
            const condition = { instructors: { $elemMatch: { instructor: req.user.id } } };

            const courses = await courseDB.getAllCourses(condition)

            // return res.status(200).json({ msg: 'Assigned courses!!', assignedcourses: courses })
            return success(res, courses, 'Assigned courses!!')
        } catch (error) {
            console.log(error);
            // res.status(500).json({ data: { msg: 'Server error', error: err.message } });
            return serverError(res);
        }
    },

    getCourseStudent: async (req, res) => {
        try {
            const { id } = req.params;
            const condition = { course_id: id };
            let projection = { title: 1, status: 1, enrolled: 1, enrollment_count: 1 };
            const option = { lean: true };

            const populateOptions = {
                path: 'user_id',
                select: 'firstName lastName email phoneNumber',

                // populate: {
                //     path: 'instructors.instructor',
                //     select: 'firstName lastName email phoneNumber',
                //     model: 'User' 
                // },

                model: 'User'
            };

            // const course = await courseDB.getACourse(id, projection, option);

            // let students = []
            // if (course.length) students = await indexDB.populateData(course, populateOptions);

            const students = await indexDB.findAndPopulateData(Enrollment, condition, projection, option, populateOptions);

            return success(res, students);
        } catch (error) {
            return serverError(res);
        }
    },

    enrollToCourse: async (req, res) => {
        try {
            const { id, userType, firstName, lastName, email } = req.user;
            const { id: course_id } = req.params;
            const { course } = req.body;

            console.log(course, 'COURSE')

            const register = await indexDB.create(Enrollment, { user_id: id, course_id: course_id })

            await courseDB.updateCourse({ _id: course_id }, { enrollment_count: course.enrollment_count++ }, { new: true })

            if (userType == 'user') {
                // const updatedUser = await User.findByIdAndUpdate(id, { userType: 'student' }, { new: true });
                const updatedUser = await userDB.updateUser({ _id: id }, { userType: 'student' }, { new: true });
                let renewToken = factory.renewToken(id, firstName, lastName, email, updatedUser.userType)
                console.log(renewToken, 'renew')
                return success(res, { renewToken }, 'Course enrollment sucessfull');
            }
            return successAction(res, 'Course enrollment sucessfull');

            // const register = {
            //     $push: {
            //         enrolled: {
            //             userID: my_details.id,
            //             paid: course.courseType === 'free' ? true : false
            //         }
            //     }
            // }
            // const addToMyCourseList = {
            //     $push: {
            //         courses: {
            //             courseID: course._id,
            //         }
            //     },
            //     userType: my_details.userType !== 'admin' && 'student'
            //     // userType: my_details.userType !== 'student' ? "student" : '' -------------------------------------------------------------------------
            // }
            // const options = { lean: true, new: true };

            // const registered = await courseDB.updateCourse({ _id: id }, register, options);

            // if (!registered) return res.status(400).json({ data: { msg: 'Enrollment failed' } });

            // const updateEnrollmentList = await userDB.updateUser({ _id: my_details.id }, addToMyCourseList, options);
            // if (updateEnrollmentList) console.log('updated')

        } catch (error) {
            console.log(error);
            if (error.code == 11000) return serverError(res, 'Enrolledd for this before')
            return serverError(res)
        }
    },

    getMyCourses: async (req, res) => {
        try {
            const { id } = req.user;
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

            const courses = await indexDB.findAndPopulateData(Enrollment, { user_id: id }, {}, {}, populateOptions);

            return success(res, courses);
        } catch (error) {
            return serverError(res)
        }
    },

    addQuizToCourse: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, link, sheetID, pass_mark } = req.body;

            const quiz = await quizDB.createQuiz(id, { name, link, sheetID, pass_mark })

            return res.status(200).json({ msg: 'Quiz created', quiz });
        } catch (error) {
            res.status(500).json({ data: { msg: 'Server error', error: err.message } });
        }
    },

    getAllQuizForCourse: async (req, res) => {
        try {
            const { id } = req.params;

            const all = await quizDB.getCourseQuiz(id);

            return res.status(200).json({ msg: 'All quiz', quiz: all });
        } catch (error) {
            res.status(500).json({ data: { msg: 'Server error', error: error.message } });
        }
    },

    completedEntryQuiz: async (req, res) => {
        try {
            const { id, email } = req.user;
            const { name, sheet_id } = req.params;
            const { quiz } = req.body;

            const data = await getQuizResponse(sheet_id);

            // if (!data.length) throw new Error('Answers not recorded')
            if (!data.length) throw customError('Answers not recorded');

            const fin = []

            console.log('datasss')

            const emailIndex = data[0].findIndex(d => d == 'Email')
            console.log(emailIndex)
            const scoreIndex = data[0].findIndex(d => d == 'Score')
            console.log(scoreIndex)

            // data.shift();

            for (let d of data) {
                fin.push({ email: d[emailIndex], score: d[scoreIndex] })
            }

            console.log(fin)

            const result = fin.find(data => data.email === email);

            if (!result) throw customError('You are yet to attempt the quiz')

            const score = result.score.split(' / ')[0]

            console.log(score, 'score');

            const attempt = await quizDB.addAttemptedQuiz({ user_id: id, quiz_id: quiz._id, score, passed: score >= quiz.pass_mark ? true : false });

            if (!attempt) throw customError('Failed to keep attempt');

            return success(res, { hasTakenQuiz: !!result, quizPassed: score >= quiz.pass_mark ? true : false })
        } catch (error) {
            console.log(error);
            if (error.code == 11000) return serverError(res, "You can't attempt the test more than once");
            if (error.type == 'custom') return serverError(res, error.message);
            return serverError(res);
        }
    },

    getModuleZero: async (req, res) => {
        try {
            const [module_zero] = await courseDB.getAllCourses({ isModuleZero: true });

            if (!module_zero) throw new Error('Could not find module 0');

            return success(res, module_zero);
        } catch (error) {
            return serverError(res);
        }
    },

    downloadAllCourse: async (req, res) => {
        try {
            let workbook = new exceljs.Workbook();

            const sheet = workbook.addWorksheet('Courses');

            sheet.columns = [
                { header: 'Title', key: 'title', width: 25 },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'No of Instructors', key: 'instructors', width: 15 },
                { header: 'No of students', key: 'students', width: 15 },
                { header: 'Start Date', key: 'start', width: 25 },
                { header: 'End Date', key: 'end', width: 25 },
                { header: 'Duration', key: 'duration', width: 25 },
                { header: 'Capacity', key: 'capacity', width: 25 },
                { header: 'Status', key: 'status', width: 25 },
                { header: '∂eadline', key: 'deadline', width: 25 },
                { header: 'Course Type', key: 'type', width: 25 },
            ];

            const courses = await Course.find({});

            if (!courses) throw new Error('No course yet');

            courses.map((d) => {
                sheet.addRow({
                    title: d.title,
                    description: d.description,
                    instructors: d.instructors.length,
                    students: d.enrolled.length,
                    start: d.start_date,
                    end: d.end_date,
                    duration: d.duration,
                    capacity: d.capacity,
                    status: d.status,
                    deadline: d.deadline,
                    type: d.courseType,
                })
            });

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                "attachment;filename=" + `All courses.xlsx`
            );

            workbook.xlsx.write(res);
        } catch (error) {
            console.log(error)
            // res.status(error.status || 500).json({ msg: 'Server error', err: error.message });
            return serverError(res)
        }
    },

    downloadCourseStudents: async (req, res) => {
        try {
            const { id } = req.params;

            // if (course.enrollment_count < 1) return badRequest(res, null, 'No student for this course yet')

            let workbook = new exceljs.Workbook();

            const sheet = workbook.addWorksheet('Students');

            sheet.columns = [
                { header: 'First Name', key: 'fName', width: 25 },
                { header: 'Last Name', key: 'lName', width: 25 },
                { header: 'Email', key: 'email', width: 50 },
                { header: 'Phone Number', key: 'phone', width: 25 }
            ];

            const populateOptions = {
                path: 'user_id',
                select: 'firstName lastName email phoneNumber',

                // populate: {
                //     path: 'course_id',
                //     select: 'title description',
                //     model: 'Course'
                // },

                model: 'User'
            };

            const pop2 = {
                path: 'course_id',
                select: 'title description',
                model: 'Course'
            }

            const students = await Enrollment.find({ course_id: id }).populate(populateOptions).populate(pop2).exec();
            // const students = await indexDB.findAndPopulateData(Enrollment, { course_id: id }, {}, {}, populateOptions).populate(pop2).exec();
            // if (!students) throw new Error('Could not fetch students');
            console.log(students, 'sss')

            students.map((d) => {
                sheet.addRow({
                    fName: d.user_id.firstName,
                    lName: d.user_id.lastName,
                    email: d.user_id.email,
                    phone: d.user_id.phoneNumber,
                })
            });

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                "attachment;filename=" + `${students[0].course_id.title} students.xlsx`
            );

            workbook.xlsx.write(res);
        } catch (error) {
            console.log(error)
            // res.status(error.status || 500).json({ msg: 'Server error', err: error.message });
            return serverError(res);
        }
    },

    downloadStudents: async (req, res) => {
        try {
            const { students } = req.body;
            let workbook = new exceljs.Workbook();

            const sheet = workbook.addWorksheet('Students');

            sheet.columns = [
                { header: 'First Name', key: 'fName', width: 25 },
                { header: 'Last Name', key: 'lName', width: 25 },
                { header: 'Email', key: 'email', width: 50 },
                { header: 'Phone Number', key: 'phone', width: 25 }
            ];

            students.map((std) => {
                sheet.addRow({
                    fName: std.firstName,
                    lName: std.lastName,
                    email: std.email,
                    phone: std.phoneNumber,
                })
            });

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                "attachment;filename=" + `All students.xlsx`
            );

            workbook.xlsx.write(res);
        } catch (error) {
            console.log(error);
            return serverError(res)
        }
    },

    getEnrolledCourses: async (req, res) => {
        try {
            const enrollments = await courseDB.getEnroledCourses({})

            return success(res, enrollments);
            // res.status(200).json({ msg: 'Enrollments!!', enrollments });
        } catch (error) {
            // res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
            return serverError(res)
        }
    },

    getQuizzes: async (req, res) => {
        try {
            const quiz = await quizDB.getAllQuiz();

            return success(res, quiz);
        } catch (error) {
            return serverError(res)
        }
    },

    setupQuiz: async (req, res) => {
        try {
            const { name, link, sheet_id, pass_mark, course_id, type } = req.body;

            const quiz = await quizDB.createQuiz(course_id, { name, link, sheet_id, pass_mark, type })

            // return res.status(200).json({ msg: 'Quiz created', quiz });
            return created(res, quiz, 'Created');
        } catch (error) {
            console.log(error);
            if (error.code == 11000 && error.keyPattern.name) return serverError(res, 'Quiz with the same title and type already exists for this course');
            if (error.code == 11000 && error.keyPattern.type) return serverError(res, 'An entry quiz already exists');
            return serverError(res);
        }
    },

    getEntryQuiz: async (req, res) => {
        try {
            const quiz = await quizDB.getAQuiz({ courseID: null, type: 'entry' });

            return success(res, quiz);
        } catch (error) {
            return serverError(res)
        }
    },

    checkEntryQuiz: async (req, res) => {
        try {
            const { id } = req.user;
            const quiz = await quizDB.getAQuiz({ type: 'entry' })
            if (!quiz) throw new Error('Entry quiz not found');

            const attempt = await quizDB.getAttemptedQuiz({ user_id: id, quiz_id: quiz.id });

            return success(res, { hasTakenQuiz: !!attempt, quizPassed: attempt ? attempt.passed : false })
        } catch (error) {
            console.log(error);
            return serverError(res)
        }
    }
}

module.exports = course;