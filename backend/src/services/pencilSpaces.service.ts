/**
 * Pencil Spaces API integration
 * API docs: https://api.pencilspaces.com
 * Base URL: https://apis.pencilapp.com/public/api
 *
 * Requires env: PENCIL_SPACES_API_KEY
 * Obtain from: my.pencilapp.com > Settings > API Key > Generate
 */

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
  id: string;
  email: string;
  name?: string;
}

export interface PencilSpace {
  id: string;
  name: string;
  url: string;
}

// Raw shape returned by POST /spaces/create
interface PencilSpaceApiResponse {
  spaceId: string;
  title: string;
  link: string;
  visibility: string;
  ownerId: string;
}

/**
 * Create (or retrieve existing) a Pencil Spaces API user for the given email.
 * Pencil Spaces de-dupes by email — safe to call multiple times.
 */
export async function createOrGetPencilUser(
  email: string,
  firstName: string,
  lastName: string,
  userRole: 'student' | 'teacher' = 'student'
): Promise<PencilUser> {
  const data = await pencilFetch<{ user: PencilUser }>('/users/createAPIUser', {
    method: 'POST',
    body: JSON.stringify({
      name: `${firstName} ${lastName}`.trim() || email.split('@')[0],
      userRole,
    }),
  });
  return data.user;
}

/**
 * Create a new Pencil Space (virtual classroom) for a session.
 * Returns the space id and URL. Spaces are durable — reused each time the session
 * link is opened.
 */
export async function createPencilSpace(name: string): Promise<PencilSpace> {
  const data = await pencilFetch<PencilSpaceApiResponse>('/spaces/create', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  // Map API response fields to our internal shape
  return {
    id: data.spaceId,
    name: data.title,
    url: data.link,
  };
}

/**
 * Generate a short-lived authenticated join URL for a user to enter a Space.
 * Call this each time a user clicks "Join Space" — do NOT cache the result.
 */
export async function getPencilJoinUrl(
  pencilUserId: string,
  spaceUrl: string
): Promise<string> {
  const data = await pencilFetch<{ url: string }>(`/users/${pencilUserId}/authorize`, {
    method: 'POST',
    body: JSON.stringify({
      redirectUrl: `${spaceUrl}?standalone=true&startCall=true`,
    }),
  });
  return data.url;
}

export function isPencilSpacesEnabled(): boolean {
  return Boolean(getApiKey());
}
