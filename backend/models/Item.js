const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  team: { type: String, default: '' },
  type: { type: String, default: '' },
  status: { type: String, default: 'unassigned' },
  itemId: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  qrCodePath: { type: String, default: '' },
});

module.exports = mongoose.model('Item', itemSchema);
