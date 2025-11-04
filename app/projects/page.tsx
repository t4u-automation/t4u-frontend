"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "@/components/Header";
import { Plus, Search, LayoutGrid, List, FolderOpen, Star, Layers, Folder, ClipboardCheck } from "lucide-react";
import ProjectCard from "@/components/ProjectCard";
import CreateProjectModal from "@/components/CreateProjectModal";
import { Project, T4UUser } from "@/types";
import { getTenantProjects, createProject } from "@/lib/firestore/projects";

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, needsOnboarding } = useTenant(user);
  const { favoriteProjects, toggleFavorite: toggleFavoriteProject } = useUserPreferences(
    user?.uid,
    tenant?.id
  );
  const { showSuccess, showError } = useToast();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeTab, setActiveTab] = useState<"my" | "favorites">("my");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState<T4UUser["role"] | null>(null);

  const loading = authLoading || tenantLoading;
  const favoriteProjectIds = new Set(favoriteProjects);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (needsOnboarding) {
        router.push("/");
      }
    }
  }, [user, loading, needsOnboarding, router]);

  useEffect(() => {
    if (tenant) {
      loadProjects();
    }
  }, [tenant]);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as T4UUser;
        setUserRole(userData.role);
      }
    } catch (error) {
      console.error("[ProjectsPage] Error checking user role:", error);
    }
  };

  const loadProjects = async () => {
    if (!tenant) return;

    try {
      setLoadingProjects(true);
      const fetchedProjects = await getTenantProjects(tenant.id);
      setProjects(fetchedProjects);
    } catch (error) {
      console.error("[ProjectsPage] Error loading projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleCreateProject = async (name: string, description?: string) => {
    if (!tenant || !user) return;

    try {
      const newProject = await createProject(tenant.id, user.uid, name, description);
      setProjects([newProject, ...projects]);
      showSuccess(`Project "${name}" created successfully`);
      console.log("[ProjectsPage] Project created:", newProject.id);
    } catch (error) {
      console.error("[ProjectsPage] Error creating project:", error);
      showError("Failed to create project");
      throw error;
    }
  };

  const handleToggleFavorite = async (projectId: string) => {
    try {
      await toggleFavoriteProject(projectId);
    } catch (error) {
      console.error("[ProjectsPage] Error toggling favorite:", error);
    }
  };

  const filteredProjects = projects
    .filter((project) => {
      // Filter by search query
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filter by active tab
      if (activeTab === "favorites") {
        return matchesSearch && favoriteProjectIds.has(project.id);
      }
      
      return matchesSearch;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div id="ProjectsPage" className="flex flex-col h-screen bg-[var(--background-gray-main)]">
      <Header showSidebarToggle={false} isSmallScreen={false} showSettingsButton={true} userRole={userRole} />

      <div className="flex-1 overflow-auto px-8 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[var(--text-primary)] mb-2">
            Good {getGreeting()}, {user?.displayName?.split(" ")[0] || "there"}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "my"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--tab-active-black)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            My projects{" "}
            <span className="ml-1 text-[var(--text-tertiary)]">
              {projects.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("favorites")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === "favorites"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--tab-active-black)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Favorites{" "}
            <span className="ml-1 text-[var(--text-tertiary)]">
              {favoriteProjectIds.size}
            </span>
          </button>
        </div>

        {/* Search and View Controls */}
        <div className="flex items-center gap-3 mb-6">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--icon-secondary)]"
            />
            <input
              id="ProjectSearchInput"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name"
              className="w-full pl-10 pr-4 py-2 bg-white border border-[var(--border-main)] rounded-[8px] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disable)] focus:outline-none focus:border-[var(--border-input-active)]"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white border border-[var(--border-main)] rounded-[8px] p-1">
            <button
              id="GridViewButton"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${
                viewMode === "grid"
                  ? "bg-[var(--fill-tsp-gray-main)]"
                  : "hover:bg-[var(--fill-tsp-white-light)]"
              }`}
              title="Grid View"
            >
              <LayoutGrid
                size={18}
                className={
                  viewMode === "grid"
                    ? "text-[var(--icon-primary)]"
                    : "text-[var(--icon-secondary)]"
                }
              />
            </button>
            <button
              id="ListViewButton"
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${
                viewMode === "list"
                  ? "bg-[var(--fill-tsp-gray-main)]"
                  : "hover:bg-[var(--fill-tsp-white-light)]"
              }`}
              title="List View"
            >
              <List
                size={18}
                className={
                  viewMode === "list"
                    ? "text-[var(--icon-primary)]"
                    : "text-[var(--icon-secondary)]"
                }
              />
            </button>
          </div>

          {/* Create Project Button */}
          <button
            id="CreateProjectButton"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus size={18} />
            <span>Project</span>
          </button>
        </div>

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProject}
        />

        {/* Projects Grid/List */}
        {loadingProjects ? (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            Loading projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--fill-tsp-gray-main)] mb-4">
              <FolderOpen size={32} className="text-[var(--icon-tertiary)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {searchQuery
                ? "No projects found"
                : "No projects yet"}
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              {searchQuery
                ? "Try adjusting your search"
                : "Create your first project to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--Button-primary-black)] text-white rounded-[8px] text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus size={18} />
                <span>Create Project</span>
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div
            id="ProjectsGrid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => router.push(`/project/${project.id}`)}
                isFavorite={favoriteProjectIds.has(project.id)}
                onToggleFavorite={() => handleToggleFavorite(project.id)}
              />
            ))}
          </div>
        ) : (
          <div id="ProjectsList" className="bg-white rounded-[12px] border border-[var(--border-main)] overflow-hidden">
            <div className="divide-y divide-[var(--border-light)]">
              {filteredProjects.map((project) => {
                const isFavorite = favoriteProjectIds.has(project.id);
                const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500"];
                const colorClass = colors[project.name.charCodeAt(0) % colors.length];
                
                return (
                  <div
                    key={project.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--fill-tsp-white-light)] transition-colors group"
                  >
                    {/* Project Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 cursor-pointer`}
                      onClick={() => router.push(`/project/${project.id}`)}
                    >
                      <span className="text-white font-bold text-sm">
                        {project.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* Project Info */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => router.push(`/project/${project.id}`)}
                    >
                      <h3 className="text-[var(--text-primary)] font-medium text-sm truncate mb-1">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="flex items-center gap-1.5" title="Features">
                        <Layers size={16} className="text-[var(--icon-secondary)]" />
                        <span className="text-sm text-[var(--text-secondary)]">
                          {project.stats?.features || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Stories">
                        <Folder size={16} className="text-[var(--icon-secondary)]" />
                        <span className="text-sm text-[var(--text-secondary)]">
                          {project.stats?.stories || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Test Cases">
                        <ClipboardCheck size={16} className="text-[var(--icon-secondary)]" />
                        <span className="text-sm text-[var(--text-secondary)]">
                          {project.stats?.test_cases || 0}
                        </span>
                      </div>
                    </div>

                    {/* Favorite Star */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(project.id);
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
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

