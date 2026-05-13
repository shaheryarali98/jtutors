/**
 * Backfill: create Pencil Spaces for all SCHEDULED classSessions that have no pencilSpaceUrl.
 * Run once: node scripts/backfill-pencil-spaces.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const PENCIL_API_BASE = 'https://apis.pencilapp.com/public/api';
const apiKey = process.env.PENCIL_SPACES_API_KEY;

if (!apiKey) {
  console.error('❌ PENCIL_SPACES_API_KEY not set in .env');
  process.exit(1);
}

async function createPencilSpace(name) {
  const res = await fetch(`${PENCIL_API_BASE}/spaces/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pencil API ${res.status}: ${body}`);
  }
  const data = await res.json();
  // API returns { spaceId, link, title, ... }
  return { id: data.spaceId, url: data.link, name: data.title };
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const sessions = await prisma.classSession.findMany({
      where: { pencilSpaceUrl: null, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      include: {
        booking: {
          include: {
            tutor: true,
            student: true,
          },
        },
      },
    });

    console.log(`Found ${sessions.length} session(s) without Pencil Space.`);

    for (const session of sessions) {
      const tutorName = [session.booking.tutor.firstName, session.booking.tutor.lastName].filter(Boolean).join(' ') || 'Tutor';
      const studentName = [session.booking.student.firstName, session.booking.student.lastName].filter(Boolean).join(' ') || 'Student';
      const spaceName = `${tutorName} & ${studentName} — ${new Date(session.booking.startTime).toLocaleDateString()}`;

      try {
        const space = await createPencilSpace(spaceName);
        await prisma.classSession.update({
          where: { id: session.id },
          data: { pencilSpaceId: space.id, pencilSpaceUrl: space.url },
        });
        console.log(`✅ Session ${session.id.substring(0, 8)}… → Space: ${space.url}`);
      } catch (err) {
        console.error(`❌ Session ${session.id.substring(0, 8)}… failed:`, err.message);
      }
    }

    console.log('\nDone.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
