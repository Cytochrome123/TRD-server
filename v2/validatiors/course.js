const { check, body } = require('express-validator');
const { addDays, getWeek, isBefore, isPast, startOfDay, isToday, isAfter, isSameDay } = require("date-fns");
const Course = require('../db/models/course')
const Validator = require('.');
const { authDBValidator } = require('../db/adapters/auth');
const { gfs } = require('../utils/gridfs');
const { indexDB } = require('../db/adapters');
const { userDB } = require('../db/adapters/user');
const factory = require('../config/factory');
const { courseDB, courseDBValidator } = require('../db/adapters/course');
const { default: mongoose } = require('mongoose');
const { quizDBValidator, quizDB } = require('../db/adapters/quiz');
const { options } = require('../routes');
const { badRequest } = require('../utils/api_response');

const courseValidations = {
    validateGetACourse: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id, { req }) => {
                    const course = await courseDBValidator.doesCourseExist({ _id: id })

                    if (!course) throw new Error('Invaid course');
                }
            }
        }
    }),

    validateCreateCourse: Validator.validate({
        title: {
            in: ["body"],
            isString: true,
            notEmpty: true,
            errorMessage: 'Title is required',
            custom: {
                options: async (title, { req }) => {
                    const exists = await courseDBValidator.doesCourseExist({ title });
                    console.log(exists)
                    if (exists) throw new Error('Course with the same title exists')

                    const files = req.files;
                    req.body['image'] = { imageID: files.image[0].id, path: files.image[0].filename };
                }
            }
        },
        description: {
            in: ["body"],
            isString: true,
            optional: true,
        },
        tags: {
            in: 'body',
            isArray: true,
            optional: true,
            notEmpty: true
        },
        duration: {
            in: ['body'],
            isString: true
        },
        start_date: {
            in: ["body"],
            isString: true,
            isISO8601: { errorMessage: "invalid iso" },
            custom: {
                options: (start_date, { req }) => {

                    // const today = startOfDay(new Date());
                    const isNotBeforeToday = isToday(start_date) || !isBefore(start_date, new Date());

                    if (!isNotBeforeToday) throw new Error("The start date cannot be before today");

                    return true;
                }
            },
        },
        end_date: {
            in: ["body"],
            isString: true,
            isISO8601: { errorMessage: "invalid iso" },
            custom: {
                options: (end_date, { req }) => {
                    const endDate = new Date(end_date); // 20

                    const minEndDate = addDays(new Date(req.body.start_date), 6); // 21 minimum
                    console.log(endDate, minEndDate);

                    if (isBefore(minEndDate, endDate) || isSameDay(minEndDate, endDate)) {
                        // if (isBefore(minEndDate, endDate)) {
                        return true;
                    }
                    throw new Error("A course can not be less than 7 days!");

                }
            },
        },
        location: {
            in: ['body']
        },
        capacity: {
            in: ['body']
        },
        amount: {
            in: ['body']
        },
        // image: {
        //     in: ['body'],
        //     notEmpty: true,
        //     custom: {
        //         options: async (value, { req, res }) => {
        //             if (!req.files.image) throw new Error('Please upload ur profile pictire')

        //             const files = req.files;
        //             if (files.image[0].size > 5000000) {
        //                 const del = await indexDB.deleteImage(res, gfs(), files.image[0].id);
        //                 if (del) throw new Error(`${del} \n\n File shld not exceed 5mb`);
        //                 throw new Error('File shld not exceed 5mb');
        //             };

        //             req.body['image'] = { imageID: files.image[0].id, path: files.image[0].filename };
        //         }
        //     },
        //     errorMessage: 'Course image is required'
        // },
        deadline: {
            in: ['body'],
            isString: true,
            isISO8601: { errorMessage: "invalid iso" },
            optional: true,
            custom: {
                options: (deadline, { req }) => {
                    const isAfterToday = isAfter(deadline, new Date())

                    if (!isAfterToday) throw new Error("The deadline for application cannot be less than a day");

                    return true;
                }
            },
        }
    }),

    validateGetCourseStudents: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id, { req }) => {
                    const course = await courseDBValidator.doesCourseExist({ _id: id })

                    if (!course) throw new Error('Invaid course');
                }
            }
        }
    }),

    validateAssignInstructor: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id, { req }) => {
                    // const condition = { _id: id, creatorID: new mongoose.Types.ObjectId(user.id) }
                    const condition = { _id: id }

                    const course = await courseDBValidator.doesCourseExist(condition)

                    if (!course) throw new Error('Invalid course');
                }
            }
        },
        instructors: {
            in: ["body"],
            isArray: { options: { min: 1 } },
            notEmpty: true,
            custom: {
                options: async (instructors, { req }) => {
                    instructors.map(inst => (inst.instructor))
                    if (new Set(instructors.map(inst => (inst.instructor))).size !== instructors.length) throw new Error('Each instructor must be unique');

                    const course = await courseDB.getACourse(req.params.id);

                    // check iif the selected instructor actually exists

                    for (let i = 0; i < instructors.length; i++) {
                        // const condition = { _id: instructors[i].instructor, userType: 'instructor' }
                        const condition = { _id: instructors[i].instructor }
                        const user = await authDBValidator.doesUserExist(condition)
                        if (!user) throw new Error(`${instructors[i].instructor}'s account not found, a valid instructor is required`);

                        // check if the instructor has already been assugned the course

                        const name = `${user.firstName} ${user.lastName}`;
                        if (course.instructors.some((instruct) => instruct.instructor.equals(instructors[i].instructor))) {
                            console.log(instructors[i].instructor)
                            throw new Error(`${name} has already been assigned to this course, effect beforre you can continue`);
                        };
                    }
                }
            }
        },
    }),

    validateDeassign: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id) => {
                    const course = await courseDBValidator.doesCourseExist({ _id: id })

                    if (!course) throw new Error('Course does not exist')
                }
            }
        }
    }),

    validateChangeCourseStatus: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id, { req }) => {
                    const course = await courseDBValidator.doesCourseExist({ _id: id });

                    if (!course) throw new Error('Course does not exist');
                }
            }
        },
        status: {
            in: ['body'],
            // isString: true,
            isIn: { options: [['upcoming', 'application', 'in-progress', 'completed']] },
            optional: false,
            custom: {
                options: async status => {
                    const module_zero = await courseDBValidator.doesCourseExist({ isModuleZero: true });

                    if(!module_zero) throw new Error('Module 0 course is required, kindly create it to proceed with this step');

                    const entry_quiz = await quizDBValidator.quizExistForCourse({ course_id: module_zero._id, type: 'entry' });

                    if (status === 'application' && !entry_quiz) throw new Error("You're yet to add an entry quiz, please add it before you can continue")
                }
            }
        },
        deadline: {
            in: ['body'],
            isISO8601: { errorMessage: "Invalid iso" },
            optional: true,
            custom: {
                options: (deadline, { req }) => {
                    const date = new Date(deadline);

                    // chack if the deadline is not a date before today
                    const before = isBefore(date, new Date());

                    if (before) throw new Error('The deadline can not be set to days before today');

                    return true
                }
            }
        }
    }),

    validateGetCourseStudent: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id) => {
                    const course = await courseDBValidator.doesCourseExist({ _id: id })

                    if (!course) throw new Error('Course does not exist')
                }
            }
        }
    }),

    validateEnrollForCourse: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id, { req }) => {
                    const my_details = req.user;
                    const projection = { password: 0, instructor_id: 0, capacity: 0, enrollment_count: 0 }
                    let option = { lean: true };

                    const course = await courseDB.getACourse(id, projection, option);

                    if (!course) throw new Error('Course does not exist');
                    
                    const [registered] = await courseDB.getEnroledCourses({ user_id: my_details.id, course_id: course._id });

                    let eligible = true;
                    if (registered && registered.passed) eligible = false;

                    console.log(registered, 'registered');

                    if (registered && !eligible) throw new Error('You\'ve enrolledd to this before');

                    if (course.status !== 'application') throw new Error('Sorry this course is not open for application at the moment. Kindly check back later')

                    const available = new Date(course.deadline) >= new Date()
                    if (!available) throw new Error('Sorry, the deadline for enrollment has passed. Kindly check back or contact the organizers for more information. Thanks');

                    const quiz = await quizDB.getAQuiz({ type: 'entry' })
                    if (!quiz) throw new Error('Entry quiz not found');

                    const attempt = await quizDB.getAttemptedQuiz({ user_id: my_details.id, quiz_id: quiz.id });
                    console.log(attempt, 'attempt')
                    if (!attempt && !course.isModuleZero) throw new Error('You are yet to attempt the entry quiz');

                    if (!attempt?.passed && !course.isModuleZero) throw new Error('You cannot enrol for this course at the moment, as you did not meet the requirements. Kindly take module 0 to be eligible to enrol to any courses later. Thanks');


                    // const registered = course.enrolled.some(enrollment => enrollment.userID?.equals(my_details.id));

                    // const passed = course.enrolled.grade === 'passed'

                    // console.log(registered, 'registered');
                    // console.log(passed, 'eligible');

                    // if (registered && passed) throw new Error('You can only enroll for a course once except if previously failed!')
                    req.body = { ...req.body, course }
                }
            }
        }
    }),

    validateQuizSetup: Validator.validate({
        name: {
            in: ['body'],
            isString: true
        },
        link: {
            in: ['body'],
            isString: true
        },
        sheet_id: {
            in: ['body'],
            isString: true
        },
        pass_mark: {
            in: ['body'],
            isInt: { options: { min: 1 } },
            errorMessage: 'Pass mark cannot be less than 1'
        },
        type: {
            in: ['body'],
            isIn: {
                options: [['entry', 'end']],
                errorMessage: 'Type must be either "entry" or "end"'
            }
        },
        course_id: {
            in: ['body'],
            isString: true,
            custom: {
                options: async course_id => {
                    const course = await courseDB.getACourse(course_id);

                    if (!course) throw new Error('Invalid course')
                }
            }
        }
    }),

    validateAddQuizToCourse: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id) => {
                    const course = await courseDBValidator.doesCourseExist({ _id: id });

                    if (!course) throw new Error('Course does not exist!');
                }
            }
        },
        name: {
            in: ['body'],
            isString: true,
            custom: {
                options: async (name, { req }) => {
                    const { id } = req.params;

                    const condition = { courseDB: id, name }
                    const exists = await quizDBValidator.quizExistForCourse(condition)

                    if (exists) throw new Error('The quiz already exist for this course')
                }
            }
        },
        link: {
            in: ['body'],
            isString: true
        },
        sheetID: {
            in: ['body'],
            isString: true
        },
        pass_mark: {
            in: ['body'],
            isInt: true
        },
    }),

    validateGetAllQuizForACourse: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id) => {
                    const course = await courseDBValidator.doesCourseExist({ _id: id })

                    if (!course) throw new Error('Course does not exist')
                }
            }
        }
    }),

    validateCompletedEntryQuiz: Validator.validate({
        name: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (name, { req }) => {
                    const { sheet_id } = req.params;
                    const quiz = await quizDBValidator.quizExistForCourse({ name, sheet_id, type: 'entry' });

                    if (!quiz) throw new Error('Entry quiz not found');

                    req.body.quiz = quiz;
                }
            }
        },
        sheet_id: {
            in: ['params'],
            isString: true
        }
    }),

    validateDownloadCourseStudent: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id) => {
                    const course = await courseDBValidator.doesCourseExist({ _id: id })

                    if (!course) throw new Error('Course does not exist')

                    if (course.enrollment_count < 1) throw new Error('No student for this course yet')
                }
            }
        },
    }),

    validateDownloadStudentList: async (req, res, next) => {
        try {
            const students = await userDB.find({ userType: 'student' });

            if (!students) throw new Error('Could not fetch students');

            if (students.length < 1) throw new Error('No student at the moment');

            req.body.students = students
            return next();
        } catch (error) {
            return badRequest(res, null, error.message)
        }
    }
}

module.exports = courseValidations;