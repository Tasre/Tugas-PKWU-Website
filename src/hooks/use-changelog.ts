import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export interface ChangelogFilters {
  search?: string;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
  targetTable?: string;
  role?: string;
}

export type AuditLogEntry = Database["public"]["Tables"]["audit_logs"]["Row"];

export const useChangelog = (filters: ChangelogFilters = {}) => {
  return useQuery({
    queryKey: ["audit_logs", filters],
    queryFn: async () => {
      // Use the typed Supabase client for the public.audit_logs table
      // We removed the 'profiles' join because the table lacks an explicit FK relationship
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false });

      if (filters.actionType && filters.actionType !== "ALL") {
        query = query.eq("action_type", filters.actionType);
      }

      if (filters.targetTable && filters.targetTable !== "ALL") {
        query = query.eq("target_table", filters.targetTable);
      }

      if (filters.startDate) {
        query = query.gte("timestamp", filters.startDate.toISOString());
      }

      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte("timestamp", end.toISOString());
      }

      const { data, error } = await query.limit(500);
      
      if (error) {
        console.error("Audit Log Fetch Error:", error);
        throw error;
      }

      let filteredData = (data || []) as AuditLogEntry[];

      if (filters.search) {
        const s = filters.search.toLowerCase();
        filteredData = filteredData.filter(item => 
          item.username?.toLowerCase().includes(s) ||
          item.description?.toLowerCase().includes(s) ||
          item.target_record_id?.toLowerCase().includes(s) ||
          item.target_table?.toLowerCase().includes(s)
        );
      }

      return filteredData;
    },
  });
};
