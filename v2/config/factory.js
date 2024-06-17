const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const otpMap = new Map();
console.log(otpMap)
const factory = {
    generateHashPassword(password) {
        let salt = bcrypt.genSaltSync(10);
        let hashedPassword = bcrypt.hashSync(password, salt);
        return hashedPassword;
    },

    compareHashedPassword: (typedPassword, storedPassword) => {
        // return boolean
        let compareStatus = bcrypt.compareSync(typedPassword, storedPassword);

        return compareStatus;
    },

    generateOTP: () => {
        return Math.floor(100000 + Math.random() * 900000);
    },

    encodeOTP: (code, email) => {
        return jwt.sign({ code, email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" })
    },

    decodeOTP: (token) => {
        return jwt.decode(token);
    },

    addToOtpMap: (key, val) => {
        return otpMap.set(key, val)
    },

    getOtp: (key) => {
        return otpMap.get(key);
    },

    removeOtp: (key) => {
        return otpMap.delete(key)
    },

    generateTimestamps(numberOfTimestamps, intervalInMinutes) {
        const timestamps = [];
        let currentTime = Date.now(); // Get current time in milliseconds

        for (let i = 0; i < numberOfTimestamps; i++) {
            currentTime += intervalInMinutes * 60 * 1000; // convertingggg to milliseconds
            timestamps.push(Math.floor(currentTime / 1000)); // UNIX timestamp (seconds)
        }

        return timestamps;
    },

    renewToken: (id, firstName, lastName, email, userType) => {
        return jwt.sign({ id, firstName, lastName, email, userType }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3d' });

    }
}

module.exports = factory;