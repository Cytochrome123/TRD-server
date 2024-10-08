require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
// const session = require('express-session');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SG_API_KEY);
const mongoose = require('mongoose');
const axios = require('axios');
const exceljs = require('exceljs');
const { isAfter } = require('date-fns');
const { validationResult } = require('express-validator');

const User = require('./models/user');
const Course = require('./models/course');
const Message = require('./models/message');
const Quiz = require('./models/quiz');
const Quiz_Attempt = require('./models/quiz_attempt');
const Enrollment = require('./models/enrollment');
const { generateHashPassword, compareHashedPassword } = require('./config/factory');
const GridFsConfig = require("./config/gridfs");
const getGfs = require('./db/connection');
const validation = require('./helper/validation');

const fs = require("fs");
const { google } = require("googleapis");

const service = google.sheets("v4");
const { log } = require('console');

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
// app.use(session({
//     secret: 'TRD',
//     resave: false,
//     saveUninitialized: false,
//     cookie: { secure: true }
// }));

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

app.post('/api/signup', GridFsConfig.uploadMiddleware, validation.register, async (req, res, next) => {
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

        userDetails.email = (userDetails.email).toLowerCase();

        if (!userDetails.email.includes('@')) throw new Error('Invalid email provided');

        let condition = { email: userDetails.email };
        let option = { lean: true };

        let exists = await User.findOne(condition, option);

        if (exists) {
            await deleteImage(res, gfs, files.image[0].id);
            return res.json({
                status: 409,
                msg: 'Account already exists'
            });
        }

        userDetails.password = generateHashPassword(userDetails.password);
        const pin = Math.floor(Math.pow(10, 3) + Math.random() * (9 * Math.pow(10, 3)));
        const verification_code = jwt.sign({ code: pin, email: userDetails.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
        userDetails['verification_code'] = verification_code;

        const { ENV, PROD_CLIENT_URL, DEV_CLIENT_URL, LOCAL_CLIENT_URL } = process.env;
        const verification_link = `${ENV == 'prod' ? PROD_CLIENT_URL : ENV == 'dev' ? DEV_CLIENT_URL : LOCAL_CLIENT_URL}/auth?code=${pin}&email=${userDetails.email}`;

        const user = await new User(userDetails).save();

        if (!user) throw new Error('Account creation failed');

        const msg = {
            to: user.email,
            from: 'hoismail2017@gmail.com',
            subject: 'Please verify you email',
            // text: `Use this to verify: ${verification_link}, expires in 15mins`,
            // content: `Use this to verify: ${verification_link}, expires in 15mins`,
            content: [
                {
                    type: 'text/html',
                    value: `<p>Use this to verify: ${verification_link}, expires in 15mins<p>`
                }
            ],
        };
        const sendMsg = await sgMail.send(msg);
        console.log(verification_link)
        if (!sendMsg) {
            console.log(`OTP sent to ${user.email}`);
            next();
        }

        return res.json({ status: 201, msg: 'Account created!, Kindly check your mail to verify your account. Thanks', user });
    } catch (err) {
        console.log(err)
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.post('/api/signin', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        let correlates = compareHashedPassword(password, user.password);

        if (!user || !correlates) throw new Error("Invalid credentials!")

        if (!user.is_verified) {
            const decode = jwt.decode(user.verification_code);

            if (!decode || isAfter(new Date(), new Date((decode)?.exp * 1000))) {
                const pin = Math.floor(Math.pow(10, 3) + Math.random() * (9 * Math.pow(10, 3)));
                const verification_code = jwt.sign({ code: pin, email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
                const { ENV, PROD_CLIENT_URL, DEV_CLIENT_URL, LOCAL_CLIENT_URL } = process.env;
                const verification_link = `${ENV == 'prod' ? PROD_CLIENT_URL : ENV == 'dev' ? DEV_CLIENT_URL : LOCAL_CLIENT_URL}/auth?code=${pin}&email=${email}`;

                const msg = {
                    to: user.email,
                    from: 'hoismail2017@gmail.com',
                    subject: 'Please verify you email',
                    // text: `Use this to verify: ${verification_link}, expires in 15mins`,
                    // content: `Use this to verify: ${verification_link}, expires in 15mins`,
                    content: [
                        {
                            type: 'text/html',
                            value: `<p>Use this to verify: ${verification_link}, expires in 15mins<p>`
                        }
                    ],
                };
                const sendMsg = await sgMail.send(msg);
                if (!sendMsg) {
                    console.log(`OTP sent to ${email}`);
                    next();
                }

                await User.findOneAndUpdate({ email }, { verification_code });
            };

            throw new Error("Email account not verified, please check your email for a verification link")
        }

        const accessToken = jwt.sign({ id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, userType: user.userType }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' })

        res.status(200).json({ msg: 'Logged In', accessToken, user });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }

});

app.post('/api/email/verify', async (req, res) => {
    try {
        const { email, code } = req.body;

        if (!email && !code) throw new Error('Invalid credentials');

        const user = await User.findOne({ email });

        if (!user) throw new Error('Account not found');
        console.log(user.verification_code)
        console.log(jwt.decode(user.verification_code))
        const { code: raw } = jwt.decode(user.verification_code);
        console.log(typeof code)
        console.log(typeof raw)
        if (!raw) throw new Error("Verification code expired!")

        if (raw !== +code) throw new Error("Invalid verification code");

        await User.findOneAndUpdate({ email }, { is_verified: true, verification_code: null });

        res.status(200).json({ msg: 'Successful', success: true });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/email', async (req, res, next) => {
    try {
        const { email } = req.body;

        const pin = Math.floor(Math.pow(10, 3) + Math.random() * (9 * Math.pow(10, 3)));
        const verification_code = jwt.sign({ code: pin, email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
        const { ENV, PROD_CLIENT_URL, DEV_CLIENT_URL, LOCAL_CLIENT_URL } = process.env;
        const verification_link = `${ENV == 'prod' ? PROD_CLIENT_URL : ENV == 'dev' ? DEV_CLIENT_URL : LOCAL_CLIENT_URL}/auth?code=${pin}&email=${email}`;

        const user = await User.findOne({ email });

        if (!user) throw new Error('Account not found');

        if (user && !user.is_verified) {
            await User.findOneAndUpdate({ email }, { verification_code });

            const msg = {
                to: user.email,
                from: 'hoismail2017@gmail.com',
                subject: 'Please verify you email',
                // text: `Use this to verify: ${verification_link}, expires in 15mins`,
                // content: `Use this to verify: ${verification_link}, expires in 15mins`,
                content: [
                    {
                        type: 'text/html',
                        value: `<p>Use this to verify: ${verification_link}, expires in 15mins<p>`
                    }
                ],
            };
            const sendMsg = await sgMail.send(msg);
            if (!sendMsg) {
                console.log(`OTP sent to ${email}`);
                next();
            }

            return res.status(200).json({ msg: 'Successful', success: true });
        };
        throw new Error('Your account is already verified!!!');


    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
})

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
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/course/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let projection = {};
        const option = { lean: true };
        const populateOptions = {
            path: 'instructors.instructor',
            select: 'firstName lastName email phoneNumber',
            model: 'User'
        };

        const course = await Course.findById(id, projection, option).populate(populateOptions).exec();

        if (!course) throw new Error('Course not found');

        res.status(200).json({ msg: 'Course details', course });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

// app.get('/api/admin/course/:id', authenticate, async (req, res) => {
//     try {
//         const my_details = req.user;
//         const { id } = req.params;

//         if (my_details.userType !== 'admin') throw new Error('Onl;y admin can access this')

//         let projection;
//         let option = { lean: true };
//         let populateOptions = {
//             path: 'enrolled.userID instructors.instructor',
//             model: 'User'
//         }


//         const course = await Course.findById(id, projection, option).populate(populateOptions)
//         if (!course) throw new Error('Course not found');

//         res.status(200).json({ msg: 'Course details', course });
//     } catch (err) {
//         res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
//     }
// })

app.post('/api/admin/course', GridFsConfig.uploadMiddleware, validation.course, authenticate, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ status: 'error', msg: errors.array() });
        };

        const my_details = req.user;
        console.log(my_details)

        if (my_details.userType !== 'admin') throw new Error('Only admin can access this');

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
        if (exists) return res.status(400).json({ msg: 'Course with the same title exists' });

        console.log('in')
        courseDetails['creatorID'] = my_details.id;
        // courseDetails['status'] = 'upcoming';
        console.log(courseDetails)

        const course = await new Course(courseDetails).save();
        if (!course) throw new Error('Course creation failed');

        res.status(201).json({ msg: 'Course created', course });
    } catch (err) {
        console.log(err)
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.patch('/api/admin/course/:id/assign', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Request admin access' });

        const { id } = req.params;
        const { instructors } = req.body;
        let condition = { _id: id }
        let projection = {};
        let options = { lean: true, new: true };

        const course = await Course.findOne(condition, projection, options);
        if (!course) return res.status(404).json({ msg: 'Course not found' });

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

        res.status(200).json({ msg: 'Intructor(s) assigned successfully', assigned })
    } catch (error) {
        res.status(500).json({ msg: 'Server error', err: error.message });
    }
});

app.patch('/api/admin/course/:id/status', authenticate, async (req, res, next) => { // yet
    try {
        const my_details = req.user;
        const { id } = req.params;
        const { status, deadline } = req.body;

        console.log(status)
        if (!my_details === 'admin') return res.status(403).json({ msg: 'Admin access only!', err });

        //if status is apllication, check if enry quiz exist
        const entry_quiz = await Quiz.findOne({ courseID: null, type: 'entry' });

        if (status === 'application' && !entry_quiz) throw new Error("You're yet to add an entry quiz, please add it before you can continue")

        const update = { status, deadline };

        const updated = await Course.findByIdAndUpdate(id, deadline ? update : { status }, { new: true })

        if (!updated) return next('Failed to update course status, kindly try again later');

        const stdEmails = [];
        const all = [];
        if (updated.status == 'application') {
            // get All users;
            const students = await User.find({ userType: 'student' });

            if (students) {
                for (let student of students) {
                    stdEmails.push(student.email);
                }

                const msg = {
                    subject: `The wait has finally ended`,
                    text: `${updated.title} is now open to application, kindly get yourselves enrolled before it closes. The deadline for application is ${updated.deadline}. Thanks`
                }
                const sent = await sgMail.send(constructMessage(stdEmails, msg, generateTimestamps(stdEmails.length, 10)));
                if (!sent) return next(`Failed to send mail to ${stdEmails}`)
                console.log(`Mail sent to ${stdEmails}`)
            };

        };

        const populateOptions = {
            path: 'user_id',
            select: 'firstName lastName email phoneNumber',
            model: 'User'
        }

        const students = await Enrollment.find({ course_id: id }).populate(populateOptions);

        for (let student of students) {
            all.push(student.user_id.email);
        };

        if (updated.status == 'application') {
            const msg = {
                subject: `The wait has finally ended`,
                text: `${updated.title} is now open to application, kindly get yourselves enrolled before the deadline. The deadline for application is ${updated.deadline}. Thanks`
            }
            const sent = await sgMail.send(constructMessage(all, msg, generateTimestamps(all.length, 10)))
            if (!sent) return next(`Failed to send mail to ${all}`)
            console.log(`Mail sent to ${all}`)
        } else if (updated.status == 'in-progress') {
            const msg = {
                subject: `The wait has finally ended`,
                text: `The course titled ${updated.title} has already begun, log onto the portal and get started`,
            }
            const sent = await sgMail.send(constructMessage(all, msg, generateTimestamps(all.length, 10)))
            if (!sent) return next(`Failed to send mail to ${all}`)
            console.log(`Mail sent to ${all}`)
        } else if (updated.status == 'completed') {
            const msg = {
                subject: `Congratulations!!!`,
                text: `The course titled ${updated.title} has now ended, finish up all you need to do in order to be eligible to request for your certificate`,
            }
            const sent = await sgMail.send(constructMessage(all, msg, generateTimestamps(all.length, 10)))
            if (!sent) return next(`Failed to send mail to ${all}`)
            console.log(`Mail sent to ${all}`)
        }

        function constructMessage(recipients, msg, queue) {
            console.log(recipients, 'RECIPiENT')
            console.log(queue, 'QUEUE')
            return {
                to: recipients,
                from: { email: 'hoismail2017@gmail.com', name: 'TRD iTems UI' },
                // from: 'Name <hoismail2017@gmail.com>',
                subject: msg.subject,
                text: msg.text,
                "send_each_at": queue
            };
        };

        function generateTimestamps(numberOfTimestamps, intervalInMinutes) {
            const timestamps = [];
            let currentTime = Date.now(); // Get current time in milliseconds

            for (let i = 0; i < numberOfTimestamps; i++) {
                currentTime += intervalInMinutes * 60 * 1000; // convertingggg to milliseconds
                timestamps.push(Math.floor(currentTime / 1000)); // UNIX timestamp (seconds)
            }

            return timestamps;
        }

        return res.status(200).json({ msg: 'Course status updated succesfully', status: updated.status, deadline: updated.deadline });
    } catch (err) {
        console.log(err)
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/users', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Request admin access' })

        let aggregatePipeline = [
            { $match: {} },
            { $group: { _id: '$userType', count: { $sum: 1 }, docs: { $push: '$$ROOT' } } },
            { $sort: { createdDate: -1 } },
        ];
        let options = { lean: true };

        const users = await User.aggregate(aggregatePipeline, options);
        if (!users) throw new Error('Error comipling users')

        res.status(200).json({ msg: 'All users compiled sucessfully', users })
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/user/:id', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Request admin access' });

        const { id } = req.params;
        const option = { lean: true, new: true };

        const user = await User.findById(id);
        if (!user) throw new Error('Failed to get user')

        res.status(200).json({ data: { msg: `${user.firstName}'s details`, user } });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/instructors', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Request admin access' });

        const condition = { userType: 'instructor' };
        const projection = { password: 0 };
        const option = { lean: true };

        const instructors = await User.find(condition, projection, option);
        if (!instructors) throw new Error('Instructors not found');

        res.status(200).json({ msg: `Instructors compilled`, instructors });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/instructor/:id', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Request admin access' });

        const { id } = req.params;

        const instructor = await User.findById(id);
        if (!instructor) throw new Error('Instructor not found');

        if (instructor.userType !== 'instructor') throw new Error(`User not an instructor`);

        res.status(200).json({ msg: `${instructor.firstName}'s details`, instructor });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/students', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Request admin access' });

        const condition = { userType: 'student' };
        const projection = { password: 0 };
        const option = { lean: true };

        const students = await User.find(condition, projection, option);
        if (!students) throw new Error('No students');

        res.status(200).json({ msg: `Students compilled`, students });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/student/:id', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType == 'student' || my_details.userType == 'user') return res.status(403).json({ msg: 'Request admin access' });

        const { id } = req.params;

        // const populateOptions = {
        //     path: 'user_id',
        //     select: 'firstName lastName email phoneNumber',

        //     model: 'User'
        // };

        // const student = await Enrollment.find({ user_id: id}).populate(populateOptions).exec();
        // if(!student) throw new Error('Student not found');
        const student = await User.findById(id)
        if (!student) throw new Error('Student not found');

        res.status(200).json({ msg: `${student.firstName}'s details`, student });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/course/:id/students', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType == 'student' || my_details.userType == 'user') return res.status(403).json({ msg: 'Only admin can access this resource' });

        const { id } = req.params;
        const populateOptions = {
            path: 'user_id',
            select: 'firstName lastName email phoneNumber',

            model: 'User'
        };

        const students = await Enrollment.find({ course_id: id }).populate(populateOptions).exec();
        if (!students) throw new Error('Could not fetch students for this course');

        res.status(200).json({ msg: `${students.course_id} students!!`, students });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
})

app.delete('/api/admin/user/:id/delete', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'admin') return res.status(403).json({ msg: 'Request admin access' });

        const { id } = req.params;

        const user = await User.findByIdAndDelete(id, { new: true, lean: true })
        console.log(user)
        if (!user) throw new Error('User not found');

        res.status(200).json({ data: { msg: `${user.email}'s accoun deleted successfully` } })
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/assigned-courses', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        console.log(my_details)
        if (my_details.userType !== 'instructor') return res.status(403).json({ msg: 'For innstructors only' });

        const condition = { instructors: { $elemMatch: { instructor: my_details.id } } };
        const projection = {};
        const option = { lean: true };

        const courses = await Course.find(condition, projection, option)
        // const courses = await Course.find().where('instructors').elemMatch({ instructor: my_details.id })
        if (!courses) throw new Error('Could not fetch')

        res.status(200).json({ msg: 'Assigned courses!!', assignedcourses: courses });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/assigned-course/:id/students', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (my_details.userType !== 'instructor') return res.status(403).json({ msg: 'For innstructors only' });

        const { id } = req.params;
        const option = { lean: true };
        const populateOptions = {
            path: 'user_id',
            select: 'firstName lastName email phoneNumber',
            model: 'User'
        };

        const courseDetails = await Enrollment.find({ course_id: id }, {}, option).populate(populateOptions).exec();
        if (!courseDetails) throw new Error('Could not fetch students');

        res.status(200).json({ msg: 'Students!!', courseDetails });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.post('/api/admin/quiz/setup', authenticate, async (req, res) => {
    try {
        console.log('SETTING')
        const { userType } = req.user;
        if (userType !== 'admin') return res.status(403).json({ msg: 'Only admin can access this!!' });

        const { name, link, sheet_id, pass_mark, course_id, type } = req.body;
        console.log({ name, link, sheet_id, pass_mark, course_id }, req.body)
        if (!link && !sheet_id && !name && !course_id) throw new Error('Invalid input')

        const quiz = await new Quiz({ name, link, sheet_id, pass_mark, course_id, type }).save();

        return res.status(200).json({ msg: 'Quiz created', quiz });
    } catch (err) {
        console.log(err.message)
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
})

app.get('/api/admin/quizzes', authenticate, async (req, res) => {
    try {
        const { userType } = req.user;
        if (userType !== 'admin') return res.status(403).json({ msg: 'Only admin can access this!!' });

        const quizzes = await Quiz.find({})
        if (!quizzes) throw new Error('Could not fetch all quiz');

        return res.status(200).json({ msg: 'All Quizzes', quizzes });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
})

app.get('/api/entry_quiz', authenticate, async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ courseID: null, type: 'entry' });

        if (!quiz) throw new Error('Entry quiz not found');

        res.status(200).json({ msg: 'Entry TQuizest', quiz });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.post('/api/entry_quiz/:name/:sheet_id/completed/proceed', authenticate, async (req, res) => {
    try {
        const { email, id } = req.user;
        const { name, sheet_id } = req.params;

        const quiz = await Quiz.findOne({ name, sheet_id, type: 'entry' })
        if (!quiz) throw new Error('Entry quiz not found');

        const result = await checkResult(quiz, email);
        if (!result) throw new Error('You are yet to attempt the entry quiz. Please do before you can continue')

        const score = result.score.split(' / ')[0]

        log(score, 'score');

        // store in db
        const attempt = await Quiz_Attempt.create({ user_id: id, quiz_id: quiz.id, score, passed: score >= quiz.pass_mark ? true : false });
        if (!attempt) throw new Error('Failed to keep attempt');

        res.status(200).json({ msg: `Done`, hasTakenQuiz: !!result, quizPassed: score >= quiz.pass_mark ? true : false });
    } catch (err) {
        console.log(err)
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/entry_quiz/status', authenticate, async (req, res) => {
    try {
        const { email, id } = req.user;

        const quiz = await Quiz.findOne({ type: 'entry' })
        if (!quiz) throw new Error('Entry quiz not found');

        const attempt = await Quiz_Attempt.findOne({ user_id: id, quiz_id: quiz.id });
        if (!attempt) return res.status(200).json({ msg: 'Entry quiz status', hasTakenQuiz: false, quizPassed: false });

        res.status(200).json({ msg: 'Entry quiz status', hasTakenQuiz: !!attempt, quizPassed: attempt.passed });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/module_zero', authenticate, async (req, res) => {
    try {
        console.log('looking for module_0')
        const module_zero = await Course.findOne({ isModuleZero: true });
        if (!module_zero) throw new Error('Could not find module 0');
        console.log(module_zero, 'MOD0')
        res.status(200).json({ msg: 'Module 0', module_zero });
    } catch (err) {
        console.log(err)
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
})

app.post('/api/course/:id/register', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        const { id } = req.params;
        const registerationDetails = req.body;

        const projection = { password: 0, instructor_id: 0, capacity: 0 }
        const option = { lean: true };

        const course = await Course.findById(id, projection, option);
        console.log(course);
        if (!course) throw new Error('Course not found');

        if (course.status !== 'application') throw new Error('Sorry this course is not open for application at the moment. Kindly check back later')

        const available = new Date(course.deadline) >= new Date();

        if (!available) throw new Error('Sorry, the deadline for enrollment has passed. Kindly check back or contact the organizers for more information. Thanks');

        // check if basic quiz is taken && if passed
        const quiz = await Quiz.findOne({ type: 'entry' })
        if (!quiz) throw new Error('Entry quiz not found');

        const attempt = await Quiz_Attempt.findOne({ user_id: my_details.id, quiz_id: quiz.id });
console.log(attempt, 'attempt')
        if (!attempt) throw new Error('You are yet to attempt the entry quiz');

        if (!attempt.passed && !course.isModuleZero) throw new Error('You cannot enrol for this course at the moment, as you did not meet the requirements. Kindly take module 0 to be eligible to enrol to any courses later. Thanks');

        // if already registered for the coiurse
        //else
        //  push, update user into the course model

        // course.enrolled.map(registrations => )
        const registered = await Enrollment.findOne({ user_id: my_details.id, course_id: course._id });

        let eligible = true;
        if(registered && registered.passed) eligible = false;

        console.log(registered, 'registered');

        if (registered && !eligible) throw new Error('Sorry, you\'ve enrolledd for this before');

        const register = await new Enrollment({ user_id: my_details.id, course_id: course._id }).save();
        if (!register) throw new Error('Enrollment failed');

        await Course.findByIdAndUpdate(course.id, { enrollment_count: course.enrollment_count++ }, { new: true });

        if (my_details.userType == 'user') {
            const updatedUser = await User.findByIdAndUpdate(my_details.id, { userType: 'student'}, { new: true });
            let renewToken = jwt.sign({ id: my_details.id, firstName: my_details.firstName, lastName: my_details.firstName, email: my_details.email, userType: updatedUser.userType }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' });
            console.log(renewToken, 'renew')
            return res.status(201).json({ msg: 'Course enrollment sucessfull', renewToken });
        }

        res.status(201).json({ msg: 'Course enrollment sucessfull' });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/courses/download', async (req, res) => {
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
});

app.get('/api/admin/course/:id/students/download', authenticate, async (req, res) => {
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

        const populateOptions = {
            path: 'user_id',
            select: 'firstName lastName email phoneNumber',

            // populate: {
            //     path: 'course_id',
            //     select: 'title description',
            //     model: 'Course'
            // },

            model: 'User'
        };

        const pop2 = {
            path: 'course_id',
            select: 'title description',
            model: 'Course'
        }

        const students = await Enrollment.find({ course_id: id }).populate(populateOptions).populate(pop2).exec();
        if (!students) throw new Error('Could not fetch students');
        console.log(students, 'sss')

        students.map((d) => {
            sheet.addRow({
                fName: d.user_id.firstName,
                lName: d.user_id.lastName,
                email: d.user_id.email,
                phone: d.user_id.phoneNumber,
            })
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment;filename=" + `${students[0].course_id.title} students.xlsx`
        );

        workbook.xlsx.write(res);
    } catch (error) {
        console.log(error)
        res.status(error.status || 500).json({ msg: 'Server error', err: error.message });
    }
});

app.get('/api/admin/students/download', authenticate, async (req, res) => {
    try {
        let workbook = new exceljs.Workbook();

        const sheet = workbook.addWorksheet('Students');

        sheet.columns = [
            { header: 'First Name', key: 'fName', width: 25 },
            { header: 'Last Name', key: 'lName', width: 25 },
            { header: 'Email', key: 'email', width: 50 },
            { header: 'Phone Number', key: 'phone', width: 25 }
        ];

        const students = await User.find({ userType: 'student' });
        if (!students) throw new Error('Could not fetch students');
        console.log(students, 'sss')

        students.map((std) => {
            sheet.addRow({
                fName: std.firstName,
                lName: std.lastName,
                email: std.email,
                phone: std.phoneNumber,
            })
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment;filename=" + `All students.xlsx`
        );

        workbook.xlsx.write(res);
    } catch (error) {
        console.log(error)
        res.status(error.status || 500).json({ msg: 'Server error', err: error.message });
    }
});

app.get('/api/admin/enrolled_courses', authenticate, async (req, res) => {
    try {
        const { userType } = req.user;

        if (userType !== 'admin') throw new Error('Only admins can access');

        const enrollments = await Enrollment.find({});
        if (!enrollments) throw new Error('Enrollments not found');

        res.status(200).json({ msg: 'Enrollments!!', enrollments });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
})

app.get('/api/enrolled_courses', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        const projection = { email: 1, courses: 1, firstName: 1, lastName: 1, phoneNumber: 1, userType: 1 };
        const option = { lean: true };
        const populateOptions = {
            path: 'course_id',
            select: 'title description start_end end_date instructors duration location courseType createdDate, image, capacity',

            populate: {
                path: 'instructors.instructor',
                select: 'firstName lastName email phoneNumber',
                model: 'User'
            },

            model: 'Course'
        };

        const details = await Enrollment.find({ user_id: my_details.id }).populate(populateOptions).exec();
        console.log(details)
        if (!details) throw new Error('Could not fetch registered courses');

        res.status(200).json({ msg: 'Registered courses!!', details });
    } catch (err) {
        console.log('errrrrreeeerrrr', err)
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/me', authenticate, async (req, res) => {
    try {
        const { email, id } = req.user;

        const meee = await User.findById(id);
        if (!meee) throw new Error('Error ffething profile');

        const populateOptions = {
            path: 'course_id',
            select: 'title description start_end end_date instructors duration location courseType createdDate, image, capacity',

            populate: {
                path: 'instructors.instructor',
                select: 'firstName lastName email phoneNumber',
                model: 'User'
            },

            model: 'Course'
        };

        const courses = await Enrollment.find({ user_id: id }).populate(populateOptions).exec();
        if (!courses) throw new Error('Could not get users registered courses');


        const me = {
            ...meee,
            enrolled_courses: courses
        }
        // me['enrolled_courses'] = courses;

        res.status(200).json({ msg: 'Registered courses!!', me });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
})

// this is meant to forward to mail ni ooooooo -- 🤦🏻‍♂️🤦🏻‍♂️
app.post('/api/message', (req, res) => {
    try {
        // const {}
        console.log(req.body)
        new Message(req.body).save()
            .then(mail => (res.status(201).json({ msg: 'Mail sent' })))
            .catch(err => (res.status(400).json({ msg: 'Error sending mail', err })))

    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
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
                const newAccessToken = jwt.sign({ id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, userType: user.userType, courses: user.courses }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' });
                return res.json({ msg: 'Login successful', newAccessToken, user });
            })
            .catch(err => {
                res.status(404).json({ msg: 'User error', error: err.message });
            })
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/admin/courses', authenticate, async (req, res) => {
    try {
        const populateOptions = {
            path: 'basicCourseID',
            select: '_id title description',
            model: 'Course'
        };

        const courses = await Course.find({}).populate(populateOptions).exec();
        if (!courses) throw new Error('Unable to fetch courses');

        res.status(200).json({ msg: 'Courses', courses });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
})






app.get('/api/course/:id/basic', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        const { id } = req.params;
        let projection;
        let option = { lean: true };
        let populateOptions = {
            path: 'basicCourseID',
            select: '_id image title description duration start_date end_date',
            model: 'Course'
        }

        const basic = await Course.findById(id, projection, option).populate(populateOptions);
        if (!basic) throw new Error('Not found')
        return res.status(200).json({ msg: 'Basic course details', basic });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
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

app.get('/api/created-courses', authenticate, async (req, res) => { // yet
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
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});







app.patch('/api/instructor/:instructorID/deassign/course/:id', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (!my_details === 'admin') return res.status(403).json({ msg: 'Request admin access' });

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
        return res.status(400).json({ msg: 'Course not found' });
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

// app.get('/api/students')

// app.get('/api/students/:id')

// INSTRUCTOR ROUTES



// COMING BACK LATER





app.get('/api/course/:id/quiz-status/:quizId', authenticate, async (req, res) => {
    try {
        const { email } = req.user;
        const { id, quizId } = req.params;

        const course = await Course.findById(id);
        if (!course) throw new Error('Course not found');

        const quiz = await Quiz.findById(quizId);
        if (!quiz) throw new Error('Quiz not found');

        const authClient = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            ["https://www.googleapis.com/auth/spreadsheets"]
        );

        const token = await authClient.authorize();
        authClient.setCredentials(token);

        // Get the rows
        const quizResponse = await service.spreadsheets.values.get({
            auth: authClient,
            // spreadsheetId: "1bvHPUxjbmGRmfUAxdnGQ836qv4yk670DoaQXJhnOS1U",
            // spreadsheetId: "1NdJOgtlq030C__p5_8gJjjXLG12R_DBB_AHq-R9ChN0",
            // spreadsheetId: "1Hw-WAddENONsxLiVLeEkaUxxWpU1sACdDNaU2E_lQkw",
            spreadsheetId: quiz.sheetID,
            range: "A:Z",
        });

        const data = quizResponse.data.values;

        // console.log(data, 'data')

        const fin = []

        if (data.length) {
            // data.shift();
            const emailIndex = data[0].findIndex(d => d == 'Email')
            const scoreIndex = data[0].findIndex(d => d == 'Score')

            for (let d of data) {
                d[emailIndex] && fin.push({ email: d[emailIndex], score: d[scoreIndex] })
            }
            // console.log(fin, 'fin')
        }

        const taken = fin.find(f => f.email === email);

        const score = taken?.score?.split(' / ')[0]

        res.status(200).json({ msg: 'Quiz status', hasTakenQuiz: !!taken, quizPassed: score >= quiz.pass_mark ? true : false });
        // if(score) return res.status(200).json({ msg: 'Quiz status', hasTakenQuiz: !!taken, quizPassed: score >= quiz.pass_mark ? true : false });
        // return res.status(200).json({ msg: 'Quiz status', hasTakenQuiz: !!taken, quizPassed: false });
    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: error.message ? error.message : 'Server error', error: error.message });
    }
})

app.get('/api/course/:id/quiz', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        const { id } = req.params;
        let projection = {};
        let option = { lean: true };
        let populateOptions = {
            path: 'courseID',
            select: 'title description',
            model: 'Course'
        }

        const quiz = await Quiz.findOne({ courseID: id, basic: false }, projection, option).populate(populateOptions);
        if (!quiz) throw new Error('Quiz not found');

        res.status(200).json({ msg: 'Course quiz ', quiz })
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

app.get('/api/course/:id/quiz/:quizID', authenticate, (req, res) => {
    try {
        const my_details = req.user;
        const { id, quizID } = req.params;
        let projection = {};
        let option = { lean: true };
        let populateOptions = {
            path: 'courseID',
            select: 'title description',
            model: 'Course'
        }

        Quiz.findOne({ courseID: id, _id: quizID }, projection, option).populate(populateOptions)
            .then(quiz => (res.status(200).json({ msg: 'Course quiz ', quiz })))
            .catch(err => (res.status(404).json({ msg: 'Not found' })))
        return;
    } catch (err) {
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

// GEt if passed or failed
app.post('/api/quiz/:name/:sheetID/completed/proceed', authenticate, async (req, res) => {
    try {
        const { email, id } = req.user;
        const { name, sheetID } = req.params;
        // const { courseID } = req.body

        // const quiz = await Quiz.findOne({ name, sheetID, courseID })
        const quiz = await Quiz.findOne({ name, sheetID })

        if (!quiz) throw new Error('Quiz not found');
        const result = await checkResult(quiz, email);

        if (!result) throw new Error('You are yet to attempt the quiz associated with this course')

        const score = result.score.split(' / ')[0]

        log(score, 'score');

        return res.status(200).json({ msg: `Done`, hasTakenQuiz: !!result, quizPassed: score >= quiz.pass_mark ? true : false });
    } catch (err) {
        console.log(err)
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

///// LATER ENDS HERE---------------------------------



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
        res.status(500).json({ msg: err.message ? err.message : 'Server error', error: err.message });
    }
});

// GEt uploaded file
app.get('/api/file/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        gfs.find({ filename: filename }).toArray((err, file) => {
            if (err) {
                // throw new Error(err.message);
                res.status(400).json({ msg: err.message });
            } else {
                console.log(file)
                const type = file[0].contentType;
                res.set("Content-Type", type);
            }

        });
        gfs.openDownloadStreamByName(filename).pipe(res);
    } catch (err) {
        res.status(err.status || 500).json({ msg: 'Server error', err: err.message });
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
    try {
        if (!id || id === 'undefined') throw new Error('No image ID');
        // const _id = new mongoose.Types.ObjectId(id);
        const _id = id;
        gfs.delete(_id)
            .then(del => {
                console.log('file deleted');
                return 'File deleted'
            })
            .catch(error => {
                throw new Error('Error deleting uploaded file', error);
            })
        // const del = await gfs.delete(_id)
        // // if(!del) throw new Error('Error deleting uploaded file');
        // if (!del) return 'Error deleting uploaded file';
        // console.log('file deleted');
        // return 'File deleted'
    } catch (error) {
        console.log(error, 'newErr');
        return error.message;
    }


}

async function checkResult(quiz, email) {
    console.log(quiz, 'checking result');
    const { sheet_id } = quiz;
    const authClient = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        ["https://www.googleapis.com/auth/spreadsheets"]
    );
    // const authClient = new google.auth.JWT(
    //     credentials.process.env.GOOGLE_CLIENT_EMAIL,
    //     null,
    //     credentials.process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    //     ["https://www.googleapis.com/auth/spreadsheets"]
    // );

    const token = await authClient.authorize();
    // Set the client credentials
    authClient.setCredentials(token);

    // const quiz = await Quiz.findOne({ name, sheetID })

    // Get the rows
    const quizResponse = await service.spreadsheets.values.get({
        auth: authClient,
        // spreadsheetId: "1bvHPUxjbmGRmfUAxdnGQ836qv4yk670DoaQXJhnOS1U",
        // spreadsheetId: "1NdJOgtlq030C__p5_8gJjjXLG12R_DBB_AHq-R9ChN0",
        spreadsheetId: sheet_id,
        range: "A:Z",
    });

    const data = quizResponse.data.values;

    // console.log(data, 'data')

    const fin = []

    if (data.length) {
        log('datasss')

        const emailIndex = data[0].findIndex(d => d == 'Email')
        log(emailIndex)
        const scoreIndex = data[0].findIndex(d => d == 'Score')
        log(scoreIndex)

        // data.shift();

        for (let d of data) {
            fin.push({ email: d[emailIndex], score: d[scoreIndex] })
        }

        console.log(fin, 'fin')
    }

    const result = fin.find(data => data.email === email);

    return result;
}

async function updateDB() {
    await User.updateMany({}, { $set: { verification_code: null } });
    await User.updateMany({}, { $set: { is_verified: false } });
    await User.updateMany({}, { $set: { password_otp: null } });
    await Course.updateMany({}, { $set: { testID: null } });

    console.log('DONE');
};

// updateDB()

app.listen(process.env.PORT || 5001, err => {
    if (err) console.log(err);
    else console.log('TRD up!!!')
});