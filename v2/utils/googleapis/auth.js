const { google } = require("googleapis");

// const authClient = new google.auth.JWT(
//     credentials.process.env.GOOGLE_CLIENT_EMAIL,
//     null,
//     credentials.process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
//     ["https://www.googleapis.com/auth/spreadsheets"]
// );

const authClient = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    // null,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

// const token = await authClient.authorize();

// Set the client credentials

// authClient.setCredentials(token);

module.exports = authClient;