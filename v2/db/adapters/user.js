const User = require('../models/user');
const Message = require('../models/message');

const userDB = {
    findUser: async (condition, projection = {}, options = {}) => {
        try {
            const user = await User.findOne(condition, projection, options);

            return user;
        } catch (error) {
            throw error;
        }
    },

    find: async (condition, projection = {}, options = {}) => {
        try {
            const user = await User.find(condition, projection, options);

            return user;
        } catch (error) {
            throw error;
        }
    },

    contact: async (name, email, message) => {
        try {
            const message = await new Message({ name, email, message }).save()

            return message
        } catch (error) {
            throw error
        }
    },

    deleteUser: async (condition) => {
        try {
            const user = await User.findOneAndDelete(condition, { new: true, lean: true })

            return user;
        } catch (error) {
            throw error
        }
    },

    updateUser: async (condition, update, options = {}) => {
        try {
            const updated = await User.findOneAndUpdate(condition, update, options);

            return updated;
        } catch (error) {
            throw error
        }
    },

    populateData: async(query, projection, options, populateOptiions) => {
        // return model.populate(populateOptiions).exec()
        return await User
			.find(query, projection, options)
			.populate(populateOptiions)
			.exec();
    },
}

const userDBValidator = {
    isUser: async (condition, options = {}) => {
        try {
            const user = await User.findOne(condition, options);

            return user;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = { userDB, userDBValidator };