const bcrypt = require('bcryptjs');

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

    addToOtpMap: (key, val) => {
        return otpMap.set(key, val)
    },

    getOtp: (key) => {
        return otpMap.get(key);
    },

    removeOtp: (key) => {
        return otpMap.delete(key)
    }
}

module.exports = factory;