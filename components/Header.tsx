"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Monitor, PanelLeft, Settings } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  showVNCButton?: boolean;
  onVNCClick?: () => void;
  isVNCActive?: boolean;
  showSidebarToggle?: boolean;
  onSidebarToggle?: () => void;
  isSmallScreen?: boolean;
  showSettingsButton?: boolean;
  userRole?: string | null;
}

export default function Header({
  showVNCButton = false,
  onVNCClick,
  isVNCActive = false,
  showSidebarToggle = false,
  onSidebarToggle,
  isSmallScreen = false,
  showSettingsButton = false,
  userRole = null,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await logout();
    setShowUserMenu(false);
    router.push("/login");
  };

  const handleLogoClick = () => {
    router.push("/projects");
  };

  return (
    <div
      id="Header"
      className="w-full pt-4 pb-4 px-5 bg-[var(--background-gray-main)] sticky top-0 z-10"
    >
      <div className="flex justify-between items-center w-full">
        {/* Left Side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Sidebar Toggle for small screens only */}
          {isSmallScreen && showSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className="flex h-8 w-8 items-center justify-center cursor-pointer rounded-md hover:bg-[var(--fill-tsp-gray-main)] transition-colors"
            >
              <PanelLeft size={20} className="text-[var(--icon-secondary)]" />
            </button>
          )}

          {/* Logo - always show on desktop, hidden on mobile when sidebar toggle is shown */}
          {(!isSmallScreen || !showSidebarToggle) && (
            <button
              id="Logo"
              onClick={handleLogoClick}
              className="h-8 relative z-20 overflow-hidden flex gap-2 items-center cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-none p-0"
            >
              <span className="text-2xl font-bold text-[var(--logo-color)]">
                T4U
              </span>
            </button>
          )}
        </div>

        {/* Center Title on small screens only when sidebar toggle is shown */}
        {isSmallScreen && showSidebarToggle && (
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <span className="text-xl font-bold text-[var(--logo-color)]">
              T4U
            </span>
          </div>
        )}

        {/* Right Side - Actions */}
        <div id="HeaderActions" className="flex items-center gap-2">
          {/* VNC Button for small screens */}
          {showVNCButton && (
            <button
              onClick={onVNCClick}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border-main)] hover:bg-[var(--fill-tsp-gray-main)] transition-colors"
              title="Open VNC Viewer"
            >
              <Monitor
                size={16}
                className={`${
                  isVNCActive ? "text-green-500" : "text-[var(--icon-primary)]"
                }`}
              />
            </button>
          )}

          {/* Settings Button - only show for admin/owner */}
          {showSettingsButton && (userRole === "owner" || userRole === "admin") && (
            <button
              onClick={() => router.push("/settings")}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border-main)] hover:bg-[var(--fill-tsp-gray-main)] transition-colors"
              title="Settings"
            >
              <Settings
                size={16}
                className="text-[var(--icon-primary)]"
              />
            </button>
          )}

          {user && (
            <div className="relative">
              <div
                id="UserAvatar"
                className="flex items-center cursor-pointer"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="relative flex items-center justify-center font-bold cursor-pointer flex-shrink-0">
                  <div
                    className="relative flex items-center justify-center font-bold flex-shrink-0 rounded-full overflow-hidden"
                    style={{ width: "32px", height: "32px" }}
                  >
                    <Image
                      className="w-full h-full object-cover overflow-hidden"
                      src={
                        user.photoURL || "https://via.placeholder.com/32?text=U"
                      }
                      alt={user.displayName || "User"}
                      width={32}
                      height={32}
                      unoptimized={!user.photoURL}
                    />
                  </div>
                  <Image
                    className="absolute bottom-[-2px] right-[-2px] w-[12px] h-[12px]"
                    alt="membership"
                    src="https://files.manuscdn.com/webapp/_next/static/media/BasicMembershipIcon.3f518a85.svg"
                    width={12}
                    height={12}
                    unoptimized
                  />
                </div>
              </div>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <>
                  <div
                    id="UserMenu"
                    className="absolute top-12 right-0 w-[280px] bg-white rounded-[16px] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] border border-[var(--border-main)] p-4 flex flex-col gap-3 z-50"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-main)]">
                      <div
                        className="relative flex items-center justify-center flex-shrink-0 rounded-full overflow-hidden"
                        style={{ width: "48px", height: "48px" }}
                      >
                        <Image
                          className="w-full h-full object-cover"
                          src={
                            user.photoURL ||
                            "https://via.placeholder.com/48?text=U"
                          }
                          alt={user.displayName || "User"}
                          width={48}
                          height={48}
                          unoptimized={!user.photoURL}
                        />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[var(--text-primary)] font-semibold text-base truncate">
                          {user.displayName || "User"}
                        </span>
                        <span className="text-[var(--text-tertiary)] text-sm truncate">
                          {user.email}
                        </span>
                      </div>
                    </div>

                    {/* Sign Out Button */}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-[8px] hover:bg-[var(--fill-tsp-white-main)] transition-colors text-left"
                    >
                      <LogOut
                        size={18}
                        className="text-[var(--function-error)]"
                      />
                      <span className="text-[var(--function-error)] text-sm font-medium">
                        Sign out
                      </span>
                    </button>
                  </div>

                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
