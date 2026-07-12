const express = require('express');
const router = express.Router();
const Log = require('../models/Log');

router.post('/', async (req, res) => {
    try {
        const { level, message, stack } = req.body;
        if (!level || !message) {
            return res.status(400).json({ error: 'Level and message are required' });
        }

        const newLog = new Log({ level, message, stack });
        await newLog.save();

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        Log.deleteMany({ timestamp: { $lt: sevenDaysAgo } }).catch(err => {
            console.error(err.message);
        });

        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const level = req.query.level;
        const search = req.query.search;

        const query = {};
        if (level && level !== 'all') {
            query.level = level;
        }
        if (search) {
            query.message = { $regex: search, $options: 'i' };
        }

        const total = await Log.countDocuments(query);
        const logs = await Log.find(query)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            logs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/', async (req, res) => {
    try {
        await Log.deleteMany({});
        res.json({ message: 'All logs cleared successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
