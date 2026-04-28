import { Request, Response } from 'express';
import {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
} from '../services/message.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Start or get a conversation with a tutor/student
 */
export const startConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { tutorId, studentId } = req.body;

    let resolvedStudentId: string;
    let resolvedTutorId: string;

    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({ where: { userId } });
      if (!student) return res.status(404).json({ error: 'Student profile not found' });
      resolvedStudentId = student.id;
      resolvedTutorId = tutorId;
    } else if (role === 'TUTOR') {
      const tutor = await prisma.tutor.findUnique({ where: { userId } });
      if (!tutor) return res.status(404).json({ error: 'Tutor profile not found' });
      resolvedTutorId = tutor.id;
      resolvedStudentId = studentId;
    } else {
      return res.status(403).json({ error: 'Only students and tutors can message' });
    }

    if (!resolvedStudentId || !resolvedTutorId) {
      return res.status(400).json({ error: 'Missing tutorId or studentId' });
    }

    const conversation = await getOrCreateConversation(resolvedStudentId, resolvedTutorId);
    res.json(conversation);
  } catch (error: any) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: error.message || 'Failed to start conversation' });
  }
};

/**
 * Get all conversations for the current user
 */
export const listConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const conversations = await getConversations(userId, role);
    res.json(conversations);
  } catch (error: any) {
    console.error('Error listing conversations:', error);
    res.status(500).json({ error: error.message || 'Failed to list conversations' });
  }
};

/**
 * Get messages in a conversation
 */
export const listMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { conversationId } = req.params;
    const messages = await getMessages(conversationId, userId);
    res.json(messages);
  } catch (error: any) {
    console.error('Error listing messages:', error);
    if (error.message === 'Not authorized to view this conversation') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to list messages' });
  }
};

/**
 * Send a message in a conversation
 */
export const createMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const { conversationId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const message = await sendMessage(conversationId, userId, role, content.trim());
    res.status(201).json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    if (error.message === 'Not authorized to send messages in this conversation') {
      return res.status(403).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};

/**
 * Get unread message count
 */
export const unreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const count = await getUnreadCount(userId, role);
    res.json({ unreadCount: count });
  } catch (error: any) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: error.message || 'Failed to get unread count' });
  }
};
