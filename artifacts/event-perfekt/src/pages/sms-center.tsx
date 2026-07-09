import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PlannerLayout from "@/components/PlannerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Users, Clock, CheckCircle, XCircle, AlertCircle, Loader2, MessageCircle, FileText, Copy, Printer } from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import { format } from "date-fns";

interface MessageLog {
  id: number;
  recipient_phone: string;
  message: string;
  type: string;
  status: string;
  sent_at: string | null;
  event_id: number | null;
  created_at: string;
}

interface Event {
  id: number;
  name: string;
  [key: string]: any;
}

const messageTypes = [
  { value: "rsvp_reminder", label: "RSVP Reminder" },
  { value: "payment_reminder", label: "Payment Reminder" },
  { value: "event_update", label: "Event Update" },
  { value: "general", label: "General" },
];

const templateMessages = [
  {
    id: "rsvp_reminder",
    label: "RSVP Reminder",
    type: "rsvp_reminder",
    icon: "📩",
    message: "Hi {name}, we hope you're well! This is a friendly reminder to RSVP for our upcoming event. Please confirm your attendance at your earliest convenience. We look forward to seeing you there!",
  },
  {
    id: "payment_reminder",
    label: "Payment Reminder",
    type: "payment_reminder",
    icon: "💳",
    message: "Hi {name}, this is a gentle reminder that your payment is due soon. Please ensure your payment is made on time to secure your booking. If you've already made the payment, kindly disregard this message. Thank you!",
  },
  {
    id: "event_update",
    label: "Event Update",
    type: "event_update",
    icon: "📢",
    message: "Hi {name}, we have an important update regarding the event! Please check your email or contact us for the latest details. We want to make sure you have all the information you need. Thank you!",
  },
  {
    id: "save_the_date",
    label: "Save the Date",
    type: "general",
    icon: "📅",
    message: "Hi {name}, save the date! We're excited to invite you to our special event. More details will follow soon. Mark your calendar and stay tuned!",
  },
  {
    id: "thank_you",
    label: "Thank You",
    type: "general",
    icon: "🙏",
    message: "Hi {name}, thank you so much for attending our event! We truly appreciate your presence and hope you had a wonderful time. We look forward to seeing you again soon!",
  },
  {
    id: "venue_change",
    label: "Venue Change Notice",
    type: "event_update",
    icon: "📍",
    message: "Hi {name}, please note that the venue for the event has been changed. The new location details will be shared shortly. We apologise for any inconvenience and appreciate your understanding.",
  },
];

function getTypeBadge(type: string) {
  const colors: Record<string, string> = {
    rsvp_reminder: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    payment_reminder: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    event_update: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    general: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    bulk: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  };
  return colors[type] || colors.general;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "sent": return <CheckCircle className="w-4 h-4 text-green-400" />;
    case "failed": return <XCircle className="w-4 h-4 text-red-400" />;
    case "queued": return <Clock className="w-4 h-4 text-amber-400" />;
    default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
  }
}

export default function SmsCenterPage() {
  const { toast } = useToast();
  const [singlePhone, setSinglePhone] = useState("");
  const [singleMessage, setSingleMessage] = useState("");
  const [singleType, setSingleType] = useState("general");
  const [singleEventId, setSingleEventId] = useState("");
  const [bulkEventId, setBulkEventId] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkType, setBulkType] = useState("general");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const { data: messageLog = [], isLoading: logLoading } = useQuery<MessageLog[]>({
    queryKey: ["/api/sms/log"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: waStatus } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/whatsapp/status"],
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/sms/send", {
        recipientPhone: singlePhone,
        message: singleMessage,
        type: singleType,
        eventId: singleEventId && singleEventId !== "none" ? Number(singleEventId) : undefined,
      }),
    onSuccess: () => {
      toast({ title: "Message sent", description: "WhatsApp message delivered successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/log"] });
      setSinglePhone("");
      setSingleMessage("");
      setSingleType("general");
      setSingleEventId("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/sms/bulk", {
        eventId: Number(bulkEventId),
        message: bulkMessage,
        type: bulkType,
      }),
    onSuccess: (data: any) => {
      toast({ title: "Bulk messages sent", description: `${data.sent || 0} messages delivered to guests.` });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/log"] });
      setBulkDialogOpen(false);
      setBulkEventId("");
      setBulkMessage("");
      setBulkType("general");
    },
    onError: (err: Error) => {
      toast({ title: "Bulk send failed", description: err.message, variant: "destructive" });
    },
  });

  const totalSent = messageLog.filter((m) => m.status === "sent").length;
  const totalFailed = messageLog.filter((m) => m.status === "failed").length;
  const thisMonth = messageLog.filter((m) => {
    const d = new Date(m.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <PlannerLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">WhatsApp Messaging</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {waStatus?.configured ? (
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-[10px]">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected to Meta Cloud API
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                    <AlertCircle className="w-3 h-3 mr-1" /> Not connected — messages logged locally
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {messageLog.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  openPrintWindow({
                    title: "WhatsApp Message Log",
                    stats: [
                      { label: "Total Messages", value: messageLog.length },
                      { label: "Delivered", value: totalSent },
                      { label: "Failed", value: totalFailed },
                      { label: "This Month", value: thisMonth },
                    ],
                    columns: [
                      { header: "Recipient", key: "recipient" },
                      { header: "Message", key: "message" },
                      { header: "Type", key: "type", format: (v: any) => v ? v.replace(/_/g, " ") : "—" },
                      { header: "Status", key: "status" },
                      { header: "Date", key: "date" },
                    ],
                    rows: messageLog.map((msg) => ({
                      recipient: msg.recipient_phone,
                      message: msg.message.length > 80 ? msg.message.slice(0, 80) + "..." : msg.message,
                      type: msg.type,
                      status: msg.status,
                      date: msg.created_at ? format(new Date(msg.created_at), "dd MMM yyyy, HH:mm") : "—",
                    })),
                    orientation: "landscape",
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            )}
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white font-medium">
                <Users className="w-4 h-4 mr-2" /> Bulk Message
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a0508] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-green-400" />
                  Send Bulk WhatsApp Messages
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-xs text-white/40">
                  Send a WhatsApp message to all guests with phone numbers on the selected event.
                  You can also send messages from Guest Management where you add and import guest numbers.
                </p>
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Event</label>
                  <Select value={bulkEventId} onValueChange={setBulkEventId}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0508] border-white/10">
                      {events.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-white/10">
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Message Type</label>
                  <Select value={bulkType} onValueChange={setBulkType}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0508] border-white/10">
                      {messageTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value} className="text-white hover:bg-white/10">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-white/70 mb-1 block">
                    Message
                  </label>
                  <Textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Hi {name}, we're excited about your upcoming event..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[100px]"
                  />
                  <p className="text-[10px] text-white/30 mt-1">
                    Use {"{name}"} to personalise each message with the guest's name
                  </p>
                </div>
                <Button
                  onClick={() => bulkMutation.mutate()}
                  disabled={!bulkEventId || !bulkMessage || bulkMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {bulkMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send to All Guests</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {!waStatus?.configured && (
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">WhatsApp not connected yet</p>
                  <p className="text-white/50 text-xs mt-1">
                    To send real WhatsApp messages, you need to set up a Meta Cloud API account and add your credentials 
                    (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID) in the Secrets tab. 
                    Until then, messages are logged here for testing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/10 backdrop-blur-sm border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white/60 text-sm">Delivered</span>
              </div>
              <p className="text-3xl font-bold text-white">{totalSent}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-white/60 text-sm">Failed</span>
              </div>
              <p className="text-3xl font-bold text-white">{totalFailed}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-white/60 text-sm">This Month</span>
              </div>
              <p className="text-3xl font-bold text-white">{thisMonth}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/10">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <MessageCircle className="w-5 h-5 text-green-400" />
                <span className="text-white/60 text-sm">Total Messages</span>
              </div>
              <p className="text-3xl font-bold text-white">{messageLog.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-400" /> Send Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-white/70 mb-1 block">WhatsApp Number</label>
                <Input
                  value={singlePhone}
                  onChange={(e) => setSinglePhone(e.target.value)}
                  placeholder="+234 801 234 5678"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                />
                <p className="text-[10px] text-white/30 mt-1">Include country code (e.g. +234 for Nigeria, +44 for UK)</p>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Type</label>
                <Select value={singleType} onValueChange={setSingleType}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0508] border-white/10">
                    {messageTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-white hover:bg-white/10">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Event (optional)</label>
                <Select value={singleEventId} onValueChange={setSingleEventId}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0508] border-white/10">
                    <SelectItem value="none" className="text-white hover:bg-white/10">None</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)} className="text-white hover:bg-white/10">
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-white/70 mb-1 block">Message</label>
                <Textarea
                  value={singleMessage}
                  onChange={(e) => setSingleMessage(e.target.value)}
                  placeholder="Type your WhatsApp message..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 min-h-[120px]"
                />
              </div>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={!singlePhone || !singleMessage || sendMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {sendMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Send WhatsApp Message</>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-sm border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" /> Message History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-white/30" />
                  </div>
                ) : messageLog.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-white/10 mx-auto mb-3" />
                    <p className="text-white/40 text-sm">No messages sent yet</p>
                    <p className="text-white/20 text-xs mt-1">Send your first WhatsApp message using the form</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {messageLog.map((msg) => (
                      <div key={msg.id} className="bg-white/5 rounded-lg p-3 border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(msg.status)}
                            <span className="text-white font-mono text-xs">{msg.recipient_phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getTypeBadge(msg.type)}`}>
                              {msg.type.replace(/_/g, " ")}
                            </span>
                            <span className="text-white/30 text-[10px]">
                              {msg.created_at ? format(new Date(msg.created_at), "dd MMM, HH:mm") : ""}
                            </span>
                          </div>
                        </div>
                        <p className="text-white/60 text-xs leading-relaxed pl-6">
                          {msg.message.length > 120 ? msg.message.slice(0, 120) + "..." : msg.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Messages by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {messageTypes.map((t) => {
                  const count = messageLog.filter((m) => m.type === t.value).length;
                  return (
                    <div key={t.value} className="bg-white/5 rounded-lg p-4 text-center border border-white/5">
                      <p className="text-2xl font-bold text-white">{count}</p>
                      <p className="text-white/50 text-xs mt-1">{t.label}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" /> Message Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {templateMessages.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-white/5 rounded-lg p-3 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSingleMessage(tpl.message);
                      setSingleType(tpl.type);
                      toast({ title: "Template applied", description: `"${tpl.label}" template loaded into the send form.` });
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tpl.icon}</span>
                        <span className="text-white text-sm font-medium">{tpl.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getTypeBadge(tpl.type)}`}>
                        {tpl.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs leading-relaxed pl-7">
                      {tpl.message.length > 100 ? tpl.message.slice(0, 100) + "..." : tpl.message}
                    </p>
                    <div className="flex items-center gap-1 mt-2 pl-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Copy className="w-3 h-3 text-white/40" />
                      <span className="text-[10px] text-white/40">Click to use this template</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PlannerLayout>
  );
}
