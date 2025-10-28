"use client";

import ChatView from "@/components/ChatView";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import WelcomeScreen from "@/components/WelcomeScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useResponsiveVNC } from "@/hooks/useResponsiveVNC";
import { useSession } from "@/hooks/useSession";
import { useTenant } from "@/hooks/useTenant";
import { startAgent } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, needsOnboarding } = useTenant(user);
  const router = useRouter();
  const {
    currentSession,
    vncUrl,
    isVNCActive,
    artifacts,
    totalCost,
    totalTokens,
    loadSession,
    clearSession,
  } = useSession();
  const {
    isSmallScreen,
    showVNCDropdown,
    hasOpenedDropdown,
    openVNCDropdown,
    closeVNCDropdown,
  } = useResponsiveVNC();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const loading = authLoading || tenantLoading;

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (needsOnboarding) {
        // Redirect to root for onboarding
        router.push("/");
      }
    }
  }, [user, loading, needsOnboarding, router]);

  const handleNewTask = () => {
    clearSession();
    setSelectedTaskId(null);
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
    loadSession(taskId, tenant?.id);
  };

  const handleSubmit = async (prompt: string) => {
    if (!user || !tenant) return;

    setIsSubmitting(true);

    try {
      await startAgent(prompt, user.uid, (event) => {
        if (event.type === "session_created" && event.session_id) {
          setSelectedTaskId(event.session_id);
          loadSession(event.session_id, tenant.id);
          // Enable input once session is created and running
          setIsSubmitting(false);
        }

        if (
          event.type === "completed" ||
          event.type === "error" ||
          event.type === "cleanup"
        ) {
          // Keep enabled for parallel sessions
          setIsSubmitting(false);
        }
      }, undefined, tenant.id); // No testCaseId for general sessions
    } catch (error) {
      console.error("[HomePage] Error:", error);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div id="MainLayout" className="flex w-full h-screen overflow-hidden">
      <Sidebar
        selectedTaskId={selectedTaskId || undefined}
        onTaskSelect={handleTaskSelect}
        onNewTask={handleNewTask}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isExpanded={isSidebarExpanded}
        onToggleExpanded={() => setIsSidebarExpanded(!isSidebarExpanded)}
      />

      <div id="MainContentArea" className="flex-1 flex flex-col min-w-0">
        <Header
          showVNCButton={isSmallScreen && !!currentSession}
          onVNCClick={openVNCDropdown}
          isVNCActive={isVNCActive}
          showSidebarToggle={isSmallScreen}
          onSidebarToggle={() => setIsSidebarOpen(true)}
          isSmallScreen={isSmallScreen}
        />

        {currentSession ? (
          <ChatView
            session={currentSession}
            vncUrl={vncUrl}
            isVNCActive={isVNCActive}
            artifacts={artifacts}
            totalCost={totalCost}
            totalTokens={totalTokens}
            vncDropdownState={{
              isSmallScreen,
              showVNCDropdown,
              hasOpenedDropdown,
              closeVNCDropdown,
            }}
          />
        ) : (
          <WelcomeScreen onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        )}
      </div>
    </div>
  );
}
