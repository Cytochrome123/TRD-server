
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { GridFsStorage } = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const Course = require('../models/course');

// MongoDB URI
const uri = "mongodb+srv://TRD:trd@trd.ezzxpnv.mongodb.net/TRD_V2?retryWrites=true&w=majority";

// Connect to MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });


const gfs = () => {
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads',
    });
}
const conn = mongoose.connection;

conn.once('open', async () => {
    console.log('MongoDB connection established successfully');

    try {
        // Initialize GridFS
        // const gfs = Grid(conn.db, mongoose.mongo);
        // gfs.collection('uploads');

        // const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        //     bucketName: 'uploads',
        // });

        // Seed courses
        await seedCourses(gfs());

        console.log('Courses seeding completed.');
    } catch (err) {
        console.error('Error seeding courses:', err);
    } finally {
        // Close connection after seeding
        mongoose.connection.close();
    }
});

// GridFS storage engine
const storage = new GridFsStorage({
    url: uri,
    file: (req, file) => {
        return {
            bucketName: 'uploads',
            filename: file.originalname,
        };
    }
});

// Multer middleware for file uploads (not directly used in seeding)
const upload = multer({ storage });

// Course data to be seeded
const courses = [
    {
        title: "Digital Productivity Tools",
        category: "Digital",
        image: {
            path: "Digital Productivity Tools.png"
        },
        featured: true,
        duration: "2 weeks",
        description: "Master Microsoft Word basics to create and edit documents with confidence.",
    },
    {
        title: "Web Development",
        category: "Web",
        image: {
            path: "Web Development.webp"
        },
        featured: true,
        duration: "4 weeks",
        description: "Build web pages with HTML, style them with CSS, and add interactivity with JavaScript.",
    },
    // Add more courses as needed
];

async function seedCourses(gfs) {
    for (const course of courses) {
        const filePath = path.join(__dirname, 'images', course.image.path);
        const fileStream = fs.createReadStream(filePath);

        const writeStream = gfs.createWriteStream({
            filename: course.image.path, // Use the file path as the filename
        });

        fileStream.pipe(writeStream);

        try {
            const file = await new Promise((resolve, reject) => {
                writeStream.on('close', (file) => resolve(file));
                writeStream.on('error', (err) => reject(err));
            });

            console.log('File uploaded:', file.filename);

            // Add course data to the database
            const newCourse = new Course({
                creatorID: mongoose.Types.ObjectId('666bf70045b6e69b22f61da2'), // Replace with your creator ID
                title: course.title,
                description: course.description,
                category: course.category,
                image: {
                    imageID: mongoose.Types.ObjectId(file._id), // Use mongoose's ObjectId
                    path: file.filename
                },
                isModuleZero: course.isModuleZero || false,
                featured: course.featured || false
            });

            await newCourse.save();
            console.log('Course seeded:', newCourse.title);
        } catch (err) {
            console.error('Error seeding course:', err);
            throw err; // Throw error to propagate to the caller
        }
    }
}




// const fs = require('fs');
// const path = require('path');
// const mongoose = require('mongoose');
// const multer = require('multer');
// const { GridFsStorage } = require('multer-gridfs-storage');
// const Grid = require('gridfs-stream');
// const Course = require('../models/course');
// // const { gfs } = require('../../utils/gridfs');


// // MongoDB URI
// // const uri = process.env.MONGO_URL;
// const uri = "mongodb+srv://TRD:trd@trd.ezzxpnv.mongodb.net/TRD_V2?retryWrites=true&w=majority"
// // const dbName = 'TRD_V2';

// const courses = [
//     {
//         _id: 1,
//         title: "Digital Productivity Tools",
//         category: "Digital",
//         image: {
//             imageID: 1,
//             path: "Digital Productivity Tools.png"

//         },
//         featured: true,
//         duration: "2 weeks",
//         description:
//             "Master Microsoft Word basics to create and edit documents with confidence.",
//     },
//     {
//         _id: 2,
//         title: "Web Development",
//         category: "Web",
//         image: {
//             imageID: 2,
//             path: "Web Development.webp"

//         },
//         featured: true,
//         duration: "4 weeks",
//         description:
//             "Build web pages with HTML, style them with CSS, and add interactivity with JavaScript.",
//     },
//     {
//         _id: 3,
//         title: "Data Science",
//         category: "Data",
//         image: {
//             imageID: 3,
//             path: "Data Science.jpeg"

//         },
//         duration: "6 weeks",
//         description:
//             "Analyze data using Python, from data manipulation to visualization.",
//     },
//     {
//         _id: 4,
//         title: "Data Management and Analysis",
//         category: "Data",
//         image: {
//             imageID: 4,
//             path: "Data Management and Analysis.avif"

//         },
//         featured: true,
//         duration: "3 weeks",
//         description:
//             "Excel skills for data management, formulas, and generating insights.",
//     },
//     {
//         _id: 5,
//         title: "ArcGIS",
//         category: "ArcGIS",
//         image: {
//             imageID: 5,
//             path: "ArcGIS.png"

//         },
//         duration: "5 weeks",
//         description:
//             "Create dynamic web apps using PHP and connect to MySQL databases.",
//     },
//     {
//         _id: 6,
//         title: "Generative AI",
//         category: "AI",
//         image: {
//             imageID: 6,
//             path: "Generative AI.webp"

//         },
//         featured: true,
//         duration: "4 weeks",
//         description: "Learn Python basics for programming and problem-solving.",
//     },
//     {
//         _id: 7,
//         title: "Digital Literacy",
//         category: "Digital",
//         image: {
//             imageID: 7,
//             path: 'Digital Literacy.jpeg'

//         },
//         duration: "2 weeks",
//         description: "Design captivating presentations using PowerPoint.",
//     },
//     {
//         _id: 8,
//         title: "Basic Computer Operation",
//         category: "Basic",
//         featured: true,
//         image: {
//             imageID: 7,
//             path: 'Basic Computer Operation.png'

//         },
//         duration: "2 weeks",
//         description: "Design captivating presentations using PowerPoint.",
//         isModuleZero: true
//     }
// ];


// // Connect to MongoDB
// mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// const conn = mongoose.connection;

// conn.once('open', async () => {
//     console.log('MongoDB connection established successfully');
//     // await seed_courses();

// });

// let gfs;
// conn.once('open', async () => {
//   gfs = Grid(conn.db, mongoose.mongo);
//   gfs.collection('uploads');

//   await seed_courses();
// });

// // GridFS storage engine
// const storage = new GridFsStorage({
//     url: uri,
//     file: (req, file) => {
//         return {
//             bucketName: 'uploads',
//             filename: file.originalname,
//         };
//     }
// });


// async function seed_courses() {

//     for (const course of courses) {
//         const filePath = path.join(__dirname, 'images', course.image.path);
//         const fileStream = fs.createReadStream(filePath);

//         const writeStream = gfs.createWriteStream({
//             filename: course.title,
//             // content_type: 'image/jpeg', // Adjust content type as needed
//         });

//         fileStream.pipe(writeStream);

//         writeStream.on('close', async (file) => {
//             console.log('File uploaded: ', file.filename);

//             // Add course data to the database
//             const newCourse = new Course({
//                 creatorID: new mongoose.Types.ObjectId('666bf70045b6e69b22f61da2'),
//                 title: course.title,
//                 description: course.description,
//                 category: course.category,
//                 image: {
//                     imageID: new mongoose.Types.ObjectId(file._id),
//                     path: file.filename
//                 },
//                 isModuleZero: course.isModuleZero ? true : false,
//                 featured: course.featured ? true : false
//             });

//             try {
//                 await newCourse.save();
//                 console.log('Course seeded:', newCourse);
//             } catch (err) {
//                 console.error('Error seeding course:', err);
//             }
//         });

//         writeStream.on('error', (err) => {
//             console.error('Error uploading file: ', err);
//         });
//     }

//     mongoose.connection.close();
// }

console.log('2')

// async function seed_courses() {

//     for (const course of courses) {
//         const filePath = path.join(__dirname, 'images', course.image.path);
//         const fileStream = fs.createReadStream(filePath);

//         const uploadStream = new Promise((resolve, reject) => {
//             upload.single('file')(fileStream, {}, (err) => {
//                 if (err) {
//                     return reject(err);
//                 }
//                 resolve(fileStream);
//             });
//         });

//         try {
//             const file = await uploadStream;
//             const imageId = file.id;

//             const newCourse = new Course({
//                 creatorID: '666bf70045b6e69b22f61da2',
//                 title: course.title,
//                 description: course.description,
//                 category: course.category,
//                 image: {
//                     imageID: file._id,
//                     path: file.filename
//                 },
//                 isModuleZero: course.isModuleZero ? true : false,
//                 featured: course.featured ? true : false
//             });

//             await newCourse.save();
//             console.log('Course seeded:', newCourse);
//         } catch (err) {
//             console.error('Error seeding course:', err);
//         }
//     }

//     mongoose.connection.close();
// }

// seed_courses();








console.log('1')


// const mongodb = require('mongodb');
// const GridFS = require('gridfs-stream');
// const MongoClient = mongodb.MongoClient;

// async function seed_courses() {
//     let client;

//     try {
//         client = await MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
//         const db = client.db(dbName);
//         const gfs = GridFS(db, mongodb);

//         for (const course of courses) {
//             const filePath = path.join(__dirname, 'images', course.image.path);
//             const fileStream = fs.createReadStream(filePath);

//             const writeStream = gfs.createWriteStream({ filename: course.image });

//             fileStream.pipe(writeStream);

//             writeStream.on('close', async (file) => {
//                 console.log('File uploaded: ', file.filename);

//                 // Add course data to the database
//                 await db.collection('courses').insertOne({
// creatorID: '666bf70045b6e69b22f61da2',
// title: course.title,
// description: course.description,
// category: course.category,
// image: {
//     imageID: file._id,
//     path: file.filename
// },
// isModuleZero: course.isModuleZero ? true : false,
// featured: course.featured ? true : false
//                 });
//             });

//             writeStream.on('error', (err) => {
//                 console.error('Error uploading file: ', err);
//             });
//         }
//     } catch (error) {
//         console.error('Error seeding database: ', error);
//     } finally {
//         if (client) {
//             await client.close();
//         }
//     }
// }

// seed_courses();
