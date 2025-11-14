import { Request, Response } from 'express';
import { createPayment, confirmPayment, getPayment, getPaymentsByUser } from '../services/payment.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createPaymentController = async (req: Request, res: Response) => {
  try {
    const { bookingId, amount, currency } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (currentUser.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Only students can create payments' });
    }

    // Get user's student profile
    const student = await prisma.student.findUnique({
      where: { userId: currentUser.userId },
    });

    if (!student) {
      return res.status(403).json({ error: 'Student profile not found' });
    }

    // Get booking to verify tutor
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tutor: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.studentId !== student.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const payment = await createPayment({
      bookingId,
      studentId: student.id,
      tutorId: booking.tutorId,
      amount,
      currency,
    });

    res.json({ payment });
  } catch (error: any) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: error.message || 'Error creating payment' });
  }
};

export const confirmPaymentController = async (req: Request, res: Response) => {
  try {
    const { paymentId, stripeChargeId } = req.body;

    const payment = await confirmPayment(paymentId, stripeChargeId);

    res.json({ payment, message: 'Payment confirmed successfully' });
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: error.message || 'Error confirming payment' });
  }
};

export const getPaymentController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payment = await getPayment(id);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify access
    if (currentUser.role !== 'ADMIN') {
      const student = await prisma.student.findUnique({ where: { userId: currentUser.userId } });
      const tutor = await prisma.tutor.findUnique({ where: { userId: currentUser.userId } });

      if (
        (student && payment.studentId !== student.id) ||
        (tutor && payment.tutorId !== tutor.id)
      ) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    res.json({ payment });
  } catch (error: any) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: error.message || 'Error fetching payment' });
  }
};

export const getMyPaymentsController = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = currentUser.role as 'STUDENT' | 'TUTOR' | 'ADMIN';

    if (userRole !== 'STUDENT' && userRole !== 'TUTOR') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const payments = await getPaymentsByUser(currentUser.userId, userRole);

    res.json({ payments });
  } catch (error: any) {
    console.error('Get my payments error:', error);
    res.status(500).json({ error: error.message || 'Error fetching payments' });
  }
};

