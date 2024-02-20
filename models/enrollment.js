const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Types.ObjectId, required: true, unique: true, ref: 'User' },
    course_id: { type: mongoose.Types.ObjectId, required: true, unique: true, ref: 'Course' },
    passed: { type: Boolean, required: true, default: false },
    completed: { type: Boolean, required: true, default: false },
})

enrollmentSchema.index({ course_id: 1, user_id: 1 }, { unique: true, name: 'unique_course_user' });

module.exports = mongoose.model('Enrollment', enrollmentSchema);