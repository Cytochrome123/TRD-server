const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    courseID: { type: mongoose.Types.ObjectId, required: true, ref: 'Course' },
	name: { type: String, required: true, unique: true },
    link: { type: String, required: true },
    sheetID: { type: String, required: true },
    pass_mark: { type: Number, required: true },
})

quizSchema.index({ courseID: 1, name: 1 }, { unique: true, name: 'quiz_type_to_course' });

module.exports = mongoose.model('Quiz', quizSchema);