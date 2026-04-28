import express from 'express';
import * as messageController from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Conversations
router.post('/conversations', messageController.startConversation);
router.get('/conversations', messageController.listConversations);

// Messages within a conversation
router.get('/conversations/:conversationId/messages', messageController.listMessages);
router.post('/conversations/:conversationId/messages', messageController.createMessage);

// Unread count
router.get('/unread-count', messageController.unreadCount);

export default router;
