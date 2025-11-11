import { Request, Response } from 'express';
import {
  getAllEmailTemplates,
  getEmailTemplate,
  upsertEmailTemplate,
  initializeDefaultTemplates,
} from '../services/emailTemplate.service';

export const getAllEmailTemplatesController = async (req: Request, res: Response) => {
  try {
    const templates = await getAllEmailTemplates();
    res.json({ templates });
  } catch (error: any) {
    console.error('Get all email templates error:', error);
    res.status(500).json({ error: error.message || 'Error fetching email templates' });
  }
};

export const getEmailTemplateController = async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const template = await getEmailTemplate(name);

    if (!template) {
      return res.status(404).json({ error: 'Email template not found' });
    }

    res.json({ template });
  } catch (error: any) {
    console.error('Get email template error:', error);
    res.status(500).json({ error: error.message || 'Error fetching email template' });
  }
};

export const upsertEmailTemplateController = async (req: Request, res: Response) => {
  try {
    const { name, subject, htmlBody, textBody, isActive, variables } = req.body;

    if (!name || !subject || !htmlBody) {
      return res.status(400).json({ error: 'Name, subject, and htmlBody are required' });
    }

    const template = await upsertEmailTemplate({
      name,
      subject,
      htmlBody,
      textBody,
      isActive,
      variables,
    });

    res.json({ template, message: 'Email template saved successfully' });
  } catch (error: any) {
    console.error('Upsert email template error:', error);
    res.status(500).json({ error: error.message || 'Error saving email template' });
  }
};

export const initializeDefaultTemplatesController = async (req: Request, res: Response) => {
  try {
    await initializeDefaultTemplates();
    res.json({ message: 'Default email templates initialized successfully' });
  } catch (error: any) {
    console.error('Initialize default templates error:', error);
    res.status(500).json({ error: error.message || 'Error initializing default templates' });
  }
};

