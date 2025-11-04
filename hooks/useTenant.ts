"use client";

import { useState, useEffect } from "react";
import { Tenant } from "@/types";
import { getUserTenant, updateTenantName } from "@/lib/firestore/tenants";
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
          // Show onboarding if tenant needs setup (temporary name from backend)
          setNeedsOnboarding(userTenant.needs_setup === true);
        } else {
          // This shouldn't happen anymore - tenant is created by blocking function
          // But handle it gracefully
          setTenant(null);
          setNeedsOnboarding(false);
          console.warn("[useTenant] User has no tenant - this should not happen with blocking functions");
        }
      } catch (error) {
        console.error("[useTenant] Error checking tenant:", error);
      } finally {
        setLoading(false);
      }
    };

    checkTenant();
  }, [firebaseUser]);

  const completeTenantSetup = async (companyName: string) => {
    if (!firebaseUser || !tenant) {
      throw new Error("No user or tenant found");
    }

    try {
      setLoading(true);
      
      // Update tenant name (tenant already created by blocking function)
      await updateTenantName(tenant.id, companyName);

      // Update local state
      const updatedTenant = {
        ...tenant,
        name: companyName,
        needs_setup: false,
      };
      
      setTenant(updatedTenant);
      setNeedsOnboarding(false);
      
      return updatedTenant;
    } catch (error) {
      console.error("[useTenant] Error completing tenant setup:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    tenant,
    loading,
    needsOnboarding,
    completeTenantSetup,
  };
}
