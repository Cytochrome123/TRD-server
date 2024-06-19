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
    category: { type: String, default: 'I.C.T' },
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
    enrollment_count: { type: Number, default: 0 },
    isModuleZero: { type: Boolean, required: true, default: false },
    featured: Boolean,
    createdDate: { type: Number, default: Date.now },
});

courseSchema.index({ isModuleZero: 1 }, { unique: true, partialFilterExpression: { isModuleZero: true }, name: 'duplicate modeule 0' });

module.exports = mongoose.model('Course', courseSchema);