# 🚀 Quick Start Guide

Get T4U up and running in 5 minutes!

## Step 1: Create Environment File

```bash
cp .env.example .env.local
```

## Step 2: Get Firebase Credentials

### Option A: Use Existing Firebase Project

If you already have the Firebase credentials:

1. Open `.env.local` in your editor
2. Paste your Firebase configuration values
3. Skip to **Step 3**

### Option B: Create New Firebase Project

1. **Go to Firebase Console**  
   👉 https://console.firebase.google.com/

2. **Create a new project** (or select existing)
   - Click "Add project"
   - Enter project name (e.g., "t4u-test")
   - Accept terms and create

3. **Enable Authentication**
   - In left sidebar, click "Authentication"
   - Click "Get started"
   - Click "Sign-in method" tab
   - Enable "Google" provider
   - Click "Save"

4. **Enable Firestore Database**
   - In left sidebar, click "Firestore Database"
   - Click "Create database"
   - Select "Start in production mode"
   - Choose a location
   - Click "Enable"

5. **Get Web App Credentials**
   - Click the gear icon ⚙️ (top left) → "Project settings"
   - Scroll down to "Your apps"
   - Click the web icon `</>` ("Add app")
   - Register app with a nickname (e.g., "t4u-web")
   - Copy the `firebaseConfig` object values

6. **Add Credentials to `.env.local`**

```bash
# Copy these values from Firebase Console
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Step 3: Configure Backend API

Add your backend API URL to `.env.local`:

```bash
# For local development (if running backend locally)
NEXT_PUBLIC_API_URL=http://localhost:8000

# OR for production backend
# NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

> **⚠️ Note**: The backend API is required for test execution features.  
> See: https://github.com/t4u-automation/t4u-backend

## Step 4: Set Up Firebase Functions

Install dependencies for Cloud Functions:

```bash
cd functions
npm install
npm run build
cd ..
```

## Step 5: Deploy Firestore Rules and Functions

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in this project (select Firestore and Functions)
firebase init

# Deploy security rules and functions
firebase deploy --only firestore:rules,functions
```

> **What do Functions do?**
> - Automatically update project statistics when test cases change
> - Clean up test plans when test cases are deleted
> - Other automated background tasks

Or manually copy rules from `firestore.rules` in the Firebase Console.

## Step 6: Install Dependencies

```bash
npm install
```

## Step 7: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser! 🎉

## ✅ You're Done!

You should now see the T4U login page. Sign in with your Google account to get started.

---

## 🔧 Troubleshooting

### Error: Missing Firebase environment variables

- Make sure you created `.env.local` (not `.env`)
- Check that all variables are correctly copied (no extra spaces)
- Restart the dev server after editing `.env.local`

### Error: Firebase auth/invalid-api-key

- Your API key in `.env.local` is incorrect
- Copy the exact value from Firebase Console
- Make sure there are no quotes around the value

### Can't sign in with Google

- Check that Google Sign-in is enabled in Firebase Console
- Go to Authentication → Sign-in method → Google → Enable

### Database permission errors

- Deploy Firestore security rules: `firebase deploy --only firestore:rules`
- Or copy `firestore.rules` content to Firebase Console → Firestore → Rules

---

Need more help? Check the [full README](./README.md) or [open an issue](https://github.com/t4u-automation/t4u-frontend/issues).

