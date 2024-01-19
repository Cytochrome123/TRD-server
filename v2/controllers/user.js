const { indexDB } = require("../db/adapters");
const { userDB } = require("../db/adapters/user");

const User = require('../db/models/user');

const user = {
    contact: async (req, res) => {
        try {
            const { name, email, message } = req.body;

            const msg = await userDB.contact(name, email, message)

            return res.status(201).json({ msg: 'Mail sent' })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const aggregatePipeline = [
                { $match: {} },
                { $group: { _id: '$userType', count: { $sum: 1 }, docs: { $push: '$$ROOT' } } },
                { $sort: { createdDate: -1 } }
            ];

            const options = { lean: true };

            const users = await indexDB.aggregateData(User, aggregatePipeline, options)

            return res.status(200).json({ msg: 'All users compiled sucessfully', users })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', error: error.message })
        }
    },

    getAUser: async (req, res) => {
        try {
            const { id } = req.params;

            const user = await userDB.findUser({ _id: id });

            return res.status(200).json({ data: { msg: `${user.firstName}'s details`, user } });
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', error: error.message })
        }
    },

    getAllInstructors: async (req, res) => {
        try {
            const condition = { userType: 'instructor' };
            const projection = { password: 0 };
            const option = { lean: true };

            const instructors = await userDB.findUser(condition, projection, option);

            return res.status(200).json({ msg: `Instructors compilled`, instructors });
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', error: error.message })
        }
    },

    getAnInstructor: async (req, res) => {
        try {
            const { id } = req.params;

            const instructor = await User.findById(id);

            if (instructor.userType !== 'instructor') return res.status(400).json({ data: { msg: `User not an instructor` } });
            return res.status(200).json({ msg: `${instructor.firstName}'s details`, instructor });
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', error: error.message })
        }
    }
}

module.exports = user;