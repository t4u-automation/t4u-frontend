# Firebase Cloud Functions

This directory contains Firebase Cloud Functions for the T4U platform.

## Functions Overview

### `updateProjectStatsOnTestCase`

**Type**: Firestore Trigger  
**Trigger**: `test_cases/{testCaseId}` - `onWrite` (create, update, delete)

**Purpose**: Automatically updates project statistics when test cases are modified.

**What it does**:
1. When a test case is created, updated, or deleted
2. Finds the parent project (via story → feature → project chain)
3. Recounts all features, stories, and test cases in that project
4. Updates the `projects/{projectId}/stats` field with latest counts

**Stats tracked**:
```typescript
{
  features: number,      // Count of features in project
  stories: number,       // Count of stories in project
  test_cases: number,    // Count of test cases in project
}
```

### `removeTestCaseFromTestPlans`

**Type**: Helper function (called by `updateProjectStatsOnTestCase`)

**Purpose**: Cleans up test plans when a test case is deleted.

**What it does**:
1. Finds all test plans that contain the deleted test case
2. Removes the test case ID from their `test_case_ids` array
3. Updates the `test_cases_count` field
4. Updates the `updated_at` timestamp

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Build Functions

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `lib/` directory.

### 3. Deploy to Firebase

```bash
# Deploy all functions
firebase deploy --only functions

# Or from the functions directory
npm run deploy
```

## Development

### Build and Watch

```bash
npm run build
```

### Test Locally with Emulators

```bash
npm run serve
```

This starts the Firebase Emulator Suite with Functions enabled.

### View Function Logs

```bash
npm run logs

# Or for real-time logs
firebase functions:log --only updateProjectStatsOnTestCase
```

### Test Function with Firebase Shell

```bash
npm run shell
```

Then in the shell:
```javascript
updateProjectStatsOnTestCase({ /* test data */ })
```

## Function Configuration

### Node.js Version

Functions run on **Node.js 20** (specified in `package.json`).

### Dependencies

- `firebase-admin`: Server-side Firebase SDK
- `firebase-functions`: Cloud Functions SDK

### Build Output

- Source: `src/index.ts`
- Compiled: `lib/index.js`
- Source maps: `lib/index.js.map`

## Deployment

### Production Deploy

```bash
firebase deploy --only functions
```

### Specific Function

```bash
firebase deploy --only functions:updateProjectStatsOnTestCase
```

### With Firestore Rules

```bash
firebase deploy --only firestore:rules,functions
```

## Monitoring

### View Logs in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Functions → Logs
4. Filter by function name or error level

### Performance Metrics

- Invocations count
- Execution time
- Error rate
- Memory usage

Available in Firebase Console → Functions → Dashboard

## Troubleshooting

### Function not deploying

- Check Node.js version matches `package.json` engines
- Ensure `npm run build` completes without errors
- Verify Firebase CLI is logged in: `firebase login`

### Function not triggering

- Check Firestore security rules allow writes
- Verify the collection/document path matches the trigger
- Check function logs for errors

### Build errors

- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript version compatibility
- Ensure `tsconfig.json` is properly configured

## Best Practices

1. **Always build before deploying**: `npm run build && firebase deploy --only functions`
2. **Test locally first**: Use Firebase Emulators before deploying
3. **Monitor logs**: Check logs after deployment for any errors
4. **Keep functions small**: Each function should do one thing well
5. **Handle errors**: Always wrap async code in try-catch blocks

## Cost Considerations

Cloud Functions pricing is based on:
- Number of invocations
- Compute time
- Memory allocated
- Network egress

For pricing details, see: https://firebase.google.com/pricing

## Security

- Functions run with Firebase Admin privileges
- They bypass Firestore security rules
- Always validate data before writing to Firestore
- Never trust data from client-side triggers

---

For more information, see [Firebase Functions Documentation](https://firebase.google.com/docs/functions).

