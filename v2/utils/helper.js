const customError = (msg) => {
    const error = new Error(msg);
    error.type = 'custom';

    return error;
}

module.exports = { customError }