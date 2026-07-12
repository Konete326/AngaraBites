const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Use memory storage — file goes to RAM, then we upload to cloudinary manually
const storage = multer.memoryStorage();
const upload = multer({ storage });

const fs = require('fs');
const path = require('path');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.warn('Could not create uploads directory locally:', err.message);
  }
}


// Helper: upload buffer to cloudinary
const uploadToCloudinary = (buffer, mimetype) => {
  return new Promise((resolve, reject) => {
    let completed = false;

    // Timeout after 4 seconds to fallback locally
    const timeoutId = setTimeout(() => {
      console.warn('Cloudinary upload timed out (4s limit), falling back to local storage.');
      fallbackLocal();
    }, 4000);

    const fallbackLocal = async () => {
      if (completed) return;
      completed = true;
      clearTimeout(timeoutId);
      try {
        const ext = mimetype.split('/')[1] || 'jpg';
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const localPath = path.join(uploadsDir, filename);
        await fs.promises.writeFile(localPath, buffer);
        console.log(`Fallback local file saved: ${localPath}`);
        resolve({ secure_url: `http://localhost:5000/uploads/${filename}` });
      } catch (err) {
        console.error('Local fallback save failed:', err);
        reject(err);
      }
    };

    const stream = cloudinary.uploader.upload_stream(
      { folder: 'admin-panel-items' },
      (error, result) => {
        if (completed) return;
        completed = true;
        clearTimeout(timeoutId);
        if (error) {
          console.warn('Cloudinary upload failed, falling back to local:', error.message);
          fallbackLocal();
        } else {
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });
};

module.exports = { upload, uploadToCloudinary };
