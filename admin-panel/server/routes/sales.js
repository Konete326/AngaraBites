const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Item = require('../models/Item');
const Ingredient = require('../models/Ingredient');
const Deal = require('../models/Deal');

async function decrementItemStock(itemId, quantity) {
    const item = await Item.findById(itemId);
    if (!item) return;

    if (item.trackDirectStock) {
        item.stockQuantity = Math.max(0, item.stockQuantity - quantity);
        if (item.stockQuantity === 0) {
            item.isAvailable = false;
        }
        await item.save();
    }

    if (item.recipe && item.recipe.length > 0) {
        for (const element of item.recipe) {
            const ingredient = await Ingredient.findById(element.ingredientId);
            if (ingredient) {
                const requiredAmt = element.quantityRequired * quantity;
                ingredient.stockQuantity = Math.max(0, ingredient.stockQuantity - requiredAmt);
                await ingredient.save();
            }
        }
    }
}

router.get('/', async (req, res) => {
    try {
        const sales = await Sale.find().sort({ createdAt: -1 });
        res.json(sales);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const mongoose = require('mongoose');

router.post('/', async (req, res) => {
    try {
        const { _id, items, totalAmount, orderType, customerName, customerPhone } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        const sale = new Sale({
            _id: _id || new mongoose.Types.ObjectId(),
            items,
            totalAmount: Number(totalAmount),
            orderType: orderType || 'Takeaway',
            customerName: customerName || '',
            customerPhone: customerPhone || ''
        });

        for (const saleItem of items) {
            if (saleItem.type === 'item') {
                await decrementItemStock(saleItem.itemId, saleItem.quantity);
            } else if (saleItem.type === 'deal') {
                const deal = await Deal.findById(saleItem.itemId);
                if (deal) {
                    for (const di of deal.items) {
                        const totalQty = di.quantity * saleItem.quantity;
                        await decrementItemStock(di.item, totalQty);
                    }
                }
            }
        }

        const newSale = await sale.save();
        res.status(201).json(newSale);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

// Delete all sales records
router.delete('/', async (req, res) => {
    try {
        const result = await Sale.deleteMany({});
        res.json({ message: 'All sales records deleted successfully', deletedCount: result.deletedCount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a single sale record
router.delete('/:id', async (req, res) => {
    try {
        const sale = await Sale.findByIdAndDelete(req.params.id);
        if (!sale) {
            return res.status(404).json({ message: 'Sale record not found' });
        }
        res.json({ message: 'Sale record deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Move today's sales records to yesterday (30 Jun)
router.post('/move-today-to-yesterday', async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    // Decrement createdAt by 1 day (24 hours in ms)
    const result = await Sale.updateMany({ createdAt: { $gte: start, $lt: end } }, { $inc: { createdAt: -86400000 } });
    res.json({ message: "Moved today's sales records to yesterday", modifiedCount: result.nModified || result.modifiedCount });
  } catch (err) {
    console.error('POST /api/sales/move-today-to-yesterday error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

