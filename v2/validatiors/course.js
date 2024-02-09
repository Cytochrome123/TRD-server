const { check, body } = require('express-validator');
const { addDays, getWeek, isBefore, isPast, startOfDay, isToday, isAfter } = require("date-fns");
const Course = require('../db/models/course')
const Validator = require('.');
const { authDBValidator } = require('../db/adapters/auth');
const { gfs } = require('../utils/gridfs');
const { indexDB } = require('../db/adapters');
const { userDB } = require('../db/adapters/user');
const factory = require('../config/factory');
const { courseDB, courseDBValidator } = require('../db/adapters/course');
const { default: mongoose } = require('mongoose');
const { quizDBValidator } = require('../db/adapters/quiz');

const courseValidations = {
    validateGetACourse: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id, { req }) => {
                    const my_details = req.user;
                    const isAdmin = my_details.userType === 'admin';
                    let projection;
                    let option = { lean: true };
                    let populateOptions;
                    isAdmin ? projection = {} : projection = { instructorsID: 0, capacity: 0, enrolled: 0, enrollment_count: 0 };
                    isAdmin ?
                        populateOptions = {
                            path: 'enrolled.userID instructors.instructor',
                            model: 'User'
                        } :
                        populateOptions = {
                            path: 'instructors.instructor',
                            select: 'firstName lastName email phoneNumber',
                            model: 'User'
                        }

                    const course = await courseDB.populateData({ _id: id }, projection, option, populateOptions);
                    // console.group(course)
                    if (!course) throw new Error('Course does not exist')

                    // const fullData = await indexDB.populateData(course, populateOptions);

                    req.body = { ...req.body, course }
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
                }
            }
        },
        description: {
            in: ["body"],
            isString: true,
            optional: true,
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
                    const endDate = new Date(end_date);

                    const minEndDate = addDays(new Date(), 7);

                    if (isBefore(endDate, minEndDate)) {
                        throw new Error("A course can not be less than 7 days!");
                    }

                    return true;
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
        image: {
            in: ['body'],
            notEmpty: true,
            custom: {
                options: async (value, { req, res }) => {
                    if (!req.files.image) throw new Error('Please upload ur profile pictire')

                    const files = req.files;
                    if (files.image[0].size > 5000000) {
                        const del = await indexDB.deleteImage(res, gfs(), files.image[0].id);
                        if (del) throw new Error(`${del} \n\n File shld not exceed 5mb`);
                        throw new Error('File shld not exceed 5mb');
                    };

                    req.body['image'] = { imageID: files.image[0].id, path: files.image[0].filename };
                }
            },
            errorMessage: 'Course image is required'
        },
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

    validateAssignInstructor: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id, { req }) => {
                    const user = req.user;

                    if (user.userType !== 'admin') throw new Error('UnAuthorized! Only Admin can access this')

                    const condition = { _id: id, creatorID: new mongoose.Types.ObjectId(user.id) }

                    const course = await courseDBValidator.doesCourseExist(condition)

                    if (!course) throw new Error('You can only assign instructors to courses created by you');
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
                        const condition = { _id: instructors[i].instructor, userType: 'instructor' }
                        const user = await authDBValidator.doesUserExist(condition)
                        if (!user) throw new Error(`${instructors[i].instructor}'s account not found, a valid instructor is required`);

                        // check if the instructor has already been assugned the course

                        const name = `${user.firstName} ${user.lastName}`;
                        if (course.instructors.some((instruct) => instruct.instructor.equals(instructors[i].instructor))) {
                            console.log(instructors[i].instructor)
                            throw new Error(`${name} has already been assigned to this course, effect beforre you can continue`);
                        };
                    };
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
                    const my_details = req.user;
                    if (!my_details === 'admin') throw new Error('Only admin can accesss this!')


                    const course = await courseDBValidator.doesCourseExist({ _id: id });

                    if (!course) throw new Error('Course does not exist');
                }
            }
        },
        status: {
            in: ['body'],
            isString: true,
            optional: false
        },
        deadline: {
            in: ['body'],
            isString: true,
            isISO8601: { errorMessage: "invalid iso" },
            custom: {
                options: (deadline, { req }) => {
                    const date = new Date(deadline);

                    // chack if the deadline is not a date before today
                    const before = isBefore(date, new Date());

                    if (before) throw new Error('The deadline can not be set to days before today');

                    return true

                    // const minEndDate = addDays(new Date(), 7);

                    // if (isPast(endDate, minEndDate)) {
                    //     throw new Error("A circle can not be less than 7 days!");
                    // }

                    // return true;
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

                    if (course.status !== 'application') throw new Error('Sorry this course is not open for application at the moment. Kindly check back later')

                    const available = new Date(course.deadline) >= new Date()
                    if (!available) throw new Error('Sorry, the deadline for enrollment has passed. Kindly check back or contact the organizers for more information. Thanks')

                    const registered = course.enrolled.some(enrollment => enrollment.userID?.equals(my_details.id));

                    const passed = course.enrolled.grade === 'passed'

                    console.log(registered, 'registered');
                    console.log(passed, 'eligible');

                    if (registered && passed) throw new Error('You can only enroll for a course once except if previously failed!')
                    req.body = { ...req.body, course }
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

    validateCompleteQuiz: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id) => {
                    const course = await courseDBValidator.doesCourseExist({ _id: id })

                    if (!course) throw new Error('Course does not exist')
                }
            }
        },
        name: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (name, { req }) => {
                    const { id } = req.params;
                    const quiz = await quizDBValidator.quizExistForCourse({ courseID: id, name })

                    if (!quiz) throw new Error('Quiz does not exist')
                }
            }
        },
        sheetID: {
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

                    if (course.enrolled.length < 1) throw new Error('No student for this course yet')
                }
            }
        },
    })
}

module.exports = courseValidations;