const Course = require('../models/course');
const Enrollment = require('../models/enrollment');

const courseDB = {
    getAllCourses: async (condition, projection = {}, options = { lean: true}) => {
        try {
            const courses = await Course.find(condition, projection, options);

            return courses;
        } catch (error) {
            throw error;
        }
    },

    getACourse: async (id, projection = {}, options = {}) => {
        try {
            // const course = await Course.findById(id, projection, options).populate(populateOptions).exec()
            const course = await Course.findById(id, projection, options)

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
    },

    populateData: async(query, projection, options, populateOptiions) => {
        // return model.populate(populateOptiions).exec()
        return await Course
			.find(query, projection, options)
			.populate(populateOptiions)
			.exec();
    },

    getEnroledCourses: async (condition, projection = {}, options = { lean: true}) => {
        return await Enrollment.find(condition, projection, options)
    },

    // getCourseStudent
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