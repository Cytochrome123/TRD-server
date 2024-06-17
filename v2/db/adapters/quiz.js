const Quiz = require('../models/quiz');
const Quiz_Attempt = require('../models/quiz_attempt');

const quizDB = {
    createQuiz: async (id, { name, link, sheet_id, pass_mark, type }) => {
        try {
            const quiz = await new Quiz({ course_id: id, name, link, sheet_id, pass_mark, type }).save()

            return quiz;
        } catch (error) {
            throw error;
        }
    },

    getCourseQuiz: async (id) => {
        try {
            const allQuiz = await Quiz.find({ courseID: id });

            return allQuiz;
        } catch (error) {
            throw error
        }
    },

    getAllQuiz: async () => {
        try {
            const allQuiz = await Quiz.find({});

            return allQuiz;
        } catch (error) {
            throw error
        }
    },

    getAQuiz: async (query) => {
        try {
            const quiz = await Quiz.findOne(query);

            return quiz;
        } catch (error) {
            throw error
        }
    },

    getAttemptedQuiz: async (query) => {
        try {
            const attempt = Quiz_Attempt.findOne(query);

            return attempt;
        } catch (error) {
            throw error
        }
    },

    addAttemptedQuiz: async (data) => {
        try {
            return await Quiz_Attempt.create(data);
        } catch (error) {
            throw error
        }
    }
}

const quizDBValidator = {
    quizExistForCourse: async (condition, options = {}) => {
        try {
            const quiz = await Quiz.findOne(condition, options);

            return quiz;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = { quizDB, quizDBValidator };