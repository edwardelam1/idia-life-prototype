import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlatformRole = "Org Admin" | "Team Lead" | "Team Member" | string;

export interface Membership {
  employeeId: string;
  businessId: string;
  businessName: string;
  platformRole: PlatformRole;
  isLastOrgAdmin: boolean;
}

export interface ConversionRequest {
  id: string;
  company_name: string;
  contact_name: string;
  contact_role: string;
  industry: string | null;
  status: string | null;
  created_at: string | null;
}

export interface IntakePayload {
  companyName: string;
  industry: string;
  contactName: string;
  contactRole: string;
}

interface State {
  loading: boolean;
  memberships: Membership[];
  pendingRequest: ConversionRequest | null;
}

const PENDING_STATUSES = new Set(["pending", "in_review", "received", "review"]);

/**
 * Reads business memberships and intake-application status for the current user.
 *
 * IDIA Life is intake-only for business accounts. We never create a business or
 * assign Org Admin from this app — the Hub app does that after KYB.
 */
export const useBusinessMembership = () => {
  const [state, setState] = useState<State>({
    loading: true,
    memberships: [],
    pendingRequest: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    console.log("[BUSINESS_MEMBERSHIP_LOAD_START]");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setState({ loading: false, memberships: [], pendingRequest: null });
      return;
    }

    // 1. Active employees memberships joined with business name.
    const { data: empRows, error: empErr } = await supabase
      .from("employees")
      .select("id, business_id, platform_role, status, businesses:business_id ( name )")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (empErr) console.error("[BUSINESS_MEMBERSHIP] employees error", empErr);

    const baseMemberships: Membership[] = (empRows || []).map((row: any) => ({
      employeeId: row.id,
      businessId: row.business_id,
      businessName: row.businesses?.name || "Unnamed Business",
      platformRole: row.platform_role || "Team Member",
      isLastOrgAdmin: false,
    }));

    // 2. For each Org Admin membership, count *other* active Org Admins.
    const memberships = await Promise.all(
      baseMemberships.map(async (m) => {
        if (m.platformRole !== "Org Admin") return m;
        const { count, error } = await supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("business_id", m.businessId)
          .eq("platform_role", "Org Admin")
          .eq("status", "active")
          .neq("id", m.employeeId);
        if (error) console.error("[BUSINESS_MEMBERSHIP] admin count error", error);
        return { ...m, isLastOrgAdmin: (count || 0) === 0 };
      }),
    );

    // 3. Most recent pending intake request, if any.
    const { data: reqRows, error: reqErr } = await supabase
      .from("account_conversion_requests")
      .select("id, company_name, contact_name, contact_role, industry, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (reqErr) console.error("[BUSINESS_MEMBERSHIP] requests error", reqErr);

    const latest = (reqRows || [])[0] as ConversionRequest | undefined;
    const pendingRequest =
      latest && PENDING_STATUSES.has((latest.status || "pending").toLowerCase()) ? latest : null;

    setState({ loading: false, memberships, pendingRequest });
    console.log("[BUSINESS_MEMBERSHIP_LOAD_END]", {
      memberships: memberships.length,
      hasPending: !!pendingRequest,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitIntake = useCallback(
    async (payload: IntakePayload) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to apply.");

      const { error } = await supabase.from("account_conversion_requests").insert({
        user_id: user.id,
        company_name: payload.companyName.trim(),
        industry: payload.industry || null,
        contact_name: payload.contactName.trim(),
        contact_role: payload.contactRole,
        request_type: "Personal to Business",
        status: "pending",
      });
      if (error) throw error;
      await load();
    },
    [load],
  );

  const leaveBusiness = useCallback(
    async (employeeId: string) => {
      const { error } = await supabase.rpc(
        "revoke_employee" as any,
        { _employee_id: employeeId } as any,
      );
      if (error) {
        if ((error.message || "").includes("LAST_ORG_ADMIN_DELETE_ORG")) {
          throw new Error(
            "You are the last Org Admin. Closing the business is not allowed from IDIA Life.",
          );
        }
        throw error;
      }
      await load();
    },
    [load],
  );

  return {
    ...state,
    refresh: load,
    submitIntake,
    leaveBusiness,
  };
};
