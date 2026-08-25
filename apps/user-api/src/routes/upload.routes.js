import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authGuard } from '../middleware/authGuard.js';
import { apiSuccess } from '@whatsapp-saas/shared-utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${cleanName}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

const router = Router();

router.use(authGuard);

router.post('/', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded');
      err.statusCode = 400;
      throw err;
    }

    const host = req.get('host') || 'localhost:5001';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const relativeUrl = `/uploads/${req.file.filename}`;
    const fullUrl = `${protocol}://${host}${relativeUrl}`;

    // Determine media category
    let mediaType = 'DOCUMENT';
    if (req.file.mimetype.startsWith('image/')) {
      mediaType = 'IMAGE';
    } else if (req.file.mimetype.startsWith('video/')) {
      mediaType = 'VIDEO';
    } else if (req.file.mimetype.startsWith('audio/')) {
      mediaType = 'AUDIO';
    }

    res.status(200).json(
      apiSuccess({
        url: fullUrl,
        relativeUrl,
        filename: req.file.originalname,
        storedFilename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        mediaType
      }, 'File uploaded successfully')
    );
  } catch (error) {
    next(error);
  }
});

export default router;
