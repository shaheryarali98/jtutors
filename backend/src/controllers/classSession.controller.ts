import { Request, Response } from 'express';
import {
  createClassSession,
  completeClassSession,
  approveClassSession,
  getClassSession,
  getClassSessionsByUser,
  getAllClassSessions,
} from '../services/classSession.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createClassSessionController = async (req: Request, res: Response) => {
  try {
    const { bookingId, className } = req.body;

    const classSession = await createClassSession({ bookingId, className });

    res.json({ classSession, message: 'Class session created successfully' });
  } catch (error: any) {
    console.error('Create class session error:', error);
    res.status(500).json({ error: error.message || 'Error creating class session' });
  }
};

export const completeClassSessionController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes, actualHoursTaught } = req.body;
    const userId = (req as any).userId;

    // Get tutor profile
    const tutor = await prisma.tutor.findUnique({
      where: { userId },
    });

    if (!tutor) {
      return res.status(403).json({ error: 'Tutor profile not found' });
    }

    const classSession = await completeClassSession(id, tutor.id, notes, actualHoursTaught);

    res.json({ 
      classSession, 
      message: 'Class session completed successfully. Payment will be released automatically if payment is confirmed.' 
    });
  } catch (error: any) {
    console.error('Complete class session error:', error);
    res.status(500).json({ error: error.message || 'Error completing class session' });
  }
};

export const approveClassSessionController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = (req as any).userId;

    const classSession = await approveClassSession(id, adminId, notes);

    res.json({ classSession, message: 'Class session approved successfully' });
  } catch (error: any) {
    console.error('Approve class session error:', error);
    res.status(500).json({ error: error.message || 'Error approving class session' });
  }
};

export const getClassSessionController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const classSession = await getClassSession(id);

    if (!classSession) {
      return res.status(404).json({ error: 'Class session not found' });
    }

    res.json({ classSession });
  } catch (error: any) {
    console.error('Get class session error:', error);
    res.status(500).json({ error: error.message || 'Error fetching class session' });
  }
};

export const getMyClassSessionsController = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const userRole = (req as any).role as 'STUDENT' | 'TUTOR';

    if (userRole !== 'STUDENT' && userRole !== 'TUTOR') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const classSessions = await getClassSessionsByUser(userId, userRole);

    res.json({ classSessions });
  } catch (error: any) {
    console.error('Get my class sessions error:', error);
    res.status(500).json({ error: error.message || 'Error fetching class sessions' });
  }
};

export const getAllClassSessionsController = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const classSessions = await getAllClassSessions(status as string | undefined);

    res.json({ classSessions });
  } catch (error: any) {
    console.error('Get all class sessions error:', error);
    res.status(500).json({ error: error.message || 'Error fetching class sessions' });
  }
};

export const releasePaymentController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { releasePaymentToTutor } = await import('../services/paymentRelease.service');
    const result = await releasePaymentToTutor(id);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to release payment' });
    }

    res.json({ 
      message: 'Payment released successfully', 
      transferId: result.transferId 
    });
  } catch (error: any) {
    console.error('Release payment error:', error);
    res.status(500).json({ error: error.message || 'Error releasing payment' });
  }
};

