import 'dotenv/config';
import { db } from './firebase.js';

async function checkConnection() {
  console.log('Checking Firestore connection...');
  console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('Mock DB:', process.env.MOCK_DB);

  try {
    // Try to list collections (this usually requires admin privileges)
    // Or just try to read a known collection
    const collections = await db.listCollections();
    console.log('Successfully connected to Firestore!');
    console.log('Collections found:', collections.map((c: any) => c.id).join(', '));
  } catch (error: any) {
    console.error('Connection failed:', error.message);
    if (error.message.includes('Could not load the default credentials')) {
      console.log('\n--- TROUBLESHOOTING ---');
      console.log('1. You need a Firebase Service Account key to access Firestore from this gateway.');
      console.log('2. Go to Firebase Console > Project Settings > Service accounts.');
      console.log('3. Generate a new private key and save it as "service-account.json" in this directory.');
      console.log('4. Update .env file to include: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json');
      console.log('-----------------------');
    }
  }
  process.exit(0);
}

checkConnection();
