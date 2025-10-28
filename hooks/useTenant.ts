"use client";

import { useState, useEffect } from "react";
import { Tenant } from "@/types";
import { getUserTenant, createTenant, createOrUpdateUser, updateUserLastLogin } from "@/lib/t4u";
import { User } from "firebase/auth";

export function useTenant(firebaseUser: User | null) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!firebaseUser) {
      setTenant(null);
      setLoading(false);
      setNeedsOnboarding(false);
      return;
    }

    const checkTenant = async () => {
      try {
        setLoading(true);
        const userTenant = await getUserTenant(firebaseUser.uid);

        if (userTenant) {
          setTenant(userTenant);
          setNeedsOnboarding(false);

          // Update user's last login (preserves existing role)
          await updateUserLastLogin(
            firebaseUser.uid,
            {
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "",
              photoURL: firebaseUser.photoURL || undefined,
            }
          );
        } else {
          setTenant(null);
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error("[useTenant] Error checking tenant:", error);
      } finally {
        setLoading(false);
      }
    };

    checkTenant();
  }, [firebaseUser]);

  const createNewTenant = async (companyName: string) => {
    if (!firebaseUser) {
      throw new Error("No user logged in");
    }

    try {
      setLoading(true);
      const newTenant = await createTenant(companyName, firebaseUser.uid);
      
      // Create user profile with owner role
      await createOrUpdateUser(
        firebaseUser.uid,
        newTenant.id,
        {
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || undefined,
        },
        true // isOwner
      );

      setTenant(newTenant);
      setNeedsOnboarding(false);
      return newTenant;
    } catch (error) {
      console.error("[useTenant] Error creating tenant:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    tenant,
    loading,
    needsOnboarding,
    createNewTenant,
  };
}

