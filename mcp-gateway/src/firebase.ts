import "dotenv/config";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

// Force load env vars if not loaded
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const serviceAccountPath = path.resolve(process.cwd(), 'service-account-key.json');
  console.log('Setting GOOGLE_APPLICATION_CREDENTIALS to:', serviceAccountPath);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
}

const projectId = process.env.FIREBASE_PROJECT_ID || 'pyramid-s';

// Initialize Firebase Admin
// It will automatically use GOOGLE_APPLICATION_CREDENTIALS env var
try {
  initializeApp({
      projectId
  });
  console.log('Firebase initialized with project:', projectId);
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export const db = getFirestore();
