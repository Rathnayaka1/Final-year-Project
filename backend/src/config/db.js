const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const DEFAULT_LOCAL_URI = process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/Smart-Service-Center-App';

async function connectToUri(uri, dbName) {
  return mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
    retryWrites: true,
    w: 'majority',
    autoIndex: true
  });
}

async function connectDB() {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const atlasUri = process.env.MONGODB_URI;
  const localUri = process.env.MONGODB_LOCAL_URI || DEFAULT_LOCAL_URI;
  const dbName = process.env.MONGODB_DB_NAME || undefined;

  const attempts = [{ uri: atlasUri, name: 'Atlas'}];

  let lastError;
  for (const attempt of attempts) {
    try {
      await connectToUri(attempt.uri, dbName);
      console.log(`✅ MongoDB connected (${mongoose.connection.host}) via ${attempt.name}`);
      return;
    } catch (error) {
      console.error(`❌ ${attempt.name} connection error:`, error.message);
      lastError = error;
    }
  }

  const requiredUriSource = isDevelopment ? 'local MongoDB or MONGODB_URI' : 'MONGODB_URI or local MongoDB';
  console.error(`❌ Unable to connect to MongoDB. Ensure ${requiredUriSource} is available and configured correctly.`);
  throw lastError || new Error('MongoDB connection failed for all configured URIs.');
}

module.exports = connectDB;