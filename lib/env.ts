export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
  maxSteps: 100,
} as const;


// Validate required environment variables
if (typeof window === 'undefined' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    '⚠️  WARNING: NEXT_PUBLIC_API_URL is not set. Please configure your backend API URL in .env.local'
  );
}

