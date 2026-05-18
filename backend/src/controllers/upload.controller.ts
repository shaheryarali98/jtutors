import { Request, Response, Express } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const getFileExtension = (mimeType: string) => {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
    case 'image/jpg':
    default:
      return 'jpg';
  }
};

const saveToLocalUploads = async (file: Express.Multer.File, imageType: 'profile' | 'cover' = 'profile') => {
  const subDir = imageType === 'cover' ? 'cover-images' : 'profile-images';
  const uploadsDir = path.resolve(process.cwd(), 'uploads', subDir);
  await fs.mkdir(uploadsDir, { recursive: true });

  const extension = getFileExtension(file.mimetype);
  const prefix = imageType === 'cover' ? 'cover' : 'profile';
  const fileName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);

  await fs.writeFile(filePath, file.buffer);
  return `/uploads/${subDir}/${fileName}`;
};

export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    console.log('[UPLOAD] Request received. Headers:', req.headers)
    console.log('[UPLOAD] Multer file object:', (req as any).file)
    
    const file = (req as Request & { file?: Express.Multer.File }).file;
    console.log('[UPLOAD] Extracted file:', file?.fieldname, file?.originalname, file?.size, file?.mimetype)

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let url = '';

    if (hasCloudinaryConfig()) {
      try {
        url = await new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'jtutors/profile-images', resource_type: 'image' },
            (error, result) => {
              if (error || !result) return reject(error);
              resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        });
      } catch (cloudinaryError) {
        console.warn('Cloudinary upload failed, falling back to local storage:', cloudinaryError);
        url = await saveToLocalUploads(file, 'profile');
      }
    } else {
      url = await saveToLocalUploads(file, 'profile');
    }

    res.status(201).json({
      message: 'Profile image uploaded successfully',
      url,
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ error: 'Error uploading profile image' });
  }
};

export const uploadCoverImage = async (req: Request, res: Response) => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let url = '';

    if (hasCloudinaryConfig()) {
      try {
        url = await new Promise<string>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'jtutors/cover-images', resource_type: 'image' },
            (error, result) => {
              if (error || !result) return reject(error);
              resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        });
      } catch (cloudinaryError) {
        console.warn('Cloudinary upload failed, falling back to local storage:', cloudinaryError);
        url = await saveToLocalUploads(file, 'cover');
      }
    } else {
      url = await saveToLocalUploads(file, 'cover');
    }

    res.status(201).json({
      message: 'Cover image uploaded successfully',
      url,
    });
  } catch (error) {
    console.error('Upload cover image error:', error);
    res.status(500).json({ error: 'Error uploading cover image' });
  }
};

