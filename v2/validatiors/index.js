const { checkSchema, validationResult } = require('express-validator');


const Validator = {
    validate: (schema) => async (req, res, next) => {
        await Promise.all(checkSchema(schema).map(validation => validation.run(req)));
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        const errs = errors.array();

        return res.status(500).json({ msg: errs[0].msg, errors: errs })
        // return badRequest(res, errs, errs[0].msg)
    }
}

module.exports = Validator;