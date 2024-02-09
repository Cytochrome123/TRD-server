const router = require("express").Router();
const courseController = require('../controllers/course');
const auth = require("../middlewares/auth");
const { GridFsConfig } = require("../utils/gridfs");
const courseValidations = require("../validatiors/course");

router.get('/courses', courseController.getCourses)
router.get('/course/:id', auth.isAuthenticated, courseValidations.validateGetACourse, courseController.getACourse)
router.get('/course/:id/register', auth.isAuthenticated, courseValidations.validateEnrollForCourse, courseController.enrollForCourse)
router.get('/course/:id/quiz', auth.isAuthenticated, courseValidations.validateGetAllQuizForACourse, courseController.getAllQuizForCourse)
router.post('/course/:id/quiz/:name/:sheetID/completed/proceed', auth.isAuthenticated, courseValidations.validateCompleteQuiz, courseController.completeQuiz)

// ADMIN
router.post('/course', auth.isAuthenticated, auth.isAdmin, courseValidations.validateCreateCourse, GridFsConfig.uploadMiddleware, courseController.createCourse)
router.patch('/api/course/:id/assign', auth.isAuthenticated, courseValidations.validateAssignInstructor, courseController.assignInstructor);
router.put('/api/course/:id/status', auth.isAuthenticated, courseValidations.validateChangeCourseStatus, courseController.changeCourseStatus)
router.patch('/instructor/:instructorID/deassign/course/:id', auth.isAuthenticated, auth.isAdmin, courseValidations.validateDeassign, courseController.deassignInstructor)
router.post('/course/:id/quiz/setup', auth.isAuthenticated, auth.isAdmin, courseValidations.validateAddQuizToCourse, courseController.addQuizToCourse);
router.get('/courses/download', auth.isAuthenticated, auth.isAdmin, courseController.downloadAllCourse)
router.get('/course/:id/students/download', auth.isAuthenticated, auth.isAdmin, courseValidations.validateDownloadCourseStudent, courseController.downloadCourseStudents)

// INSTRUCTORS
router.get('/assigned-courses', auth.isAuthenticated, auth.isInstructor, courseController.getAssignedCourses)
router.get('/assigned-courses/:id/students', auth.isAuthenticated, auth.isInstructor, courseValidations.validateGetCourseStudent, courseController.getCourseStudent)

module.exports = router;
