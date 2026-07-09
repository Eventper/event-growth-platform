import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PenTool, Save, Sparkles, Clock, Star, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface PlannerNotesProps {
  section: string;
  eventId?: string | null;
}

interface Note {
  id: string;
  plannerId: string;
  section: string;
  eventId: string | null;
  title: string;
  content: string;
  tags: string[];
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AISessionSummaryProps {}

export function PlannerNotes({ section, eventId }: PlannerNotesProps) {
  const [newNote, setNewNote] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["/api/events", eventId, "notes", section],
    queryFn: () => eventId ? fetch(`/api/events/${eventId}/notes`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(r => r.ok ? r.json() : []) : Promise.resolve([]),
    enabled: !!eventId,
  });

  const createNoteMutation = useMutation({
    mutationFn: (noteData: any) => apiRequest("POST", `/api/events/${eventId}/notes`, noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "notes"] });
      setNewNote("");
      setNoteTitle("");
      toast({ title: "Note Saved", description: "Your note has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => apiRequest("DELETE", `/api/notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "notes"] });
      toast({ title: "Deleted", description: "Note removed." });
    },
  });

  const handleSaveNote = () => {
    if (!newNote.trim()) {
      toast({ title: "Note Required", description: "Please write something first.", variant: "destructive" });
      return;
    }
    const title = noteTitle.trim() || `${section} Note - ${format(new Date(), "MMM d, yyyy")}`;
    createNoteMutation.mutate({
      section,
      eventId: eventId || null,
      title,
      content: newNote,
      tags: [section],
      isPrivate: true,
    });
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-md">
      <CardHeader className="pb-4 border-b border-gray-100">
        <CardTitle className="text-gray-900 text-lg font-semibold flex items-center">
          <PenTool className="w-5 h-5 mr-2 text-[#8B1538]" />
          My Notes
        </CardTitle>
        <p className="text-gray-500 text-sm mt-1">Write down ideas, reminders, or planning thoughts</p>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              placeholder="Note title (optional)"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 h-11"
            />
            <Textarea
              placeholder="Write your note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[140px] bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-400 resize-none text-sm leading-relaxed"
            />
            <Button
              onClick={handleSaveNote}
              disabled={!newNote.trim() || createNoteMutation.isPending}
              className="bg-[#8B1538] hover:bg-[#6d1029] text-white font-medium px-6"
            >
              <Save className="w-4 h-4 mr-2" />
              {createNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saved Notes</p>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-[#8B1538] border-t-transparent rounded-full mx-auto" />
                <p className="text-gray-400 text-sm mt-2">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <PenTool className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No notes yet</p>
                <p className="text-gray-400 text-xs mt-1">Your saved notes will appear here</p>
              </div>
            ) : (
              notes.map((note: Note) => (
                <div key={note.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 group hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-gray-900 text-sm">{note.title}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-400 text-xs flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(note.createdAt), "MMM d")}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(note.id)}
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AISessionSummary({}: AISessionSummaryProps) {
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const { data: summary, isLoading } = useQuery({
    queryKey: ["/api/ai-summary", sessionId],
    queryFn: () => Promise.resolve({ summary: "Agent session summary will be available here.", recommendations: [] }),
    retry: false,
  });

  return (
    <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 border-indigo-500 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm font-medium flex items-center">
          <Sparkles className="w-4 h-4 mr-2" />
          Agent Session Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto" />
            <p className="text-indigo-100 text-sm mt-2">Analyzing session...</p>
          </div>
        ) : summary ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium mb-1">Session Highlights:</p>
              <p className="text-indigo-100">{(summary as any).highlights}</p>
            </div>
            <div>
              <p className="font-medium mb-1">Key Decisions:</p>
              <p className="text-indigo-100">{(summary as any).keyDecisions}</p>
            </div>
            <div>
              <p className="font-medium mb-1">Next Actions:</p>
              <p className="text-indigo-100">{(summary as any).nextActions}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Star className="w-6 h-6 mx-auto mb-2 text-indigo-200" />
            <p className="text-indigo-100 text-sm font-medium">Agent Learning Mode</p>
            <p className="text-indigo-200 text-xs">Continue working to generate intelligent insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
