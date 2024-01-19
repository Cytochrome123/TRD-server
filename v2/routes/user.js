const userValidations = require("../validatiors/user");
const userController = require('../controllers/user');
const auth = require("../middlewares/auth");

const router = require("express").Router();

router.post('/message', userValidations.validateContact, userController.contact)
router.get('/users', auth.isAuthenticated, userValidations.validateGetUsers, userController.getAllUsers)
router.get('/user/:id', auth.isAuthenticated, userValidations.validateViewUser, userController.getAUser)
router.get('/instructors', auth.isAuthenticated, userValidations.validateGetUsers, userController.getAllInstructors)
router.get('/instructor/:id', auth.isAuthenticated, userValidations.validateViewUser, userController.getAnInstructor)


module.exports = router;
