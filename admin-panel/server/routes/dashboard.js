const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');

const CUTOFF_UTC = new Date('2026-07-02T12:00:00.000Z');
const BUSINESS_START_UTC_HOUR = 12;

router.get('/today', async (req, res) => {
    try {
        const now = new Date();
        let startOfBusinessDay;

        if (now < CUTOFF_UTC) {
            startOfBusinessDay = new Date('2026-06-30T19:00:00.000Z');
        } else {
            startOfBusinessDay = new Date();
            startOfBusinessDay.setUTCHours(BUSINESS_START_UTC_HOUR, 0, 0, 0);
            if (now.getUTCHours() < BUSINESS_START_UTC_HOUR) {
                startOfBusinessDay.setUTCDate(startOfBusinessDay.getUTCDate() - 1);
            }
        }

        const [todaySales, todayExpenses] = await Promise.all([
            Sale.find({ createdAt: { $gte: startOfBusinessDay } }).lean().catch(() => []),
            Expense.find({ createdAt: { $gte: startOfBusinessDay } }).lean().catch(() => [])
        ]);

        const totalSales = (todaySales || []).reduce((sum, sale) => sum + (Number(sale?.totalAmount) || 0), 0);
        const totalExpenses = (todayExpenses || []).reduce((sum, exp) => sum + (Number(exp?.amount) || 0), 0);

        res.json({
            totalSales,
            totalExpenses,
            netCash: totalSales - totalExpenses
        });
    } catch (err) {
        console.error('Error fetching dashboard summary:', err);
        res.status(500).json({ message: err.message });
    }
});

router.get('/db-stats', async (req, res) => {
    try {
        const [totalSales, totalExpenses] = await Promise.all([
            Sale.countDocuments().catch(() => 0),
            Expense.countDocuments().catch(() => 0)
        ]);
        res.json({ totalSales, totalExpenses });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/analytics', async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [sales, expenses] = await Promise.all([
            Sale.find({ createdAt: { $gte: sevenDaysAgo } }).lean().catch(() => []),
            Expense.find({ createdAt: { $gte: sevenDaysAgo } }).lean().catch(() => [])
        ]);

        const daysData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            daysData.push({
                dateLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dateKey: d.toDateString(),
                sales: 0,
                expenses: 0
            });
        }

        (sales || []).forEach(sale => {
            if (!sale || !sale.createdAt) return;
            const saleDateKey = new Date(sale.createdAt).toDateString();
            const dayObj = daysData.find(d => d.dateKey === saleDateKey);
            if (dayObj) dayObj.sales += Number(sale.totalAmount) || 0;
        });

        (expenses || []).forEach(exp => {
            if (!exp || !exp.createdAt) return;
            const expDateKey = new Date(exp.createdAt).toDateString();
            const dayObj = daysData.find(d => d.dateKey === expDateKey);
            if (dayObj) dayObj.expenses += Number(exp.amount) || 0;
        });

        const itemCounts = {};
        (sales || []).forEach(sale => {
            if (sale && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    if (!item) return;
                    const name = item.name || 'Unknown Item';
                    const qty = Number(item.quantity) || 0;
                    itemCounts[name] = (itemCounts[name] || 0) + qty;
                });
            }
        });

        const topItems = Object.entries(itemCounts)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        res.json({
            daysData: daysData.map(d => ({ label: d.dateLabel, sales: d.sales, expenses: d.expenses })),
            topItems
        });
    } catch (err) {
        console.error('Error fetching dashboard analytics:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
