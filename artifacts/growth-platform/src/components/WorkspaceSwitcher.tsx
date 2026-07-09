import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Layers, Loader2 } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { createWorkspace } from "@/lib/aiCommsApi";

// The workspace picker that sits under the sidebar brand. Workspaces are the
// tier between the account and a brand (Platform → Workspace → Brand → Campaign
// → Communication); switching scopes which brands you work with.
export default function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setSelectedWorkspaceId, isLoading } = useWorkspace();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const onCreate = async () => {
    const name = window.prompt("Name your new workspace");
    if (!name?.trim()) return;
    setCreating(true);
    try {
      const { workspace } = await createWorkspace({ name: name.trim() });
      await qc.invalidateQueries({ queryKey: ["workspaces"] });
      setSelectedWorkspaceId(workspace.id);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-left"
      >
        <Layers className="w-3.5 h-3.5 text-gold shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[9px] text-sidebar-muted uppercase tracking-wider">Workspace</div>
          <div className="text-[12px] text-ivory font-medium truncate">
            {isLoading ? "Loading…" : activeWorkspace?.name || "—"}
          </div>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-ivory/40 shrink-0" />
      </button>

      {open && (
        <>
          {/* click-away */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-white/10 bg-sidebar shadow-2xl shadow-black/50 overflow-hidden">
            <div className="max-h-[240px] overflow-y-auto py-1">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { setSelectedWorkspaceId(w.id); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                >
                  <Check className={`w-3.5 h-3.5 shrink-0 ${w.id === activeWorkspace?.id ? "text-gold" : "text-transparent"}`} />
                  <span className="text-[12.5px] text-ivory truncate flex-1">{w.name}</span>
                  {w.isDefault && <span className="text-[9px] text-sidebar-muted uppercase">Default</span>}
                </button>
              ))}
            </div>
            <button
              onClick={onCreate}
              disabled={creating}
              className="w-full flex items-center gap-2 px-3 py-2 border-t border-white/10 text-left hover:bg-white/5 transition-colors text-gold disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="text-[12px] font-medium">New workspace</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
