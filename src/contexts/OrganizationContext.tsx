import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  role?: "owner" | "admin" | "member"; // User's role in this organization
}

interface CreateOrganizationData {
  name: string;
  description?: string;
  logo_url?: string;
}

interface UpdateOrganizationData {
  name?: string;
  description?: string;
  logo_url?: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  switchOrganization: (organizationId: string) => void;
  createOrganization: (data: CreateOrganizationData) => Promise<Organization | null>;
  updateOrganization: (id: string, data: UpdateOrganizationData) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const CURRENT_ORG_KEY = "currentOrganizationId";

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's organizations
  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch organizations where user is a member
      const { data: memberships, error: membershipsError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", user.id);

      if (membershipsError) throw membershipsError;

      if (!memberships || memberships.length === 0) {
        setOrganizations([]);
        setCurrentOrganization(null);
        setIsLoading(false);
        return;
      }

      // Fetch organization details
      const orgIds = memberships.map((m) => m.organization_id);
      const { data: orgsData, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .in("id", orgIds)
        .order("created_at", { ascending: false });

      if (orgsError) throw orgsError;

      // Combine organization data with user's role
      const orgsWithRoles: Organization[] = (orgsData || []).map((org) => {
        const membership = memberships.find((m) => m.organization_id === org.id);
        return {
          ...org,
          role: membership?.role as "owner" | "admin" | "member",
        };
      });

      setOrganizations(orgsWithRoles);

      // Auto-select organization
      const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
      const savedOrg = orgsWithRoles.find((org) => org.id === savedOrgId);

      if (savedOrg) {
        setCurrentOrganization(savedOrg);
      } else if (orgsWithRoles.length > 0) {
        // Select first organization if no saved preference
        setCurrentOrganization(orgsWithRoles[0]);
        localStorage.setItem(CURRENT_ORG_KEY, orgsWithRoles[0].id);
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      toast.error("ორგანიზაციების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh organizations
  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  // Switch to a different organization
  const switchOrganization = (organizationId: string) => {
    const org = organizations.find((o) => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem(CURRENT_ORG_KEY, organizationId);
      toast.success(`გადავედით: ${org.name}`);
    }
  };

  // Create a new organization
  const createOrganization = async (
    data: CreateOrganizationData
  ): Promise<Organization | null> => {
    if (!user) {
      toast.error("გთხოვთ შეხვიდეთ სისტემაში");
      return null;
    }

    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: data.name,
          description: data.description || null,
          logo_url: data.logo_url || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: org.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      // Refresh organizations list
      await fetchOrganizations();

      // Auto-switch to new organization
      const newOrg: Organization = { ...org, role: "owner" };
      setCurrentOrganization(newOrg);
      localStorage.setItem(CURRENT_ORG_KEY, org.id);

      toast.success("ორგანიზაცია წარმატებით შეიქმნა!");
      return newOrg;
    } catch (error) {
      console.error("Error creating organization:", error);
      toast.error("ორგანიზაციის შექმნა ვერ მოხერხდა");
      return null;
    }
  };

  // Update an organization
  const updateOrganization = async (id: string, data: UpdateOrganizationData) => {
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: data.name,
          description: data.description,
          logo_url: data.logo_url,
        })
        .eq("id", id);

      if (error) throw error;

      // Refresh organizations
      await fetchOrganizations();
      toast.success("ორგანიზაცია განახლდა");
    } catch (error) {
      console.error("Error updating organization:", error);
      toast.error("ორგანიზაციის განახლება ვერ მოხერხდა");
      throw error;
    }
  };

  // Delete an organization
  const deleteOrganization = async (id: string) => {
    try {
      const { error } = await supabase.from("organizations").delete().eq("id", id);

      if (error) throw error;

      // If deleted organization was current, clear it
      if (currentOrganization?.id === id) {
        setCurrentOrganization(null);
        localStorage.removeItem(CURRENT_ORG_KEY);
      }

      // Refresh organizations
      await fetchOrganizations();
      toast.success("ორგანიზაცია წაიშალა");
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error("ორგანიზაციის წაშლა ვერ მოხერხდა");
      throw error;
    }
  };

  // Fetch organizations on mount and when user changes
  useEffect(() => {
    fetchOrganizations();
  }, [user]);

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    isLoading,
    switchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};
