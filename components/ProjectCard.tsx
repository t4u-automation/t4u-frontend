"use client";

import { Project } from "@/types";
import { Star, Folder, Layers, ClipboardCheck } from "lucide-react";
import { useState } from "react";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  successRate?: number;
}

export default function ProjectCard({
  project,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  successRate,
}: ProjectCardProps) {
  const stats = project.stats || { features: 0, stories: 0, test_cases: 0 };
  const [isHovered, setIsHovered] = useState(false);

  // Generate color from project name
  const getProjectColor = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-yellow-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-orange-500",
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    const words = name.split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      id="ProjectCard"
      className="group bg-white rounded-[12px] border border-[var(--border-main)] shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header */}
      <div className="p-4 pb-3 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Project Icon */}
            <div
              id="ProjectIcon"
              className={`w-10 h-10 rounded-lg ${getProjectColor(
                project.name
              )} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-white font-bold text-sm">
                {getInitials(project.name)}
              </span>
            </div>

            {/* Project Name */}
            <div className="flex-1 min-w-0">
              <h3
                id="ProjectName"
                className="text-[var(--text-primary)] font-semibold text-base truncate"
                title={project.name}
              >
                {project.name}
              </h3>
            </div>
          </div>

          {/* Favorite Star */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            className="flex-shrink-0 p-1 hover:bg-[var(--fill-tsp-gray-main)] rounded transition-colors"
          >
            <Star
              size={18}
              className={`${
                isFavorite
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-[var(--icon-tertiary)]"
              }`}
            />
          </button>
        </div>

        {/* Description - Always reserve space */}
        <div className="min-h-[3rem] mb-3">
          {project.description && (
            <p
              id="ProjectDescription"
              className="text-sm text-[var(--text-secondary)] line-clamp-2"
            >
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Card Stats */}
      <div className="px-4 py-3 bg-[var(--fill-tsp-white-light)] border-t border-[var(--border-light)] flex items-center gap-4">
        {/* Features Count */}
        <div className="flex items-center gap-1.5 group/stat relative">
          <Layers size={16} className="text-[var(--icon-secondary)]" />
          <span className="text-sm text-[var(--text-secondary)]">
            {stats.features}
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/stat:opacity-100 group-hover/stat:visible transition-all pointer-events-none">
            Features
          </div>
        </div>

        {/* Stories Count */}
        <div className="flex items-center gap-1.5 group/stat relative">
          <Folder size={16} className="text-[var(--icon-secondary)]" />
          <span className="text-sm text-[var(--text-secondary)]">
            {stats.stories}
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/stat:opacity-100 group-hover/stat:visible transition-all pointer-events-none">
            Stories
          </div>
        </div>

        {/* Test Cases Count */}
        <div className="flex items-center gap-1.5 group/stat relative">
          <ClipboardCheck size={16} className="text-[var(--icon-secondary)]" />
          <span className="text-sm text-[var(--text-secondary)]">
            {stats.test_cases}
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/stat:opacity-100 group-hover/stat:visible transition-all pointer-events-none">
            Test Cases
          </div>
        </div>

        {/* Success Rate */}
        {successRate !== undefined && (
          <div className="flex items-center gap-1.5 ml-auto group/stat relative">
            <div className="relative w-4 h-4">
              <svg className="transform -rotate-90" viewBox="0 0 16 16">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke={
                    successRate >= 80
                      ? "#22c55e"
                      : successRate >= 50
                      ? "#f59e0b"
                      : "#ef4444"
                  }
                  strokeWidth="2"
                  strokeDasharray={`${(successRate / 100) * 37.7} 37.7`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-sm text-[var(--text-secondary)]">
              {successRate}%
            </span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover/stat:opacity-100 group-hover/stat:visible transition-all pointer-events-none">
              Success Rate
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

