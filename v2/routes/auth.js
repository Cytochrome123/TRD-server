const router = require("express").Router();
const { GridFsConfig } = require("../utils/gridfs");
const authValidations = require('../validatiors/auth')
const authController = require('../controllers/auth');
const auth = require("../middlewares/auth");
const { multerUpload } = require("../utils/multer");

router.post('/signup', GridFsConfig.uploadMiddleware, authValidations.validateRegistrationV2, authController.register)
// router.post('/signup', multerUpload.single('image'), authValidations.validateRegistrationV2, authValidations.validateImage, authController.register)
router.post('/signin', authValidations.validateLogin, authController.login)
router.get('/verify', authValidations.validateVerifyEmail, authController.verifyEmail);

module.exports = router;
