const mongoose = require('mongoose');

const courseTypeEnum = [ 'free', 'paid' ];
const statusEnum = [ 'upcoming', 'application', 'in-progress', 'completed' ];
const progressEnum = [ 'not-started', 'in-progress', 'completed', ]

const courseSchema = new mongoose.Schema({
    creatorID: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
    image: {
        imageID: { type: String, default: null },
		path: String,
    },
	title: { type: String, required: true },
    description: { type: String, required: true },
    // instructors: [{ instructorID: { type: mongoose.Types.ObjectId, ref: 'User' } }],
    instructors: [ {
        instructor: { type: mongoose.Types.ObjectId, ref: 'User' }
    } ],
    start_date: { type: Date },
    end_date: { type: Date },
    duration: String,
    location: String,
    capacity: Number,
	courseType: { type: String, required: true, enum: courseTypeEnum, default: 'paid' },
    amount: { type: Number, default: 0},
    status: { type: String, enum: statusEnum, default: 'upcoming'},
    deadline: { type: Date },
    // certificateReady: Boolean,
    // enrolled: [ { type: mongoose.Types.ObjectId, default: [] } ],
    enrolled: [{
        userID: { type: mongoose.Types.ObjectId, ref: 'User' }, 
        paid: { type: Boolean, required: true, default: false},
        progress: { type: String, enum: progressEnum, default: 'not-started' },
        grade: { type: String },
        score: { type: Number }
    }],
    enrollment_count: { type: Number, default: 0 },
    basicCourseID: { type: mongoose.Types.ObjectId, ref: 'Course' },
    // quizID: { type: mongoose.Types.ObjectId, ref: 'Quiz' },
    // quiz: [{
    //     quizID: { type: mongoose.Types.ObjectId, ref: 'Quiz' },
    //      basic: Boolean
    // }],
    // quiz: {
    //     ID: '',
    //     students: []
    // },
    createdDate: { type: Number, default: Date.now },
})

// courseSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Course', courseSchema);