const dns = require('node:dns');
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const { bootstrapData } = require('./services/bootstrapService');
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const serviceCenterRoutes = require('./routes/serviceCenterRoutes');
const technicianRoutes = require('./routes/technicianRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');
const stockRoutes = require('./routes/stockRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/service-centers', serviceCenterRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Service Center API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

const DEFAULT_PORT = Number(process.env.PORT || 5004);

function startServer(port = DEFAULT_PORT) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${port}`);
  });

  server.on('error', async (error) => {
    if (error.code === 'EADDRINUSE') {
      const fallbackPort = port + 1;
      console.warn(`⚠️ Port ${port} is already in use. Retrying on port ${fallbackPort}.`);
      startServer(fallbackPort);
      return;
    }

    console.error('❌ Server error:', error);
  });

  // Graceful shutdown handlers
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

async function initializeApp() {
  try {
    const isDbConnected = await connectDB();

    if (isDbConnected) {
      console.log('✅ Database connection established');
      await bootstrapData();
      console.log('✅ Bootstrap data completed');
    } else {
      console.warn('⚠️ Skipping database bootstrap because MongoDB is not available yet.');
    }

    if (!isDbConnected) {
      console.warn('⚠️ API routes requiring MongoDB will not work until a valid database is configured and running.');
    }

    startServer();
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}


// Global error handlers - log but don't crash immediately
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  console.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('Stack:', error.stack);
  // Don't exit - keep the server running for debugging
});

initializeApp();

module.exports = app;
