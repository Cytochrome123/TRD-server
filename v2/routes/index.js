const { serverError, success } = require("../utils/api_response");
const { gfs } = require("../utils/gridfs");
const User = require('../db/models/user');
const Course = require('../db/models/course');
const Quiz = require('../db/models/quiz');

const router = require("express").Router();

router.route("/")
    .get((req, res) => {
        res.status(200).send('Hello')
    }).post()

// router.get('/file/:filename', async (req, res) => {
//     try {
//         const { filename } = req.params;
//         console.log('GETTING FILE NOW', filename)
//         if (!filename) return serverError(res);

//         gfs().find({ filename: filename }).toArray((err, file) => {
//             try {
//                 if (err) throw err
//                 else {
//                     console.log(file)
//                     const type = file[0].contentType;
//                     res.set("Content-Type", type);
//                 }

//             } catch (error) {
//                 throw error;
//             }

//         });

//         gfs().openDownloadStreamByName(filename).pipe(res);
//     } catch (error) {
//         console.log(error);
//         // res.status(error.status || 500).json({ msg: 'Server error', err: error.message });
//         return serverError(res);
//     }
// })

router.get('/file/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        console.log('GETTING FILE NOW', filename);
        if (!filename) return serverError(res);

        const files = await gfs().find({ filename: filename }).toArray();
        if (!files || files.length === 0) {
            return res.status(404).json({ msg: 'File not found' });
        }

        const file = files[0];
        const type = file.contentType;
        res.set("Content-Type", type);

        const downloadStream = gfs().openDownloadStreamByName(filename);
        downloadStream.on('error', (err) => {
            console.error('Stream error:', err);
            return serverError(res);
        });
        downloadStream.pipe(res);

    } catch (error) {
        console.error(error);
        return serverError(res);
    }
});

router.get('/search', async (req, res) => {
    const query = req.query.q;
    
    if (!query) {
      return res.status(400).json({ message: 'Query is required' });
    }
    
    try {
      const courses = await Course.find({ title: new RegExp(query, 'i') }).lean();
      const users = await User.find({ firstName: new RegExp(query, 'i') }).lean();
      const quiz = await Quiz.find({ name: new RegExp(query, 'i') }).lean();

      for(let course of courses) course.md = 'course'
      for(let user of users) user['md'] = 'user'
      for(let qz of quiz) qz['md'] = 'quiz'

      const data = [
        ...courses,
        ...users,
        ...quiz
      ]
  
      return success(res, data);
    } catch (error) {
      return serverError(res);
    }
  })


module.exports = router;
