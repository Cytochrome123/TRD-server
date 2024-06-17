const multer = require('multer');

const storage = multer.memoryStorage()
const multerUpload = multer({ 
    storage: storage,
    // limits: {
    //     fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
    //     fieldSize: 2 * 1024 * 1024  // Limit non-file field size to 2MB
    // }
});

module.exports = { multerUpload };