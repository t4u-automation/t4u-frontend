"use client";

import { useState } from "react";
import { Building2, ArrowRight } from "lucide-react";

interface OnboardingScreenProps {
  onSubmit: (companyName: string) => Promise<void>;
}

export default function OnboardingScreen({ onSubmit }: OnboardingScreenProps) {
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      setError("Please enter your company name");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(companyName.trim());
    } catch (error) {
      console.error("[OnboardingScreen] Error:", error);
      setError("Failed to create company. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="OnboardingScreen"
      className="flex w-full h-screen items-center justify-center bg-[var(--background-gray-main)]"
    >
      <div className="w-full max-w-md px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[var(--Button-primary-black)] flex items-center justify-center">
              <Building2 size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
            Welcome to T4U
          </h1>
          <p className="text-[var(--text-secondary)] text-base">
            Let&apos;s get started by setting up your workspace
          </p>
        </div>

        {/* Onboarding Form */}
        <div
          id="OnboardingCard"
          className="bg-white rounded-[16px] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.08)] border border-[var(--border-main)] p-8"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Company Name Input */}
            <div>
              <label
                htmlFor="CompanyNameInput"
                className="block text-sm font-medium text-[var(--text-primary)] mb-2"
              >
                Company Name
              </label>
              <input
                id="CompanyNameInput"
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                placeholder="e.g., Acme Corporation"
                className="w-full px-4 py-3 bg-white border border-[var(--border-main)] rounded-[10px] text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-[var(--function-error)]">
                  {error}
                </p>
              )}
            </div>

            {/* Info Text */}
            <div className="bg-[var(--fill-tsp-white-light)] rounded-[10px] p-4 border border-[var(--border-light)]">
              <p className="text-sm text-[var(--text-secondary)]">
                Your company workspace will include:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
                <li className="flex items-center gap-2">
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <span>Projects and test organization</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <span>AI-powered test automation</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--text-tertiary)]">•</span>
                  <span>Team collaboration (coming soon)</span>
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              id="OnboardingSubmitButton"
              type="submit"
              disabled={isSubmitting || !companyName.trim()}
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[var(--Button-primary-black)] text-white rounded-[10px] font-medium text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-[var(--text-tertiary)] mt-6">
          You can invite team members after setting up your workspace
        </p>
      </div>
    </div>
  );
}

