import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import PlannerLayout from "@/components/PlannerLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, UserPlus, Search, Eye, Edit2, Trash2, Printer, Upload,
  Mail, Phone, MapPin, Building, Calendar, FileText, Shield, Download,
  Briefcase, Heart, CreditCard, Loader2, ChevronRight, X, User,
  Star, ClipboardList, ScrollText, Plus,
} from "lucide-react";
import { openPrintWindow } from "@/lib/printUtils";
import { format } from "date-fns";

interface ReviewEntry {
  id: string;
  date: string;
  reviewer: string;
  period: string;
  rating: number;
  performance: string;
  strengths: string;
  improvements: string;
  goals: string;
  comments: string;
}

interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  department: string | null;
  job_title: string | null;
  start_date: string | null;
  date_of_birth: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_sort_code: string | null;
  national_insurance: string | null;
  tax_id: string | null;
  cv_filename: string | null;
  cv_url: string | null;
  photo_url: string | null;
  id_document_url: string | null;
  additional_documents: any[];
  notes: string | null;
  status: string;
  onboarding_completed: boolean;
  created_at: string;
  employment_letter_url: string | null;
  employment_letter_date: string | null;
  reviews: ReviewEntry[];
  salary: string | null;
  contract_type: string | null;
  probation_end_date: string | null;
  permissions: Record<string, boolean> | null;
  folder_path: string | null;
}

const DEPARTMENTS = ["Management", "Planning", "Design", "Finance", "Operations", "Marketing", "Administration", "IT", "Other"];
const ROLES = ["admin", "planner", "staff", "collaborator"];
const COUNTRIES = ["Nigeria", "United Kingdom", "Ghana", "Zambia", "Senegal"];
const CONTRACT_TYPES = ["full-time", "part-time", "contract", "freelance", "intern"];

const PLATFORM_PERMISSIONS = [
  { key: "events", label: "Events", desc: "Create and manage events" },
  { key: "clients", label: "Clients", desc: "View and manage client records" },
  { key: "budgets", label: "Budgets", desc: "Access budget and financial tools" },
  { key: "invoices", label: "Invoices", desc: "Create and send invoices" },
  { key: "vendors", label: "Vendors", desc: "Manage vendor directory" },
  { key: "reports", label: "Reports", desc: "View and generate reports" },
  { key: "calendar", label: "Calendar", desc: "Access event calendar" },
  { key: "tasks", label: "Tasks", desc: "View and manage tasks" },
  { key: "communications", label: "Communications", desc: "Chat, email and notifications" },
  { key: "documents", label: "Documents", desc: "Access document storage" },
  { key: "marketing", label: "Marketing", desc: "Leads, prospects and campaigns" },
  { key: "hr", label: "HR & People", desc: "Employee and team management" },
  { key: "decor", label: "Decor & Inventory", desc: "Decor suite and inventory" },
  { key: "analytics", label: "Analytics", desc: "Dashboard analytics and insights" },
];

const COMPANY_INFO: Record<string, { name: string; address: string; regNote: string }> = {
  "Nigeria": {
    name: "Event Perfekt Management Services Limited",
    address: "25 Kusenla Street, Lagos, Nigeria",
    regNote: "Registered under the Companies and Allied Matters Act (CAMA), Federal Republic of Nigeria",
  },
  "United Kingdom": {
    name: "Event Perfekt Global Ltd",
    address: "20 Wenlock Road, London, N1 7PG, United Kingdom",
    regNote: "Registered in England and Wales under the Companies Act 2006",
  },
  "Ghana": {
    name: "Event Perfekt Management Services Limited",
    address: "25 Kusenla Street, Lagos, Nigeria",
    regNote: "Operating in Ghana under the Companies Act, 2019 (Act 992)",
  },
  "Zambia": {
    name: "Event Perfekt Management Services Limited",
    address: "25 Kusenla Street, Lagos, Nigeria",
    regNote: "Operating in Zambia under the Companies Act No. 10 of 2017",
  },
  "Senegal": {
    name: "Event Perfekt Management Services Limited",
    address: "25 Kusenla Street, Lagos, Nigeria",
    regNote: "Op\u00e9rant au S\u00e9n\u00e9gal conform\u00e9ment \u00e0 l'Acte Uniforme OHADA",
  },
};

function generateEmploymentLetterHtml(emp: Employee): string {
  const country = emp.country || "Nigeria";
  const info = COMPANY_INFO[country] || COMPANY_INFO["Nigeria"];
  const today = format(new Date(), "dd MMMM yyyy");
  const startDateFormatted = emp.start_date ? format(new Date(emp.start_date), "dd MMMM yyyy") : "[Start Date]";
  const probationEnd = emp.probation_end_date ? format(new Date(emp.probation_end_date), "dd MMMM yyyy") : "";
  const contractLabel = (emp.contract_type || "full-time").replace("-", " ").replace(/\b\w/g, c => c.toUpperCase());

  let probationClause = "";
  if (probationEnd) {
    if (country === "Senegal") {
      probationClause = `<p>Vous serez soumis(e) \u00e0 une p\u00e9riode d'essai se terminant le <strong>${probationEnd}</strong>, durant laquelle l'une ou l'autre des parties pourra r\u00e9silier le contrat avec un pr\u00e9avis raisonnable.</p>`;
    } else {
      probationClause = `<p>You will be subject to a probationary period ending on <strong>${probationEnd}</strong>, during which either party may terminate the employment with reasonable notice.</p>`;
    }
  }

  let salaryClause = "";
  if (emp.salary) {
    const currencyMap: Record<string, string> = { "Nigeria": "NGN", "United Kingdom": "GBP", "Ghana": "GHS", "Zambia": "ZMW", "Senegal": "XOF" };
    const currency = currencyMap[country] || "USD";
    if (country === "Senegal") {
      salaryClause = `<p>Votre r\u00e9mun\u00e9ration annuelle brute sera de <strong>${currency} ${emp.salary}</strong>, soumise aux d\u00e9ductions l\u00e9gales applicables.</p>`;
    } else {
      salaryClause = `<p>Your gross annual salary will be <strong>${currency} ${emp.salary}</strong>, subject to applicable statutory deductions.</p>`;
    }
  }

  let countrySpecificTerms = "";
  if (country === "Nigeria") {
    countrySpecificTerms = `
      <p>This employment is governed by the Nigerian Labour Act and all applicable labour regulations. You are entitled to statutory benefits including pension contributions under the Pension Reform Act, National Housing Fund, and National Health Insurance Scheme (NHIS).</p>
      <p>Either party may terminate this employment by giving one (1) month's written notice or payment in lieu thereof, in accordance with the Nigerian Labour Act.</p>`;
  } else if (country === "United Kingdom") {
    countrySpecificTerms = `
      <p>This employment is governed by the Employment Rights Act 1996 and all applicable UK employment legislation. You are entitled to statutory benefits including workplace pension (auto-enrolment), statutory sick pay, and a minimum of 28 days paid annual leave (inclusive of bank holidays).</p>
      <p>Either party may terminate this employment by giving one (1) month's written notice during the first two years of continuous employment, increasing by one week for each additional year (up to 12 weeks), in accordance with the Employment Rights Act 1996.</p>`;
  } else if (country === "Ghana") {
    countrySpecificTerms = `
      <p>This employment is governed by the Labour Act 2003 (Act 651) of Ghana and all applicable labour regulations. You are entitled to statutory benefits including SSNIT contributions, paid annual leave of at least 15 working days, and access to the National Health Insurance Scheme.</p>
      <p>Either party may terminate this employment by giving one (1) month's written notice or payment in lieu thereof, in accordance with the Ghana Labour Act 2003.</p>`;
  } else if (country === "Zambia") {
    countrySpecificTerms = `
      <p>This employment is governed by the Employment Code Act No. 3 of 2019 of Zambia and all applicable labour regulations. You are entitled to statutory benefits including NAPSA contributions, at least 24 working days of annual leave, and maternity/paternity benefits as prescribed by law.</p>
      <p>Either party may terminate this employment by giving one (1) month's written notice or payment in lieu thereof, in accordance with the Zambia Employment Code Act 2019.</p>`;
  } else if (country === "Senegal") {
    countrySpecificTerms = `
      <p>Ce contrat de travail est r\u00e9gi par le Code du Travail du S\u00e9n\u00e9gal et l'Acte Uniforme OHADA relatif au droit du travail. Vous b\u00e9n\u00e9ficiez des avantages l\u00e9gaux, y compris les cotisations \u00e0 l'Institution de Pr\u00e9voyance Retraite du S\u00e9n\u00e9gal (IPRES), la Caisse de S\u00e9curit\u00e9 Sociale, et un minimum de 24 jours ouvr\u00e9s de cong\u00e9s pay\u00e9s annuels.</p>
      <p>L'une ou l'autre des parties peut r\u00e9silier ce contrat en donnant un pr\u00e9avis \u00e9crit d'un (1) mois, conform\u00e9ment au Code du Travail du S\u00e9n\u00e9gal.</p>`;
  }

  const isFrench = country === "Senegal";

  return `<!DOCTYPE html><html><head><title>${isFrench ? "Lettre d'Embauche" : "Employment Letter"} - ${emp.first_name} ${emp.last_name}</title>
<style>
  @page { size: A4 portrait; margin: 20mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Poppins', sans-serif;, 'Times New Roman', serif; color: #1a1a1a; margin: 0; padding: 40px; line-height: 1.7; font-size: 14px; }
  .letterhead { border-bottom: 3px solid #330311; padding-bottom: 20px; margin-bottom: 30px; }
  .company-name { font-size: 22px; font-weight: bold; color: #330311; margin: 0; }
  .company-address { font-size: 12px; color: #666; margin: 4px 0 0; }
  .date { text-align: right; margin-bottom: 30px; color: #444; }
  .recipient { margin-bottom: 25px; }
  .subject { font-weight: bold; text-decoration: underline; margin: 25px 0; font-size: 15px; color: #330311; }
  p { margin: 12px 0; text-align: justify; }
  .signature { margin-top: 50px; }
  .sig-line { border-top: 1px solid #333; width: 250px; margin-top: 60px; padding-top: 8px; }
  .footer-note { margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 12px; text-align: center; font-style: italic; }
  .acceptance { margin-top: 40px; padding: 20px; border: 1px solid #ddd; background: #fafafa; }
  .acceptance h3 { margin: 0 0 12px; font-size: 14px; color: #330311; }
  .accept-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 20px; }
  .accept-field { border-bottom: 1px solid #333; padding-bottom: 4px; min-height: 30px; }
  .accept-label { font-size: 11px; color: #666; margin-top: 4px; }
  @media print { body { padding: 0; } .no-print { display: none !important; } }
</style></head><body>
<div class="letterhead">
  <p class="company-name">${info.name}</p>
  <p class="company-address">${info.address}</p>
</div>
<p class="date">${today}</p>
<div class="recipient">
  <p><strong>${emp.first_name} ${emp.last_name}</strong></p>
  ${emp.address ? `<p>${[emp.address, emp.city, emp.country].filter(Boolean).join(", ")}</p>` : ""}
  ${emp.email ? `<p>${emp.email}</p>` : ""}
</div>
<p>${isFrench ? `Cher/Ch\u00e8re ${emp.first_name},` : `Dear ${emp.first_name},`}</p>
<p class="subject">${isFrench ? `LETTRE D'OFFRE D'EMPLOI \u2014 ${(emp.job_title || "Employ\u00e9(e)").toUpperCase()}` : `OFFER OF EMPLOYMENT \u2014 ${(emp.job_title || "Employee").toUpperCase()}`}</p>
<p>${isFrench
    ? `Nous avons le plaisir de vous confirmer votre nomination au poste de <strong>${emp.job_title || "Employ\u00e9(e)"}</strong> au sein du d\u00e9partement <strong>${emp.department || "Op\u00e9rations"}</strong> de ${info.name}, \u00e0 compter du <strong>${startDateFormatted}</strong>.`
    : `We are pleased to confirm your appointment to the position of <strong>${emp.job_title || "Employee"}</strong> in the <strong>${emp.department || "Operations"}</strong> department at ${info.name}, effective from <strong>${startDateFormatted}</strong>.`
}</p>
<p>${isFrench
    ? `Votre type de contrat est <strong>${contractLabel}</strong>.`
    : `Your employment type is <strong>${contractLabel}</strong>.`
}</p>
${salaryClause}
${probationClause}
${countrySpecificTerms}
<p>${isFrench
    ? `Vous rendrez compte directement au responsable de votre d\u00e9partement. Vos heures de travail seront conform\u00e9ment aux politiques de l'entreprise et \u00e0 la l\u00e9gislation locale applicable.`
    : `You will report directly to the Head of your department. Your working hours will be in accordance with company policies and applicable local legislation.`
}</p>
<p>${isFrench
    ? `Cette offre est conditionn\u00e9e \u00e0 la v\u00e9rification satisfaisante de vos r\u00e9f\u00e9rences, qualifications et de votre droit de travailler dans le pays concern\u00e9.`
    : `This offer is conditional upon satisfactory verification of your references, qualifications, and right to work in the relevant country.`
}</p>
<p>${isFrench
    ? `Nous sommes ravis de vous accueillir dans notre \u00e9quipe et nous sommes impatients de travailler avec vous.`
    : `We are delighted to welcome you to our team and look forward to a successful working relationship.`
}</p>
<div class="signature">
  <p>${isFrench ? "Cordialement," : "Yours sincerely,"}</p>
  <div class="sig-line">
    <p><strong>${isFrench ? "Directeur G\u00e9n\u00e9ral" : "Managing Director"}</strong></p>
    <p>${info.name}</p>
  </div>
</div>
<div class="acceptance">
  <h3>${isFrench ? "ACCEPTATION DE L'OFFRE" : "ACCEPTANCE OF OFFER"}</h3>
  <p style="font-size:13px">${isFrench
    ? `Je, <strong>${emp.first_name} ${emp.last_name}</strong>, accepte par la pr\u00e9sente les termes et conditions de cette lettre d'offre d'emploi.`
    : `I, <strong>${emp.first_name} ${emp.last_name}</strong>, hereby accept the terms and conditions set out in this letter of employment offer.`
  }</p>
  <div class="accept-fields">
    <div><div class="accept-field"></div><p class="accept-label">${isFrench ? "Signature" : "Signature"}</p></div>
    <div><div class="accept-field"></div><p class="accept-label">${isFrench ? "Date" : "Date"}</p></div>
  </div>
</div>
<p class="footer-note">${info.regNote}<br/>Event Perfekt \u2014 ...making yours perfekt</p>
</body></html>`;
}

export default function EmployeeManagement() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [formStep, setFormStep] = useState(1);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewEmployee, setReviewEmployee] = useState<Employee | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("staff");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankSortCode, setBankSortCode] = useState("");
  const [nationalInsurance, setNationalInsurance] = useState("");
  const [taxId, setTaxId] = useState("");
  const [notes, setNotes] = useState("");
  const [salary, setSalary] = useState("");
  const [contractType, setContractType] = useState("full-time");
  const [probationEndDate, setProbationEndDate] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<FileList | null>(null);

  const [staffPermissions, setStaffPermissions] = useState<Record<string, boolean>>(
    Object.fromEntries(PLATFORM_PERMISSIONS.map(p => [p.key, false]))
  );
  const [credentialsDialog, setCredentialsDialog] = useState<{ open: boolean; name: string; email: string; password: string; emailSent?: boolean } | null>(null);

  const [reviewPeriod, setReviewPeriod] = useState("");
  const [reviewRating, setReviewRating] = useState(3);
  const [reviewPerformance, setReviewPerformance] = useState("meets_expectations");
  const [reviewStrengths, setReviewStrengths] = useState("");
  const [reviewImprovements, setReviewImprovements] = useState("");
  const [reviewGoals, setReviewGoals] = useState("");
  const [reviewComments, setReviewComments] = useState("");

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      if (data.login_created) {
        setCredentialsDialog({
          open: true,
          name: `${data.first_name} ${data.last_name}`,
          email: data.staff_email,
          password: data.staff_password,
          emailSent: data.email_sent,
        });
        const emailMsg = data.email_sent ? `Welcome email sent to ${data.email}` : "Welcome email could not be sent — please share credentials manually";
        toast({ title: "Employee Onboarded", description: emailMsg });
      } else {
        const desc = data.login_error || "Employee record created. Login account could not be auto-generated.";
        toast({ title: "Employee Added", description: desc });
      }
      resetForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: FormData }) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee Updated" });
      resetForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Employee Removed" });
      setViewingEmployee(null);
    },
  });

  const addReviewMutation = useMutation({
    mutationFn: async ({ id, review }: { id: number; review: ReviewEntry }) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ add_review: review }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      toast({ title: "Review Added", description: "Performance review has been saved" });
      setShowReviewForm(false);
      resetReviewForm();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
    setFormStep(1);
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setRole("staff"); setDepartment(""); setJobTitle(""); setStartDate("");
    setDateOfBirth(""); setAddress(""); setCity(""); setCountry("");
    setEmergencyName(""); setEmergencyPhone(""); setEmergencyRelationship("");
    setBankName(""); setBankAccount(""); setBankSortCode("");
    setNationalInsurance(""); setTaxId(""); setNotes("");
    setSalary(""); setContractType("full-time"); setProbationEndDate("");
    setCvFile(null); setPhotoFile(null); setIdDocFile(null); setAdditionalFiles(null);
    setStaffPermissions(Object.fromEntries(PLATFORM_PERMISSIONS.map(p => [p.key, false])));
  };

  const resetReviewForm = () => {
    setReviewPeriod(""); setReviewRating(3); setReviewPerformance("meets_expectations");
    setReviewStrengths(""); setReviewImprovements(""); setReviewGoals(""); setReviewComments("");
  };

  const openEditForm = (emp: Employee) => {
    setEditingEmployee(emp);
    setFirstName(emp.first_name); setLastName(emp.last_name);
    setEmail(emp.email); setPhone(emp.phone || "");
    setRole(emp.role); setDepartment(emp.department || "");
    setJobTitle(emp.job_title || ""); setStartDate(emp.start_date || "");
    setDateOfBirth(emp.date_of_birth || ""); setAddress(emp.address || "");
    setCity(emp.city || ""); setCountry(emp.country || "");
    setEmergencyName(emp.emergency_contact_name || "");
    setEmergencyPhone(emp.emergency_contact_phone || "");
    setEmergencyRelationship(emp.emergency_contact_relationship || "");
    setBankName(emp.bank_name || ""); setBankAccount(emp.bank_account_number || "");
    setBankSortCode(emp.bank_sort_code || ""); setNationalInsurance(emp.national_insurance || "");
    setTaxId(emp.tax_id || ""); setNotes(emp.notes || "");
    setSalary(emp.salary || ""); setContractType(emp.contract_type || "full-time");
    setProbationEndDate(emp.probation_end_date || "");
    setStaffPermissions(emp.permissions || Object.fromEntries(PLATFORM_PERMISSIONS.map(p => [p.key, false])));
    setFormStep(1);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!firstName || !lastName || !email) {
      toast({ title: "Required Fields", description: "First name, last name, and email are required", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("first_name", firstName);
    formData.append("last_name", lastName);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("role", role);
    formData.append("department", department);
    formData.append("job_title", jobTitle);
    formData.append("start_date", startDate);
    formData.append("date_of_birth", dateOfBirth);
    formData.append("address", address);
    formData.append("city", city);
    formData.append("country", country);
    formData.append("emergency_contact_name", emergencyName);
    formData.append("emergency_contact_phone", emergencyPhone);
    formData.append("emergency_contact_relationship", emergencyRelationship);
    formData.append("bank_name", bankName);
    formData.append("bank_account_number", bankAccount);
    formData.append("bank_sort_code", bankSortCode);
    formData.append("national_insurance", nationalInsurance);
    formData.append("tax_id", taxId);
    formData.append("notes", notes);
    formData.append("salary", salary);
    formData.append("contract_type", contractType);
    formData.append("probation_end_date", probationEndDate);
    formData.append("permissions", JSON.stringify(staffPermissions));
    if (cvFile) formData.append("cv", cvFile);
    if (photoFile) formData.append("photo", photoFile);
    if (idDocFile) formData.append("id_document", idDocFile);
    if (additionalFiles) {
      for (let i = 0; i < additionalFiles.length; i++) {
        formData.append("additional_docs", additionalFiles[i]);
      }
    }

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleGenerateLetter = (emp: Employee) => {
    const html = generateEmploymentLetterHtml(emp);
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(html);
    printWin.document.close();
    printWin.onload = () => printWin.print();
  };

  const handleSubmitReview = () => {
    if (!reviewEmployee || !reviewPeriod) {
      toast({ title: "Required", description: "Review period is required", variant: "destructive" });
      return;
    }
    const review: ReviewEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      reviewer: "Admin",
      period: reviewPeriod,
      rating: reviewRating,
      performance: reviewPerformance,
      strengths: reviewStrengths,
      improvements: reviewImprovements,
      goals: reviewGoals,
      comments: reviewComments,
    };
    addReviewMutation.mutate({ id: reviewEmployee.id, review });
  };

  const handlePrintReviews = (emp: Employee) => {
    const reviews = emp.reviews || [];
    const performanceLabels: Record<string, string> = {
      exceeds_expectations: "Exceeds Expectations",
      meets_expectations: "Meets Expectations",
      needs_improvement: "Needs Improvement",
      unsatisfactory: "Unsatisfactory",
      outstanding: "Outstanding",
    };
    openPrintWindow({
      title: `Performance Reviews \u2014 ${emp.first_name} ${emp.last_name}`,
      subtitle: `${emp.job_title || "Employee"} \u2022 ${emp.department || "N/A"} \u2022 Printed: ${new Date().toLocaleString()}`,
      stats: [
        { label: "Total Reviews", value: reviews.length },
        { label: "Latest Rating", value: reviews.length > 0 ? `${reviews[reviews.length - 1].rating}/5` : "-" },
        { label: "Department", value: emp.department || "-" },
      ],
      columns: [
        { header: "Period", key: "period" },
        { header: "Date", key: "date", format: (v: string) => v ? format(new Date(v), "dd MMM yyyy") : "-" },
        { header: "Rating", key: "rating", align: "center", format: (v: number) => `${v}/5` },
        { header: "Performance", key: "performance", format: (v: string) => performanceLabels[v] || v },
        { header: "Strengths", key: "strengths" },
        { header: "Areas for Improvement", key: "improvements" },
        { header: "Goals", key: "goals" },
      ],
      rows: reviews,
      orientation: "landscape",
    });
  };

  const filtered = employees.filter((e) => {
    const matchesSearch = !searchQuery ||
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.job_title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDept === "all" || e.department === filterDept;
    const matchesStatus = filterStatus === "all" || e.status === filterStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const stats = {
    total: employees.length,
    active: employees.filter((e) => e.status === "active").length,
    onboarded: employees.filter((e) => e.onboarding_completed).length,
    departments: new Set(employees.map((e) => e.department).filter(Boolean)).size,
  };

  const handlePrint = () => {
    openPrintWindow({
      title: "Employee Directory",
      stats: [
        { label: "Total Employees", value: stats.total },
        { label: "Active", value: stats.active },
        { label: "Onboarded", value: stats.onboarded },
        { label: "Departments", value: stats.departments },
      ],
      columns: [
        { header: "Name", key: "name" },
        { header: "Email", key: "email" },
        { header: "Phone", key: "phone" },
        { header: "Role", key: "role" },
        { header: "Department", key: "department" },
        { header: "Job Title", key: "job_title" },
        { header: "Contract", key: "contract_type" },
        { header: "Start Date", key: "start_date" },
        { header: "Status", key: "status" },
      ],
      rows: filtered.map((e) => ({
        name: `${e.first_name} ${e.last_name}`,
        email: e.email,
        phone: e.phone || "-",
        role: e.role,
        department: e.department || "-",
        job_title: e.job_title || "-",
        contract_type: (e.contract_type || "full-time").replace("-", " "),
        start_date: e.start_date || "-",
        status: e.status,
      })),
      orientation: "landscape",
    });
  };

  const performanceLabels: Record<string, string> = {
    exceeds_expectations: "Exceeds Expectations",
    meets_expectations: "Meets Expectations",
    needs_improvement: "Needs Improvement",
    unsatisfactory: "Unsatisfactory",
    outstanding: "Outstanding",
  };

  return (
    <PlannerLayout>
      <div className="min-h-screen bg-gradient-to-br from-[#330311] to-[#2a0209]">
      <header className="bg-gradient-to-r from-[#330311] to-[#1a0209] border-b border-white/10 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B1538] to-[#330311] flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Employee Management</h1>
              <p className="text-white/60 text-sm">Manage staff records, employment letters, and performance reviews</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {employees.length > 0 && (
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            )}
            <Button size="sm" className="bg-[#8B1538] text-white hover:bg-[#6d1029]" onClick={() => { resetForm(); setShowForm(true); }}>
              <UserPlus className="w-4 h-4 mr-2" /> Register Employee
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#2a020d] border-[#4a0a1e]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/60">Total Employees</p>
            </CardContent>
          </Card>
          <Card className="bg-[#2a020d] border-[#4a0a1e]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
              <p className="text-xs text-white/60">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-[#2a020d] border-[#4a0a1e]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.onboarded}</p>
              <p className="text-xs text-white/60">Onboarded</p>
            </CardContent>
          </Card>
          <Card className="bg-[#2a020d] border-[#4a0a1e]">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">{stats.departments}</p>
              <p className="text-xs text-white/60">Departments</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#2a020d] border-[#4a0a1e] text-white placeholder:text-white/40" />
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[160px] bg-[#2a020d] border-[#4a0a1e] text-white">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] bg-[#2a020d] border-[#4a0a1e] text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white/60 mb-2">{employees.length === 0 ? "No Employees Registered" : "No Results"}</h3>
            <p className="text-white/40 mb-4">{employees.length === 0 ? "Register your first employee to get started" : "Try adjusting your filters"}</p>
            {employees.length === 0 && (
              <Button className="bg-[#8B1538] text-white" onClick={() => setShowForm(true)}>
                <UserPlus className="w-4 h-4 mr-2" /> Register First Employee
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((emp) => (
              <Card key={emp.id} className="bg-[#2a020d] border-[#4a0a1e] hover:border-[#8B1538]/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#330311] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {emp.photo_url ? (
                        <img src={emp.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{emp.first_name} {emp.last_name}</h3>
                        <Badge className={`text-[10px] ${
                          emp.status === "active" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                          emp.status === "on_leave" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                          "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}>{emp.status}</Badge>
                        {emp.onboarding_completed && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">Onboarded</Badge>}
                        {(emp.reviews || []).length > 0 && (
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                            <Star className="w-3 h-3 mr-1" /> {(emp.reviews || []).length} Review{(emp.reviews || []).length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-white/50 text-sm">
                        {emp.job_title && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {emp.job_title}</span>}
                        {emp.department && <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {emp.department}</span>}
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {emp.email}</span>
                        {emp.country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {emp.country}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge className="bg-[#330311]/50 text-white/60 border-white/10">{emp.role}</Badge>
                      {emp.cv_url && <Badge className="bg-emerald-900/30 text-emerald-300 border-emerald-500/30 text-[10px]"><FileText className="w-3 h-3 mr-1" /> CV</Badge>}
                      <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" title="View" onClick={() => setViewingEmployee(emp)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" title="Edit" onClick={() => openEditForm(emp)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" title="Employment Letter" onClick={() => handleGenerateLetter(emp)}>
                        <ScrollText className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-purple-400/60 hover:text-purple-300" title="Add Review" onClick={() => { setReviewEmployee(emp); setShowReviewForm(true); resetReviewForm(); }}>
                        <Star className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[#1a0209] border-[#4a0a1e] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editingEmployee ? "Edit Employee" : "Register New Employee"}</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <button key={step} onClick={() => setFormStep(step)}
                className={`flex-1 h-1.5 rounded-full transition-all ${formStep >= step ? "bg-[#8B1538]" : "bg-white/10"}`} />
            ))}
          </div>
          <div className="flex justify-between mb-4 text-xs text-white/40">
            <span className={formStep === 1 ? "text-white" : ""}>Personal</span>
            <span className={formStep === 2 ? "text-white" : ""}>Employment</span>
            <span className={formStep === 3 ? "text-white" : ""}>Emergency & Bank</span>
            <span className={formStep === 4 ? "text-white" : ""}>Documents</span>
            <span className={formStep === 5 ? "text-white" : ""}>Access</span>
          </div>

          {formStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-white/70">First Name *</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
                <div><Label className="text-white/70">Last Name *</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              </div>
              <div><Label className="text-white/70">Email *</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Date of Birth</Label><Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div><Label className="text-white/70">Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-white/70">City</Label><Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
                <div>
                  <Label className="text-white/70">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-white/70">Role</Label>
                <Select value={role} onValueChange={(val) => {
                  setRole(val);
                  if (val === "admin") setStaffPermissions(Object.fromEntries(PLATFORM_PERMISSIONS.map(p => [p.key, true])));
                }}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-white/70">Job Title</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. Senior Event Planner" /></div>
              <div>
                <Label className="text-white/70 mb-2 block">Employment Type</Label>
                <div className="flex flex-wrap gap-3">
                  {CONTRACT_TYPES.map((ct) => (
                    <button key={ct} type="button" onClick={() => setContractType(ct)}
                      className={`px-4 py-2 rounded-md border text-sm font-medium transition-all ${
                        contractType === ct
                          ? "bg-[#8B1538] border-[#8B1538] text-white"
                          : "bg-[#2a020d] border-[#4a0a1e] text-white/60 hover:border-[#8B1538]/50"
                      }`}>
                      {ct.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label className="text-white/70">Salary (Annual Gross)</Label><Input value={salary} onChange={(e) => setSalary(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. 5,000,000" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-white/70">Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
                <div><Label className="text-white/70">Probation End Date</Label><Input type="date" value={probationEndDate} onChange={(e) => setProbationEndDate(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              </div>
              <div><Label className="text-white/70">Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Any additional notes about this employee..." rows={3} /></div>
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2"><Heart className="w-4 h-4 text-red-400" /> Emergency Contact</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-white/70">Contact Name</Label><Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
                <div><Label className="text-white/70">Contact Phone</Label><Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              </div>
              <div><Label className="text-white/70">Relationship</Label><Input value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. Spouse, Parent, Sibling" /></div>

              <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2 mt-6"><CreditCard className="w-4 h-4 text-amber-400" /> Bank Details</h3>
              <div><Label className="text-white/70">Bank Name</Label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-white/70">Account Number</Label><Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
                <div><Label className="text-white/70">Sort Code</Label><Input value={bankSortCode} onChange={(e) => setBankSortCode(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-white/70">National Insurance No.</Label><Input value={nationalInsurance} onChange={(e) => setNationalInsurance(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
                <div><Label className="text-white/70">Tax ID</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" /></div>
              </div>
            </div>
          )}

          {formStep === 4 && (
            <div className="space-y-4">
              <div>
                <Label className="text-white/70">Photo</Label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 p-3 border border-dashed border-[#4a0a1e] rounded-lg cursor-pointer hover:border-[#8B1538] transition-all">
                    <Upload className="w-5 h-5 text-white/40" />
                    <span className="text-white/60 text-sm">{photoFile ? photoFile.name : "Upload employee photo"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-white/70">CV / Resume</Label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 p-3 border border-dashed border-[#4a0a1e] rounded-lg cursor-pointer hover:border-[#8B1538] transition-all">
                    <FileText className="w-5 h-5 text-white/40" />
                    <span className="text-white/60 text-sm">{cvFile ? cvFile.name : editingEmployee?.cv_filename || "Upload CV (PDF, DOC, DOCX)"}</span>
                    <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-white/70">ID Document (Passport, Driver's Licence, etc.)</Label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 p-3 border border-dashed border-[#4a0a1e] rounded-lg cursor-pointer hover:border-[#8B1538] transition-all">
                    <Shield className="w-5 h-5 text-white/40" />
                    <span className="text-white/60 text-sm">{idDocFile ? idDocFile.name : "Upload ID document"}</span>
                    <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setIdDocFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
              <div>
                <Label className="text-white/70">Additional Documents (Certificates, References, etc.)</Label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 p-3 border border-dashed border-[#4a0a1e] rounded-lg cursor-pointer hover:border-[#8B1538] transition-all">
                    <Upload className="w-5 h-5 text-white/40" />
                    <span className="text-white/60 text-sm">{additionalFiles ? `${additionalFiles.length} file(s) selected` : "Upload additional documents"}</span>
                    <input type="file" multiple className="hidden" onChange={(e) => setAdditionalFiles(e.target.files)} />
                  </label>
                </div>
              </div>
              {editingEmployee && editingEmployee.additional_documents && editingEmployee.additional_documents.length > 0 && (
                <div>
                  <Label className="text-white/70">Existing Documents</Label>
                  <div className="mt-1 space-y-1">
                    {editingEmployee.additional_documents.map((doc: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                        <FileText className="w-3 h-3" />
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="hover:text-white underline">{doc.name}</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {formStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400" /> Platform Access Permissions</h3>
              <p className="text-xs text-white/40">Select which areas of the platform this employee can access. Admins automatically get full access.</p>
              <div className="flex gap-2 mb-3">
                <Button type="button" size="sm" variant="outline" className="border-white/20 text-white/60 text-xs"
                  onClick={() => setStaffPermissions(Object.fromEntries(PLATFORM_PERMISSIONS.map(p => [p.key, true])))}>
                  Select All
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-white/20 text-white/60 text-xs"
                  onClick={() => setStaffPermissions(Object.fromEntries(PLATFORM_PERMISSIONS.map(p => [p.key, false])))}>
                  Clear All
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_PERMISSIONS.map((perm) => (
                  <button key={perm.key} type="button"
                    onClick={() => setStaffPermissions(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                      staffPermissions[perm.key]
                        ? "bg-[#8B1538]/20 border-[#8B1538] text-white"
                        : "bg-[#2a020d] border-[#4a0a1e] text-white/50 hover:border-[#8B1538]/40"
                    }`}>
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      staffPermissions[perm.key] ? "bg-[#8B1538] border-[#8B1538]" : "border-white/30"
                    }`}>
                      {staffPermissions[perm.key] && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{perm.label}</p>
                      <p className="text-[11px] text-white/40">{perm.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
            {formStep > 1 ? (
              <Button variant="outline" className="border-white/20 text-white" onClick={() => setFormStep(formStep - 1)}>Previous</Button>
            ) : <div />}
            {formStep < 5 ? (
              <Button className="bg-[#8B1538] text-white" onClick={() => setFormStep(formStep + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button className="bg-[#8B1538] text-white" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingEmployee ? "Update Employee" : "Register Employee"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEmployee} onOpenChange={() => setViewingEmployee(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#1a0209] border-[#4a0a1e] text-white">
          {viewingEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-white flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#330311] flex items-center justify-center overflow-hidden">
                      {viewingEmployee.photo_url ? (
                        <img src={viewingEmployee.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white/40" />
                      )}
                    </div>
                    {viewingEmployee.first_name} {viewingEmployee.last_name}
                  </DialogTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={() => handleGenerateLetter(viewingEmployee)}>
                      <ScrollText className="w-3 h-3 mr-1" /> Letter
                    </Button>
                    <Button size="sm" variant="outline" className="border-white/20 text-white" onClick={() => { setViewingEmployee(null); openEditForm(viewingEmployee); }}>
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => {
                      if (confirm("Are you sure you want to delete this employee record?")) deleteMutation.mutate(viewingEmployee.id);
                    }}>
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div>
                  <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-white/40">Email:</span> <span className="text-white ml-2">{viewingEmployee.email}</span></div>
                    <div><span className="text-white/40">Phone:</span> <span className="text-white ml-2">{viewingEmployee.phone || "-"}</span></div>
                    <div><span className="text-white/40">Date of Birth:</span> <span className="text-white ml-2">{viewingEmployee.date_of_birth || "-"}</span></div>
                    <div><span className="text-white/40">Country:</span> <span className="text-white ml-2">{viewingEmployee.country || "-"}</span></div>
                    <div className="col-span-2"><span className="text-white/40">Address:</span> <span className="text-white ml-2">{[viewingEmployee.address, viewingEmployee.city, viewingEmployee.country].filter(Boolean).join(", ") || "-"}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Employment</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-white/40">Role:</span> <Badge className="ml-2 bg-[#330311] text-white border-white/10">{viewingEmployee.role}</Badge></div>
                    <div><span className="text-white/40">Department:</span> <span className="text-white ml-2">{viewingEmployee.department || "-"}</span></div>
                    <div><span className="text-white/40">Job Title:</span> <span className="text-white ml-2">{viewingEmployee.job_title || "-"}</span></div>
                    <div><span className="text-white/40">Contract:</span> <span className="text-white ml-2">{(viewingEmployee.contract_type || "full-time").replace("-", " ")}</span></div>
                    <div><span className="text-white/40">Start Date:</span> <span className="text-white ml-2">{viewingEmployee.start_date || "-"}</span></div>
                    <div><span className="text-white/40">Probation End:</span> <span className="text-white ml-2">{viewingEmployee.probation_end_date || "-"}</span></div>
                    <div><span className="text-white/40">Salary:</span> <span className="text-white ml-2">{viewingEmployee.salary || "-"}</span></div>
                    <div><span className="text-white/40">Status:</span> <Badge className={`ml-2 ${viewingEmployee.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>{viewingEmployee.status}</Badge></div>
                    <div><span className="text-white/40">Onboarding:</span> <span className="text-white ml-2">{viewingEmployee.onboarding_completed ? "Completed" : "Pending"}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-white/40">Name:</span> <span className="text-white ml-2">{viewingEmployee.emergency_contact_name || "-"}</span></div>
                    <div><span className="text-white/40">Phone:</span> <span className="text-white ml-2">{viewingEmployee.emergency_contact_phone || "-"}</span></div>
                    <div><span className="text-white/40">Relationship:</span> <span className="text-white ml-2">{viewingEmployee.emergency_contact_relationship || "-"}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Bank Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-white/40">Bank:</span> <span className="text-white ml-2">{viewingEmployee.bank_name || "-"}</span></div>
                    <div><span className="text-white/40">Account:</span> <span className="text-white ml-2">{viewingEmployee.bank_account_number || "-"}</span></div>
                    <div><span className="text-white/40">Sort Code:</span> <span className="text-white ml-2">{viewingEmployee.bank_sort_code || "-"}</span></div>
                    <div><span className="text-white/40">NI Number:</span> <span className="text-white ml-2">{viewingEmployee.national_insurance || "-"}</span></div>
                    <div><span className="text-white/40">Tax ID:</span> <span className="text-white ml-2">{viewingEmployee.tax_id || "-"}</span></div>
                  </div>
                </div>

                {viewingEmployee.permissions && Object.keys(viewingEmployee.permissions).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Platform Access</h3>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORM_PERMISSIONS.map(p => {
                        const granted = viewingEmployee.permissions?.[p.key];
                        return (
                          <Badge key={p.key} className={`text-xs ${granted ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-white/5 text-white/20 border-white/5"}`}>
                            {granted ? "✓" : "✗"} {p.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {viewingEmployee.folder_path && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Employee Folder</h3>
                    <p className="text-sm text-white/60">/{viewingEmployee.folder_path}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Documents</h3>
                  <div className="space-y-2">
                    {viewingEmployee.cv_url && (
                      <a href={viewingEmployee.cv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                        <FileText className="w-4 h-4" /> CV: {viewingEmployee.cv_filename || "Download"}
                      </a>
                    )}
                    {viewingEmployee.id_document_url && (
                      <a href={viewingEmployee.id_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                        <Shield className="w-4 h-4" /> ID Document
                      </a>
                    )}
                    {viewingEmployee.additional_documents && viewingEmployee.additional_documents.map((doc: any, i: number) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                        <FileText className="w-4 h-4" /> {doc.name}
                      </a>
                    ))}
                    {!viewingEmployee.cv_url && !viewingEmployee.id_document_url && (!viewingEmployee.additional_documents || viewingEmployee.additional_documents.length === 0) && (
                      <p className="text-white/40 text-sm">No documents uploaded</p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                      <Star className="w-4 h-4 text-purple-400" /> Performance Reviews ({(viewingEmployee.reviews || []).length})
                    </h3>
                    <div className="flex gap-2">
                      {(viewingEmployee.reviews || []).length > 0 && (
                        <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => handlePrintReviews(viewingEmployee)}>
                          <Printer className="w-3 h-3 mr-1" /> Print
                        </Button>
                      )}
                      <Button size="sm" className="bg-purple-600/30 text-purple-300 hover:bg-purple-600/50" onClick={() => { setReviewEmployee(viewingEmployee); setShowReviewForm(true); resetReviewForm(); }}>
                        <Plus className="w-3 h-3 mr-1" /> Add Review
                      </Button>
                    </div>
                  </div>
                  {(viewingEmployee.reviews || []).length === 0 ? (
                    <p className="text-white/40 text-sm">No performance reviews yet</p>
                  ) : (
                    <div className="space-y-3">
                      {(viewingEmployee.reviews || []).slice().reverse().map((review: ReviewEntry) => (
                        <Card key={review.id} className="bg-[#2a020d]/80 border-purple-500/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">{review.period}</Badge>
                                <span className="text-white/40 text-xs">{review.date ? format(new Date(review.date), "dd MMM yyyy") : ""}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < review.rating ? "text-amber-400 fill-amber-400" : "text-white/20"}`} />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`text-[10px] ${
                                review.performance === "outstanding" || review.performance === "exceeds_expectations" ? "bg-emerald-500/20 text-emerald-300" :
                                review.performance === "meets_expectations" ? "bg-blue-500/20 text-blue-300" :
                                "bg-amber-500/20 text-amber-300"
                              }`}>{performanceLabels[review.performance] || review.performance}</Badge>
                            </div>
                            {review.strengths && <p className="text-white/60 text-xs mb-1"><span className="text-white/40">Strengths:</span> {review.strengths}</p>}
                            {review.improvements && <p className="text-white/60 text-xs mb-1"><span className="text-white/40">Areas for improvement:</span> {review.improvements}</p>}
                            {review.goals && <p className="text-white/60 text-xs mb-1"><span className="text-white/40">Goals:</span> {review.goals}</p>}
                            {review.comments && <p className="text-white/60 text-xs"><span className="text-white/40">Comments:</span> {review.comments}</p>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {viewingEmployee.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-3">Notes</h3>
                    <p className="text-white/70 text-sm">{viewingEmployee.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewForm} onOpenChange={(open) => { if (!open) { setShowReviewForm(false); resetReviewForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-[#1a0209] border-[#4a0a1e] text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-400" />
              Performance Review {reviewEmployee ? `\u2014 ${reviewEmployee.first_name} ${reviewEmployee.last_name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-white/70">Review Period *</Label><Input value={reviewPeriod} onChange={(e) => setReviewPeriod(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="e.g. Q1 2026, Jan-Mar 2026, Annual 2025" /></div>
            <div>
              <Label className="text-white/70">Rating</Label>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button key={r} onClick={() => setReviewRating(r)} className="p-1">
                    <Star className={`w-6 h-6 transition-colors ${r <= reviewRating ? "text-amber-400 fill-amber-400" : "text-white/20"}`} />
                  </button>
                ))}
                <span className="text-white/60 text-sm ml-2">{reviewRating}/5</span>
              </div>
            </div>
            <div>
              <Label className="text-white/70">Performance Level</Label>
              <Select value={reviewPerformance} onValueChange={setReviewPerformance}>
                <SelectTrigger className="bg-[#2a020d] border-[#4a0a1e] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outstanding">Outstanding</SelectItem>
                  <SelectItem value="exceeds_expectations">Exceeds Expectations</SelectItem>
                  <SelectItem value="meets_expectations">Meets Expectations</SelectItem>
                  <SelectItem value="needs_improvement">Needs Improvement</SelectItem>
                  <SelectItem value="unsatisfactory">Unsatisfactory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-white/70">Key Strengths</Label><Textarea value={reviewStrengths} onChange={(e) => setReviewStrengths(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="What does this employee excel at?" rows={2} /></div>
            <div><Label className="text-white/70">Areas for Improvement</Label><Textarea value={reviewImprovements} onChange={(e) => setReviewImprovements(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Where can they improve?" rows={2} /></div>
            <div><Label className="text-white/70">Goals for Next Period</Label><Textarea value={reviewGoals} onChange={(e) => setReviewGoals(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Set goals for the next review period" rows={2} /></div>
            <div><Label className="text-white/70">Additional Comments</Label><Textarea value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} className="bg-[#2a020d] border-[#4a0a1e] text-white" placeholder="Any other comments..." rows={2} /></div>
            <div className="flex justify-end pt-2 border-t border-white/10">
              <Button className="bg-purple-600 text-white hover:bg-purple-700" onClick={handleSubmitReview} disabled={addReviewMutation.isPending}>
                {addReviewMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentialsDialog?.open} onOpenChange={() => setCredentialsDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#330311]">
              <Shield className="w-5 h-5" /> Staff Login Created
            </DialogTitle>
          </DialogHeader>
          {credentialsDialog && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                A platform login has been created for <strong>{credentialsDialog.name}</strong> and a welcome email with these credentials has been sent.
              </p>
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Login Email</p>
                  <p className="text-lg font-bold text-[#330311]">{credentialsDialog.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Password</p>
                  <p className="text-lg font-bold text-[#330311]">{credentialsDialog.password}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {credentialsDialog.emailSent
                  ? "These credentials have been sent to the employee's personal email. They should change their password after first login."
                  : "The welcome email could not be sent. Please share these credentials with the employee directly. They should change their password after first login."}
              </p>
              <Button className="w-full bg-[#330311] text-white" onClick={() => setCredentialsDialog(null)}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </PlannerLayout>
  );
}
