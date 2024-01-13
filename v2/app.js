require('dotenv').config();
const express = require('express');
const cors = require('cors');
// const session = require('express-session');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SG_API_KEY);
const axios = require('axios');
// const getGfs = require('./db')
const multer = require('multer')

require('./db')

const indexRoute = require('./routes');
const authRoutes = require('./routes/auth')
const courseRoutes = require('./routes/course')

const app = express();


// mongoose.connect(process.env.MONGO_URL)
//     .then(() => (console.log('Mongoose Connection is Successful')))
//     .catch(err => (console.log('Mongo error ', err)));

// let gfs;
// const getDB = async () => {
//     gfs = await getGfs();
// };
// getDB();

// app.use(express.urlencoded({ extended: false }))
app.use(express.json());

// const multerMiddleware = multer();
// app.use(multerMiddleware.none());
// app.use(cors());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true, // allow session cookie from browser to pass through
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin']
}));
// app.use(session({
//     secret: 'TRD',
//     resave: false,
//     saveUninitialized: false,
//     cookie: { secure: true }
// }))


app.use('/api/v2', indexRoute)
app.use('/api/v2/auth', authRoutes)
app.use('/api/v2', courseRoutes)

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      // Multer error handling
      return res.status(400).json({ error: 'MulterError', message: err.message });
    }
    // Other types of errors
    next(err);
  });
                    

app.listen(process.env.PORT || 5001, err => {
    if (err) console.log(err);
    else console.log('TRD V2 upppp!!!')
});