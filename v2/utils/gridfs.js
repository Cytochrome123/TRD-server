// const multer = require('multer');
// const { GridFsStorage } = require('multer-gridfs-storage');
// const crypto = require('crypto');
// const path = require('path');
// const mongoose = require('mongoose');

// class GridFsConfig {
//     constructor() {};

//     static storage = new GridFsStorage({
//         url: process.env.MONGO_URL,
//         options: { useUnifiedTopology: true },
//         file: (req, file) => {
//             console.log(file, 'initial')
//             if(!file) return 'You need to upload ur image'
//             return new Promise((resolve, reject) => {
//                 crypto.randomBytes(16, (err, buf) => {
//                 if (err) {
//                     return reject(err);
//                 }
//                 const filename = buf.toString('hex') + path.extname(file.originalname);
//                 const fileInfo = {
//                     filename: filename,
//                     // filename: file.originalname,
//                     bucketName: 'uploads'
//                 };
//                 console.log(fileInfo, 'FILEINFO');
//                 resolve(fileInfo);
//                 });
//             });
//         }
//     });

//     static upload = multer({
//         storage: GridFsConfig.storage,
//         limits: { fileSize: 20000000 },
//         // limits: { fileSize: 2000 },
//         fileFilter: (req, file, cb) => {
//             GridFsConfig.checkFileType(file, cb)
//         }
//     });

//     static checkFileType = (file, cb) => {
//         // if(!file) return cb(null, false);
//         if(!file) {
//             console.log(111111)
//             return cb(null, false);}
//         const filetypes = /jpeg|jpg|png|mp4/;
//         const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//         const mimetype = filetypes.test(file.mimetype);
//         // if (mimetype && extname) return cb(null, true);
//         if (mimetype && extname) {
//             console.log('22222')
//             return cb(null, true);}
//         cb('filetype');
//     };

//     static uploadMiddleware = (req, res, next) => {
//         console.log('qwerty');
//         // console.log(GridFsConfig.upload)
//         const store = GridFsConfig.upload.fields([{name: 'image', maxCount: 1}, {name: 'video', maxCount: 1}]);
//         store(req, res, (err) => {
//             console.log('in grid uplo')
//             if (err instanceof multer.MulterError) {
//                 console.log('err1')
//                 return res.status(400).send(err);
//             } else if (err) {
//                 console.log('err2')

//                 if (err === 'filetype') return res.status(400).send('Image files only');
//                 return res.sendStatus(500);
//             }
//             next();
//         })
//     };
// };


// const gfs = () => {
//     console.log('GFS up!!!');
//     return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
//         bucketName: 'uploads',
//     });

// }

// module.exports = { GridFsConfig, gfs };














const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');
const mongoose = require('mongoose');
const { indexDB } = require('../db/adapters');
const { maxSizeExceeded, badRequest, serverError } = require('./api_response');

// const createGfs = () => {
const gfs = () => {
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads',
    });
}

class GridFsConfig {
    static async createStorage() {
        return new GridFsStorage({
            url: process.env.MONGO_URL,
            options: { useUnifiedTopology: true },
            file: (req, file) => {
                console.log(file, 'initial')
                if (!file) throw new Error('Please upload the tenants file')
                return new Promise((resolve, reject) => {
                    crypto.randomBytes(16, (err, buf) => {
                        if (err) {
                            return reject(err);
                        }
                        const filename = buf.toString('hex') + path.extname(file.originalname);
                        const fileInfo = {
                            filename: filename,
                            bucketName: 'uploads'
                        };
                        console.log(file, 'FILEINFO')
                        resolve(fileInfo);
                    });
                });
            }
        });
    }

    static async createMulterUpload() {
        return multer({
            storage: await GridFsConfig.createStorage(),
            // limits: { fileSize: 20000000 }, // 20MB limit
            // limits: { fileSize: 500 * 1024 },
            fileFilter: (req, file, cb) => {
                GridFsConfig.checkFileType(file, cb);
            }
        });
    }

    static checkFileType(file, cb) {
        if (!file) {
            cb(new Error('Invalid file input'));
            return cb(null, false);
        }

        const filetypes = /jpeg|jpg|png|mp4/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Invalid file type. Only JPEG, JPG, PNG, and MP4 files are allowed.'));
    }

    static async uploadMiddleware(req, res, next) {
        try {
            // const upload = this.createMulterUpload().fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]);
            // const upload = await GridFsConfig.createMulterUpload().fields([ { name: 'image', maxCount: 1 } ]);
            // upload(req, res, (err) => {
            const upload = await GridFsConfig.createMulterUpload();
            const multerMiddleware = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]);

            multerMiddleware(req, res, async (err) => {
                try {
                    console.log(err, 'ERRTT', req.files);
                    const files = req.files;

                    if (files?.image[0]?.size > 500 * 1024) {
                        const del = await indexDB.deleteImage(res, gfs(), files.image[0].id);
                        // if (del) throw new Error(`${del} \n\n File shld not exceed 5mb`);
                        return maxSizeExceeded(res, null, 'File size cannot be more than 500KB.')
                    };

                    if (err instanceof multer.MulterError) {
                        console.log(err, 'ERRTTTUIOOO')
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            return maxSizeExceeded(res, null, 'File size limit exceeded. Maximum allowed size is 500KB.')
                        }
                        return badRequest(res, null, `Multer error: ${err.message}`)
                    } else if (err) {
                        return badRequest(res, null, err.message)
                    }

                    next();
                } catch (error) {
                    throw error;
                }
            });
        } catch (error) {
            return serverError(res, `Error setting up file upload: ${error.message}`)
        }
    }
}


module.exports = { GridFsConfig, gfs };
