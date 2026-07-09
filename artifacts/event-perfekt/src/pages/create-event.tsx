import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Calendar, MapPin, Users, DollarSign, Palette, ClipboardList, Globe, Building2, Heart, Sparkles, CheckCircle, Upload, Image, X, PartyPopper, Cake, Ticket, Clock, Phone, UserCheck, Clipboard, Shield, UserPlus, FileUp, Trash2, Landmark, BookOpen, Home, Globe2 } from "lucide-react";
import eventPerfektLogo from "@assets/3d_Logo_1772145137902.jpg";
import FormHelperBot from "@/components/FormHelperBot";

const weddingSubCategories = [
  "Traditional Wedding", "Destination Wedding", "Civil Ceremony", "Religious Ceremony",
  "Engagement Party", "Bridal Shower", "Hen/Stag Party", "Rehearsal Dinner",
  "Reception Only", "Vow Renewal", "Mehndi/Henna Night", "Other"
];

const corporateSubCategories = [
  "Conference", "Seminar", "Product Launch", "Awards Ceremony", "Team Building",
  "Gala Dinner", "Exhibition", "Corporate Retreat", "Board Meeting",
  "Networking Event", "Christmas Party", "Company Anniversary", "Charity Fundraiser",
  "Press Conference", "Trade Show", "Workshop", "Webinar/Hybrid Event", "Other"
];

const celebrationSubCategories = [
  "Birthday", "Anniversary", "Baby Shower", "Graduation", "Retirement",
  "Funeral/Memorial", "Family Reunion", "Proposal Planning", "Christening/Baptism",
  "Bar/Bat Mitzvah", "Quinceañera", "Housewarming", "Farewell Party",
  "Holiday Party", "Cultural Celebration", "Other"
];

const childrensPartySubCategories = [
  "Birthday Party", "Themed Party", "Pool Party", "Garden Party",
  "Sleepover Party", "Arts & Crafts Party", "Sports Party", "Princess/Superhero Party",
  "Carnival/Fun Fair", "Movie Night", "Treasure Hunt", "School Event",
  "Christening/Naming", "First Communion", "Other"
];

const ticketingSubCategories = [
  "Concert", "Music Festival", "Exhibition", "Art Show", "Theatre / Stage Show",
  "Comedy Night", "Film Screening", "Food & Drink Festival", "Fashion Show",
  "Sporting Event", "Charity Gala", "Award Show", "Open Day",
  "Workshop / Masterclass", "Dance Show", "Cultural Festival",
  "Carnival / Street Festival", "Launch Party", "Pop-Up Event", "Other"
];

const dayCoordinationSubCategories = [
  "Wedding", "Corporate Event", "Birthday / Celebration", "Gala Dinner",
  "Conference / Seminar", "Awards Ceremony", "Product Launch", "Baby Shower",
  "Engagement Party", "Anniversary", "Funeral / Memorial", "Charity Event",
  "Cultural Event", "Christmas / Holiday Party", "Children's Party", "Other"
];

const governmentPublicSubCategories = [
  "Government Summit", "Public Consultation", "Civic Ceremony", "Ministerial Event",
  "Parliamentary Event", "Public Sector Awards", "Policy Conference", "Community Town Hall",
  "Municipal Event", "State Dinner", "Diplomatic Reception", "Public Health Campaign",
  "Infrastructure Launch", "National Day Celebration", "Other"
];

const charityCommunitySubCategories = [
  "Charity Gala", "Fundraising Event", "Awareness Campaign", "Community Festival",
  "Volunteer Recognition", "Charity Auction", "Community Concert", "Cultural Fair",
  "Community Sports Day", "Food Bank Drive", "Charity Ball", "Non-Profit Launch",
  "Community Awards", "Outreach Event", "Other"
];

const educationSubCategories = [
  "School Prom / Formal", "Graduation Ceremony", "Open Day / Induction",
  "Academic Conference", "Student Awards Night", "Staff Development Day",
  "Academic Lecture / Symposium", "University Ball", "Parent-Teacher Event",
  "School Sports Day", "Science Fair", "Inter-School Competition",
  "Alumni Reunion", "Student Union Event", "Other"
];

const privateSocialSubCategories = [
  "Dinner Party", "House Party", "Garden Party", "Family Gathering",
  "Milestone Birthday", "Anniversary Celebration", "Reunion", "Cocktail Party",
  "Private Retreat", "Gender Reveal", "Engagement Party", "Welcome Baby Party",
  "Farewell / Going Away Party", "Networking Soirée", "Other"
];

const internationalCrossBorderSubCategories = [
  "Destination Wedding", "International Conference", "Global Summit",
  "Multi-Country Cultural Tour", "Diaspora Homecoming Event",
  "International Awards Ceremony", "Global Product Launch",
  "Cross-Border Trade Show", "International Gala Dinner",
  "Diplomatic or Cultural Exchange", "Global Team Retreat",
  "International Sports Event", "Other"
];

const isoStandards = ["ISO 9001 (Quality)", "ISO 27001 (Security)", "ISO 45001 (Health & Safety)", "ISO 14001 (Environment)"];

const dayCoordinationServices = [
  { key: "dcVendorManagement", label: "Vendor Management", desc: "Coordinate all vendors on the day — arrivals, setup, breakdown" },
  { key: "dcGuestManagement", label: "Guest Management", desc: "Welcome guests, manage seating, handle enquiries" },
  { key: "dcUsherManagement", label: "Usher Coordination", desc: "Direct and manage ushers for guest flow" },
  { key: "dcFoodFlow", label: "Food & Beverage Flow", desc: "Manage catering timing, food service, and bar operations" },
  { key: "dcTimeline", label: "Timeline & Run Sheet", desc: "Keep the event running on schedule" },
  { key: "dcSetupBreakdown", label: "Setup & Breakdown", desc: "Oversee venue setup and end-of-event breakdown" },
  { key: "dcClientLiaison", label: "Client & VIP Liaison", desc: "Ensure the client and VIP guests are well looked after" },
  { key: "dcEmergencyMgmt", label: "Emergency Management", desc: "Handle any issues or emergencies on the day" },
];

const currencies = [
  { code: "GBP", symbol: "£", label: "British Pound (GBP)" },
  { code: "USD", symbol: "$", label: "US Dollar (USD)" },
  { code: "EUR", symbol: "€", label: "Euro (EUR)" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira (NGN)" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar (CAD)" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar (AUD)" },
  { code: "ZAR", symbol: "R", label: "South African Rand (ZAR)" },
  { code: "GHS", symbol: "GH₵", label: "Ghanaian Cedi (GHS)" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling (KES)" },
  { code: "INR", symbol: "₹", label: "Indian Rupee (INR)" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham (AED)" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar (SGD)" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen (JPY)" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc (CHF)" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona (SEK)" },
  { code: "NZD", symbol: "NZ$", label: "New Zealand Dollar (NZD)" },
];

// Currency auto-selection based on country
const currencyByCountry: Record<string, string> = {
  "United Kingdom": "GBP",
  "United States": "USD",
  "Canada": "CAD",
  "Australia": "AUD",
  "Nigeria": "NGN",
  "Ghana": "GHS",
  "South Africa": "ZAR",
  "Kenya": "KES",
  "India": "INR",
  "United Arab Emirates": "AED",
  "Singapore": "SGD",
  "Germany": "EUR",
  "France": "EUR",
  "Italy": "EUR",
  "Spain": "EUR",
  "Ireland": "EUR",
  "Netherlands": "EUR",
  "Belgium": "EUR",
  "Austria": "EUR",
  "Portugal": "EUR",
  "Greece": "EUR",
  "Poland": "EUR",
  "Czech Republic": "EUR",
  "Japan": "JPY",
  "Switzerland": "CHF",
  "Sweden": "SEK",
  "Brazil": "USD",
  "Mexico": "USD",
  "Argentina": "USD",
  "New Zealand": "NZD",
};

const countries = [
  "United Kingdom", "United States", "Nigeria", "Canada", "Australia",
  "South Africa", "Ghana", "Kenya", "India", "United Arab Emirates",
  "Singapore", "Germany", "France", "Italy", "Spain", "Netherlands",
  "Sweden", "Switzerland", "Ireland", "New Zealand", "Japan",
  "Brazil", "Mexico", "Argentina", "Colombia", "Jamaica",
  "Trinidad and Tobago", "Barbados", "Saudi Arabia", "Qatar", "Bahrain",
  "Egypt", "Morocco", "Tanzania", "Uganda", "Rwanda", "Ethiopia",
  "Cameroon", "Senegal", "Ivory Coast", "Zimbabwe", "Botswana",
  "Namibia", "Mozambique", "Mauritius", "Seychelles",
  "Thailand", "Malaysia", "Philippines", "Indonesia", "Vietnam",
  "China", "South Korea", "Hong Kong", "Taiwan",
  "Poland", "Czech Republic", "Portugal", "Greece", "Turkey",
  "Austria", "Belgium", "Denmark", "Finland", "Norway",
  "Croatia", "Hungary", "Romania", "Bulgaria",
  "Israel", "Lebanon", "Jordan", "Kuwait", "Oman",
  "Pakistan", "Bangladesh", "Sri Lanka", "Nepal",
  "Peru", "Chile", "Ecuador", "Venezuela", "Panama", "Costa Rica",
  "Dominican Republic", "Puerto Rico", "Bermuda", "Bahamas",
  "Fiji", "Papua New Guinea", "Other"
];

const citiesByCountry: Record<string, string[]> = {
  "Nigeria": [
    "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Kaduna", "Enugu", "Benin City",
    "Calabar", "Warri", "Owerri", "Uyo", "Abeokuta", "Ilorin", "Jos", "Asaba",
    "Akure", "Ado-Ekiti", "Osogbo", "Lokoja", "Minna", "Bauchi", "Yola", "Makurdi",
    "Lafia", "Abakaliki", "Umuahia", "Awka", "Onitsha", "Nnewi", "Aba", "Ikeja",
    "Victoria Island", "Lekki", "Ikoyi", "Ajah", "Epe", "Badagry", "Ijebu-Ode",
    "Sagamu", "Ile-Ife", "Ilesa", "Ede", "Ogbomoso", "Oyo", "Saki",
  ],
  "United Kingdom": [
    "London", "Manchester", "Birmingham", "Leeds", "Liverpool", "Bristol",
    "Edinburgh", "Glasgow", "Cardiff", "Belfast", "Newcastle", "Sheffield",
    "Nottingham", "Leicester", "Cambridge", "Oxford", "Brighton", "Southampton",
    "Milton Keynes", "Reading", "Coventry", "Bath", "York", "Canterbury",
    "Exeter", "Norwich", "Plymouth", "Derby", "Wolverhampton", "Aberdeen",
    "Dundee", "Swansea", "Newport", "Luton", "Bedford", "Northampton",
  ],
  "United States": [
    "New York", "Los Angeles", "Chicago", "Houston", "Miami", "Atlanta",
    "Dallas", "San Francisco", "Washington DC", "Boston", "Philadelphia",
    "Phoenix", "San Diego", "Denver", "Seattle", "Las Vegas", "Orlando",
    "Nashville", "Charlotte", "Austin", "San Antonio", "Portland",
  ],
  "Ghana": [
    "Accra", "Kumasi", "Tamale", "Takoradi", "Cape Coast", "Tema",
    "Ho", "Koforidua", "Sunyani", "Bolgatanga", "Wa",
  ],
  "South Africa": [
    "Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth",
    "Bloemfontein", "East London", "Nelspruit", "Polokwane", "Kimberley",
    "Pietermaritzburg", "Stellenbosch", "Sandton", "Soweto",
  ],
  "Kenya": [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Malindi",
    "Nanyuki", "Thika", "Nyeri", "Machakos", "Lamu",
  ],
  "Canada": [
    "Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton",
    "Winnipeg", "Quebec City", "Halifax", "Victoria", "Hamilton",
  ],
  "Australia": [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast",
    "Canberra", "Hobart", "Darwin", "Newcastle",
  ],
  "United Arab Emirates": [
    "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah",
  ],
  "India": [
    "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad",
    "Pune", "Jaipur", "Ahmedabad", "Goa", "Lucknow", "Kochi",
  ],
  "Germany": [
    "Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne", "Düsseldorf",
    "Stuttgart", "Dresden", "Leipzig", "Hanover",
  ],
  "France": [
    "Paris", "Nice", "Lyon", "Marseille", "Bordeaux", "Toulouse",
    "Strasbourg", "Lille", "Cannes", "Montpellier",
  ],
  "Italy": [
    "Rome", "Milan", "Florence", "Venice", "Naples", "Turin",
    "Bologna", "Amalfi", "Verona", "Palermo",
  ],
  "Spain": [
    "Madrid", "Barcelona", "Seville", "Valencia", "Malaga", "Ibiza",
    "Marbella", "Bilbao", "Granada", "Palma de Mallorca",
  ],
  "Jamaica": [
    "Kingston", "Montego Bay", "Ocho Rios", "Negril", "Port Antonio",
  ],
  "Trinidad and Tobago": [
    "Port of Spain", "San Fernando", "Chaguanas", "Arima", "Tobago",
  ],
  "Egypt": [
    "Cairo", "Alexandria", "Sharm El Sheikh", "Hurghada", "Luxor", "Aswan",
  ],
  "Morocco": [
    "Marrakech", "Casablanca", "Rabat", "Fez", "Tangier", "Agadir",
  ],
  "Singapore": ["Singapore"],
  "Ireland": [
    "Dublin", "Cork", "Galway", "Limerick", "Killarney", "Waterford",
  ],
  "Saudi Arabia": [
    "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Al Khobar",
  ],
  "Qatar": ["Doha", "Al Wakrah", "Al Khor", "Lusail"],
  "Tanzania": [
    "Dar es Salaam", "Zanzibar", "Arusha", "Dodoma", "Mwanza",
  ],
  "Uganda": [
    "Kampala", "Entebbe", "Jinja", "Mbarara", "Gulu",
  ],
  "Rwanda": ["Kigali", "Butare", "Gisenyi", "Musanze"],
  "Cameroon": [
    "Douala", "Yaoundé", "Bamenda", "Buea", "Limbe", "Kribi",
  ],
  "Senegal": ["Dakar", "Saint-Louis", "Thiès", "Ziguinchor"],
  "Ethiopia": ["Addis Ababa", "Dire Dawa", "Bahir Dar", "Hawassa"],
};

const services = [
  { key: "needsEndToEndPlanning", label: "End-to-End Planning", desc: "Full event planning from concept to completion" },
  { key: "needsDayCoordination", label: "Day-of Coordination", desc: "Professional coordination on the event day" },
  { key: "needsVenueSearch", label: "Venue Sourcing", desc: "Finding and securing the perfect venue" },
  { key: "needsVenueDecoration", label: "Venue Decoration & Styling", desc: "Complete décor and styling services" },
  { key: "needsCatering", label: "Catering Management", desc: "Food and beverage coordination" },
  { key: "needsVendorCoordination", label: "Vendor Coordination", desc: "Managing all vendor relationships" },
  { key: "needsBrandedStyling", label: "Branded Styling", desc: "Corporate branding and visual identity" },
  { key: "needsHumanResources", label: "Staffing & HR", desc: "Event staff, ushers, and support team" },
  { key: "needsPartyPacks", label: "Party Packs & Favours", desc: "Guest gifts and party packages" },
  { key: "needsCorporateGifting", label: "Corporate Gifting", desc: "Business gifts and branded items" },
  { key: "needsConceptDelivery", label: "Concept & Design", desc: "Creative concept development and delivery" },
  { key: "needsBranding", label: "Event Branding", desc: "Logos, signage, and branded materials" },
];

const decorStyles = [
  "Elegant & Classic", "Modern & Minimalist", "Rustic & Natural", "Vintage & Retro",
  "Bohemian", "Glamorous & Luxe", "Tropical", "Garden & Botanical",
  "Industrial Chic", "Art Deco", "Romantic & Soft", "Bold & Vibrant",
  "Scandinavian", "Mediterranean", "African Inspired", "Asian Fusion",
  "Coastal & Nautical", "Winter Wonderland", "Fairy Tale", "Contemporary"
];

const guestAgeGroups = [
  { key: "hasAdults", label: "Adults (18+)" },
  { key: "hasTeenagers", label: "Teenagers (13-17)" },
  { key: "hasPreteens", label: "Pre-teens (8-12)" },
  { key: "hasChildren", label: "Children (0-7)" },
];

export default function CreateEvent() {
  usePageMeta({ title: "Create Event — Event Perfekt" });

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedType = urlParams.get("type");
  const [eventType, setEventType] = useState<"corporate" | "government_public" | "charity_community" | "education" | "private_social" | "international_cross_border" | "wedding" | "celebration" | "childrens_party" | "ticketing" | "day_coordination" | "">(
    preselectedType === "day_coordination" ? "day_coordination" :
    preselectedType === "corporate" ? "corporate" :
    preselectedType === "wedding" ? "wedding" :
    preselectedType === "government_public" ? "government_public" :
    preselectedType === "charity_community" ? "charity_community" :
    preselectedType === "education" ? "education" :
    preselectedType === "private_social" ? "private_social" :
    preselectedType === "international_cross_border" ? "international_cross_border" :
    ""
  );
  const [step, setStep] = useState(preselectedType ? 1 : 1);
  const [mainCategory, setMainCategory] = useState<"" | "corporate" | "private">("");
  const [customCity, setCustomCity] = useState(false);
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string>("");
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>("");

  const [wizardGuests, setWizardGuests] = useState<Array<{ firstName: string; lastName: string; email: string; phone: string; group?: string; dietaryRequirements?: string; tableAssignment?: string }>>([]);
  const [wizardGuestForm, setWizardGuestForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [wizardCsvText, setWizardCsvText] = useState("");
  const [showCsvImport, setShowCsvImport] = useState(false);

  const [daySchedule, setDaySchedule] = useState<Array<{ date: string; startTime: string; endTime: string; description: string }>>([]);

  const [weddingEvents, setWeddingEvents] = useState<Array<{
    type: string;
    enabled: boolean;
    date: string;
    venue: string;
    city: string;
    guestCount: string;
    description: string;
    hasChurch: boolean;
    churchName: string;
    churchLocation: string;
  }>>([
    { type: "Traditional", enabled: false, date: "", venue: "", city: "", guestCount: "", description: "", hasChurch: false, churchName: "", churchLocation: "" },
    { type: "Church Wedding", enabled: false, date: "", venue: "", city: "", guestCount: "", description: "", hasChurch: false, churchName: "", churchLocation: "" },
    { type: "Reception", enabled: false, date: "", venue: "", city: "", guestCount: "", description: "", hasChurch: false, churchName: "", churchLocation: "" },
    { type: "After Party", enabled: false, date: "", venue: "", city: "", guestCount: "", description: "", hasChurch: false, churchName: "", churchLocation: "" },
  ]);

  const updateWeddingEvent = (index: number, field: string, value: string | boolean) => {
    setWeddingEvents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const [form, setForm] = useState({
    name: "",
    description: "",
    eventCategory: "",
    customEventType: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    eventDays: "1",
    country: "",
    city: "",
    currency: "",
    guestCount: "",
    budget: "",
    budgetRange: "",
    ceremonyVenue: "",
    ceremonyDate: "",
    receptionVenue: "",
    receptionDate: "",
    afterPartyVenue: "",
    afterPartyDate: "",
    hasVenue: false,
    celebrantAge: "",
    remembranceDetails: "",
    hasAdults: false,
    hasTeenagers: false,
    hasPreteens: false,
    hasChildren: false,
    needsEndToEndPlanning: false,
    needsDayCoordination: false,
    needsVenueDecoration: false,
    needsVenueSearch: false,
    needsBrandedStyling: false,
    needsHumanResources: false,
    needsPartyPacks: false,
    needsCorporateGifting: false,
    needsConceptDelivery: false,
    needsBranding: false,
    needsCatering: false,
    needsVendorCoordination: false,
    needsOtherServices: false,
    otherServicesDetails: "",
    twinPaayEnabled: false,
    publicSectorBody: "",
    charityRegistration: "",
    schoolOrInstitution: "",
    privateOccasionType: "",
    crossBorderCountries: "",
    internationalTravelRequired: false,
    internationalVisaSupport: false,
    culturalNeeds: "",
    decorStyle: "",
    colorTheme: "",
    moodDescription: "",
    inspirationSources: "",
    brandColors: "",
    brandingRequirements: "",
    specialDecorRequests: "",
    rsvpEnabled: true,
    eventWebsiteEnabled: true,
    venueType: "",
    expectedCapacity: "",
    isTicketed: false,
    ticketTypes: "",
    performersArtists: "",
    ageRestriction: "",
    dcVendorManagement: false,
    dcGuestManagement: false,
    dcUsherManagement: false,
    dcFoodFlow: false,
    dcTimeline: false,
    dcSetupBreakdown: false,
    dcClientLiaison: false,
    dcEmergencyMgmt: false,
    existingVendors: "",
    existingTimeline: "",
    coordinationScope: "",
    setupTime: "",
    clientContactOnDay: "",
    clientContactPhone: "",
    emergencyContact: "",
    emergencyContactPhone: "",
    numberOfCoordinators: "1",
    clientPlannerName: "",
    venueContactName: "",
    venueContactPhone: "",
    cateringVendor: "",
    decorVendor: "",
    entertainmentVendor: "",
    photographyVendor: "",
    otherVendorsList: "",
    dayOfNotes: "",
  });

  const update = (field: string, value: string | boolean) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-set currency when country changes
      if (field === "country" && typeof value === "string") {
        updated.currency = currencyByCountry[value] || "";
      }
      return updated;
    });
  };

  const categories = eventType === "wedding" ? weddingSubCategories :
    eventType === "corporate" ? corporateSubCategories :
    eventType === "celebration" ? celebrationSubCategories :
    eventType === "childrens_party" ? childrensPartySubCategories :
    eventType === "ticketing" ? ticketingSubCategories :
    eventType === "day_coordination" ? dayCoordinationSubCategories :
    eventType === "government_public" ? governmentPublicSubCategories :
    eventType === "charity_community" ? charityCommunitySubCategories :
    eventType === "education" ? educationSubCategories :
    eventType === "private_social" ? privateSocialSubCategories :
    eventType === "international_cross_border" ? internationalCrossBorderSubCategories : [];
  const isWedding = eventType === "wedding";
  const isFuneral = form.eventCategory === "funeral/memorial";
  const isCorporate = eventType === "corporate";
  const isGovernmentPublic = eventType === "government_public";
  const isCharityCommunity = eventType === "charity_community";
  const isEducation = eventType === "education";
  const isPrivateSocial = eventType === "private_social";
  const isInternational = eventType === "international_cross_border";
  const isChildrensParty = eventType === "childrens_party";
  const isTicketing = eventType === "ticketing";
  const isDayCoordination = eventType === "day_coordination";

  const totalSteps = 6;

  const stepTitles = isDayCoordination ? [
    "Event Details",
    "Location & Venues",
    "Vendors & Contacts",
    "Coordination Scope",
    "Guests",
    "Review & Create",
  ] : [
    "Event Details",
    "Location & Venues",
    "Guests & Budget",
    isCorporate || isGovernmentPublic || isCharityCommunity || isEducation || isInternational ? "Services & Requirements" : "Services & Style",
    "Guests",
    "Review & Create",
  ];

  const isDateInFuture = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr) >= today;
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        if (isWedding) {
          const hasEnabledEvent = weddingEvents.some(e => e.enabled);
          const hasValidDate = weddingEvents.some(e => e.enabled && e.date && isDateInFuture(e.date));
          return form.name && form.eventCategory && hasEnabledEvent && hasValidDate;
        }
        if (isGovernmentPublic) return form.name && form.eventCategory && form.startDate && isDateInFuture(form.startDate) && form.publicSectorBody;
        if (isCharityCommunity) return form.name && form.eventCategory && form.startDate && isDateInFuture(form.startDate) && form.charityRegistration;
        if (isEducation) return form.name && form.eventCategory && form.startDate && isDateInFuture(form.startDate) && form.schoolOrInstitution;
        if (isPrivateSocial) return form.name && form.eventCategory && form.startDate && isDateInFuture(form.startDate) && form.privateOccasionType;
        if (isInternational) return form.name && form.eventCategory && form.startDate && isDateInFuture(form.startDate) && form.crossBorderCountries && form.twinPaayEnabled;
        return form.name && form.eventCategory && form.startDate && isDateInFuture(form.startDate);
      case 2:
        return form.country && form.city;
      case 3:
        if (isDayCoordination) return form.clientContactOnDay;
        return form.guestCount;
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  }, [step, form, isWedding, isDayCoordination, isGovernmentPublic, isCharityCommunity, isEducation, isPrivateSocial, isInternational, weddingEvents]);

  const handleSubmit = async () => {
    if (!eventType) return;
    setIsSubmitting(true);

    try {
      const errors: string[] = [];
      if (!form.name.trim()) errors.push("Event name is required");
      if (!eventType) errors.push("Event type is required");
      if (!form.eventCategory) errors.push("Event category is required");
      if (!isWedding && !form.startDate) errors.push("Event date is required");
      if (!isWedding && form.startDate && !isDateInFuture(form.startDate)) errors.push("Event date must be in the future");
      if (!form.country) errors.push("Country is required");
      if (!form.city) errors.push("City is required");
      if (isInternational && !form.twinPaayEnabled) errors.push("TwinPaay must be enabled for international events");
      if (isGovernmentPublic && !form.publicSectorBody.trim()) errors.push("Public sector body is required");
      if (isCharityCommunity && !form.charityRegistration.trim()) errors.push("Charity registration or community body is required");
      if (isEducation && !form.schoolOrInstitution.trim()) errors.push("School or institution is required");
      if (isPrivateSocial && !form.privateOccasionType.trim()) errors.push("Private/social occasion type is required");
      if (isInternational && !form.crossBorderCountries.trim()) errors.push("At least one destination country is required");
      if (errors.length) {
        toast({ title: "Please complete the form", description: errors[0], variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("type", eventType);
      formData.append("eventCategory", form.eventCategory);

      if (isWedding) {
        const enabledEvents = weddingEvents.filter(e => e.enabled);
        formData.append("weddingEvents", JSON.stringify(enabledEvents));
        const sortedDates = enabledEvents.map(e => e.date).filter(Boolean).sort();
        formData.append("startDate", sortedDates[0] || "");
        formData.append("endDate", sortedDates[sortedDates.length - 1] || sortedDates[0] || "");
        formData.append("eventDays", String(enabledEvents.length));
      } else {
        formData.append("startDate", form.startDate);
        formData.append("endDate", form.endDate || form.startDate);
        formData.append("eventDays", form.eventDays || "1");
      }
      formData.append("workflowStatus", "new_intake");
      formData.append("country", form.country);
      formData.append("city", form.city);
      formData.append("currency", form.currency);
      formData.append("guestCount", form.guestCount || "0");
      formData.append("budget", form.budget || "0");
      formData.append("budgetRange", form.budgetRange);
      formData.append("ceremonyVenue", form.ceremonyVenue);
      formData.append("receptionVenue", form.receptionVenue);
      formData.append("afterPartyVenue", form.afterPartyVenue);
      if (form.customEventType) formData.append("customEventType", form.customEventType);
      if (form.celebrantAge) formData.append("celebrantAge", form.celebrantAge);
      if (form.remembranceDetails) formData.append("remembranceDetails", form.remembranceDetails);
      formData.append("hasAdults", String(form.hasAdults));
      formData.append("hasTeenagers", String(form.hasTeenagers));
      formData.append("hasPreteens", String(form.hasPreteens));
      formData.append("hasChildren", String(form.hasChildren));
      formData.append("hasVenue", String(form.hasVenue));
      formData.append("needsEndToEndPlanning", String(form.needsEndToEndPlanning));
      formData.append("needsDayCoordination", String(form.needsDayCoordination));
      formData.append("needsVenueDecoration", String(form.needsVenueDecoration));
      formData.append("needsVenueSearch", String(form.needsVenueSearch));
      formData.append("needsBrandedStyling", String(form.needsBrandedStyling));
      formData.append("needsHumanResources", String(form.needsHumanResources));
      formData.append("needsPartyPacks", String(form.needsPartyPacks));
      formData.append("needsCorporateGifting", String(form.needsCorporateGifting));
      formData.append("needsConceptDelivery", String(form.needsConceptDelivery));
      formData.append("needsBranding", String(form.needsBranding));
      formData.append("needsCatering", String(form.needsCatering));
      formData.append("needsVendorCoordination", String(form.needsVendorCoordination));
      formData.append("needsOtherServices", String(form.needsOtherServices));
      formData.append("twinPaayEnabled", String(form.twinPaayEnabled));
      if (form.publicSectorBody) formData.append("publicSectorBody", form.publicSectorBody);
      if (form.charityRegistration) formData.append("charityRegistration", form.charityRegistration);
      if (form.schoolOrInstitution) formData.append("schoolOrInstitution", form.schoolOrInstitution);
      if (form.privateOccasionType) formData.append("privateOccasionType", form.privateOccasionType);
      if (form.crossBorderCountries) formData.append("crossBorderCountries", form.crossBorderCountries);
      formData.append("internationalTravelRequired", String(form.internationalTravelRequired));
      formData.append("internationalVisaSupport", String(form.internationalVisaSupport));
      if (form.otherServicesDetails) formData.append("otherServicesDetails", form.otherServicesDetails);
      if (form.culturalNeeds) formData.append("culturalNeeds", form.culturalNeeds);
      if (form.decorStyle) formData.append("decorStyle", form.decorStyle);
      if (form.colorTheme) formData.append("colorTheme", form.colorTheme);
      if (form.moodDescription) formData.append("moodDescription", form.moodDescription);
      if (form.inspirationSources) formData.append("inspirationSources", form.inspirationSources);
      if (form.brandingRequirements) formData.append("brandingRequirements", form.brandingRequirements);
      if (form.specialDecorRequests) formData.append("specialDecorRequests", form.specialDecorRequests);
      if (isTicketing) {
        if (form.venueType) formData.append("venueType", form.venueType);
        if (form.expectedCapacity) formData.append("expectedCapacity", form.expectedCapacity);
        if (form.performersArtists) formData.append("performersArtists", form.performersArtists);
        if (form.ageRestriction) formData.append("ageRestriction", form.ageRestriction);
        if (form.ticketTypes) formData.append("ticketTypes", form.ticketTypes);
        formData.append("isTicketed", String(form.isTicketed));
      }
      if (form.startTime) formData.append("startTime", form.startTime);
      if (form.endTime) formData.append("endTime", form.endTime);
      if (daySchedule.length > 0) formData.append("daySchedule", JSON.stringify(daySchedule));
      formData.append("rsvpEnabled", String(form.rsvpEnabled));
      formData.append("eventWebsiteEnabled", String(form.eventWebsiteEnabled));
      
      if (isDayCoordination) {
        formData.append("planningMode", "day_coordination");
        formData.append("needsDayCoordination", "true");
        const vendorsList = [
          form.cateringVendor && `Catering: ${form.cateringVendor}`,
          form.decorVendor && `Décor: ${form.decorVendor}`,
          form.entertainmentVendor && `Entertainment: ${form.entertainmentVendor}`,
          form.photographyVendor && `Photography: ${form.photographyVendor}`,
          form.otherVendorsList && `Other: ${form.otherVendorsList}`,
        ].filter(Boolean).join("\n");
        if (vendorsList) formData.append("existingVendors", vendorsList);
        if (form.existingTimeline) formData.append("existingTimeline", form.existingTimeline);
        const selectedDcServices = dayCoordinationServices.filter(s => (form as any)[s.key]).map(s => s.label).join(", ");
        formData.append("coordinationScope", selectedDcServices || form.coordinationScope);
        if (form.setupTime) formData.append("setupTime", form.setupTime);
        if (form.clientContactOnDay) formData.append("clientContactOnDay", `${form.clientContactOnDay}${form.clientContactPhone ? ` (${form.clientContactPhone})` : ""}`);
        if (form.emergencyContact) formData.append("emergencyContact", `${form.emergencyContact}${form.emergencyContactPhone ? ` (${form.emergencyContactPhone})` : ""}`);
        if (form.clientPlannerName) formData.append("clientOwnPlanner", form.clientPlannerName);
        if (form.dayOfNotes) formData.append("description", `${form.description}\n\nDay-of Notes: ${form.dayOfNotes}`);
      } else {
        formData.append("planningMode", "full_planning");
      }
      if (companyLogoFile) formData.append("companyLogo", companyLogoFile);

      const token = localStorage.getItem("token");
      const res = await fetch("/api/events", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to create event");
      }

      const event = await res.json();
      let guestsSaved = true;

      if (event?.id && wizardGuests.length > 0) {
        try {
          const token = localStorage.getItem("token");
          const guestsPayload = wizardGuests.map(g => ({
            firstName: g.firstName || "Guest",
            lastName: g.lastName || "",
            email: g.email || "",
            phone: g.phone || "",
            group: g.group || "General",
            dietaryRequirements: g.dietaryRequirements || "None",
            tableAssignment: g.tableAssignment || "",
          }));
          const guestRes = await fetch(`/api/events/${event.id}/guests/bulk`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ guests: guestsPayload }),
          });
          if (!guestRes.ok) {
            console.error("Failed to save wizard guests:", await guestRes.text());
            guestsSaved = false;
          }
        } catch (guestErr) {
          console.error("Failed to save wizard guests:", guestErr);
          guestsSaved = false;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/events"] });

      if (wizardGuests.length > 0 && !guestsSaved) {
        toast({
          title: "Event Created",
          description: `${form.name} was created, but guests could not be saved. You can add them from the guest management page.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Event Created!",
          description: `${form.name} has been created successfully.${guestsSaved && wizardGuests.length > 0 ? ` ${wizardGuests.length} guest(s) added.` : ""}`,
        });
      }

      if (event?.id) {
        setLocation(`/event-dashboard/${event.id}`);
      } else {
        setLocation("/planner-dashboard");
      }
    } catch (err: any) {
      toast({
        title: "Error Creating Event",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = "bg-white border-gray-300 text-black";
  const labelStyle = "block text-sm font-medium text-white mb-1";
  const checkboxLabelStyle = "flex items-center gap-3 p-3 rounded-lg border border-[#4a0a1e] cursor-pointer transition-colors";

  const Checkbox = ({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) => (
    <label className={`${checkboxLabelStyle} ${checked ? "bg-[#4a0a1e] border-white/30" : "bg-[#2a020d]"}`}>
      <div
        onClick={(e) => { e.preventDefault(); onChange(!checked); }}
        className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center cursor-pointer ${checked ? "bg-white border-white" : "border-white/50 bg-transparent"}`}
      >
        {checked && <CheckCircle className="w-4 h-4 text-[#330311]" />}
      </div>
      <div className="flex-1">
        <span className="text-white text-sm font-medium">{label}</span>
        {desc && <p className="text-white/60 text-xs mt-0.5">{desc}</p>}
      </div>
    </label>
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === step;
        const isCompleted = stepNum < step;
        return (
          <div key={i} className="flex items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive ? "bg-white text-[#330311]" : isCompleted ? "bg-white/30 text-white" : "bg-[#4a0a1e] text-white/50"
                }`}
              >
                {isCompleted ? "✓" : stepNum}
              </div>
              <span className={`hidden sm:inline text-[10px] max-w-[70px] text-center leading-tight ${isActive ? "text-white" : "text-white/40"}`}>
                {stepTitles[i]}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div className={`w-4 sm:w-8 h-0.5 ${stepNum < step ? "bg-white/30" : "bg-[#4a0a1e]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <Card className="bg-[#2a020d] border-[#4a0a1e]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Event Details
        </CardTitle>
        <p className="text-white/60 text-sm">Tell us about the event you are planning</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <label className={labelStyle}>Event Name *</label>
          <Input
            value={form.name}
            onChange={e => update("name", e.target.value)}
            placeholder={isWedding ? "e.g. Sarah & James Wedding" : isCorporate ? "e.g. Annual Tech Summit 2026" : isTicketing ? "e.g. Summer Music Festival 2026" : isGovernmentPublic ? "e.g. National Health Summit 2026" : isCharityCommunity ? "e.g. Hope Foundation Annual Gala" : isEducation ? "e.g. Class of 2026 Graduation Ceremony" : isPrivateSocial ? "e.g. Sarah's 40th Birthday Dinner" : isInternational ? "e.g. Lagos-London Diaspora Conference 2026" : "e.g. Emma's 30th Birthday"}
            required
            className={inputStyle}
          />
        </div>

        <div>
          <label className={labelStyle}>Event Category *</label>
          <select
            value={form.eventCategory}
            onChange={e => update("eventCategory", e.target.value)}
            required
            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
          >
            <option value="">Select category...</option>
            {categories.map(cat => (
              <option key={cat} value={cat.toLowerCase().replace(/\s+/g, '-')}>{cat}</option>
            ))}
          </select>
        </div>

        {form.eventCategory === "other" && (
          <div>
            <label className={labelStyle}>Specify Event Type *</label>
            <Input
              value={form.customEventType}
              onChange={e => update("customEventType", e.target.value)}
              placeholder="Describe your event type"
              className={inputStyle}
            />
          </div>
        )}

        {(form.eventCategory === "birthday" || form.eventCategory === "graduation") && (
          <div>
            <label className={labelStyle}>Celebrant's Age</label>
            <Input
              value={form.celebrantAge}
              onChange={e => update("celebrantAge", e.target.value)}
              placeholder="e.g. 30, 50, 21"
              className={inputStyle}
            />
          </div>
        )}

        {isFuneral && (
          <div>
            <label className={labelStyle}>Remembrance Details</label>
            <Textarea
              value={form.remembranceDetails}
              onChange={e => update("remembranceDetails", e.target.value)}
              placeholder="Any specific details about the memorial service..."
              className={inputStyle}
              rows={3}
            />
          </div>
        )}

        {isCorporate && (
          <div>
            <label className={labelStyle}>Business Objectives & Goals</label>
            <Textarea
              value={form.moodDescription}
              onChange={e => update("moodDescription", e.target.value)}
              placeholder="e.g. Launch new product, strengthen team relationships, celebrate annual results, networking opportunity..."
              className={inputStyle}
              rows={2}
            />
          </div>
        )}

        {isGovernmentPublic && (
          <div>
            <label className={labelStyle}>Public Sector Body / Organisation *</label>
            <Input
              value={form.publicSectorBody}
              onChange={e => update("publicSectorBody", e.target.value)}
              placeholder="e.g. City of Lagos, UK Home Office, Ministry of Health..."
              required
              className={inputStyle}
            />
            <p className="text-white/40 text-xs mt-1">The government body, department, or public institution hosting this event</p>
          </div>
        )}

        {isCharityCommunity && (
          <div>
            <label className={labelStyle}>Charity / Community Organisation *</label>
            <Input
              value={form.charityRegistration}
              onChange={e => update("charityRegistration", e.target.value)}
              placeholder="e.g. Registered charity no. 12345, Community Trust Name..."
              required
              className={inputStyle}
            />
            <p className="text-white/40 text-xs mt-1">Charity registration number or community organisation name</p>
          </div>
        )}

        {isEducation && (
          <div>
            <label className={labelStyle}>School / Institution *</label>
            <Input
              value={form.schoolOrInstitution}
              onChange={e => update("schoolOrInstitution", e.target.value)}
              placeholder="e.g. University of Lagos, Eton College, Harvard University..."
              required
              className={inputStyle}
            />
            <p className="text-white/40 text-xs mt-1">Name of the educational institution organising this event</p>
          </div>
        )}

        {isPrivateSocial && (
          <div>
            <label className={labelStyle}>Occasion Details *</label>
            <Input
              value={form.privateOccasionType}
              onChange={e => update("privateOccasionType", e.target.value)}
              placeholder="e.g. Sarah's 40th Birthday Dinner, The Smith Family Reunion..."
              required
              className={inputStyle}
            />
            <p className="text-white/40 text-xs mt-1">Describe who this private event is for and what you're celebrating</p>
          </div>
        )}

        {isInternational && (
          <div className="space-y-4">
            <div>
              <label className={labelStyle}>Destination Countries *</label>
              <Input
                value={form.crossBorderCountries}
                onChange={e => update("crossBorderCountries", e.target.value)}
                placeholder="e.g. Nigeria, United Kingdom, Dubai — list all event countries"
                required
                className={inputStyle}
              />
              <p className="text-white/40 text-xs mt-1">All countries where event activities will take place</p>
            </div>

            <div className="bg-[#1a0108] border border-[#4a0a1e] rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Globe2 className="w-5 h-5 text-[#E0C06A] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold text-sm">International Travel & Logistics</h4>
                  <p className="text-white/50 text-xs mt-0.5">Select all that apply to your cross-border event</p>
                </div>
              </div>
              <div className="space-y-2">
                <Checkbox
                  checked={form.internationalTravelRequired}
                  onChange={(v) => update("internationalTravelRequired", v)}
                  label="International Travel Required"
                  desc="Guests or team members will need to travel across borders"
                />
                <Checkbox
                  checked={form.internationalVisaSupport}
                  onChange={(v) => update("internationalVisaSupport", v)}
                  label="Visa & Immigration Support Needed"
                  desc="Assistance required with visas, work permits, or entry requirements"
                />
              </div>
            </div>

            <div className={`rounded-lg border-2 p-4 transition-all ${form.twinPaayEnabled ? "bg-[#0a2a0a] border-green-500/60" : "bg-[#1a0108] border-[#E0C06A]/60"}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${form.twinPaayEnabled ? "bg-green-500 text-white" : "bg-[#E0C06A] text-[#330311]"}`}>
                  {form.twinPaayEnabled ? "✓" : "T"}
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">TwinPaay — International Payment Processing *</h4>
                  <p className="text-white/60 text-xs mt-0.5">Required for all cross-border events. TwinPaay handles multi-currency payments, international vendor payments, and cross-border financial compliance.</p>
                </div>
              </div>
              <Checkbox
                checked={form.twinPaayEnabled}
                onChange={(v) => update("twinPaayEnabled", v)}
                label={form.twinPaayEnabled ? "TwinPaay Enabled — Cross-border payments activated" : "Enable TwinPaay for this international event"}
                desc={form.twinPaayEnabled ? "Multi-currency payments, FX management, and international vendor payouts are active" : "I understand TwinPaay is required to process international payments for this event"}
              />
            </div>
          </div>
        )}

        {eventType === "celebration" && (
          <div>
            <label className={labelStyle}>Who is the Event For?</label>
            <Input
              value={form.celebrantAge}
              onChange={e => update("celebrantAge", e.target.value)}
              placeholder="e.g. Sarah (50th Birthday), The Johnson Family (Reunion), Our Team (5-Year Anniversary)"
              className={inputStyle}
            />
          </div>
        )}

        <div>
          <label className={labelStyle}>Event Description</label>
          <Textarea
            value={form.description}
            onChange={e => update("description", e.target.value)}
            placeholder={isCorporate
              ? "Describe the event purpose, key attendees, expected outcomes, and any compliance/messaging requirements..."
              : eventType === "celebration"
              ? "Tell the story of what you're celebrating and what makes this event special..."
              : isTicketing
              ? "Describe the event, performers/artists, programme highlights, and audience expectations..."
              : isGovernmentPublic
              ? "Describe the purpose, stakeholders, policy objectives, and expected outcomes of this government event..."
              : isCharityCommunity
              ? "Describe the cause, beneficiaries, fundraising goals, and the community impact of this event..."
              : isEducation
              ? "Describe the event purpose, student/staff involvement, programme highlights, and any awards or ceremonies..."
              : isPrivateSocial
              ? "Tell us about the occasion, the host, what's being celebrated, and any special wishes or requirements..."
              : isInternational
              ? "Describe the event concept, participating countries, key stakeholders, and cross-border coordination needs..."
              : "Share the story behind this event, the vision, theme ideas, and what makes it special..."
            }
            className={inputStyle}
            rows={4}
          />
        </div>

        {isWedding && (
          <div className="border-t border-[#4a0a1e] pt-4">
            <p className="text-white/60 text-xs mb-2 uppercase tracking-wider">Your Wedding Planning Scope</p>
            <p className="text-white/40 text-xs mb-2">Each ceremony below is a separate planning scope with its own budget, vendors, timeline, and management.</p>
            <div className="bg-[#330311]/40 border border-white/10 rounded-lg p-3 mb-5">
              <p className="text-white/70 text-xs"><span className="text-white font-semibold">Why separate scopes?</span> A wedding often has multiple events — traditional engagement, church ceremony, reception, after party — each potentially handled by a different planner. We treat each as its own project so nothing falls through the cracks.</p>
            </div>
            <div className="space-y-5">
              {weddingEvents.map((evt, i) => {
                const questionText = evt.type === "Traditional"
                  ? "Is there a Traditional Engagement / Introduction ceremony?"
                  : evt.type === "Church Wedding"
                  ? "Is there a Church Wedding ceremony?"
                  : evt.type === "Reception"
                  ? "Is there a Reception (party / celebration)?"
                  : "Is there an After Party?";
                const descText = evt.type === "Traditional"
                  ? "The traditional engagement — families formally meet, introductions and blessings are exchanged"
                  : evt.type === "Church Wedding"
                  ? "The church or place of worship ceremony — the formal wedding service"
                  : evt.type === "Reception"
                  ? "The main party and celebration — food, drinks, music, dancing, and entertainment"
                  : "The after party — a more relaxed continuation of the celebrations";

                return (
                  <div key={evt.type} className={`rounded-xl border ${evt.enabled ? "bg-[#1a0108] border-white/20" : "bg-[#1a0108]/50 border-[#4a0a1e]"} overflow-hidden`}>
                    <div className="p-4">
                      <p className="text-white font-semibold text-sm mb-1">{questionText}</p>
                      <p className="text-white/40 text-xs mb-3">{descText}</p>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => updateWeddingEvent(i, "enabled", true)}
                          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${evt.enabled ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white/60 hover:bg-[#5a1a2e]"}`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => updateWeddingEvent(i, "enabled", false)}
                          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${!evt.enabled ? "bg-white text-[#330311]" : "bg-[#4a0a1e] text-white/60 hover:bg-[#5a1a2e]"}`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {evt.enabled && (
                      <div className="border-t border-[#4a0a1e] bg-[#1a0108] p-4">
                        <p className="text-white/60 text-xs uppercase tracking-wider mb-3">{evt.type} Details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-white/50 text-xs block mb-1">Date</label>
                            <Input
                              type="date"
                              value={evt.date}
                              onChange={e => updateWeddingEvent(i, "date", e.target.value)}
                              className={inputStyle}
                            />
                          </div>
                          <div>
                            <label className="text-white/50 text-xs block mb-1">Venue (if known)</label>
                            <Input
                              value={evt.venue}
                              onChange={e => updateWeddingEvent(i, "venue", e.target.value)}
                              placeholder="Venue name"
                              className={inputStyle}
                            />
                          </div>
                          <div>
                            <label className="text-white/50 text-xs block mb-1">City / Location</label>
                            {form.country && citiesByCountry[form.country] ? (
                              <select
                                value={citiesByCountry[form.country].includes(evt.city) ? evt.city : (evt.city ? "__other__" : "")}
                                onChange={e => {
                                  if (e.target.value === "__other__") {
                                    updateWeddingEvent(i, "city", "");
                                  } else {
                                    updateWeddingEvent(i, "city", e.target.value);
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm"
                              >
                                <option value="">Select city...</option>
                                {citiesByCountry[form.country].map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="__other__">Other</option>
                              </select>
                            ) : (
                              <Input
                                value={evt.city}
                                onChange={e => updateWeddingEvent(i, "city", e.target.value)}
                                placeholder="e.g. Lagos, London"
                                className={inputStyle}
                              />
                            )}
                            {form.country && citiesByCountry[form.country] && evt.city && !citiesByCountry[form.country].includes(evt.city) && (
                              <Input
                                value={evt.city}
                                onChange={e => updateWeddingEvent(i, "city", e.target.value)}
                                placeholder="Enter city..."
                                className={`${inputStyle} mt-1`}
                              />
                            )}
                          </div>
                          <div>
                            <label className="text-white/50 text-xs block mb-1">Expected Guests</label>
                            <Input
                              value={evt.guestCount}
                              onChange={e => updateWeddingEvent(i, "guestCount", e.target.value)}
                              placeholder="e.g. 150"
                              className={inputStyle}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-white/50 text-xs block mb-1">Notes / Special Requirements</label>
                            <Input
                              value={evt.description}
                              onChange={e => updateWeddingEvent(i, "description", e.target.value)}
                              placeholder={`Any special notes for the ${evt.type.toLowerCase()}...`}
                              className={inputStyle}
                            />
                          </div>
                        </div>

                        {evt.type === "Church Wedding" && (
                          <div className="border-t border-[#4a0a1e] mt-4 pt-4">
                            <p className="text-white font-semibold text-sm mb-3">Church / Place of Worship Details</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-white/50 text-xs block mb-1">Church / Place of Worship Name</label>
                                <Input
                                  value={evt.churchName}
                                  onChange={e => updateWeddingEvent(i, "churchName", e.target.value)}
                                  placeholder="e.g. St Paul's Cathedral"
                                  className={inputStyle}
                                />
                              </div>
                              <div>
                                <label className="text-white/50 text-xs block mb-1">Church Address / Location</label>
                                <Input
                                  value={evt.churchLocation}
                                  onChange={e => updateWeddingEvent(i, "churchLocation", e.target.value)}
                                  placeholder="e.g. City, Address"
                                  className={inputStyle}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isTicketing && (
          <div className="border-t border-[#4a0a1e] pt-4">
            <p className="text-white/60 text-xs mb-2 uppercase tracking-wider">Event & Ticketing Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Venue Type</label>
                <select
                  value={form.venueType}
                  onChange={e => update("venueType", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
                >
                  <option value="">Select...</option>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="hybrid">Indoor & Outdoor (Hybrid)</option>
                  <option value="arena">Arena / Stadium</option>
                  <option value="theatre">Theatre / Auditorium</option>
                  <option value="gallery">Gallery / Exhibition Space</option>
                  <option value="park">Park / Open Air</option>
                  <option value="marquee">Marquee / Tent</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelStyle}>Expected Capacity / Attendance</label>
                <Input
                  value={form.expectedCapacity}
                  onChange={e => update("expectedCapacity", e.target.value)}
                  placeholder="e.g. 500, 2000, 10000"
                  className={inputStyle}
                />
              </div>
              <div>
                <label className={labelStyle}>Performers / Artists / Speakers</label>
                <Input
                  value={form.performersArtists}
                  onChange={e => update("performersArtists", e.target.value)}
                  placeholder="e.g. DJ Nova, Keynote Speaker, Band name"
                  className={inputStyle}
                />
              </div>
              <div>
                <label className={labelStyle}>Age Restriction</label>
                <select
                  value={form.ageRestriction}
                  onChange={e => update("ageRestriction", e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
                >
                  <option value="">Select...</option>
                  <option value="all_ages">All Ages</option>
                  <option value="family">Family Friendly</option>
                  <option value="16+">16+</option>
                  <option value="18+">18+</option>
                  <option value="21+">21+</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelStyle}>Ticket Types</label>
                <Input
                  value={form.ticketTypes}
                  onChange={e => update("ticketTypes", e.target.value)}
                  placeholder="e.g. General Admission, VIP, Early Bird, VVIP, Table Booking"
                  className={inputStyle}
                />
                <p className="text-white/40 text-xs mt-1">Separate ticket tiers with commas</p>
              </div>
            </div>
          </div>
        )}

        {!isWedding && (
          <div>
            <label className={labelStyle}>How many days is this event? *</label>
            <select
              value={form.eventDays}
              onChange={e => {
                const days = parseInt(e.target.value);
                update("eventDays", e.target.value);
                if (days > 1) {
                  const newSchedule = Array.from({ length: days }, (_, i) => {
                    const existing = daySchedule[i];
                    return existing || { date: "", startTime: "", endTime: "", description: `Day ${i + 1}` };
                  });
                  setDaySchedule(newSchedule);
                } else {
                  setDaySchedule([]);
                }
              }}
              className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
            >
              {[1,2,3,4,5,6,7].map(d => (
                <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>
              ))}
            </select>
          </div>
        )}

        {!isWedding && (
          <>
            {Number(form.eventDays) <= 1 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Event Date *</label>
                    <Input
                      type="date"
                      value={form.startDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={e => { update("startDate", e.target.value); update("endDate", e.target.value); }}
                      required
                      className={inputStyle}
                    />
                    {form.startDate && !isDateInFuture(form.startDate) && (
                      <p className="text-red-400 text-xs mt-1">Event date must be today or in the future</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className={labelStyle}>Start Time</label>
                      <Input
                        type="time"
                        value={form.startTime}
                        onChange={e => update("startTime", e.target.value)}
                        className={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelStyle}>End Time</label>
                      <Input
                        type="time"
                        value={form.endTime}
                        onChange={e => update("endTime", e.target.value)}
                        className={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-white/50 text-xs">Provide the date and times for each day of the event</p>
                {daySchedule.map((day, i) => (
                  <div key={i} className="bg-[#1a0108] border border-[#4a0a1e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-white text-[#330311] text-xs font-bold px-2 py-0.5 rounded-full">Day {i + 1}</span>
                      <Input
                        value={day.description}
                        onChange={e => {
                          const updated = [...daySchedule];
                          updated[i] = { ...updated[i], description: e.target.value };
                          setDaySchedule(updated);
                        }}
                        placeholder={`e.g. Day ${i + 1} - Opening`}
                        className="bg-transparent border-none text-white text-sm placeholder:text-white/30 p-0 h-auto focus-visible:ring-0"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-white/50 text-xs block mb-1">Date *</label>
                        <Input
                          type="date"
                          value={day.date}
                          onChange={e => {
                            const updated = [...daySchedule];
                            updated[i] = { ...updated[i], date: e.target.value };
                            setDaySchedule(updated);
                            if (i === 0) update("startDate", e.target.value);
                            if (i === daySchedule.length - 1) update("endDate", e.target.value);
                          }}
                          className={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs block mb-1">Start Time</label>
                        <Input
                          type="time"
                          value={day.startTime}
                          onChange={e => {
                            const updated = [...daySchedule];
                            updated[i] = { ...updated[i], startTime: e.target.value };
                            setDaySchedule(updated);
                          }}
                          className={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs block mb-1">End Time</label>
                        <Input
                          type="time"
                          value={day.endTime}
                          onChange={e => {
                            const updated = [...daySchedule];
                            updated[i] = { ...updated[i], endTime: e.target.value };
                            setDaySchedule(updated);
                          }}
                          className={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {isCorporate && (
          <div className="border-t border-[#4a0a1e] pt-4">
            <p className="text-white/60 text-xs mb-4 uppercase tracking-wider">Company Branding</p>
            <div>
              <label className={labelStyle}>
                <Building2 className="w-4 h-4 inline mr-1" />
                Company Logo
              </label>
              <p className="text-white/50 text-xs mb-2">Your company or brand logo for event branding</p>
              {companyLogoPreview ? (
                <div className="relative rounded-lg overflow-hidden border border-[#4a0a1e] max-w-sm">
                  <div className="w-full h-32 flex items-center justify-center bg-white p-4">
                    <img src={companyLogoPreview} alt="Logo preview" className="max-h-24 max-w-full object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setCompanyLogoFile(null); setCompanyLogoPreview(""); }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#4a0a1e] rounded-lg cursor-pointer bg-[#1a0108] max-w-sm">
                  <Upload className="w-6 h-6 text-white/40 mb-2" />
                  <span className="text-white/40 text-xs">Click to upload logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCompanyLogoFile(file);
                        setCompanyLogoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="bg-[#2a020d] border-[#4a0a1e]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location & Venues
        </CardTitle>
        <p className="text-white/60 text-sm">Where will the event take place?</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelStyle}>Country *</label>
            <select
              value={form.country}
              onChange={e => {
                update("country", e.target.value);
                update("city", "");
                setCustomCity(false);
              }}
              required
              className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
            >
              <option value="">Select country...</option>
              {countries.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelStyle}>City / Region *</label>
            {form.country && citiesByCountry[form.country] ? (
              <>
                <select
                  value={citiesByCountry[form.country].includes(form.city) ? form.city : (form.city ? "__other__" : "")}
                  onChange={e => {
                    if (e.target.value === "__other__") {
                      update("city", "");
                      setCustomCity(true);
                    } else {
                      update("city", e.target.value);
                      setCustomCity(false);
                    }
                  }}
                  required={!form.city}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
                >
                  <option value="">Select city...</option>
                  {citiesByCountry[form.country].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__other__">Other (type below)</option>
                </select>
                {(customCity || (form.city && !citiesByCountry[form.country]?.includes(form.city))) && (
                  <Input
                    value={form.city}
                    onChange={e => update("city", e.target.value)}
                    placeholder="Enter city or area name..."
                    required
                    className={`${inputStyle} mt-2`}
                    autoFocus
                  />
                )}
              </>
            ) : (
              <Input
                value={form.city}
                onChange={e => update("city", e.target.value)}
                placeholder="e.g. London, Lagos, New York"
                required
                className={inputStyle}
              />
            )}
          </div>
        </div>

        {isInternational && (
          <div className="rounded-xl border border-[#E0C06A]/30 bg-[#330311]/40 p-4 space-y-4">
            <div>
              <h4 className="text-white font-semibold">TwinPaay — International Payment Processing</h4>
              <p className="text-white/60 text-sm mt-1">Required for cross-border events to manage international vendor payments and multi-currency handling.</p>
            </div>
            <Checkbox
              checked={form.twinPaayEnabled}
              onChange={(v) => update("twinPaayEnabled", v)}
              label={form.twinPaayEnabled ? "TwinPaay enabled for this event" : "Enable TwinPaay for this international event"}
              desc="Cross-border financial compliance is required before proceeding."
            />
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Destination Countries *</label>
                <Textarea
                  value={form.crossBorderCountries}
                  onChange={e => update("crossBorderCountries", e.target.value)}
                  placeholder="e.g. United Kingdom, Nigeria, Ghana"
                  className={inputStyle}
                  rows={3}
                />
              </div>
              <div className="space-y-3">
                <Checkbox
                  checked={form.internationalTravelRequired}
                  onChange={(v) => update("internationalTravelRequired", v)}
                  label="International travel required"
                  desc="Select if the event team or guests will travel across borders."
                />
                <Checkbox
                  checked={form.internationalVisaSupport}
                  onChange={(v) => update("internationalVisaSupport", v)}
                  label="Visa support needed"
                  desc="Select if travel documentation support is required."
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className={labelStyle}>Do you already have a venue?</label>
          <div className="flex gap-4 mt-2">
            <label className={`${checkboxLabelStyle} flex-1 ${form.hasVenue ? "bg-[#4a0a1e] border-white/30" : "bg-[#2a020d]"}`}>
              <input type="radio" name="hasVenue" checked={form.hasVenue} onChange={() => update("hasVenue", true)} className="sr-only" />
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${form.hasVenue ? "border-white bg-white" : "border-white/50"}`}>
                {form.hasVenue && <div className="w-2 h-2 rounded-full bg-[#330311] m-auto mt-0.5" />}
              </div>
              <span className="text-white text-sm">Yes, venue secured</span>
            </label>
            <label className={`${checkboxLabelStyle} flex-1 ${!form.hasVenue ? "bg-[#4a0a1e] border-white/30" : "bg-[#2a020d]"}`}>
              <input type="radio" name="hasVenue" checked={!form.hasVenue} onChange={() => update("hasVenue", false)} className="sr-only" />
              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${!form.hasVenue ? "border-white bg-white" : "border-white/50"}`}>
                {!form.hasVenue && <div className="w-2 h-2 rounded-full bg-[#330311] m-auto mt-0.5" />}
              </div>
              <span className="text-white text-sm">No, need venue sourcing</span>
            </label>
          </div>
        </div>

        {form.hasVenue && !isWedding && (
          <div className="border-t border-[#4a0a1e] pt-4">
            <p className="text-white/60 text-xs mb-4 uppercase tracking-wider">Venue Details (fill in what applies)</p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Main Venue</label>
                  <Input
                    value={form.ceremonyVenue}
                    onChange={e => update("ceremonyVenue", e.target.value)}
                    placeholder="Venue name"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Main Venue Date</label>
                  <Input
                    type="date"
                    value={form.ceremonyDate}
                    onChange={e => update("ceremonyDate", e.target.value)}
                    className={inputStyle}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>Secondary Venue</label>
                  <Input
                    value={form.receptionVenue}
                    onChange={e => update("receptionVenue", e.target.value)}
                    placeholder="Venue name (if different)"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Secondary Venue Date</label>
                  <Input
                    type="date"
                    value={form.receptionDate}
                    onChange={e => update("receptionDate", e.target.value)}
                    className={inputStyle}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelStyle}>After-Party / Additional Venue</label>
                  <Input
                    value={form.afterPartyVenue}
                    onChange={e => update("afterPartyVenue", e.target.value)}
                    placeholder="Venue name (optional)"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>After-Party Date</label>
                  <Input
                    type="date"
                    value={form.afterPartyDate}
                    onChange={e => update("afterPartyDate", e.target.value)}
                    className={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {isWedding && weddingEvents.some(e => e.enabled) && (
          <div className="border-t border-[#4a0a1e] pt-4">
            <p className="text-white/60 text-xs mb-2 uppercase tracking-wider">Wedding Event Venues</p>
            <p className="text-white/40 text-xs mb-4">Review and update venue details for your selected wedding events.</p>
            <div className="space-y-4">
              {weddingEvents.filter(e => e.enabled).map((evt) => {
                const idx = weddingEvents.findIndex(we => we.type === evt.type);
                return (
                  <div key={evt.type} className="bg-[#1a0108] border border-[#4a0a1e] rounded-xl p-4">
                    <p className="text-white font-semibold text-sm mb-3">{evt.type === "Traditional" ? "Traditional Engagement" : evt.type === "Church Wedding" ? "Church Wedding" : evt.type === "Reception" ? "Reception (Party)" : "After Party"}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-white/50 text-xs block mb-1">{evt.type === "Church Wedding" ? "Church / Ceremony Venue" : "Main Venue"}</label>
                        <Input
                          value={evt.venue}
                          onChange={e => updateWeddingEvent(idx, "venue", e.target.value)}
                          placeholder="Venue name"
                          className={inputStyle}
                        />
                      </div>
                      <div>
                        <label className="text-white/50 text-xs block mb-1">City / Location</label>
                        {form.country && citiesByCountry[form.country] ? (
                          <select
                            value={citiesByCountry[form.country].includes(evt.city) ? evt.city : (evt.city ? "__other__" : "")}
                            onChange={e => {
                              if (e.target.value === "__other__") {
                                updateWeddingEvent(idx, "city", "");
                              } else {
                                updateWeddingEvent(idx, "city", e.target.value);
                              }
                            }}
                            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black text-sm"
                          >
                            <option value="">Select city...</option>
                            {citiesByCountry[form.country].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="__other__">Other</option>
                          </select>
                        ) : (
                          <Input
                            value={evt.city}
                            onChange={e => updateWeddingEvent(idx, "city", e.target.value)}
                            placeholder="e.g. Lagos, London"
                            className={inputStyle}
                          />
                        )}
                        {form.country && citiesByCountry[form.country] && evt.city && !citiesByCountry[form.country].includes(evt.city) && (
                          <Input
                            value={evt.city}
                            onChange={e => updateWeddingEvent(idx, "city", e.target.value)}
                            placeholder="Enter city..."
                            className={`${inputStyle} mt-1`}
                          />
                        )}
                      </div>
                    </div>
                    {evt.type === "Church Wedding" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#4a0a1e]">
                        <div>
                          <label className="text-white/50 text-xs block mb-1">Church / Place of Worship</label>
                          <Input
                            value={evt.churchName}
                            onChange={e => updateWeddingEvent(idx, "churchName", e.target.value)}
                            placeholder="e.g. St Paul's Cathedral"
                            className={inputStyle}
                          />
                        </div>
                        <div>
                          <label className="text-white/50 text-xs block mb-1">Church Address / Location</label>
                          <Input
                            value={evt.churchLocation}
                            onChange={e => updateWeddingEvent(idx, "churchLocation", e.target.value)}
                            placeholder="e.g. City, Address"
                            className={inputStyle}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderDCStep3 = () => (
    <div className="space-y-6">
      <Card className="bg-[#2a020d] border-[#4a0a1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Key Contacts for the Day
          </CardTitle>
          <p className="text-white/60 text-sm">Who should our coordinators report to and liaise with on the day?</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Client Contact on the Day *</label>
              <Input
                value={form.clientContactOnDay}
                onChange={e => update("clientContactOnDay", e.target.value)}
                placeholder="Name of person in charge"
                required
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Contact Phone Number</label>
              <Input
                value={form.clientContactPhone}
                onChange={e => update("clientContactPhone", e.target.value)}
                placeholder="+44 7xxx xxx xxx"
                className={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Emergency Contact</label>
              <Input
                value={form.emergencyContact}
                onChange={e => update("emergencyContact", e.target.value)}
                placeholder="Emergency contact name"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Emergency Phone</label>
              <Input
                value={form.emergencyContactPhone}
                onChange={e => update("emergencyContactPhone", e.target.value)}
                placeholder="+44 7xxx xxx xxx"
                className={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Client's Own Planner (if any)</label>
              <Input
                value={form.clientPlannerName}
                onChange={e => update("clientPlannerName", e.target.value)}
                placeholder="Name of their planner (if they have one)"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Number of EP Coordinators</label>
              <select
                value={form.numberOfCoordinators}
                onChange={e => update("numberOfCoordinators", e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
              >
                <option value="1">1 Coordinator</option>
                <option value="2">2 Coordinators (Recommended)</option>
                <option value="3">3 Coordinators</option>
                <option value="4">4 Coordinators</option>
                <option value="5">5+ Coordinators</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Expected Guest Count</label>
              <Input
                value={form.guestCount}
                onChange={e => update("guestCount", e.target.value)}
                placeholder="e.g. 150"
                type="number"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>EP Team Setup/Arrival Time</label>
              <Input
                value={form.setupTime}
                onChange={e => update("setupTime", e.target.value)}
                placeholder="e.g. 8:00 AM (2 hours before event)"
                className={inputStyle}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isInternational && (
        <Card className="bg-[#0a2a0a] border-green-500/40">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-green-400" />
              TwinPaay — International Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`rounded-lg p-3 flex items-center gap-3 ${form.twinPaayEnabled ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${form.twinPaayEnabled ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                {form.twinPaayEnabled ? "✓" : "!"}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{form.twinPaayEnabled ? "TwinPaay Active" : "TwinPaay Required — Not Yet Enabled"}</p>
                <p className="text-white/60 text-xs">{form.twinPaayEnabled ? "Multi-currency payments and cross-border financial compliance are active for this event." : "Please return to Step 3 and enable TwinPaay to proceed with this international event."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#2a020d] border-[#4a0a1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clipboard className="w-5 h-5" />
            Vendors Already Booked
          </CardTitle>
          <p className="text-white/60 text-sm">Tell us about the vendors you've already arranged — we'll coordinate them on the day</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Venue Contact</label>
              <Input
                value={form.venueContactName}
                onChange={e => update("venueContactName", e.target.value)}
                placeholder="Venue manager name & phone"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Venue Contact Phone</label>
              <Input
                value={form.venueContactPhone}
                onChange={e => update("venueContactPhone", e.target.value)}
                placeholder="+44 xxx xxx xxxx"
                className={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Catering / Food Vendor</label>
              <Input
                value={form.cateringVendor}
                onChange={e => update("cateringVendor", e.target.value)}
                placeholder="Caterer name & contact"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Décor / Styling Vendor</label>
              <Input
                value={form.decorVendor}
                onChange={e => update("decorVendor", e.target.value)}
                placeholder="Decorator name & contact"
                className={inputStyle}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Entertainment / DJ / MC</label>
              <Input
                value={form.entertainmentVendor}
                onChange={e => update("entertainmentVendor", e.target.value)}
                placeholder="DJ / MC name & contact"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={labelStyle}>Photographer / Videographer</label>
              <Input
                value={form.photographyVendor}
                onChange={e => update("photographyVendor", e.target.value)}
                placeholder="Photographer name & contact"
                className={inputStyle}
              />
            </div>
          </div>
          <div>
            <label className={labelStyle}>Other Vendors</label>
            <Textarea
              value={form.otherVendorsList}
              onChange={e => update("otherVendorsList", e.target.value)}
              placeholder="List any other vendors (florist, cake maker, transport, security, etc.) with names and contacts..."
              className={inputStyle}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDCStep4 = () => (
    <div className="space-y-6">
      <Card className="bg-[#2a020d] border-[#4a0a1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            What Should EP Coordinate?
          </CardTitle>
          <p className="text-white/60 text-sm">Select which aspects of the day our coordinators should manage</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dayCoordinationServices.map(s => (
              <Checkbox
                key={s.key}
                checked={(form as any)[s.key]}
                onChange={(v) => update(s.key, v)}
                label={s.label}
                desc={s.desc}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2a020d] border-[#4a0a1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Client's Existing Timeline
          </CardTitle>
          <p className="text-white/60 text-sm">Share the event timeline or run sheet the client has put together</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={labelStyle}>Event Timeline / Run Sheet</label>
            <Textarea
              value={form.existingTimeline}
              onChange={e => update("existingTimeline", e.target.value)}
              placeholder={"e.g.\n10:00 AM — Venue access & setup begins\n12:00 PM — Décor team arrives\n2:00 PM — Guests arrive, welcome drinks\n3:00 PM — Ceremony begins\n4:00 PM — Cocktail hour\n5:00 PM — Reception & dinner\n8:00 PM — Speeches & cake cutting\n10:00 PM — Last dance\n11:00 PM — Breakdown & close"}
              className={inputStyle}
              rows={8}
            />
          </div>
          <div>
            <label className={labelStyle}>Additional Day-of Notes</label>
            <Textarea
              value={form.dayOfNotes}
              onChange={e => update("dayOfNotes", e.target.value)}
              placeholder="Any special instructions, VIP guests to look out for, dietary requirements, cultural considerations, or anything else our team should know..."
              className={inputStyle}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelStyle}>Coordination Fee (Budget)</label>
              <div className="flex gap-2">
                <select
                  value={form.currency}
                  onChange={e => update("currency", e.target.value)}
                  className="w-24 px-2 py-2 rounded-md border border-gray-300 bg-white text-black text-sm"
                >
                  {currencies.map(c => (
                    <option key={c.code} value={c.code}>{c.symbol}</option>
                  ))}
                </select>
                <Input
                  value={form.budget}
                  onChange={e => update("budget", e.target.value)}
                  placeholder="Coordination fee"
                  type="number"
                  className={inputStyle}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStep3 = () => (
    <Card className="bg-[#2a020d] border-[#4a0a1e]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Guests & Budget
        </CardTitle>
        <p className="text-white/60 text-sm">Help us understand your guest profile and budget</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelStyle}>Expected Guest Count *</label>
            <Input
              type="number"
              value={form.guestCount}
              onChange={e => update("guestCount", e.target.value)}
              placeholder="e.g. 150"
              required
              min="1"
              className={inputStyle}
            />
          </div>
          <div>
            <label className={labelStyle}>Currency</label>
            <select
              value={form.currency}
              onChange={e => update("currency", e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelStyle}>Guest Age Groups</label>
          <p className="text-white/50 text-xs mb-3">Select all that apply to help with seating, catering, and entertainment planning</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {guestAgeGroups.map(g => (
              <Checkbox
                key={g.key}
                checked={(form as any)[g.key]}
                onChange={(v) => update(g.key, v)}
                label={g.label}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-[#4a0a1e] pt-4">
          <label className={labelStyle}>Budget</label>
          <p className="text-white/50 text-xs mb-3">Provide an exact amount or select a range</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`${labelStyle} text-xs`}>Budget Amount ({currencies.find(c => c.code === form.currency)?.symbol})</label>
              <Input
                type="number"
                value={form.budget}
                onChange={e => update("budget", e.target.value)}
                placeholder="e.g. 50000"
                className={inputStyle}
              />
            </div>
            <div>
              <label className={`${labelStyle} text-xs`}>Or Select Range</label>
              <select
                value={form.budgetRange}
                onChange={e => update("budgetRange", e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
              >
                <option value="">Select range...</option>
                <option value="under-5k">Under 5,000</option>
                <option value="5k-10k">5,000 - 10,000</option>
                <option value="10k-25k">10,000 - 25,000</option>
                <option value="25k-50k">25,000 - 50,000</option>
                <option value="50k-100k">50,000 - 100,000</option>
                <option value="100k-250k">100,000 - 250,000</option>
                <option value="250k-500k">250,000 - 500,000</option>
                <option value="500k-1m">500,000 - 1,000,000</option>
                <option value="1m-plus">1,000,000+</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-[#4a0a1e] pt-4">
          <label className={labelStyle}>Event Website & RSVP Settings</label>
          <p className="text-white/50 text-xs mb-3">Control what guests see on the public event page</p>
          <div className="space-y-3">
            <Checkbox
              checked={form.eventWebsiteEnabled}
              onChange={(v) => update("eventWebsiteEnabled", v)}
              label="Enable Event Website"
              desc="Create a shareable event page for guests"
            />
            <Checkbox
              checked={form.rsvpEnabled}
              onChange={(v) => update("rsvpEnabled", v)}
              label="Enable Online RSVP"
              desc="Allow guests to RSVP through the event website"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => {
    const filteredServices = services.filter(s => {
      if (isCorporate) {
        return ["needsEndToEndPlanning", "needsDayCoordination", "needsVenueSearch", "needsVenueDecoration", "needsCatering", "needsVendorCoordination", "needsBrandedStyling", "needsHumanResources", "needsCorporateGifting", "needsBranding"].includes(s.key);
      }
      if (isGovernmentPublic) {
        return ["needsEndToEndPlanning", "needsDayCoordination", "needsVenueSearch", "needsVenueDecoration", "needsCatering", "needsVendorCoordination", "needsBrandedStyling", "needsHumanResources", "needsBranding"].includes(s.key);
      }
      if (isCharityCommunity) {
        return ["needsEndToEndPlanning", "needsDayCoordination", "needsVenueSearch", "needsVenueDecoration", "needsCatering", "needsVendorCoordination", "needsConceptDelivery", "needsHumanResources"].includes(s.key);
      }
      if (isEducation) {
        return ["needsEndToEndPlanning", "needsDayCoordination", "needsVenueSearch", "needsVenueDecoration", "needsCatering", "needsVendorCoordination", "needsConceptDelivery", "needsHumanResources"].includes(s.key);
      }
      if (isPrivateSocial) {
        return ["needsEndToEndPlanning", "needsDayCoordination", "needsVenueSearch", "needsVenueDecoration", "needsCatering", "needsVendorCoordination", "needsConceptDelivery", "needsPartyPacks"].includes(s.key);
      }
      if (isInternational) {
        return ["needsEndToEndPlanning", "needsDayCoordination", "needsVenueSearch", "needsVenueDecoration", "needsCatering", "needsVendorCoordination", "needsBrandedStyling", "needsHumanResources", "needsBranding"].includes(s.key);
      }
      if (eventType === "celebration" || eventType === "childrens_party") {
        return ["needsEndToEndPlanning", "needsDayCoordination", "needsVenueSearch", "needsVenueDecoration", "needsCatering", "needsVendorCoordination", "needsPartyPacks", "needsConceptDelivery"].includes(s.key);
      }
      if (isWedding) {
        return ["needsEndToEndPlanning", "needsDayCoordination", "needsVenueSearch", "needsVenueDecoration", "needsCatering", "needsVendorCoordination", "needsConceptDelivery", "needsBrandedStyling", "needsHumanResources"].includes(s.key);
      }
      if (isTicketing) {
        return ["needsEndToEndPlanning", "needsDayCoordination", "needsVenueSearch", "needsVendorCoordination", "needsHumanResources"].includes(s.key);
      }
      return true;
    });

    return (
    <div className="space-y-6">
      <Card className="bg-[#2a020d] border-[#4a0a1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            {isCorporate ? "Corporate Services" : isGovernmentPublic ? "Government Event Services" : isCharityCommunity ? "Charity & Community Services" : isEducation ? "Educational Event Services" : isPrivateSocial ? "Private Event Services" : isInternational ? "International Event Services" : "Services Required"}
          </CardTitle>
          <p className="text-white/60 text-sm">{isCorporate ? "Select the professional services your corporate event needs" : isGovernmentPublic ? "Select the services required for your government or public sector event" : isCharityCommunity ? "Select the services required for your charity or community event" : isEducation ? "Select the services required for your educational event" : isPrivateSocial ? "Select the services required for your private event" : isInternational ? "Select the services required for your international cross-border event" : "Which services do you need for this event?"}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredServices.map(s => (
              <Checkbox
                key={s.key}
                checked={(form as any)[s.key]}
                onChange={(v) => update(s.key, v)}
                label={s.label}
                desc={s.desc}
              />
            ))}
          </div>
          <div className="mt-4">
            <Checkbox
              checked={form.needsOtherServices}
              onChange={(v) => update("needsOtherServices", v)}
              label="Other Services"
              desc="Something not listed above"
            />
            {form.needsOtherServices && (
              <div className="mt-3 ml-8">
                <Textarea
                  value={form.otherServicesDetails}
                  onChange={e => update("otherServicesDetails", e.target.value)}
                  placeholder="Describe the additional services you need..."
                  className={inputStyle}
                  rows={2}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isInternational && (
        <Card className="bg-[#0a2a0a] border-green-500/40">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-green-400" />
              TwinPaay — International Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`rounded-lg p-3 flex items-center gap-3 ${form.twinPaayEnabled ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${form.twinPaayEnabled ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                {form.twinPaayEnabled ? "✓" : "!"}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{form.twinPaayEnabled ? "TwinPaay Active" : "TwinPaay Required — Not Yet Enabled"}</p>
                <p className="text-white/60 text-xs">{form.twinPaayEnabled ? "Multi-currency payments and cross-border financial compliance are active for this event." : "Please return to Step 1 and enable TwinPaay to proceed with this international event."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-[#2a020d] border-[#4a0a1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Palette className="w-5 h-5" />
            {isCorporate ? "Branding & Style" : isGovernmentPublic ? "Visual Identity & Style" : "Style & Design Preferences"}
          </CardTitle>
          <p className="text-white/60 text-sm">{isCorporate ? "Share your brand identity and event style preferences" : isGovernmentPublic ? "Share the visual identity and official styling requirements" : "Help us understand your aesthetic vision"}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={labelStyle}>Décor Style</label>
            <select
              value={form.decorStyle}
              onChange={e => update("decorStyle", e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-black"
            >
              <option value="">Select a style...</option>
              {decorStyles.map(s => (
                <option key={s} value={s.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelStyle}>Color Theme / Palette</label>
            <Input
              value={form.colorTheme}
              onChange={e => update("colorTheme", e.target.value)}
              placeholder={isCorporate ? "e.g. Navy blue and silver, Brand colors" : "e.g. Blush pink and gold, Sage green and ivory"}
              className={inputStyle}
            />
          </div>

          <div>
            <label className={labelStyle}>Mood & Atmosphere</label>
            <Textarea
              value={form.moodDescription}
              onChange={e => update("moodDescription", e.target.value)}
              placeholder={isCorporate
                ? "e.g. Professional yet approachable, innovative and dynamic..."
                : "e.g. Warm and intimate, fun and energetic, elegant and timeless..."
              }
              className={inputStyle}
              rows={2}
            />
          </div>

          {(isCorporate || isGovernmentPublic || isInternational) && (
            <div>
              <label className={labelStyle}>Branding Requirements</label>
              <Textarea
                value={form.brandingRequirements}
                onChange={e => update("brandingRequirements", e.target.value)}
                placeholder={isGovernmentPublic ? "Official insignia, government branding guidelines, approved colour schemes..." : isInternational ? "Multi-language branding, international style guides, flag/country representation..." : "Logo placement, corporate identity guidelines, branded materials needed..."}
                className={inputStyle}
                rows={2}
              />
            </div>
          )}

          <div>
            <label className={labelStyle}>Inspiration Sources</label>
            <Input
              value={form.inspirationSources}
              onChange={e => update("inspirationSources", e.target.value)}
              placeholder="Pinterest boards, Instagram accounts, magazines, or reference images..."
              className={inputStyle}
            />
          </div>

          <div>
            <label className={labelStyle}>Special Décor Requests</label>
            <Textarea
              value={form.specialDecorRequests}
              onChange={e => update("specialDecorRequests", e.target.value)}
              placeholder="Any specific décor items, floral arrangements, lighting effects, or special installations..."
              className={inputStyle}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#2a020d] border-[#4a0a1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Cultural & Special Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className={labelStyle}>Cultural, Religious, or Traditional Requirements</label>
            <Textarea
              value={form.culturalNeeds}
              onChange={e => update("culturalNeeds", e.target.value)}
              placeholder="Any cultural traditions, religious ceremonies, dietary laws, dress codes, or special customs to incorporate..."
              className={inputStyle}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
  };

  const addWizardGuest = () => {
    if (!wizardGuestForm.firstName.trim()) {
      toast({ title: "First name is required", variant: "destructive" });
      return;
    }
    setWizardGuests(prev => [...prev, { ...wizardGuestForm }]);
    setWizardGuestForm({ firstName: "", lastName: "", email: "", phone: "" });
  };

  const removeWizardGuest = (index: number) => {
    setWizardGuests(prev => prev.filter((_, i) => i !== index));
  };

  const handleWizardCsvImportFromText = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "Please include a header row and at least one guest", variant: "destructive" });
      return;
    }
    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    const firstNameIdx = headers.findIndex(h => h.includes("first") || h === "firstname");
    const lastNameIdx = headers.findIndex(h => h.includes("last") || h === "lastname" || h === "surname");
    const emailIdx = headers.findIndex(h => h.includes("email"));
    const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile"));
    const groupIdx = headers.findIndex(h => h.includes("group") || h.includes("category"));
    const dietaryIdx = headers.findIndex(h => h.includes("diet"));
    const tableIdx = headers.findIndex(h => h.includes("table"));
    const nameIdx = headers.findIndex(h => h === "name" || h === "full name" || h === "fullname");

    const parsed = lines.slice(1).filter(l => l.trim()).map(line => {
      const cols = line.split(",").map(c => c.trim());
      let firstName = firstNameIdx >= 0 ? cols[firstNameIdx] : "";
      let lastName = lastNameIdx >= 0 ? cols[lastNameIdx] : "";
      if (!firstName && nameIdx >= 0) {
        const parts = (cols[nameIdx] || "").split(" ");
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
      }
      return {
        firstName: firstName || "Guest",
        lastName: lastName || "",
        email: emailIdx >= 0 ? cols[emailIdx] || "" : "",
        phone: phoneIdx >= 0 ? cols[phoneIdx] || "" : "",
        group: groupIdx >= 0 ? cols[groupIdx] || "General" : "General",
        dietaryRequirements: dietaryIdx >= 0 ? cols[dietaryIdx] || "None" : "None",
        tableAssignment: tableIdx >= 0 ? cols[tableIdx] || "" : "",
      };
    });

    if (parsed.length === 0) {
      toast({ title: "No guests found in CSV", variant: "destructive" });
      return;
    }
    setWizardGuests(prev => [...prev, ...parsed]);
    setWizardCsvText("");
    setShowCsvImport(false);
    toast({ title: `${parsed.length} guest(s) imported` });
  };

  const handleWizardCsvImport = () => {
    handleWizardCsvImportFromText(wizardCsvText);
  };

  const renderGuestStep = () => (
    <div className="space-y-6">
      <Card className="bg-[#2a020d] border-[#4a0a1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Guests
          </CardTitle>
          <p className="text-white/60 text-sm">Start adding your guest list now, or skip this step and manage guests later from the event dashboard</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelStyle}>First Name *</label>
              <Input
                value={wizardGuestForm.firstName}
                onChange={e => setWizardGuestForm(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="e.g. John"
                className={inputStyle}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addWizardGuest(); } }}
              />
            </div>
            <div>
              <label className={labelStyle}>Last Name</label>
              <Input
                value={wizardGuestForm.lastName}
                onChange={e => setWizardGuestForm(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="e.g. Smith"
                className={inputStyle}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addWizardGuest(); } }}
              />
            </div>
            <div>
              <label className={labelStyle}>Email</label>
              <Input
                value={wizardGuestForm.email}
                onChange={e => setWizardGuestForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. john@example.com"
                type="email"
                className={inputStyle}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addWizardGuest(); } }}
              />
            </div>
            <div>
              <label className={labelStyle}>Phone</label>
              <Input
                value={wizardGuestForm.phone}
                onChange={e => setWizardGuestForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. +44 7xxx xxx xxx"
                className={inputStyle}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addWizardGuest(); } }}
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={addWizardGuest}
            className="bg-white text-[#330311] font-semibold hover:bg-gray-100"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add Guest
          </Button>

          <div className="border-t border-[#4a0a1e] pt-4">
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-white/30 text-white text-sm font-medium cursor-pointer hover:bg-white/10 transition-colors">
                <FileUp className="w-4 h-4" />
                Upload CSV File
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      if (text) {
                        handleWizardCsvImportFromText(text);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCsvImport(!showCsvImport)}
                className="text-white border-white/30"
              >
                <Upload className="w-4 h-4 mr-1" />
                {showCsvImport ? "Hide Paste Area" : "Paste CSV"}
              </Button>
            </div>
            <p className="text-white/40 text-xs mt-2">Supported columns: first name, last name (or full name), email, phone, group, dietary, table</p>

            {showCsvImport && (
              <div className="mt-3 space-y-3">
                <Textarea
                  value={wizardCsvText}
                  onChange={e => setWizardCsvText(e.target.value)}
                  placeholder={"first name,last name,email,phone\nJohn,Smith,john@example.com,+447000000000\nJane,Doe,jane@example.com,+447000000001"}
                  className={inputStyle}
                  rows={6}
                />
                <Button
                  type="button"
                  onClick={handleWizardCsvImport}
                  disabled={!wizardCsvText.trim()}
                  className="bg-white text-[#330311] font-medium"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Import Guests
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {wizardGuests.length > 0 && (
        <Card className="bg-[#2a020d] border-[#4a0a1e]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Guest List ({wizardGuests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {wizardGuests.map((g, i) => (
                <div key={i} className="flex items-center justify-between bg-[#1a0108] rounded-lg px-4 py-3 border border-[#4a0a1e]">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{g.firstName} {g.lastName}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-white/50">
                      {g.email && <span>{g.email}</span>}
                      {g.phone && <span>{g.phone}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWizardGuest(i)}
                    className="ml-2 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {wizardGuests.length === 0 && (
        <div className="text-center py-6">
          <Users className="w-10 h-10 text-white/20 mx-auto mb-2" />
          <p className="text-white/40 text-sm">No guests added yet</p>
          <p className="text-white/30 text-xs mt-1">You can skip this step and add guests later from the event dashboard</p>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => {
    const selectedServices = services.filter(s => (form as any)[s.key]);
    const currSymbol = currencies.find(c => c.code === form.currency)?.symbol || "";

    return (
      <Card className="bg-[#2a020d] border-[#4a0a1e]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Review Your Event
          </CardTitle>
          <p className="text-white/60 text-sm">Please review the details below before creating your event</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <ReviewItem label="Event Name" value={form.name} />
            <ReviewItem label="Type" value={`${eventType === "wedding" ? "Wedding" : eventType === "corporate" ? "Corporate" : eventType === "celebration" ? "Celebration" : eventType === "ticketing" ? "Entertainment & Ticketing" : eventType === "day_coordination" ? "Day Coordination" : "Children's Party"} - ${form.eventCategory}`} />
            {!isWedding && (
              <ReviewItem label="Duration" value={`${form.eventDays} day${Number(form.eventDays) > 1 ? "s" : ""}`} />
            )}
            {!isWedding && Number(form.eventDays) <= 1 && (
              <>
                <ReviewItem label="Event Date" value={form.startDate} />
                {(form.startTime || form.endTime) && (
                  <ReviewItem label="Time" value={`${form.startTime || "TBC"} – ${form.endTime || "TBC"}`} />
                )}
              </>
            )}
            {!isWedding && Number(form.eventDays) > 1 && (
              <div className="col-span-full">
                <p className="text-white/70 text-sm font-medium mb-2">Day-by-Day Schedule</p>
                <div className="space-y-1">
                  {daySchedule.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm bg-[#1a0108] rounded px-3 py-2 border border-[#4a0a1e]">
                      <span className="bg-white text-[#330311] text-xs font-bold px-2 py-0.5 rounded-full">Day {i + 1}</span>
                      <span className="text-white/70">{d.description}</span>
                      <span className="text-white/50 ml-auto">{d.date || "No date"}</span>
                      {(d.startTime || d.endTime) && (
                        <span className="text-white/50">{d.startTime || "?"} – {d.endTime || "?"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ReviewItem label="Location" value={`${form.city}, ${form.country}`} />
            <ReviewItem label="Guest Count" value={form.guestCount} />
            <ReviewItem label="Budget" value={form.budget ? `${currSymbol}${Number(form.budget).toLocaleString()}` : form.budgetRange || "Not specified"} />
            {!isWedding && form.ceremonyVenue && <ReviewItem label="Main Venue" value={form.ceremonyVenue} />}
            {!isWedding && form.receptionVenue && <ReviewItem label="Secondary Venue" value={form.receptionVenue} />}
            <ReviewItem label="Online RSVP" value={form.rsvpEnabled ? "Enabled" : "Disabled"} />
            <ReviewItem label="Event Website" value={form.eventWebsiteEnabled ? "Enabled" : "Disabled"} />
            {companyLogoFile && <ReviewItem label="Company Logo" value={companyLogoFile.name} />}
          </div>

          {isWedding && (
            <div className="border-t border-[#4a0a1e] pt-4">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Wedding Scopes</p>
              <p className="text-white/40 text-[10px] mb-3">Each scope below will be created as a separate plannable event with its own dashboard, budget, vendors, and timeline.</p>
              <div className="space-y-2">
                {weddingEvents.filter(e => e.enabled).map(evt => {
                  const scopeLabel = evt.type === "Traditional" ? "Traditional Engagement"
                    : evt.type === "Church Wedding" ? "Church Wedding"
                    : evt.type === "Reception" ? "Reception (Party)"
                    : "After Party";
                  return (
                  <div key={evt.type} className="bg-[#1a0108] rounded-lg px-4 py-3 border border-[#4a0a1e]">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-semibold text-sm">{scopeLabel}</span>
                        <span className="ml-2 text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full uppercase">Separate Scope</span>
                      </div>
                      <span className="text-white/50 text-xs">{evt.date || "Date TBC"}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1 text-xs text-white/50">
                      {evt.venue && <span>Venue: {evt.venue}</span>}
                      {evt.city && <span>Location: {evt.city}</span>}
                      {evt.guestCount && <span>Guests: {evt.guestCount}</span>}
                    </div>
                    {evt.type === "Church Wedding" && evt.churchName && (
                      <div className="flex flex-wrap gap-4 mt-1 text-xs text-white/50">
                        <span>Church: {evt.churchName}</span>
                        {evt.churchLocation && <span>at {evt.churchLocation}</span>}
                      </div>
                    )}
                    {evt.description && <p className="text-white/40 text-xs mt-1">{evt.description}</p>}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {isTicketing && (form.venueType || form.expectedCapacity || form.performersArtists || form.ticketTypes || form.ageRestriction) && (
            <div className="border-t border-[#4a0a1e] pt-4">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Ticketing & Entertainment Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {form.venueType && <ReviewItem label="Venue Type" value={form.venueType} />}
                {form.expectedCapacity && <ReviewItem label="Expected Capacity" value={form.expectedCapacity} />}
                {form.performersArtists && <ReviewItem label="Performers / Artists" value={form.performersArtists} />}
                {form.ageRestriction && <ReviewItem label="Age Restriction" value={form.ageRestriction} />}
                {form.ticketTypes && <ReviewItem label="Ticket Types" value={form.ticketTypes} />}
              </div>
            </div>
          )}

          {isDayCoordination && (
            <div className="border-t border-[#4a0a1e] pt-4">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Day Coordination Details</p>
              <div className="bg-[#1a0108] rounded-lg px-4 py-3 border border-[#ffffff]/30 mb-3">
                <p className="text-[#ffffff] text-xs font-semibold uppercase tracking-wider mb-2">Standalone Day Coordination Service</p>
                <p className="text-white/60 text-xs">Event Perfekt will manage the event day only. The client has completed all planning.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                <ReviewItem label="Client Contact" value={form.clientContactOnDay} />
                {form.clientContactPhone && <ReviewItem label="Contact Phone" value={form.clientContactPhone} />}
                {form.emergencyContact && <ReviewItem label="Emergency Contact" value={`${form.emergencyContact}${form.emergencyContactPhone ? ` (${form.emergencyContactPhone})` : ""}`} />}
                <ReviewItem label="EP Coordinators" value={`${form.numberOfCoordinators} coordinator${Number(form.numberOfCoordinators) > 1 ? "s" : ""}`} />
                {form.clientPlannerName && <ReviewItem label="Client's Planner" value={form.clientPlannerName} />}
                {form.setupTime && <ReviewItem label="EP Arrival Time" value={form.setupTime} />}
              </div>
              {(form.cateringVendor || form.decorVendor || form.entertainmentVendor || form.photographyVendor || form.otherVendorsList) && (
                <div className="mt-3">
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Vendors to Coordinate</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    {form.cateringVendor && <ReviewItem label="Catering" value={form.cateringVendor} />}
                    {form.decorVendor && <ReviewItem label="Décor" value={form.decorVendor} />}
                    {form.entertainmentVendor && <ReviewItem label="Entertainment" value={form.entertainmentVendor} />}
                    {form.photographyVendor && <ReviewItem label="Photography" value={form.photographyVendor} />}
                    {form.otherVendorsList && <ReviewItem label="Other Vendors" value={form.otherVendorsList} />}
                  </div>
                </div>
              )}
              <div className="mt-3">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Coordination Scope</p>
                <div className="flex flex-wrap gap-2">
                  {dayCoordinationServices.filter(s => (form as any)[s.key]).map(s => (
                    <span key={s.key} className="px-3 py-1 bg-[#ffffff]/20 text-[#ffffff] text-xs rounded-full border border-[#ffffff]/30">{s.label}</span>
                  ))}
                </div>
              </div>
              {form.existingTimeline && (
                <div className="mt-3">
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Client's Timeline</p>
                  <pre className="text-white/70 text-xs whitespace-pre-wrap bg-[#1a0108] rounded p-3 border border-[#4a0a1e]">{form.existingTimeline}</pre>
                </div>
              )}
              {form.dayOfNotes && (
                <div className="mt-3">
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Day-of Notes</p>
                  <p className="text-white/70 text-sm">{form.dayOfNotes}</p>
                </div>
              )}
            </div>
          )}

          {!isDayCoordination && selectedServices.length > 0 && (
            <div className="border-t border-[#4a0a1e] pt-4">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Services Selected</p>
              <div className="flex flex-wrap gap-2">
                {selectedServices.map(s => (
                  <span key={s.key} className="px-3 py-1 bg-[#4a0a1e] text-white text-xs rounded-full">{s.label}</span>
                ))}
              </div>
            </div>
          )}

          {(form.decorStyle || form.colorTheme || form.moodDescription) && (
            <div className="border-t border-[#4a0a1e] pt-4">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Style Preferences</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {form.decorStyle && <ReviewItem label="Décor Style" value={form.decorStyle} />}
                {form.colorTheme && <ReviewItem label="Color Theme" value={form.colorTheme} />}
                {form.moodDescription && <ReviewItem label="Mood" value={form.moodDescription} />}
              </div>
            </div>
          )}

          {form.culturalNeeds && (
            <div className="border-t border-[#4a0a1e] pt-4">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Cultural Requirements</p>
              <p className="text-white text-sm">{form.culturalNeeds}</p>
            </div>
          )}

          {wizardGuests.length > 0 && (
            <div className="border-t border-[#4a0a1e] pt-4">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-3">Guests to Add ({wizardGuests.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {wizardGuests.map((g, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-[#1a0108] rounded px-3 py-2 border border-[#4a0a1e]">
                    <span className="text-white font-medium">{g.firstName} {g.lastName}</span>
                    {g.email && <span className="text-white/50 text-xs">{g.email}</span>}
                    {g.phone && <span className="text-white/50 text-xs">{g.phone}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ReviewItem = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-white/50 text-xs">{label}</p>
      <p className="text-white text-sm font-medium">{value || "—"}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#330311]">
      <header className="bg-[#2a020d] border-b border-[#4a0a1e] px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <img
              src={eventPerfektLogo}
              alt="Event Perfekt"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-md ring-1 ring-white/10 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setLocation("/planner-dashboard")}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/planner-dashboard")}
              className="text-white text-xs sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h1 className="text-base sm:text-xl font-bold text-white">Create New Event</h1>
          </div>
          {eventType && (
            <span className="text-white/60 text-xs sm:text-sm">
              Step {step} of {totalSteps}: {stepTitles[step - 1]}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {!eventType ? (
          <div>
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                {mainCategory === "" ? "What type of event are you planning?" : mainCategory === "corporate" ? "Corporate Events" : "Private Events"}
              </h2>
              <p className="text-white/60 text-sm sm:text-base">
                {mainCategory === "" ? "Choose the category that best fits your event" : mainCategory === "corporate" ? "Select the specific event type below" : "Select the specific event type below"}
              </p>
            </div>

            {/* Day Coordination — always visible */}
            <Card
              className="cursor-pointer border-2 border-[#ffffff]/30 bg-gradient-to-br from-white to-[#FFF8E7] hover:border-[#ffffff] transition-colors mb-4 sm:mb-6"
              onClick={() => setEventType("day_coordination")}
            >
              <CardContent className="flex flex-col sm:flex-row items-center gap-3 p-4 sm:p-5">
                <div className="flex items-center gap-2 shrink-0">
                  <UserCheck className="w-8 h-8 text-[#330311]" />
                  <Shield className="w-6 h-6 text-[#ffffff]" />
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h3 className="font-bold text-[#330311] text-base sm:text-lg">Day Coordination Only</h3>
                  <p className="text-[#ffffff] text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Standalone Service — Already planned? We'll run the day for you</p>
                </div>
                <ArrowRight className="w-5 h-5 text-[#ffffff] hidden sm:block" />
              </CardContent>
            </Card>

            {/* ── LEVEL 1: Two Main Category Cards ───────────────────── */}
            {mainCategory === "" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8">
                {/* Corporate Events */}
                <Card
                  className="cursor-pointer border-2 border-transparent bg-gradient-to-br from-[#1a2744] to-[#0d1a33] hover:border-[#4a90d9] transition-all group"
                  onClick={() => setMainCategory("corporate")}
                >
                  <CardContent className="p-6 sm:p-8 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#4a90d9]/20 border border-[#4a90d9]/40 flex items-center justify-center group-hover:bg-[#4a90d9]/30 transition-all">
                      <Building2 className="w-8 h-8 text-[#4a90d9]" />
                    </div>
                    <div>
                      <h3 className="text-white text-xl sm:text-2xl font-bold mb-2">Corporate Events</h3>
                      <p className="text-white/60 text-sm leading-relaxed">
                        Business events, government & public sector, charities, education, entertainment, and international events.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                      {["Corporate", "Government", "Charity & NGO", "Education", "Entertainment", "International"].map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 bg-[#4a90d9]/15 text-[#4a90d9] border border-[#4a90d9]/25 rounded-full">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[#4a90d9] text-sm font-semibold mt-1">
                      Select <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>

                {/* Private Events */}
                <Card
                  className="cursor-pointer border-2 border-transparent bg-gradient-to-br from-[#3d0d22] to-[#2a0218] hover:border-[#e07a9a] transition-all group"
                  onClick={() => setMainCategory("private")}
                >
                  <CardContent className="p-6 sm:p-8 text-center flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#e07a9a]/20 border border-[#e07a9a]/40 flex items-center justify-center group-hover:bg-[#e07a9a]/30 transition-all">
                      <Heart className="w-8 h-8 text-[#e07a9a]" />
                    </div>
                    <div>
                      <h3 className="text-white text-xl sm:text-2xl font-bold mb-2">Private Events</h3>
                      <p className="text-white/60 text-sm leading-relaxed">
                        Weddings, celebrations, children's parties, private & social gatherings, and personal milestone events.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                      {["Weddings", "Celebrations", "Children's Parties", "Private & Social"].map(t => (
                        <span key={t} className="text-xs px-2.5 py-1 bg-[#e07a9a]/15 text-[#e07a9a] border border-[#e07a9a]/25 rounded-full">{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[#e07a9a] text-sm font-semibold mt-1">
                      Select <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── LEVEL 2: Corporate Sub-Types ────────────────────────── */}
            {mainCategory === "corporate" && (
              <div>
                <button
                  type="button"
                  onClick={() => setMainCategory("")}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to all categories
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <Card className="cursor-pointer border-2 border-transparent bg-white hover:border-[#330311] transition-colors" onClick={() => setEventType("corporate")}>
                    <CardHeader className="text-center pb-2">
                      <Building2 className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">Corporate Business</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">Conferences, seminars, product launches, galas, team building, exhibitions, and awards ceremonies.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Conference", "Gala", "Product Launch", "Team Building"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-[#330311]/10 text-[#330311] rounded-full">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer border-2 border-transparent bg-white hover:border-[#330311] transition-colors" onClick={() => setEventType("government_public")}>
                    <CardHeader className="text-center pb-2">
                      <Landmark className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">Government & Public Sector</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">Government summits, public consultations, civic ceremonies, ministerial events, and public sector conferences.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Summit", "Civic Ceremony", "Conference", "Awards"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-[#330311]/10 text-[#330311] rounded-full">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer border-2 border-transparent bg-white hover:border-[#330311] transition-colors" onClick={() => setEventType("charity_community")}>
                    <CardHeader className="text-center pb-2">
                      <Sparkles className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">Charity, NGO & Community</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">Charity galas, fundraisers, awareness campaigns, community festivals, and non-profit events.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Charity Gala", "Fundraiser", "Community Fair", "Auction"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-[#330311]/10 text-[#330311] rounded-full">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer border-2 border-transparent bg-white hover:border-[#330311] transition-colors" onClick={() => setEventType("education")}>
                    <CardHeader className="text-center pb-2">
                      <BookOpen className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">Education</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">School proms, graduation ceremonies, open days, academic conferences, student awards, and university balls.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Graduation", "Prom", "Open Day", "University Ball"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-[#330311]/10 text-[#330311] rounded-full">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer border-2 border-transparent bg-white hover:border-[#330311] transition-colors" onClick={() => setEventType("ticketing")}>
                    <CardHeader className="text-center pb-2">
                      <Ticket className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">Entertainment & Ticketing</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">Concerts, exhibitions, festivals, theatre shows, comedy nights, fashion shows, and ticketed events.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Concert", "Exhibition", "Festival", "Theatre"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-[#330311]/10 text-[#330311] rounded-full">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer border-2 border-[#E0C06A]/40 bg-gradient-to-br from-white to-[#FFF8E7] hover:border-[#330311] transition-colors" onClick={() => setEventType("international_cross_border")}>
                    <CardHeader className="text-center pb-2">
                      <Globe2 className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">International Cross-Border</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">Destination weddings, global summits, diaspora events, multi-country tours, and international conferences.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Destination Wedding", "Global Summit", "Diaspora Event", "TwinPaay"].map(t => (
                          <span key={t} className={`text-xs px-2 py-0.5 rounded-full ${t === "TwinPaay" ? "bg-[#E0C06A] text-[#330311] font-semibold" : "bg-[#330311]/10 text-[#330311]"}`}>{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* ── LEVEL 2: Private Sub-Types ───────────────────────────── */}
            {mainCategory === "private" && (
              <div>
                <button
                  type="button"
                  onClick={() => setMainCategory("")}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to all categories
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <Card className="cursor-pointer border-2 border-transparent bg-white hover:border-[#330311] transition-colors" onClick={() => setEventType("wedding")}>
                    <CardHeader className="text-center pb-2">
                      <Heart className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">Wedding</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">Traditional, destination, civil ceremonies, engagement parties, bridal showers, and vow renewals.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Traditional", "Destination", "Civil Ceremony", "Reception"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-[#330311]/10 text-[#330311] rounded-full">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer border-2 border-transparent bg-white hover:border-[#330311] transition-colors" onClick={() => setEventType("celebration")}>
                    <CardHeader className="text-center pb-2">
                      <PartyPopper className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">Celebration</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">Birthdays, anniversaries, graduations, baby showers, retirement parties, and family reunions.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Birthday", "Anniversary", "Baby Shower", "Graduation"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-[#330311]/10 text-[#330311] rounded-full">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer border-2 border-transparent bg-white hover:border-[#330311] transition-colors" onClick={() => setEventType("childrens_party")}>
                    <CardHeader className="text-center pb-2">
                      <Cake className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">Children's Party</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">Themed parties, pool parties, garden parties, arts & crafts, sports days, and carnival fun fairs.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Themed Party", "Pool Party", "Sports Party", "Carnival"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-[#330311]/10 text-[#330311] rounded-full">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer border-2 border-transparent bg-white hover:border-[#330311] transition-colors" onClick={() => setEventType("private_social")}>
                    <CardHeader className="text-center pb-2">
                      <Home className="w-10 h-10 text-[#330311] mx-auto mb-2" />
                      <CardTitle className="text-[#330311] text-xl">Private & Social</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-gray-600">
                      <p className="mb-3 text-sm">Dinner parties, house parties, garden parties, family gatherings, reunions, and intimate social occasions.</p>
                      <div className="flex flex-wrap gap-1 justify-center">
                        {["Dinner Party", "Garden Party", "Reunion", "Cocktail Party"].map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 bg-[#330311]/10 text-[#330311] rounded-full">{t}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => { setEventType(""); setStep(1); setMainCategory(""); }}
                className="text-white text-sm underline"
              >
                ← Change event type
              </button>
              <span className="text-white font-medium">
                {eventType === "wedding" ? "Wedding" : eventType === "corporate" ? "Corporate Event" : eventType === "celebration" ? "Celebration" : eventType === "ticketing" ? "Entertainment & Ticketing" : eventType === "day_coordination" ? "Day Coordination" : eventType === "government_public" ? "Government & Public Sector" : eventType === "charity_community" ? "Charity & Community" : eventType === "education" ? "Education" : eventType === "private_social" ? "Private & Social" : eventType === "international_cross_border" ? "International Cross-Border" : "Children's Party"}
              </span>
            </div>

            {isDayCoordination && (
              <div className="bg-[#ffffff]/15 border border-[#ffffff]/40 rounded-lg p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-[#ffffff] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white font-bold text-sm sm:text-base mb-1">Day Coordination Only</h3>
                    <p className="text-white/80 text-xs sm:text-sm leading-relaxed mb-2">
                      This service is for events you have already planned yourself. Event Perfekt will come on the day and coordinate everything — managing your vendors, guests, ushers, food flow, timeline, and ensuring it all runs smoothly. We are not planning the event, just running it on the day.
                    </p>
                    <p className="text-white/60 text-xs">
                      Need full event planning from start to finish?{" "}
                      <button
                        type="button"
                        onClick={() => { setEventType(""); setStep(1); setMainCategory(""); }}
                        className="text-[#ffffff] underline font-semibold hover:text-[#E0C06A]"
                      >
                        Go back and choose a full planning option
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {renderStepIndicator()}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && (isDayCoordination ? renderDCStep3() : renderStep3())}
            {step === 4 && (isDayCoordination ? renderDCStep4() : renderStep4())}
            {step === 5 && renderGuestStep()}
            {step === 6 && renderStep5()}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
              {step > 1 && (
                <Button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="w-full sm:w-auto flex-1 bg-[#4a0a1e] text-white border border-white/20 hover:bg-[#5a1a2e] font-medium"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
              {step < totalSteps ? (
                <Button
                  type="button"
                  onClick={() => {
                    if (!canProceed) {
                      toast({ title: "Please fill in the required fields", variant: "destructive" });
                      return;
                    }
                    setStep(s => s + 1);
                  }}
                  className="w-full sm:w-auto bg-white text-[#330311] font-bold px-8 hover:bg-gray-100"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-white text-[#330311] font-bold px-8 hover:bg-gray-100 disabled:opacity-60"
                >
                  {isSubmitting ? "Creating Event..." : "Create Event"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      <FormHelperBot formContext="create-event" welcomeMessage="Welcome! I'll guide you through creating your event. Ask me about any step or field you're unsure about." suggestedQuestions={["What's the difference between full planning and day coordination?", "What details do I need for step 1?", "Can I change things later?"]} />
    </div>
  );
}
