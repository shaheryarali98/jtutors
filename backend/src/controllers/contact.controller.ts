import { Request, Response } from 'express';
import { sendEmail } from '../services/email.service';

const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'shaheryarali446@gmail.com';

export const submitContactForm = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Send to admin
    await sendEmail({
      to: CONTACT_EMAIL,
      subject: `[JTutors Contact] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #012c54; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 20px;">New Contact Form Submission</h2>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
      text: `New Contact Form Submission\n\nFrom: ${name} (${email})\nSubject: ${subject}\n\nMessage:\n${message}`,
    });

    res.json({ success: true, message: 'Your message has been sent successfully.' });
  } catch (error) {
    console.error('[Contact] Error sending contact form:', error);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
};
