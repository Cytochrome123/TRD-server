require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SG_API_KEY)

const User = require('./models/user');
const Course = require('./models/course');
const Message = require('./models/message');
const { generateHashPassword, compareHashedPassword } = require('./config/factory');

const app = express();

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL)
    .then(() => (console.log('Mongoose Connection is Successful')))
    .catch(err => (console.log('Mongo error ', err)));

app.use(express.json())
// app.use(cors());
app.use(cors({
    origin: 'http://localhost:3000',
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
}))

const otpMap = new Map();


app.get('/', (req, res) => {
    res.status(500).send('Hello')
})

// Seed

app.post('/seed/user', async (req, res) => {
    const userData = require('./user.json')
    for (const user of userData) {
        const newUser = await new User(user).save()
        if (newUser) console.log('Added')
    }

})

app.post('/seed/course', async (req, res) => {
    const courseData = require('./course.json')
    for (const course of courseData) {
        const newCourse = await new Course(course).save()
        if (newCourse) console.log(' Course Added')
    }

})
// AUTH

app.post('/api/signup', async (req, res) => {
    try {
        const userDetails = req.body;
        let condition = { email: userDetails.email };
        let option = { lean: true };

        let exists = await User.findOne(condition, option)
        if (!exists) {
            userDetails.password = generateHashPassword(userDetails.password);
            new User(userDetails).save()
                .then(user => {
                    return res.json({ status: 201, msg: 'Account created!', user })
                })
                .catch(err => {
                    return res.json({
                        status: 400,
                        msg: err
                    })
                })
            return;
        }
        return res.json({
            status: 409,
            msg: 'Account already exists'
        })
    } catch (err) {
        return res.status(500).json({ msg: 'Server error', err: err.message })
    }
})

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

                const accessToken = jwt.sign({ id: user._id, firstName: user.firstName, email: user.email, userType: user.userType, courses: user.courses }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' })
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
})

// BOTH                         ---------     CHECK THIS AGAIN - should be for both admin and instructor, so the poplayed field should be instructors
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
})

//ADMIN ROUTES

app.post('/api/course', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        console.log(my_details)
        const courseDetails = req.body;
        if (my_details.userType === 'admin') {
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
        if (my_details.userType === 'admin') {
            const { id } = req.params;
            // [ 'me', 'you', 'them']
            const { instructors } = req.body;
            let condition = { _id: id, creatorID: new mongoose.Types.ObjectId(my_details.id) }
            let projection = {};
            let options = { lean: true, new: true };
            Course.findOne(condition)
                .then(async course => {
                    const errors = [];
                    const check = instructors.map(async (instructorId) => {
                        // const user = await User.findById(instructorId);
                        User.findById(instructorId)
                            .then(user => {
                                const name = `${user.firstName} ${user.lastName}`;
                                if (course.instructors.some((instructor) => instructor.instructorsID.equals(instructorId))) {
                                    errors.push(`This ${instructorId} - ${name} has already been assigned to this course, effect beforre you can continie`)
                                };

                                if (errors.length > 0) {
                                    return res.status(400).json({ data: { msg: 'Assign failed', errors } });
                                };

                                // const assign = {
                                //     $push: {
                                //         instructors: {
                                //           $each: instructors.map((instructor) => ({ instructorID: instructor })),
                                //         },
                                //     },
                                // };

                                const assign = {
                                    $push: {
                                        instructors: {
                                            $each: instructors.map((instructor) => (instructor)),
                                        },
                                    },
                                };

                                Course.findOneAndUpdate(condition, assign, options)
                                    .then(assigned => (res.status(200).json({ data: { msg: 'Intructor(s) assigned successfully' } })))
                                    .catch(err => (res.status(400).json({ data: { msg: 'Assign failed', err } })));
                            })
                            .catch(err => { errors.push(`${instructorId}'s account not found, an account needed`, err) })

                        // if (!user) errors.push(`${instructorId}'s account not found, an account needed`, err)
                        // const name = `${user.firstName} ${user.lastName}`


                        // if (!user) return res.status(404).json({ data: { msg: `${instructorId}'s account not found, an account needed`, err } });
                        // if (course.instructors.some((instructor) => instructor.instructorID.equals(instructorId))) {
                        //     return res.status(400).json({ error: `This instructor has already been assigned to this course` });
                        // }
                        // return;
                    });

                    // await Promise.all(check);



                    // for (const instructorId of instructors) {
                    //     const user = await User.findById(instructorId);
                    //     if (!user) {
                    //       return res.status(400).json({ error: `${instructorId}'s account not found, an account is needed` });
                    //     }
                    //     if (course.instructors.some((instructor) => instructor.instructorsID.equals(instructorId))) {
                    //       return res.status(400).json({ error: 'This instructor has already been assigned to this course' });
                    //     }
                    // }
                    // Wait for all instructor ID validations to complete





                    // OOORRRR --------------------------------------------------------------

                    // Push each instructor ID into the instructors array
                    // instructors.forEach((instructor) => {
                    //     course.instructors.push({ instructorsID: instructor });
                    // });

                    // // Save the updated course
                    // await course.save()
                    // .then(assigned => (res.status(200).json({ data: { msg: 'Intructor(s) assigned successfully' } })))
                    // .catch(err => (res.status(400).json({ data: { msg: 'Assign failed', err } })));
                    return;
                })
                .catch(err => (res.status(404).json({ msg: 'Course not found', err })));
            return;
        }
        return res.status(403).json({ msg: 'Request admin access', err });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', err });
    }
})

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
        if (!my_details === 'admin') return res.status(403).json({ msg: 'Request admin access' })

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
        if (!my_details === 'admin') return res.status(400).json({ msg: 'Request admin access' });

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
        if (!my_details === 'admin') return res.status(400).json({ msg: 'Request admin access' });

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
        if (!my_details === 'admin') return res.status(400).json({ msg: 'Request admin access' });

        const { id } = req.params;
        const condition = { _id: id };
        const projection = {};
        const option = { lean: true, new: true };

        const instructor = await User.findById(id);
        if (instructor) return res.status(200).json({ data: { msg: `${instructor.firstName}'s details`, instructor } });
        return res.status(400).json({ data: { msg: `Error` } });
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
});

app.get('/api/students', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (!my_details === 'admin') return res.status(400).json({ msg: 'Request admin access' });

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
        if (!my_details === 'admin' || !my_details === 'instructor') return res.status(400).json({ msg: 'Request admin access' });

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
})

// app.get('/api/students')

// app.get('/api/students/:id')

app.delete('/api/user/:id/delete', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        if (!my_details === 'admin') return res.status(400).json({ msg: 'Request admin access' });

        const { id } = req.params;

        const user = await User.findByIdAndDelete(id, {}, { new: true, lean: true })
        console.log(user)
        if (!user) return res.status(404).json({ data: { msg: 'User not found' } })
        return res.status(200).json({ data: { msg: `${user.email}'s accoun deleted successfully` } })
    } catch (err) {
        res.status(500).json({ data: { msg: 'Server error', error: err.message } });
    }
})

// INSTRUCTOR ROUTES

app.get('/api/assigned-courses', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
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
})
app.get('/api/assigned-course/:id/students', authenticate, async (req, res) => {
    try {
        const my_details = req.user;
        const { id } = req.params;
        const condition = { _id: id };
        let projection = { title: 1, instructors: 1, status: 1, enrolled: 1, enrollment_count: 1 };
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
})

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
        console.log({my_details});
        const course = await Course.findById(id, projection, option);
        console.log(course);
        if (course) {
            // if already registered for the coiurse
            //else
            //  push, update user into the course model

            // course.enrolled.map(registrations => )
            const registered = course.enrolled.some(enrollment => enrollment.userID.equals(my_details.id));
            console.log(registered);
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
                        .then(updated => (res.status(201).json({ data: { msg: 'Course enrollment sucessfull', courseList: updated } })))
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

app.use((err, req, res, next) => res.status(500).json({ msg: err }));

function authenticate(req, res, next) {
    // console.log(req.headers)
    const authHeader = req.headers['authorization'];
    // console.log(authHeader)
    const token = authHeader && authHeader.split(' ')[1];
    // console.log(token)
    if (token == null || token == undefined) return res.sendStatus(401).json({ msg: 'Unauthorized, login to view' })

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403).json({ msg: 'Unauthorized, login to view' })
        req.user = user;
        next()
    })
}

app.listen(process.env.PORT || 5001, err => {
    if (err) console.log(err);
    else console.log('TRD up!!!')
});