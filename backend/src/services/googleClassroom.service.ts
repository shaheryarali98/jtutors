import { google } from 'googleapis';

// Initialize Google Classroom API
const getClassroomClient = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
    console.warn('[Google Classroom] Credentials not configured. Google Classroom features will be disabled.');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.classroom({ version: 'v1', auth: oauth2Client });
};

// Create a course (class) in Google Classroom
export const createCourse = async (
  name: string,
  section?: string,
  description?: string
): Promise<{ id: string; alternateLink: string } | null> => {
  const classroom = getClassroomClient();
  if (!classroom) {
    throw new Error('Google Classroom is not configured');
  }

  try {
    const response = await classroom.courses.create({
      requestBody: {
        name,
        section,
        description,
        ownerId: 'me',
        courseState: 'ACTIVE',
      },
    });

    if (response.data.id && response.data.alternateLink) {
      return {
        id: response.data.id,
        alternateLink: response.data.alternateLink,
      };
    }
    return null;
  } catch (error) {
    console.error('Error creating Google Classroom course:', error);
    throw error;
  }
};

// Create a Google Meet link for the course
export const createMeetLink = async (courseId: string): Promise<string | null> => {
  const classroom = getClassroomClient();
  if (!classroom) {
    throw new Error('Google Classroom is not configured');
  }

  try {
    // Note: Google Meet links are typically created through Google Calendar
    // For now, we'll return a placeholder. In production, you'd integrate with Google Calendar API
    // to create a calendar event with a Meet link
    return `https://meet.google.com/${generateMeetCode()}`;
  } catch (error) {
    console.error('Error creating Google Meet link:', error);
    return null;
  }
};

// Generate a random Meet code (for sandbox/testing)
const generateMeetCode = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Add student to course
export const addStudentToCourse = async (
  courseId: string,
  studentEmail: string
): Promise<boolean> => {
  const classroom = getClassroomClient();
  if (!classroom) {
    throw new Error('Google Classroom is not configured');
  }

  try {
    await classroom.courses.students.create({
      courseId,
      requestBody: {
        userId: studentEmail,
      },
    });
    return true;
  } catch (error) {
    console.error('Error adding student to course:', error);
    return false;
  }
};

// Add teacher to course
export const addTeacherToCourse = async (
  courseId: string,
  teacherEmail: string
): Promise<boolean> => {
  const classroom = getClassroomClient();
  if (!classroom) {
    throw new Error('Google Classroom is not configured');
  }

  try {
    await classroom.courses.teachers.create({
      courseId,
      requestBody: {
        userId: teacherEmail,
      },
    });
    return true;
  } catch (error) {
    console.error('Error adding teacher to course:', error);
    return false;
  }
};

export const getGoogleClassroomStatus = () => {
  const requiredKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  return {
    configured: missingKeys.length === 0,
    missingKeys,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
  };
};

