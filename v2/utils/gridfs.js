const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');
const mongoose = require('mongoose');

class GridFsConfig {
    constructor() {};

    static storage = new GridFsStorage({
        url: process.env.MONGO_URL,
        options: { useUnifiedTopology: true },
        file: (req, file) => {
            console.log(file, 'initial')
            if(!file) return 'You need to upload ur image'
            return new Promise((resolve, reject) => {
                crypto.randomBytes(16, (err, buf) => {
                if (err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    // filename: file.originalname,
                    bucketName: 'uploads'
                };
                console.log(fileInfo);
                resolve(fileInfo);
                });
            });
        }
    });

    static upload = multer({
        storage: GridFsConfig.storage,
        limits: { fileSize: 20000000 },
        fileFilter: (req, file, cb) => {
            GridFsConfig.checkFileType(file, cb)
        }
    });

    static checkFileType = (file, cb) => {
        if(!file) return cb(null, false);
        const filetypes = /jpeg|jpg|png|mp4/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb('filetype');
    };

    static uploadMiddleware = (req, res, next) => {
        console.log('qwerty');
        // console.log(GridFsConfig.upload)
        const store = GridFsConfig.upload.fields([{name: 'image', maxCount: 1}, {name: 'video', maxCount: 1}]);
        store(req, res, (err) => {
            console.log('in grid uplo')
            if (err instanceof multer.MulterError) {
                return res.status(400).send(err);
            } else if (err) {
                if (err === 'filetype') return res.status(400).send('Image files only');
                return res.sendStatus(500);
            }
            next();
        })
    };
};


const gfs = () => {
    console.log('GFS up!!!');
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads',
    });

}

module.exports = { GridFsConfig, gfs };