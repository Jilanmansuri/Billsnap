import express from 'express';
import cors from 'cors';
import billRoutes from './routes/billRoutes.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Routes
app.use('/api', billRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'BillSnap Backend API',
    version: '1.0.0',
    status: 'online',
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler middleware
// Hides internal stack traces in production to prevent security disclosures
app.use((err, req, res, next) => {
  console.error('💥 Unhandled Server Error:', err.message);
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    success: false,
    error: isProduction ? 'An unexpected server error occurred.' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

export default app;
