import mongoose from 'mongoose';

const BillItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity must be greater than 0'],
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative'],
    default: 0,
  },
  total: {
    type: Number,
    required: true,
    default: 0,
  },
});

const BillSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      trim: true,
      default: () => `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    },
    date: {
      type: String,
      required: [true, 'Bill date is required'],
      trim: true,
      default: () => new Date().toISOString().split('T')[0],
    },
    customerName: {
      type: String,
      required: [true, 'Customer or store name is required'],
      trim: true,
    },
    items: {
      type: [BillItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'A bill must contain at least one line item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative'],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative'],
    },
    grandTotal: {
      type: Number,
      required: true,
      min: [0, 'Grand total cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
      uppercase: true,
    },
    originalImageUrl: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient search, filtering, and sorting
BillSchema.index({ customerName: 1 });
BillSchema.index({ date: -1, createdAt: -1 });
BillSchema.index({ grandTotal: 1 });
BillSchema.index({ 'items.name': 1 });
BillSchema.index({ billNumber: 1 });

// Format JSON output to include 'id' instead of internal '_id'
BillSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  },
});

export const Bill = mongoose.model('Bill', BillSchema);
