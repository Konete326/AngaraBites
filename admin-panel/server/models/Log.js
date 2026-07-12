const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    level: {
        type: String,
        enum: ['error', 'warn'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    stack: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now,
        expires: 7 * 24 * 60 * 60
    }
});

module.exports = mongoose.model('Log', LogSchema);
