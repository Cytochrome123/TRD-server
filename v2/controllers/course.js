const exceljs = require('exceljs');

const { indexDB } = require("../db/adapters");
const { courseDB } = require("../db/adapters/course");
const { quizDB } = require("../db/adapters/quiz");
const { userDB } = require("../db/adapters/user");
const authClient = require("../utils/googleapis/auth");
const { getQuizResponse } = require("../utils/googleapis/sheet");
// const { default: authClient } = require("../utils/googleapis/auth");

const course = {
    getCourses: async (req, res) => {
        try {

            const courses = await courseDB.getAllCourses({});

            return res.status(200).json({ msg: 'Courses loaded', courses })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    getACourse: async (req, res) => {
        try {
            const { course } = req.body;

            return res.status(200).json({ msg: 'Course details', course })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    createCourse: async (req, res) => {
        try {
            const courseDetails = req.body;
            courseDetails['creatorID'] = my_details.id;
            courseDetails['status'] = 'Upcoming';
            console.log(courseDetails, 'CD')

            const course = await courseDB.createCourse(courseDetails)

            return res.status(201).json({ msg: 'Course created', course })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    assignInstructor: async (req, res) => {
        try {
            const condition = { _id: req.params.id }

            const assign = {
                $push: {
                    instructors: {
                        $each: instructors.map((instructor) => ({ instructor: instructor.instructor })),
                    },
                },
            };

            const assigned = await courseDB.updateCourse(condition, assign)

            if (!assigned) throw new Error('Failed to assign course');

            return res.status(200).json({ msg: 'Intructor(s) assigned successfully', assigned })
        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    deassignInstructor: async (req, res) => {
        try {
            const { instructorID, id } = req.params;
            const condition = { instructors: { $elemMatch: { instructorsID: { $in: [instructorID] } } } };

            const projection = { title: 1, description: 1, instructors: 1 };
            const options = { lean: true };

        } catch (error) {

        }
    },

    changeCourseStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, deadline } = req.body;
            let update;
            deadline ? update = { status, deadline } : { status };

            const updated = await courseDB.updateCourse({ _id: id }, update, { new: true });

            if (!updated) return next('Failed to update course status, kindly try again later');

            const populateOptions = {
                path: 'enrolled.userID',
                select: 'firstName lastName email phoneNumber',
                model: 'User'
            }

            const populatedCourse = await indexDB.populateData(updated, populateOptions);

            console.log(populatedCourse.enrolled)

            for (let student of populatedCourse.enrolled) {
                if (populatedCourse.status == 'application') {
                    const msg = {
                        subject: `The wait has finally ended`,
                        text: `${populatedCourse.title} is now open to application, kindly get yourselves enrolled before it closes. The deadline for application is ${populatedCourse.deadline}. Thanks`
                    }
                    const sent = await sgMail.send(constructMessage(student.userID.email, msg))
                    if (!sent) return next(`Failed to send mail to ${student.userID.email}`)
                    console.log(`Mail sent to ${student.userID.email}`)
                } else if (populatedCourse.status == 'in-progress') {
                    const msg = {
                        subject: `The wait has finally ended`,
                        text: `The course titled ${populated.title} has already begun, log onto the portal and get started`,
                    }
                    const sent = await sgMail.send(constructMessage(student.userID.email, msg))
                    if (!sent) return next(`Failed to send mail to ${student.userID.email}`)
                    console.log(`Mail sent to ${student.userID.email}`)
                } else if (populatedCourse.status == 'completed') {
                    const msg = {
                        subject: `Congratulations!!!`,
                        text: `The course titled ${populated.title} has now ended, finish up all you need to do in order to be eligible to request for your certificate`,
                    }
                    const sent = await sgMail.send(constructMessage(student.userID.email, msg))
                    if (!sent) return next(`Failed to send mail to ${student.userID.email}`)
                    console.log(`Mail sent to ${student.userID.email}`)
                }
            };

            function constructMessage(recipient, msg) {
                return {
                    to: recipient,
                    from: 'hoismail2017@gmail.com',
                    subject: msg.subject,
                    text: msg.text
                };
            };

            return res.status(200).json

        } catch (error) {
            return res.status(500).json({ msg: 'Server error', err: error.message })
        }
    },

    getAssignedCourses: async (req, res) => {
        try {
            const condition = { instructors: { $elemMatch: { instructor: my_details.id } } };

            const courses = await courseDB.getAllCourses(condition)

            return res.status(200).json({ msg: 'Assigned courses!!', assignedcourses: courses })
        } catch (error) {
            res.status(500).json({ data: { msg: 'Server error', error: err.message } });
        }
    },

    getCourseStudent: async (req, res) => {
        try {
            const { id } = req.params;
            const condition = { _id: id };
            let projection = { title: 1, status: 1, enrolled: 1, enrollment_count: 1 };
            const option = { lean: true };

            const populateOptions = {
                path: 'enrolled.userID',
                select: 'firstName lastName email phoneNumber courses',

                // populate: {
                //     path: 'instructors.instructor',
                //     select: 'firstName lastName email phoneNumber',
                //     model: 'User' 
                // },

                model: 'User'
            };

            const course = await courseDB.getACourse(id, projection, option);

            let students = []
            if (course.length) students = await indexDB.populateData(course, populateOptions);

            return res.status(200).json({ msg: 'Students list!!', courseDetails: students })
        } catch (error) {
            res.status(500).json({ data: { msg: 'Server error', error: err.message } });
        }
    },

    enrollForCourse: async (req, res) => {
        try {
            const my_details = req.user;
            const { id } = req.params;
            const { course } = req.body;

            console.log(course, 'COURSE')

            const register = {
                $push: {
                    enrolled: {
                        userID: my_details.id,
                        paid: course.courseType === 'free' ? true : false
                    }
                }
            }
            const addToMyCourseList = {
                $push: {
                    courses: {
                        courseID: course._id,
                    }
                },
                userType: my_details.userType !== 'admin' && 'student'
                // userType: my_details.userType !== 'student' ? "student" : '' -------------------------------------------------------------------------
            }
            const options = { lean: true, new: true };

            const registered = await courseDB.updateCourse({ _id: id }, register, options);

            if (!registered) return res.status(400).json({ data: { msg: 'Enrollment failed' } });

            const updateEnrollmentList = await userDB.updateUser({ _id: my_details.id }, addToMyCourseList, options);
            if (updateEnrollmentList) console.log('updated')

            return res.status(201).json({ data: { msg: 'Registration sucessfull', courseList: updateEnrollmentList } })
        } catch (error) {
            res.status(500).json({ data: { msg: 'Server error', error: err.message } });
        }
    },

    addQuizToCourse: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, link, sheetID, pass_mark } = req.body;

            const quiz = await quizDB.createQuiz(id, { name, link, sheetID, pass_mark })

            return res.status(200).json({ msg: 'Quiz created', quiz });
        } catch (error) {
            res.status(500).json({ data: { msg: 'Server error', error: err.message } });
        }
    },

    getAllQuizForCourse: async (req, res) => {
        try {
            const { id } = req.params;

            const all = await quizDB.getCourseQuiz(id);

            return res.status(200).json({ msg: 'All quiz', quiz: all });
        } catch (error) {
            res.status(500).json({ data: { msg: 'Server error', error: error.message } });
        }
    },

    completeQuiz: async (req, res) => {
        try {
            const { email } = req.user;
            const { id, name, sheetID } = req.params;

            const token = await authClient.authorize();
            // Set the client credentials
            authClient.setCredentials(token);

            const data = await getQuizResponse();

            if (!data.length) throw new Error('Answers not recorded')

            const fin = []

            console.log('datasss')

            const emailIndex = data[0].findIndex(d => d == 'Email')
            console.log(emailIndex)
            const scoreIndex = data[0].findIndex(d => d == 'Score')
            console.log(scoreIndex)

            // data.shift();

            for (let d of data) {
                fin.push({ email: d[emailIndex], score: d[scoreIndex] })
            }

            console.log(fin)

            const result = fin.find(data => data.email === email);

            const score = result.score.split(' / ')[0]

            console.log(score, 'score');

            if (score >= quiz.pass_mark) return res.status(200).json({ msg: `Passed`, result: true });
            return res.status(200).json({ msg: `Failed`, result: false });

            // Saved the answers
            // fs.writeFileSync("answers.json", JSON.stringify(answers), function (err, file) {
            //     if (err) throw err;
            //     console.log("Saved!");
            // });
        } catch (error) {
            res.status(500).json({ data: { msg: 'Server error', error: err.message } });
        }
    },

    downloadAllCourse: async (req, res) => {
        try {
            let workbook = new exceljs.Workbook();

            const sheet = workbook.addWorksheet('Courses');

            sheet.columns = [
                { header: 'Title', key: 'title', width: 25 },
                { header: 'Description', key: 'description', width: 50 },
                { header: 'No of Instructors', key: 'instructors', width: 15 },
                { header: 'No of students', key: 'students', width: 15 },
                { header: 'Start Date', key: 'start', width: 25 },
                { header: 'End Date', key: 'end', width: 25 },
                { header: 'Duration', key: 'duration', width: 25 },
                { header: 'Capacity', key: 'capacity', width: 25 },
                { header: 'Status', key: 'status', width: 25 },
                { header: '∂eadline', key: 'deadline', width: 25 },
                { header: 'Course Type', key: 'type', width: 25 },
            ];

            const courses = await Course.find({});

            if (!courses) throw new Error('No course yet');

            courses.map((d) => {
                sheet.addRow({
                    title: d.title,
                    description: d.description,
                    instructors: d.instructors.length,
                    students: d.enrolled.length,
                    start: d.start_date,
                    end: d.end_date,
                    duration: d.duration,
                    capacity: d.capacity,
                    status: d.status,
                    deadline: d.deadline,
                    type: d.courseType,
                })
            });

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                "attachment;filename=" + `All courses.xlsx`
            );

            workbook.xlsx.write(res);
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).json({ msg: 'Server error', err: error.message });
        }
    },

    downloadCourseStudents: async (req, res) => {
        try {
            const { id } = req.params;

            let workbook = new exceljs.Workbook();

            const sheet = workbook.addWorksheet('Students');

            sheet.columns = [
                { header: 'First Name', key: 'fName', width: 25 },
                { header: 'Last Name', key: 'lName', width: 25 },
                { header: 'Email', key: 'email', width: 50 },
                { header: 'Phone Number', key: 'phone', width: 25 }
            ];

            const course = await courseDB.getACourse(id);

            if (!course) throw new Error('Course not found');

            const populateOptions = {
                path: 'enrolled.userID',
                select: 'firstName lastName email phoneNumber',
                model: 'User'
            }

            const populatedCourse = await indexDB.populateData(course, populateOptions);

            const data = populatedCourse.enrolled;

            await data.map((d) => {
                sheet.addRow({
                    fName: d.userID.firstName,
                    lName: d.userID.lastName,
                    email: d.userID.email,
                    phone: d.userID.phoneNumber,
                })
            });

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                "attachment;filename=" + `${populatedCourse.title} students.xlsx`
            );

            workbook.xlsx.write(res);
        } catch (error) {
            console.log(error)
            res.status(error.status || 500).json({ msg: 'Server error', err: error.message });
        }
    }
}

module.exports = course;