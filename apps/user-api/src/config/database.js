import mongoose from 'mongoose';

/**
 * Enterprise Centralized MongoDB Connection Manager
 */
class Database {
  constructor() {
    this.isConnected = false;
  }

  async connect(uri) {
    if (this.isConnected) {
      return mongoose.connection;
    }

    const mongoUri = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/whasappbulk';

    const options = {
      maxPoolSize: 50,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      autoIndex: process.env.NODE_ENV !== 'production'
    };

    try {
      mongoose.connection.on('connected', () => {
        this.isConnected = true;
        console.log(`[Database] MongoDB connected successfully to ${mongoose.connection.name}`);
      });

      mongoose.connection.on('error', (err) => {
        console.error('[Database] MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        console.warn('[Database] MongoDB disconnected');
      });

      await mongoose.connect(mongoUri, options);
      return mongoose.connection;
    } catch (error) {
      console.error('[Database] Critical error connecting to MongoDB:', error.message);
      // In development mode, don't crash immediately so other services can spin up
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('[Database] MongoDB connection closed gracefully');
    }
  }
}

export const db = new Database();
export default db;
