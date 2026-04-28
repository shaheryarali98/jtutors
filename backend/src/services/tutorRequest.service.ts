import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateTutorRequestInput {
  studentId: string;
  title: string;
  description: string;
  subject?: string;
  grade?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredSchedule?: string;
  sessionType?: string;
}

/**
 * Create a tutor request post
 */
export const createTutorRequest = async (data: CreateTutorRequestInput) => {
  return prisma.tutorRequest.create({ data });
};

/**
 * Get all open tutor requests (for tutors to browse)
 */
export const getOpenTutorRequests = async (filters: {
  subject?: string;
  grade?: string;
  sessionType?: string;
}) => {
  const where: any = { status: 'OPEN' };

  if (filters.subject) {
    where.subject = { contains: filters.subject };
  }
  if (filters.grade) {
    where.grade = filters.grade;
  }
  if (filters.sessionType) {
    where.sessionType = filters.sessionType;
  }

  return prisma.tutorRequest.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          city: true,
          state: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Get tutor requests by a specific student
 */
export const getStudentTutorRequests = async (studentId: string) => {
  return prisma.tutorRequest.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Update a tutor request
 */
export const updateTutorRequest = async (
  id: string,
  studentId: string,
  data: Partial<CreateTutorRequestInput> & { status?: string }
) => {
  // Verify ownership
  const request = await prisma.tutorRequest.findUnique({ where: { id } });
  if (!request) throw new Error('Tutor request not found');
  if (request.studentId !== studentId) throw new Error('Not authorized');

  return prisma.tutorRequest.update({
    where: { id },
    data,
  });
};

/**
 * Delete a tutor request
 */
export const deleteTutorRequest = async (id: string, studentId: string) => {
  const request = await prisma.tutorRequest.findUnique({ where: { id } });
  if (!request) throw new Error('Tutor request not found');
  if (request.studentId !== studentId) throw new Error('Not authorized');

  return prisma.tutorRequest.delete({ where: { id } });
};
