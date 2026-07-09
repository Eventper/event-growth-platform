import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const eventKey = "iamher-2026-08-28";
const tasks = [
  "Confirm co-creation participation",
  "Send partner pack to Cetaphil",
  "Send partner pack to Obagi",
  "Invite laser clinic",
  "Invite filler company",
  "Contact Lisardam",
  "Confirm Adex goodie bag products",
  "Provide top 10 client guest list",
  "Provide brand bio and logo",
  "Deliver goodie bag products",
];

export default function IAmHerEstherPortal() {
  usePageMeta({
    title: "I Am Her — Esther Portal | Event Perfekt",
    description: "Esther's private I Am Her co-creator portal.",
  });
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [taskTitle, setTaskTitle] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [persistedTasks, setPersistedTasks] = useState<any[]>([]);
  const { toast } = useToast();
  useEffect(() => {
    Promise.all([
      fetch(`/api/iam-her/tasks?eventKey=${eventKey}`).then(r => r.json()).catch(() => []),
      fetch(`/api/iam-her/documents?eventKey=${eventKey}`).then(r => r.json()).catch(() => []),
      fetch(`/api/iam-her/messages?eventKey=${eventKey}`).then(r => r.json()).catch(() => []),
    ]).then(([taskData, docData, messageData]) => {
      setPersistedTasks(Array.isArray(taskData) ? taskData : []);
      setDocuments(Array.isArray(docData) ? docData : []);
      setMessages(Array.isArray(messageData) ? messageData : []);
    });
  }, []);
  const addTask = async () => {
    if (!taskTitle.trim()) return;
    await apiRequest("POST", "/api/iam-her/tasks", { eventKey, title: taskTitle.trim(), completed: false });
    setTaskTitle("");
    queryClient.invalidateQueries({ queryKey: ["/api/iam-her/tasks"] });
    toast({ title: "Task saved" });
  };
  const addDocument = async () => {
    if (!docTitle.trim()) return;
    await apiRequest("POST", "/api/iam-her/documents", { eventKey, title: docTitle.trim(), fileUrl: docUrl.trim() || null, fileName: docTitle.trim() });
    setDocTitle("");
    setDocUrl("");
    toast({ title: "Document saved" });
  };
  const sendMessage = async () => {
    if (!message.trim()) return;
    await apiRequest("POST", "/api/iam-her/messages", { eventKey, senderName: "Esther", senderRole: "co-creator", message: message.trim() });
    setMessage("");
    toast({ title: "Message sent" });
  };
  return (
    <div className="min-h-screen bg-[#1b050d] text-white font-पoppins">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Card className="bg-[#2a0712] text-white border-[#E2C87A]/20">
          <CardHeader><CardTitle>Welcome, Esther</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-white/80">
            <div>I Am Her — The Woman Who Leads the Room — 30 October 2026</div>
            <div>Your project manager is Juliet Ike — juliet@eventperfekt.com</div>
          </CardContent>
        </Card>
        <Card className="bg-[#2a0712] text-white border-[#E2C87A]/20">
          <CardHeader><CardTitle>Your Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tasks.map(task => (
              <label key={task} className="flex items-start gap-3 text-sm">
                <Checkbox checked={!!done[task]} onCheckedChange={(v) => setDone(s => ({ ...s, [task]: !!v }))} />
                <span>{task}</span>
              </label>
            ))}
            {persistedTasks.map(task => <div key={task.id} className="text-sm text-white/70">{task.title}</div>)}
          </CardContent>
        </Card>
        <Card className="bg-[#2a0712] text-white border-[#E2C87A]/20">
          <CardHeader><CardTitle>Upload Documents</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Document title" className="bg-white text-black" />
              <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="Document URL" className="bg-white text-black" />
              <Button onClick={addDocument} className="bg-[#E2C87A] text-black hover:bg-[#d8bb63]">Save Document</Button>
            </div>
            {documents.map(doc => <div key={doc.id} className="text-sm text-white/70">{doc.title}</div>)}
          </CardContent>
        </Card>
        <Card className="bg-[#2a0712] text-white border-[#E2C87A]/20">
          <CardHeader><CardTitle>Messages</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-white/80">
            {messages.map(m => <div key={m.id}>{m.senderName}: {m.message}</div>)}
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a message..." className="bg-white text-black" />
            <Button onClick={sendMessage} className="bg-[#E2C87A] text-black hover:bg-[#d8bb63]">Send Message</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}