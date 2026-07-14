const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Item = require('../models/Item');
const Ingredient = require('../models/Ingredient');
const Deal = require('../models/Deal');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

async function decrementItemStock(itemId, quantity) {
    const item = await Item.findById(itemId);
    if (!item) return;

    const updates = [];

    if (item.trackDirectStock) {
        item.stockQuantity = Math.max(0, item.stockQuantity - quantity);
        if (item.stockQuantity === 0) {
            item.isAvailable = false;
        }
        updates.push(item.save());
    }

    if (item.recipe && item.recipe.length > 0) {
        for (const element of item.recipe) {
            updates.push((async () => {
                const ingredient = await Ingredient.findById(element.ingredientId);
                if (ingredient) {
                    const requiredAmt = element.quantityRequired * quantity;
                    ingredient.stockQuantity = Math.max(0, ingredient.stockQuantity - requiredAmt);
                    await ingredient.save();
                }
            })());
        }
    }

    await Promise.all(updates);
}

async function restoreItemStock(itemId, quantity) {
    const item = await Item.findById(itemId);
    if (!item) return;

    const updates = [];

    if (item.trackDirectStock) {
        item.stockQuantity = (item.stockQuantity || 0) + quantity;
        if (item.stockQuantity > 0) {
            item.isAvailable = true;
        }
        updates.push(item.save());
    }

    if (item.recipe && item.recipe.length > 0) {
        for (const element of item.recipe) {
            updates.push((async () => {
                const ingredient = await Ingredient.findById(element.ingredientId);
                if (ingredient) {
                    const requiredAmt = element.quantityRequired * quantity;
                    ingredient.stockQuantity = (ingredient.stockQuantity || 0) + requiredAmt;
                    await ingredient.save();
                }
            })());
        }
    }

    await Promise.all(updates);
}

router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10);
        const query = Sale.find().sort({ createdAt: -1 }).lean();
        if (limit > 0) {
            query.limit(limit);
        }
        const sales = await query;
        res.json(sales);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/shift-report', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'Date parameter is required' });
        }

        const targetDate = new Date(date);
        const startOfBusinessDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12, 0, 0, 0));
        const endOfBusinessDay = new Date(startOfBusinessDay.getTime() + 86400000);

        const [sales, expenses] = await Promise.all([
            Sale.find({ createdAt: { $gte: startOfBusinessDay, $lt: endOfBusinessDay } }).lean(),
            Expense.find({ createdAt: { $gte: startOfBusinessDay, $lt: endOfBusinessDay } }).lean()
        ]);

        const totalSales = sales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
        const netCash = totalSales - totalExpenses;

        res.json({
            date,
            summary: {
                totalSales,
                totalExpenses,
                netCash
            },
            sales,
            expenses
        });
    } catch (err) {
        console.error('Error generating shift report data:', err);
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

        const stockPromises = [];
        const dealIds = items.filter(i => i.type === 'deal').map(i => i.itemId);
        const deals = await Promise.all(dealIds.map(id => Deal.findById(id)));
        const dealMap = new Map(deals.filter(Boolean).map(d => [d._id.toString(), d]));

        for (const saleItem of items) {
            if (saleItem.type === 'item') {
                stockPromises.push(decrementItemStock(saleItem.itemId, saleItem.quantity));
            } else if (saleItem.type === 'deal') {
                const deal = dealMap.get(saleItem.itemId.toString());
                if (deal) {
                    for (const di of deal.items) {
                        const totalQty = di.quantity * saleItem.quantity;
                        stockPromises.push(decrementItemStock(di.item, totalQty));
                    }
                }
            }
        }

        await Promise.all(stockPromises);

        const newSale = await sale.save();
        res.status(201).json(newSale);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

// Delete all sales records
router.delete('/', auth, async (req, res) => {
    try {
        const result = await Sale.deleteMany({});
        res.json({ message: 'All sales records deleted successfully', deletedCount: result.deletedCount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete a single sale record
router.delete('/:id', auth, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        if (!sale) {
            return res.status(404).json({ message: 'Sale record not found' });
        }

        const stockPromises = [];
        const dealIds = sale.items.filter(i => i.type === 'deal').map(i => i.itemId);
        const deals = await Promise.all(dealIds.map(id => Deal.findById(id)));
        const dealMap = new Map(deals.filter(Boolean).map(d => [d._id.toString(), d]));

        for (const saleItem of sale.items) {
            if (saleItem.type === 'item') {
                stockPromises.push(restoreItemStock(saleItem.itemId, saleItem.quantity));
            } else if (saleItem.type === 'deal') {
                const deal = dealMap.get(saleItem.itemId.toString());
                if (deal) {
                    for (const di of deal.items) {
                        const totalQty = di.quantity * saleItem.quantity;
                        stockPromises.push(restoreItemStock(di.item, totalQty));
                    }
                }
            }
        }

        await Promise.all(stockPromises);

        await Sale.findByIdAndDelete(req.params.id);
        res.json({ message: 'Sale record deleted and stock restored successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Move today's sales records to yesterday (30 Jun)
router.post('/move-today-to-yesterday', auth, async (req, res) => {
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

