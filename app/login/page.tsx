"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/projects");
    }
  }, [user, router]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex w-full h-screen items-center justify-center bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[var(--background-gray-main)]">
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="w-full max-w-md px-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[var(--logo-color)] mb-2">
              T4U
            </h1>
            <p className="text-[var(--text-tertiary)] text-base">
              Sign in to continue
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-[16px] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.08)] border border-[var(--border-main)] p-8">
            <div className="flex flex-col gap-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="inline-flex items-center justify-center gap-3 w-full px-6 py-3 bg-white border-2 border-[var(--border-main)] rounded-[10px] hover:bg-[var(--fill-tsp-white-main)] transition-colors text-[var(--text-primary)] font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{loading ? "Signing in..." : "Sign in with Google"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
