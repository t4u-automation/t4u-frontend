"use client";

import ProjectDetailsContent from "@/components/ProjectDetailsContent";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  useEffect(() => {
    if (!projectId) {
      router.push("/projects");
    }
  }, [projectId, router]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  return <ProjectDetailsContent projectId={projectId} />;
}

