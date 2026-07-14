import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  DollarSign, 
  ShoppingBag, 
  Package, 
  Search, 
  Filter, 
  TrendingUp, 
  RefreshCw, 
  Calendar,
  Grid,
  Trash2,
  Printer,
  Eye,
  Download,
  X
} from 'lucide-react';
import { SkeletonTable } from '../components/Skeleton';
import { useData } from '../context/DataContext';
import { getApiUrl } from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { triggerBrowserPrint } from '../utils/browserPrint';

// Helper: get current business date string (YYYY-MM-DD)
// Business day starts at 5 PM (17:00) local time.
// Before 5 PM → business date is yesterday; after 5 PM → today.
const getBusinessDateStr = () => {
  const now = new Date();
  const BUSINESS_START_HOUR = 17;
  const biz = new Date(now);
  if (now.getHours() < BUSINESS_START_HOUR) {
    biz.setDate(biz.getDate() - 1); // yesterday
  }
  const y   = biz.getFullYear();
  const m   = String(biz.getMonth() + 1).padStart(2, '0');
  const day = String(biz.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getBusinessMonthStr = () => {
  const now = new Date();
  const BUSINESS_START_HOUR = 17;
  const biz = new Date(now);
  // If it's the 1st of the month and before 5 PM, we're still in last month's business day
  if (now.getDate() === 1 && now.getHours() < BUSINESS_START_HOUR) {
    biz.setDate(0); // last day of previous month
  }
  const y = biz.getFullYear();
  const m = String(biz.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const Sales = () => {
  const { categories, isDataLoading } = useData();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, 7days, 30days, custom
  const [customDateType, setCustomDateType] = useState('day'); // day, week, month, range
  // Default to BUSINESS date (not calendar date)
  const [customSingleDate, setCustomSingleDate] = useState(getBusinessDateStr);
  const [customWeekStart, setCustomWeekStart] = useState(getBusinessDateStr);
  const [customMonth, setCustomMonth] = useState(getBusinessMonthStr);
  const [customRangeStart, setCustomRangeStart] = useState(getBusinessDateStr);
  const [customRangeEnd, setCustomRangeEnd] = useState(getBusinessDateStr);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('itemized'); // itemized, transactions

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Delete
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);
  const [printSale, setPrintSale] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSaleForModal, setSelectedSaleForModal] = useState(null);
  const [printerType, setPrinterType] = useState('auto');
  
  // Shift Report State
  const [showShiftReportModal, setShowShiftReportModal] = useState(false);
  const [reportDate, setReportDate] = useState(getBusinessDateStr);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [storeConfig, setStoreConfig] = useState({});


  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab, 
    categoryFilter, 
    itemSearchQuery, 
    dateFilter, 
    customDateType, 
    customSingleDate, 
    customWeekStart, 
    customMonth, 
    customRangeStart, 
    customRangeEnd
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, statusRes, storeRes] = await Promise.all([
        axios.get(getApiUrl('/api/sales')),
        axios.get(getApiUrl('/api/print/status')),
        axios.get(getApiUrl('/api/print/store-config'))
      ]);
      setSales(salesRes.data);
      if (statusRes.data && statusRes.data.type) {
        setPrinterType(statusRes.data.type);
      }
      if (storeRes.data) {
        setStoreConfig(storeRes.data);
      }
    } catch (err) {
      console.error('Error fetching sales page data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(getApiUrl(`/api/sales/${deleteId}`));
      setShowDeleteConfirm(false);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting sale:', err);
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Sale record delete karne mein error aaya.', type: 'error' });
    }
  };

  const handlePrintClick = (sale) => {
    setPrintSale(sale);
    setShowPrintConfirm(true);
  };

  const confirmPrint = async () => {
    if (!printSale || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const isBrowserPrint = printerType === 'browser' || window.location.hostname.includes('vercel.app');

      if (isBrowserPrint) {
        triggerBrowserPrint({
          type: 'CUSTOMER_RECEIPT',
          items: printSale.items,
          orderType: printSale.orderType,
          customerName: printSale.customerName,
          customerPhone: printSale.customerPhone,
          totalAmount: printSale.totalAmount,
          orderId: printSale._id
        }, storeConfig);
      } else {
        const printRes = await axios.post(getApiUrl('/api/print'), {
          type: 'CUSTOMER_RECEIPT',
          items: printSale.items,
          orderType: printSale.orderType,
          customerName: printSale.customerName,
          customerPhone: printSale.customerPhone,
          totalAmount: printSale.totalAmount,
          orderId: printSale._id
        });

        if (printRes.data && printRes.data.message && printRes.data.message.includes('Simulated print')) {
          triggerBrowserPrint({
            type: 'CUSTOMER_RECEIPT',
            items: printSale.items,
            orderType: printSale.orderType,
            customerName: printSale.customerName,
            customerPhone: printSale.customerPhone,
            totalAmount: printSale.totalAmount,
            orderId: printSale._id
          }, storeConfig);
        }
      }
      setAlertConfig({ isOpen: true, title: 'Success', message: 'Receipt printed successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Error printing receipt. Check printer connection.', type: 'error' });
    } finally {
      setIsSubmitting(false);
      setShowPrintConfirm(false);
      setPrintSale(null);
    }
  };

  // Business Day Helper: day starts at 5 PM (17:00) local time
  // e.g. July 1 5PM → July 2 4:59PM = "July 1 business day"
  const getBusinessDayStart = (date = new Date()) => {
    const CUTOFF_MS = new Date('2026-07-02T17:00:00').getTime(); // July 2 5 PM local
    if (date.getTime() < CUTOFF_MS) {
      // Before July 2nd 5 PM PKT, "Today" (July 1st business day) starts at July 1st 00:00 AM local
      return new Date('2026-07-01T00:00:00');
    }
    const BUSINESS_START_HOUR = 17; // 5 PM local
    const d = new Date(date);
    d.setHours(BUSINESS_START_HOUR, 0, 0, 0);
    if (date.getHours() < BUSINESS_START_HOUR) {
      // Before 5 PM → business day started yesterday at 5 PM
      d.setDate(d.getDate() - 1);
    }
    return d;
  };

  // ─── BUSINESS DAY CUTOFF ───────────────────────────────────────────────────
  // Records BEFORE July 2, 2026 → old midnight-to-midnight filtering (unchanged)
  // Records from July 2, 2026 onwards → new 5 PM-to-5 PM business day logic
  const CUTOFF_DATE_STR = '2026-07-02'; // first date using new business day

  // 1. Date Filter Logic
  const salesByDate = useMemo(() => {
    const now = new Date();
    // Business day start (new logic): today at 5 PM, or yesterday at 5 PM if before 5 PM now
    const bizDayStart = getBusinessDayStart(now);
    const todayStart  = bizDayStart.getTime();
    
    return sales.filter(sale => {
      const saleDate     = new Date(sale.createdAt);
      const saleDateTime = saleDate.getTime();
      
      if (dateFilter === 'today') {
        return saleDateTime >= todayStart;

      } else if (dateFilter === '7days') {
        const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
        return saleDateTime >= sevenDaysAgo;

      } else if (dateFilter === '30days') {
        const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;
        return saleDateTime >= thirtyDaysAgo;

      } else if (dateFilter === 'custom') {

        // ── Single Day ──────────────────────────────────────────────────────
        if (customDateType === 'day' && customSingleDate) {
          const [y, mo, d] = customSingleDate.split('-').map(Number);
          if (customSingleDate < CUTOFF_DATE_STR) {
            // OLD records: midnight → midnight (unchanged)
            const dayStart = new Date(y, mo - 1, d,  0,  0,  0,   0);
            const dayEnd   = new Date(y, mo - 1, d, 23, 59, 59, 999);
            return saleDateTime >= dayStart.getTime() && saleDateTime <= dayEnd.getTime();
          } else {
            // NEW records: 5 PM → next day 4:59 PM
            const bizStart = new Date(y, mo - 1, d,     17,  0,  0,   0);
            const bizEnd   = new Date(y, mo - 1, d + 1, 16, 59, 59, 999);
            return saleDateTime >= bizStart.getTime() && saleDateTime <= bizEnd.getTime();
          }

        // ── Specific Week ───────────────────────────────────────────────────
        } else if (customDateType === 'week' && customWeekStart) {
          const [y, mo, d] = customWeekStart.split('-').map(Number);
          if (customWeekStart < CUTOFF_DATE_STR) {
            // OLD: week starts at midnight
            const start = new Date(y, mo - 1, d,  0,  0,  0,   0);
            const end   = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
            return saleDateTime >= start.getTime() && saleDateTime <= end.getTime();
          } else {
            // NEW: week starts at 5 PM
            const start = new Date(y, mo - 1, d, 17,  0,  0,   0);
            const end   = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
            return saleDateTime >= start.getTime() && saleDateTime <= end.getTime();
          }

        // ── Specific Month ──────────────────────────────────────────────────
        } else if (customDateType === 'month' && customMonth) {
          const [y, mo] = customMonth.split('-').map(Number);
          const monthStr = customMonth + '-01';
          if (monthStr < CUTOFF_DATE_STR) {
            // OLD: full calendar month midnight-to-midnight
            const start = new Date(y, mo - 1,  1,  0,  0,  0,   0);
            const end   = new Date(y, mo,       0, 23, 59, 59, 999); // last day of month
            return saleDateTime >= start.getTime() && saleDateTime <= end.getTime();
          } else {
            // NEW: month starts on 1st at 5 PM → next month 1st at 4:59 PM
            const start = new Date(y, mo - 1,  1, 17,  0,  0,   0);
            const end   = new Date(y, mo,       1, 16, 59, 59, 999);
            return saleDateTime >= start.getTime() && saleDateTime <= end.getTime();
          }

        // ── Custom Range ────────────────────────────────────────────────────
        } else if (customDateType === 'range') {
          let startValid = true;
          let endValid   = true;
          if (customRangeStart) {
            const [y, mo, d] = customRangeStart.split('-').map(Number);
            const start = customRangeStart < CUTOFF_DATE_STR
              ? new Date(y, mo - 1, d,  0,  0,  0,   0) // OLD: midnight
              : new Date(y, mo - 1, d, 17,  0,  0,   0); // NEW: 5 PM
            startValid = saleDateTime >= start.getTime();
          }
          if (customRangeEnd) {
            const [y, mo, d] = customRangeEnd.split('-').map(Number);
            const end = customRangeEnd < CUTOFF_DATE_STR
              ? new Date(y, mo - 1, d,     23, 59, 59, 999) // OLD: midnight
              : new Date(y, mo - 1, d + 1, 16, 59, 59, 999); // NEW: 5 PM next day
            endValid = saleDateTime <= end.getTime();
          }
          return startValid && endValid;
        }
      }
      return true; // 'all' filter
    });
  }, [sales, dateFilter, customDateType, customSingleDate, customWeekStart, customMonth, customRangeStart, customRangeEnd]);


  // 2. Aggregate Itemized Sales from Sales list
  const allItemizedSales = useMemo(() => {
    const itemsMap = {};
    
    salesByDate.forEach(sale => {
      sale.items.forEach(item => {
        const key = `${item.name}-${item.type}-${item.price}`;
        if (!itemsMap[key]) {
          itemsMap[key] = {
            id: item.itemId || key,
            name: item.name,
            type: item.type,
            categoryName: item.categoryName || 'Uncategorized',
            price: item.price,
            quantitySold: 0,
            totalRevenue: 0
          };
        }
        itemsMap[key].quantitySold += item.quantity;
        itemsMap[key].totalRevenue += item.price * item.quantity;
      });
    });

    return Object.values(itemsMap);
  }, [salesByDate]);

  // 3. Filter Itemized Sales
  const filteredItemizedSales = useMemo(() => {
    return allItemizedSales.filter(item => {
      const matchesCategory = categoryFilter === 'All' || item.categoryName === categoryFilter;
      const matchesSearch = item.name.toLowerCase().includes(itemSearchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allItemizedSales, categoryFilter, itemSearchQuery]);

  // 4. Filter Transactions (Orders)
  const filteredTransactions = useMemo(() => {
    return salesByDate.filter(sale => {
      // If category filter is applied, check if at least one item in sale matches the category
      const matchesCategory = categoryFilter === 'All' || 
        sale.items.some(item => item.categoryName === categoryFilter);

      // If search filter is applied, check if at least one item matches search query
      const matchesSearch = itemSearchQuery === '' || 
        sale.items.some(item => item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [salesByDate, categoryFilter, itemSearchQuery]);

  // 5. Calculate Metrics based on filtered date range
  const { totalRevenue, totalOrders, totalItemsSold, averageOrderValue } = useMemo(() => {
    const revenue = salesByDate.reduce((sum, s) => sum + s.totalAmount, 0);
    const orders = salesByDate.length;
    const itemsSold = salesByDate.reduce((sum, s) => 
      sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    const avgOrderValue = orders > 0 ? (revenue / orders) : 0;
    
    return {
      totalRevenue: revenue,
      totalOrders: orders,
      totalItemsSold: itemsSold,
      averageOrderValue: avgOrderValue
    };
  }, [salesByDate]);

  // Helper for dynamic font size
  const getDynamicFontSize = (valueStr) => {
    const len = valueStr.length;
    if (len > 12) return '1rem';
    if (len > 9) return '1.15rem';
    if (len > 7) return '1.25rem';
    return '1.4rem';
  };

  // Pagination logic
  const paginatedItemizedSales = useMemo(() => {
    return filteredItemizedSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredItemizedSales, currentPage]);
  const totalItemizedPages = Math.ceil(filteredItemizedSales.length / itemsPerPage);

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredTransactions, currentPage]);
  const totalTransactionPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    setReportData(null);
    try {
      const res = await axios.get(getApiUrl(`/api/sales/shift-report?date=${reportDate}`));
      setReportData(res.data);
    } catch (err) {
      console.error('Error fetching shift report:', err);
      alert('Error fetching shift report data.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportCSV = (data) => {
    if (!data) return;
    const { date, summary, sales, expenses } = data;
    
    let csvString = '';
    csvString += `ANGARA BITES - DAILY SHIFT REPORT\n`;
    csvString += `Business Date,${date}\n`;
    csvString += `Report Generated At,${new Date().toLocaleString('en-PK')}\n\n`;
    
    csvString += `FINANCIAL SUMMARY\n`;
    csvString += `Total Sales,Rs. ${summary.totalSales.toLocaleString('en-PK')}\n`;
    csvString += `Total Expenses,Rs. ${summary.totalExpenses.toLocaleString('en-PK')}\n`;
    csvString += `Expected Net Cash in Drawer,Rs. ${summary.netCash.toLocaleString('en-PK')}\n\n`;
    
    csvString += `SALES TRANSACTIONS (${sales.length})\n`;
    csvString += `Time,Order Type,Customer Name,Phone,Total Amount\n`;
    sales.forEach(sale => {
      const timeStr = new Date(sale.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
      csvString += `"${timeStr}","${sale.orderType}","${sale.customerName || '-'}","${sale.customerPhone || '-'}","${sale.totalAmount}"\n`;
    });
    csvString += `\n`;

    csvString += `EXPENSES RECORDED (${expenses.length})\n`;
    csvString += `Time,Description,Amount\n`;
    expenses.forEach(exp => {
      const timeStr = new Date(exp.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
      csvString += `"${timeStr}","${exp.description.replace(/"/g, '""')}","${exp.amount}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `shift_report_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = (data) => {
    if (!data) return;
    const { date, summary, sales, expenses } = data;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print/save report as PDF");
      return;
    }

    const salesRows = sales.map(sale => {
      const timeStr = new Date(sale.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `
        <tr>
          <td>${timeStr}</td>
          <td>${sale.orderType}</td>
          <td>${sale.customerName || '-'}</td>
          <td>${sale.customerPhone || '-'}</td>
          <td style="text-align: right; font-weight: bold;">Rs. ${Number(sale.totalAmount).toLocaleString('en-PK')}</td>
        </tr>
      `;
    }).join('');

    const expensesRows = expenses.map(exp => {
      const timeStr = new Date(exp.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `
        <tr>
          <td>${timeStr}</td>
          <td>${exp.description}</td>
          <td style="text-align: right; font-weight: bold; color: #ef4444;">Rs. ${Number(exp.amount).toLocaleString('en-PK')}</td>
        </tr>
      `;
    }).join('');

    let html = '';
    html += '<html><head><title>Daily Shift Report - ' + date + '</title>';
    html += '<style>';
    html += 'body { font-family: "Helvetica Neue", Arial, sans-serif; color: #333; padding: 2rem; margin: 0; }';
    html += '.header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1.5rem; margin-bottom: 2rem; }';
    html += '.header h1 { margin: 0; font-size: 2rem; letter-spacing: 1px; }';
    html += '.header p { margin: 0.5rem 0 0 0; color: #666; font-size: 0.9rem; }';
    html += '.summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }';
    html += '.card { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; background-color: #fcfcfc; }';
    html += '.card-title { font-size: 0.8rem; color: #666; text-transform: uppercase; font-weight: bold; margin-bottom: 0.5rem; }';
    html += '.card-val { font-size: 1.5rem; font-weight: 800; }';
    html += 'h2 { font-size: 1.2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem; }';
    html += 'table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }';
    html += 'th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #eee; font-size: 0.9rem; }';
    html += 'th { background-color: #f5f5f5; font-weight: bold; }';
    html += '.signatures { display: flex; justify-content: space-between; margin-top: 5rem; padding-top: 2rem; }';
    html += '.sig-line { width: 200px; border-top: 1px solid #333; text-align: center; font-size: 0.85rem; color: #666; padding-top: 0.5rem; }';
    html += '@media print { body { padding: 1cm; } .no-print { display: none; } }';
    html += '</style></head><body>';

    html += '<div class="header">';
    html += '  <h1>ANGARA BITES</h1>';
    html += '  <p>DAILY BUSINESS SHIFT REPORT</p>';
    html += '  <p style="font-weight: bold; font-size: 1.1rem; margin-top: 0.4rem;">Business Date: ' + date + '</p>';
    html += '  <p style="font-size: 0.8rem; color: #888;">Generated At: ' + new Date().toLocaleString('en-PK') + '</p>';
    html += '</div>';

    html += '<div class="summary-cards">';
    html += '  <div class="card">';
    html += '    <div class="card-title">Total Sales</div>';
    html += '    <div class="card-val" style="color: #22c55e;">Rs. ' + summary.totalSales.toLocaleString('en-PK') + '</div>';
    html += '  </div>';
    html += '  <div class="card">';
    html += '    <div class="card-title">Total Expenses</div>';
    html += '    <div class="card-val" style="color: #ef4444;">Rs. ' + summary.totalExpenses.toLocaleString('en-PK') + '</div>';
    html += '  </div>';
    html += '  <div class="card">';
    html += '    <div class="card-title">Net Cash in Drawer</div>';
    html += '    <div class="card-val" style="color: #f59e0b;">Rs. ' + summary.netCash.toLocaleString('en-PK') + '</div>';
    html += '  </div>';
    html += '</div>';

    html += '<h2>Sales Transactions (' + sales.length + ')</h2>';
    if (sales.length > 0) {
      html += '<table><thead><tr><th>Time</th><th>Order Type</th><th>Customer Name</th><th>Phone</th><th style="text-align: right;">Total Amount</th></tr></thead><tbody>' + salesRows + '</tbody></table>';
    } else {
      html += '<p style="color: #888; font-size: 0.9rem;">No sales recorded for this date.</p>';
    }

    html += '<h2>Expenses Recorded (' + expenses.length + ')</h2>';
    if (expenses.length > 0) {
      html += '<table><thead><tr><th>Time</th><th>Description</th><th style="text-align: right;">Amount</th></tr></thead><tbody>' + expensesRows + '</tbody></table>';
    } else {
      html += '<p style="color: #888; font-size: 0.9rem;">No expenses recorded for this date.</p>';
    }

    html += '<div class="signatures">';
    html += '  <div class="sig-line">Manager Signature</div>';
    html += '  <div class="sig-line">Owner Signature</div>';
    html += '</div>';
    html += '</body></html>';

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <Layout>
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Sales Record</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.1rem 0 0 0' }}>Analyze shift summaries and business sales.</p>
          </div>
          <button 
            onClick={() => {
              setReportDate(getBusinessDateStr());
              setReportData(null);
              setShowShiftReportModal(true);
            }} 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 'bold' }}
          >
            <Printer size={16} /> Day-End Shift Report
          </button>
        </div>
        {/* Compact Actions & Filters */}
        <div style={styles.filterSection} className="glass-card">
          <div style={styles.filtersRow}>
            {/* Search Item */}
            <div style={styles.inputIconContainer}>
              <Search size={16} style={styles.inputIcon} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={itemSearchQuery}
                onChange={(e) => setItemSearchQuery(e.target.value)}
                style={styles.compactInput}
              />
            </div>

            {/* Date Range Selector Presets */}
            <div style={styles.datePills}>
              {[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: '7days', label: '7 Days' },
                { value: '30days', label: '30 Days' },
                { value: 'custom', label: 'Custom' },
              ].map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setDateFilter(preset.value)}
                  style={{
                    ...styles.datePill,
                    backgroundColor: dateFilter === preset.value ? 'var(--primary-yellow)' : 'rgba(255, 255, 255, 0.03)',
                    color: dateFilter === preset.value ? '#000000' : 'var(--text-muted)',
                    borderColor: dateFilter === preset.value ? 'var(--primary-yellow)' : 'var(--glass-border)'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button onClick={fetchData} style={styles.refreshBtn}>
              <RefreshCw size={16} />
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div style={styles.customFilterRow}>
              {/* Custom Type Selector */}
              <div style={styles.customTypePills}>
                {[
                  { value: 'day', label: 'Single Day' },
                  { value: 'week', label: 'Specific Week' },
                  { value: 'month', label: 'Specific Month' },
                  { value: 'range', label: 'Custom Range' }
                ].map(type => (
                  <button
                    key={type.value}
                    onClick={() => setCustomDateType(type.value)}
                    style={{
                      ...styles.customTypePill,
                      backgroundColor: customDateType === type.value ? 'var(--primary-yellow)' : 'rgba(255, 255, 255, 0.03)',
                      color: customDateType === type.value ? '#000000' : 'var(--text-muted)',
                      borderColor: customDateType === type.value ? 'var(--primary-yellow)' : 'var(--glass-border)'
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Input Selectors */}
              <div style={styles.customInputsContainer}>
                {customDateType === 'day' && (
                  <div style={styles.inputWithLabel}>
                    <span style={styles.inputLabel}>Select Day:</span>
                    <input 
                      type="date" 
                      value={customSingleDate} 
                      onChange={(e) => setCustomSingleDate(e.target.value)} 
                      style={styles.datePickerInput}
                    />
                  </div>
                )}
                {customDateType === 'week' && (
                  <div style={styles.inputWithLabel}>
                    <span style={styles.inputLabel}>Week Starting:</span>
                    <input 
                      type="date" 
                      value={customWeekStart} 
                      onChange={(e) => setCustomWeekStart(e.target.value)} 
                      style={styles.datePickerInput}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>(Fetches 7 days)</span>
                  </div>
                )}
                {customDateType === 'month' && (
                  <div style={styles.inputWithLabel}>
                    <span style={styles.inputLabel}>Select Month:</span>
                    <input 
                      type="month" 
                      value={customMonth} 
                      onChange={(e) => setCustomMonth(e.target.value)} 
                      style={styles.datePickerInput}
                    />
                  </div>
                )}
                {customDateType === 'range' && (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={styles.inputWithLabel}>
                      <span style={styles.inputLabel}>From:</span>
                      <input 
                        type="date" 
                        value={customRangeStart} 
                        onChange={(e) => setCustomRangeStart(e.target.value)} 
                        style={styles.datePickerInput}
                      />
                    </div>
                    <div style={styles.inputWithLabel}>
                      <span style={styles.inputLabel}>To:</span>
                      <input 
                        type="date" 
                        value={customRangeEnd} 
                        onChange={(e) => setCustomRangeEnd(e.target.value)} 
                        style={styles.datePickerInput}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Metrics Row */}
        <div style={styles.metricsGrid}>
          <div className="glass-card" style={styles.metricCard}>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(250, 204, 21, 0.1)', color: 'var(--primary-yellow)' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <p style={styles.metricTitle}>Total Revenue</p>
              <h2 style={{ ...styles.metricValue, fontSize: getDynamicFontSize(`Rs. ${totalRevenue.toLocaleString()}`) }}>
                Rs. {totalRevenue.toLocaleString()}
              </h2>
            </div>
          </div>

          <div className="glass-card" style={styles.metricCard}>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa' }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <p style={styles.metricTitle}>Total Orders</p>
              <h2 style={{ ...styles.metricValue, fontSize: getDynamicFontSize(`${totalOrders}`) }}>
                {totalOrders}
              </h2>
            </div>
          </div>

          <div className="glass-card" style={styles.metricCard}>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}>
              <Package size={20} />
            </div>
            <div>
              <p style={styles.metricTitle}>Items Sold</p>
              <h2 style={{ ...styles.metricValue, fontSize: getDynamicFontSize(`${totalItemsSold}`) }}>
                {totalItemsSold}
              </h2>
            </div>
          </div>

          <div className="glass-card" style={styles.metricCard}>
            <div style={{ ...styles.iconContainer, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <p style={styles.metricTitle}>Avg. Order Value</p>
              <h2 style={{ ...styles.metricValue, fontSize: getDynamicFontSize(`Rs. ${Math.round(averageOrderValue).toLocaleString()}`) }}>
                Rs. {Math.round(averageOrderValue).toLocaleString()}
              </h2>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="glass-card" style={styles.contentCard}>
          {/* Tab Selector */}
          <div style={styles.tabHeader}>
            <button 
              onClick={() => setActiveTab('itemized')}
              style={{
                ...styles.tabBtn,
                borderBottomColor: activeTab === 'itemized' ? 'var(--primary-yellow)' : 'transparent',
                color: activeTab === 'itemized' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              Itemized Sales
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              style={{
                ...styles.tabBtn,
                borderBottomColor: activeTab === 'transactions' ? 'var(--primary-yellow)' : 'transparent',
                color: activeTab === 'transactions' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              Order Transactions ({filteredTransactions.length})
            </button>
          </div>

          {/* Tab Content */}
          <div style={styles.tabBody}>
            {loading ? (
              <div style={{ padding: '2rem' }}>
                <SkeletonTable rows={5} columns={6} />
              </div>
            ) : activeTab === 'itemized' ? (
              filteredItemizedSales.length > 0 ? (
                <div style={styles.tableResponsive}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Item / Deal Name</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Unit Price</th>
                        <th style={styles.th}>Qty Sold</th>
                        <th style={styles.th}>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItemizedSales.map((item, idx) => (
                        <tr key={idx} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: '700' }}>{item.name}</td>
                          <td style={styles.td}>
                            <span style={styles.categoryBadge}>{item.categoryName}</span>
                          </td>
                          <td style={styles.td}>Rs. {item.price}</td>
                          <td style={{ ...styles.td, fontWeight: '700' }}>{item.quantitySold}</td>
                          <td style={{ ...styles.td, fontWeight: '800', color: 'var(--primary-yellow)' }}>
                            Rs. {item.totalRevenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {totalItemizedPages > 1 && (
                    <div style={styles.pagination}>
                      <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}>Previous</button>
                      <span style={styles.pageInfo}>Page {currentPage} of {totalItemizedPages}</span>
                      <button disabled={currentPage === totalItemizedPages} onClick={() => setCurrentPage(p => p + 1)} style={{ ...styles.pageBtn, opacity: currentPage === totalItemizedPages ? 0.5 : 1 }}>Next</button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <Package size={48} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
                  <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No items match your filters.</p>
                </div>
              )
            ) : (
              filteredTransactions.length > 0 ? (
                <div style={styles.tableResponsive}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date & Time</th>
                        <th style={styles.th}>Type & Customer</th>
                        <th style={styles.th}>Order Items</th>
                        <th style={styles.th}>Total Items</th>
                        <th style={styles.th}>Grand Total</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTransactions.map((sale, idx) => {
                        const date = new Date(sale.createdAt);
                        const formattedDate = date.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                        const formattedTime = date.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <tr key={sale._id || idx} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: '700' }}>{formattedDate}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formattedTime}</div>
                            </td>
                            <td style={styles.td}>
                              <span style={{
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                backgroundColor: sale.orderType === 'Dine-in' ? 'rgba(74, 222, 128, 0.1)' : 
                                                sale.orderType === 'Delivery' ? 'rgba(96, 165, 250, 0.1)' : 
                                                'rgba(250, 204, 21, 0.1)',
                                color: sale.orderType === 'Dine-in' ? '#4ade80' : 
                                      sale.orderType === 'Delivery' ? '#60a5fa' : 
                                      'var(--primary-yellow)',
                                display: 'inline-block'
                              }}>
                                {sale.orderType || 'Takeaway'}
                              </span>
                              {sale.orderType === 'Delivery' && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                  {sale.customerName && <div>{sale.customerName}</div>}
                                  {sale.customerPhone && <div>{sale.customerPhone}</div>}
                                </div>
                              )}
                            </td>
                            <td style={{ ...styles.td, fontSize: '0.8rem', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                              {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                            </td>
                            <td style={styles.td}>
                              {sale.items.reduce((sum, i) => sum + i.quantity, 0)}
                            </td>
                            <td style={{ ...styles.td, fontWeight: '800', color: 'var(--primary-yellow)' }}>
                              Rs. {sale.totalAmount.toLocaleString()}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                                <button
                                  onClick={() => setSelectedSaleForModal(sale)}
                                  className="icon-btn edit-btn"
                                  title="View Details"
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  onClick={() => handlePrintClick(sale)}
                                  className="icon-btn edit-btn"
                                  title="Reprint Customer Receipt"
                                >
                                  <Printer size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(sale._id)}
                                  className="icon-btn delete-btn"
                                  title="Delete this sale"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {totalTransactionPages > 1 && (
                    <div style={styles.pagination}>
                      <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.5 : 1 }}>Previous</button>
                      <span style={styles.pageInfo}>Page {currentPage} of {totalTransactionPages}</span>
                      <button disabled={currentPage === totalTransactionPages} onClick={() => setCurrentPage(p => p + 1)} style={{ ...styles.pageBtn, opacity: currentPage === totalTransactionPages ? 0.5 : 1 }}>Next</button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <ShoppingBag size={48} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
                  <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No orders match your filters.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete Sale Record"
          message="Are you sure you want to delete this sale record? This action cannot be undone."
          onConfirm={confirmDelete}
          onClose={() => { setShowDeleteConfirm(false); setDeleteId(null); }}
          confirmText="Delete"
          type="danger"
        />
      )}

      {showPrintConfirm && (
        <ConfirmModal
          isOpen={showPrintConfirm}
          title="Print Receipt"
          message="Are you sure you want to reprint the receipt for this order?"
          onConfirm={confirmPrint}
          onClose={() => { if (!isSubmitting) { setShowPrintConfirm(false); setPrintSale(null); } }}
          confirmText="Print"
          disabled={isSubmitting}
        />
      )}

      {alertConfig.isOpen && (
        <ConfirmModal
          isOpen={alertConfig.isOpen}
          title={alertConfig.title}
          message={alertConfig.message}
          onConfirm={() => {}}
          onClose={() => setAlertConfig({ isOpen: false, title: '', message: '', type: 'info' })}
          confirmText="OK"
          cancelText={null}
        />
      )}

      {selectedSaleForModal && (
        <div style={styles.modalOverlay}>
          <div className="modal-card" style={styles.detailModal}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: '800' }}>Order Details</h3>
              <button onClick={() => setSelectedSaleForModal(null)} style={styles.closeBtn}><X size={20} /></button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.detailGrid}>
                <div>
                  <label style={styles.detailLabel}>Order ID</label>
                  <div style={styles.detailValue}>{selectedSaleForModal._id}</div>
                </div>
                <div>
                  <label style={styles.detailLabel}>Order Type</label>
                  <div style={styles.detailValue}>{selectedSaleForModal.orderType || 'Takeaway'}</div>
                </div>
                <div>
                  <label style={styles.detailLabel}>Date & Time</label>
                  <div style={styles.detailValue}>
                    {new Date(selectedSaleForModal.createdAt).toLocaleString('en-US')}
                  </div>
                </div>
              </div>

              {(selectedSaleForModal.customerName || selectedSaleForModal.customerPhone) && (
                <div style={{ marginTop: '1.2rem', padding: '0.8rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Customer Details</h4>
                  {selectedSaleForModal.customerName && <div style={{ fontSize: '0.9rem', marginBottom: '0.2rem' }}>Name: <strong>{selectedSaleForModal.customerName}</strong></div>}
                  {selectedSaleForModal.customerPhone && <div style={{ fontSize: '0.9rem' }}>Phone: <strong>{selectedSaleForModal.customerPhone}</strong></div>}
                </div>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Ordered Items</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedSaleForModal.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
                      <div>
                        <span style={{ color: 'var(--primary-yellow)', fontWeight: '700', marginRight: '0.5rem' }}>{item.quantity}x</span>
                        <span>{item.name}</span>
                      </div>
                      <div style={{ fontWeight: '700' }}>
                        Rs. {(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid var(--glass-border)' }}>
                <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-muted)' }}>Grand Total</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary-yellow)' }}>
                  Rs. {selectedSaleForModal.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={() => {
                  setSelectedSaleForModal(null);
                  handlePrintClick(selectedSaleForModal);
                }}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                <Printer size={18} /> Reprint Receipt
              </button>
              <button
                onClick={() => setSelectedSaleForModal(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showShiftReportModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800' }}>
                <Printer size={20} color="var(--primary-yellow)" /> Day-End Shift Report
              </h3>
              <button 
                onClick={() => setShowShiftReportModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Select Business Date</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="date" 
                    value={reportDate} 
                    onChange={(e) => setReportDate(e.target.value)} 
                    style={{ ...styles.compactInput, flex: 1, height: '40px' }}
                  />
                  <button 
                    onClick={handleGenerateReport}
                    disabled={loadingReport}
                    className="btn-primary"
                    style={{ padding: '0 1.2rem', height: '40px', fontWeight: 'bold' }}
                  >
                    {loadingReport ? 'Loading...' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>

            {reportData && (
              <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(74, 222, 128, 0.05)', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Total Sales</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#4ade80' }}>Rs. {reportData.summary.totalSales.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Expenses</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ef4444' }}>Rs. {reportData.summary.totalExpenses.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(250, 204, 21, 0.1)', borderRadius: '8px', border: '1px solid rgba(250, 204, 21, 0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '0.2rem', fontWeight: 'bold' }}>Net Cash</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary-yellow)' }}>Rs. {reportData.summary.netCash.toLocaleString()}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.7rem 1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sales Transactions:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{reportData.sales.length} orders</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Expenses Count:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{reportData.expenses.length} entries</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button 
                    onClick={() => handleExportCSV(reportData)}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.65rem 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <Download size={16} /> Export Excel
                  </button>
                  <button 
                    onClick={() => handlePrintPDF(reportData)}
                    className="btn-primary"
                    style={{ flex: 1, padding: '0.65rem 0', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <Printer size={16} /> Print / Save PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </Layout>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  filterSection: {
    padding: '0.75rem 1rem',
  },
  filtersRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  inputIconContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: '200px',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-muted)',
  },
  compactInput: {
    width: '100%',
    padding: '0.5rem 1rem 0.5rem 2.25rem',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'var(--glass)',
    color: 'var(--text-main)',
    fontSize: '0.85rem',
  },
  datePills: {
    display: 'flex',
    gap: '0.4rem',
  },
  datePill: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  metricCard: {
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconContainer: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '0.1rem',
  },
  metricValue: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--text-main)',
    whiteSpace: 'nowrap',
  },
  contentCard: {
    padding: '0',
    overflow: 'hidden',
  },
  tabHeader: {
    display: 'flex',
    borderBottom: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  tabBtn: {
    padding: '1.25rem 2rem',
    fontSize: '0.95rem',
    fontWeight: '700',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
  },
  tabBody: {
    padding: '1rem 1.5rem',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0',
  },
  tableResponsive: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '0.5rem 0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '700',
    borderBottom: '2px solid var(--glass-border)',
    fontSize: '0.825rem',
  },
  tr: {
    borderBottom: '1px solid var(--glass-border)',
    transition: 'background-color 0.2s ease',
  },
  td: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.825rem',
    color: 'var(--text-main)',
  },
  categoryBadge: {
    backgroundColor: 'rgba(250, 204, 21, 0.1)',
    color: 'var(--primary-yellow)',
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  typeBadge: {
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  transactionItemsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  transactionItemPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    padding: '0.3rem 0.6rem',
    fontSize: '0.8rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 0',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--glass-border)'
  },
  pageBtn: {
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'var(--glass)',
    color: 'var(--text-main)',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: '600'
  },
  customFilterRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.5rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px dashed var(--glass-border)',
  },
  customTypePills: {
    display: 'flex',
    gap: '0.4rem',
  },
  customTypePill: {
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  customInputsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
  },
  inputWithLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  inputLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  datePickerInput: {
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'var(--glass)',
    color: 'var(--text-main)',
    fontSize: '0.8rem',
    outline: 'none',
    width: 'auto',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    backdropFilter: 'blur(8px)'
  },
  detailModal: {
    width: '90%',
    maxWidth: '500px',
    padding: '2rem'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '1rem',
    marginTop: '0.5rem',
    padding: '0.8rem',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)'
  },
  detailLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  detailValue: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-main)',
    marginTop: '0.2rem',
    wordBreak: 'break-all'
  }
};

export default Sales;
