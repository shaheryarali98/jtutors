import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAdminSettings, updateAdminSettings } from '../services/settings.service';

const prisma = new PrismaClient();

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const [totalUsers, totalTutors, totalStudents, totalBookings, tutorCompletion, newSignups] = await Promise.all([
      prisma.user.count(),
      prisma.tutor.count(),
      prisma.student.count(),
      prisma.booking.count(),
      prisma.tutor.aggregate({
        _avg: {
          profileCompletionPercentage: true
        }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const popularSubjects = await prisma.tutorSubject.groupBy({
      by: ['subjectId'],
      _count: {
        subjectId: true
      },
      orderBy: {
        _count: {
          subjectId: 'desc'
        }
      },
      take: 5
    });

    const subjects = await prisma.subject.findMany({
      where: {
        id: {
          in: popularSubjects.map((subject) => subject.subjectId)
        }
      }
    });

    res.json({
      analytics: {
        totals: {
          users: totalUsers,
          tutors: totalTutors,
          students: totalStudents,
          bookings: totalBookings
        },
        averages: {
          tutorProfileCompletion: tutorCompletion._avg.profileCompletionPercentage || 0
        },
        trends: {
          newSignupsLast7Days: newSignups
        },
        popularSubjects: popularSubjects.map((entry) => {
          const subject = subjects.find((s) => s.id === entry.subjectId);
          return {
            subjectId: entry.subjectId,
            subjectName: subject?.name || 'Unknown',
            tutorCount: entry._count.subjectId
          };
        })
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Error fetching analytics' });
  }
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        tutor: true,
        student: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      users: users.map(({ password, ...user }) => user)
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, emailConfirmed } = req.body as { role?: 'STUDENT' | 'TUTOR' | 'ADMIN'; emailConfirmed?: boolean };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        tutor: true,
        student: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(role && { role }),
          ...(typeof emailConfirmed === 'boolean' && { emailConfirmed })
        },
        include: {
          tutor: true,
          student: true
        }
      });

      if (role === 'TUTOR' && !updated.tutor) {
        await tx.tutor.create({
          data: {
            userId: updated.id
          }
        });
      }

      if (role === 'STUDENT' && !updated.student) {
        await tx.student.create({
          data: {
            userId: updated.id
          }
        });
      }

      return updated;
    });

    const { password, ...safeUser } = result;

    res.json({
      message: 'User updated successfully',
      user: safeUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Error updating user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Error deleting user' });
  }
};

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await getAdminSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Error fetching admin settings' });
  }
};

export const updateSettingsController = async (req: Request, res: Response) => {
  try {
    const {
      sendSignupConfirmation,
      sendProfileCompletionEmail,
      adminCommissionPercentage,
      adminCommissionFixed,
      withdrawalAutoApproveDays,
    } = req.body;

    const updated = await updateAdminSettings({
      ...(typeof sendSignupConfirmation === 'boolean' && { sendSignupConfirmation }),
      ...(typeof sendProfileCompletionEmail === 'boolean' && { sendProfileCompletionEmail }),
      ...(typeof adminCommissionPercentage === 'number' && { adminCommissionPercentage }),
      ...(typeof adminCommissionFixed === 'number' && { adminCommissionFixed }),
      ...(typeof withdrawalAutoApproveDays === 'number' && { withdrawalAutoApproveDays }),
      ...(withdrawalAutoApproveDays === null && { withdrawalAutoApproveDays: null }),
    });

    res.json({
      message: 'Settings updated successfully',
      settings: updated
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Error updating settings' });
  }
};

