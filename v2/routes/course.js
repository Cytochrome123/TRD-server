const router = require("express").Router();
const courseController = require('../controllers/course');
const auth = require("../middlewares/auth");
const { GridFsConfig } = require("../utils/gridfs");
const courseValidations = require("../validatiors/course");

router.get('/courses', courseController.getCourses)
router.get('/course/:id', auth.isAuthenticated, courseValidations.validateGetACourse, courseController.getACourse)

// ADMIN
router.post('/course', GridFsConfig.uploadMiddleware, courseValidations.validateCreateCourse, courseController.createCourse)
router.patch('/api/course/:id/assign', auth.isAuthenticated, courseValidations.validateAssignInstructor, courseController.assignInstructor)

module.exports = router;
