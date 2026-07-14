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
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Category name is required' });
        }
        const cleanName = name.trim();
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${cleanName}$`, 'i') }
        });
        if (existingCategory) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }
        const newCategory = new Category({ name: cleanName, subCategories });
        await newCategory.save();
        res.json(newCategory);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a category
router.put('/:id', async (req, res) => {
    try {
        const { name, subCategories, subCategoryMappings } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Category name is required' });
        }
        const cleanName = name.trim();
        const existingCategory = await Category.findOne({
            _id: { $ne: req.params.id },
            name: { $regex: new RegExp(`^${cleanName}$`, 'i') }
        });
        if (existingCategory) {
            return res.status(400).json({ message: 'Category with this name already exists' });
        }
        const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id, 
            { name: cleanName, subCategories }, 
            { new: true }
        );
        if (updatedCategory && subCategories) {
            if (subCategoryMappings && typeof subCategoryMappings === 'object') {
                for (const [oldSub, newSub] of Object.entries(subCategoryMappings)) {
                    if (newSub) {
                        await Item.updateMany(
                            { category: req.params.id, subCategory: oldSub },
                            { $set: { subCategory: newSub } }
                        );
                    }
                }
            }
            await Item.updateMany(
                { 
                    category: req.params.id, 
                    subCategory: { $nin: subCategories } 
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
