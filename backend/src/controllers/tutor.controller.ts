import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { formatTutor, parseStoredArray, stringifyArray } from '../utils/formatters';
import { getAdminSettings } from '../services/settings.service';
import { sendEmail } from '../services/email.service';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

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
        subject: 'JTutor Tutor Profile Complete',
        html: `
          <h2>Well done!</h2>
          <p>Your JTutor tutor profile is now 100% complete.</p>
          <p>Students can now find you more easily. Log in to your dashboard to manage your sessions.</p>
          <p>Keep inspiring learners,<br/>The JTutor Team</p>
        `,
        text: `Your JTutor tutor profile is now complete. Students can now find you more easily.`
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

    // Validate hourly fee range
    if (hourlyFee && (hourlyFee < 20 || hourlyFee > 500)) {
      return res.status(400).json({ error: 'Hourly fee must be between $20 and $500' });
    }

    const tutor = await prisma.tutor.findUnique({
      where: { userId }
    });

    if (!tutor) {
      return res.status(404).json({ error: 'Tutor profile not found' });
    }

    const updatedTutorRecord = await prisma.tutor.update({
      where: { id: tutor.id },
      data: {
        firstName,
        lastName,
        gender,
        gradesCanTeach: stringifyArray(gradesCanTeach),
        hourlyFee: hourlyFee ? parseFloat(hourlyFee) : undefined,
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
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tutor/profile/payout`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/tutor/profile/payout/success`,
      type: 'account_onboarding'
    });

    res.json({
      url: accountLink.url
    });
  } catch (error) {
    console.error('Stripe connect error:', error);
    res.status(500).json({ error: 'Error creating Stripe account' });
  }
};

export const getStripeStatus = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    console.error('Get Stripe status error:', error);
    res.status(500).json({ error: 'Error checking Stripe status' });
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

