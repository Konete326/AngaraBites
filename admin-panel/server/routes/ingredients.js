const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');

router.get('/', async (req, res) => {
    try {
        const ingredients = await Ingredient.find().sort({ name: 1 });
        res.json(ingredients);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, unit, stockQuantity, lowStockThreshold, costPerUnit } = req.body;
        if (!name || !unit) {
            return res.status(400).json({ message: 'Name and unit are required' });
        }
        const ingredient = new Ingredient({
            name,
            unit,
            stockQuantity: Number(stockQuantity) || 0,
            lowStockThreshold: Number(lowStockThreshold) || 10,
            costPerUnit: Number(costPerUnit) || 0
        });
        const newIngredient = await ingredient.save();
        res.status(201).json(newIngredient);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, unit, stockQuantity, lowStockThreshold, costPerUnit } = req.body;
        const updated = await Ingredient.findByIdAndUpdate(
            req.params.id,
            {
                name,
                unit,
                stockQuantity: Number(stockQuantity),
                lowStockThreshold: Number(lowStockThreshold),
                costPerUnit: Number(costPerUnit)
            },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: 'Ingredient not found' });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Ingredient.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Ingredient not found' });
        res.json({ message: 'Ingredient deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/adjust-stock', async (req, res) => {
    try {
        const { ingredientId, quantity, type } = req.body;
        if (!ingredientId || quantity === undefined || !type) {
            return res.status(400).json({ message: 'Missing adjustment parameters' });
        }
        const ingredient = await Ingredient.findById(ingredientId);
        if (!ingredient) {
            return res.status(404).json({ message: 'Ingredient not found' });
        }
        const amt = Number(quantity);
        if (type === 'add') {
            ingredient.stockQuantity += amt;
        } else if (type === 'set') {
            ingredient.stockQuantity = amt;
        } else if (type === 'deduct') {
            ingredient.stockQuantity = Math.max(0, ingredient.stockQuantity - amt);
        }
        await ingredient.save();
        res.json(ingredient);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
