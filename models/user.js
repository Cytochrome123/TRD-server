const mongoose = require('mongoose');

const userTypeEnum = [ 'admin', 'instructor', 'student', 'user' ];
const progressEnum = [ 'not-started', 'in-progress', 'completed', ];

const userSchema = new mongoose.Schema({
	image: {
        imageID: { type: String, default: null },
		path: String,
    },
    firstName: { type: String, required: true, index: true },
	lastName: { type: String, required: true, index: true },
	email: { type: String, required: true },
	password: { type: String, required: [true, 'Password required'] , default: null },
	phoneNumber: { type: String, required: true },
	userType: { type: String, required: true, enum: userTypeEnum, default: 'user' },
	OTP: String,
	// resetToken: String,
	// resetTokenExpiration: String,
	courses: [{
        courseID: { type: mongoose.Types.ObjectId, ref: 'Course' },
		progress: { type: String, enum: progressEnum, default: 'not-started' }
    }],
	verification_code: String,
	is_verified: { type: Boolean, required: true, default: false },
	password_otp: String,
	createdDate: { type: Number, default: Date.now },
	lastLogin: { type: Number, default: null },
});

// userSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('User', userSchema);