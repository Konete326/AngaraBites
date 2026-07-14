const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ExpenseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
