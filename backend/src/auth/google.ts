import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID } from '../config/env.js';

export type GoogleProfile = {
  googleSub: string;
  email: string;
  displayName: string;
};

let googleClient: OAuth2Client | null = null;

const getGoogleClient = () => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google auth is not configured');
  }

  if (!googleClient) {
    googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  }

  return googleClient;
};

export const verifyGoogleIdToken = async (idToken: string): Promise<GoogleProfile> => {
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  const googleSub = String(payload?.sub || '').trim();
  const email = String(payload?.email || '')
    .trim()
    .toLowerCase();
  const displayName = String(payload?.name || payload?.given_name || email.split('@')[0] || 'Google user')
    .trim()
    .slice(0, 80);

  if (!googleSub || !email) {
    throw new Error('Invalid Google token');
  }

  return {
    googleSub,
    email,
    displayName,
  };
};
