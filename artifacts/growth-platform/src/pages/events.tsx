import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Plus, Users, X } from "lucide-react";
import { PipelineStep } from "@/components/PipelineStep";
import { PageHeader } from "@/components/PageHeader";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface Event {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  capacity?: number;
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
}

function fetchEvents(): Promise<Event[]> {
  return apiGet("/api/growth/events");
}

function createEvent(payload: {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  capacity: string;
}): Promise<Event> {
  return apiPost("/api/growth/events", {
    ...payload,
    capacity: payload.capacity ? parseInt(payload.capacity, 10) : null,
    status: "draft",
  });
}

function deleteEvent(id: string): Promise<void> {
  return apiDelete<{ ok?: boolean }>(`/api/growth/events/${id}`).then((result) => {
    if (result && result.ok === false) throw new Error("Could not delete event");
  });
}

export default function Events() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    capacity: "",
  });

  const { data: events, isLoading, error } = useQuery({
    queryKey: ["events"],
    queryFn: fetchEvents,
  });

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setShowForm(false);
      setForm({ name: "", description: "", startDate: "", endDate: "", location: "", capacity: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  const safeEvents = Array.isArray(events) ? events : [];

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
    published: "bg-green-100 text-green-800 border-green-200",
    archived: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        intro="Create and manage your events."
        actions={
          <Button
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-burgundy text-white hover:bg-burgundy/90"
          >
            {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showForm ? "Cancel" : "New Event"}
          </Button>
        }
      />

      {error && (
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive shadow-soft">
          Failed to load events: {error.message}
        </div>
      )}

      {showForm && (
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Create Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Event name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                  placeholder="Venue or city"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm((s) => ({ ...s, capacity: e.target.value }))}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="What is this event about?"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.name.trim()}
                className="rounded-full bg-burgundy text-white hover:bg-burgundy/90"
              >
                {createMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {createMutation.error?.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl shadow-soft">
              <CardHeader>
                <Skeleton className="h-5 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}

        {safeEvents.map((event) => (
          <Card key={event.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-semibold line-clamp-1">
                  {event.name}
                </CardTitle>
                <Badge variant="outline" className={statusColors[event.status] ?? ""}>
                  {event.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm">
              {event.description && (
                <p className="text-muted-foreground line-clamp-2">{event.description}</p>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {event.startDate
                    ? new Date(event.startDate).toLocaleDateString()
                    : "No date set"}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.capacity && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>Capacity: {event.capacity}</span>
                </div>
              )}
              <div className="pt-2 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate(event.id)}
                  disabled={deleteMutation.isPending}
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {safeEvents.length === 0 && !isLoading && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-12 border border-dashed rounded-lg">
            <img src={`${import.meta.env.BASE_URL}assets/empty-state.png`} alt="No events" className="w-24 h-24 mx-auto mb-3 rounded-lg object-cover opacity-80" />
            <p className="text-muted-foreground">No events yet. Create your first one above.</p>
          </div>
        )}
      </div>

      {/* Pipeline Step */}
      <PipelineStep current="events" />
    </div>
  );
}
