const jwt = require('jsonwebtoken');

const auth = {
    isAuthenticated: (req, res, next) => {
        // const { authorization } = req.headers;

        // console.log(req.headers)
        const authHeader = req.headers['authorization'];
        // console.log(authHeader)
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            return unAthorized(res, "Invalid token");
        }

        const token = authHeader && authHeader.split(' ')[1];
        // console.log(token)
        if (token == null || token == undefined) return res.sendStatus(401).json({ msg: 'Invalid token' })

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.status(403).json({ msg: 'Unauthorized' })
            req.user = user;
            return next();
        })
    },

    isAdmin: (req, res, next) => {
        try {
            const { userType } = req.user;

            if (userType !== 'admin') return res.status(403).json({ msg: "Only Admin can access" })

            return next()
        } catch (error) {
            return res.status(403).json({ msg: "Only Admin can access" })
        }
    },

    isInstructor: (req, res, next) => {
        try {
            const { userType } = req.user;

            if (userType !== 'instructor') return res.status(403).json({ msg: 'Unauthorized! Innstructors only' })

            return next()
        } catch (error) {
            return res.status(403).json({ msg: "Only Admin can access" })
        }
    }
}

module.exports = auth;