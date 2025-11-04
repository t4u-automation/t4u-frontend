"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/hooks/useTenant";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TestPlan, TestCase, TestCaseStatus } from "@/types";
import { getTestPlan } from "@/lib/firestore/testPlans";
import { getTenantTestCaseStatuses } from "@/lib/firestore/testCaseStatuses";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "@/components/Header";
import Breadcrumbs from "@/components/Breadcrumbs";
import { ClipboardList } from "lucide-react";

export default function TestPlanPage() {
  const { user, loading: authLoading } = useAuth();
  const { tenant, loading: tenantLoading, needsOnboarding } = useTenant(user);
  const params = useParams();
  const router = useRouter();
  const testPlanId = params.id as string;

  const [testPlan, setTestPlan] = useState<TestPlan | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [statuses, setStatuses] = useState<TestCaseStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const combinedLoading = authLoading || tenantLoading;

  useEffect(() => {
    if (!combinedLoading) {
      if (!user) {
        router.push("/login");
      } else if (needsOnboarding) {
        router.push("/");
      } else if (!testPlanId) {
        router.push("/projects");
      }
    }
  }, [user, combinedLoading, needsOnboarding, testPlanId, router]);

  useEffect(() => {
    if (tenant && testPlanId) {
      loadTestPlanData();
    }
  }, [tenant, testPlanId]);

  const loadTestPlanData = async () => {
    if (!tenant || !testPlanId) return;

    try {
      setLoading(true);
      const [fetchedTestPlan, fetchedStatuses] = await Promise.all([
        getTestPlan(testPlanId),
        getTenantTestCaseStatuses(tenant.id),
      ]);

      if (!fetchedTestPlan) {
        router.push("/projects");
        return;
      }

      setTestPlan(fetchedTestPlan);
      setStatuses(fetchedStatuses);

      if (fetchedTestPlan.test_case_ids.length > 0) {
        const testCasesPromises = fetchedTestPlan.test_case_ids.map(async (tcId) => {
          const tcDoc = await getDoc(doc(db, "test_cases", tcId));
          if (tcDoc.exists()) {
            return { id: tcDoc.id, ...tcDoc.data() } as TestCase;
          }
          return null;
        });

        const loadedTestCases = await Promise.all(testCasesPromises);
        setTestCases(loadedTestCases.filter((tc) => tc !== null) as TestCase[]);
      }
    } catch (error) {
      console.error("[TestPlanPage] Error loading test plan:", error);
    } finally {
      setLoading(false);
    }
  };

  if (combinedLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  if (!testPlan) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background-gray-main)]">
        <div className="text-[var(--text-tertiary)]">Test plan not found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--background-gray-main)]">
      <Header showSidebarToggle={false} isSmallScreen={false} />

      <Breadcrumbs
        items={[
          { label: "Projects", href: "/projects" },
          { label: "Test Plans", href: `/project/${testPlan.project_id}?tab=test-plans` },
          { label: testPlan.name },
        ]}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-[12px] border border-[var(--border-main)] p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-blue-500 flex items-center justify-center">
                <ClipboardList size={24} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
                  {testPlan.name}
                </h1>
                {testPlan.description && (
                  <p className="text-[var(--text-secondary)] mb-4">
                    {testPlan.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                  <span>{testPlan.test_cases_count} test cases</span>
                  <span>•</span>
                  <span>Created {new Date(testPlan.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[12px] border border-[var(--border-main)]">
            <div className="px-6 py-4 border-b border-[var(--border-main)]">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Test Cases
              </h2>
            </div>
            
            {testCases.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">
                No test cases in this plan
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-light)]">
                {testCases.map((testCase) => {
                  const status = statuses.find((s) => s.id === testCase.status_id);
                  return (
                    <div
                      key={testCase.id}
                      className="px-6 py-4 hover:bg-[var(--fill-tsp-white-light)] transition-colors cursor-pointer"
                      onClick={() => router.push(`/project/${testPlan.project_id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {status && (
                          <div
                            className="flex-shrink-0 w-3 h-3 rounded-full mt-1"
                            style={{ backgroundColor: status.color }}
                            title={status.name}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">
                            {testCase.name}
                          </h3>
                          {testCase.description && (
                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                              {testCase.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

