import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { formatTutor, parseStoredArray, stringifyArray } from '../utils/formatters';
import { getAdminSettings } from '../services/settings.service';
import { sendEmail } from '../services/email.service';
import { getWalletSummary } from '../services/wallet.service';
import { stripe } from '../services/stripe.service';

const prisma = new PrismaClient();

// Helper function to calculate profile completion
const calculateProfileCompletion = async (tutorId: string): Promise<number> => {
  const tutor = await prisma.tutor.findUnique({
    where: { id: tutorId },
    include: {
      experiences: true,
      educations: true,
      subjects: true,
      availabilities: true,
      backgroundCheck: true,
      user: {
        select: {
          email: true
        }
      }
    }
  });

  if (!tutor) return 0;

  let completedSections = 0;
  const totalSections = 8;

  // 1. Personal Information (check key fields)
  if (tutor.firstName && tutor.lastName && tutor.hourlyFee && tutor.country && tutor.city) {
    completedSections++;
  }

  // 2. Experience
  if (tutor.experiences.length > 0) {
    completedSections++;
  }

  // 3. Education
  if (tutor.educations.length > 0) {
    completedSections++;
  }

  // 4. Subjects
  if (tutor.subjects.length > 0) {
    completedSections++;
  }

  // 5. Availability
  if (tutor.availabilities.length > 0) {
    completedSections++;
  }

  // 6. Payout Method
  if (tutor.stripeOnboarded) {
    completedSections++;
  }

  // 7. Background Check
  if (tutor.backgroundCheck) {
    completedSections++;
  }

  // 8. Profile Image
  if (tutor.profileImage) {
    completedSections++;
  }

  const percentage = Math.round((completedSections / totalSections) * 100);
  
  // Update the percentage in the database
  const isComplete = percentage === 100;

  await prisma.tutor.update({
    where: { id: tutorId },
    data: {
      profileCompletionPercentage: percentage,
      profileCompleted: isComplete
    }
  });

  if (isComplete && !tutor.profileCompleted) {
    const settings = await getAdminSettings();
    if (settings.sendProfileCompletionEmail && tutor.user?.email) {
      sendEmail({
        to: tutor.user.email,
        subject: 'JTutors Tutor Profile Complete',
        html: `
          <h2>Well done!</h2>
          <p>Your JTutors tutor profile is now 100% complete.</p>
          <p>Students can now find you more easily. Log in to your dashboard to manage your sessions.</p>
          <p>Keep inspiring learners,<br/>The JTutors Team</p>
        `,
        text: `Your JTutors tutor profile is now complete. Students can now find you more easily.`
      }).catch((error) => console.error('Failed to send tutor profile completion email:', error));
    }
  }

  return percentage;
};

export const updatePersonalInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    
    const {
      firstName,
      lastName,
      email,
      gender,
      gradesCanTeach,
      hourlyFee,
      tagline,
      country,
      state,
      city,
      address,
      zipcode,
      languagesSpoken,
      profileImage
    } = req.body;

    // ******* this validation block is added *******
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email: email,
          NOT: {
            id: userId
          }
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }
    }
    // ******* end of added validation block *******

    const parsedHourlyFee =
      hourlyFee === null || typeof hourlyFee === 'undefined' || hourlyFee === ''
        ? undefined
        : Number(hourlyFee);

    if (typeof parsedHourlyFee === 'number') {
      if (Number.isNaN(parsedHourlyFee)) {
        return res.status(400).json({ error: 'Hourly fee must be a valid number' });
      }
      if (parsedHourlyFee < 20 || parsedHourlyFee > 500) {
        return res.status(400).json({ error: 'Hourly fee must be between $20 and $500' });
      }
    }

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    // ******* this block is added - update user email if changed *******
    if (email) {
      await prisma.user.update({
        where: { id: userId },
        data: { email: email }
      });
    }
    // ******* end of added block *******

    const updatedTutorRecord = await prisma.tutor.update({
      where: { id: tutor.id },
      data: {
        firstName,
        lastName,
        gender,
        gradesCanTeach: stringifyArray(gradesCanTeach),
        hourlyFee: parsedHourlyFee,
        tagline,
        country,
        state,
        city,
        address,
        zipcode,
        languagesSpoken: stringifyArray(languagesSpoken),
        profileImage
      }
    });

    const completion = await calculateProfileCompletion(tutor.id);
    const formattedTutor = formatTutor(updatedTutorRecord);

    res.json({
      message: 'Personal information updated successfully',
      tutor: formattedTutor,
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Update personal info error:', error);
    res.status(500).json({ error: 'Error updating personal information' });
  }
};
export const addExperience = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      jobTitle,
      company,
      location,
      startDate,
      endDate,
      isCurrent,
      teachingMode,
      description
    } = req.body;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const experience = await prisma.experience.create({
      data: {
        tutorId: tutor.id,
        jobTitle,
        company,
        location,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isCurrent: isCurrent || false,
        teachingMode,
        description
      }
    });

    const completion = await calculateProfileCompletion(tutor.id);

    res.status(201).json({
      message: 'Experience added successfully',
      experience,
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Add experience error:', error);
    res.status(500).json({ error: 'Error adding experience' });
  }
};

export const updateExperience = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const {
      jobTitle,
      company,
      location,
      startDate,
      endDate,
      isCurrent,
      teachingMode,
      description
    } = req.body;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const experience = await prisma.experience.update({
      where: { id, tutorId: tutor.id },
      data: {
        jobTitle,
        company,
        location,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        isCurrent,
        teachingMode,
        description
      }
    });

    res.json({
      message: 'Experience updated successfully',
      experience
    });
  } catch (error) {
    console.error('Update experience error:', error);
    res.status(500).json({ error: 'Error updating experience' });
  }
};

export const deleteExperience = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    await prisma.experience.delete({
      where: { id, tutorId: tutor.id }
    });

    const completion = await calculateProfileCompletion(tutor.id);

    res.json({
      message: 'Experience deleted successfully',
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Delete experience error:', error);
    res.status(500).json({ error: 'Error deleting experience' });
  }
};

export const addEducation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      degreeTitle,
      university,
      location,
      startDate,
      endDate,
      isOngoing
    } = req.body;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const education = await prisma.education.create({
      data: {
        tutorId: tutor.id,
        degreeTitle,
        university,
        location,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isOngoing: isOngoing || false
      }
    });

    const completion = await calculateProfileCompletion(tutor.id);

    res.status(201).json({
      message: 'Education added successfully',
      education,
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Add education error:', error);
    res.status(500).json({ error: 'Error adding education' });
  }
};

export const updateEducation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const {
      degreeTitle,
      university,
      location,
      startDate,
      endDate,
      isOngoing
    } = req.body;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const education = await prisma.education.update({
      where: { id, tutorId: tutor.id },
      data: {
        degreeTitle,
        university,
        location,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : null,
        isOngoing
      }
    });

    res.json({
      message: 'Education updated successfully',
      education
    });
  } catch (error) {
    console.error('Update education error:', error);
    res.status(500).json({ error: 'Error updating education' });
  }
};

export const deleteEducation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    await prisma.education.delete({
      where: { id, tutorId: tutor.id }
    });

    const completion = await calculateProfileCompletion(tutor.id);

    res.json({
      message: 'Education deleted successfully',
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Delete education error:', error);
    res.status(500).json({ error: 'Error deleting education' });
  }
};

export const addSubjects = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { subjectIds } = req.body; // Array of subject IDs

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    // Add subjects
    const tutorSubjects = await Promise.all(
      subjectIds.map((subjectId: string) =>
        prisma.tutorSubject.create({
          data: {
            tutorId: tutor.id,
            subjectId
          },
          include: {
            subject: true
          }
        })
      )
    );

    const completion = await calculateProfileCompletion(tutor.id);

    res.json({
      message: 'Subjects added successfully',
      tutorSubjects,
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Add subjects error:', error);
    res.status(500).json({ error: 'Error adding subjects' });
  }
};

export const removeSubject = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { subjectId } = req.params;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    await prisma.tutorSubject.deleteMany({
      where: {
        tutorId: tutor.id,
        subjectId
      }
    });

    const completion = await calculateProfileCompletion(tutor.id);

    res.json({
      message: 'Subject removed successfully',
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Remove subject error:', error);
    res.status(500).json({ error: 'Error removing subject' });
  }
};

export const addAvailability = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      blockTitle,
      daysAvailable,
      startTime,
      endTime,
      breakTime,
      sessionDuration,
      numberOfSlots
    } = req.body;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const availabilityRecord = await prisma.availability.create({
      data: {
        tutorId: tutor.id,
        blockTitle,
        daysAvailable: stringifyArray(daysAvailable) ?? JSON.stringify([]),
        startTime,
        endTime,
        breakTime: parseInt(breakTime),
        sessionDuration: parseInt(sessionDuration),
        numberOfSlots: parseInt(numberOfSlots) || 1
      }
    });

    const completion = await calculateProfileCompletion(tutor.id);
    const formattedAvailability = {
      ...availabilityRecord,
      daysAvailable: parseStoredArray(availabilityRecord.daysAvailable)
    };

    res.status(201).json({
      message: 'Availability added successfully',
      availability: formattedAvailability,
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Add availability error:', error);
    res.status(500).json({ error: 'Error adding availability' });
  }
};

export const updateAvailability = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const {
      blockTitle,
      daysAvailable,
      startTime,
      endTime,
      breakTime,
      sessionDuration,
      numberOfSlots
    } = req.body;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const availabilityRecord = await prisma.availability.update({
      where: { id, tutorId: tutor.id },
      data: {
        blockTitle,
        daysAvailable: daysAvailable ? stringifyArray(daysAvailable) : undefined,
        startTime,
        endTime,
        breakTime: breakTime ? parseInt(breakTime) : undefined,
        sessionDuration: sessionDuration ? parseInt(sessionDuration) : undefined,
        numberOfSlots: numberOfSlots ? parseInt(numberOfSlots) : undefined
      }
    });

    res.json({
      message: 'Availability updated successfully',
      availability: {
        ...availabilityRecord,
        daysAvailable: parseStoredArray(availabilityRecord.daysAvailable)
      }
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Error updating availability' });
  }
};

export const deleteAvailability = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    await prisma.availability.delete({
      where: { id, tutorId: tutor.id }
    });

    const completion = await calculateProfileCompletion(tutor.id);

    res.json({
      message: 'Availability deleted successfully',
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({ error: 'Error deleting availability' });
  }
};

export const submitBackgroundCheck = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      fullLegalFirstName,
      fullLegalLastName,
      otherNamesUsed,
      addressLine1,
      addressLine2,
      city,
      stateProvinceRegion,
      postalCode,
      country,
      livedMoreThan3Years,
      dateOfBirth,
      socialSecurityNumber,
      hasUSDriverLicense,
      email,
      consentGiven,
      comments
    } = req.body;

    if (!consentGiven) {
      return res.status(400).json({ error: 'Consent is required to submit background check' });
    }

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    // Check if background check already exists
    const existing = await prisma.backgroundCheck.findUnique({
      where: { tutorId: tutor.id }
    });

    let backgroundCheck;
    if (existing) {
      backgroundCheck = await prisma.backgroundCheck.update({
        where: { tutorId: tutor.id },
        data: {
          fullLegalFirstName,
          fullLegalLastName,
          otherNamesUsed,
          addressLine1,
          addressLine2,
          city,
          stateProvinceRegion,
          postalCode,
          country,
          livedMoreThan3Years,
          dateOfBirth: new Date(dateOfBirth),
          socialSecurityNumber, // In production, encrypt this!
          hasUSDriverLicense,
          email,
          consentGiven,
          comments,
          status: 'PENDING'
        }
      });
    } else {
      backgroundCheck = await prisma.backgroundCheck.create({
        data: {
          tutorId: tutor.id,
          fullLegalFirstName,
          fullLegalLastName,
          otherNamesUsed,
          addressLine1,
          addressLine2,
          city,
          stateProvinceRegion,
          postalCode,
          country,
          livedMoreThan3Years,
          dateOfBirth: new Date(dateOfBirth),
          socialSecurityNumber, // In production, encrypt this!
          hasUSDriverLicense,
          email,
          consentGiven,
          comments,
          status: 'PENDING'
        }
      });
    }

    await prisma.tutor.update({
      where: { id: tutor.id },
      data: { backgroundCheckCompleted: true }
    });

    const completion = await calculateProfileCompletion(tutor.id);

    res.json({
      message: 'Background check submitted successfully',
      backgroundCheck: {
        ...backgroundCheck,
        socialSecurityNumber: '***-**-' + backgroundCheck.socialSecurityNumber.slice(-4) // Hide SSN in response
      },
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Submit background check error:', error);
    res.status(500).json({ error: 'Error submitting background check' });
  }
};

export const createStripeConnectAccount = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe is not configured. Please contact support.' });
    }

    const userId = req.user!.userId;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    let accountId = tutor.stripeAccountId;

    // Create Stripe Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });
      accountId = account.id;

      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { stripeAccountId: accountId }
      });
    }

    // Create account link for onboarding
    // Determine if we're using live mode keys
    const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Ensure HTTPS for live mode (Stripe requirement)
    let refreshUrl = `${frontendUrl}/tutor/profile/payout`;
    let returnUrl = `${frontendUrl}/tutor/profile/payout/success`;
    
    if (isLiveMode) {
      // Live mode requires HTTPS
      if (!refreshUrl.startsWith('https://') && !refreshUrl.includes('localhost')) {
        refreshUrl = refreshUrl.replace('http://', 'https://');
      }
      if (!returnUrl.startsWith('https://') && !returnUrl.includes('localhost')) {
        returnUrl = returnUrl.replace('http://', 'https://');
      }
      
      // Warn if using localhost with live keys
      if (refreshUrl.includes('localhost')) {
        console.warn('[Stripe] WARNING: Using live mode keys with localhost. This may cause issues.');
      }
    }
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding'
    });

    res.json({
      url: accountLink.url
    });
  } catch (error: any) {
    console.error('Stripe connect error:', error);
    
    // Provide helpful error message for Connect not enabled
    if (error.message && error.message.includes('signed up for Connect')) {
      return res.status(400).json({ 
        error: 'Stripe Connect is not enabled in your Stripe account. Please enable it in your Stripe Dashboard: https://dashboard.stripe.com/test/settings/connect',
        code: 'CONNECT_NOT_ENABLED'
      });
    }
    
    // Handle HTTPS requirement for live mode
    if (error.message && error.message.includes('Livemode requests must always be redirected via HTTPS')) {
      const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
      return res.status(400).json({ 
        error: isLiveMode 
          ? 'Live mode requires HTTPS URLs. For localhost development, please use test mode keys (sk_test_...) instead of live keys (sk_live_...).'
          : 'Redirect URLs must use HTTPS. Please update FRONTEND_URL to use https:// in your .env file.',
        code: 'HTTPS_REQUIRED'
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Error creating Stripe account. Please try again.' 
    });
  }
};

export const getStripeStatus = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.json({ 
        connected: false, 
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false
      });
    }

    const userId = req.user!.userId;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor || !tutor.stripeAccountId) {
      return res.json({ connected: false, onboarded: false });
    }

    const account = await stripe.accounts.retrieve(tutor.stripeAccountId);
    const onboarded = account.charges_enabled && account.payouts_enabled;

    if (onboarded && !tutor.stripeOnboarded) {
      await prisma.tutor.update({
        where: { id: tutor.id },
        data: { stripeOnboarded: true }
      });
      
      await calculateProfileCompletion(tutor.id);
    }

    res.json({
      connected: true,
      onboarded,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    });
  } catch (error: any) {
    console.error('Get Stripe status error:', error);
    res.status(500).json({ error: error.message || 'Error checking Stripe status' });
  }
};

export const getProfileCompletion = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const completion = await calculateProfileCompletion(tutor.id);

    res.json({
      profileCompletion: completion
    });
  } catch (error) {
    console.error('Get profile completion error:', error);
    res.status(500).json({ error: 'Error calculating profile completion' });
  }
};

export const getTutorSessions = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tutor = await prisma.tutor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const bookings = await prisma.booking.findMany({
      where: { tutorId: tutor.id },
      orderBy: { startTime: 'desc' },
      include: {
        student: { include: { user: true } },
        payment: true,
        classSession: true,
      },
    });

    const sessions = bookings.map((booking) => {
      const durationHours =
        (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / (1000 * 60 * 60);
      return {
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
        studentName: booking.student ? `${booking.student.firstName || ''} ${booking.student.lastName || ''}`.trim() : '',
        studentEmail: booking.student?.user.email || '',
        durationHours: Math.max(1, Math.round(durationHours * 100) / 100),
        paymentStatus: booking.payment?.paymentStatus || 'PENDING',
        paymentAmount: booking.payment?.amount || 0,
        currency: booking.payment?.currency || 'USD',
        classSession: booking.classSession
          ? {
              id: booking.classSession.id,
              status: booking.classSession.status,
              googleClassroomLink: booking.classSession.googleClassroomLink,
              googleMeetLink: booking.classSession.googleMeetLink,
            }
          : null,
      };
    });

    res.json({ sessions });
  } catch (error) {
    console.error('Get tutor sessions error:', error);
    res.status(500).json({ error: 'Error fetching sessions' });
  }
};

export const getTutorEarnings = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tutor = await prisma.tutor.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const [walletSummary, payments, withdrawals] = await Promise.all([
      getWalletSummary(userId, 'TUTOR'),
      prisma.payment.findMany({
        where: { tutorId: tutor.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          booking: {
            include: {
              student: {
                include: { user: true },
              },
            },
          },
        },
      }),
      prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        take: 25,
      }),
    ]);

    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      tutorAmount: payment.tutorAmount,
      currency: payment.currency,
      paymentStatus: payment.paymentStatus,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      bookingId: payment.bookingId,
      studentName: payment.booking?.student
        ? `${payment.booking.student.firstName || ''} ${payment.booking.student.lastName || ''}`.trim()
        : '',
      studentEmail: payment.booking?.student?.user.email || '',
    }));

    res.json({
      summary: walletSummary,
      payments: formattedPayments,
      withdrawals,
    });
  } catch (error) {
    console.error('Get tutor earnings error:', error);
    res.status(500).json({ error: 'Error fetching earnings' });
  }
};

