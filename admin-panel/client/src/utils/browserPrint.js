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

  const {
    type,
    items = [],
    orderType = '',
    customerName = '',
    customerPhone = '',
    totalAmount = 0,
    isAddon = false,
    tableNo = '',
  } = printData;

  const storeName = storeConfig.storeName || 'ANGARA BITES';
  const storePhone = storeConfig.phone || '+92 3342471192';
  const footerNote = storeConfig.footerNote || 'Thank You! Please Visit Again.';

  const isKot = type.startsWith('KOT');
  const title = isKot ? (type === 'KOT_DESI' ? 'KOT - DESI KITCHEN' : 'KOT - FAST FOOD') : storeName;
  const subtitle = isKot ? 'Kitchen Order Ticket' : 'Order Receipt';

  const itemsHtml = items.map(item => {
    const isDeal = Array.isArray(item.items) && item.items.length > 0;
    let dealItemsHtml = '';
    if (isDeal) {
      dealItemsHtml = `<div style="padding-left: 15px; font-size: 11px; color: #555; margin-top: 2px;">
        ${item.items.map(di => {
          const name = di.item?.name || 'Item';
          const variant = (di.variant || di.chosenVariant) ? ` (${di.variant || di.chosenVariant})` : '';
          const qty = (di.quantity || 1) * (item.quantity || 1);
          return `<div>- ${qty}x ${name}${variant}</div>`;
        }).join('')}
      </div>`;
    }
    const variantText = item.variant ? ` (${item.variant})` : '';
    const priceText = !isKot ? `<span style="float: right;">Rs. ${(item.price * item.quantity).toFixed(2)}</span>` : '';
    return `<div style="margin-bottom: 8px; font-size: 13px;">
      <div style="font-weight: bold; display: inline-block;">${item.quantity}x ${item.name}${variantText}</div>
      ${priceText}
      ${dealItemsHtml}
    </div>`;
  }).join('');

  const receiptFooterHtml = !isKot ? `
    <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;" />
    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
      <span>Grand Total</span>
      <span style="float: right;">Rs. ${totalAmount.toFixed(2)}</span>
    </div>
    <p style="text-align: center; margin-top: 15px; font-size: 11px; font-weight: bold;">${footerNote}</p>
  ` : `
    <p style="text-align: center; margin-top: 15px; font-size: 11px;">Time: ${new Date().toLocaleTimeString()}</p>
  `;

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
            padding: 10px;
            margin: 0;
            width: 80mm;
            color: #000;
            background: #fff;
          }
          h2 { text-align: center; margin: 0 0 5px 0; font-size: 16px; font-weight: bold; }
          p { text-align: center; margin: 0 0 5px 0; font-size: 12px; }
          .order-type { 
            font-weight: bold; 
            font-size: 14px; 
            margin: 8px 0; 
            padding: 4px; 
            border: 1px solid #000; 
            text-align: center;
            text-transform: uppercase;
          }
          .customer-info {
            font-size: 12px;
            margin-bottom: 8px;
            text-align: center;
          }
          hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <p>${subtitle}</p>
        ${isAddon ? '<p style="font-weight: bold; font-size: 13px; text-align: center;">** ADD-ON KOT **</p>' : ''}
        ${tableNo ? `<p style="font-weight: bold; font-size: 13px; text-align: center;">Table: ${tableNo}</p>` : ''}
        <div class="order-type">${orderType}</div>
        ${(customerName || customerPhone) ? `
          <div class="customer-info">
            ${customerName ? `<div>Name: ${customerName}</div>` : ''}
            ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ''}
          </div>
        ` : ''}
        ${!isKot && storePhone ? `<p style="font-size: 11px;">Phone: ${storePhone}</p>` : ''}
        <hr />
        <div style="margin-top: 10px;">
          ${itemsHtml}
        </div>
        ${receiptFooterHtml}
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
