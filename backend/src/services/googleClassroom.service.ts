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

// Get Calendar client for creating Meet links
const getCalendarClient = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
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

  return google.calendar({ version: 'v3', auth: oauth2Client });
};

// Create a Google Meet link for the course via Calendar API
export const createMeetLink = async (
  courseId: string,
  startTime?: Date,
  endTime?: Date,
  summary?: string
): Promise<string | null> => {
  const calendar = getCalendarClient();
  if (!calendar) {
    // Fallback to generated Meet code if Calendar API not available
    return `https://meet.google.com/${generateMeetCode()}`;
  }

  try {
    // Create a calendar event with Google Meet
    const event = {
      summary: summary || 'Tutoring Session',
      description: `Google Classroom Course ID: ${courseId}`,
      start: {
        dateTime: startTime?.toISOString() || new Date().toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime?.toISOString() || new Date(Date.now() + 3600000).toISOString(), // Default 1 hour
        timeZone: 'UTC',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${courseId}-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.conferenceData?.entryPoints?.[0]?.uri;
    return meetLink || null;
  } catch (error) {
    console.error('Error creating Google Meet link via Calendar:', error);
    // Fallback to generated Meet code
    return `https://meet.google.com/${generateMeetCode()}`;
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

