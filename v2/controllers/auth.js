const jwt = require('jsonwebtoken');

const factory = require("../config/factory");
const { authDB } = require("../db/adapters/auth");
const { userDB } = require("../db/adapters/user");
const { SG_sendMail } = require("../utils/mail");

const auth = {
    register: async (req, res) => {
        try {
            const userDetails = req.body;

            userDetails.password = factory.generateHashPassword(userDetails.password);
            const user = await authDB.registerUser(userDetails)

            return res.json({ status: 201, msg: 'Account created!', user });
        } catch (err) {
            return res.status(500).json({ msg: 'Server error', err: error.message });
        }
    },

    login: async (req, res) => {
        try {
            const OTP = factory.generateOTP()
            const otpMap = factory.addToOtpMap(req.body.email, OTP)
            // factory.otpMap().set(req.body.email, OTP)
            console.log(OTP);
            console.log(otpMap);
            
            const my_details = req.user;

            await SG_sendMail(my_details.email, OTP);

            const accessToken = jwt.sign({ id: my_details._id, firstName: my_details.firstName, email: my_details.email, userType: my_details.userType, courses: my_details.courses }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5m' })
            return res.status(200).json({ msg: 'Check your mail for an OTP code', accessToken });
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message });
        }
    },

    verifyLogin: async (req, res) => {
        try {
            const user = userDB.findUser({ email: req.body.email })

            const newAccessToken = jwt.sign({ id: user._id, firstName: user.firstName, email: user.email, userType: user.userType, courses: user.courses }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' });
            return res.json({ msg: 'Login successful', newAccessToken, user });
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message });
        }
    }
}


module.exports = auth;