const User = require('../models/user');

const authDB = {
    registerUser: async (userDetails) => {
        try {
            const user = await new User(userDetails).save()

            return user;
        } catch (error) {
            throw error;
        }
    },

}


const authDBValidator = {
    doesUserExist: async (condition, options = {}) => {
        try {
            const user = await User.findOne(condition, options);

            return user;
        } catch (error) {
            throw error;
        }
    }
}


module.exports = { authDB, authDBValidator };