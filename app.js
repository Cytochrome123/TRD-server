require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SG_API_KEY);
const mongoose = require('mongoose');
const axios = require('axios');
const { validationResult } = require('express-validator');

const User = require('./models/user');
const Course = require('./models/course');
const Message = require('./models/message');
const { generateHashPassword, compareHashedPassword } = require('./config/factory');
const GridFsConfig = require("./config/gridfs");
const getGfs = require('./db/connection');
const validation = require('./helper/validation');

const app = express();


// mongoose.connect(process.env.MONGO_URL)
//     .then(() => (console.log('Mongoose Connection is Successful')))
//     .catch(err => (console.log('Mongo error ', err)));
let gfs;
const getDB = async () => {
    gfs = await getGfs();
};
getDB();

app.use(express.json());
// app.use(cors());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true, // allow session cookie from browser to pass through
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin']
}));
app.use(session({
    secret: 'TRD',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true }
}));

const otpMap = new Map();


app.get('/', (req, res) => {
    res.status(500).send('Hello')
});

// Seed

app.post('/seed/user', async (req, res) => {
    const userData = require('./user.json')
    for (const user of userData) {
        const newUser = await new User(user).save()
        if (newUser) console.log('Added')
    }

});

app.post('/seed/course', async (req, res) => {
    const courseData = require('./course.json')
    for (const course of courseData) {
        const newCourse = await new Course(course).save()
        if (newCourse) console.log(' Course Added')
    }

});
// AUTH

app.post('/api/signup', GridFsConfig.uploadMiddleware, validation.register, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: 'error', msg: errors.array() });
        };
        console.log('cb');
        const files = req.files;
        if (files.image[0].size > 5000000) {
            const del = await deleteImage(res, gfs, files.image[0].id);
            if (del) throw new Error(`${del} \n\n File shld not exceed 5mb`);
            throw new Error('File shld not exceed 5mb');
        };

        req.body['image'] = { imageID: files.image[0].id };
        req.body['image'] = { ...req.body.image, path: files.image[0].filename };
        const userDetails = req.body;
        let condition = { email: userDetails.email };
        let option = { lean: true };

        let exists = await User.findOne(condition, option);
        if (!exists) {
            userDetails.password = generateHashPassword(userDetails.password);
            new User(userDetails).save()
                .then(user => {
                    return res.json({ status: 201, msg: 'Account created!', user });
                })
                .catch(err => {
                    return res.json({
                        status: 400,
                        msg: err
                    });
                })
            return;
        }
        await deleteImage(res, gfs, files.image[0].id);
        return res.json({
            status: 409,
            msg: 'Account already exists'
        });
    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message });
    }
});

app.post('/api/signin', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (user) {
            let correlates = compareHashedPassword(password, user.password);
            if (correlates) {

                const OTP = Math.floor(100000 + Math.random() * 900000);
                otpMap.set(user.email, OTP);
                console.log(OTP);
                console.log(otpMap)
                const msg = {
                    to: user.email,
                    from: 'hoismail2017@gmail.com',
                    subject: 'Your OTP for login',
                    text: `Your OTP is: ${OTP}`,
                };
                sgMail.send(msg)
                    .then(() => {
                        console.log(`OTP sent to ${user.email}`);
                        return next(null, user);
                    })
                    .catch(err => {
                        console.error(`Error sending OTP to ${user.email}`, err);
                        return next(err);
                    });

                const accessToken = jwt.sign({ id: user._id, firstName: user.firstName, email: user.email, userType: user.userType, courses: user.courses }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5m' })
                return res.status(200).json({ msg: 'Check your mail or phone for an OTP sent', accessToken });
            }
            return res.status(401).json({ msg: 'Incorrect password' })
        }
        return res.status(401).json({ msg: 'Your account does\'nt exist' })
    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message })
    }

});

app.post('/api/verify', authenticate, (req, res) => {
    try {
        const { otp } = req.body;
        const { email } = req.query;

        if (!email) return res.status(401).json({ msg: 'email is not valid' })
        console.log(otpMap);
        console.log(otpMap.size)
        const storedOTP = otpMap.get(email);

        // Check if the OTP is valid
        if (!storedOTP) return res.status(400).json({ msg: 'Failed! OTP not found for this user or has been used once' });
        if (+otp !== storedOTP) return res.status(400).json({ msg: 'Invalid OTP' });
        otpMap.delete(email);

        User.findOne({ email })
            .then(user => {
                // req.login(user, err => {
                //     if (err) {
                //         return res.status(500).json({ msg: err.message });
                //     }
                //     const newAccessToken = jwt.sign({email: user.email}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' })
                //     return res.json({ msg: 'Login successful', newAccessToken });
                // });
                const newAccessToken = jwt.sign({ id: user._id, firstName: user.firstName, email: user.email, userType: user.userType, courses: user.courses }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' });
                return res.json({ msg: 'Login successful', newAccessToken, user });
            })
            .catch(err => {
                res.status(404).json({ msg: 'User error', error: err.message });
            })
    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message })
    }
});

// when not logged in

app.get('/api/courses', async (req, res) => {
    try {
        let condition = {};
        let projection = {};
        let option = { lean: true };

        const courses = await Course.find(condition, projection, option);
        if (courses) {
            return res.status(200).json({ msg: 'Courses loaded', courses })
        }
        return res.status(404).json({ msg: 'Nothing yet', courses: [] })
    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message })
    }
});

app.get('/course/:id', (req, res) => {
    try {
        // const my_details = req.user;
        const { id } = req.params;
        // const isAdmin = my_details.userType === 'admin';
        let projection = {};
        const option = { lean: true };
        const populateOptions = {
            path: 'instructors.instructor enrolled.userID',
            select: 'firstName lastName email phoneNumber',
            model: 'User'
        }
        Course.findById(id, projection, option).populate(populateOptions).exec()
            .then(course => (res.status(200).json({ msg: 'Course details', course })))
            .catch(err => (res.status(404).json({ msg: 'Not found' })))
        return;
    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message })
    }
});
app.post('/api/message', (req, res) => {
    try {
        // const {}
        console.log(req.body)
        new Message(req.body).save()
            .then(mail => (res.status(201).json({ msg: 'Mail sent' })))
            .catch(err => (res.status(400).json({ msg: 'Error sending mail', err })))

    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message })
    }
});

// ADMIN                         ---------     CHECK THIS AGAIN - should be for both admin, so the poplayed field should be instructors
app.get('/api/course/:id', authenticate, (req, res) => {
    try {
        const my_details = req.user;
        const { id } = req.params;
        const isAdmin = my_details.userType === 'admin';
        let projection;
        let option = { lean: true };
        let populateOptions;


        isAdmin ? projection = {} : projection = { instructorsID: 0, capacity: 0, enrolled: 0, enrollment_count: 0 };
        isAdmin ?
            populateOptions = {
                path: 'enrolled.userID instructors.instructor',
                model: 'User'
            } :
            populateOptions = {
                path: 'enrolled.userID instructors.instructor',
                select: 'firstName lastName email phoneNumber',
                model: 'User'
            }
        Course.findById(id, projection, option).populate(populateOptions)
            .then(course => (res.status(200).json({ msg: 'Course details', course })))
            .catch(err => (res.status(404).json({ msg: 'Not found' })))
        return;
    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message })
    }
});


// ALL
app.patch('/api/user/:id/update', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        // if(!my_details === 'admin') res.status(400).json({ msg: 'Request admin access' });

        const condition = {}
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message, status: err.status } });
    }
});

//ADMIN ROUTES

app.post('/api/course', GridFsConfig.uploadMiddleware, validation.course, authenticate, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: 'error', msg: errors.array() });
        };

        const my_details = req.user;
        console.log(my_details)
        if (my_details.userType === 'admin') {
            const files = req.files;
            if (files.image[0].size > 5000000) {
                const del = await deleteImage(res, gfs, files.image[0].id);
                if (del) throw new Error(`${del} \n\n File shld not exceed 5mb`);
                throw new Error('File shld not exceed 5mb');
            };

            req.body['image'] = { imageID: files.image[0].id };
            req.body['image'] = { ...req.body.image, path: files.image[0].filename };
            const courseDetails = req.body;
            const exists = await Course.findOne({ title: courseDetails.title })
            if (exists) return res.status(400).json({ msg: 'Course with the same title exists' })
            console.log('in')
            courseDetails['creatorID'] = my_details.id;
            courseDetails['status'] = 'Upcoming';
            console.log(courseDetails)
            // courseDetails['instructor_id'] = my_details.id;
            // const course = await new Course(courseDetails).save();
            // course ? res.status(201).json({data: { msg: 'Course created', course }}) : res.status(401).json({data: { msg: err }})
            new Course(courseDetails).save()
                .then(course => (res.status(201).json({ msg: 'Course created', course })))
                .catch(err => (res.status(401).json({ msg: err })))
            return;
        }
        return res.status(403).json({ data: { msg: 'UnAuthorized! Only Admin can access this' } })
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
});

app.get('/api/created-courses', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType === 'admin') {

            let condition = { creatorID: new mongoose.Types.ObjectId(my_details.id) }
            let projection = {};
            let option = { lean: true };

            const courses = await Course.find(condition, projection, option);
            if (courses) {
                return res.status(200).json({ data: { msg: 'Created courses', courses } })
            }
            return res.status(404).json({ data: { msg: 'Nothing yet' } })
        }
        return res.status(403).json({ data: { msg: 'UnAuthorized! Only Admin can access this' } })
    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message })
    }
});

app.patch('/api/course/:id/assign', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Request admin access', err });
        const { id } = req.params;
        const { instructors } = req.body;
        let condition = { _id: id, creatorID: new mongoose.Types.ObjectId(my_details.id) }
        let projection = {};
        let options = { lean: true, new: true };

        const course = await Course.findOne(condition, projection, options);
        if (!course) return res.status(404).json({ msg: 'Course not found', err: err.message });
        const errors = [];
        let user;
        for (let i = 0; i < instructors.length; i++) {
            user = await User.findById(instructors[i].instructor);
            if (!user) return res.status(405).json({ msg: `${instructors[i].instructor}'s account not found, a valid instructor's account is needed` });
            break;
        };

        const name = `${user.firstName} ${user.lastName}`;
        if (course.instructors.some((instruct) => instruct.instructor.equals(instructors[0].instructor))) {
            return res.status(400).json({ msg: `This ${instructors[0].instructor} - ${name} has already been assigned to this course, effect beforre you can continie` });
        };
        const assign = {
            $push: {
                instructors: {
                    $each: instructors.map((instructor) => ({ instructor: instructor.instructor })),
                },
            },
        };
        const assigned = await Course.findOneAndUpdate(condition, assign, options)
        if (!assigned) throw new Error('Assign failed');
        res.status(200).json({ data: { msg: 'Intructor(s) assigned successfully', assigned } })
    } catch (error) {
        res.status(500).json({ msg: 'Server error', err: error.message });
    }
});

app.put('/api/course/:id/status', authenticate, (req, res, next) => {
    try {
        const my_details = req.user;
        const { id } = req.params;
        const { status } = req.body;

        if (!my_details === 'admin') return res.status(403).json({ msg: 'Admin access only!', err });
        Course.findById(id)
            .then(async course => {
                course.status = status;
                const updated = await course.save()
                const populateOptions = {
                    path: 'enrolled.userID',
                    select: 'firstName lastName email phoneNumber',
                    model: 'User'
                }
                return updated.populate(populateOptions);
            })
            .then(populated => {
                console.log(populated.enrolled[0].userID);
                populated.enrolled.map(student => {
                    console.log(student)
                    console.log(student.userID.email)
                    let msg = {
                        to: student.userID.email,
                        from: 'hoismail2017@gmail.com',
                        subject: `The wait has finally ended`,
                        text: `The course titled ${populated.title} has already begun, log onto the portal to get started`,
                    };
                    if (status === 'In progress') {
                        sgMail.send(msg)
                            .then(() => {
                                console.log(`Mail sent to ${student.userID.email}`);
                                return next(null, populated)
                            })
                            .catch(err => {
                                console.error(`Error sending to ${student.userID.email}`, { err: err.message });
                                return next(err);
                            });
                        return;
                    } else if (status === 'Completed') {
                        msg = {
                            to: student.userID.email,
                            from: 'hoismail2017@gmail.com',
                            subject: `Congratulations!!!`,
                            text: `The course titled ${populated.title} has now ended, finish up all you need to do in order to be eligible to request for your certificate`,
                        };
                        sgMail.send(msg)
                            .then(() => {
                                console.log(`Mail sent to ${student.userID.email}`);
                                return next(null, populated)
                            })
                            .catch(err => {
                                console.error(`Error sending to ${student.userID.email}`, err);
                                // return next(err);
                                return res.status(400).json({ msg: 'Error sending mail', err: err.message });
                            });
                        return;
                    }
                })
                return res.status(200).json({ msg: 'Course status updated succesfully' })
            })
            .catch(err => { console.log(err) })

        // course.status = status
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

app.get('/api/users', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Request admin access' })

        let aggregatePipeline = [
            // { $match: { userType: { $ne: 'admin'} }},
            { $match: {} },
            { $group: { _id: '$userType', count: { $sum: 1 }, docs: { $push: '$$ROOT' } } },
            { $sort: { createdDate: -1 } },
            // { $project: {
            //     firstName: 1,
            //     lastName: 1,
            //     email: 1,
            //     status: 1,
            //     createdDate:1
            // }}
        ];

        let options = { lean: true };

        const users = await User.aggregate(aggregatePipeline, options);
        if (users) return res.status(200).json({ msg: 'All users compiled sucessfully', users })
        return res.status(400).json({ msg: 'Error comipling users', users })

    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
});

app.get('/api/user/:id', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(400).json({ msg: 'Request admin access' });

        const { id } = req.params;
        const condition = { _id: id };
        const projection = {};
        const option = { lean: true, new: true };

        const user = await User.findById(id);
        if (user) return res.status(200).json({ data: { msg: `${user.firstName}'s details`, user } });
        return res.status(400).json({ data: { msg: `Error` } });
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
});

app.get('/api/instructors', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(400).json({ msg: 'Request admin access' });

        const condition = { userType: 'instructor' };
        const projection = { password: 0 };
        const option = { lean: true };

        const instructors = await User.find(condition, projection, option);
        if (instructors) return res.status(200).json({ msg: `Instructors compilled`, instructors });
        return res.status(400).json({ msg: `Error` });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

app.get('/api/instructor/:id', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(400).json({ msg: 'Request admin access' });

        const { id } = req.params;

        const instructor = await User.findById(id);
        if (!instructor) return res.status(400).json({ data: { msg: `Error` } });
        if (instructor.userType !== 'instructor') return res.status(400).json({ data: { msg: `User not an instructor` } });
        return res.status(200).json({ data: { msg: `${instructor.firstName}'s details`, instructor } });
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
});

app.get('/api/students', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(400).json({ msg: 'Request admin access' });

        const condition = { userType: 'student' };
        const projection = { password: 0 };
        const option = { lean: true };

        const students = await User.find(condition, projection, option);
        if (students) return res.status(200).json({ msg: `Students compilled`, students });
        return res.status(400).json({ msg: `Error` });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

app.get('/api/student/:id', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin' || my_details.userType !== 'instructor') return res.status(400).json({ msg: 'Request admin access' });

        const { id } = req.params;
        const condition = { _id: id };
        const projection = {};
        const option = { lean: true, new: true };
        const populateOptions = {
            path: 'courses.courseID',
            select: 'title description start_end end_date instructors duration location courseType createdDate',

            populate: {
                path: 'instructors.instructor',
                select: 'firstName lastName email phoneNumber',
                model: 'User'
            },

            model: 'Course'
        };

        const student = await User.findById(id).populate(populateOptions).exec()
        if (student) return res.status(200).json({ msg: `${student.firstName}'s details`, student });
        return res.status(400).json({ msg: `Error` });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

app.patch('/api/instructor/:instructorID/deassign/course/:id', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (!my_details === 'admin') return res.status(400).json({ msg: 'Request admin access' });

        const { instructorID, id } = req.params;
        // const js = instructors.includes({})
        // const condition = { instructors: {instructorsID: new mongoose.Types.ObjectId(instructorsID)} };
        // const condition = { instructors: { $in: [ {_id: '649d2747e16c05d7bee1ce9c', instructorsID: instructorID }] } }
        const condition = { instructors: { $elemMatch: { instructorsID: { $in: [instructorID] } } } };
        // const condition = { 'instructors.instructorsID': instructorsID }
        // const condition = { instructors: { $where: }}
        // const condition = { instructors: { $in: [ instructorID ] } }
        const projection = { title: 1, description: 1, instructors: 1 };
        const options = { lean: true };

        const course = await Course.findOne(condition, projection, options);
        if (course) {
            console.log(course)
            // const index = course.instructors.indexOf(instructorsID)
            // if(!index >= 0) return res.status(400).json({ data: { msg: 'Instructor not found or was not assigned to the course before' } });
            // course.instructors.splice(index, 1);
            // const removed = await course.save();
            // if(removed) return res.status(200).json({ data: { msg: 'Deassigned' } });
            // return res.status(400).json({ data: { msg: 'Try again' } });
        }
        return res.status(400).json({ data: { msg: 'Course not found' } });
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
});

// app.get('/api/students')

// app.get('/api/students/:id')

app.delete('/api/user/:id/delete', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(400).json({ msg: 'Request admin access' });

        const { id } = req.params;

        const user = await User.findByIdAndDelete(id, {}, { new: true, lean: true })
        console.log(user)
        if (!user) return res.status(404).json({ data: { msg: 'User not found' } })
        return res.status(200).json({ data: { msg: `${user.email}'s accoun deleted successfully` } })
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
});

// INSTRUCTOR ROUTES

app.get('/api/assigned-courses', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        console.log(my_details)
        if (my_details.userType !== 'instructor') return res.status(400).json({ msg: 'For innstructors only' });

        const condition = { instructors: { $elemMatch: { instructor: my_details.id } } };
        // const condition = { location: 'Online' };
        const projection = {};
        const option = { lean: true };

        const courses = await Course.find(condition, projection, option)
        // const courses = await Course.find().where('instructors').elemMatch({ instructor: my_details.id })
        if (courses) return res.status(200).json({ msg: 'Assigned courses!!', assignedcourses: courses })
        return res.status(400).json({ msg: 'Course nt found!!' })
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
});

app.get('/api/assigned-course/:id/students', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'instructor') return res.status(400).json({ msg: 'For innstructors only' });

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

        const courseDetails = await Course.findById(condition, projection, option).populate(populateOptions)
        if (courseDetails) return res.status(200).json({ msg: 'Detaiils!!', courseDetails })
        return res.status(400).json({ msg: 'Course not found!!' })
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
});

// Student routes

app.get('/api/myData', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        const projection = { email: 1, courses: 1, firstName: 1, lastName: 1, phoneNumber: 1, userType: 1 };
        const option = { lean: true };
        const populateOptions = {
            path: 'courses.courseID',
            select: 'title description start_end end_date instructors duration location courseType createdDate',

            populate: {
                path: 'instructors.instructor',
                select: 'firstName lastName email phoneNumber',
                model: 'User'
            },

            model: 'Course'
        };
        // const courses = await User.findById({id: my_details._id}, projection, option).populate(populateOptions).exec();
        // if(courses) return res.status(200).json({data: { msg: 'Registered courses!!', courses}});
        // return res.status(400).json({data: { msg: 'Error loading courses'}});
        User.findById(new mongoose.Types.ObjectId(my_details.id), projection, option).populate(populateOptions).exec()
            .then(user => (res.status(200).json({ msg: 'Registered courses!!', details: user })))
            .catch(err => (res.status(400).json({ msg: err })))

    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message })
    }
});


app.post('/api/course/:id/register', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        const { id } = req.params;
        const registerationDetails = req.body;

        const projection = { password: 0, instructor_id: 0, capacity: 0, enrollment_count: 0 }
        const option = { lean: true };
        console.log({ my_details });
        const course = await Course.findById(id, projection, option);
        console.log(course);
        if (course) {
            // if already registered for the coiurse
            //else
            //  push, update user into the course model

            // course.enrolled.map(registrations => )
            const registered = course.enrolled.some(enrollment => enrollment.userID.equals(my_details.id));
            console.log(registered);
            // THIS LOGIC IS BAD, UPDATING COURSE TWICE AT TWO DIFFERENT INSTEAD OF JUST ONCE AND CALLING .SAVE() on the model
            if (!registered) {
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
                const updateEnrollmentList = await Course.findByIdAndUpdate(id, register, options)
                if (updateEnrollmentList) {
                    // need to use projection and populate the course field                    
                    User.findByIdAndUpdate(my_details.id, addToMyCourseList, options)
                        .then(async updated => {
                            updateEnrollmentList.enrollment_count++;
                            await updateEnrollmentList.save();
                            return res.status(201).json({ data: { msg: 'Course enrollment sucessfull', courseList: updated } })
                        })
                        .catch(err => (res.status(400).json({ data: { msg: err } })));
                    return;
                }
                return res.status(400).json({ data: { msg: 'Enrollment failed' } })
            }
            return res.status(400).json({ msg: 'You\'ve enrolledd for this before' });
        }
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// Check transaction status      https://remitademo.net/payment/v1/payment/query/{{transactionId}}
app.post('/api/payment/status', async (req, res) => {
    try {
        const { transactionId } = req.body;

        const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: 'https://remitademo.net/payment/v1/payment/query/{{transactionId}}',
            headers: {
                'publicKey': 'QzAwMDAyNzEyNTl8MTEwNjE4NjF8OWZjOWYwNmMyZDk3MDRhYWM3YThiOThlNTNjZTE3ZjYxOTY5NDdmZWE1YzU3NDc0ZjE2ZDZjNTg1YWYxNWY3NWM4ZjMzNzZhNjNhZWZlOWQwNmJhNTFkMjIxYTRiMjYzZDkzNGQ3NTUxNDIxYWNlOGY4ZWEyODY3ZjlhNGUwYTY=',
                'Content-Type': 'application/json',
                //   'TXN_HASH': '{{hash}}'
                'TXN_HASH': `${transactionId}${process.env.secretKey}`
            }
        };

        const status = await axios(config);
        if (!status) throw new Error('Error getting payment status');
        return res.status(200).json({ msg: 'Payment status', status });

    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

app.use((err, req, res, next) => res.status(500).json({ msg: err }));

function authenticate(req, res, next) {
    // console.log(req.headers)
    const authHeader = req.headers['authorization'];
    // console.log(authHeader)
    const token = authHeader && authHeader.split(' ')[1];
    // console.log(token)
    if (token == null || token == undefined) return res.sendStatus(401).json({ msg: 'Unauthorized, login to view' })

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ msg: 'Unauthorized, login to view, token expired' })
        req.user = user;
        next();
    })
};

async function deleteImage(res, gfs, id) {
    if (!id || id === 'undefined') throw new Error('No image ID');
    // const _id = new mongoose.Types.ObjectId(id);
    const _id = id;
    const del = await gfs.delete(_id);
    // if(!del) throw new Error('Error deleting uploaded file');
    if (!del) return 'Error deleting uploaded file';
    console.log('file deleted');
    return 'File deleted'

}

app.listen(process.env.PORT || 5001, err => {
    if (err) console.log(err);
    else console.log('TRD up!!!')
});