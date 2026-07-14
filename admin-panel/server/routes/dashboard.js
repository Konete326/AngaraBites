const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');

// ── Business Day Configuration ─────────────────────────────────────────────
// OLD system (before July 2, 2026 5 PM PKT): day = calendar midnight → midnight
// NEW system (from July 2, 2026 5 PM PKT):  day = 5 PM PKT → next day 4:59 PM PKT
//   5 PM PKT = 12:00 noon UTC  (PKT = UTC+5)
//
// CUTOFF = July 2, 2026 at 12:00 UTC (= July 2 5 PM PKT)
const CUTOFF_UTC = new Date('2026-07-02T12:00:00.000Z');
const BUSINESS_START_UTC_HOUR = 12; // 12:00 UTC = 17:00 PKT

// Get "Today's Business" Summary
router.get('/today', async (req, res) => {
    try {
        const now = new Date();
        let startOfBusinessDay;

        if (now < CUTOFF_UTC) {
            // Before July 2nd 5:00 PM PKT (12:00 UTC), the current active business day is July 1st.
            // Since July 1st uses the old logic (midnight-to-midnight), we start querying from July 1st 00:00 PKT (June 30th 19:00 UTC).
            startOfBusinessDay = new Date('2026-06-30T19:00:00.000Z');
        } else {
            // ── NEW logic: 5 PM PKT = 12:00 UTC ──────────────────────────────
            startOfBusinessDay = new Date();
            startOfBusinessDay.setUTCHours(BUSINESS_START_UTC_HOUR, 0, 0, 0);
            // If current UTC hour is before noon, business day started yesterday at noon UTC
            if (now.getUTCHours() < BUSINESS_START_UTC_HOUR) {
                startOfBusinessDay.setUTCDate(startOfBusinessDay.getUTCDate() - 1);
            }
        }

        const todaySales = await Sale.find({ createdAt: { $gte: startOfBusinessDay } }).lean();
        const totalSales = todaySales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);

        const todayExpenses = await Expense.find({ createdAt: { $gte: startOfBusinessDay } }).lean();
        const totalExpenses = todayExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

        const netCash = totalSales - totalExpenses;

        res.json({
            totalSales,
            totalExpenses,
            netCash
        });
    } catch (err) {
        console.error('Error fetching dashboard summary:', err);
        res.status(500).json({ message: err.message });
    }
});

router.get('/db-stats', async (req, res) => {
    try {
        const [totalSales, totalExpenses] = await Promise.all([
            Sale.countDocuments(),
            Expense.countDocuments()
        ]);
        res.json({ totalSales, totalExpenses });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
