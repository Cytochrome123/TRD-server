const Validator = require(".");

const userValidations = {
    validateContact: Validator.validate({
        name: {
            in: ['body'],
            isString: true,
            notEmpty: true
        },
        email: {
            in: ['body'],
            isString: true,
            isEmail: true
        },
        message: {
            in: ['body'],
            isString: true,
            notEmpty: true
        },
    }),

    validateGetUsers: async (req, res, next) => {
        const my_details = req.user;

        try {
            if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Only admin can access this' })

            return next()
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: err.message })
        }
    },

    validateViewUser: Validator.validate({
        id: {
            in: ['params'],
            custom: {
                options: async (id, { req }) => {
                    const user = req.user;

                    if (user.userType !== 'admin') throw new Error('UnAuthorized! Only Admin can access this')
                }
            }
        }
    }),
}

module.exports = userValidations;