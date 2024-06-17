const router = require("express").Router();
const courseController = require('../controllers/course');
const auth = require("../middlewares/auth");
const { GridFsConfig } = require("../utils/gridfs");
const courseValidations = require("../validatiors/course");

router.get('/courses', courseController.getCourses)
router.get('/course/:id', courseValidations.validateGetACourse, courseController.getACourse);
router.get('/entry_quiz', auth.isAuthenticated, courseController.getEntryQuiz)
router.get('/entry_quiz/status', auth.isAuthenticated, courseController.checkEntryQuiz)
router.post('/course/:id/register', auth.isAuthenticated, courseValidations.validateEnrollForCourse, courseController.enrollToCourse)
router.get('/enrolled_courses', auth.isAuthenticated, courseController.getMyCourses)
router.post('/entry_quiz/:name/:sheet_id/completed/proceed', auth.isAuthenticated, courseValidations.validateCompletedEntryQuiz, courseController.completedEntryQuiz);
router.get('/module_zero', auth.isAuthenticated, courseController.getModuleZero)




// router.post('/course/:id/quiz/:name/:sheet_id/completed/proceed', auth.isAuthenticated, courseController.completeQuiz)
router.get('/course/:id/quiz', auth.isAuthenticated, courseValidations.validateGetAllQuizForACourse, courseController.getAllQuizForCourse);


module.exports = router;
