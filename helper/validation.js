const { check, body } = require('express-validator');

const register = [
    body('firstName', 'firstName is required').not().isEmpty(),
    body('lastName', 'lastName is required').not().isEmpty(),
    body('email', 'Email is required').not().isEmpty(),
    body('password', 'Passowrd must be'),
    body('phoneNumber', 'Phone number is required').not().isEmpty(),
    check('image').custom( ( value, {req} ) => {
        console.log(value)
        console.log(req.files.image, 'validation')
        // if(req.files.passport[0].mimetype === 'image/jpeg') return true
        if(req.files.image) return true
        return false;
    }).withMessage('Please upload ur profile pictire'),
];


const course = [
    body('title', 'A title is required to sreate a course').not().isEmpty(),
    body('description', 'description is required').not().isEmpty(),
    body('start_date', 'Start date is required').not().isEmpty(),
    body('end_date', 'End date must not be empty'),
    body('duration', 'Duration is required').not().isEmpty(),
    body('location', 'Location is required').not().isEmpty(),
    body('capacity', 'Capacity is required').not().isEmpty(),
    body('amount', 'Amount is required').not().isEmpty(),
    body('isModuleZero', 'Amount is required').not().isEmpty(),
    check('image').custom( ( value, {req} ) => {
        console.log(value)
        console.log(req.files.image, 'validation')
        // if(req.files.passport[0].mimetype === 'image/jpeg') return true
        if(req.files.image) return true
        return false;
    }).withMessage('Please upload a cover pictire for the course'),
];

module.exports = { register, course };