import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { formatStudent, formatTutor } from '../utils/formatters';
import { getAdminSettings } from '../services/settings.service';
import { sendTemplatedEmail } from '../services/emailTemplate.service';

const prisma = new PrismaClient();
type UserRole = 'STUDENT' | 'TUTOR' | 'ADMIN';

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, role } = req.body;
    const normalizedRole = typeof role === "string" ? role.toUpperCase() : "";

    if (!["STUDENT", "TUTOR", "ADMIN"].includes(normalizedRole)) {
      return res
        .status(400)
        .json({ error: "Role must be STUDENT, TUTOR or ADMIN" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get admin settings, but don't fail registration if settings query fails
    let shouldSendConfirmationEmail = true; // Default to true
    try {
      const settings = await getAdminSettings();
      shouldSendConfirmationEmail = settings.sendSignupConfirmation;
    } catch (settingsError) {
      console.warn(
        "Failed to fetch admin settings during registration, using defaults:",
        settingsError
      );
      // Continue with default settings
    }

    // *************** MODIFIED: Auto-confirm ADMIN users only ***************
    const isAdmin = normalizedRole === "ADMIN";

    // Create user with corresponding role profile
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: normalizedRole,
        emailConfirmed: isAdmin, // ADMIN = true, others = false
        ...(normalizedRole === "TUTOR" && {
          tutor: {
            create: {},
          },
        }),
        ...(normalizedRole === "STUDENT" && {
          student: {
            create: {},
          },
        }),
      },
      include: {
        tutor: true,
        student: true,
      },
    });

    if (shouldSendConfirmationEmail && !isAdmin) {
      // Only send confirmation email to non-admin users
      sendTemplatedEmail("SIGNUP_SUCCESS", email, {
        userName: email,
        email: email,
      }).catch((emailErr) => {
        console.error("Failed to send signup confirmation email:", emailErr);
      });
    }

    // Generate JWT token
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not set in environment variables");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role as UserRole },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: isAdmin
        ? "Admin account created successfully."
        : shouldSendConfirmationEmail
        ? "User registered successfully. Please check your email to confirm your account."
        : "User registered successfully. Please wait for admin approval.",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailConfirmed: user.emailConfirmed,
      },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });

    // Provide more specific error messages
    if (error?.code === "P2002") {
      // Prisma unique constraint violation
      return res
        .status(400)
        .json({ error: "User already exists with this email" });
    }

    if (error?.code === "P2025") {
      // Prisma record not found
      return res.status(404).json({ error: "Required resource not found" });
    }

    // Generic error response with more detail in development
    const errorMessage =
      process.env.NODE_ENV === "production"
        ? "Error during registration. Please try again or contact support."
        : error?.message || "Error during registration";

    res.status(500).json({
      error: errorMessage,
      ...(process.env.NODE_ENV !== "production" && { details: error?.message }),
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tutor: true,
        student: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailConfirmed: user.emailConfirmed,
        tutorId: user.tutor?.id,
        studentId: user.student?.id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error during login' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; role: UserRole };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tutor: {
          include: {
            experiences: true,
            educations: true,
            subjects: {
              include: {
                subject: true
              }
            },
            availabilities: true,
            backgroundCheck: true
          }
        },
        student: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password, ...userWithoutPassword } = user;
    const formattedTutor = user.tutor ? formatTutor(user.tutor) : null;
    const formattedStudent = user.student ? formatStudent(user.student) : null;

    res.json({
      ...userWithoutPassword,
      tutor: formattedTutor,
      student: formattedStudent
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Error fetching user data' });
  }
};

