"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "@/components/Header";
import Breadcrumbs from "@/components/Breadcrumbs";
import ProjectSidebar from "@/components/ProjectSidebar";
import TestCaseTree from "@/components/TestCaseTree";
import TestCaseDetails from "@/components/TestCaseDetails";
import TenantSettings from "@/components/TenantSettings";
import CreateFeatureModal from "@/components/CreateFeatureModal";
import MoveToProjectModal from "@/components/MoveToProjectModal";
import RenameModal from "@/components/RenameModal";
import TestPlansPanel from "@/components/TestPlansPanel";
import TestPlanTestCasesTree from "@/components/TestPlanTestCasesTree";
import CreateTestPlanModal from "@/components/CreateTestPlanModal";
import EditTestPlanModal from "@/components/EditTestPlanModal";
import RunsPanel from "@/components/RunsPanel";
import RunDetails from "@/components/RunDetails";
import CreateRunModal from "@/components/CreateRunModal";
import EditRunModal from "@/components/EditRunModal";
import { useToast } from "@/contexts/ToastContext";
import { executeRun } from "@/lib/api";
import { Feature, Story, TestCase, TestCaseStatus, T4UUser, Project, TestPlan, Run } from "@/types";
import {
  getProjectFeatures,
  getFeatureStories,
  getStoryTestCases,
  getTenantTestCaseStatuses,
  getTenantProjects,
  updateTenant,
  createTestCaseStatus,
  updateTestCaseStatus,
  deleteTestCaseStatus as deleteTestCaseStatusConfig,
  createFeature,
  createStory,
  createTestCase,
  updateTestCase,
  updateTestCaseStatusId,
  deleteFeature,
  deleteStory,
  deleteTestCase,
  moveFeatureToProject,
  moveStoryToProject,
  moveTestCaseToProject,
  cloneFeature,
  cloneStory,
  cloneTestCase,
  updateFeature,
  updateStory,
  getProjectTestPlans,
  createTestPlan,
  updateTestPlan,
  deleteTestPlan,
  getProjectRuns,
  createRun,
  updateRun,
  deleteRun,
} from "@/lib/t4u";

interface ProjectDetailsContentProps {
  projectId: string;
}

export default function ProjectDetailsContent({ projectId }: ProjectDetailsContentProps) {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, needsOnboarding } = useTenant(user);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [statuses, setStatuses] = useState<TestCaseStatus[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const tabParam = searchParams.get('tab') as "test-cases" | "test-plans" | "runs" | "settings" | null;
  const testCaseIdParam = searchParams.get('testCaseId') as string | null;
  const [activeMenuItem, setActiveMenuItem] = useState<"test-cases" | "test-plans" | "runs" | "settings">(
    tabParam && ["test-cases", "test-plans", "runs", "settings"].includes(tabParam) ? tabParam : "test-cases"
  );
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [selectedTestPlanId, setSelectedTestPlanId] = useState<string | null>(null);
  const [showCreateTestPlanModal, setShowCreateTestPlanModal] = useState(false);
  const [showEditTestPlanModal, setShowEditTestPlanModal] = useState(false);
  const [editingTestPlan, setEditingTestPlan] = useState<TestPlan | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);
  const [showEditRunModal, setShowEditRunModal] = useState(false);
  const [editingRun, setEditingRun] = useState<Run | null>(null);
  const [showCreateFeatureModal, setShowCreateFeatureModal] = useState(false);
  const [autoExpandFeatureId, setAutoExpandFeatureId] = useState<string | null>(null);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveItem, setMoveItem] = useState<{
    id: string;
    type: "feature" | "story" | "testcase";
    name: string;
  } | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState<{
    id: string;
    type: "feature" | "story" | "testcase";
    name: string;
  } | null>(null);

  const { showSuccess, showError } = useToast();
  const combinedLoading = authLoading || tenantLoading;

  useEffect(() => {
    if (!combinedLoading) {
      if (!user) {
        router.push("/login");
      } else if (needsOnboarding) {
        router.push("/");
      }
    }
  }, [user, combinedLoading, needsOnboarding, router]);

  useEffect(() => {
    if (tenant && projectId) {
      loadProjectData();
      loadProjects();
      loadTestPlans();
      loadRuns();
    }
  }, [tenant, projectId]);

  // Only restore from URL on initial page load (when selectedTestCaseId is null but testCaseIdParam exists)
  useEffect(() => {
    if (testCaseIdParam && !selectedTestCaseId) {
      setSelectedTestCaseId(testCaseIdParam);
    }
  }, []); // Only run on mount

  useEffect(() => {
    if (selectedTestCaseId) {
      const selectedTestCase = testCases.find(tc => tc.id === selectedTestCaseId);
      if (selectedTestCase) {
        // Find the story containing this test case
        const story = stories.find(s => s.id === selectedTestCase.story_id);
        if (story) {
          // Find the feature containing this story
          const feature = features.find(f => f.id === story.feature_id);
          if (feature) {
            setAutoExpandFeatureId(feature.id);
          }
          // Expand the story
          setExpandedStories(prev => new Set([...prev, story.id]));
        }
      }
    }
  }, [selectedTestCaseId, features, stories, testCases]);

  const loadTestPlans = async () => {
    if (!tenant) return;

    try {
      const fetchedTestPlans = await getProjectTestPlans(projectId, tenant.id);
      setTestPlans(fetchedTestPlans);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error loading test plans:", error);
    }
  };

  const loadRuns = async () => {
    if (!tenant) return;

    try {
      const fetchedRuns = await getProjectRuns(projectId, tenant.id);
      setRuns(fetchedRuns);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error loading runs:", error);
    }
  };

  // Real-time listener for runs
  useEffect(() => {
    if (!tenant) return;

    const runsRef = collection(db, "runs");
    const q = query(
      runsRef,
      where("project_id", "==", projectId),
      where("tenant_id", "==", tenant.id),
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedRuns = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Run[];
      setRuns(updatedRuns);
    });

    return () => unsubscribe();
  }, [tenant?.id, projectId]);

  // Real-time listener for test cases (to update proven_steps)
  useEffect(() => {
    if (!tenant || stories.length === 0) return;

    const storyIds = stories.map(s => s.id);
    const testCasesRef = collection(db, "test_cases");
    
    // Query test cases in batches (Firestore 'in' limit is 10)
    const batchSize = 10;
    const unsubscribers: (() => void)[] = [];

    for (let i = 0; i < storyIds.length; i += batchSize) {
      const batch = storyIds.slice(i, i + batchSize);
      
      const q = query(
        testCasesRef,
        where("story_id", "in", batch),
        where("tenant_id", "==", tenant.id)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const updatedTestCases = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TestCase[];

        // Merge with existing test cases
        setTestCases(prevTestCases => {
          const otherTestCases = prevTestCases.filter(
            tc => !updatedTestCases.find(utc => utc.id === tc.id)
          );
          return [...otherTestCases, ...updatedTestCases];
        });
      });

      unsubscribers.push(unsubscribe);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [tenant?.id, stories.map(s => s.id).join(',')]);

  const loadProjects = async () => {
    if (!tenant) return;

    try {
      const allProjects = await getTenantProjects(tenant.id);
      setProjects(allProjects);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error loading projects:", error);
    }
  };

  // Check if user is tenant owner
  useEffect(() => {
    if (user && tenant) {
      checkUserRole();
    }
  }, [user, tenant]);

  const checkUserRole = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as T4UUser;
        setIsOwner(userData.role === "owner");
      }
    } catch (error) {
      console.error("[ProjectDetailsContent] Error checking user role:", error);
    }
  };

  const loadProjectData = async () => {
    if (!tenant) return;

    try {
      setLoading(true);

      // Load project info and all data in parallel
      const projectRef = doc(db, "projects", projectId);
      const [projectDoc, fetchedFeatures, fetchedStatuses] = await Promise.all([
        getDoc(projectRef),
        getProjectFeatures(projectId, tenant.id),
        getTenantTestCaseStatuses(tenant.id),
      ]);

      if (projectDoc.exists()) {
        setCurrentProject({ id: projectDoc.id, ...projectDoc.data() } as Project);
      }

      setFeatures(fetchedFeatures);
      setStatuses(fetchedStatuses);

      // Load all stories for all features
      if (fetchedFeatures.length > 0) {
        const allStories = await Promise.all(
          fetchedFeatures.map((feature) => getFeatureStories(feature.id, tenant.id))
        );
        const flatStories = allStories.flat();
        setStories(flatStories);

        // Load all test cases for all stories
        if (flatStories.length > 0) {
          const allTestCases = await Promise.all(
            flatStories.map((story) => getStoryTestCases(story.id, tenant.id))
          );
          const flatTestCases = allTestCases.flat();
          setTestCases(flatTestCases);
        }
      }
    } catch (error) {
      console.error("[ProjectDetailsContent] Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTestCase = testCases.find((tc) => tc.id === selectedTestCaseId);
  const selectedStatus = selectedTestCase
    ? statuses.find((s) => s.id === selectedTestCase.status_id)
    : undefined;

  const handleUpdateTenant = async (name: string) => {
    if (!tenant) return;

    try {
      await updateTenant(tenant.id, { name });
      console.log("[ProjectDetailsContent] Tenant name updated successfully");
      // Note: The tenant state in useTenant will auto-update on next navigation
      // For now, we'll show success without reload
    } catch (error) {
      console.error("[ProjectDetailsContent] Error updating tenant:", error);
      throw error;
    }
  };

  const handleCreateStatus = async (name: string, color: string) => {
    if (!tenant) return;

    try {
      const newStatus = await createTestCaseStatus(tenant.id, name, color);
      setStatuses([...statuses, newStatus]);
      console.log("[ProjectDetailsContent] Status created:", newStatus.id);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error creating status:", error);
      throw error;
    }
  };

  const handleUpdateStatus = async (statusId: string, name: string, color: string) => {
    try {
      await updateTestCaseStatus(statusId, { name, color });
      // Update local state
      setStatuses(
        statuses.map((s) => (s.id === statusId ? { ...s, name, color } : s))
      );
      console.log("[ProjectDetailsContent] Status updated:", statusId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error updating status:", error);
      throw error;
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    try {
      await deleteTestCaseStatusConfig(statusId);
      // Remove from local state
      setStatuses(statuses.filter((s) => s.id !== statusId));
      console.log("[ProjectDetailsContent] Status deleted:", statusId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error deleting status:", error);
      throw error;
    }
  };

  const handleCreateFeature = async (name: string, description?: string) => {
    if (!tenant || !user) return;

    try {
      const newFeature = await createFeature(tenant.id, projectId, user.uid, name, description);
      setFeatures([newFeature, ...features]);
      
      // Auto-expand the newly created feature
      setAutoExpandFeatureId(newFeature.id);
      
      showSuccess(`Feature "${name}" created successfully`);
      console.log("[ProjectDetailsContent] Feature created:", newFeature.id);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error creating feature:", error);
      showError("Failed to create feature");
      throw error;
    }
  };

  const handleCreateStoryInline = async (featureId: string, name: string): Promise<string | void> => {
    if (!tenant || !user) return;

    try {
      const newStory = await createStory(tenant.id, featureId, user.uid, name);
      setStories([...stories, newStory]);
      showSuccess(`Story "${name}" created successfully`);
      console.log("[ProjectDetailsContent] Story created:", newStory.id);
      
      // Return the new story ID for auto-expansion
      return newStory.id;
    } catch (error) {
      console.error("[ProjectDetailsContent] Error creating story:", error);
      showError("Failed to create story");
      throw error;
    }
  };

  const handleCreateTestCaseInline = async (storyId: string, name: string): Promise<string | void> => {
    if (!tenant || !user) return;

    try {
      // Use first available status (Draft or Active)
      const defaultStatus = statuses.find(s => s.is_default) || statuses[0];
      if (!defaultStatus) {
        showError("No status available. Please create a status first.");
        return;
      }

      const newTestCase = await createTestCase(
        tenant.id,
        storyId,
        user.uid,
        name,
        defaultStatus.id,
        projectId
      );
      setTestCases([...testCases, newTestCase]);
      showSuccess(`Test case "${name}" created successfully`);
      console.log("[ProjectDetailsContent] Test case created:", newTestCase.id);
      
      // Return the new test case ID for auto-selection
      return newTestCase.id;
    } catch (error) {
      console.error("[ProjectDetailsContent] Error creating test case:", error);
      showError("Failed to create test case");
      throw error;
    }
  };

  const handleChangeTestCaseStatus = async (testCaseId: string, newStatusId: string) => {
    try {
      await updateTestCaseStatusId(testCaseId, newStatusId);
      
      // Update local state
      setTestCases(
        testCases.map((tc) =>
          tc.id === testCaseId ? { ...tc, status_id: newStatusId } : tc
        )
      );
      
      const newStatus = statuses.find(s => s.id === newStatusId);
      showSuccess(`Status changed to "${newStatus?.name}"`);
      console.log("[ProjectDetailsContent] Test case status changed:", testCaseId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error changing test case status:", error);
      showError("Failed to change status");
      throw error;
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!tenant) return;

    try {
      await deleteFeature(featureId, tenant.id);
      // Remove feature and all child stories/test cases from local state
      const featureStories = stories.filter((s) => s.feature_id === featureId);
      const storyIds = featureStories.map((s) => s.id);
      
      setFeatures(features.filter((f) => f.id !== featureId));
      setStories(stories.filter((s) => s.feature_id !== featureId));
      setTestCases(testCases.filter((tc) => !storyIds.includes(tc.story_id)));
      
      showSuccess("Feature and all children deleted");
      console.log("[ProjectDetailsContent] Feature deleted:", featureId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error deleting feature:", error);
      showError("Failed to delete feature");
      throw error;
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!tenant) return;

    try {
      await deleteStory(storyId, tenant.id);
      // Remove story and all child test cases from local state
      setStories(stories.filter((s) => s.id !== storyId));
      setTestCases(testCases.filter((tc) => tc.story_id !== storyId));
      
      showSuccess("Story and all test cases deleted");
      console.log("[ProjectDetailsContent] Story deleted:", storyId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error deleting story:", error);
      showError("Failed to delete story");
      throw error;
    }
  };

  const handleDeleteTestCase = async (testCaseId: string) => {
    try {
      await deleteTestCase(testCaseId);
      // Remove from local state
      setTestCases(testCases.filter((tc) => tc.id !== testCaseId));
      // Deselect if it was selected
      if (selectedTestCaseId === testCaseId) {
        setSelectedTestCaseId(null);
      }
      showSuccess("Test case deleted");
      console.log("[ProjectDetailsContent] Test case deleted:", testCaseId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error deleting test case:", error);
      showError("Failed to delete test case");
      throw error;
    }
  };

  const handleSelectTestCase = (testCaseId: string) => {
    setSelectedTestCaseId(testCaseId);
    // Update URL with test case ID query param, but stay on the same page
    router.push(`?testCaseId=${testCaseId}`);
  };

  const handleTabChange = (tab: "overview" | "automated-steps" | "ai-exploration") => {
    // Update URL with tab query param while keeping testCaseId
    const params = new URLSearchParams();
    if (selectedTestCaseId) {
      params.set('testCaseId', selectedTestCaseId);
    }
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  const handleMoveItem = async (targetProjectId: string) => {
    if (!moveItem || !tenant || !user) return;

    try {
      if (moveItem.type === "testcase") {
        await moveTestCaseToProject(moveItem.id, targetProjectId, tenant.id, user.uid);
        // Remove from local state but keep parent structure
        setTestCases(testCases.filter((tc) => tc.id !== moveItem.id));
        if (selectedTestCaseId === moveItem.id) {
          setSelectedTestCaseId(null);
        }
        showSuccess(`Test case "${moveItem.name}" moved to another project`);
      } else if (moveItem.type === "story") {
        await moveStoryToProject(moveItem.id, targetProjectId, tenant.id, user.uid);
        // Remove story and its test cases from local state
        setStories(stories.filter((s) => s.id !== moveItem.id));
        setTestCases(testCases.filter((tc) => tc.story_id !== moveItem.id));
        showSuccess(`Story "${moveItem.name}" moved to another project`);
      } else if (moveItem.type === "feature") {
        await moveFeatureToProject(moveItem.id, targetProjectId, tenant.id, user.uid);
        // Remove feature, its stories, and test cases from local state
        const storyIds = stories.filter((s) => s.feature_id === moveItem.id).map((s) => s.id);
        setFeatures(features.filter((f) => f.id !== moveItem.id));
        setStories(stories.filter((s) => s.feature_id !== moveItem.id));
        setTestCases(testCases.filter((tc) => !storyIds.includes(tc.story_id)));
        showSuccess(`Feature "${moveItem.name}" moved to another project`);
      }
      
      setMoveItem(null);
      setShowMoveModal(false);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error moving item:", error);
      showError("Failed to move item");
      throw error;
    }
  };

  const handleUpdateTestCase = async (
    updates: Partial<Pick<TestCase, "description" | "scenario">>
  ) => {
    if (!selectedTestCaseId) return;

    try {
      await updateTestCase(selectedTestCaseId, updates);
      
      // Update local state
      setTestCases(
        testCases.map((tc) =>
          tc.id === selectedTestCaseId ? { ...tc, ...updates } : tc
        )
      );
      
      showSuccess("Test case updated successfully");
      console.log("[ProjectDetailsContent] Test case updated:", selectedTestCaseId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error updating test case:", error);
      showError("Failed to update test case");
      throw error;
    }
  };

  const handleOpenMoveFeature = (featureId: string) => {
    const feature = features.find((f) => f.id === featureId);
    if (feature) {
      setMoveItem({ id: featureId, type: "feature", name: feature.name });
      setShowMoveModal(true);
    }
  };

  const handleOpenMoveStory = (storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    if (story) {
      setMoveItem({ id: storyId, type: "story", name: story.name });
      setShowMoveModal(true);
    }
  };

  const handleOpenMoveTestCase = (testCaseId: string) => {
    const testCase = testCases.find((tc) => tc.id === testCaseId);
    if (testCase) {
      setMoveItem({ id: testCaseId, type: "testcase", name: testCase.name });
      setShowMoveModal(true);
    }
  };

  const getDependenciesCount = () => {
    if (!moveItem) return {};

    if (moveItem.type === "story") {
      const testCasesCount = testCases.filter((tc) => tc.story_id === moveItem.id).length;
      return { testCases: testCasesCount };
    } else if (moveItem.type === "feature") {
      const featureStories = stories.filter((s) => s.feature_id === moveItem.id);
      const storyIds = featureStories.map((s) => s.id);
      const testCasesCount = testCases.filter((tc) => storyIds.includes(tc.story_id)).length;
      return { stories: featureStories.length, testCases: testCasesCount };
    }
    
    return {};
  };

  const handleCloneFeature = async (featureId: string) => {
    if (!tenant || !user) return;

    try {
      const feature = features.find((f) => f.id === featureId);
      const clonedFeature = await cloneFeature(featureId, projectId, tenant.id, user.uid);
      showSuccess(`Feature "${feature?.name}" cloned successfully`);
      // Reload project data to show the cloned feature
      await loadProjectData();
    } catch (error) {
      console.error("[ProjectDetailsContent] Error cloning feature:", error);
      showError("Failed to clone feature");
    }
  };

  const handleCloneStory = async (storyId: string) => {
    if (!tenant || !user) return;

    try {
      const story = stories.find((s) => s.id === storyId);
      const clonedStory = await cloneStory(storyId, tenant.id, user.uid);
      showSuccess(`Story "${story?.name}" cloned successfully`);
      // Reload project data to show the cloned story
      await loadProjectData();
    } catch (error) {
      console.error("[ProjectDetailsContent] Error cloning story:", error);
      showError("Failed to clone story");
    }
  };

  const handleCloneTestCase = async (testCaseId: string) => {
    if (!tenant || !user) return;

    try {
      const testCase = testCases.find((tc) => tc.id === testCaseId);
      const clonedTestCase = await cloneTestCase(testCaseId, tenant.id, user.uid);
      setTestCases([...testCases, clonedTestCase]);
      showSuccess(`Test case "${testCase?.name}" cloned successfully`);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error cloning test case:", error);
      showError("Failed to clone test case");
    }
  };

  const handleOpenRenameFeature = (featureId: string) => {
    const feature = features.find((f) => f.id === featureId);
    if (feature) {
      setRenameItem({ id: featureId, type: "feature", name: feature.name });
      setShowRenameModal(true);
    }
  };

  const handleOpenRenameStory = (storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    if (story) {
      setRenameItem({ id: storyId, type: "story", name: story.name });
      setShowRenameModal(true);
    }
  };

  const handleOpenRenameTestCase = (testCaseId: string) => {
    const testCase = testCases.find((tc) => tc.id === testCaseId);
    if (testCase) {
      setRenameItem({ id: testCaseId, type: "testcase", name: testCase.name });
      setShowRenameModal(true);
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameItem) return;

    try {
      if (renameItem.type === "feature") {
        await updateFeature(renameItem.id, { name: newName });
        setFeatures(features.map((f) => f.id === renameItem.id ? { ...f, name: newName } : f));
        showSuccess(`Feature renamed to "${newName}"`);
      } else if (renameItem.type === "story") {
        await updateStory(renameItem.id, { name: newName });
        setStories(stories.map((s) => s.id === renameItem.id ? { ...s, name: newName } : s));
        showSuccess(`Story renamed to "${newName}"`);
      } else if (renameItem.type === "testcase") {
        await updateTestCase(renameItem.id, { name: newName });
        setTestCases(testCases.map((tc) => tc.id === renameItem.id ? { ...tc, name: newName } : tc));
        showSuccess(`Test case renamed to "${newName}"`);
      }
      
      setRenameItem(null);
      setShowRenameModal(false);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error renaming:", error);
      showError("Failed to rename");
      throw error;
    }
  };

  const handleCreateTestPlan = async (name: string, testCaseIds: string[], description?: string) => {
    if (!tenant || !user) return;

    try {
      const newTestPlan = await createTestPlan(tenant.id, projectId, user.uid, name, testCaseIds, description);
      setTestPlans([newTestPlan, ...testPlans]);
      setSelectedTestPlanId(newTestPlan.id);
      showSuccess(`Test plan "${name}" created`);
      console.log("[ProjectDetailsContent] Test plan created:", newTestPlan.id);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error creating test plan:", error);
      showError("Failed to create test plan");
      throw error;
    }
  };

  const handleTestPlanSelect = (testPlanId: string) => {
    setSelectedTestPlanId(testPlanId);
  };

  const handleTestCaseClickFromPlan = (testCaseId: string) => {
    // Navigate to test cases tab and select the test case
    setActiveMenuItem("test-cases");
    setSelectedTestCaseId(testCaseId);
  };

  const handleEditTestPlan = (testPlanId: string) => {
    const planToEdit = testPlans.find(tp => tp.id === testPlanId);
    if (planToEdit) {
      setEditingTestPlan(planToEdit);
      setShowEditTestPlanModal(true);
    }
  };

  const handleUpdateTestPlan = async (testPlanId: string, name: string, testCaseIds: string[], description?: string) => {
    try {
      const updates: any = { name, test_case_ids: testCaseIds };
      if (description) {
        updates.description = description;
      }
      
      await updateTestPlan(testPlanId, updates);
      
      // Update local state
      setTestPlans(testPlans.map(tp => 
        tp.id === testPlanId 
          ? { ...tp, name, description, test_case_ids: testCaseIds, test_cases_count: testCaseIds.length }
          : tp
      ));
      
      showSuccess(`Test plan "${name}" updated`);
      console.log("[ProjectDetailsContent] Test plan updated:", testPlanId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error updating test plan:", error);
      showError("Failed to update test plan");
      throw error;
    }
  };

  const handleDeleteTestPlan = async (testPlanId: string) => {
    try {
      await deleteTestPlan(testPlanId);
      
      // Update local state
      setTestPlans(testPlans.filter(tp => tp.id !== testPlanId));
      
      // Clear selection if deleted test plan was selected
      if (selectedTestPlanId === testPlanId) {
        setSelectedTestPlanId(null);
      }
      
      showSuccess("Test plan deleted");
      console.log("[ProjectDetailsContent] Test plan deleted:", testPlanId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error deleting test plan:", error);
      showError("Failed to delete test plan");
      throw error;
    }
  };

  const handleCreateRun = async (name: string, testCaseIds: string[]) => {
    if (!tenant || !user) return;

    try {
      const newRun = await createRun(tenant.id, projectId, user.uid, name, testCaseIds);
      setRuns([newRun, ...runs]);
      setSelectedRunId(newRun.id);
      showSuccess(`Run "${name}" created`);
      console.log("[ProjectDetailsContent] Run created:", newRun.id);
      
      // Start the run execution
      try {
        await executeRun(newRun.id, tenant.id, true);
        showSuccess("Run execution started");
      } catch (execError) {
        console.error("[ProjectDetailsContent] Error starting run execution:", execError);
        showError("Run created but failed to start execution");
      }
    } catch (error) {
      console.error("[ProjectDetailsContent] Error creating run:", error);
      showError("Failed to create run");
      throw error;
    }
  };

  const handleRunSelect = (runId: string) => {
    setSelectedRunId(runId);
  };

  const handleRerunRun = async (runId: string) => {
    if (!tenant) return;

    try {
      await executeRun(runId, tenant.id, true);
      showSuccess("Run execution started");
      console.log("[ProjectDetailsContent] Rerun started for:", runId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error rerunning:", error);
      showError("Failed to start run execution");
    }
  };

  const handleEditRun = (runId: string) => {
    const runToEdit = runs.find(r => r.id === runId);
    if (runToEdit) {
      setEditingRun(runToEdit);
      setShowEditRunModal(true);
    }
  };

  const handleUpdateRun = async (runId: string, name: string, testCaseIds: string[]) => {
    try {
      // Initialize results for new test cases
      const currentRun = runs.find(r => r.id === runId);
      if (!currentRun) return;

      const results: any = { ...currentRun.results };
      
      // Add new test cases to results
      testCaseIds.forEach(tcId => {
        if (!results[tcId]) {
          results[tcId] = {
            test_case_id: tcId,
            status: "pending",
            current_step: 0,
            total_steps: 0,
          };
        }
      });

      // Remove test cases that are no longer selected
      Object.keys(results).forEach(tcId => {
        if (!testCaseIds.includes(tcId)) {
          delete results[tcId];
        }
      });

      await updateRun(runId, { 
        name, 
        test_case_ids: testCaseIds,
        results 
      });
      
      setRuns(runs.map(r => 
        r.id === runId 
          ? { ...r, name, test_case_ids: testCaseIds, results }
          : r
      ));
      
      showSuccess(`Run "${name}" updated`);
      console.log("[ProjectDetailsContent] Run updated:", runId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error updating run:", error);
      showError("Failed to update run");
      throw error;
    }
  };

  const handleDeleteRun = async (runId: string) => {
    try {
      await deleteRun(runId);
      
      setRuns(runs.filter(r => r.id !== runId));
      
      if (selectedRunId === runId) {
        setSelectedRunId(null);
      }
      
      showSuccess("Run deleted");
      console.log("[ProjectDetailsContent] Run deleted:", runId);
    } catch (error) {
      console.error("[ProjectDetailsContent] Error deleting run:", error);
      showError("Failed to delete run");
      throw error;
    }
  };

  const selectedTestPlan = testPlans.find(tp => tp.id === selectedTestPlanId) || null;
  const selectedRun = runs.find(r => r.id === selectedRunId) || null;

  if (combinedLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div
      id="ProjectDetailsPage"
      className="flex flex-col h-screen bg-[var(--background-gray-main)]"
    >
      <Header showSidebarToggle={false} isSmallScreen={false} />
      
      {/* Breadcrumbs */}
      {currentProject && (
        <Breadcrumbs
          items={[
            { label: "Projects", href: "/projects" },
            { label: currentProject.name },
          ]}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Project Sidebar */}
        <ProjectSidebar 
          projectId={projectId} 
          activeItem={activeMenuItem}
          isOwner={isOwner}
          onNavigate={(item) => setActiveMenuItem(item as "test-cases" | "test-plans" | "runs" | "settings")}
        />

        {/* Main Content - Conditional based on active menu */}
        {activeMenuItem === "test-plans" ? (
          <>
            {/* Test Plans Two-Panel Layout */}
            <TestPlansPanel
              testPlans={testPlans}
              selectedTestPlanId={selectedTestPlanId || undefined}
              onTestPlanSelect={handleTestPlanSelect}
              onCreateClick={() => setShowCreateTestPlanModal(true)}
              onEditTestPlan={handleEditTestPlan}
              onDeleteTestPlan={handleDeleteTestPlan}
            />
            
            <TestPlanTestCasesTree
              testPlan={selectedTestPlan}
              features={features}
              stories={stories}
              testCases={testCases}
              statuses={statuses}
              onTestCaseClick={handleTestCaseClickFromPlan}
            />
            
            <CreateTestPlanModal
              isOpen={showCreateTestPlanModal}
              onClose={() => setShowCreateTestPlanModal(false)}
              onSubmit={handleCreateTestPlan}
              features={features}
              stories={stories}
              testCases={testCases}
            />
            
            <EditTestPlanModal
              isOpen={showEditTestPlanModal}
              onClose={() => {
                setShowEditTestPlanModal(false);
                setEditingTestPlan(null);
              }}
              onSubmit={handleUpdateTestPlan}
              testPlan={editingTestPlan}
              features={features}
              stories={stories}
              testCases={testCases}
            />
          </>
        ) : activeMenuItem === "runs" ? (
          <>
            {/* Runs Two-Panel Layout */}
            <RunsPanel
              runs={runs}
              selectedRunId={selectedRunId || undefined}
              onRunSelect={handleRunSelect}
              onCreateClick={() => setShowCreateRunModal(true)}
              onEditRun={handleEditRun}
              onDeleteRun={handleDeleteRun}
            />
            
            <RunDetails
              run={selectedRun}
              testCases={testCases}
              onRerun={handleRerunRun}
            />
            
            <CreateRunModal
              isOpen={showCreateRunModal}
              onClose={() => setShowCreateRunModal(false)}
              onSubmit={handleCreateRun}
              features={features}
              stories={stories}
              testCases={testCases}
            />
            
            <EditRunModal
              isOpen={showEditRunModal}
              onClose={() => {
                setShowEditRunModal(false);
                setEditingRun(null);
              }}
              onSubmit={handleUpdateRun}
              run={editingRun}
              features={features}
              stories={stories}
              testCases={testCases}
            />
          </>
        ) : activeMenuItem === "settings" && tenant ? (
          <TenantSettings
            tenant={tenant}
            statuses={statuses}
            onUpdateTenant={handleUpdateTenant}
            onCreateStatus={handleCreateStatus}
            onUpdateStatus={handleUpdateStatus}
            onDeleteStatus={handleDeleteStatus}
          />
        ) : (
          /* Test Cases View - Two Panel Layout */
          <div className="flex flex-1 overflow-hidden">
          {/* Test Case Tree */}
          <TestCaseTree
            features={features}
            stories={stories}
            testCases={testCases}
            statuses={statuses}
            selectedTestCaseId={selectedTestCaseId || undefined}
            autoExpandFeatureId={autoExpandFeatureId}
            autoExpandStoryId={selectedTestCaseId ? stories.find(s => s.id === testCases.find(tc => tc.id === selectedTestCaseId)?.story_id)?.id || null : null}
            onTestCaseSelect={handleSelectTestCase}
            onCreateFeature={() => setShowCreateFeatureModal(true)}
            onCreateStory={handleCreateStoryInline}
            onCreateTestCase={handleCreateTestCaseInline}
            onDeleteFeature={handleDeleteFeature}
            onDeleteStory={handleDeleteStory}
            onDeleteTestCase={handleDeleteTestCase}
            onMoveFeature={handleOpenMoveFeature}
            onMoveStory={handleOpenMoveStory}
            onMoveTestCase={handleOpenMoveTestCase}
            onCloneFeature={handleCloneFeature}
            onCloneStory={handleCloneStory}
            onCloneTestCase={handleCloneTestCase}
            onRenameFeature={handleOpenRenameFeature}
            onRenameStory={handleOpenRenameStory}
            onRenameTestCase={handleOpenRenameTestCase}
            />

            {/* Create Feature Modal */}
          <CreateFeatureModal
            isOpen={showCreateFeatureModal}
            onClose={() => setShowCreateFeatureModal(false)}
            onSubmit={handleCreateFeature}
          />

          {/* Move to Project Modal */}
          {moveItem && (
            <MoveToProjectModal
              isOpen={showMoveModal}
              onClose={() => {
                setShowMoveModal(false);
                setMoveItem(null);
              }}
              onMove={handleMoveItem}
              currentProjectId={projectId}
              itemType={moveItem.type}
              itemName={moveItem.name}
              projects={projects}
              dependenciesCount={getDependenciesCount()}
            />
          )}

          {/* Rename Modal */}
          {renameItem && (
            <RenameModal
              isOpen={showRenameModal}
              onClose={() => {
                setShowRenameModal(false);
                setRenameItem(null);
              }}
              onRename={handleRename}
              itemType={renameItem.type}
              currentName={renameItem.name}
            />
          )}

          {/* Test Case Details or Empty State */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-[var(--text-tertiary)]">Loading test cases...</div>
            </div>
          ) : selectedTestCase ? (
            <TestCaseDetails 
              testCase={selectedTestCase} 
              status={selectedStatus}
              allStatuses={statuses}
              onStatusChange={handleChangeTestCaseStatus}
              onUpdate={handleUpdateTestCase}
              onDelete={handleDeleteTestCase}
              activeTab={(searchParams.get('tab') as any) || "overview"}
              onTabChange={handleTabChange}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center max-w-md px-4">
                <div className="text-sm text-[var(--text-secondary)]">
                  Select a test case to view details
                </div>
                <div className="text-xs text-[var(--text-tertiary)] mt-2">
                  or create a new one to get started
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
}

