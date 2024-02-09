const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    courseID: { type: mongoose.Types.ObjectId, required: true, unique: true, ref: 'Course' },
	name: { type: String, required: true, unique: true },
    link: { type: String, required: true },
    sheetID: { type: String, required: true },
    pass_mark: { type: Number, required: true },
    // userID: { type: mongoose.Types.ObjectId, required: false, ref: 'User' },
    // passed: Boolean
})


module.exports = mongoose.model('Quiz', quizSchema);