import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get or create a conversation between a student and tutor
 */
export const getOrCreateConversation = async (studentId: string, tutorId: string) => {
  let conversation = await prisma.conversation.findUnique({
    where: { studentId_tutorId: { studentId, tutorId } },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { studentId, tutorId },
    });
  }

  return conversation;
};

/**
 * Get all conversations for a user (student or tutor)
 */
export const getConversations = async (userId: string, role: string) => {
  // First find the student or tutor profile id
  const where = role === 'STUDENT'
    ? { studentId: await getStudentId(userId) }
    : { tutorId: await getTutorId(userId) };

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      student: {
        include: {
          user: { select: { email: true } },
        },
      },
      tutor: {
        include: {
          user: { select: { email: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  // Add unread count for each conversation
  const profileId = role === 'STUDENT' ? await getStudentId(userId) : await getTutorId(userId);
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          read: false,
          senderId: { not: userId },
        },
      });
      return { ...conv, unreadCount };
    })
  );

  return conversationsWithUnread;
};

/**
 * Get messages in a conversation
 */
export const getMessages = async (conversationId: string, userId: string) => {
  // Verify user is part of this conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      student: { select: { userId: true } },
      tutor: { select: { userId: true } },
    },
  });

  if (!conversation) throw new Error('Conversation not found');
  if (conversation.student.userId !== userId && conversation.tutor.userId !== userId) {
    throw new Error('Not authorized to view this conversation');
  }

  // Mark messages as read
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      read: false,
    },
    data: { read: true },
  });

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Send a message
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  senderRole: string,
  content: string
) => {
  // Verify sender is part of this conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      student: { select: { userId: true } },
      tutor: { select: { userId: true } },
    },
  });

  if (!conversation) throw new Error('Conversation not found');
  if (conversation.student.userId !== senderId && conversation.tutor.userId !== senderId) {
    throw new Error('Not authorized to send messages in this conversation');
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      senderRole,
      content,
    },
  });

  // Update conversation lastMessageAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  return message;
};

/**
 * Get total unread message count for a user
 */
export const getUnreadCount = async (userId: string, role: string) => {
  const profileId = role === 'STUDENT' ? await getStudentId(userId) : await getTutorId(userId);
  const conversationField = role === 'STUDENT' ? 'studentId' : 'tutorId';

  const conversations = await prisma.conversation.findMany({
    where: { [conversationField]: profileId },
    select: { id: true },
  });

  const count = await prisma.message.count({
    where: {
      conversationId: { in: conversations.map((c) => c.id) },
      senderId: { not: userId },
      read: false,
    },
  });

  return count;
};

// Helper to get student profile id from user id
async function getStudentId(userId: string): Promise<string> {
  const student = await prisma.student.findUnique({ where: { userId } });
  if (!student) throw new Error('Student profile not found');
  return student.id;
}

// Helper to get tutor profile id from user id
async function getTutorId(userId: string): Promise<string> {
  const tutor = await prisma.tutor.findUnique({ where: { userId } });
  if (!tutor) throw new Error('Tutor profile not found');
  return tutor.id;
}
