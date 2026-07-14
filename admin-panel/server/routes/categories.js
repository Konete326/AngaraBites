const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Item = require('../models/Item');

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 }).lean();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add a category
router.post('/', async (req, res) => {
    const { name, subCategories } = req.body;
    try {
        const newCategory = new Category({ name, subCategories });
        await newCategory.save();
        res.json(newCategory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a category
router.put('/:id', async (req, res) => {
    try {
        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        if (updatedCategory && req.body.subCategories) {
            await Item.updateMany(
                { 
                    category: req.params.id, 
                    subCategory: { $nin: req.body.subCategories } 
                },
                { $set: { subCategory: null } }
            );
        }
        res.json(updatedCategory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a category
router.delete('/:id', async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
