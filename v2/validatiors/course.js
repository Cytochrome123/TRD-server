const { check, body } = require('express-validator');
// import { addDays, getWeek, isBefore } from "date-fns";

const Validator = require('.');
const { authDBValidator } = require('../db/adapters/auth');
const { gfs } = require('../utils/gridfs');
const { indexDB } = require('../db/adapters');
const { userDB } = require('../db/adapters/user');
const factory = require('../config/factory');
const { courseDB, courseDBValidator } = require('../db/adapters/course');
const { default: mongoose } = require('mongoose');

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
                            path: 'enrolled.userID instructors.instructor',
                            select: 'firstName lastName email phoneNumber',
                            model: 'User'
                        }

                    const course = await courseDB.getACourse(id, projection, option, populateOptions);

                    if (!course) throw new Error('Course does not exist')

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
                    const user = req.user;

                    if (user.userType !== 'admin') throw new Error('UnAuthorized! Only Admin can access this')

                    const exists = courseDBValidator.doesCourseExist({ title });

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
                    const endDate = new Date(start_date);

                    const minEndDate = addDays(new Date(), 7);

                    if (isBefore(endDate, minEndDate)) {
                        throw new Error("A circle can not be less than 7 days!");
                    }

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
                        throw new Error("A circle can not be less than 7 days!");
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
            in: ['file'],
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
    })
}

module.exports = courseValidations;