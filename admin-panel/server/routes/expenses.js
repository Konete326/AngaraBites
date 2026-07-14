const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// Get all expenses
router.get('/', async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ createdAt: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a new expense
router.post('/', async (req, res) => {
    try {
        const { amount, description } = req.body;
        
        if (!amount || !description) {
            return res.status(400).json({ message: 'Amount and description are required' });
        }

        const expense = new Expense({
            amount: Number(amount),
            description
        });

        const newExpense = await expense.save();
        res.status(201).json(newExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update an expense
router.put('/:id', async (req, res) => {
    try {
        const { amount, description } = req.body;
        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            { amount: Number(amount), description },
            { new: true }
        );
        if (!updatedExpense) return res.status(404).json({ message: 'Expense not found' });
        res.json(updatedExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/', auth, async (req, res) => {
    try {
        const result = await Expense.deleteMany({});
        res.json({ message: 'All expenses records deleted successfully', deletedCount: result.deletedCount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
        if (!deletedExpense) return res.status(404).json({ message: 'Expense not found' });
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
