const router = require("express").Router();
const { GridFsConfig } = require("../utils/gridfs");
const authValidations = require('../validatiors/auth')
const authController = require('../controllers/auth');
const auth = require("../middlewares/auth");

// router.post('/signup', GridFsConfig.uploadMiddleware, authValidator.validateRegistration, authController.register)
// router.post('/signup', GridFsConfig.uploadMiddleware, authValidator.validateRegistrationV2, authController.register)
router.post('/signup', GridFsConfig.uploadMiddleware, authValidations.validateRegistrationV2, authController.register)
// router.post('/signup', authValidations.validateRegistrationV2, GridFsConfig.uploadMiddleware, authController.register)
router.post('/signin', authValidations.validateLogin, authController.login)
router.post('/verify', auth.isAuthenticated, authValidations.validateVerifyLogin, authController.verifyLogin)

module.exports = router;
