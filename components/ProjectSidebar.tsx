"use client";

import { TestTube2, Settings, ClipboardList, Play } from "lucide-react";

interface ProjectSidebarProps {
  projectId: string;
  activeItem?: string;
  isOwner?: boolean;
  canManageTeam?: boolean;
  onNavigate?: (item: string) => void;
}

export default function ProjectSidebar({
  projectId,
  activeItem = "test-cases",
  isOwner = false,
  canManageTeam = false,
  onNavigate,
}: ProjectSidebarProps) {
  const menuItems = [
    {
      id: "test-cases",
      label: "Test cases",
      icon: TestTube2,
      showForAll: true,
    },
    {
      id: "test-plans",
      label: "Test plans",
      icon: ClipboardList,
      showForAll: true,
    },
    {
      id: "runs",
      label: "Runs",
      icon: Play,
      showForAll: true,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      showForAll: false, // Only for owners and admins
      requiresAdmin: true,
    },
  ];

  return (
    <aside
      id="ProjectSidebar"
      className="w-48 bg-white border-r border-[var(--border-main)] flex flex-col flex-shrink-0"
    >
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {menuItems.map((item) => {
          // Show item if it's for all users OR if user has admin permissions (for settings)
          if (!item.showForAll && item.requiresAdmin && !canManageTeam) {
            return null;
          }
          // Fallback to isOwner for backward compatibility on other items
          if (!item.showForAll && !item.requiresAdmin && !isOwner) {
            return null;
          }

          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-[6px] transition-colors text-left ${
                isActive
                  ? "bg-[var(--fill-tsp-gray-main)] text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--fill-tsp-white-light)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={16} />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

