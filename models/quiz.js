const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
    courseID: { type: mongoose.Types.ObjectId, required: true, ref: 'Course' },
	// name: { type: String, required: true },
    link: { type: String, required: true },
    sheetID: { type: String, required: true },
    pass_mark: { type: Number, required: true },
})


module.exports = mongoose.model('Quiz', quizSchema);