const Course = require('../models/course');

const courseDB = {
    getAllCourses: async () => {
        try {
            const courses = await Course.find();

            return courses;
        } catch (error) {
            throw error;
        }
    },

    getACourse: async (id, projection = {}, options = {}, populateOptions = {}) => {
        try {
            const course = await Course.findById(id, projection, options).populate(populateOptions).exec()

            return course;
        } catch (error) {
            throw error;
        }
    },

    createCourse: async (courseDetails) => {
        try {
            const course = await Course.create({...courseDetails})

            return course;
        } catch (error) {
            throw error;
        }
    },

    updateCourse: async (condition, update, options = {}) => {
        try {
            const updated = await Course.findOneAndUpdate(condition, update, options);

            return updated;
        } catch (error) {
            
        }
    }
}


const courseDBValidator = {
    doesCourseExist: async (condition, options = {}) => {
        try {
            const course = await Course.findOne(condition, options);

            return course;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = { courseDB, courseDBValidator };