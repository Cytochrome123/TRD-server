const router = require("express").Router();

router.route("/")
.get((req, res) => {
    res.status(200).send('Hello')
}).post()

module.exports = router;
