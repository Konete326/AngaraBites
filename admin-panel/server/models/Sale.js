const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false // Optional in case item/deal is deleted later
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['item', 'deal'],
        required: true
    },
    categoryName: {
        type: String,
        default: 'Uncategorized'
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    }
});

const SaleSchema = new mongoose.Schema({
    items: [SaleItemSchema],
    totalAmount: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    orderType: {
        type: String,
        enum: ['Dine-in', 'Takeaway', 'Delivery'],
        default: 'Takeaway'
    },
    customerName: {
        type: String,
        default: ''
    },
    customerPhone: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('Sale', SaleSchema);
