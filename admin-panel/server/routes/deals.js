const express = require('express');
const router = express.Router();
const Deal = require('../models/Deal');
const { upload, uploadToCloudinary } = require('../middleware/cloudinary');

// Get all deals
router.get('/', async (req, res) => {
    try {
        const deals = await Deal.find().populate('items.item').lean();
        res.json(deals);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a deal
router.post('/', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = '';
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
            imageUrl = result.secure_url;
        }

        let parsedItems = req.body.items;
        if (typeof parsedItems === 'string') {
            try { parsedItems = JSON.parse(parsedItems); } catch (e) {}
        }

        const deal = new Deal({
            name: req.body.name,
            items: parsedItems,
            price: Number(req.body.price),
            image: imageUrl
        });

        const newDeal = await deal.save();
        const populatedDeal = await Deal.findById(newDeal._id).populate('items.item');
        res.status(201).json(populatedDeal);
    } catch (err) {
        console.error('POST /api/deals error:', err);
        res.status(400).json({ message: err.message });
    }
});

// Update a deal
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
            updateData.image = result.secure_url;
        }

        if (updateData.items && typeof updateData.items === 'string') {
            try {
                updateData.items = JSON.parse(updateData.items);
            } catch (e) {}
        }

        if (updateData.price) {
            updateData.price = Number(updateData.price);
        }

        const updatedDeal = await Deal.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('items.item');
        res.json(updatedDeal);
    } catch (err) {
        console.error('PUT /api/deals/:id error:', err);
        res.status(400).json({ message: err.message });
    }
});

// Delete a deal
router.delete('/:id', async (req, res) => {
    try {
        await Deal.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deal deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
