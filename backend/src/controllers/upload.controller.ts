import { Request, Response, Express } from 'express';

export const uploadProfileImage = async (req: Request, res: Response) => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get the backend base URL from environment or construct from request
    const backendUrl = process.env.BACKEND_URL || 
                      process.env.API_URL || 
                      (req.protocol + '://' + req.get('host'));
    
    // Return full URL for the uploaded image
    // Static files are served at /uploads, not /api/uploads
    const filePath = `${backendUrl}/uploads/profile-images/${file.filename}`;

    res.status(201).json({
      message: 'Profile image uploaded successfully',
      url: filePath
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ error: 'Error uploading profile image' });
  }
};

