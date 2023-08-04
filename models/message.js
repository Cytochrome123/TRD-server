const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
	name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
})

// courseSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Message', messageSchema);