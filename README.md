```text
   ______            __           __     
  / ____/___  ____  / /____  _  __/ /_    
 / /   / __ \/ __ \/ __/ _ \| |/_/ __/    
/ /___/ /_/ / / / / /_/  __/>  </ /_      
\____/\____/_/ /_/\__/\___/_/|_|\__/      
    ____  __      __  ____                
   / __ \/ /___ _/ /_/ __/___  _________ ___ 
  / /_/ / / __ `/ __/ /_/ __ \/ ___/ __ `__ \
 / ____/ / /_/ / /_/ __/ /_/ / /  / / / / / /
/_/   /_/\__,_/\__/_/  \____/_/  /_/ /_/ /_/ 
                                             
```

> **The AI-Powered Workbench for Structured Thinking & Architecture Planning** 

---

## 📖 Table of Contents

- [Introduction](#-introduction)
- [Key Features](#-key-features)
- [Methodology](#-methodology)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

---

## 🧠 Introduction

**Context Platform** is a specialized IDE for thought. It transforms the way you solve complex problems by combining the **Pyramid Principle** with **Generative AI**. Instead of staring at a blank page, you build structured logic trees, define product requirements, and map out technical architectures—all with Claude AI as your pair thinker.

It is designed for:
*   **Product Managers** defining scope and requirements.
*   **Architects** planning system components and data flows.
*   **Engineers** breaking down technical tasks.
*   **Founders** organizing business strategy.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **Thinking Pyramids** | Break down broad problems into specific, actionable questions using a visual tree structure. |
| **AI Co-Pilot** | Integrated **Claude AI** helps generate sub-questions, answers, and summaries at every level of your thinking process. |
| **Product Specs** | Dedicated editors for defining **Product Definitions**, scope, risks, and success metrics. |
| **Architecture** | Visual tools for mapping **Technical Architectures** and **UI/UX Flows**. |
| **Context Awareness** | Upload documents and define a "Global Context" so the AI understands your specific project domain. |
| **Real-Time Sync** | Built on **Firebase**, enabling seamless synchronization across devices and users. |

---

## � Methodology

The platform is built around the **Pyramid Principle**:

1.  **Start with the Core Question**: What are you trying to solve?
2.  **Group & Summarize**: Group related insights and summarize them upwards.
3.  **MECE**: Ensure your breakdown is *Mutually Exclusive and Collectively Exhaustive*.

```text
       [ Main Problem ]
           /      \
      [Why?]      [How?]
      /    \      /    \
   [A]     [B]  [C]    [D]
```

---

## 🛠 Tech Stack

**Frontend**
*   ![React](https://img.shields.io/badge/-React-20232A?logo=react&logoColor=61DAFB) **React 18** - UI Library
*   ![TypeScript](https://img.shields.io/badge/-TypeScript-007ACC?logo=typescript&logoColor=white) **TypeScript** - Type Safety
*   ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white) **Vite** - Build Tool
*   ![Tailwind](https://img.shields.io/badge/-Tailwind-38B2AC?logo=tailwind-css&logoColor=white) **Tailwind CSS** - Styling
*   ![Radix UI](https://img.shields.io/badge/-Radix%20UI-161618?logo=radix-ui&logoColor=white) **Radix UI** - Accessible Primitives

**Backend & Services**
*   ![Firebase](https://img.shields.io/badge/-Firebase-FFCA28?logo=firebase&logoColor=black) **Firebase** - Auth, Firestore, Hosting
*   ![Anthropic](https://img.shields.io/badge/-Anthropic-d97757) **Anthropic API** - AI Intelligence (Claude models)

---

## 🚀 Getting Started

### Prerequisites

*   **Node.js** (v16+)
*   **Firebase Account** (for backend)
*   **Anthropic API Key** (for AI features)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/context-platform.git
    cd context-platform
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```bash
    cp .env.example .env
    ```
    
    Update `.env` with your credentials:
    ```properties
    VITE_FIREBASE_API_KEY=...
    VITE_FIREBASE_AUTH_DOMAIN=...
    VITE_FIREBASE_PROJECT_ID=...
    # ... other firebase config
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

---

## ⚙️ Configuration

### Setting up AI (Claude)
1.  Launch the application.
2.  Navigate to **Settings** or click the **"Set API Key"** button in the top bar.
3.  Paste your **Anthropic API Key**.
    *   *Note: The key is stored securely in your user profile in Firestore.*

---

## 🚢 Deployment

Deploy to Firebase Hosting with a single command:

```bash
npm run deploy
```
*This script builds the application (`vite build`) and deploys it (`firebase deploy`).*

---

## 🤝 Contributing

1.  **Fork** the project.
2.  **Create** your feature branch (`git checkout -b feature/NewFeature`).
3.  **Commit** your changes (`git commit -m 'Add some NewFeature'`).
4.  **Push** to the branch (`git push origin feature/NewFeature`).
5.  **Open** a Pull Request.

---

> **Happy Thinking!** 🧩
