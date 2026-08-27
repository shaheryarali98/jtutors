/**
 * Pencil Spaces API integration
 * API docs: https://api.pencilspaces.com
 * Base URL: https://apis.pencilapp.com/public/api
 *
 * Requires env: PENCIL_SPACES_API_KEY
 * Obtain from: my.pencilapp.com > Settings > API Key > Generate
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PENCIL_API_BASE = 'https://apis.pencilapp.com/public/api';

function getApiKey(): string | null {
  return process.env.PENCIL_SPACES_API_KEY || null;
}

async function pencilFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('PENCIL_SPACES_API_KEY is not configured. Sign up at my.pencilapp.com and add your API key to .env');
  }

  const url = `${PENCIL_API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pencil Spaces API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export interface PencilUser {
  userId: string;
  name: string;
  email: string;
  externalId?: string;
  userRole: 'Teacher' | 'Student';
}

export interface PencilSpace {
  id: string;
  name: string;
  url: string;
}

// Raw shape returned by POST /spaces/create — the space object, not wrapped.
interface PencilSpaceApiResponse {
  spaceId: string;
  title: string;
  link: string;
  visibility: string;
  ownerId: string;
  externalId?: string;
}

/**
 * Create a Pencil Spaces API user.
 *
 * NOTE: this always creates a NEW user. The API does not de-duplicate on
 * `externalId` (verified against the live API), so callers must persist the
 * returned `userId` and reuse it — see ensurePencilUserForTutor/Student.
 */
export async function createPencilUser(
  name: string,
  userRole: 'Student' | 'Teacher',
  externalId?: string
): Promise<PencilUser> {
  return pencilFetch<PencilUser>('/users/createAPIUser', {
    method: 'POST',
    body: JSON.stringify({
      name: name.trim() || (userRole === 'Teacher' ? 'Tutor' : 'Student'),
      userRole,
      ...(externalId ? { externalId } : {}),
    }),
  });
}

/**
 * Resolve the tutor's Pencil user id, creating and persisting one on first use
 * so the same tutor keeps a stable Pencil identity across every session.
 */
export async function ensurePencilUserForTutor(tutorId: string): Promise<string> {
  const tutor = await prisma.tutor.findUnique({
    where: { id: tutorId },
    select: { id: true, firstName: true, lastName: true, pencilUserId: true },
  });

  if (!tutor) throw new Error('Tutor not found');
  if (tutor.pencilUserId) return tutor.pencilUserId;

  const name = `${tutor.firstName || ''} ${tutor.lastName || ''}`.trim() || 'Tutor';
  const user = await createPencilUser(name, 'Teacher', `jtutors-tutor-${tutor.id}`);

  await prisma.tutor.update({
    where: { id: tutor.id },
    data: { pencilUserId: user.userId },
  });

  return user.userId;
}

/** Same as ensurePencilUserForTutor, for the student side. */
export async function ensurePencilUserForStudent(studentId: string): Promise<string> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, firstName: true, lastName: true, pencilUserId: true },
  });

  if (!student) throw new Error('Student not found');
  if (student.pencilUserId) return student.pencilUserId;

  const name = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';
  const user = await createPencilUser(name, 'Student', `jtutors-student-${student.id}`);

  await prisma.student.update({
    where: { id: student.id },
    data: { pencilUserId: user.userId },
  });

  return user.userId;
}

export interface CreatePencilSpaceOptions {
  title: string;
  /** Space owner — set to the tutor so they hold host controls by default. */
  ownerUserId?: string;
  hostUserIds?: string[];
  participantUserIds?: string[];
  externalId?: string;
}

/**
 * Create a new Pencil Space (virtual classroom).
 * The tutor is passed as owner + host so they run the room by default.
 */
export async function createPencilSpace(options: CreatePencilSpaceOptions): Promise<PencilSpace> {
  const { title, ownerUserId, hostUserIds = [], participantUserIds = [], externalId } = options;

  const data = await pencilFetch<PencilSpaceApiResponse>('/spaces/create', {
    method: 'POST',
    body: JSON.stringify({
      title,
      ...(ownerUserId ? { owner: { userId: ownerUserId } } : {}),
      ...(hostUserIds.length ? { hosts: hostUserIds.map((userId) => ({ userId })) } : {}),
      ...(participantUserIds.length
        ? { participants: participantUserIds.map((userId) => ({ userId })) }
        : {}),
      ...(externalId ? { externalId } : {}),
      notifyInvitees: false,
    }),
  });

  return {
    id: data.spaceId,
    name: data.title,
    url: data.link,
  };
}

export interface PencilSpaceDetail {
  spaceId: string;
  title: string;
  link: string;
  ownerId?: string;
  hosts?: Array<{ userId: string }>;
  participants?: Array<{ userId: string }>;
}

/** Fetch a Space so we can see who is currently attached to it. */
export async function getPencilSpace(spaceId: string): Promise<PencilSpaceDetail> {
  return pencilFetch<PencilSpaceDetail>(`/spaces/${spaceId}`, { method: 'GET' });
}

/**
 * Attach the tutor as host and the student as participant on an existing Space.
 *
 * Needed for Spaces created before host support: those are owned by the API-key
 * account with no tutor host, so reopening one would not give the tutor host
 * controls. Safe to call repeatedly — users already attached are skipped.
 */
export async function ensurePencilSpaceMembers(
  spaceId: string,
  tutorPencilUserId: string,
  studentPencilUserId: string
): Promise<void> {
  let existing: PencilSpaceDetail | null = null;
  try {
    existing = await getPencilSpace(spaceId);
  } catch (error) {
    console.error(`Could not read Pencil Space ${spaceId}:`, error);
    return;
  }

  const hostIds = new Set((existing.hosts || []).map((u) => u.userId));
  const participantIds = new Set((existing.participants || []).map((u) => u.userId));

  const addUsers: Array<{ userId: string; role: 'host' | 'participant' }> = [];
  const modifyUsers: Array<{ userId: string; role: 'host' | 'participant' }> = [];

  if (!hostIds.has(tutorPencilUserId)) {
    // Already a participant? Promote. Otherwise add fresh as host.
    (participantIds.has(tutorPencilUserId) ? modifyUsers : addUsers).push({
      userId: tutorPencilUserId,
      role: 'host',
    });
  }

  if (!participantIds.has(studentPencilUserId) && !hostIds.has(studentPencilUserId)) {
    addUsers.push({ userId: studentPencilUserId, role: 'participant' });
  }

  if (!addUsers.length && !modifyUsers.length) return;

  await pencilFetch(`/spaces/${spaceId}/updateUsers`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...(addUsers.length ? { addUsers } : {}),
      ...(modifyUsers.length ? { modifyUsers } : {}),
      notifyInvitees: false,
    }),
  });
}

/**
 * Generate a short-lived authenticated join URL for a user to enter a Space.
 * Call this each time a user clicks "Join Space" — do NOT cache the result.
 */
export async function getPencilJoinUrl(
  pencilUserId: string,
  spaceUrl: string
): Promise<string> {
  const redirectUrl = `${spaceUrl}?standalone=true&startCall=true`;
  const data = await pencilFetch<{ url: string }>(
    `/users/${pencilUserId}/authorize?redirectUrl=${encodeURIComponent(redirectUrl)}`,
    { method: 'GET' }
  );
  return data.url;
}

export function isPencilSpacesEnabled(): boolean {
  return Boolean(getApiKey());
}
