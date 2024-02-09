const { gfs } = require("../utils/gridfs");

const router = require("express").Router();

router.route("/")
    .get((req, res) => {
        res.status(200).send('Hello')
    }).post()

router.get('/file/:filename', async (req, res) => {
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
    } catch (error) {
        res.status(err.status || 500).json({ msg: 'Server error', err: err.message });
    }
})

module.exports = router;
