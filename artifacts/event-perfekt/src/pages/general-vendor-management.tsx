import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from "xlsx";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Users, 
  Mail, 
  Phone, 
  Globe, 
  Calendar,
  Clock,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  Star,
  Building2,
  Wrench,
  Send,
  Upload,
  FileSpreadsheet,
  Table2,
  Download,
  X,
  Loader2,
  Link
} from "lucide-react";
import type { Vendor, InsertVendor } from "@shared/schema";

type ImportedRow = Record<string, string>;

// Enhanced vendor form schema
const vendorFormSchema = z.object({
  eventId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  companyName: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  email: z.string().email("Valid email required"),
  phone: z.string().min(1, "Phone is required"),
  serviceType: z.string().min(1, "Service type is required"),
  serviceDescription: z.string().optional(),
  serviceDate: z.string().optional(),
  serviceTime: z.string().optional(),
  eventSegment: z.string().optional(),
  staffCount: z.number().min(1).default(1),
  equipmentList: z.array(z.string()).default([]),
  specialRequirements: z.string().optional(),
  isOnVendorList: z.boolean().default(false),
  quotedAmount: z.number().optional(),
  finalAmount: z.number().optional(),
  currency: z.string().default("USD"),
  paymentStatus: z.string().default("unpaid"),
  depositAmount: z.number().optional(),
  depositPaid: z.boolean().default(false),
  status: z.string().default("pending"),
  priority: z.string().default("medium"),
  notes: z.string().optional(),
});

export default function GeneralVendorManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedServiceType, setSelectedServiceType] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importTab, setImportTab] = useState<"excel" | "google">("excel");
  const [importedRows, setImportedRows] = useState<ImportedRow[]>([]);
  const [importPreview, setImportPreview] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [importEventId, setImportEventId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [equipmentInput, setEquipmentInput] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch events for dropdown
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/events'],
    retry: false,
  });

  // Fetch all vendors
  const { data: vendors = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
    retry: false,
  });

  const form = useForm<z.infer<typeof vendorFormSchema>>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      companyName: "",
      website: "",
      email: "",
      phone: "",
      serviceType: "",
      serviceDescription: "",
      serviceDate: "",
      serviceTime: "",
      eventSegment: "",
      staffCount: 1,
      equipmentList: [],
      specialRequirements: "",
      isOnVendorList: false,
      quotedAmount: 0,
      finalAmount: 0,
      currency: "USD",
      paymentStatus: "unpaid",
      depositAmount: 0,
      depositPaid: false,
      status: "pending",
      priority: "medium",
      notes: "",
    },
  });

  // Service types for event vendors
  const serviceTypes = [
    "Catering", "Photography", "Videography", "Music/DJ", "Entertainment", 
    "Security", "Transportation", "Lighting", "Sound System", "Staging",
    "Floral Arrangements", "Catering Equipment", "Bar Service", "Cleaning",
    "Parking/Valet", "Hair & Makeup", "Event Coordination", "Other"
  ];

  // Event segments
  const eventSegments = [
    "Pre-Event", "Ceremony", "Cocktail Hour", "Reception", 
    "After-Party", "Full Event", "Setup", "Breakdown"
  ];

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (data: z.infer<typeof vendorFormSchema>) => {
      return apiRequest('POST', '/api/vendors', {
          ...data,
          serviceDate: data.serviceDate ? new Date(data.serviceDate).toISOString() : null,
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Vendor added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add vendor",
        variant: "destructive",
      });
    },
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async (data: { id: string; vendor: z.infer<typeof vendorFormSchema> }) => {
      return apiRequest('PUT', `/api/vendors/${data.id}`, {
          ...data.vendor,
          serviceDate: data.vendor.serviceDate ? new Date(data.vendor.serviceDate).toISOString() : null,
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      setEditingVendor(null);
      resetForm();
      toast({
        title: "Success",
        description: "Vendor updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update vendor",
        variant: "destructive",
      });
    },
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      toast({
        title: "Success",
        description: "Vendor deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete vendor",
        variant: "destructive",
      });
    },
  });

  // Send contract email mutation
  const sendContractMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      return apiRequest('POST', `/api/vendors/${vendorId}/send-contract`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      toast({
        title: "Success",
        description: "Contract email sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send contract email",
        variant: "destructive",
      });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data: { vendors: ImportedRow[]; eventId?: string }) => {
      const res = await apiRequest('POST', '/api/vendors/bulk-import', data);
      return res as any;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendors'] });
      setIsImportDialogOpen(false);
      setImportedRows([]);
      setImportPreview(false);
      setImportFileName("");
      setGoogleSheetUrl("");
      toast({
        title: "Import Complete",
        description: `${data.success} vendors imported successfully${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to import vendors", variant: "destructive" });
    },
  });

  const handleExcelUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
        const normalizedRows: ImportedRow[] = jsonData.map((row) => {
          const normalized: ImportedRow = {};
          for (const [key, val] of Object.entries(row)) {
            const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            let mappedKey = cleanKey;
            if (['name', 'vendorname', 'vendor', 'suppliername', 'supplier'].includes(cleanKey)) mappedKey = 'name';
            else if (['email', 'emailaddress', 'mail', 'contactemail'].includes(cleanKey)) mappedKey = 'email';
            else if (['phone', 'phonenumber', 'telephone', 'tel', 'mobile', 'contact'].includes(cleanKey)) mappedKey = 'phone';
            else if (['servicetype', 'service', 'category', 'type', 'specialty'].includes(cleanKey)) mappedKey = 'serviceType';
            else if (['quotedamount', 'amount', 'price', 'cost', 'quote', 'rate', 'fee', 'budget'].includes(cleanKey)) mappedKey = 'quotedAmount';
            else if (['website', 'url', 'web', 'site'].includes(cleanKey)) mappedKey = 'website';
            else if (['notes', 'description', 'comments', 'details'].includes(cleanKey)) mappedKey = 'notes';
            else if (['companyname', 'company', 'businessname', 'organisation'].includes(cleanKey)) mappedKey = 'companyName';
            else if (['status'].includes(cleanKey)) mappedKey = 'status';
            else if (['currency', 'curr'].includes(cleanKey)) mappedKey = 'currency';
            normalized[mappedKey] = String(val);
          }
          if (!normalized.name && normalized.companyName) normalized.name = normalized.companyName;
          return normalized;
        }).filter(row => row.name);
        setImportedRows(normalizedRows);
        setImportPreview(true);
        toast({ title: "File Loaded", description: `Found ${normalizedRows.length} vendor rows in "${file.name}"` });
      } catch {
        toast({ title: "Error", description: "Could not read the file. Please ensure it's a valid Excel or CSV file.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [toast]);

  const handleGoogleSheetFetch = async () => {
    if (!googleSheetUrl.trim()) {
      toast({ title: "Error", description: "Please enter a Google Sheet URL", variant: "destructive" });
      return;
    }
    setIsLoadingSheet(true);
    try {
      const res = await apiRequest('POST', '/api/vendors/import-google-sheet', { sheetUrl: googleSheetUrl });
      const data = res as any;
      if (data.rows && data.rows.length > 0) {
        setImportedRows(data.rows);
        setImportPreview(true);
        toast({ title: "Sheet Loaded", description: `Found ${data.totalRows} vendor rows` });
      } else {
        toast({ title: "No Data", description: "No vendor data found in the sheet. Check your column headers.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not access the Google Sheet. Make sure it's shared as 'Anyone with the link can view'.", variant: "destructive" });
    }
    setIsLoadingSheet(false);
  };

  const handleConfirmImport = () => {
    bulkImportMutation.mutate({
      vendors: importedRows,
      eventId: importEventId || undefined,
    });
  };

  const removeImportRow = (index: number) => {
    setImportedRows(prev => prev.filter((_, i) => i !== index));
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Company Name', 'Email', 'Phone', 'Service Type', 'Quoted Amount', 'Currency', 'Website', 'Status', 'Notes'],
      ['ABC Catering Ltd', 'ABC Catering', 'info@abccatering.com', '+44 20 1234 5678', 'Catering', '15000', 'GBP', 'www.abccatering.com', 'pending', 'Full service catering'],
      ['XYZ Photography', 'XYZ Studios', 'hello@xyz.com', '+44 20 9876 5432', 'Photography', '3500', 'GBP', 'www.xyzphoto.com', 'confirmed', 'Event photography'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
    XLSX.writeFile(wb, 'vendor_import_template.xlsx');
  };

  const resetForm = () => {
    form.reset();
    setEquipmentInput("");
  };

  const startEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    form.reset({
      eventId: vendor.eventId || "",
      name: vendor.name ?? "",
      companyName: vendor.companyName || "",
      website: vendor.website || "",
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      serviceType: vendor.serviceType ?? "",
      serviceDescription: vendor.serviceDescription || "",
      serviceDate: vendor.serviceDate ? new Date(vendor.serviceDate).toISOString().split('T')[0] : "",
      serviceTime: vendor.serviceTime || "",
      eventSegment: vendor.eventSegment || "",
      staffCount: vendor.staffCount || 1,
      equipmentList: vendor.equipmentList || [],
      specialRequirements: vendor.specialRequirements || "",
      isOnVendorList: vendor.isOnVendorList || false,
      quotedAmount: vendor.quotedAmount ? Number(vendor.quotedAmount) : 0,
      finalAmount: vendor.finalAmount ? Number(vendor.finalAmount) : 0,
      currency: vendor.currency || "USD",
      paymentStatus: vendor.paymentStatus || "unpaid",
      depositAmount: vendor.depositAmount ? Number(vendor.depositAmount) : 0,
      depositPaid: vendor.depositPaid || false,
      status: vendor.status ?? "", 
      priority: vendor.priority || "medium",
      notes: vendor.notes || "",
    });
  };

  const onSubmit = (data: z.infer<typeof vendorFormSchema>) => {
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, vendor: data });
    } else {
      createVendorMutation.mutate(data);
    }
  };

  const addEquipment = () => {
    if (equipmentInput.trim()) {
      const currentEquipment = form.getValues("equipmentList");
      form.setValue("equipmentList", [...currentEquipment, equipmentInput.trim()]);
      setEquipmentInput("");
    }
  };

  const removeEquipment = (index: number) => {
    const currentEquipment = form.getValues("equipmentList");
    form.setValue("equipmentList", currentEquipment.filter((_, i) => i !== index));
  };

  // Filter vendors based on search and filters
  const filteredVendors = vendors.filter((vendor: Vendor) => {
    const matchesSearch = (vendor.name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vendor.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vendor.serviceType ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEvent = selectedEvent === "all" || vendor.eventId === selectedEvent;
    const matchesStatus = selectedStatus === "all" || vendor.status === selectedStatus;
    const matchesServiceType = selectedServiceType === "all" || vendor.serviceType === selectedServiceType;
    
    return matchesSearch && matchesEvent && matchesStatus && matchesServiceType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 border-green-300";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-300";
      case "completed": return "bg-purple-100 text-purple-800 border-purple-300";
      case "cancelled": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-burgundy-100 text-burgundy-800 border-yellow-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-300";
      case "medium": return "bg-burgundy-100 text-burgundy-800 border-yellow-300";
      case "low": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-burgundy-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">General Vendor Management</h1>
            <p className="text-burgundy-200 mt-2">Complete event vendor coordination system</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setIsImportDialogOpen(true)}
              className="bg-white text-burgundy-900 border border-burgundy-300"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Vendors
            </Button>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-burgundy-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vendor
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="border-burgundy-700 bg-burgundy-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-burgundy-300" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-burgundy-700 border-burgundy-600 text-white placeholder-burgundy-300"
                />
              </div>
              
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="bg-burgundy-700 border-burgundy-600 text-white">
                  <SelectValue placeholder="Filter by Event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map((event: any) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-burgundy-700 border-burgundy-600 text-white">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedServiceType} onValueChange={setSelectedServiceType}>
                <SelectTrigger className="bg-burgundy-700 border-burgundy-600 text-white">
                  <SelectValue placeholder="Filter by Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2 text-burgundy-200">
                <Filter className="w-4 h-4" />
                <span className="text-sm">{filteredVendors.length} vendors</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendors List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white mt-4">Loading vendors...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <Card className="border-burgundy-700 bg-burgundy-800">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-burgundy-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Vendors Found</h3>
              <p className="text-burgundy-200 mb-4">
                {searchTerm || selectedEvent !== "all" || selectedStatus !== "all" || selectedServiceType !== "all"
                  ? "No vendors match your search criteria"
                  : "Start building your vendor network by adding vendors"
                }
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="bg-burgundy-700 hover:bg-burgundy-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Vendor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredVendors.map((vendor: Vendor) => (
              <Card key={vendor.id} className="border-burgundy-700 bg-burgundy-800 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">{vendor.name}</h3>
                        {vendor.isOnVendorList && (
                          <Badge className="bg-burgundy-100 text-burgundy-800 border-yellow-300">
                            <Star className="w-3 h-3 mr-1" />
                            Preferred
                          </Badge>
                        )}
                      </div>
                      {vendor.companyName && (
                        <p className="text-sm text-burgundy-200 flex items-center mb-1">
                          <Building2 className="w-3 h-3 mr-1" />
                          {vendor.companyName}
                        </p>
                      )}
                      <Badge variant="outline" className="border-burgundy-300 text-burgundy-200 mb-2">
                        {vendor.serviceType}
                      </Badge>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(vendor)}
                        className="text-burgundy-300 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteVendorMutation.mutate(vendor.id)}
                        className="text-burgundy-300 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-burgundy-200">
                      <Mail className="w-4 h-4 mr-2 text-burgundy-300" />
                      {vendor.email}
                    </div>
                    <div className="flex items-center text-burgundy-200">
                      <Phone className="w-4 h-4 mr-2 text-burgundy-300" />
                      {vendor.phone}
                    </div>
                    {vendor.website && (
                      <div className="flex items-center text-burgundy-200">
                        <Globe className="w-4 h-4 mr-2 text-burgundy-300" />
                        <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                          Website
                        </a>
                      </div>
                    )}
                    {vendor.serviceDate && (
                      <div className="flex items-center text-burgundy-200">
                        <Calendar className="w-4 h-4 mr-2 text-burgundy-300" />
                        {new Date(vendor.serviceDate).toLocaleDateString()}
                        {vendor.serviceTime && (
                          <span className="ml-2 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {vendor.serviceTime}
                          </span>
                        )}
                      </div>
                    )}
                    {vendor.staffCount && vendor.staffCount > 1 && (
                      <div className="flex items-center text-burgundy-200">
                        <Users className="w-4 h-4 mr-2 text-burgundy-300" />
                        {vendor.staffCount} staff members
                      </div>
                    )}
                    {vendor.equipmentList && vendor.equipmentList.length > 0 && (
                      <div className="flex items-center text-burgundy-200">
                        <Wrench className="w-4 h-4 mr-2 text-burgundy-300" />
                        {vendor.equipmentList.length} equipment items
                      </div>
                    )}
                    {(vendor.quotedAmount || vendor.finalAmount) && (
                      <div className="flex items-center text-burgundy-200">
                        <DollarSign className="w-4 h-4 mr-2 text-burgundy-300" />
                        {vendor.finalAmount 
                          ? `Final: ${vendor.currency} ${vendor.finalAmount}`
                          : `Quote: ${vendor.currency} ${vendor.quotedAmount}`
                        }
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-burgundy-700">
                    <div className="flex space-x-2">
                      <Badge className={getStatusColor(vendor.status ?? "")}>
                        {vendor.status}
                      </Badge>
                      <Badge className={getPriorityColor(vendor.priority || "medium")}>
                        {vendor.priority}
                      </Badge>
                    </div>
                    
                    {vendor.contractStatus !== "signed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendContractMutation.mutate(vendor.id)}
                        className="border-burgundy-300 text-white hover:bg-burgundy-700"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Contract
                      </Button>
                    )}
                  </div>

                  {vendor.notes && (
                    <div className="mt-3 pt-3 border-t border-burgundy-700">
                      <p className="text-xs text-burgundy-200">
                        <span className="font-medium">Notes:</span> {vendor.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Vendor Dialog */}
        <Dialog open={isAddDialogOpen || !!editingVendor} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingVendor(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-burgundy-900">
                {editingVendor ? "Edit Vendor" : "Add New Vendor"}
              </DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                    
                    <FormField
                      control={form.control}
                      name="eventId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select event" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {events.map((event: any) => (
                                <SelectItem key={event.id} value={event.id}>
                                  {event.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Contact person name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Company/Business name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="vendor@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="[PHONE REMOVED]" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Service Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Service Details</h3>

                    <FormField
                      control={form.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select service type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {serviceTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serviceDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe the specific services they provide..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serviceDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serviceTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Time</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 9:00 AM - 5:00 PM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="eventSegment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Segment</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select event segment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {eventSegments.map((segment) => (
                                <SelectItem key={segment} value={segment}>
                                  {segment}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="staffCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Staff</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Equipment List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Equipment & Requirements</h3>
                  
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Add equipment item..."
                      value={equipmentInput}
                      onChange={(e) => setEquipmentInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
                    />
                    <Button type="button" onClick={addEquipment}>Add</Button>
                  </div>

                  {form.watch("equipmentList").length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.watch("equipmentList").map((item, index) => (
                        <Badge key={index} variant="secondary" className="pr-1">
                          {item}
                          <button
                            type="button"
                            onClick={() => removeEquipment(index)}
                            className="ml-2 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="specialRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requirements</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any special requirements or notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Financial & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Financial Information</h3>

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="quotedAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quoted Amount</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="finalAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Final Amount</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="CAD">CAD</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="paymentStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unpaid">Unpaid</SelectItem>
                                <SelectItem value="partial">Partial</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="depositAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deposit Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="depositPaid"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Deposit Paid</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">Status & Priority</h3>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isOnVendorList"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Preferred Vendor</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Add to preferred vendor list
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes and comments..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingVendor(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createVendorMutation.isPending || updateVendorMutation.isPending}
                    className="bg-burgundy-700 hover:bg-burgundy-600"
                  >
                    {createVendorMutation.isPending || updateVendorMutation.isPending
                      ? "Saving..."
                      : editingVendor
                      ? "Update Vendor"
                      : "Add Vendor"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
          setIsImportDialogOpen(open);
          if (!open) { setImportedRows([]); setImportPreview(false); setImportFileName(""); setGoogleSheetUrl(""); }
        }}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Upload className="w-5 h-5" />
                Import Vendors
              </DialogTitle>
              <DialogDescription>
                Import vendors from an Excel file (.xlsx, .xls, .csv) or a Google Sheet
              </DialogDescription>
            </DialogHeader>

            {!importPreview ? (
              <div className="space-y-6">
                <div className="flex border-b">
                  <button
                    onClick={() => setImportTab("excel")}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                      importTab === "excel" 
                        ? "border-burgundy-700 text-burgundy-900" 
                        : "border-transparent text-gray-500"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 inline mr-2" />
                    Excel / CSV File
                  </button>
                  <button
                    onClick={() => setImportTab("google")}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                      importTab === "google" 
                        ? "border-burgundy-700 text-burgundy-900" 
                        : "border-transparent text-gray-500"
                    }`}
                  >
                    <Table2 className="w-4 h-4 inline mr-2" />
                    Google Sheets
                  </button>
                </div>

                {importTab === "excel" ? (
                  <div className="space-y-6">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer transition-colors"
                    >
                      <FileSpreadsheet className="w-12 h-12 mx-auto text-burgundy-700 mb-4" />
                      <p className="text-lg font-medium text-gray-700">
                        {importFileName || "Click to upload your vendor spreadsheet"}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Supports .xlsx, .xls, and .csv files
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelUpload}
                        className="hidden"
                      />
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-2">Expected Columns</h4>
                      <p className="text-sm text-gray-500 mb-3">
                        Your spreadsheet should include column headers. We'll automatically map common names like:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['Name', 'Email', 'Phone', 'Service Type', 'Quoted Amount', 'Currency', 'Company Name', 'Website', 'Status', 'Notes'].map(col => (
                          <Badge key={col} variant="outline" className="text-xs">{col}</Badge>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={downloadTemplate}
                      >
                        <Download className="w-3 h-3 mr-2" />
                        Download Template
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Google Sheet URL</Label>
                      <div className="flex gap-3">
                        <div className="relative flex-1">
                          <Link className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            value={googleSheetUrl}
                            onChange={(e) => setGoogleSheetUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="pl-10"
                          />
                        </div>
                        <Button
                          onClick={handleGoogleSheetFetch}
                          disabled={isLoadingSheet}
                          className="bg-burgundy-700 text-white"
                        >
                          {isLoadingSheet ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                          ) : (
                            <><Table2 className="w-4 h-4 mr-2" /> Fetch Data</>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">How to share your Google Sheet</h4>
                      <p className="text-sm text-blue-700 leading-relaxed">
                        Open your Google Sheet, click Share in the top right corner, under General access select Anyone with the link, set permission to Viewer, then copy the link and paste it above.
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-2">Sheet Requirements</h4>
                      <p className="text-sm text-gray-500">
                        The first row should contain headers (Name, Email, Phone, Service Type, etc.). 
                        Data starts from the second row. We'll read from the first sheet only.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Preview ({importedRows.length} vendors)</h3>
                    <p className="text-sm text-gray-500">Review the data below before importing</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setImportPreview(false); setImportedRows([]); }}
                  >
                    Start Over
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Assign to Event (optional)</Label>
                  <Select value={importEventId} onValueChange={setImportEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No event - import as general vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event assignment</SelectItem>
                      {events.map((event: any) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Phone</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Service</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Amount</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Currency</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importedRows.map((row, idx) => (
                          <tr key={idx} className="bg-white">
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium">{row.name || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.email || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.phone || '-'}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-xs">{row.serviceType || 'Other'}</Badge>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{row.quotedAmount || '-'}</td>
                            <td className="px-3 py-2 text-gray-600">{row.currency || 'GBP'}</td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => removeImportRow(idx)} className="text-red-400 p-1">
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    {importedRows.length} vendor{importedRows.length !== 1 ? 's' : ''} ready to import
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => { setIsImportDialogOpen(false); setImportedRows([]); setImportPreview(false); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmImport}
                      disabled={importedRows.length === 0 || bulkImportMutation.isPending}
                      className="bg-burgundy-700 text-white"
                    >
                      {bulkImportMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                      ) : (
                        <><CheckCircle className="w-4 h-4 mr-2" /> Import {importedRows.length} Vendors</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}