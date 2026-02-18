# Deployment Guide

This guide will help you deploy your **Context Platform** application to production using **Firebase** and **Vercel** (or any static site host).

## 1. Firebase Setup

You need to set up a Firebase project.

1.  **Go to Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com).
2.  **Add Project**: Create a new project.
3.  **Enable Authentication**:
    *   Go to **Authentication** > **Sign-in method**.
    *   Enable **Email/Password**.
4.  **Enable Firestore Database**:
    *   Go to **Firestore Database**.
    *   Click **Create Database**.
    *   Start in **Production mode** (or Test mode if you prefer).
    *   Choose a location.
5.  **Get Configuration**:
    *   Go to **Project Settings** (gear icon).
    *   Scroll down to **Your apps**.
    *   Click the web icon (`</>`) to add a web app.
    *   Copy the `firebaseConfig` values (apiKey, authDomain, etc.).

## 2. Firestore Security Rules

You should set up Firestore security rules to protect your data. Go to **Firestore Database** > **Rules** and configure them according to your needs (e.g., only authenticated users can read/write their own data).

Example basic rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 3. Deploying the Frontend (Vercel Recommended)

We recommend using Vercel as it works seamlessly with Vite and React.

### Option A: Using Vercel CLI (Fastest)

1.  **Install Vercel CLI**:
    ```bash
    npm i -g vercel
    ```
2.  **Login**:
    ```bash
    vercel login
    ```
3.  **Deploy**:
    Run the following command in your project root:
    ```bash
    vercel
    ```
    *   Follow the prompts (accept defaults usually).
    *   It will ask specifically about your settings.

4.  **Environment Variables**:
    *   During the setup, or afterwards in the Vercel Dashboard (Settings > Environment Variables), you **MUST** add these variables:
        *   `VITE_FIREBASE_API_KEY`
        *   `VITE_FIREBASE_AUTH_DOMAIN`
        *   `VITE_FIREBASE_PROJECT_ID`
        *   `VITE_FIREBASE_STORAGE_BUCKET`
        *   `VITE_FIREBASE_MESSAGING_SENDER_ID`
        *   `VITE_FIREBASE_APP_ID`

### Option B: Using Vercel Dashboard (Git Integration)

1.  Push your code to a GitHub/GitLab/Bitbucket repository.
2.  Log in to [Vercel](https://vercel.com) and click **Add New > Project**.
3.  Import your repository.
4.  In the **Environment Variables** section, add the Firebase configuration variables listed above.
5.  Click **Deploy**.

## 4. MCP Server (Optional)

If you want to use the MCP Server capability (for IDE integration):

1.  The `mcp-server` folder is a separate Node.js application.
2.  It is meant to run **locally** on your machine to bridge your IDE (like Cursor or Windsurf) with your remote Firebase database.
3.  You do not typically "deploy" this to the web for public users.
4.  To use it:
    *   Ensure `mcp-server/.env` has your Firebase keys.
    *   Run `npm run build` inside `mcp-server`.
    *   Configure your IDE to point to the build file (instructions in `mcp-server/README.md`).

## Troubleshooting

*   **White Screen on Deploy**: Check the browser console. It usually means environment variables are missing.
*   **"Permission denied"**: This means Firestore Security Rules are blocking access. Ensure you are logged in, or check the Rules in Firebase Console.
