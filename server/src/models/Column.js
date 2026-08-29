const mongoose = require('mongoose');

const DEFAULT_COLUMNS = [
  { name: 'To Do', color: '#6366f1' },
  { name: 'In Progress', color: '#f59e0b' },
  { name: 'In Review', color: '#3b82f6' },
  { name: 'Done', color: '#22c55e' },
];

const columnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#9ca3af',
    },
    wipLimit: {
      type: Number,
      default: 0, // 0 = unlimited
    },
  },
  {
    timestamps: true,
  }
);

columnSchema.index({ board: 1, order: 1 });

const Column = mongoose.model('Column', columnSchema);

module.exports = { Column, DEFAULT_COLUMNS };
