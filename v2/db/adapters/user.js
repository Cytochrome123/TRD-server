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

    contact: async (name, email, message) => {
        try {
            const message = await new Message({ name, email, message})

            return message
        } catch (error) {
            throw error
        }
    }
}

// const courseDBValidator = {
//     does
// }

module.exports = { userDB };