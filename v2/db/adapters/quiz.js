const Quiz = require('../models/quiz');

const quizDB = {
    createQuiz: async (id, { name, link, sheetID, pass_mark }) => {
        try {
            const quiz = await new Quiz({ courseID: id, name, link, sheetID, pass_mark }).save()

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
            
        }
    }
}

const quizDBValidator = {
    quizExistForCourse: async (condition, options = {}) => {
        try {
            const quiz = await Quiz.findOne(condition, options);

            return !!quiz;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = { quizDB, quizDBValidator };