const mongoose = require('mongoose');

const userTypeEnum = [ 'admin', 'instructors', 'student', 'user' ];
const progressEnum = [ 'Not-started', 'In-progress', 'Completed', ];

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true, index: true },
	lastName: { type: String, required: true, index: true },
	email: { type: String, required: true },
	password: { type: String, required: [true, 'Password required'] , default: null },
	phoneNumber: { type: String, required: true },
	userType: { type: String, required: true, enum: userTypeEnum, default: 'user' },
	OTP: String,
	resetToken: String,
	resetTokenExpiration: String,
	courses: [{
        courseID: { type: mongoose.Types.ObjectId, ref: 'Course' },
		progress: { type: String, enum: progressEnum, default: 'Not-started' }
    }],
	createdDate: { type: Number, default: Date.now },
	lastLogin: { type: Number, default: null },
})

// userSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('User', userSchema);