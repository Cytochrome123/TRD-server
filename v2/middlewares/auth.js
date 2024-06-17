const jwt = require('jsonwebtoken');
const { unAuthorized } = require('../utils/api_response');

const auth = {
    isAuthenticated: (req, res, next) => {
        // const { authorization } = req.headers;

        // console.log(req.headers)
        const authHeader = req.headers['authorization'];
        // console.log(authHeader)
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            return unAuthorized(res, "Invalid token");
        }

        const token = authHeader && authHeader.split(' ')[1];
        // console.log(token)
        if (token == null || token == undefined) return unAuthorized(res, "Invalid token");

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return unAuthorized(res, err);
            req.user = user;
            return next();
        })
    },

    isAdmin: (req, res, next) => {
        try {
            console.log(req.user);
            const { userType } = req.user;

            if (userType !== 'admin') return unAuthorized(res, null, 'Only Admin can access this resource');

            return next()
        } catch (error) {
            // return res.status(403).json({ msg: "Only Admin can access" })
            return unAuthorized(res, null);
        }
    },

    isInstructor: (req, res, next) => {
        try {
            const { userType } = req.user;

            if (userType == 'instructor' || userType == 'admin') return next()

            return unAuthorized(res, null, 'Only Admin or instructors can access this resource');
        } catch (error) {
            return unAuthorized(res, null);
        }
    }
}

module.exports = auth;