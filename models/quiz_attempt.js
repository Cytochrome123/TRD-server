const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
    user_id: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    quiz_id: { type: mongoose.Types.ObjectId, required: true, ref: 'Course' },
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true, default: false },
})

quizAttemptSchema.index({ quiz_id: 1, user_id: 1 }, { unique: true, name: 'unique_quiz_user' });

module.exports = mongoose.model('Quiz_Attempt', quizAttemptSchema);