const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    storeName: {
        type: String,
        default: 'Angaara Bites'
    },
    phone: {
        type: String,
        default: '+92 3342471192'
    },
    footerNote: {
        type: String,
        default: 'Thank You! Please Visit Again.'
    },
    logoUrl: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
