const jwt = require('jsonwebtoken');

const factory = require("../config/factory");
const { authDB } = require("../db/adapters/auth");
const { userDB } = require("../db/adapters/user");
const { SG_sendMail } = require("../utils/mailer/mail");
const { generateContent } = require('../utils/mailer');
const { success, serverError, successAction } = require('../utils/api_response');

const auth = {
    register: async (req, res) => {
        console.log('INN');
        try {
            let { firstName, lastName, email, password, phoneNumber, image } = req.body;
            // const { buffer, mimetype } = req.file

            password = factory.generateHashPassword(password);
            const OTP = factory.generateOTP()
            // factory.addToOtpMap(email, OTP);
            const verification_code = factory.encodeOTP(OTP, email);
            const verification_link = `${process.env.TRD_CLIENT_URL}/auth/verify?code=${OTP}&email=${email}`;
            
            // const user = await authDB.registerUser({ firstName, lastName, email, password, phoneNumber }, buffer, mimetype);
            const user = await authDB.registerUser({ firstName, lastName, email, password, phoneNumber, image, verification_code });

            const replacements = {
                userName: `${lastName} ${firstName}`,
                companyName: process.env.COMPANY_NAME,
                verificationLink: verification_link,
                supportLink: process.env.SUPPORT_LINK
            };

            // Get email content with dynamic data
            const emailContent = generateContent('/mails/email_verification.html', replacements);
            SG_sendMail({ to: email, type: 'html', subject: 'Please verify your email', content: emailContent });

            console.log(`verification mail sent to ${email}`);
            console.log(verification_link)

            // return res.json({ status: 201, msg: 'Account created!, kindy check your email to verify your acount', user });
            return success(res, user, `Account created!, kindy check your email to verify your acount. Make sure to check the spam folder if you can't find in your inbox`);
        } catch (error) {
            // return res.status(500).json({ msg: 'Server error', err: error.message });
            return serverError(res, error.message);
        }
    },

    login: async (req, res) => {
        try {
            // const OTP = factory.generateOTP()
            // const otpMap = factory.addToOtpMap(req.body.email, OTP)
            // // factory.otpMap().set(req.body.email, OTP)
            // console.log(OTP);
            // console.log(otpMap);

            // const my_details = req.user;

            // await SG_sendMail(my_details.email, OTP);

            // const token = jwt.sign({ id: my_details._id, firstName: my_details.firstName, email: my_details.email, userType: my_details.userType }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
            
            // return res.status(200).json({ msg: 'Check your mail for an OTP code', accessToken });
            
            const { email } = req.body;
            const user = await userDB.findUser({ email });

            const token = jwt.sign({ id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, userType: user.userType, image: user.image.path }, process.env.ACCESS_TOKEN_SECRET);

            return success(res, { token, user }, "Logged in successfully");
        } catch (error) {
            // return res.status(500).json({ msg: 'Server error', err: error.message });
            return serverError(res, error.message);
        }
    },

    verifyEmail: async (req, res) => {
        const { email } = req.query;
        try {
            await userDB.updateUser({email}, { is_verified: true, verification_code: null }, { new: true })

            // const newAccessToken = jwt.sign({ id: user._id, firstName: user.firstName, email: user.email, userType: user.userType, courses: user.courses }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' });
            return successAction(res);
        } catch (error) {
            // return res.status(500).json({ msg: 'Server error', err: error.message });
            return serverError(res, error.message);
        }
    }
}


module.exports = auth;