import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createCourse,
  updateCourse,
  deleteCourse,
  getTutorCourses,
  getPublishedCourses,
  getCourseById,
} from '../services/course.service';

const prisma = new PrismaClient();

// ── Tutor: create course ─────────────────────────────────────────────────────
export const createCourseController = async (req: Request, res: Response) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  const tutor = await prisma.tutor.findUnique({ where: { userId: currentUser.userId } });
  if (!tutor) return res.status(404).json({ error: 'Tutor profile not found' });

  const { title, description, price, schedule, meetingLink, meetingType, maxStudents } = req.body;
  if (!title || !description || price === undefined) {
    return res.status(400).json({ error: 'title, description, and price are required' });
  }

  const course = await createCourse({
    tutorId: tutor.id,
    title,
    description,
    price: parseFloat(price),
    schedule,
    meetingLink,
    meetingType,
    maxStudents: maxStudents ? parseInt(maxStudents) : undefined,
  });

  res.status(201).json({ course });
};

// ── Tutor: update course ─────────────────────────────────────────────────────
export const updateCourseController = async (req: Request, res: Response) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  const tutor = await prisma.tutor.findUnique({ where: { userId: currentUser.userId } });
  if (!tutor) return res.status(404).json({ error: 'Tutor profile not found' });

  const course = await updateCourse(req.params.id, tutor.id, req.body);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  res.json({ course });
};

// ── Tutor: delete course ─────────────────────────────────────────────────────
export const deleteCourseController = async (req: Request, res: Response) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  const tutor = await prisma.tutor.findUnique({ where: { userId: currentUser.userId } });
  if (!tutor) return res.status(404).json({ error: 'Tutor profile not found' });

  const deleted = await deleteCourse(req.params.id, tutor.id);
  if (!deleted) return res.status(404).json({ error: 'Course not found' });

  res.json({ success: true });
};

// ── Tutor: list own courses ──────────────────────────────────────────────────
export const getTutorCoursesController = async (req: Request, res: Response) => {
  const currentUser = req.user;
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  const tutor = await prisma.tutor.findUnique({ where: { userId: currentUser.userId } });
  if (!tutor) return res.status(404).json({ error: 'Tutor profile not found' });

  const courses = await getTutorCourses(tutor.id);
  res.json({ courses });
};

// ── Public / Student: browse published courses ───────────────────────────────
export const getPublishedCoursesController = async (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const courses = await getPublishedCourses({ search });
  res.json({ courses });
};

// ── Public: single course ────────────────────────────────────────────────────
export const getCourseByIdController = async (req: Request, res: Response) => {
  const course = await getCourseById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json({ course });
};
