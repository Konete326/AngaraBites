const pad = (str, len, align = 'LEFT') => {
  const s = String(str || '').substring(0, len);
  if (align === 'RIGHT') return s.padStart(len);
  if (align === 'CENTER') return s.padStart(Math.floor((len + s.length) / 2)).padEnd(len);
  return s.padEnd(len);
};

const center = (str, W) => {
  return pad(str, W, 'CENTER');
};

const tableRow = (cols, W) => {
  const widths = cols.map(c => Math.floor(c.width * W));
  return cols.map((c, i) => pad(c.text, widths[i], c.align)).join('');
};

const padLine = (left, right, W) => {
  const space = W - left.length - right.length;
  return left + ' '.repeat(Math.max(1, space)) + right;
};

const getShortOrderId = (orderId) => {
  if (!orderId) {
    return Date.now().toString().slice(-4);
  }
  const idStr = typeof orderId === 'object' && orderId._id 
    ? orderId._id.toString() 
    : orderId.toString();
  
  if (idStr.length === 24) {
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const shortNum = Math.abs(hash % 9000) + 1000;
    return shortNum.toString();
  }
  
  return idStr.slice(-4).toUpperCase();
};

const buildCustomerReceipt = (printData, storeConfig, W = 36) => {
  const { items = [], orderType = '', customerName = '', customerPhone = '', totalAmount = 0, orderId = '' } = printData;
  const storeName = storeConfig.storeName || 'Angaara Bites';
  const storePhone = storeConfig.phone || '+92 3342471192';
  const footerNote = storeConfig.footerNote || 'Thank You! Please Visit Again.';

  const shortId = getShortOrderId(orderId);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PK');
  const timeStr = now.toLocaleTimeString('en-PK', { hour12: true });
  const THIN = '-'.repeat(W);

  const lines = [];

  lines.push('!!BOLD!!' + center(storeName, W));
  lines.push(center('Ph: ' + storePhone, W));
  lines.push(THIN);

  lines.push(padLine(`Order: ${shortId}`, `Type: ${orderType || 'Takeaway'}`, W));
  lines.push(padLine(`${dateStr}`, `${timeStr}`, W));

  if (orderType && orderType.toLowerCase() === 'delivery' && customerName) {
    lines.push(padLine(`Name: ${customerName}`, customerPhone || '', W));
  }
  lines.push(THIN);

  lines.push('!!BOLD!!' + tableRow([
    { text: 'ITEM', align: 'LEFT', width: 0.52 },
    { text: 'QTY', align: 'CENTER', width: 0.13 },
    { text: 'PRICE', align: 'RIGHT', width: 0.35 },
  ], W));
  lines.push(THIN);

  items.forEach(item => {
    const name = (item.name || 'Item').substring(0, 18);
    const qty = String(item.quantity || 1);
    const price = String((item.price || 0) * (item.quantity || 1));
    lines.push(tableRow([
      { text: name, align: 'LEFT', width: 0.52 },
      { text: qty, align: 'CENTER', width: 0.13 },
      { text: price, align: 'RIGHT', width: 0.35 },
    ], W));

    if (item.items && item.items.length > 0) {
      item.items.forEach(di => {
        const subName = (di.item && di.item.name) ? di.item.name : 'Item';
        const subVariant = (di.variant || di.chosenVariant) ? ` [${di.variant || di.chosenVariant}]` : '';
        const subQty = (di.quantity || 1) * (item.quantity || 1);
        lines.push(`  - ${subQty}x ${subName}${subVariant}`);
      });
    }
  });

  lines.push(THIN);
  lines.push('!!BOLD!!' + padLine('TOTAL:', `Rs. ${totalAmount}`, W));
  lines.push(THIN);
  lines.push('');
  lines.push(center(footerNote, W));
  lines.push('');
  lines.push('');
  lines.push('');

  return lines;
};

const buildKOT = (printData, W = 36) => {
  const { type, items = [], orderType = '', tableNo = '', orderId = '', isAddon = false } = printData;
  const shortId = getShortOrderId(orderId);
  const kitchen = type === 'KOT_DESI' ? 'DESI KITCHEN' : 'FAST FOOD';
  const timeStr = new Date().toLocaleTimeString('en-PK', { hour12: true });
  const DIVIDER = '='.repeat(W);
  const THIN = '-'.repeat(W);

  const lines = [];

  lines.push('');
  if (isAddon) {
    lines.push('!!BIG!!' + center('** ADD-ON KOT **', W));
  } else {
    lines.push('!!BIG!!' + center('** KOT **', W));
  }
  lines.push('!!BOLD!!' + center(kitchen, W));
  lines.push(DIVIDER);

  lines.push(padLine(`Order #: ${shortId}`, `Type: ${orderType || 'Takeaway'}`, W));
  lines.push(`Time: ${timeStr}`);
  if (tableNo) lines.push(`Table No: ${tableNo}`);

  lines.push(DIVIDER);
  lines.push('ITEMS:');
  lines.push(THIN);

  items.forEach(item => {
    const isDeal = Array.isArray(item.items) && item.items.length > 0;
    if (isDeal) {
      item.items.forEach(di => {
        const name = (di.item && di.item.name) ? di.item.name : 'Item';
        const variant = (di.variant || di.chosenVariant) ? ` [${di.variant || di.chosenVariant}]` : '';
        const qty = (di.quantity || 1) * (item.quantity || 1);
        lines.push('!!BOLD!!' + `  [ ${qty} ]  ${name}${variant}`);
      });
      if (item.notes) lines.push(`         Note: ${item.notes}`);
    } else {
      const variant = item.variant ? ` [${item.variant}]` : '';
      lines.push('!!BOLD!!' + `  [ ${item.quantity || 1} ]  ${item.name || 'Item'}${variant}`);
      if (item.notes) lines.push(`         Note: ${item.notes}`);
    }
  });

  lines.push(DIVIDER);
  lines.push('');
  lines.push('');
  lines.push('');

  return lines;
};

export const triggerBrowserPrint = (printData, storeConfig = {}) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  const W = storeConfig.width || 36;
  const isKot = printData.type.startsWith('KOT');

  const lines = isKot 
    ? buildKOT(printData, W)
    : buildCustomerReceipt(printData, storeConfig, W);

  const parsedLinesHtml = lines.map(line => {
    let isBig = false;
    let isBold = false;
    let text = line;

    while (text.startsWith('!!BIG!!') || text.startsWith('!!BOLD!!') || text.startsWith('!!CENTER!!')) {
      if (text.startsWith('!!BIG!!')) {
        isBig = true;
        text = text.substring(7);
      } else if (text.startsWith('!!BOLD!!')) {
        isBold = true;
        text = text.substring(8);
      } else if (text.startsWith('!!CENTER!!')) {
        text = text.substring(10);
      }
    }

    let style = "white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.3;";
    if (isBig) {
      style += " font-size: 16px; font-weight: bold; text-align: center;";
    } else if (isBold) {
      style += " font-size: 12px; font-weight: bold;";
    } else {
      style += " font-size: 12px; font-weight: normal;";
    }

    return `<div style="${style}">${text}</div>`;
  }).join('');

  doc.write(`
    <html>
      <head>
        <title>Print</title>
        <style>
          @page {
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 5px;
            margin: 0;
            width: 80mm;
            color: #000;
            background: #fff;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        ${parsedLinesHtml}
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    document.body.removeChild(iframe);
  }, 500);
};
