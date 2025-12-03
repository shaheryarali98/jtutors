import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simple in-memory cache for subjects (they don't change frequently)
let subjectsCache: {
  subjects: any[];
  categories: any[];
  subcategories: any[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    // Check cache first
    const now = Date.now();
    if (subjectsCache && (now - subjectsCache.timestamp) < CACHE_TTL) {
      return res.json({
        subjects: subjectsCache.subjects,
        categories: subjectsCache.categories,
        subcategories: subjectsCache.subcategories,
      });
    }
    
    // Fetch categories and subcategories in parallel for better performance
    const [categories, subcategories] = await Promise.all([
      prisma.subject.findMany({
        where: { parentId: null },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          parentId: true,
        }
      }),
      prisma.subject.findMany({
        where: { parentId: { not: null } },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          parentId: true,
        }
      })
    ]);

    // Combine for backward compatibility
    const subjects = [...categories, ...subcategories];

    // Update cache
    subjectsCache = {
      subjects,
      categories,
      subcategories,
      timestamp: now,
    };

    res.json({ subjects, categories, subcategories });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Error fetching subjects' });
  }
};

// Function to clear cache when subjects are modified
export const clearSubjectsCache = () => {
  subjectsCache = null;
};

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, parentId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    const subject = await prisma.subject.create({
      data: { 
        name,
        parentId: parentId || null
      },
      include: {
        children: true
      }
    });

    // Clear cache when subject is created
    clearSubjectsCache();

    res.status(201).json({
      message: 'Subject created successfully',
      subject
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Subject already exists' });
    }
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Error creating subject' });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parentId } = req.body as { name?: string; parentId?: string | null };

    if (!name) {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: { 
        name,
        parentId: parentId !== undefined ? parentId : undefined
      },
      include: {
        children: true
      }
    });

    // Clear cache when subject is updated
    clearSubjectsCache();

    res.json({
      message: 'Subject updated successfully',
      subject,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Subject with this name already exists' });
    }
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Error updating subject' });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.subject.delete({ where: { id } });

    // Clear cache when subject is deleted
    clearSubjectsCache();

    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Subject not found' });
    }
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Error deleting subject' });
  }
};

