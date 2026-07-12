const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const { upload, uploadToCloudinary } = require('../middleware/cloudinary');

// Get all items (with pagination and search)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit, search, category } = req.query;
        let query = {};
        
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (category) {
            const Category = require('../models/Category');
            const catDoc = await Category.findOne({ name: category });
            if (catDoc) {
                query.category = catDoc._id;
            } else {
                query.category = null; // Forces empty result if category name doesn't exist
            }
        }

        const itemsQuery = Item.find(query).populate('category').sort({ createdAt: -1 });
        
        let items;
        let total = 0;
        
        if (limit) {
            const pageNumber = parseInt(page);
            const limitNumber = parseInt(limit);
            items = await itemsQuery.skip((pageNumber - 1) * limitNumber).limit(limitNumber);
            total = await Item.countDocuments(query);
            res.json({ items, total, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(total / limitNumber) });
        } else {
            items = await itemsQuery;
            // Returning in object format to match paginated structure if needed, or array for backward compatibility
            // Front-end should handle both, but let's stick to returning array if no limit to match existing behavior
            res.json(items);
        }
    } catch (err) {
        console.error('FETCH ITEMS ERROR:', err);
        res.status(500).json({ message: err.message });
    }
});

// Add an item
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, category, subCategory, kitchenType, price, priceType, spiceLevel, variants, addons, trackDirectStock, stockQuantity, lowStockThreshold, recipe } = req.body;

        let imageUrl = '';
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
            imageUrl = result.secure_url;
        }

        let parsedVariants = [];
        let parsedAddons = [];
        let parsedRecipe = [];
        if (variants) {
            if (typeof variants === 'string') {
                try { parsedVariants = JSON.parse(variants); } catch(e) {}
            } else if (Array.isArray(variants)) {
                parsedVariants = variants;
            }
        }
        if (addons) {
            try { parsedAddons = JSON.parse(addons); } catch(e) {}
        }
        if (recipe) {
            if (typeof recipe === 'string') {
                try { parsedRecipe = JSON.parse(recipe); } catch(e) {}
            } else if (Array.isArray(recipe)) {
                parsedRecipe = recipe;
            }
        }

        const newItem = new Item({ 
            name, category, subCategory,
            kitchenType: kitchenType || 'Fast Food',
            priceType: priceType || 'single',
            price: Number(price) || 0, 
            image: imageUrl,
            variants: parsedVariants,
            spiceLevel: spiceLevel === 'true',
            addons: parsedAddons,
            trackDirectStock: trackDirectStock === 'true' || trackDirectStock === true,
            stockQuantity: Number(stockQuantity) || 0,
            lowStockThreshold: Number(lowStockThreshold) || 5,
            recipe: parsedRecipe
        });
        await newItem.save();

        const populatedItem = await Item.findById(newItem._id).populate('category');
        res.json(populatedItem);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

// Update an item
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (updateData.variants !== undefined) {
            if (typeof updateData.variants === 'string') {
                try {
                    updateData.variants = JSON.parse(updateData.variants);
                } catch (e) {
                    console.error(e);
                }
            }
            if (Array.isArray(updateData.variants) && updateData.variants.length > 0) {
                updateData.price = 0;
            } else if (updateData.price !== undefined) {
                updateData.price = Number(updateData.price);
            }
        } else if (updateData.price !== undefined) {
            updateData.price = Number(updateData.price);
        }

        if (updateData.addons !== undefined) {
            if (typeof updateData.addons === 'string') {
                try {
                    updateData.addons = JSON.parse(updateData.addons);
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (updateData.spiceLevel !== undefined) {
            updateData.spiceLevel = updateData.spiceLevel === 'true';
        }

        if (updateData.trackDirectStock !== undefined) {
            updateData.trackDirectStock = updateData.trackDirectStock === 'true' || updateData.trackDirectStock === true;
        }

        if (updateData.stockQuantity !== undefined) {
            updateData.stockQuantity = Number(updateData.stockQuantity) || 0;
        }

        if (updateData.lowStockThreshold !== undefined) {
            updateData.lowStockThreshold = Number(updateData.lowStockThreshold) || 5;
        }

        if (updateData.recipe !== undefined) {
            if (typeof updateData.recipe === 'string') {
                try {
                    updateData.recipe = JSON.parse(updateData.recipe);
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
            updateData.image = result.secure_url;
        }

        const updatedItem = await Item.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('category');
        res.json(updatedItem);
    } catch (err) {
        console.error(err);
        res.status(400).json({ message: err.message });
    }
});

// Delete an item
router.delete('/:id', async (req, res) => {
    try {
        console.log(`DELETE /api/items/${req.params.id} request received`);
        const deleted = await Item.findByIdAndDelete(req.params.id);
        console.log('Deleted item document:', deleted);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        console.error('DELETE ITEM ROUTE ERROR:', err);
        res.status(500).json({ message: err.message });
    }
});

// Toggle availability
router.put('/:id/toggle-availability', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        
        item.isAvailable = !item.isAvailable;
        await item.save();
        
        const updatedItem = await Item.findById(req.params.id).populate('category');
        res.json(updatedItem);
    } catch (err) {
        console.error('TOGGLE AVAILABILITY ERROR:', err);
        res.status(500).json({ message: err.message });
    }
});

// Bulk update prices
router.put('/bulk/update-prices', async (req, res) => {
    try {
        const { updates } = req.body; // updates is an array of { id, price, variants }
        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ message: 'Updates array is required' });
        }

        const bulkOps = updates.map(update => {
            const updateDoc = {};
            if (update.price !== undefined) updateDoc.price = Number(update.price);
            if (update.variants !== undefined) updateDoc.variants = update.variants;
            
            return {
                updateOne: {
                    filter: { _id: update.id },
                    update: { $set: updateDoc }
                }
            };
        });

        if (bulkOps.length > 0) {
            await Item.bulkWrite(bulkOps);
        }

        res.json({ message: 'Prices updated successfully' });
    } catch (err) {
        console.error('BULK UPDATE ERROR:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
