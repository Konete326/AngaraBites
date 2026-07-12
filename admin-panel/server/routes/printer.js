const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const http = require('http');
const https = require('https');
const { upload, uploadToCloudinary } = require('../middleware/cloudinary');
const Setting = require('../models/Setting');

const USER_DATA_DIR = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'Angara') 
    : path.join(os.homedir(), '.angara');

if (!fs.existsSync(USER_DATA_DIR)) {
    try {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    } catch (e) {
        console.error(e);
    }
}

const PRINTER_CONFIG_FILE = path.join(USER_DATA_DIR, 'printer_config.json');

function getPrinterConfig() {
    try {
        if (fs.existsSync(PRINTER_CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(PRINTER_CONFIG_FILE, 'utf8'));
        }
    } catch (e) {
        console.error(e);
    }
    return {
        type: 'auto',
        name: '',
        host: '',
        port: 9100,
        width: 36
    };
}

const CACHE_TTL_MS = 5 * 60 * 1000;

const printerState = {
    name: null,
    type: 'windows',
    host: null,
    port: null,
    manualOverride: false,
    lastDetectedAt: null,
};

function pad(str, len, align = 'LEFT') {
    const s = String(str || '').substring(0, len);
    if (align === 'RIGHT')  return s.padStart(len);
    if (align === 'CENTER') return s.padStart(Math.floor((len + s.length) / 2)).padEnd(len);
    return s.padEnd(len);
}

function center(str, W) {
    return '!!CENTER!!' + pad(str, W, 'CENTER');
}

function tableRow(cols, W) {
    const widths = cols.map(c => Math.floor(c.width * W));
    return cols.map((c, i) => pad(c.text, widths[i], c.align)).join('');
}

function padLine(left, right, W) {
    const space = W - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right;
}

async function getDefaultPrinter() {
    const { stdout } = await execAsync('wmic printer where Default=TRUE get Name /value');
    const match = stdout.match(/Name=(.+)/);
    return match ? match[1].trim().replace(/\r/g, '') : null;
}

async function resolveActivePrinter() {
    if (printerState.manualOverride) return printerState;

    const saved = getPrinterConfig();
    if (saved && saved.type !== 'auto') {
        printerState.type = saved.type;
        printerState.name = saved.type === 'tcp' ? `${saved.host}:${saved.port}` : saved.name;
        printerState.host = saved.host;
        printerState.port = saved.port;
        printerState.manualOverride = true;
        printerState.lastDetectedAt = Date.now();
        return printerState;
    }

    const now = Date.now();
    const expired = !printerState.lastDetectedAt || (now - printerState.lastDetectedAt > CACHE_TTL_MS);
    if (expired) {
        const name = await getDefaultPrinter();
        printerState.name = name;
        printerState.type = 'windows';
        printerState.host = null;
        printerState.port = null;
        printerState.lastDetectedAt = now;
        if (name) console.log(`[Printer] Auto-detected: ${name}`);
    }
    return printerState;
}

const LOGO_PATH = path.join(USER_DATA_DIR, 'printlogo.jpeg');
const DEFAULT_LOGO_PATH = path.join(__dirname, '..', 'default_printlogo.jpeg');

async function sendViaDrawPrinter(printerName, lines, showLogo) {
    const escaped     = printerName.replace(/'/g, "''");
    const tmpJson     = path.join(os.tmpdir(), `receipt_${Date.now()}.json`);
    const escapedJson = tmpJson.replace(/\\/g, '\\\\');
    const activeLogo  = fs.existsSync(LOGO_PATH) ? LOGO_PATH : (fs.existsSync(DEFAULT_LOGO_PATH) ? DEFAULT_LOGO_PATH : null);
    const logoExists  = showLogo && !!activeLogo;
    const escapedLogo = activeLogo ? activeLogo.replace(/\\/g, '\\\\').replace(/'/g, "''") : '';

    fs.writeFileSync(tmpJson, JSON.stringify(lines), 'utf8');

    const psScript = `
Add-Type -AssemblyName System.Drawing

$lines    = [System.IO.File]::ReadAllText('${escapedJson}') | ConvertFrom-Json
$font     = New-Object System.Drawing.Font('Courier New', 8,  [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Point)
$boldFont = New-Object System.Drawing.Font('Courier New', 9,  [System.Drawing.FontStyle]::Bold,    [System.Drawing.GraphicsUnit]::Point)
$bigFont  = New-Object System.Drawing.Font('Courier New', 11, [System.Drawing.FontStyle]::Bold,    [System.Drawing.GraphicsUnit]::Point)
$brush    = [System.Drawing.Brushes]::Black

$script:lineIdx   = 0
$script:allLines  = $lines
$script:logoDrawn = $false

$doc = New-Object System.Drawing.Printing.PrintDocument
$doc.PrinterSettings.PrinterName = '${escaped}'
$doc.DefaultPageSettings.PaperSize = New-Object System.Drawing.Printing.PaperSize('80mm Roll', 315, 30000)
$doc.DefaultPageSettings.Margins   = New-Object System.Drawing.Printing.Margins(0, 45, 6, 6)

$doc.add_PrintPage({
    param($s, $e)
    $g    = $e.Graphics
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $x    = [float]$e.MarginBounds.Left
    $y    = [float]$e.MarginBounds.Top
    $maxY = [float]$e.MarginBounds.Bottom
    $pw   = [float]$e.MarginBounds.Width
    if ($pw -le 0) { $pw = 270 }

    if (-not $script:logoDrawn) {
        $script:logoDrawn = $true
        ${logoExists ? `
        try {
            $logo   = [System.Drawing.Image]::FromFile('${escapedLogo}')
            $aspect = [float]$logo.Width / [float]$logo.Height
            $imgW   = [float]$pw
            $imgH   = [float]($imgW / $aspect)
            if ($imgH -gt 120) { $imgH = 120; $imgW = $imgH * $aspect }
            $imgX   = $x + ($pw - $imgW) / 2
            $g.DrawImage($logo, $imgX, $y, $imgW, $imgH)
            $y += $imgH + 4
            $logo.Dispose()
        } catch {}` : ''}
    }

    while ($script:lineIdx -lt $script:allLines.Count) {
        $raw     = $script:allLines[$script:lineIdx]

        # Parse ALL leading style tags (BIG / BOLD / RIGHT / CENTER can appear together, in any order)
        $text    = $raw
        $isBig   = $false
        $isBold  = $false
        $isRight = $false
        $isCenter = $false
        while ($text -match '^!!(BIG|BOLD|RIGHT|CENTER)!!') {
            switch ($matches[1]) {
                'BIG'    { $isBig   = $true }
                'BOLD'   { $isBold  = $true }
                'RIGHT'  { $isRight = $true }
                'CENTER' { $isCenter = $true }
            }
            $text = $text -replace '^!!(BIG|BOLD|RIGHT|CENTER)!!', ''
        }

        $useFont = if ($isBig) { $bigFont } elseif ($isBold) { $boldFont } else { $font }
        $lineH   = $useFont.GetHeight($g) + 1

        if ($y + $lineH -gt $maxY) {
            $e.HasMorePages = $true
            return
        }
        if ($isRight) {
            $tw = $g.MeasureString($text, $useFont).Width
            $g.DrawString($text, $useFont, $brush, ($x + $pw - $tw), $y)
        } elseif ($isCenter) {
            $cleanText = $text.Trim()
            $tw = $g.MeasureString($cleanText, $useFont).Width
            $g.DrawString($cleanText, $useFont, $brush, ($x + ($pw - $tw) / 2), $y)
        } else {
            $g.DrawString($text, $useFont, $brush, $x, $y)
        }
        $y += $lineH
        $script:lineIdx++
    }
    $e.HasMorePages = $false
})

$doc.Print()
$font.Dispose()
$boldFont.Dispose()
$bigFont.Dispose()
Write-Host 'PRINT_DONE'
Remove-Item '${escapedJson}' -Force -ErrorAction SilentlyContinue
`;

    const psFile = path.join(os.tmpdir(), `print_${Date.now()}.ps1`);
    fs.writeFileSync(psFile, psScript, 'utf8');
    try {
        const { stderr } = await execAsync(
            `powershell -ExecutionPolicy Bypass -NonInteractive -File "${psFile}"`
        );
        if (stderr && stderr.trim()) console.warn('[Printer] PS stderr:', stderr.trim());
    } catch (err) {
        throw new Error(err.stderr || err.stdout || err.message);
    } finally {
        try { fs.unlinkSync(psFile); } catch {}
        try { fs.unlinkSync(tmpJson); } catch {}
    }
}


const LOGO_BIN_PATH = path.join(os.tmpdir(), 'printlogo_escpos.bin');
let cachedEscPosLogoBuffer = null;

async function getEscPosLogoBuffer() {
    if (cachedEscPosLogoBuffer) return cachedEscPosLogoBuffer;

    const activeLogo = fs.existsSync(LOGO_PATH) ? LOGO_PATH : (fs.existsSync(DEFAULT_LOGO_PATH) ? DEFAULT_LOGO_PATH : null);
    if (!activeLogo) {
        return null;
    }

    const escapedLogo = activeLogo.replace(/\\/g, '\\\\').replace(/'/g, "''");
    const escapedBin  = LOGO_BIN_PATH.replace(/\\/g, '\\\\').replace(/'/g, "''");

    const psScript = `
Add-Type -AssemblyName System.Drawing
try {
    $image = [System.Drawing.Image]::FromFile('${escapedLogo}')
    $targetWidth = 384
    $targetHeight = [int]($image.Height * ($targetWidth / $image.Width))
    $bmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.DrawImage($image, 0, 0, $targetWidth, $targetHeight)
    $image.Dispose()
    $g.Dispose()

    $xL = [int]($targetWidth / 8) % 256
    $xH = [math]::Floor(($targetWidth / 8) / 256)
    $yL = $targetHeight % 256
    $yH = [math]::Floor($targetHeight / 256)

    $bytes = New-Object System.Collections.Generic.List[byte]
    $bytes.Add(27)
    $bytes.Add(51)
    $bytes.Add(0)

    $bytes.Add(29)
    $bytes.Add(118)
    $bytes.Add(48)
    $bytes.Add(0)
    $bytes.Add($xL)
    $bytes.Add($xH)
    $bytes.Add($yL)
    $bytes.Add($yH)

    for ($y = 0; $y -lt $targetHeight; $y++) {
        for ($xByte = 0; $xByte -lt ($targetWidth / 8); $xByte++) {
            $b = 0
            for ($bit = 0; $bit -lt 8; $bit++) {
                $px = $xByte * 8 + $bit
                $col = $bmp.GetPixel($px, $y)
                $brightness = ($col.R + $col.G + $col.B) / 3
                if ($brightness -lt 160) {
                    $b = $b -bor (1 -shl (7 - $bit))
                }
            }
            $bytes.Add($b)
        }
    }
    
    $bytes.Add(10)
    $bytes.Add(27)
    $bytes.Add(50)

    $bmp.Dispose()
    [System.IO.File]::WriteAllBytes('${escapedBin}', $bytes.ToArray())
} catch {
    Write-Error $_.Exception.Message
}
`;

    const psFile = path.join(os.tmpdir(), `conv_${Date.now()}.ps1`);
    fs.writeFileSync(psFile, psScript, 'utf8');

    try {
        await execAsync(`powershell -ExecutionPolicy Bypass -NonInteractive -File "${psFile}"`);
        if (fs.existsSync(LOGO_BIN_PATH)) {
            cachedEscPosLogoBuffer = fs.readFileSync(LOGO_BIN_PATH);
            try { fs.unlinkSync(LOGO_BIN_PATH); } catch {}
        }
    } catch (err) {
        console.error('[Printer] Error converting logo for TCP:', err.message);
    } finally {
        try { fs.unlinkSync(psFile); } catch {}
    }

    return cachedEscPosLogoBuffer;
}

async function sendViaTCP(host, port, lines, showLogo) {
    const socket = new net.Socket();
    const ESC = 0x1b;
    const GS  = 0x1d;

    let logoBuffer = null;
    if (showLogo) {
        logoBuffer = await getEscPosLogoBuffer();
    }

    const cleanLines = lines.map(l => l.replace(/^(?:!!(?:BOLD|BIG|RIGHT|CENTER)!!)+/, ''));
    const textBuffer = Buffer.from(cleanLines.join('\n') + '\n', 'utf8');

    const parts = [];
    parts.push(Buffer.from([ESC, 0x40]));

    if (logoBuffer) {
        parts.push(logoBuffer);
    }

    parts.push(textBuffer);
    parts.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
    const data = Buffer.concat(parts);

    return new Promise((resolve, reject) => {
        socket.setTimeout(5000);
        socket.connect(port, host, () => { socket.write(data, () => socket.end()); });
        socket.on('close', () => resolve());
        socket.on('timeout', () => { socket.destroy(); reject(new Error(`TCP timeout ${host}:${port}`)); });
        socket.on('error', reject);
    });
}

async function sendToPrinter(state, lines, showLogo) {
    if (state.type === 'tcp') {
        await sendViaTCP(state.host, state.port, lines, showLogo);
    } else {
        await sendViaDrawPrinter(state.name, lines, showLogo);
    }
}

const CONFIG_FILE = path.join(__dirname, '..', 'store_config.json');

async function getStoreConfig() {
    try {
        let setting = await Setting.findOne();
        if (!setting) {
            setting = await Setting.create({
                storeName: 'Angaara Bites',
                phone: '+92 3342471192',
                footerNote: 'Thank You! Please Visit Again.',
                logoUrl: ''
            });
        }
        return setting;
    } catch (e) {
        console.error(e);
        return {
            storeName: 'Angaara Bites',
            phone: '+92 3342471192',
            footerNote: 'Thank You! Please Visit Again.',
            logoUrl: ''
        };
    }
}

function getShortOrderId(orderId) {
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
}

async function buildCustomerReceipt({ items, orderType, customerName, customerPhone, totalAmount, orderId, overrideStore, W = 36 }) {
    const store = overrideStore || await getStoreConfig();
    const shortId = getShortOrderId(orderId);
    const now     = new Date();
    const dateStr = now.toLocaleDateString('en-PK');
    const timeStr = now.toLocaleTimeString('en-PK', { hour12: true });
    const THIN    = '-'.repeat(W);

    const lines = [];

    lines.push('!!BOLD!!' + center(store.storeName, W));
    lines.push(center('Ph: ' + store.phone, W));
    lines.push(THIN);

    lines.push(padLine(`Order: ${shortId}`, `Type: ${orderType || 'Takeaway'}`, W));
    lines.push(padLine(`${dateStr}`, `${timeStr}`, W));

    if (orderType && orderType.toLowerCase() === 'delivery' && customerName) {
        lines.push(padLine(`Name: ${customerName}`, customerPhone || '', W));
    }
    lines.push(THIN);

    lines.push('!!BOLD!!' + tableRow([
        { text: 'ITEM',  align: 'LEFT',   width: 0.52 },
        { text: 'QTY',   align: 'CENTER', width: 0.13 },
        { text: 'PRICE', align: 'RIGHT',  width: 0.35 },
    ], W));
    lines.push(THIN);

    items.forEach(item => {
        const name  = (item.name  || 'Item').substring(0, 18);
        const qty   = String(item.quantity || 1);
        const price = String((item.price || 0) * (item.quantity || 1));
        lines.push(tableRow([
            { text: name,  align: 'LEFT',   width: 0.52 },
            { text: qty,   align: 'CENTER', width: 0.13 },
            { text: price, align: 'RIGHT',  width: 0.35 },
        ], W));
    });

    lines.push(THIN);
    lines.push('!!BOLD!!' + padLine('TOTAL:', `Rs. ${totalAmount}`, W));
    lines.push(THIN);
    lines.push('');
    lines.push(center(store.footerNote, W));
    lines.push('');
    lines.push('');
    lines.push('');

    return lines;
}

function buildKOT({ type, items, orderType, tableNo, orderId, isAddon, W = 36 }) {
    const shortId = getShortOrderId(orderId);
    const kitchen = type === 'KOT_DESI' ? 'DESI KITCHEN' : 'FAST FOOD';
    const timeStr = new Date().toLocaleTimeString('en-PK', { hour12: true });
    const DIVIDER = '='.repeat(W);
    const THIN    = '-'.repeat(W);

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
                const name    = (di.item && di.item.name) ? di.item.name : 'Item';
                const variant = (di.variant || di.chosenVariant) ? ` [${di.variant || di.chosenVariant}]` : '';
                const qty     = (di.quantity || 1) * (item.quantity || 1);
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
}

router.post('/config', (req, res) => {
    const { type, name, host, port, width } = req.body;
    const config = {
        type,
        name: name || '',
        host: host || '',
        port: port ? parseInt(port, 10) : 9100,
        width: width ? parseInt(width, 10) : 36
    };

    try {
        fs.writeFileSync(PRINTER_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

        printerState.type = config.type;
        printerState.name = config.type === 'tcp' ? `${config.host}:${config.port}` : config.name;
        printerState.host = config.host;
        printerState.port = config.port;
        printerState.manualOverride = config.type !== 'auto';
        printerState.lastDetectedAt = Date.now();

        res.json({ message: 'Printer configuration saved successfully', printer: printerState.name, width: config.width });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/status', async (req, res) => {
    const state = await resolveActivePrinter();
    const saved = getPrinterConfig();
    res.json({
        printer: state.name || null,
        type: state.type,
        width: saved.width || 36,
        manualOverride: state.manualOverride,
        lastDetectedAt: state.lastDetectedAt ? new Date(state.lastDetectedAt).toISOString() : null,
        cacheExpiresIn: state.manualOverride || !state.lastDetectedAt
            ? null
            : Math.max(0, Math.round((CACHE_TTL_MS - (Date.now() - state.lastDetectedAt)) / 1000)) + 's',
    });
});

router.post('/', async (req, res) => {
    try {
        const { type, items, orderType, customerName, customerPhone, totalAmount, tableNo, orderId, isAddon } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items to print' });
        }

        const state = await resolveActivePrinter();

        if (!state.name) {
            return res.json({ message: 'Simulated print (No printer found)', type });
        }

        const saved = getPrinterConfig();
        const W = saved.width || 36;

        let lines;
        if (type === 'CUSTOMER_RECEIPT') {
            lines = await buildCustomerReceipt({ items, orderType, customerName, customerPhone, totalAmount, orderId, W });
        } else if (type === 'KOT_DESI' || type === 'KOT_FASTFOOD') {
            lines = buildKOT({ type, items, orderType, tableNo, orderId, isAddon, W });
        } else {
            return res.status(400).json({ message: `Unknown print type: ${type}` });
        }

        const showLogo = type === 'CUSTOMER_RECEIPT';

        await sendToPrinter(state, lines, showLogo);
        console.log(`[Printer] Printed on: ${state.name}`);
        res.json({ message: 'Printed successfully', type, printer: state.name });
    } catch (err) {
        console.error('[Printer] ERROR:', err.message);
        res.json({ message: 'Simulated print (Printer error)', error: err.message, type: req.body.type });
    }
});

router.get('/store-config', async (req, res) => {
    const config = await getStoreConfig();
    const configObj = config.toObject ? config.toObject() : { ...config };
    const host = req.get('host') || '127.0.0.1:5000';
    const activeLogo = fs.existsSync(LOGO_PATH) ? LOGO_PATH : (fs.existsSync(DEFAULT_LOGO_PATH) ? DEFAULT_LOGO_PATH : null);
    if (activeLogo) {
        configObj.logoUrl = `http://${host}/api/print/logo-image`;
    } else {
        configObj.logoUrl = '';
    }
    res.json(configObj);
});

router.post('/store-config', async (req, res) => {
    const { storeName, phone, footerNote } = req.body;
    try {
        let setting = await Setting.findOne();
        if (setting) {
            setting.storeName = storeName || 'Angaara Bites';
            setting.phone = phone || '+92 3342471192';
            setting.footerNote = footerNote || 'Thank You! Please Visit Again.';
            await setting.save();
        } else {
            setting = await Setting.create({
                storeName: storeName || 'Angaara Bites',
                phone: phone || '+92 3342471192',
                footerNote: footerNote || 'Thank You! Please Visit Again.',
                logoUrl: ''
            });
        }
        res.json({ message: 'Store config saved successfully', config: setting });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(destPath);
        proto.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

router.post('/logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        fs.writeFileSync(LOGO_PATH, req.file.buffer);
        cachedEscPosLogoBuffer = null;

        const host = req.get('host') || '127.0.0.1:5000';
        let logoUrl = `http://${host}/api/print/logo-image`;

        try {
            await uploadToCloudinary(req.file.buffer, req.file.mimetype);
        } catch (cloudinaryErr) {
            console.warn(cloudinaryErr.message);
        }

        let setting = await Setting.findOne();
        if (setting) {
            setting.logoUrl = logoUrl;
            await setting.save();
        } else {
            setting = await Setting.create({ logoUrl });
        }

        res.json({ message: 'Logo uploaded successfully', logoUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

router.get('/logo-image', (req, res) => {
    const activeLogo = fs.existsSync(LOGO_PATH) ? LOGO_PATH : (fs.existsSync(DEFAULT_LOGO_PATH) ? DEFAULT_LOGO_PATH : null);
    if (activeLogo) {
        res.sendFile(activeLogo);
    } else {
        res.status(404).json({ message: 'Logo not found' });
    }
});

router.delete('/logo', async (req, res) => {
    try {
        let setting = await Setting.findOne();
        if (setting) {
            setting.logoUrl = '';
            await setting.save();
        }
        
        if (fs.existsSync(LOGO_PATH)) {
            fs.unlinkSync(LOGO_PATH);
        }
        cachedEscPosLogoBuffer = null;
        
        res.json({ message: 'Logo deleted successfully' });
    } catch (err) {
        console.error('[Printer] Logo delete error:', err.message);
        res.status(500).json({ message: err.message });
    }
});

router.get('/preview', async (req, res) => {
    const { type, storeName, phone, footerNote, width } = req.query;
    let lines = [];
    const mockItems = [
        { name: 'Chicken Karahi', quantity: 2, price: 950 },
        { name: 'Roti (Nan)', quantity: 4, price: 25 },
        { name: 'Coke (Litre)', quantity: 1, price: 150 }
    ];

    const overrideStore = (storeName || phone || footerNote) ? {
        storeName: storeName || 'Angaara Bites',
        phone: phone || '+92 3342471192',
        footerNote: footerNote || 'Thank You! Please Visit Again.'
    } : null;

    const saved = getPrinterConfig();
    const W = width ? parseInt(width, 10) : (saved.width || 36);

    if (type === 'CUSTOMER_RECEIPT_SIMPLE') {
        lines = await buildCustomerReceipt({
            items: mockItems,
            orderType: 'Takeaway',
            customerName: '',
            customerPhone: '',
            totalAmount: 2075,
            orderId: '507f1f77bcf86cd799439011',
            overrideStore,
            W
        });
    } else if (type === 'CUSTOMER_RECEIPT_DELIVERY') {
        lines = await buildCustomerReceipt({
            items: mockItems,
            orderType: 'Delivery',
            customerName: 'Ahmad Khan',
            customerPhone: '0300-1234567',
            totalAmount: 2075,
            orderId: '507f1f77bcf86cd799439011',
            overrideStore,
            W
        });
    } else if (type === 'KOT_DESI') {
        lines = buildKOT({
            type: 'KOT_DESI',
            items: [
                { name: 'Chicken Karahi', quantity: 2 },
                { name: 'Roti (Nan)', quantity: 4 }
            ],
            orderType: 'Dine-in',
            tableNo: 'Table 5',
            orderId: '507f1f77bcf86cd799439011',
            isAddon: false,
            W
        });
    } else if (type === 'KOT_FASTFOOD') {
        lines = buildKOT({
            type: 'KOT_FASTFOOD',
            items: [
                { name: 'Coke (Litre)', quantity: 1 }
            ],
            orderType: 'Dine-in',
            tableNo: 'Table 5',
            orderId: '507f1f77bcf86cd799439011',
            isAddon: false,
            W
        });
    } else {
        return res.status(400).json({ message: 'Invalid preview type' });
    }
    res.json({ lines, width: W });
});

module.exports = router;
