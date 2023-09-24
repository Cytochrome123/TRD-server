const mongoose = require("mongoose");

let gfsPromise = null;

// Create a function to establish the MongoDB connection and return a promise
const connectGridFs = () => {
  return new Promise((resolve, reject) => {
    mongoose.connect(process.env.MONGO_URL)
    .then(() => {
      console.log('Database connected');

      // Create a GridFSBucket once the MongoDB connection is open
      const gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'uploads',
      });

      console.log('GFS up!!!');

      // Resolve the promise with the gfs instance
      resolve(gfs);
    })
    .catch((err) => {
      console.log('Mongo error ', err);
      reject(err);
    });
  });
};

// Export a function that ensures the MongoDB connection is established and returns the gfs instance
const getGfs = async () => {
  if (!gfsPromise) {
    gfsPromise = connectGridFs();
  }
  return gfsPromise;
};

module.exports = getGfs;