# Pyramid Solver

Pyramid Solver is a powerful structured problem-solving tool designed to help you break down complex problems, define products, and architect solutions using a pyramid structure. It leverages AI (Claude via Anthropic) to assist in brainstorming, question generation, and answer synthesis.

## Features

-   **Pyramid Structured Thinking**: Break down problems into smaller, manageable questions and answers.
-   **AI-Powered Assistance**: Use Claude AI to generate questions, answers, and combine insights.
-   **Product Definition**: Structured approach to defining products with clear scope, risks, and requirements.
-   **Architecture Planning**: Tools for Technical and UI/UX architecture planning.
-   **Context Management**: Manage global context, documents, and directories to inform the AI.
-   **Real-time Collaboration**: Built on Firebase for real-time data synchronization.

## Tech Stack

-   **Frontend**: React, Vite, TypeScript
-   **Styling**: Tailwind CSS, Radix UI
-   **Backend / Database**: Firebase (Authentication, Firestore, Hosting)
-   **AI**: Anthropic API (Claude)
-   **State Management**: Context API, Zustand
-   **Routing**: React Router

## Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/) (v16 or higher)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   A [Firebase](https://firebase.google.com/) project
-   An [Anthropic API Key](https://console.anthropic.com/) (for AI features)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pyramid-solver
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

This project uses Firebase for authentication and data storage. You need to set up your environment variables.

1.  Copy the example environment file:

    ```bash
    cp .env.example .env
    ```

2.  Open `.env` and fill in your Firebase configuration:

    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

    You can find these values in your Firebase Console under Project Settings > General > Your Apps.

### 4. Run Locally

Start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`.

### 5. AI Configuration

To use the AI features:
1.  Log in to the application.
2.  Click on the **"Set API Key"** button in the navigation bar.
3.  Enter your Anthropic API Key (starting with `sk-ant-...`).
4.  The key is stored securely in your user profile in Firestore.

## Deployment

The project is configured for deployment on Firebase Hosting.

1.  Install Firebase CLI globally:

    ```bash
    npm install -g firebase-tools
    ```

2.  Login to Firebase:

    ```bash
    firebase login
    ```

3.  Initialize Firebase (if not already done):

    ```bash
    firebase init
    ```
    (Select Hosting, choose your project, use `dist` as public directory, configure as single-page app)

4.  Build and Deploy:

    ```bash
    npm run deploy
    ```
    This command runs `vite build` and then `firebase deploy`.

## Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request
