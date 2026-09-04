import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Start HTTP server immediately
app.listen(PORT, () => {
  console.log(`🚀 BillSnap Server running on http://localhost:${PORT}`);
});

// Connect to MongoDB if configured
if (process.env.MONGO_URI) {
  connectDB();
}
