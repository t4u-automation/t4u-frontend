# T4U (Test For You)

An open-source, AI-powered test automation platform built with React, Next.js, and Firebase. T4U provides an intelligent testing environment with real-time browser preview, automated test execution, and comprehensive test case management.

![Demo](./public/demo.gif)

## 🚀 Features

- **AI-Powered Testing**: Automated test execution with intelligent browser automation
- **Real-time VNC**: Live browser preview during test execution
- **Test Management**: Complete test case, test plan, and run management
- **Firebase Integration**: Authentication, Firestore database, Cloud Functions, and real-time sync
- **Multi-tenant Architecture**: Secure isolation for multiple organizations
- **Modern UI**: Built with Next.js 15, React 19, and Tailwind CSS
- **Automated Stats**: Cloud Functions automatically update project statistics

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Firebase account** (for authentication and database)
- **T4U Backend API server** (for AI-powered test execution)
  - ⚠️ **Important**: This frontend requires the T4U backend API to function
  - See backend setup: [t4u-automation/t4u-backend](https://github.com/t4u-automation/t4u-backend) (coming soon)
  - Or run your own compatible API server

## 🛠️ Setup

> **🚀 Quick Start**: For a faster setup, see [QUICK_START.md](./QUICK_START.md)

### 1. Clone the Repository

```bash
git clone https://github.com/t4u-automation/t4u-frontend.git
cd t4u-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and configure your environment:

```bash
# ==============================================================================
# Backend API URL (REQUIRED)
# ==============================================================================
# Point this to your T4U backend API server
# For local development (if running backend locally):
NEXT_PUBLIC_API_URL=http://localhost:8000

# For production:
# NEXT_PUBLIC_API_URL=https://your-api-domain.com

# ==============================================================================
# Firebase Configuration (REQUIRED)
# ==============================================================================
# Get these from Firebase Console: https://console.firebase.google.com/
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

> **⚠️ Important**: Both the backend API URL and Firebase credentials are required for the application to work.

### 4. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication** → Enable Google Sign-in provider
4. Enable **Firestore Database** → Create in production mode
5. Copy your web app credentials to `.env.local`

### 5. Set Up Firebase Functions

The project uses Firebase Cloud Functions for automated tasks (e.g., updating project stats).

**Install Function Dependencies:**

```bash
cd functions
npm install
cd ..
```

**Build Functions:**

```bash
cd functions
npm run build
cd ..
```

### 6. Deploy Firestore Rules and Functions

**Deploy Everything:**

```bash
# Make sure you're logged in to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init

# Deploy Firestore rules and Functions
firebase deploy --only firestore:rules,functions
```

**Or Deploy Separately:**

```bash
# Deploy only Firestore rules
firebase deploy --only firestore:rules

# Deploy only Functions
firebase deploy --only functions
```

**Test Functions Locally (Optional):**

```bash
cd functions
npm run serve  # Starts Firebase emulators
```

Or manually copy the rules from `firestore.rules` in the Firebase Console.

### 7. Start the Backend API

Before running the frontend, ensure your T4U backend API server is running:

```bash
# If running locally on port 8000
# See backend repository for setup instructions
```

### 8. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note**: If the backend API is not running or not configured, you'll see a warning in the console.

## 🏗️ Build for Production

```bash
npm run build
npm start
```

Or deploy to Vercel:

```bash
vercel deploy
```

## Features

### ✅ Authentication

- Google Sign-in with Firebase
- Protected routes
- Session management
- Token storage

### ✅ Real-time Task Management

- Firestore listeners for agent_sessions
- Auto-updating task list in sidebar
- Task selection with white background highlight

### ✅ Chat Interface

- Welcome screen with task input
- Chat view with message history
- Collapsible steps section
- Tool call pills (Browsing, Typing, Clicking, etc.)

### ✅ noVNC Integration

- Live browser preview
- Dynamic RFB loading
- Auto-connect on VNC URL availability
- Green/Red live indicator

### ✅ SSE Backend Integration

- POST to `/agent/start` with prompt
- Real-time event streaming
- Session creation handling
- Automatic Firestore sync

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Root redirector
│   ├── login/              # Login page
│   ├── home/               # Home page
│   ├── projects/           # Projects listing
│   ├── project/[id]/       # Project details
│   └── test-plan/[id]/     # Test plan viewer
├── components/             # React components
│   ├── Header.tsx          # Top navigation
│   ├── ProjectCard.tsx     # Project card component
│   ├── TestCaseTree.tsx    # Hierarchical test case tree
│   ├── RunDetails.tsx      # Test run details
│   └── ...                 # 30+ components
├── contexts/
│   ├── AuthContext.tsx     # Firebase authentication
│   └── ToastContext.tsx    # Toast notifications
├── hooks/                  # Custom React hooks
│   ├── useAgentSessions.ts # Agent sessions listener
│   ├── useTenant.ts        # Multi-tenant management
│   └── useUserPreferences.ts # User preferences
├── lib/
│   ├── firebase.ts         # Firebase initialization
│   ├── t4u.ts              # Firestore CRUD operations
│   ├── api.ts              # Backend API calls
│   └── env.ts              # Environment config
├── functions/              # Firebase Cloud Functions
│   ├── src/
│   │   └── index.ts        # Function definitions
│   └── package.json        # Function dependencies
├── types/
│   └── index.ts            # TypeScript type definitions
└── firestore.rules         # Firestore security rules
```

## Technology Stack

### State Management

- React hooks for component state
- `useState` for local state
- `useEffect` for side effects
- Context API for global auth state

### Firestore Integration

- Firebase SDK v9 modular imports
- `onSnapshot` for real-time listeners
- Custom hooks for data fetching

### noVNC

- Dynamic import to avoid build issues
- `useRef` for DOM element reference
- `useEffect` for connection lifecycle

### Routing

- Next.js App Router (file-based)
- Client components with `'use client'` directive
- `useRouter` for navigation

## Component IDs

All elements have HTML IDs for easy identification and testing:

- **Sidebar**: `Sidebar`, `ToggleSidebarButton`, `SearchButton`, `NewTaskButton`, `TaskList`
- **Header**: `Header`, `Logo`, `HeaderActions`, `UserAvatar`, `UserMenu`
- **TaskItem**: `TaskItem`, `TaskIcon`, `TaskTitle`, `TaskSubtitle`, `TaskDate`, `TaskMenu`
- **Welcome**: `Home`, `WelcomeSection`, `WelcomeHeading`, `InputContainer`, `TaskInput`, `SendButton`
- **ChatView**: `ChatView`, `ChatMessagesPanel`, `MessagesContainer`, `ChatInput`, `ChatSendButton`
- **BrowserPreview**: `BrowserPreview`, `BrowserFrame`, `VNCScreen`, `LiveIndicator`
- **MessageItem**: `UserMessage`, `AIMessage`, `StepsSection`, `StepHeader`, `ToolCallPill`, `ThinkingText`

## Development

### Running the Application

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Backend Connection

The application requires a T4U backend API server for:
- AI-powered test execution
- Test case automation
- Real-time test running with browser automation
- VNC session management

The backend URL is configured via `NEXT_PUBLIC_API_URL` in your `.env.local` file.

For real-time data synchronization (test cases, projects, runs), the app uses Firebase Firestore.

### Firebase Cloud Functions

The project includes Firebase Cloud Functions for automated background tasks:

**`updateProjectStatsOnTestCase`**
- Automatically updates project statistics when test cases are created, updated, or deleted
- Keeps feature, story, and test case counts in sync
- Triggered on any `test_cases` collection change

**`removeTestCaseFromTestPlans`** 
- Cleans up test plans when test cases are deleted
- Removes deleted test case references from all test plans
- Maintains test plan integrity

These functions run server-side and require deployment to Firebase. See [functions/README.md](./functions/README.md) for details.

## 📚 Architecture

- **Frontend Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS custom properties
- **State Management**: React hooks + Context API
- **Database**: Firebase Firestore (NoSQL, real-time)
- **Authentication**: Firebase Authentication (Google OAuth)
- **Real-time**: Server-Sent Events (SSE) for agent communication
- **VNC Integration**: noVNC for live browser preview

For detailed architecture documentation, see [T4U_ARCHITECTURE.md](./T4U_ARCHITECTURE.md).

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and commit: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Firebase](https://firebase.google.com/)
- VNC integration via [noVNC](https://novnc.com/)

## 🔧 Troubleshooting

### Backend API Not Connected

If you see errors about the backend API not being available:

1. **Check your `.env.local` file** - Ensure `NEXT_PUBLIC_API_URL` is set
2. **Verify the backend is running** - The backend API server must be running and accessible
3. **Check the URL format** - Should be `http://localhost:8000` (no trailing slash)
4. **Check console logs** - Look for warnings about missing environment variables
5. **Restart the dev server** - Environment variables are loaded at startup

### Firebase Connection Issues

If authentication or database operations fail:

1. **Verify Firebase credentials** - All `NEXT_PUBLIC_FIREBASE_*` variables must be set
2. **Check Firebase Console** - Ensure Google Sign-in is enabled
3. **Check Firestore rules** - Rules must be deployed to Firebase
4. **Check browser console** - Look for Firebase-specific errors

### Common Issues

- **"API_URL is not set" warning**: Add `NEXT_PUBLIC_API_URL` to `.env.local`
- **Can't sign in**: Enable Google authentication in Firebase Console
- **Database errors**: Deploy Firestore security rules
- **Port already in use**: Change the port with `npm run dev -- -p 3001`

## 📞 Support

- 📖 [Documentation](./T4U_ARCHITECTURE.md)
- 🐛 [Issue Tracker](https://github.com/t4u-automation/t4u-frontend/issues)
- 💬 [Discussions](https://github.com/t4u-automation/t4u-frontend/discussions)

## 🔗 Related Repositories

- [T4U Backend](https://github.com/t4u-automation/t4u-backend) - Backend API server (coming soon)

---

Made with ❤️ by the T4U Team
