const router = require("express").Router();
const { GridFsConfig } = require("../utils/gridfs");
const courseController = require('../controllers/course');
const courseValidations = require("../validatiors/course");
const userValidations = require("../validatiors/user");
const userController = require('../controllers/user');
const auth = require("../middlewares/auth");

router.post('/course', auth.isAuthenticated, auth.isAdmin, GridFsConfig.uploadMiddleware, courseValidations.validateCreateCourse, courseController.createCourse);
router.get('/enrolled_courses', auth.isAuthenticated, auth.isAdmin, courseController.getEnrolledCourses)
router.get('/users', auth.isAuthenticated, auth.isAdmin, userController.getAllUsers);
router.get('/students', auth.isAuthenticated, auth.isAdmin, userController.getAllStudents)
router.get('/instructors', auth.isAuthenticated, auth.isAdmin, userController.getAllInstructors);
router.get('/quizzes', auth.isAuthenticated, auth.isAdmin, courseController.getQuizzes)
router.post('/quiz/setup', auth.isAuthenticated, auth.isAdmin, courseValidations.validateQuizSetup, courseController.setupQuiz);
router.get('/course/:id/students', auth.isAuthenticated, auth.isAdmin, courseValidations.validateGetCourseStudents, courseController.getCourseStudents)
router.get('/course/:id/students/download', auth.isAuthenticated, auth.isAdmin, courseValidations.validateDownloadCourseStudent, courseController.downloadCourseStudents);
router.get('/students/download', auth.isAuthenticated, auth.isAdmin, courseValidations.validateDownloadStudentList, courseController.downloadStudents);
router.patch('/course/:id/status', auth.isAuthenticated, auth.isAdmin, courseValidations.validateChangeCourseStatus, courseController.changeCourseStatus)
router.patch('/course/:id/assign', auth.isAuthenticated, auth.isAdmin, courseValidations.validateAssignInstructor, courseController.assignInstructor);
// Instructors
router.get('/assigned-courses', auth.isAuthenticated, auth.isInstructor, courseController.getAssignedCourses)
router.get('/student/:id', auth.isAuthenticated, auth.isInstructor, userValidations.validateViewUser, userController.getAStudent);
router.get('/assigned-courses/:id/students', auth.isAuthenticated, auth.isInstructor, courseValidations.validateGetCourseStudent, courseController.getCourseStudent)





router.patch('/instructor/:instructorID/deassign/course/:id', auth.isAuthenticated, auth.isAdmin, courseValidations.validateDeassign, courseController.deassignInstructor)
router.post('/course/:id/quiz/setup', auth.isAuthenticated, auth.isAdmin, courseValidations.validateAddQuizToCourse, courseController.addQuizToCourse);
router.get('/courses/download', auth.isAuthenticated, auth.isAdmin, courseController.downloadAllCourse)

router.get('/user/:id', auth.isAuthenticated, userValidations.validateViewUser, userController.getAUser)
router.get('/instructor/:id', auth.isAuthenticated, userValidations.validateViewUser, userController.getAnInstructor)
router.delete('/user/:id', auth.isAuthenticated, auth.isAdmin, userValidations.validateDeleteUser, userController.deleteUser)

module.exports = router;
