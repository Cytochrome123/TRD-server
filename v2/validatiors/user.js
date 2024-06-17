const Validator = require(".");
const { userDBValidator } = require("../db/adapters/user");

const userValidations = {
    validateContact: Validator.validate({
        name: {
            in: ['body'],
            isString: true,
        },
        phone: {
            in: ['body'],
            isString: true,
            // isMobileNumber: true
        },
        email: {
            in: ['body'],
            isString: true,
            isEmail: true,
            errorMessage: 'Email is required'
        },
        message: {
            in: ['body'],
            isString: true,
        },
    }),

    // validateGetUsers: async (req, res, next) => {
    //     const my_details = req.user;

    //     try {
    //         if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Only admin can access this' })

    //         return next()
    //     } catch (error) {
    //         return res.status(500).json({ msg: 'Server error', err: err.message })
    //     }
    // },

    validateViewUser: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id, { req }) => {
                    const us = await userDBValidator.isUser({ _id: id });

                    if (!us) throw new Error('User does not exist');
                }
            }
        }
    }),

    validateDeleteUser: Validator.validate({
        id: {
            in: ['params'],
            isString: true,
            custom: {
                options: async (id, { req }) => {

                    const user = await userDBValidator.isUser({ _id: id });

                    if (!user) throw new Error('User does not exist');
                }
            }
        }
    }),
}

module.exports = userValidations;