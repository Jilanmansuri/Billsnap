import express from 'express';
import multer from 'multer';
import {
  extractBill,
  createBill,
  getAllBills,
  getBillById,
  updateBill,
  deleteBill,
} from '../controllers/billController.js';

const router = express.Router();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/jpg',
]);

// Configure Multer for in-memory processing with type validation
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 2 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type "${file.mimetype}". Please upload a JPEG, PNG, or WEBP image.`));
    }
  },
});

// Middleware to accept either 'bill' or 'image' field in multipart/form-data
const uploadMiddleware = (req, res, next) => {
  upload.fields([
    { name: 'bill', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    // Standardize file into req.file
    if (req.files) {
      if (req.files.bill && req.files.bill[0]) {
        req.file = req.files.bill[0];
      } else if (req.files.image && req.files.image[0]) {
        req.file = req.files.image[0];
      }
    }
    next();
  });
};

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'BillSnap Backend API is running',
    timestamp: new Date().toISOString(),
  });
});

// 1. AI Vision Extraction endpoint: POST /api/bills/extract
router.post('/bills/extract', uploadMiddleware, extractBill);

// 2. Persistent Bill Storage CRUD endpoints:
// POST /api/bills - Save a verified bill
router.post('/bills', createBill);

// GET /api/bills - Fetch all saved bills
router.get('/bills', getAllBills);

// GET /api/bills/:id - Fetch single bill
router.get('/bills/:id', getBillById);

// PUT /api/bills/:id - Update existing bill
router.put('/bills/:id', updateBill);

// DELETE /api/bills/:id - Delete bill
router.delete('/bills/:id', deleteBill);

export default router;
