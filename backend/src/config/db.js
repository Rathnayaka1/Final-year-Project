const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

const DEFAULT_LOCAL_URI = process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/Smart-Service-Center-App';

async function connectToUri(uri, dbName) {
  if (!uri) return false;

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || 5000),
    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
    retryWrites: true,
    w: 'majority',
    autoIndex: true
  });

  return true;
}

async function connectDB() {
  const atlasUri = process.env.MONGODB_URI;
  const localUri = process.env.MONGODB_LOCAL_URI || DEFAULT_LOCAL_URI;
  const dbName = process.env.MONGODB_DB_NAME || undefined;

  const attempts = [
    { uri: atlasUri, name: 'Atlas' },
    { uri: localUri, name: 'Local MongoDB' }
  ].filter((attempt) => Boolean(attempt.uri));

  let lastError;
  for (const attempt of attempts) {
    try {
      await connectToUri(attempt.uri, dbName);
      console.log(`✅ MongoDB connected (${mongoose.connection.host}) via ${attempt.name}`);
      return true;
    } catch (error) {
      console.error(`❌ ${attempt.name} connection error:`, error.message);
      lastError = error;
    }
  }

  if (attempts.length === 0) {
    console.warn('⚠️ No MongoDB URI has been configured. Starting without a database connection.');
    return false;
  }

  console.warn('⚠️ MongoDB is unavailable. Starting the server without a database connection. Configure a valid MONGODB_URI or local MongoDB instance for full functionality.');
  return false;
}

module.exports = connectDB;