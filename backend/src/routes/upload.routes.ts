import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.middleware';
import { uploadProfileImage } from '../controllers/upload.controller';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'profile-images');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const sanitizedExt = fileExt || '.png';
    cb(null, `${req.user?.userId || 'anonymous'}-${Date.now()}${sanitizedExt}`);
  }
});

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only PNG, JPG, JPEG, and WEBP files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

router.use(authenticate);

router.post('/profile-image', upload.single('image'), uploadProfileImage);

export default router;

