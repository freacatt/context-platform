import admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";
async function testConnection() {
    console.log("🔍 Testing Firebase Connection...");
    const keyPath = resolve(process.cwd(), "service-account.json");
    console.log(`Checking for key at: ${keyPath}`);
    try {
        readFileSync(keyPath);
        console.log("✅ service-account.json found.");
    }
    catch (e) {
        console.error("❌ service-account.json NOT FOUND.");
        console.error("   You MUST download it from Firebase Console and place it here.");
        process.exit(1);
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath;
    try {
        if (!admin.apps.length) {
            admin.initializeApp({
                projectId: "product-platform-c9bb9"
            });
        }
        console.log("✅ Firebase Admin initialized.");
    }
    catch (e) {
        console.error("❌ Failed to initialize Admin:", e);
        process.exit(1);
    }
    try {
        console.log("Attempting to list pyramids...");
        const db = admin.firestore();
        const snapshot = await db.collection("pyramids").limit(1).get();
        console.log(`✅ Success! Found ${snapshot.size} pyramids.`);
    }
    catch (e) {
        console.error("❌ Connection Failed:");
        console.error(e.message);
    }
}
testConnection();
