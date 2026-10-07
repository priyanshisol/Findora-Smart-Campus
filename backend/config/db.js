const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/findora';
    console.log(`Connecting to MongoDB...`);
    
    // Set connection options
    const options = {
      serverSelectionTimeoutMS: 10000,
    };

    try {
      const conn = await mongoose.connect(connStr, options);
      console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (primaryErr) {
      if (process.env.NODE_ENV === 'production') {
        console.error(`MongoDB Atlas Connection Failed: ${primaryErr.message}`);
        throw primaryErr;
      }
      
      console.warn(`Primary MongoDB connection failed (${primaryErr.message}). Attempting fallback to MongoDB Memory Server...`);
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`Fallback MongoDB Memory Server Connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    }
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

