"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TestCaseComment } from "@/types";
import {
  createTestCaseComment,
  updateTestCaseComment,
  deleteTestCaseComment,
} from "@/lib/firestore/testCaseComments";

export function useTestCaseComments(
  testCaseId: string | undefined,
  tenantId: string | undefined
) {
  const [comments, setComments] = useState<TestCaseComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testCaseId || !tenantId) {
      setComments([]);
      setLoading(false);
      return;
    }

    console.log("[useTestCaseComments] Setting up listener for test case:", testCaseId);
    setLoading(true);
    setError(null);

    try {
      const commentsRef = collection(db, "test_case_comments");
      const q: Query = query(
        commentsRef,
        where("test_case_id", "==", testCaseId),
        where("tenant_id", "==", tenantId),
        orderBy("created_at", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedComments = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as TestCaseComment[];

          setComments(fetchedComments);
          setLoading(false);
          console.log("[useTestCaseComments] Comments loaded:", fetchedComments.length);
        },
        (err) => {
          console.error("[useTestCaseComments] Error:", err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("[useTestCaseComments] Setup error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }, [testCaseId, tenantId]);

  const addComment = async (
    content: string,
    userId: string,
    userEmail: string,
    userDisplayName: string
  ): Promise<TestCaseComment> => {
    if (!testCaseId || !tenantId) {
      throw new Error("Test case or tenant not loaded");
    }

    return createTestCaseComment(
      testCaseId,
      tenantId,
      userId,
      userEmail,
      userDisplayName,
      content
    );
  };

  const updateComment = async (commentId: string, content: string): Promise<void> => {
    return updateTestCaseComment(commentId, content);
  };

  const deleteComment = async (commentId: string): Promise<void> => {
    return deleteTestCaseComment(commentId);
  };

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
  };
}
