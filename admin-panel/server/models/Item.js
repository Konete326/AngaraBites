const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    subCategory: {
        type: String,
        default: null
    },
    kitchenType: {
        type: String,
        enum: ['Fast Food', 'BBQ', 'Drinks/Extras'],
        default: 'Fast Food'
    },
    priceType: {
        type: String,
        enum: ['single', 'variants'],
        default: 'single'
    },
    price: {
        type: Number,
        default: 0
    },
    image: {
        type: String
    },
    variants: [
        {
            name: { type: String, required: true },
            price: { type: Number, required: true }
        }
    ],
    spiceLevel: {
        type: Boolean,
        default: false
    },
    addons: [
        {
            name: { type: String, required: true },
            price: { type: Number, required: true }
        }
    ],
    trackDirectStock: {
        type: Boolean,
        default: false
    },
    stockQuantity: {
        type: Number,
        default: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 5
    },
    recipe: [
        {
            ingredientId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Ingredient',
                required: true
            },
            quantityRequired: {
                type: Number,
                required: true
            }
        }
    ],
    isAvailable: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

ItemSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Item', ItemSchema);
