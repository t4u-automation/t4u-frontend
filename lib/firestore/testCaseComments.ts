import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { TestCaseComment } from "@/types";

/**
 * Create a new comment on a test case
 */
export async function createTestCaseComment(
  testCaseId: string,
  tenantId: string,
  userId: string,
  userEmail: string,
  userDisplayName: string,
  content: string
): Promise<TestCaseComment> {
  try {
    const commentRef = doc(collection(db, "test_case_comments"));
    const now = new Date().toISOString();
    
    const comment: TestCaseComment = {
      id: commentRef.id,
      test_case_id: testCaseId,
      tenant_id: tenantId,
      user_id: userId,
      user_email: userEmail,
      user_display_name: userDisplayName,
      content,
      created_at: now,
      updated_at: now,
    };
    
    await setDoc(commentRef, comment);
    console.log("[T4U] Comment created:", comment.id);
    return comment;
  } catch (error) {
    console.error("[T4U] Error creating comment:", error);
    throw error;
  }
}

/**
 * Get all comments for a test case
 */
export async function getTestCaseComments(
  testCaseId: string,
  tenantId: string
): Promise<TestCaseComment[]> {
  try {
    const commentsRef = collection(db, "test_case_comments");
    const q = query(
      commentsRef,
      where("test_case_id", "==", testCaseId),
      where("tenant_id", "==", tenantId),
      where("is_deleted", "!=", true),
      orderBy("is_deleted"),
      orderBy("created_at", "desc")
    );
    
    const snapshot = await getDocs(q);
    const comments = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TestCaseComment[];
    
    return comments;
  } catch (error) {
    console.error("[T4U] Error fetching comments:", error);
    throw error;
  }
}

/**
 * Update a comment (only the content)
 */
export async function updateTestCaseComment(
  commentId: string,
  content: string
): Promise<void> {
  try {
    const commentRef = doc(db, "test_case_comments", commentId);
    const updateData = {
      content,
      updated_at: new Date().toISOString(),
    };
    
    await setDoc(commentRef, updateData, { merge: true });
    console.log("[T4U] Comment updated:", commentId);
  } catch (error) {
    console.error("[T4U] Error updating comment:", error);
    throw error;
  }
}

/**
 * Delete a comment (soft delete by setting is_deleted flag)
 */
export async function deleteTestCaseComment(commentId: string): Promise<void> {
  try {
    const commentRef = doc(db, "test_case_comments", commentId);
    await deleteDoc(commentRef);
    console.log("[T4U] Comment deleted:", commentId);
  } catch (error) {
    console.error("[T4U] Error deleting comment:", error);
    throw error;
  }
}

