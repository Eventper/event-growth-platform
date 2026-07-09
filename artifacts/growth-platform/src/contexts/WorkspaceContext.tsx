import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkspaces, type Workspace } from "@/lib/aiCommsApi";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceContextType {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  setSelectedWorkspaceId: (id: string) => void;
  activeWorkspace: Workspace | null;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  selectedWorkspaceId: null,
  setSelectedWorkspaceId: () => {},
  activeWorkspace: null,
  isLoading: false,
});

const STORAGE_KEY = "growth_selected_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [selectedWorkspaceId, setSelected] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );

  // Workspaces only load once the user is authenticated (the endpoint is authed
  // and auto-provisions a Default Workspace on first call).
  const { data, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
    enabled: !!token,
  });
  const workspaces = data?.workspaces ?? [];

  const setSelectedWorkspaceId = useCallback((id: string) => {
    setSelected(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  // Default the selection to the stored choice if still valid, else the default
  // workspace, else the first one.
  useEffect(() => {
    if (!workspaces.length) return;
    const stored = workspaces.find((w) => w.id === selectedWorkspaceId);
    if (stored) return;
    const fallback = workspaces.find((w) => w.isDefault) || workspaces[0];
    if (fallback) setSelectedWorkspaceId(fallback.id);
  }, [workspaces, selectedWorkspaceId, setSelectedWorkspaceId]);

  const activeWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId) || null;

  return (
    <WorkspaceContext.Provider value={{ workspaces, selectedWorkspaceId, setSelectedWorkspaceId, activeWorkspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
