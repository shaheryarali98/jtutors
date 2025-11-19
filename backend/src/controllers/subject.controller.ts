import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Old default subjects removed - use seed script instead
const ensureDefaultSubjects = async () => {
  // No longer creating default subjects here
  // Subjects should be seeded using the seedSubjects.js script
  return;
};

export const getAllSubjects = async (req: Request, res: Response) => {
  try {
    await ensureDefaultSubjects();
    const subjects = await prisma.subject.findMany({
      include: {
        children: {
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Separate categories (no parent) from subcategories (have parent)
    const categories = subjects.filter(s => !s.parentId);
    const subcategories = subjects.filter(s => s.parentId);

    res.json({ subjects, categories, subcategories });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Error fetching subjects' });
  }
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

    res.json({ message: 'Subject deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Subject not found' });
    }
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Error deleting subject' });
  }
};

