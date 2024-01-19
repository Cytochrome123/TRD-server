const { check, body } = require('express-validator');
const Validator = require('.');
const { authDBValidator } = require('../db/adapters/auth');
const { gfs } = require('../utils/gridfs');
const { indexDB } = require('../db/adapters');
const { userDB } = require('../db/adapters/user');
const factory = require('../config/factory');
// const getGfs = require('../db')

// let gfs
// async function run() {
//     gfs = await getGfs();

// }
// run();

const validateRegistration = [
    body('firstName', 'firstName is required').not().isEmpty(),
    body('lastName', 'lastName is required').not().isEmpty(),
    body('email', 'Email is required').not().isEmpty().isString().isEmail()
        .custom(async (email, { req }) => {
            const condition = { email: email.toLowerCase() };
            const option = { lean: true };

            const exists = await authDBValidator.doesUserExist(condition, option)

            if (exists) throw new Error('Account already exists')
        }),
    body('password', 'Passowrd must be'),
    body('phoneNumber', 'Phone number is required').not().isEmpty(),
    check('image').custom((value, { req }) => {
        console.log(value)
        console.log(req.files.image, 'validation')
        // if(req.files.passport[0].mimetype === 'image/jpeg') return true
        if (req.files.image) return true
        return false;
    }).withMessage('Please upload ur profile pictire'),
];

const authValidations = {
    validateRegistrationV2: Validator.validate({
        firstName: {
            in: ['body'],
            isString: true,
            notEmpty: true,
            // message: 'djhsgvuyegkdsvg',
            errorMessage: 'First name is required'
        },
        lastName: {
            in: ["body"],
            isString: true,
            notEmpty: true,
            errorMessage: 'Last name is required'
        },
        email: {
            in: ['body'],
            isEmail: true,
            toLowerCase: true,
            errorMessage: 'Email name is required',
            custom: {
                options: async (email, { req, res }) => {
                    const condition = { email };
                    const options = { lean: true };
                    const files = req.files;
    
                    const exists = await authDBValidator.doesUserExist(condition, options)
                    console.log('EXISYSTSTS')
                    if (exists) {
                        await indexDB.deleteImage(res, gfs(), files.image[0].id);
                        throw new Error('Account already exists')
                    }
                }
            }
        },
        password: {
            in: ["body"],
            isString: true,
            isLength: { options: { min: 8 } },
            errorMessage: 'Password is required and must be a mininum of 8 characters'
        },
        phoneNumber: {
            in: ["body"],
            isInt: true,
        },
        image: {
            in: ['file'],
            notEmpty: true,
            custom: {
                options: async (value, { req, res }) => {
                    console.log(value)
                    console.log(req.files.image, 'validation')
                    // if(req.files.passport[0].mimetype === 'image/jpeg') return true
                    if (!req.files.image) throw new Error('Please upload ur profile pictire')
    
                    const files = req.files;
                    if (files.image[0].size > 5000000) {
                        const del = await indexDB.deleteImage(res, gfs(), files.image[0].id);
                        if (del) throw new Error(`${del} \n\n File shld not exceed 5mb`);
                        throw new Error('File shld not exceed 5mb');
                    };
    
                    req.body['image'] = { imageID: files.image[0].id, path: files.image[0].filename };
                    // req.body['image'] = { ...req.body.image, path: files.image[0].filename };
                }
            },
            errorMessage: 'Profile picture is required'
        }
    }),

    validateLogin: Validator.validate({
        email: {
            in: ["body"],
            isEmail: true,
            toLowerCase: true,
        },
        password: {
            in: ["body"],
            isString: true,
            isLength: { options: { min: 8 } },
            custom: {
                options: async (password, { req }) => {
                    const condtion = { email: req.body.email }
                    const user = await userDB.findUser(condtion);
    
                    if (!user || !factory.compareHashedPassword(password, user.password)) {
                        throw new Error("Invalid credentials!")
                    }

                    req.user = user;
    
                    // if (!user.verified) {
                    //   const de = decodeOTP(user.verification_code);
    
                    // //   (!de || isAfter(new Date(), new Date((de)?.exp * 1000))) && sendNewVerificationCode(req.body.email, this.userAdapter.DBUpdateUserVerificationCode);
    
                    //   throw new Error("Email account not verified, please check your email for a verification link")
                    // } 
                }
            }
        }
    }),

    validateVerifyLogin: Validator.validate({
        email: {
            in: ['query'],
            isEmail: true,
            toLowerCase: true,
        },
        otp: {
            in: ["body"],
            isInt: true,
            custom: {
                options: async (otp, {req}) => {
                    const {email} = req.query
                    const user = req.user;

                    if(!user) throw new Error('User not found')

                    console.log(factory.otpMap.size)
                    const storedOTP = factory.otpMap.get(email);

                    if (otp !== storedOTP) throw new Error('Invalid OTP');

                    factory.otpMap.delete(email);
                }
            }
        },
    })
}

module.exports = authValidations;