import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePageMeta } from "@/hooks/use-page-meta";
import { useRoute } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle2,
  Download,
  Shield,
  Clock,
  AlertTriangle,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import type { Contract } from '@shared/schema';
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import FormHelperBot from "@/components/FormHelperBot";

interface ContractWithDetails extends Contract {
  event?: any;
  client?: any;
}

export default function ClientContractSigning() {
  usePageMeta({ title: "Contract Signing — Event Perfekt" });

  const [, params] = useRoute('/contract-sign/:contractId');
  const contractId = params?.contractId;
  
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['/api/contracts', contractId],
    enabled: !!contractId,
  }) as { data: ContractWithDetails | undefined; isLoading: boolean; error: any };

  const signContractMutation = useMutation({
    mutationFn: async (signatureData: {
      signature: string;
      agreedToTerms: boolean;
    }) => {
      return apiRequest('POST', `/api/contracts/${contractId}/sign`, signatureData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', contractId] });
      toast({
        title: "Contract Signed Successfully!",
        description: "Your contract has been signed and submitted. You will receive a confirmation email shortly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Signing Failed",
        description: error.message || "Failed to sign contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSign = () => {
    if (!agreed || !signature.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please agree to the terms and provide your signature.",
        variant: "destructive",
      });
      return;
    }
    signContractMutation.mutate({
      signature: signature.trim(),
      agreedToTerms: agreed,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-700">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white border border-red-300 rounded-lg p-8 max-w-md text-center shadow">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contract Not Found</h2>
          <p className="text-gray-600">The contract you're looking for doesn't exist or has expired.</p>
        </div>
      </div>
    );
  }

  if (contract.status === 'signed') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white border border-green-300 rounded-lg p-8 max-w-md text-center shadow">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contract Already Signed</h2>
          <p className="text-gray-600 mb-4">
            This contract was signed on {contract.signedDate ? format(new Date(contract.signedDate), 'MMM d, yyyy') : 'Unknown date'}.
          </p>
          <Button onClick={handlePrint} className="bg-gray-900 text-white hover:bg-gray-800">
            <Download className="h-4 w-4 mr-2" />
            Download Contract
          </Button>
        </div>
      </div>
    );
  }

  if (contract.status !== 'sent' && contract.status !== 'draft') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white border border-yellow-300 rounded-lg p-8 max-w-md text-center shadow">
          <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Contract Not Ready</h2>
          <p className="text-gray-600">This contract is not yet ready for signing. Please contact Event Perfekt for more information.</p>
        </div>
      </div>
    );
  }

  const cc = contract.contractContent as any;

  return (
    <div className="min-h-screen bg-gray-200 print:bg-white">
      {/* Top bar - hidden on print */}
      <div className="print:hidden bg-[#330311] text-white py-4 px-6 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <img src={eventPerfektLogo} alt="Event Perfekt" className="h-10 w-10 rounded-xl shadow-lg ring-1 ring-white/10" />
          <div>
            <h1 className="text-xl font-bold">Event Perfekt</h1>
            <p className="text-sm text-white/70">Contract Signing Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Shield className="h-4 w-4" />
            Secure Document
          </div>
          <Button onClick={handlePrint} variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
            <Printer className="h-4 w-4 mr-2" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Contract Document */}
      <div className="max-w-[850px] mx-auto my-8 print:my-0 print:max-w-none">
        <div className="bg-white shadow-xl print:shadow-none" style={{ fontFamily: "Poppins, sans-serif" }}>
          <div className="px-16 py-12 print:px-12 print:py-8">

            {/* Header */}
            <div className="text-center mb-10 border-b-2 border-black pb-6">
              <h1 className="text-2xl font-bold tracking-wide text-black uppercase mb-2">
                {cc?.agreementTitle || "EVENT MANAGEMENT SERVICES AGREEMENT"}
              </h1>
              <p className="text-sm text-gray-700 mt-3">
                Effective Date: {cc?.effectiveDate || format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>

            {/* Preamble */}
            <div className="mb-8 text-[15px] leading-7 text-black">
              <p className="mb-4">
                This Event Management Services Agreement (hereinafter referred to as the <strong>"Agreement"</strong>) is entered into 
                as of <strong>{cc?.effectiveDate}</strong>, by and between:
              </p>
              <div className="ml-8 mb-4">
                <p className="mb-3">
                  <strong>1. {cc?.parties?.eventManager?.name || "Event Perfekt Global Ltd"}</strong>, 
                  with offices at {cc?.parties?.eventManager?.address || "Lagos, Nigeria"} 
                  (hereinafter referred to as the <strong>"Event Manager"</strong>);
                </p>
                <p>AND</p>
                <p className="mt-3">
                  <strong>2. {cc?.parties?.client?.name || "Client"}</strong>
                  {cc?.parties?.client?.organization && ` of ${cc.parties.client.organization}`}, 
                  located at {cc?.parties?.client?.address || "N/A"} 
                  (hereinafter referred to as the <strong>"Client"</strong>).
                </p>
              </div>
              <p>
                The Event Manager and the Client are hereinafter individually referred to as a <strong>"Party"</strong> and 
                collectively as the <strong>"Parties"</strong>.
              </p>
            </div>

            {/* Section 1: Definitions */}
            {cc?.definitions && cc.definitions.length > 0 && (
              <Section number={1} title="DEFINITIONS">
                <p className="mb-4">In this Agreement, the following terms shall have the meanings ascribed to them below:</p>
                <div className="space-y-3">
                  {cc.definitions.map((def: any, i: number) => (
                    <p key={i}>
                      <strong>1.{i + 1} "{def.term}"</strong> — {def.definition}
                    </p>
                  ))}
                </div>
              </Section>
            )}

            {/* Section 2: Scope of Work */}
            {cc?.scopeOfWork && (
              <Section number={2} title="SCOPE OF WORK">
                <p className="mb-4">
                  <strong>2.1 Services.</strong> The Event Manager shall provide the following services in connection with the Event:
                </p>
                <p className="ml-8 mb-6 leading-relaxed">
                  {(cc.scopeOfWork.services || cc.services || []).map((service: string, i: number) => (
                    <span key={i}>({String.fromCharCode(97 + i)}) {service} </span>
                  ))}
                </p>
                {cc.scopeOfWork.deliverables && cc.scopeOfWork.deliverables.length > 0 && (
                  <>
                    <p className="mb-4">
                      <strong>2.2 Deliverables.</strong> The Event Manager shall produce and deliver the following:
                    </p>
                    <table className="w-full border-collapse mb-4 text-sm">
                      <thead>
                        <tr className="border-b-2 border-black">
                          <th className="text-left py-2 pr-4 font-bold">No.</th>
                          <th className="text-left py-2 pr-4 font-bold">Deliverable</th>
                          <th className="text-left py-2 font-bold">Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cc.scopeOfWork.deliverables.map((d: any, i: number) => (
                          <tr key={i} className="border-b border-gray-300">
                            <td className="py-2 pr-4">{i + 1}</td>
                            <td className="py-2 pr-4">{d.item}</td>
                            <td className="py-2">{d.dueDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </Section>
            )}

            {/* Section 3: Event Details */}
            {cc?.eventDetails && (
              <Section number={3} title="EVENT DETAILS">
                <table className="w-full mb-4 text-sm">
                  <tbody>
                    <DetailRow label="Event Name" value={cc.eventDetails.eventName} />
                    <DetailRow label="Event Type" value={cc.eventDetails.eventType} />
                    <DetailRow label="Event Category" value={cc.eventDetails.eventCategory} />
                    <DetailRow label="Event Date" value={cc.eventDetails.eventDate} />
                    <DetailRow label="End Date" value={cc.eventDetails.endDate} />
                    <DetailRow label="Venue" value={cc.eventDetails.venue} />
                    <DetailRow label="City" value={cc.eventDetails.city} />
                    <DetailRow label="Country" value={cc.eventDetails.country} />
                    <DetailRow label="Expected Guest Count" value={cc.eventDetails.guestCount?.toString()} />
                    <DetailRow label="Number of Event Days" value={cc.eventDetails.eventDays?.toString()} />
                    {cc.eventDetails.weddingScope && (
                      <DetailRow label="Wedding Scope" value={cc.eventDetails.weddingScope} />
                    )}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Section 4: Payment Terms */}
            {cc?.paymentTerms && (
              <Section number={4} title="PAYMENT TERMS">
                <p className="mb-4">
                  <strong>4.1 Total Fee.</strong> The total fee for the Services shall be{' '}
                  <strong>{formatCurrency(cc.paymentTerms.totalFee, cc.paymentTerms.currency)}</strong>.
                </p>

                <p className="mb-4">
                  <strong>4.2 Payment Schedule.</strong> The Client shall pay the Total Fee in the following installments:
                </p>
                <table className="w-full border-collapse mb-6 text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-2 pr-4 font-bold">Description</th>
                      <th className="text-right py-2 pr-4 font-bold">Amount</th>
                      <th className="text-left py-2 font-bold">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cc.paymentTerms.installments?.map((inst: any, i: number) => (
                      <tr key={i} className="border-b border-gray-300">
                        <td className="py-2 pr-4">{inst.description}</td>
                        <td className="py-2 pr-4 text-right font-medium">
                          {formatCurrency(inst.amount, cc.paymentTerms.currency)}
                        </td>
                        <td className="py-2">{inst.dueDate}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-black font-bold">
                      <td className="py-2 pr-4">TOTAL</td>
                      <td className="py-2 pr-4 text-right">
                        {formatCurrency(cc.paymentTerms.totalFee, cc.paymentTerms.currency)}
                      </td>
                      <td className="py-2"></td>
                    </tr>
                  </tbody>
                </table>

                <p className="mb-2">
                  <strong>4.3 Late Payment.</strong> A late fee of {cc.paymentTerms.lateFee || "5% per week"} shall be applied 
                  to any overdue balance.
                </p>

                {cc.paymentTerms.paymentMethods && (
                  <p className="mb-2">
                    <strong>4.4 Accepted Payment Methods:</strong>{' '}
                    {cc.paymentTerms.paymentMethods.join(', ')}.
                  </p>
                )}
              </Section>
            )}

            {/* Section 5: Cancellation Policy */}
            {cc?.cancellationPolicy && cc.cancellationPolicy.length > 0 && (
              <Section number={5} title="CANCELLATION POLICY">
                <p className="mb-4">In the event of cancellation by the Client, the following terms shall apply:</p>
                <table className="w-full border-collapse mb-4 text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-2 pr-4 font-bold">Condition</th>
                      <th className="text-left py-2 font-bold">Penalty / Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cc.cancellationPolicy.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-gray-300">
                        <td className="py-2 pr-4">{item.condition}</td>
                        <td className="py-2">{item.penalty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* Section 6: Confidentiality */}
            {cc?.confidentiality && (
              <Section number={6} title="CONFIDENTIALITY">
                <p>{cc.confidentiality}</p>
              </Section>
            )}

            {/* Section 7: Limitation of Liability */}
            {cc?.liabilityLimitation && (
              <Section number={7} title="LIMITATION OF LIABILITY">
                <p>{cc.liabilityLimitation}</p>
              </Section>
            )}

            {/* Section 8: Force Majeure */}
            {cc?.forceMajeure && (
              <Section number={8} title="FORCE MAJEURE">
                <p>{cc.forceMajeure}</p>
              </Section>
            )}

            {/* Section 9: Termination */}
            {cc?.termination && (
              <Section number={9} title="TERMINATION">
                <p>{cc.termination}</p>
              </Section>
            )}

            {/* Section 10: Governing Law */}
            {cc?.governingLaw && (
              <Section number={10} title="GOVERNING LAW">
                <p>
                  This Agreement shall be governed by and construed in accordance with the <strong>{cc.governingLaw}</strong>.
                </p>
              </Section>
            )}

            {/* Section 11: Dispute Resolution */}
            {cc?.disputeResolution && (
              <Section number={11} title="DISPUTE RESOLUTION">
                <p>{cc.disputeResolution}</p>
              </Section>
            )}

            {/* Section 12: Entire Agreement */}
            {cc?.entireAgreement && (
              <Section number={12} title="ENTIRE AGREEMENT">
                <p>{cc.entireAgreement}</p>
              </Section>
            )}

            {/* Signature Blocks */}
            <div className="mt-12 pt-8 border-t-2 border-black">
              <p className="font-bold mb-8 text-center uppercase tracking-wide">
                IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first above written.
              </p>

              <div className="grid grid-cols-2 gap-16 mt-10">
                {/* Event Manager Signature */}
                <div>
                  <p className="font-bold mb-6 uppercase text-sm">For and on behalf of the Event Manager:</p>
                  <div className="border-b border-black mb-2 h-12"></div>
                  <p className="font-bold">{cc?.signatureBlocks?.eventManager?.name || "Event Perfekt Global Ltd"}</p>
                  <p className="text-sm text-gray-600">{cc?.signatureBlocks?.eventManager?.title || "Event Director"}</p>
                  <p className="text-sm text-gray-600 mt-1">Date: {cc?.signatureBlocks?.eventManager?.date || "_________________"}</p>
                </div>

                {/* Client Signature */}
                <div>
                  <p className="font-bold mb-6 uppercase text-sm">For and on behalf of the Client:</p>
                  <div className="border-b border-black mb-2 h-12"></div>
                  <p className="font-bold">{cc?.signatureBlocks?.client?.name || "Client"}</p>
                  <p className="text-sm text-gray-600">{cc?.signatureBlocks?.client?.title || "Client"}</p>
                  <p className="text-sm text-gray-600 mt-1">Date: _________________</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Signing Section - hidden on print */}
        <div className="print:hidden mt-8 mb-12">
          <div className="bg-white shadow-xl rounded-lg px-16 py-10">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <Shield className="h-5 w-5 text-[#330311]" />
              Digital Signature
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-800 font-medium text-sm">Secure Signing Environment</p>
                <p className="text-blue-700 text-xs">This page uses industry-standard security to protect your information during the signing process.</p>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="terms-agreement"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="terms-agreement" className="text-gray-900 font-medium cursor-pointer text-sm">
                    I agree to the terms and conditions outlined in this contract
                  </label>
                  <p className="text-gray-500 text-xs mt-1">
                    By checking this box, you acknowledge that you have read, understood, and agree to all terms, 
                    conditions, and pricing outlined in this contract. You understand that this constitutes a legally binding agreement.
                  </p>
                </div>
              </div>
            </div>

            {/* Signature Input */}
            <div className="mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <label className="block text-gray-900 font-medium mb-2 text-sm">
                Your Full Name (Digital Signature)
              </label>
              <input
                type="text"
                placeholder="Type your full legal name here..."
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#330311] focus:border-[#330311] text-lg"
                style={{ fontFamily: "Poppins, sans-serif" }}
              />
              <p className="text-gray-500 text-xs mt-2">
                By typing your name above, you are providing a legal digital signature equivalent to a handwritten signature.
              </p>
            </div>

            {/* Sign Button */}
            <Button
              onClick={handleSign}
              disabled={!agreed || !signature.trim() || signContractMutation.isPending}
              className="w-full bg-[#330311] text-white hover:bg-[#4a0519] py-3 text-lg font-semibold"
            >
              {signContractMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing Signature...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Sign Contract & Proceed to Payment
                </div>
              )}
            </Button>
            
            {(!agreed || !signature.trim()) && (
              <p className="text-gray-400 text-sm text-center mt-3">
                Please agree to terms and provide your signature to continue
              </p>
            )}

            {/* Next Steps */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mt-6">
              <h4 className="text-gray-800 font-semibold mb-3 text-sm">What happens next?</h4>
              <div className="space-y-2 text-gray-600 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Contract will be signed and saved to your account</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>You'll be redirected to secure payment for your deposit</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>Event planning process begins immediately after deposit approval</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <span>You'll receive confirmation and next steps via email</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:my-0 { margin-top: 0 !important; margin-bottom: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:px-12 { padding-left: 3rem !important; padding-right: 3rem !important; }
          .print\\:py-8 { padding-top: 2rem !important; padding-bottom: 2rem !important; }
        }
      `}</style>
      <FormHelperBot formContext="contract-signing" welcomeMessage="Hi! I can help you understand any part of this contract before you sign. Feel free to ask." suggestedQuestions={["What am I agreeing to?", "What's the cancellation policy?", "Is a digital signature legally binding?"]} />
    </div>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-base font-bold mb-4 text-black uppercase tracking-wide">
        {number}. {title}
      </h2>
      <div className="text-[15px] leading-7 text-black pl-4">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <tr className="border-b border-gray-200">
      <td className="py-2 pr-6 font-medium text-gray-700 w-1/3">{label}:</td>
      <td className="py-2 text-black">{value}</td>
    </tr>
  );
}

function formatCurrency(amount: number, currency: string = 'USD') {
  return `${currency} ${amount.toLocaleString()}`;
}
