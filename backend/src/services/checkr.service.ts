import axios, { AxiosInstance } from 'axios';

const CHECKR_API_KEY = process.env.CHECKR_API_KEY;
// Use staging URL for test keys, production URL for live keys
const CHECKR_BASE_URL = process.env.CHECKR_API_URL || 'https://api.checkr-staging.com/v1';

let checkrClient: AxiosInstance | null = null;

if (CHECKR_API_KEY) {
  checkrClient = axios.create({
    baseURL: CHECKR_BASE_URL,
    auth: {
      username: CHECKR_API_KEY,
      password: '', // Checkr uses API key as username with empty password
    },
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
  console.log('✅ Checkr API configured');
} else {
  console.warn('⚠️ CHECKR_API_KEY not set – background checks will be stored locally only');
}

export const isCheckrConfigured = (): boolean => !!checkrClient;

/**
 * Create a Checkr candidate.
 * https://docs.checkr.com/#tag/Candidates/operation/candidateCreate
 */
export const createCandidate = async (data: {
  first_name: string;
  last_name: string;
  email: string;
  dob: string;          // YYYY-MM-DD
  ssn: string;           // XXX-XX-XXXX
  zipcode: string;
  driver_license_number?: string;
  driver_license_state?: string;
  middle_name?: string;
  no_middle_name?: boolean;
}): Promise<any> => {
  if (!checkrClient) throw new Error('Checkr is not configured');

  const response = await checkrClient.post('/candidates', data);
  return response.data;
};

/**
 * Create an invitation for a candidate to go through the Checkr flow.
 * https://docs.checkr.com/#tag/Invitations/operation/invitationCreate
 */
export const createInvitation = async (data: {
  candidate_id: string;
  package: string; // e.g. 'tasker_standard', 'driver_standard', etc.
  work_locations?: Array<{ country: string; state?: string; city?: string }>;
}): Promise<any> => {
  if (!checkrClient) throw new Error('Checkr is not configured');

  const response = await checkrClient.post('/invitations', data);
  return response.data;
};

/**
 * Get a candidate by ID
 */
export const getCandidate = async (candidateId: string): Promise<any> => {
  if (!checkrClient) throw new Error('Checkr is not configured');

  const response = await checkrClient.get(`/candidates/${candidateId}`);
  return response.data;
};

/**
 * Get a report by ID
 */
export const getReport = async (reportId: string): Promise<any> => {
  if (!checkrClient) throw new Error('Checkr is not configured');

  const response = await checkrClient.get(`/reports/${reportId}`);
  return response.data;
};

/**
 * List packages available on the account
 */
export const listPackages = async (): Promise<any> => {
  if (!checkrClient) throw new Error('Checkr is not configured');

  const response = await checkrClient.get('/packages');
  return response.data;
};

/**
 * Map Checkr report status to our internal status
 */
export const mapCheckrStatus = (checkrStatus: string): string => {
  switch (checkrStatus) {
    case 'clear':
      return 'APPROVED';
    case 'consider':
      return 'REVIEW'; // Admin may still approve
    case 'suspended':
    case 'dispute':
      return 'PENDING';
    default:
      return 'PENDING';
  }
};

/**
 * Map Checkr invitation status
 */
export const mapInvitationStatus = (invitationStatus: string): string => {
  switch (invitationStatus) {
    case 'completed':
      return 'PENDING'; // Candidate completed their part, report still processing
    case 'expired':
      return 'EXPIRED';
    default:
      return 'PENDING';
  }
};
