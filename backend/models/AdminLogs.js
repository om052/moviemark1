const mongoose = require('mongoose');

const adminLogsSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  level: {
    type: String,
    enum: ['info', 'warning', 'error', 'admin'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['user', 'content', 'admin', 'system', 'security'],
    default: 'system'
  },
  message: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminLogs', adminLogsSchema);
