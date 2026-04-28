import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as tutorRequestService from '../services/tutorRequest.service';

const prisma = new PrismaClient();

/**
 * Create a tutor request (Student only)
 */
export const createRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const { title, description, subject, grade, budgetMin, budgetMax, preferredSchedule, sessionType } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const request = await tutorRequestService.createTutorRequest({
      studentId: student.id,
      title,
      description,
      subject,
      grade,
      budgetMin: budgetMin ? parseFloat(budgetMin) : undefined,
      budgetMax: budgetMax ? parseFloat(budgetMax) : undefined,
      preferredSchedule,
      sessionType,
    });

    res.status(201).json(request);
  } catch (error: any) {
    console.error('Error creating tutor request:', error);
    res.status(500).json({ error: error.message || 'Failed to create tutor request' });
  }
};

/**
 * Get all open tutor requests (for tutors to browse)
 */
export const getOpenRequests = async (req: Request, res: Response) => {
  try {
    const { subject, grade, sessionType } = req.query;
    const requests = await tutorRequestService.getOpenTutorRequests({
      subject: subject as string,
      grade: grade as string,
      sessionType: sessionType as string,
    });
    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching open tutor requests:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tutor requests' });
  }
};

/**
 * Get my tutor requests (Student)
 */
export const getMyRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const requests = await tutorRequestService.getStudentTutorRequests(student.id);
    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching my tutor requests:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tutor requests' });
  }
};

/**
 * Update a tutor request (Student only)
 */
export const updateRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const request = await tutorRequestService.updateTutorRequest(id, student.id, req.body);
    res.json(request);
  } catch (error: any) {
    console.error('Error updating tutor request:', error);
    if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
    if (error.message === 'Tutor request not found') return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message || 'Failed to update tutor request' });
  }
};

/**
 * Delete a tutor request (Student only)
 */
export const deleteRequest = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { userId } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    await tutorRequestService.deleteTutorRequest(id, student.id);
    res.json({ message: 'Tutor request deleted' });
  } catch (error: any) {
    console.error('Error deleting tutor request:', error);
    if (error.message === 'Not authorized') return res.status(403).json({ error: error.message });
    if (error.message === 'Tutor request not found') return res.status(404).json({ error: error.message });
    res.status(500).json({ error: error.message || 'Failed to delete tutor request' });
  }
};
