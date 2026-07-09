import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Send, 
  Download, 
  Plus, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Users,
  Printer,
  Pencil,
  Save,
  X,
  Trash2,
  History,
  Mail,
  Check,
  XCircle,
  MessageSquare
} from 'lucide-react';
import PlannerLayout from "@/components/PlannerLayout";
import { format } from 'date-fns';
import type { Event, Contract, Client, Vendor } from '@shared/schema';
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";

interface ContractWithDetails extends Contract {
  event?: Event;
  client?: Client;
}

export default function ContractManagement() {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showVendorGenerateDialog, setShowVendorGenerateDialog] = useState(false);
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showChangeLogDialog, setShowChangeLogDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [editingContract, setEditingContract] = useState<ContractWithDetails | null>(null);
  const [emailContract, setEmailContract] = useState<ContractWithDetails | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: contracts = [], isLoading } = useQuery<ContractWithDetails[]>({
    queryKey: ['/api/contracts'],
  });

  const generateContractMutation = useMutation({
    mutationFn: async (data: { eventId: string; additionalServices: string[]; specialRequirements: string }) => {
      return apiRequest('POST', `/api/events/${data.eventId}/generate-contract`, data);
    },
    onSuccess: (newContract: ContractWithDetails) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      setShowGenerateDialog(false);
      setSelectedContract(newContract);
      setShowContractDialog(true);
      toast({
        title: "Contract Auto-Generated",
        description: "Your full contract has been auto-generated from event data. Review it below — you can edit or send it.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateVendorContractMutation = useMutation({
    mutationFn: async (data: { eventId: string; vendorId: string }) => {
      return apiRequest('POST', `/api/events/${data.eventId}/generate-vendor-contract`, { vendorId: data.vendorId });
    },
    onSuccess: (newContract: ContractWithDetails) => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      setShowVendorGenerateDialog(false);
      setSelectedContract(newContract);
      setShowContractDialog(true);
      toast({
        title: "Vendor Contract Auto-Generated",
        description: "Your full vendor contract has been auto-generated. Review it below — you can edit or send it.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate vendor contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      return apiRequest('POST', `/api/contracts/${contractId}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      toast({
        title: "Contract Sent",
        description: "Contract has been sent for signing.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createManualContractMutation = useMutation({
    mutationFn: async ({ contractContent }: { contractContent: any }) => {
      const eventName = contractContent.eventDetails?.eventName || 'Untitled';
      const title = `${contractContent.agreementTitle || 'Client Contract'} - ${eventName}`;
      const matchingEvent = events?.find(e => e.name === eventName);
      const eventId = matchingEvent?.id || events?.[0]?.id || 'manual';
      return apiRequest('POST', `/api/events/${eventId}/contracts`, {
        title,
        templateType: 'client_contract',
        status: 'draft',
        contractContent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      setShowEditDialog(false);
      setEditingContract(null);
      toast({
        title: "Contract Created",
        description: "Manual contract created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async ({ contractId, contractContent }: { contractId: string; contractContent: any }) => {
      return apiRequest('PATCH', `/api/contracts/${contractId}`, { contractContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      setShowEditDialog(false);
      setEditingContract(null);
      toast({
        title: "Contract Updated",
        description: "Contract has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed': return <CheckCircle2 className="h-4 w-4" />;
      case 'sent': return <Send className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getContractTypeBadge = (contract: ContractWithDetails) => {
    const isVendor = contract.templateType === 'vendor_contract';
    return (
      <Badge className={isVendor ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'}>
        {isVendor ? 'Vendor Contract' : 'Client Contract'}
      </Badge>
    );
  };

  return (
    <PlannerLayout>
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Contract Management</h1>
            <p className="text-white/60 text-sm">Generate, manage, and track client & vendor contracts</p>
          </div>
          
          <div className="flex items-center gap-2 sm:space-x-3 flex-wrap">
            <Dialog open={showVendorGenerateDialog} onOpenChange={setShowVendorGenerateDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-white/30 text-white hover:bg-[#8B1538]/30 text-xs sm:text-sm">
                  <Users className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Generate Vendor Contract</span><span className="sm:hidden">Vendor</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#330311] border-[#8B1538]/30 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Generate Vendor Contract</DialogTitle>
                </DialogHeader>
                <VendorContractGenerationForm 
                  events={events || []}
                  onSubmit={(data) => generateVendorContractMutation.mutate(data)}
                  isLoading={generateVendorContractMutation.isPending}
                />
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-[#8B1538]/30 text-xs sm:text-sm"
              onClick={() => {
                const blankContract: ContractWithDetails = {
                  id: '',
                  eventId: null,
                  clientId: null,
                  vendorId: null,
                  title: 'New Client Contract',
                  templateType: 'client_contract',
                  status: 'draft',
                  version: 1,
                  contractContent: {
                    agreementTitle: 'EVENT MANAGEMENT SERVICES AGREEMENT',
                    effectiveDate: '',
                    parties: { client: { name: '', address: '', organization: '' }, eventManager: { name: 'Event Perfekt Global Ltd', address: '20 Wenlock Road, London, N1 7PG' } },
                    definitions: [],
                    scopeOfWork: { services: [], deliverables: [] },
                    eventDetails: { eventName: '', eventType: '', eventCategory: '', eventDate: '', endDate: '', venue: '', city: '', country: '', guestCount: 0, eventDays: 1 },
                    paymentTerms: { totalFee: 0, currency: 'GBP', deposit: 0, depositDueDate: '', installments: [], lateFee: '5% per week on any overdue balance', paymentMethods: ['Bank Transfer', 'Credit/Debit Card'] },
                    cancellationPolicy: [
                      { condition: 'More than 90 days before the Event date', penalty: 'Full refund less 10% administrative fee' },
                      { condition: '60–90 days before the Event date', penalty: '50% of total fee retained by Event Manager' },
                      { condition: '30–59 days before the Event date', penalty: '75% of total fee retained by Event Manager' },
                      { condition: 'Less than 30 days before the Event date', penalty: '100% of total fee is non-refundable' },
                    ],
                    confidentiality: 'Both Parties agree to maintain the confidentiality of all Confidential Information disclosed during the course of this Agreement.',
                    liabilityLimitation: '',
                    forceMajeure: 'Neither Party shall be liable for any failure or delay in performing its obligations under this Agreement if such failure or delay results from a Force Majeure Event.',
                    termination: 'Either Party may terminate this Agreement by providing thirty (30) days written notice to the other Party.',
                    governingLaw: '',
                    disputeResolution: '',
                    entireAgreement: 'This Agreement constitutes the entire agreement between the Parties.',
                    signatureBlocks: { client: { name: '', title: 'Client', date: '' }, eventManager: { name: 'Event Perfekt Global Ltd', title: 'Event Director', date: '' } },
                  },
                  createdAt: new Date(),
                  sentDate: null,
                  signedDate: null,
                  clientSignature: null,
                  plannerSignature: null,
                  previousVersionId: null,
                  revisionNotes: null,
                } as any;
                setEditingContract(blankContract);
                setShowEditDialog(true);
              }}
            >
              <Pencil className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create Manual</span><span className="sm:hidden">Manual</span>
            </Button>

            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-white text-[#330311] hover:bg-gray-100 text-xs sm:text-sm">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Auto Generate</span><span className="sm:hidden">Auto</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#330311] border-[#8B1538]/30 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Auto-Generate Client Contract</DialogTitle>
                  <p className="text-sm text-white/60 mt-1">Select an event and the system will automatically generate a complete professional contract with all sections pre-filled from your event data.</p>
                </DialogHeader>
                <ContractGenerationForm 
                  events={events || []}
                  onSubmit={(data) => generateContractMutation.mutate(data)}
                  isLoading={generateContractMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-white/10 border-[#8B1538]/30">
            <CardContent className="p-3 sm:p-6 text-center">
              <div className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
                {contracts?.filter((c: Contract) => c.status === 'signed').length || 0}
              </div>
              <div className="text-white/70 text-xs sm:text-sm">Signed</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-[#8B1538]/30">
            <CardContent className="p-3 sm:p-6 text-center">
              <div className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
                {contracts?.filter((c: Contract) => c.status === 'sent').length || 0}
              </div>
              <div className="text-white/70 text-xs sm:text-sm">Awaiting</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-[#8B1538]/30">
            <CardContent className="p-3 sm:p-6 text-center">
              <div className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
                {contracts?.filter((c: Contract) => c.templateType === 'client_contract').length || 0}
              </div>
              <div className="text-white/70 text-xs sm:text-sm">Client</div>
            </CardContent>
          </Card>
          <Card className="bg-white/10 border-[#8B1538]/30">
            <CardContent className="p-3 sm:p-6 text-center">
              <div className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
                {contracts?.filter((c: Contract) => c.templateType === 'vendor_contract').length || 0}
              </div>
              <div className="text-white/70 text-xs sm:text-sm">Vendor</div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/10 border-[#8B1538]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              All Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-white/70">Loading contracts...</div>
            ) : !contracts || contracts.length === 0 ? (
              <div className="text-center py-8 text-white/70">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No contracts found</p>
                <p className="text-sm mt-2">Generate your first contract to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.map((contract: ContractWithDetails) => (
                  <div
                    key={contract.id}
                    className="bg-[#8B1538]/20 rounded-lg p-4 border border-[#8B1538]/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(contract.status)}
                        <div>
                          <h3 className="font-semibold text-white text-sm sm:text-base">{contract.title}</h3>
                          <p className="text-xs sm:text-sm text-white/70">
                            {contract.event?.name || 'Unknown Event'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:space-x-3 flex-wrap">
                        {getContractTypeBadge(contract)}
                        <Badge className={getStatusColor(contract.status)}>
                          {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                        </Badge>
                        <div className="text-xs sm:text-sm text-white/70">
                          v{contract.version}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-white/50 uppercase tracking-wide">
                          {contract.templateType === 'vendor_contract' ? 'Vendor' : 'Client'}
                        </div>
                        <div className="text-sm text-white">
                          {contract.templateType === 'vendor_contract'
                            ? (contract.contractContent as any)?.parties?.vendor?.name || 'Unknown Vendor'
                            : contract.client?.fullName || contract.client?.companyName || 'Unknown Client'
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50 uppercase tracking-wide">Created</div>
                        <div className="text-sm text-white">
                          {contract.createdAt ? format(new Date(contract.createdAt), 'MMM d, yyyy') : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50 uppercase tracking-wide">Contract Value</div>
                        <div className="text-sm text-white">
                          {(contract.contractContent as any)?.pricing?.total 
                            ? `${(contract.contractContent as any).pricing.currency || ''} ${(contract.contractContent as any).pricing.total.toLocaleString()}`
                            : (contract.contractContent as any)?.paymentTerms?.totalFee
                              ? `${(contract.contractContent as any).paymentTerms.currency || ''} ${(contract.contractContent as any).paymentTerms.totalFee.toLocaleString()}`
                              : 'Not specified'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center space-x-2 flex-wrap">
                        {contract.signedDate && (
                          <div className="text-xs text-green-400">
                            Signed {format(new Date(contract.signedDate), 'MMM d, yyyy')}
                          </div>
                        )}
                        {contract.sentDate && !contract.signedDate && (
                          <div className="text-xs text-blue-400">
                            Sent {format(new Date(contract.sentDate), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 sm:space-x-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowContractDialog(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                          title="Preview Contract"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                        {(contract.status === 'draft' || contract.status === 'sent') && (
                          <button
                            onClick={() => {
                              setEditingContract(JSON.parse(JSON.stringify(contract)));
                              setShowEditDialog(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-md transition-colors"
                            title="Edit Contract"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                        )}
                        {contract.status === 'draft' && (
                          <button
                            onClick={() => sendContractMutation.mutate(contract.id)}
                            disabled={sendContractMutation.isPending}
                            className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors"
                            title="Send to Client"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowChangeLogDialog(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 rounded-md transition-colors"
                          title="Change Log & Approvals"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEmailContract(contract);
                            setShowEmailDialog(true);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded-md transition-colors"
                          title="Send Email"
                        >
                          <Mail className="h-4 w-4" />
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
          <DialogContent className="bg-white border-gray-300 text-black max-w-5xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {selectedContract?.status === 'draft' ? 'Auto-Generated Contract Preview' : 'Contract Preview'}
              </DialogTitle>
              <div className="flex items-center gap-2 ml-auto">
                {selectedContract && (selectedContract.status === 'draft' || selectedContract.status === 'sent') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowContractDialog(false);
                      setEditingContract(JSON.parse(JSON.stringify(selectedContract)));
                      setShowEditDialog(true);
                    }}
                    className="border-[#330311] text-[#330311] hover:bg-[#330311]/10"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Manually
                  </Button>
                )}
                {selectedContract?.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      sendContractMutation.mutate(selectedContract.id);
                      setShowContractDialog(false);
                    }}
                    disabled={sendContractMutation.isPending}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to Client
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print / PDF
                </Button>
              </div>
            </DialogHeader>
            {selectedContract?.status === 'draft' && (
              <div className="mx-6 mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                This contract was auto-generated from your event data. You can send it as-is, or click "Edit Manually" to customise any section before sending.
              </div>
            )}
            {selectedContract && (
              <FullContractPreview contract={selectedContract} />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={(open) => {
          if (!open) {
            setShowEditDialog(false);
            setEditingContract(null);
          }
        }}>
          <DialogContent className="bg-white border-gray-200 text-black max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                {editingContract?.id ? 'Edit Contract — Add Your Specifics' : 'Create Manual Contract'}
              </DialogTitle>
              <p className="text-sm text-gray-500">
                {editingContract?.id
                  ? 'This contract was auto-generated from event data. You can customize any section below — add specific terms, adjust amounts, modify clauses, or add extra services.'
                  : 'Fill in all the contract details below. You can add services, deliverables, payment terms, and legal clauses manually.'
                }
              </p>
            </DialogHeader>
            {editingContract && (
              <ContractEditForm
                contract={editingContract}
                onSave={(updatedContent) => {
                  if (editingContract.id) {
                    updateContractMutation.mutate({
                      contractId: editingContract.id,
                      contractContent: updatedContent,
                    });
                  } else {
                    createManualContractMutation.mutate({
                      contractContent: updatedContent,
                    });
                  }
                }}
                onCancel={() => {
                  setShowEditDialog(false);
                  setEditingContract(null);
                }}
                isSaving={updateContractMutation.isPending || createManualContractMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={showChangeLogDialog} onOpenChange={(open) => {
          if (!open) {
            setShowChangeLogDialog(false);
          }
        }}>
          <DialogContent className="bg-white border-gray-200 text-black max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History className="h-5 w-5" />
                Change Log & Approvals
              </DialogTitle>
              <p className="text-sm text-gray-500">
                Version history, changes, and approval status for this contract (v{selectedContract?.version || 1})
              </p>
            </DialogHeader>
            {selectedContract && (
              <ContractChangeLogView
                contractId={selectedContract.id}
                contractTitle={selectedContract.title}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showEmailDialog} onOpenChange={(open) => {
          if (!open) {
            setShowEmailDialog(false);
            setEmailContract(null);
          }
        }}>
          <DialogContent className="bg-white border-gray-200 text-black max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Send Contract Email
              </DialogTitle>
            </DialogHeader>
            {emailContract && (
              <SendContractEmailForm
                contract={emailContract}
                onClose={() => {
                  setShowEmailDialog(false);
                  setEmailContract(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PlannerLayout>
  );
}

function ContractChangeLogView({ contractId, contractTitle }: { contractId: string; contractTitle: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: changelog = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/contracts', contractId, 'changelog'],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/changelog`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ changeId, notes }: { changeId: string; notes?: string }) => {
      return apiRequest('POST', `/api/contracts/${contractId}/changelog/${changeId}/approve`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId, 'changelog'] });
      toast({ title: "Change Approved", description: "The change has been approved." });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ changeId, notes }: { changeId: string; notes?: string }) => {
      return apiRequest('POST', `/api/contracts/${contractId}/changelog/${changeId}/reject`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId, 'changelog'] });
      toast({ title: "Change Rejected", description: "The change has been rejected." });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading change history...</div>;
  }

  if (changelog.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No changes recorded yet.</p>
        <p className="text-gray-400 text-sm mt-1">Changes will appear here when the contract is edited.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {changelog.map((log: any) => (
        <div key={log.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge className={
                log.changeType === 'created' ? 'bg-green-100 text-green-800' :
                log.changeType === 'edited' ? 'bg-blue-100 text-blue-800' :
                log.changeType === 'sent' ? 'bg-purple-100 text-purple-800' :
                log.changeType === 'signed' ? 'bg-emerald-100 text-emerald-800' :
                log.changeType === 'approved' ? 'bg-green-100 text-green-800' :
                log.changeType === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }>
                {log.changeType}
              </Badge>
              <span className="text-sm text-gray-500">v{log.version}</span>
            </div>
            <span className="text-xs text-gray-400">{format(new Date(log.timestamp), 'MMM d, yyyy h:mm a')}</span>
          </div>

          <p className="text-sm text-gray-800 font-medium">{log.changeDescription}</p>
          <p className="text-xs text-gray-500 mt-1">By: {log.changedByName || 'System'}</p>

          {log.fieldsChanged && log.fieldsChanged.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {log.fieldsChanged.map((field: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs border-gray-300 text-gray-600">
                  {field}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Badge className={
              log.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
              log.approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }>
              {log.approvalStatus === 'approved' ? 'Approved' :
               log.approvalStatus === 'rejected' ? 'Rejected' :
               'Pending Approval'}
            </Badge>
            {log.approvedByName && (
              <span className="text-xs text-gray-500">
                by {log.approvedByName} on {log.approvalDate ? format(new Date(log.approvalDate), 'MMM d, yyyy') : ''}
              </span>
            )}
            {log.approvalNotes && (
              <span className="text-xs text-gray-400 italic">"{log.approvalNotes}"</span>
            )}
          </div>

          {log.approvalStatus === 'pending' && log.changeType === 'edited' && (
            <div className="mt-3 flex items-center gap-2 pt-3 border-t border-gray-100">
              <Button
                size="sm"
                onClick={() => approveMutation.mutate({ changeId: log.id })}
                disabled={approveMutation.isPending}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectMutation.mutate({ changeId: log.id })}
                disabled={rejectMutation.isPending}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SendContractEmailForm({ contract, onClose }: { contract: ContractWithDetails; onClose: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(`Contract: ${contract.title}`);
  const [message, setMessage] = useState(
    `Dear Client,\n\nPlease find attached the contract for your upcoming event.\n\nPlease review the contract details carefully and sign at your earliest convenience.\n\nIf you have any questions or need any changes, please don't hesitate to reach out.\n\nBest regards,\nEvent Perfekt Global Ltd`
  );
  const [includeContract, setIncludeContract] = useState(true);
  const { toast } = useToast();

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/contracts/${contract.id}/send-email`, {
        to, subject, message, includeContract
      });
    },
    onSuccess: () => {
      toast({ title: "Email Sent", description: `Email sent successfully to ${to}` });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send email. Please try again.", variant: "destructive" });
    },
  });

  const cc = contract.contractContent as any;
  const clientEmail = cc?.parties?.client?.email || cc?.parties?.vendor?.contactEmail || '';

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-700">To (Email Address)</Label>
        <Input
          type="email"
          value={to || clientEmail}
          onChange={(e) => setTo(e.target.value)}
          placeholder="client@example.com"
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-gray-700">Subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label className="text-gray-700">Message</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="mt-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="include-contract"
          checked={includeContract}
          onChange={(e) => setIncludeContract(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="include-contract" className="text-sm text-gray-700">
          Include contract details and signing link in email
        </label>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => sendEmailMutation.mutate()}
          disabled={!to || !subject || sendEmailMutation.isPending}
          className="bg-[#330311] text-white hover:bg-[#4a0519]"
        >
          {sendEmailMutation.isPending ? 'Sending...' : (
            <><Mail className="h-4 w-4 mr-2" /> Send Email</>
          )}
        </Button>
      </div>
    </div>
  );
}

function ContractGenerationForm({ 
  events, 
  onSubmit, 
  isLoading 
}: { 
  events: Event[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [eventId, setEventId] = useState('');
  const [additionalServices, setAdditionalServices] = useState<string[]>([]);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [newService, setNewService] = useState('');

  const selectedEvent = events.find(e => e.id === eventId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ eventId, additionalServices, specialRequirements });
  };

  const addService = () => {
    if (newService.trim()) {
      setAdditionalServices([...additionalServices, newService.trim()]);
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setAdditionalServices(additionalServices.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label className="text-white">Select Event</Label>
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="bg-[#4a0519] border-[#8B1538]/30 text-white">
            <SelectValue placeholder="Choose an event" />
          </SelectTrigger>
          <SelectContent className="bg-[#4a0519] border-[#8B1538]/30">
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id} className="text-white">
                {event.name} - {format(new Date(event.startDate), 'MMM d, yyyy')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEvent && (
        <div className="bg-[#8B1538]/20 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-2">Event Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-white/70">Event:</span> {selectedEvent.name}</div>
            <div><span className="text-white/70">Type:</span> {selectedEvent.type}</div>
            <div><span className="text-white/70">Date:</span> {format(new Date(selectedEvent.startDate), 'MMM d, yyyy')}</div>
            <div><span className="text-white/70">Guests:</span> {selectedEvent.guestCount}</div>
            <div><span className="text-white/70">Budget:</span> ${selectedEvent.budget?.toLocaleString()}</div>
            <div><span className="text-white/70">Location:</span> {selectedEvent.city}, {selectedEvent.country}</div>
          </div>
        </div>
      )}

      <div>
        <Label className="text-white">Additional Services</Label>
        <div className="flex space-x-2 mb-2">
          <Input
            placeholder="Add additional service..."
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            className="bg-[#4a0519] border-[#8B1538]/30 text-white"
          />
          <Button type="button" onClick={addService} size="sm" className="bg-white text-[#330311]">
            Add
          </Button>
        </div>
        {additionalServices.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {additionalServices.map((service, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-[#8B1538] text-white cursor-pointer"
                onClick={() => removeService(index)}
              >
                {service} ✕
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label className="text-white">Special Requirements</Label>
        <Textarea
          placeholder="Any special terms or requirements for this contract..."
          value={specialRequirements}
          onChange={(e) => setSpecialRequirements(e.target.value)}
          className="bg-[#4a0519] border-[#8B1538]/30 text-white"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" className="border-[#8B1538]/30 text-white">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!eventId || isLoading}
          className="bg-white text-[#330311]"
        >
          {isLoading ? 'Generating...' : 'Generate Contract'}
        </Button>
      </div>
    </form>
  );
}

function VendorContractGenerationForm({ 
  events, 
  onSubmit, 
  isLoading 
}: { 
  events: Event[];
  onSubmit: (data: { eventId: string; vendorId: string }) => void;
  isLoading: boolean;
}) {
  const [eventId, setEventId] = useState('');
  const [vendorId, setVendorId] = useState('');

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors/event', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const res = await fetch(`/api/vendors/event/${eventId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!eventId,
  });

  const selectedEvent = events.find(e => e.id === eventId);
  const selectedVendor = vendors.find(v => v.id === vendorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (eventId && vendorId) {
      onSubmit({ eventId, vendorId });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label className="text-white">Select Event</Label>
        <Select value={eventId} onValueChange={(val) => { setEventId(val); setVendorId(''); }}>
          <SelectTrigger className="bg-[#4a0519] border-[#8B1538]/30 text-white">
            <SelectValue placeholder="Choose an event" />
          </SelectTrigger>
          <SelectContent className="bg-[#4a0519] border-[#8B1538]/30">
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id} className="text-white">
                {event.name} - {format(new Date(event.startDate), 'MMM d, yyyy')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedEvent && (
        <div className="bg-[#8B1538]/20 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-2">Event Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-white/70">Event:</span> {selectedEvent.name}</div>
            <div><span className="text-white/70">Type:</span> {selectedEvent.type}</div>
            <div><span className="text-white/70">Date:</span> {format(new Date(selectedEvent.startDate), 'MMM d, yyyy')}</div>
            <div><span className="text-white/70">Guests:</span> {selectedEvent.guestCount}</div>
          </div>
        </div>
      )}

      {eventId && (
        <div>
          <Label className="text-white">Select Vendor</Label>
          {vendorsLoading ? (
            <div className="text-white/70 text-sm py-2">Loading vendors...</div>
          ) : vendors.length === 0 ? (
            <div className="text-white/70 text-sm py-2">No vendors found for this event. Add vendors first.</div>
          ) : (
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="bg-[#4a0519] border-[#8B1538]/30 text-white">
                <SelectValue placeholder="Choose a vendor" />
              </SelectTrigger>
              <SelectContent className="bg-[#4a0519] border-[#8B1538]/30">
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id} className="text-white">
                    {vendor.name} — {vendor.category || vendor.serviceType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {selectedVendor && (
        <div className="bg-[#8B1538]/20 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-2">Vendor Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-white/70">Name:</span> {selectedVendor.name}</div>
            <div><span className="text-white/70">Category:</span> {selectedVendor.category || selectedVendor.serviceType}</div>
            <div><span className="text-white/70">Email:</span> {selectedVendor.email}</div>
            <div><span className="text-white/70">Amount:</span> ${Number(selectedVendor.quotedAmount || selectedVendor.finalAmount || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" className="border-[#8B1538]/30 text-white">
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!eventId || !vendorId || isLoading}
          className="bg-white text-[#330311]"
        >
          {isLoading ? 'Generating...' : 'Generate Vendor Contract'}
        </Button>
      </div>
    </form>
  );
}

function ContractEditForm({ 
  contract, 
  onSave, 
  onCancel, 
  isSaving 
}: { 
  contract: ContractWithDetails;
  onSave: (content: any) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [content, setContent] = useState<any>(
    JSON.parse(JSON.stringify(contract.contractContent || {}))
  );
  const isVendor = contract.templateType === 'vendor_contract';
  const [newService, setNewService] = useState('');
  const [newDeliverable, setNewDeliverable] = useState({ item: '', dueDate: '' });

  const updateField = (path: string, value: any) => {
    const updated = { ...content };
    const keys = path.split('.');
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) obj[keys[i]] = {};
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    setContent(updated);
  };

  const addServiceItem = () => {
    if (!newService.trim()) return;
    if (isVendor) {
      const services = content.vendorServices?.specificServices || [];
      updateField('vendorServices.specificServices', [...services, newService.trim()]);
    } else {
      const services = content.scopeOfWork?.services || [];
      updateField('scopeOfWork.services', [...services, newService.trim()]);
    }
    setNewService('');
  };

  const removeServiceItem = (index: number) => {
    if (isVendor) {
      const services = [...(content.vendorServices?.specificServices || [])];
      services.splice(index, 1);
      updateField('vendorServices.specificServices', services);
    } else {
      const services = [...(content.scopeOfWork?.services || [])];
      services.splice(index, 1);
      updateField('scopeOfWork.services', services);
    }
  };

  const addDeliverable = () => {
    if (!newDeliverable.item.trim()) return;
    if (isVendor) {
      const deliverables = content.deliverables || [];
      updateField('deliverables', [...deliverables, { ...newDeliverable }]);
    } else {
      const deliverables = content.scopeOfWork?.deliverables || [];
      updateField('scopeOfWork.deliverables', [...deliverables, { ...newDeliverable }]);
    }
    setNewDeliverable({ item: '', dueDate: '' });
  };

  const removeDeliverable = (index: number) => {
    if (isVendor) {
      const deliverables = [...(content.deliverables || [])];
      deliverables.splice(index, 1);
      updateField('deliverables', deliverables);
    } else {
      const deliverables = [...(content.scopeOfWork?.deliverables || [])];
      deliverables.splice(index, 1);
      updateField('scopeOfWork.deliverables', deliverables);
    }
  };

  const updateInstallment = (index: number, field: string, value: any) => {
    if (isVendor) {
      const schedule = [...(content.compensation?.paymentSchedule || [])];
      schedule[index] = { ...schedule[index], [field]: value };
      updateField('compensation.paymentSchedule', schedule);
    } else {
      const installments = [...(content.paymentTerms?.installments || [])];
      installments[index] = { ...installments[index], [field]: value };
      updateField('paymentTerms.installments', installments);
    }
  };

  const updateCancellationPolicy = (index: number, field: string, value: string) => {
    const policies = [...(content.cancellationPolicy || [])];
    policies[index] = { ...policies[index], [field]: value };
    setContent({ ...content, cancellationPolicy: policies });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        You can manually edit any section of this contract below. Changes will be saved when you click "Save Changes".
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Agreement Title</h3>
        <Input
          value={content.agreementTitle || ''}
          onChange={(e) => updateField('agreementTitle', e.target.value)}
          className="bg-white"
        />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Effective Date</h3>
        <Input
          value={content.effectiveDate || ''}
          onChange={(e) => updateField('effectiveDate', e.target.value)}
          className="bg-white"
        />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Parties</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isVendor ? (
            <>
              <div className="space-y-2">
                <Label className="text-gray-700">Vendor Name</Label>
                <Input
                  value={content.parties?.vendor?.name || ''}
                  onChange={(e) => updateField('parties.vendor.name', e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Vendor Company</Label>
                <Input
                  value={content.parties?.vendor?.company || ''}
                  onChange={(e) => updateField('parties.vendor.company', e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Vendor Email</Label>
                <Input
                  value={content.parties?.vendor?.contactEmail || ''}
                  onChange={(e) => updateField('parties.vendor.contactEmail', e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Vendor Category</Label>
                <Input
                  value={content.parties?.vendor?.category || ''}
                  onChange={(e) => updateField('parties.vendor.category', e.target.value)}
                  className="bg-white"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-gray-700">Client Name</Label>
                <Input
                  value={content.parties?.client?.name || ''}
                  onChange={(e) => updateField('parties.client.name', e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Client Organization</Label>
                <Input
                  value={content.parties?.client?.organization || ''}
                  onChange={(e) => updateField('parties.client.organization', e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Client Address</Label>
                <Input
                  value={content.parties?.client?.address || ''}
                  onChange={(e) => updateField('parties.client.address', e.target.value)}
                  className="bg-white"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label className="text-gray-700">Event Manager Name</Label>
            <Input
              value={content.parties?.eventManager?.name || ''}
              onChange={(e) => updateField('parties.eventManager.name', e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Event Manager Address</Label>
            <Input
              value={content.parties?.eventManager?.address || ''}
              onChange={(e) => updateField('parties.eventManager.address', e.target.value)}
              className="bg-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">{isVendor ? 'Vendor Services' : 'Scope of Work - Services'}</h3>
        <div className="space-y-2 mb-3">
          {(isVendor
            ? content.vendorServices?.specificServices || []
            : content.scopeOfWork?.services || []
          ).map((service: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={service}
                onChange={(e) => {
                  if (isVendor) {
                    const arr = [...(content.vendorServices?.specificServices || [])];
                    arr[i] = e.target.value;
                    updateField('vendorServices.specificServices', arr);
                  } else {
                    const arr = [...(content.scopeOfWork?.services || [])];
                    arr[i] = e.target.value;
                    updateField('scopeOfWork.services', arr);
                  }
                }}
                className="bg-white flex-1"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeServiceItem(i)} className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Add a service..."
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            className="bg-white flex-1"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceItem())}
          />
          <Button type="button" onClick={addServiceItem} size="sm" className="bg-[#330311] text-white">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Deliverables</h3>
        <div className="space-y-2 mb-3">
          {(isVendor ? content.deliverables || [] : content.scopeOfWork?.deliverables || []).map((d: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={d.item}
                onChange={(e) => {
                  if (isVendor) {
                    const arr = [...(content.deliverables || [])];
                    arr[i] = { ...arr[i], item: e.target.value };
                    updateField('deliverables', arr);
                  } else {
                    const arr = [...(content.scopeOfWork?.deliverables || [])];
                    arr[i] = { ...arr[i], item: e.target.value };
                    updateField('scopeOfWork.deliverables', arr);
                  }
                }}
                className="bg-white flex-1"
                placeholder="Deliverable"
              />
              <Input
                value={d.dueDate}
                onChange={(e) => {
                  if (isVendor) {
                    const arr = [...(content.deliverables || [])];
                    arr[i] = { ...arr[i], dueDate: e.target.value };
                    updateField('deliverables', arr);
                  } else {
                    const arr = [...(content.scopeOfWork?.deliverables || [])];
                    arr[i] = { ...arr[i], dueDate: e.target.value };
                    updateField('scopeOfWork.deliverables', arr);
                  }
                }}
                className="bg-white w-40"
                placeholder="Due date"
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeDeliverable(i)} className="text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Deliverable item..."
            value={newDeliverable.item}
            onChange={(e) => setNewDeliverable({ ...newDeliverable, item: e.target.value })}
            className="bg-white flex-1"
          />
          <Input
            placeholder="Due date..."
            value={newDeliverable.dueDate}
            onChange={(e) => setNewDeliverable({ ...newDeliverable, dueDate: e.target.value })}
            className="bg-white w-40"
          />
          <Button type="button" onClick={addDeliverable} size="sm" className="bg-[#330311] text-white">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">{isVendor ? 'Compensation' : 'Payment Terms'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <Label className="text-gray-700">{isVendor ? 'Total Amount' : 'Total Fee'}</Label>
            <Input
              type="number"
              value={isVendor ? content.compensation?.totalAmount || '' : content.paymentTerms?.totalFee || ''}
              onChange={(e) => updateField(isVendor ? 'compensation.totalAmount' : 'paymentTerms.totalFee', Number(e.target.value))}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Currency</Label>
            <Input
              value={isVendor ? content.compensation?.currency || '' : content.paymentTerms?.currency || ''}
              onChange={(e) => updateField(isVendor ? 'compensation.currency' : 'paymentTerms.currency', e.target.value)}
              className="bg-white"
            />
          </div>
          {!isVendor && (
            <div className="space-y-2">
              <Label className="text-gray-700">Late Fee</Label>
              <Input
                value={content.paymentTerms?.lateFee || ''}
                onChange={(e) => updateField('paymentTerms.lateFee', e.target.value)}
                className="bg-white"
              />
            </div>
          )}
        </div>

        <h4 className="font-medium text-gray-800 mb-2">Payment Schedule / Installments</h4>
        <div className="space-y-2">
          {(isVendor
            ? content.compensation?.paymentSchedule || []
            : content.paymentTerms?.installments || []
          ).map((inst: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={inst.description}
                onChange={(e) => updateInstallment(i, 'description', e.target.value)}
                className="bg-white flex-1"
                placeholder="Description"
              />
              <Input
                type="number"
                value={inst.amount}
                onChange={(e) => updateInstallment(i, 'amount', Number(e.target.value))}
                className="bg-white w-32"
                placeholder="Amount"
              />
              <Input
                value={inst.dueDate}
                onChange={(e) => updateInstallment(i, 'dueDate', e.target.value)}
                className="bg-white w-40"
                placeholder="Due date"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Cancellation Policy</h3>
        <div className="space-y-2">
          {(content.cancellationPolicy || []).map((cp: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={cp.condition || cp.period || ''}
                onChange={(e) => updateCancellationPolicy(i, isVendor ? 'period' : 'condition', e.target.value)}
                className="bg-white flex-1"
                placeholder={isVendor ? 'Period' : 'Condition'}
              />
              <Input
                value={cp.penalty || cp.refund || ''}
                onChange={(e) => updateCancellationPolicy(i, isVendor ? 'refund' : 'penalty', e.target.value)}
                className="bg-white flex-1"
                placeholder={isVendor ? 'Refund' : 'Penalty'}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Legal Clauses</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-700 font-medium">Confidentiality</Label>
            <Textarea
              value={content.confidentiality || ''}
              onChange={(e) => updateField('confidentiality', e.target.value)}
              className="bg-white mt-1"
              rows={3}
            />
          </div>
          {!isVendor && (
            <div>
              <Label className="text-gray-700 font-medium">Limitation of Liability</Label>
              <Textarea
                value={content.liabilityLimitation || ''}
                onChange={(e) => updateField('liabilityLimitation', e.target.value)}
                className="bg-white mt-1"
                rows={3}
              />
            </div>
          )}
          {isVendor && (
            <div>
              <Label className="text-gray-700 font-medium">Indemnification</Label>
              <Textarea
                value={content.indemnification || ''}
                onChange={(e) => updateField('indemnification', e.target.value)}
                className="bg-white mt-1"
                rows={3}
              />
            </div>
          )}
          <div>
            <Label className="text-gray-700 font-medium">Force Majeure</Label>
            <Textarea
              value={content.forceMajeure || ''}
              onChange={(e) => updateField('forceMajeure', e.target.value)}
              className="bg-white mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium">Termination</Label>
            <Textarea
              value={typeof content.termination === 'string' ? content.termination : (content.termination?.byEventManager || '')}
              onChange={(e) => updateField('termination', e.target.value)}
              className="bg-white mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium">Governing Law</Label>
            <Input
              value={content.governingLaw || ''}
              onChange={(e) => updateField('governingLaw', e.target.value)}
              className="bg-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium">Dispute Resolution</Label>
            <Textarea
              value={content.disputeResolution || ''}
              onChange={(e) => updateField('disputeResolution', e.target.value)}
              className="bg-white mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-gray-700 font-medium">Entire Agreement</Label>
            <Textarea
              value={content.entireAgreement || ''}
              onChange={(e) => updateField('entireAgreement', e.target.value)}
              className="bg-white mt-1"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Event Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700">Event Name</Label>
            <Input value={content.eventDetails?.eventName || ''} onChange={(e) => updateField('eventDetails.eventName', e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Event Type</Label>
            <Input value={content.eventDetails?.eventType || ''} onChange={(e) => updateField('eventDetails.eventType', e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Event Date</Label>
            <Input value={content.eventDetails?.eventDate || ''} onChange={(e) => updateField('eventDetails.eventDate', e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Venue</Label>
            <Input value={content.eventDetails?.venue || ''} onChange={(e) => updateField('eventDetails.venue', e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">City</Label>
            <Input value={content.eventDetails?.city || ''} onChange={(e) => updateField('eventDetails.city', e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Country</Label>
            <Input value={content.eventDetails?.country || ''} onChange={(e) => updateField('eventDetails.country', e.target.value)} className="bg-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-700">Guest Count</Label>
            <Input type="number" value={content.eventDetails?.guestCount || ''} onChange={(e) => updateField('eventDetails.guestCount', Number(e.target.value))} className="bg-white" />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onCancel} className="border-gray-300">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => onSave(content)}
          disabled={isSaving}
          className="bg-[#330311] text-white hover:bg-[#4a0519]"
        >
          {isSaving ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function FullContractPreview({ contract }: { contract: ContractWithDetails }) {
  const content = contract.contractContent as any;
  if (!content) {
    return <div className="p-8 text-center text-gray-500">No contract content available.</div>;
  }

  const isVendorContract = contract.templateType === 'vendor_contract';

  return (
    <div className="bg-white text-black print:text-black" id="contract-preview">
      <div className="max-w-[800px] mx-auto px-12 py-10 leading-relaxed" style={{ fontFamily: "'Poppins', sans-serif" }}>

        <div className="text-center mb-10 border-b-2 border-black pb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={eventPerfektLogo} alt="Event Perfekt" className="h-14 w-14 rounded-xl shadow-sm border border-gray-200" />
            <div className="text-left">
              <p className="text-lg font-bold text-[#8B1538]">{content.parties?.eventManager?.name || 'Event Perfekt Global Ltd'}</p>
              <p className="text-xs text-gray-500 italic">...making yours perfekt</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-wide mb-2">
            {content.agreementTitle || (isVendorContract ? 'VENDOR SERVICE AGREEMENT' : 'EVENT MANAGEMENT SERVICES AGREEMENT')}
          </h1>
          {content.effectiveDate && (
            <p className="text-sm text-gray-600">Effective Date: {content.effectiveDate}</p>
          )}
        </div>

        {content.parties && (
          <div className="mb-8">
            <p className="mb-4 text-sm leading-relaxed">
              This Agreement is entered into as of <strong>{content.effectiveDate || '___________'}</strong> by and between:
            </p>
            {isVendorContract && content.parties.vendor ? (
              <>
                <div className="mb-4 pl-6">
                  <p className="font-bold">{content.parties.vendor.company || content.parties.vendor.name}</p>
                  <p className="text-sm">Category: {content.parties.vendor.category}</p>
                  <p className="text-sm">Contact: {content.parties.vendor.contactEmail}</p>
                  {content.parties.vendor.phone && <p className="text-sm">Phone: {content.parties.vendor.phone}</p>}
                  <p className="text-sm italic">(hereinafter referred to as the "Vendor")</p>
                </div>
                <p className="mb-4 text-center font-bold">AND</p>
                <div className="mb-4 pl-6">
                  <p className="font-bold">{content.parties.eventManager?.name || 'Event Perfekt Global Ltd'}</p>
                  <p className="text-sm">{content.parties.eventManager?.address}</p>
                  <p className="text-sm italic">(hereinafter referred to as the "Event Manager")</p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 pl-6">
                  <p className="font-bold">{content.parties?.client?.name || 'Client'}</p>
                  {content.parties?.client?.organization && <p className="text-sm">{content.parties.client.organization}</p>}
                  <p className="text-sm">{content.parties?.client?.address}</p>
                  <p className="text-sm italic">(hereinafter referred to as the "Client")</p>
                </div>
                <p className="mb-4 text-center font-bold">AND</p>
                <div className="mb-4 pl-6">
                  <p className="font-bold">{content.parties?.eventManager?.name || 'Event Perfekt Global Ltd'}</p>
                  <p className="text-sm">{content.parties?.eventManager?.address}</p>
                  <p className="text-sm italic">(hereinafter referred to as the "Event Manager")</p>
                </div>
              </>
            )}
          </div>
        )}

        {content.definitions && content.definitions.length > 0 && (
          <Section number={1} title="DEFINITIONS">
            <div className="space-y-3">
              {content.definitions.map((def: any, i: number) => (
                <p key={i} className="text-sm">
                  <strong>"{def.term}"</strong> — {def.definition}
                </p>
              ))}
            </div>
          </Section>
        )}

        {!isVendorContract && content.scopeOfWork && (
          <Section number={2} title="SCOPE OF WORK">
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2">2.1 Services</p>
              <p className="text-sm mb-2">The Event Manager shall provide the following services:</p>
              <p className="text-sm leading-relaxed">
                {content.scopeOfWork.services?.join(" • ")}
              </p>
            </div>
            {content.scopeOfWork.deliverables && content.scopeOfWork.deliverables.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">2.2 Deliverables</p>
                <table className="w-full border-collapse border border-gray-400 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-3 py-2 text-left">Deliverable</th>
                      <th className="border border-gray-400 px-3 py-2 text-left">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.scopeOfWork.deliverables.map((d: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-gray-400 px-3 py-2">{d.item}</td>
                        <td className="border border-gray-400 px-3 py-2">{d.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}

        {isVendorContract && content.vendorServices && (
          <Section number={2} title="VENDOR SERVICES">
            <p className="text-sm mb-2"><strong>Category:</strong> {content.vendorServices.category}</p>
            <p className="text-sm mb-3">{content.vendorServices.description}</p>
            <p className="text-sm font-semibold mb-2">Specific Services:</p>
            <p className="text-sm leading-relaxed">
              {content.vendorServices.specificServices?.join(" • ")}
            </p>
          </Section>
        )}

        {content.eventDetails && (
          <Section number={isVendorContract && !content.definitions ? 2 : 3} title="EVENT DETAILS">
            <table className="w-full border-collapse border border-gray-400 text-sm">
              <tbody>
                <DetailRow label="Event Name" value={content.eventDetails.eventName} />
                <DetailRow label="Event Type" value={content.eventDetails.eventType} />
                <DetailRow label="Category" value={content.eventDetails.eventCategory} />
                <DetailRow label="Event Date" value={content.eventDetails.eventDate} />
                <DetailRow label="End Date" value={content.eventDetails.endDate} />
                <DetailRow label="Venue" value={content.eventDetails.venue} />
                <DetailRow label="City" value={content.eventDetails.city} />
                <DetailRow label="Country" value={content.eventDetails.country} />
                <DetailRow label="Guest Count" value={content.eventDetails.guestCount?.toString()} />
                <DetailRow label="Event Days" value={content.eventDetails.eventDays?.toString()} />
                {content.eventDetails.weddingScope && (
                  <DetailRow label="Wedding Scope" value={content.eventDetails.weddingScope} />
                )}
              </tbody>
            </table>
          </Section>
        )}

        {isVendorContract && content.deliverables && content.deliverables.length > 0 && (
          <Section number={4} title="DELIVERABLES">
            <table className="w-full border-collapse border border-gray-400 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-3 py-2 text-left">Deliverable</th>
                  <th className="border border-gray-400 px-3 py-2 text-left">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {content.deliverables.map((d: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-gray-400 px-3 py-2">{d.item}</td>
                    <td className="border border-gray-400 px-3 py-2">{d.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {!isVendorContract && content.paymentTerms && (
          <Section number={4} title="PAYMENT TERMS">
            <p className="text-sm mb-3">
              <strong>Total Fee:</strong> {content.paymentTerms.currency} {content.paymentTerms.totalFee?.toLocaleString()}
            </p>
            {content.paymentTerms.installments && content.paymentTerms.installments.length > 0 && (
              <>
                <p className="text-sm font-semibold mb-2">Payment Schedule:</p>
                <table className="w-full border-collapse border border-gray-400 text-sm mb-4">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-3 py-2 text-left">Description</th>
                      <th className="border border-gray-400 px-3 py-2 text-right">Amount</th>
                      <th className="border border-gray-400 px-3 py-2 text-left">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.paymentTerms.installments.map((inst: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-gray-400 px-3 py-2">{inst.description}</td>
                        <td className="border border-gray-400 px-3 py-2 text-right">{content.paymentTerms.currency} {inst.amount?.toLocaleString()}</td>
                        <td className="border border-gray-400 px-3 py-2">{inst.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <p className="text-sm"><strong>Late Fee:</strong> {content.paymentTerms.lateFee}</p>
            {content.paymentTerms.paymentMethods && (
              <p className="text-sm mt-1"><strong>Accepted Payment Methods:</strong> {content.paymentTerms.paymentMethods.join(', ')}</p>
            )}
          </Section>
        )}

        {isVendorContract && content.compensation && (
          <Section number={5} title="COMPENSATION">
            <p className="text-sm mb-3">
              <strong>Total Amount:</strong> {content.compensation.currency} {content.compensation.totalAmount?.toLocaleString()}
            </p>
            {content.compensation.paymentSchedule && content.compensation.paymentSchedule.length > 0 && (
              <>
                <p className="text-sm font-semibold mb-2">Payment Schedule:</p>
                <table className="w-full border-collapse border border-gray-400 text-sm mb-4">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-3 py-2 text-left">Description</th>
                      <th className="border border-gray-400 px-3 py-2 text-right">Amount</th>
                      <th className="border border-gray-400 px-3 py-2 text-left">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.compensation.paymentSchedule.map((ps: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-gray-400 px-3 py-2">{ps.description}</td>
                        <td className="border border-gray-400 px-3 py-2 text-right">{content.compensation.currency} {ps.amount?.toLocaleString()}</td>
                        <td className="border border-gray-400 px-3 py-2">{ps.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Section>
        )}

        {isVendorContract && content.performanceStandards && content.performanceStandards.length > 0 && (
          <Section number={6} title="PERFORMANCE STANDARDS">
            <p className="text-sm leading-relaxed">
              {content.performanceStandards.join(" • ")}
            </p>
          </Section>
        )}

        {content.cancellationPolicy && content.cancellationPolicy.length > 0 && (
          <Section number={isVendorContract ? 7 : 5} title="CANCELLATION POLICY">
            <table className="w-full border-collapse border border-gray-400 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-3 py-2 text-left">{isVendorContract ? 'Period' : 'Condition'}</th>
                  <th className="border border-gray-400 px-3 py-2 text-left">{isVendorContract ? 'Refund' : 'Penalty'}</th>
                </tr>
              </thead>
              <tbody>
                {content.cancellationPolicy.map((cp: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-gray-400 px-3 py-2">{cp.condition || cp.period}</td>
                    <td className="border border-gray-400 px-3 py-2">{cp.penalty || cp.refund}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {isVendorContract && content.equipmentAndSetup && (
          <Section number={8} title="EQUIPMENT AND SETUP">
            <p className="text-sm font-semibold mb-2">Vendor Provides:</p>
            <p className="text-sm leading-relaxed mb-3">
              {content.equipmentAndSetup.vendorProvides?.join(" • ")}
            </p>
            <p className="text-sm"><strong>Setup:</strong> {content.equipmentAndSetup.setupTime}</p>
            <p className="text-sm"><strong>Breakdown:</strong> {content.equipmentAndSetup.breakdownTime}</p>
          </Section>
        )}

        {isVendorContract && content.insurance && (
          <Section number={9} title="INSURANCE">
            <p className="text-sm mb-1">{content.insurance.requirement}</p>
            <p className="text-sm mb-1">{content.insurance.proofRequired}</p>
            <p className="text-sm">{content.insurance.additionalInsured}</p>
          </Section>
        )}

        {content.confidentiality && (
          <Section number={isVendorContract ? 10 : 6} title="CONFIDENTIALITY">
            <p className="text-sm">{content.confidentiality}</p>
          </Section>
        )}

        {!isVendorContract && content.liabilityLimitation && (
          <Section number={7} title="LIMITATION OF LIABILITY">
            <p className="text-sm">{content.liabilityLimitation}</p>
          </Section>
        )}

        {isVendorContract && content.indemnification && (
          <Section number={11} title="INDEMNIFICATION">
            <p className="text-sm">{content.indemnification}</p>
          </Section>
        )}

        {content.forceMajeure && (
          <Section number={isVendorContract ? 12 : 8} title="FORCE MAJEURE">
            <p className="text-sm">{content.forceMajeure}</p>
          </Section>
        )}

        {content.termination && (
          <Section number={isVendorContract ? 13 : 9} title="TERMINATION">
            {typeof content.termination === 'string' ? (
              <p className="text-sm">{content.termination}</p>
            ) : (
              <div className="space-y-2">
                {content.termination.byEventManager && <p className="text-sm"><strong>By Event Manager:</strong> {content.termination.byEventManager}</p>}
                {content.termination.byVendor && <p className="text-sm"><strong>By Vendor:</strong> {content.termination.byVendor}</p>}
                {content.termination.forCause && <p className="text-sm"><strong>For Cause:</strong> {content.termination.forCause}</p>}
              </div>
            )}
          </Section>
        )}

        {content.governingLaw && (
          <Section number={isVendorContract ? 14 : 10} title="GOVERNING LAW">
            <p className="text-sm">This Agreement shall be governed by and construed in accordance with the {content.governingLaw}.</p>
          </Section>
        )}

        {content.disputeResolution && (
          <Section number={isVendorContract ? 15 : 11} title="DISPUTE RESOLUTION">
            <p className="text-sm">{content.disputeResolution}</p>
          </Section>
        )}

        {content.entireAgreement && (
          <Section number={isVendorContract ? 16 : 12} title="ENTIRE AGREEMENT">
            <p className="text-sm">{content.entireAgreement}</p>
          </Section>
        )}

        {content.signatureBlocks && (
          <div className="mt-12 pt-8 border-t-2 border-black">
            <h3 className="text-lg font-bold mb-8 text-center">SIGNATURES</h3>
            <p className="text-sm mb-8 text-center">
              IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.
            </p>
            <div className="grid grid-cols-2 gap-12">
              <div>
                <div className="border-b border-black mb-2 pb-8">
                  <p className="text-xs text-gray-500">Signature</p>
                </div>
                <p className="text-sm font-bold">
                  {isVendorContract ? content.signatureBlocks.vendor?.name : content.signatureBlocks.client?.name}
                </p>
                <p className="text-sm text-gray-600">
                  {isVendorContract 
                    ? `${content.signatureBlocks.vendor?.title || 'Authorized Representative'}, ${content.signatureBlocks.vendor?.company || ''}`
                    : content.signatureBlocks.client?.title
                  }
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Date: {(isVendorContract ? content.signatureBlocks.vendor?.date : content.signatureBlocks.client?.date) || '_______________'}
                </p>
              </div>
              <div>
                <div className="border-b border-black mb-2 pb-8">
                  <p className="text-xs text-gray-500">Signature</p>
                </div>
                <p className="text-sm font-bold">{content.signatureBlocks.eventManager?.name}</p>
                <p className="text-sm text-gray-600">{content.signatureBlocks.eventManager?.title}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Date: {content.signatureBlocks.eventManager?.date || '_______________'}
                </p>
              </div>
            </div>
          </div>
        )}

        {contract.clientSignature && (
          <div className="mt-8 p-4 border-2 border-green-600 rounded bg-green-50">
            <div className="flex items-center text-green-700 mb-2">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              <span className="font-bold">Digitally Signed</span>
            </div>
            <p className="text-sm text-green-800">
              Signed by {contract.clientSignature.signedBy} on {format(new Date(contract.clientSignature.signedAt), 'MMM d, yyyy \'at\' h:mm a')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold mb-3 border-b border-gray-300 pb-1">
        {number}. {title}
      </h2>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <tr>
      <td className="border border-gray-400 px-3 py-2 font-semibold bg-gray-50 w-1/3">{label}</td>
      <td className="border border-gray-400 px-3 py-2">{value}</td>
    </tr>
  );
}
