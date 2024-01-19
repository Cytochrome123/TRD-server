const jwt = require('jsonwebtoken');

const auth = {
    isAuthenticated: (req, res, next) => {
        // console.log(req.headers)
        const authHeader = req.headers['authorization'];
        // console.log(authHeader)
        const token = authHeader && authHeader.split(' ')[1];
        // console.log(token)
        if (token == null || token == undefined) return res.sendStatus(401).json({ msg: 'Invalid token' })
    
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.status(403).json({ msg: 'Unauthorized' })
            req.user = user;
            return next();
        })
    }
}

module.exports = auth;