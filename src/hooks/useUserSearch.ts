import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const useUserSearch = (searchQuery: string, chatId: string) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery || searchQuery.trim().length < 1) {
        setUsers([]);
        return;
      }

      setLoading(true);
      try {
        // Get current chat members to exclude them
        const { data: chatMembers } = await supabase
          .from("chat_members")
          .select("user_id")
          .eq("chat_id", chatId);

        const memberIds = chatMembers?.map((m) => m.user_id) || [];

        // Search for users by email or full name
        const searchPattern = `%${searchQuery.trim()}%`;

        let query = supabase
          .from("profiles")
          .select("*")
          .or(`email.ilike.${searchPattern},full_name.ilike.${searchPattern}`)
          .limit(10);

        // Exclude existing chat members
        if (memberIds.length > 0) {
          query = query.not("id", "in", `(${memberIds.join(",")})`);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Supabase search error:", error);
          throw error;
        }

        console.log("Search results:", data);
        setUsers(data || []);
      } catch (error) {
        console.error("Error searching users:", error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, chatId]);

  return { users, loading };
};
