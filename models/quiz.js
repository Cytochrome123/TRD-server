const mongoose = require('mongoose');

const type = [ 'entry', 'end' ];

const quizSchema = new mongoose.Schema({
    course_id: { type: mongoose.Types.ObjectId, required: true, unique: true, ref: 'Course' },
	name: { type: String, required: true, unique: true },
    link: { type: String, required: true },
    sheet_id: { type: String, required: true },
    pass_mark: { type: Number, required: true },
    basic: { type: Boolean, required: true, default: false },
    type: { type: String, enum: type, default: 'end'},
})

quizSchema.index({ course_id: 1, name: 1, type: 1 }, { unique: true, name: 'unique_quiz_type' });
quizSchema.index({ type: 1 }, { unique: true, partialFilterExpression: { type: 'entry' }, name: 'duplicate entry quiz' });

module.exports = mongoose.model('Quiz', quizSchema);