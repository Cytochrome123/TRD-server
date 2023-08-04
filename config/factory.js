const bcrypt = require('bcryptjs');

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
    }
}

module.exports = factory;