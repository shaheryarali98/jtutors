import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateCourseInput {
  tutorId: string;
  title: string;
  description: string;
  price: number;
  schedule?: string;
  meetingLink?: string;
  meetingType?: string;
  maxStudents?: number;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  price?: number;
  schedule?: string;
  meetingLink?: string;
  meetingType?: string;
  maxStudents?: number;
  status?: string;
}

export const createCourse = async (input: CreateCourseInput) => {
  return prisma.course.create({
    data: {
      ...input,
      status: 'DRAFT',
    },
    include: {
      tutor: { select: { firstName: true, lastName: true, profileImage: true } },
      _count: { select: { enrollments: true } },
    },
  });
};

export const updateCourse = async (courseId: string, tutorId: string, input: UpdateCourseInput) => {
  const course = await prisma.course.findFirst({ where: { id: courseId, tutorId } });
  if (!course) return null;
  return prisma.course.update({
    where: { id: courseId },
    data: input,
    include: {
      tutor: { select: { firstName: true, lastName: true, profileImage: true } },
      _count: { select: { enrollments: true } },
    },
  });
};

export const deleteCourse = async (courseId: string, tutorId: string) => {
  const course = await prisma.course.findFirst({ where: { id: courseId, tutorId } });
  if (!course) return null;
  return prisma.course.delete({ where: { id: courseId } });
};

export const getTutorCourses = async (tutorId: string) => {
  return prisma.course.findMany({
    where: { tutorId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: true } },
      enrollments: {
        where: { status: 'PAID' },
        include: { student: { select: { firstName: true, lastName: true, profileImage: true } } },
      },
    },
  });
};

export const getPublishedCourses = async (filters?: { search?: string }) => {
  const where: any = { status: 'PUBLISHED' };
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { description: { contains: filters.search } },
    ];
  }
  return prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      tutor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          tagline: true,
          subjects: { include: { subject: { select: { name: true } } } },
        },
      },
      _count: { select: { enrollments: { where: { status: 'PAID' } } } },
    },
  });
};

export const getCourseById = async (courseId: string) => {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      tutor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          tagline: true,
          hourlyFee: true,
          subjects: { include: { subject: { select: { name: true } } } },
        },
      },
      _count: { select: { enrollments: { where: { status: 'PAID' } } } },
    },
  });
};
