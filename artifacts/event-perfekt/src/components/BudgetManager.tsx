import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Edit2, Trash2, Calculator, TrendingUp, AlertTriangle, Check, X, PieChart, Target, Wallet, Star, CheckCircle2, Sparkles, Calendar, TrendingDown, ChevronDown, ChevronRight, FileText, Printer, Download, Search, Filter, Package, Zap, ClipboardList, Users, Building2, Truck, Lightbulb, Music, Camera, Flower2, Utensils, Wine, Tent, Plug, Shield, Gift, FileCheck, Megaphone, Shirt, HelpCircle, LayoutTemplate, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";

interface BudgetCategory {
  name: string;
  icon: string;
  subcategories: string[];
}

const COMPREHENSIVE_CATEGORIES: BudgetCategory[] = [
  {
    name: "Venue & Facility",
    icon: "building",
    subcategories: [
      "Venue Hire/Rental", "Venue Security Deposit", "Venue Setup Fee", "Venue Cleanup Fee",
      "Venue Insurance", "Second Venue (Ceremony)", "Rehearsal Venue", "After-Party Venue",
      "Venue Overtime Charges", "Venue Corkage Fee", "Parking Facility", "Restroom Facilities/Portable Toilets",
      "Changing/Dressing Rooms", "Bridal Suite", "Green Room/Backstage", "Coat Check Area",
      "Kids Play Area", "Smoking Area Setup", "Disability Access Setup"
    ]
  },
  {
    name: "Catering & Food",
    icon: "utensils",
    subcategories: [
      "Main Course Menu", "Starters/Appetizers", "Dessert Station", "Wedding/Event Cake",
      "Cake Cutting Service", "Late Night Snack Station", "Cocktail Hour Canapés",
      "Food Tasting Session", "Children's Menu", "Vegetarian/Vegan Options", "Halal/Kosher Menu",
      "Food Stations/Live Cooking", "Sushi/Raw Bar", "Waiter Service Staff", "Kitchen Staff",
      "Cooking Gas/Fuel", "Disposable Plates/Cutlery", "Chafing Dishes/Equipment Hire",
      "Ice/Coolers/Refrigeration", "Water Station/Dispensers", "Chef Fee", "Grazing Table",
      "Dessert Table", "Candy/Sweet Cart", "Popcorn/Cotton Candy Machine"
    ]
  },
  {
    name: "Beverages & Bar",
    icon: "wine",
    subcategories: [
      "Bar Setup & Service", "Bartenders", "Alcoholic Beverages (Spirits)", "Wine Selection",
      "Champagne/Sparkling Wine", "Beer", "Cocktail Menu/Signature Drinks", "Non-Alcoholic Beverages",
      "Soft Drinks/Juices", "Water (Still & Sparkling)", "Tea & Coffee Station", "Mocktail Bar",
      "Bar Equipment Hire", "Glassware Hire", "Ice & Coolers", "Bar Runners/Napkins",
      "Corkage Fee", "Drink Garnishes & Mixers"
    ]
  },
  {
    name: "Décor & Styling",
    icon: "sparkles",
    subcategories: [
      "Theme Design & Concept", "Colour Scheme Implementation", "Backdrop/Feature Wall",
      "Entrance/Foyer Décor", "Ceremony Décor", "Reception Décor", "Stage Décor",
      "Table Centrepieces", "Table Runners/Overlays", "Chair Covers & Sashes",
      "Chair Décor/Ribbons", "Ceiling Treatment/Draping", "Wall Draping/Fabric",
      "Aisle Runner/Carpet", "Aisle Décor/Pew Ends", "Arch/Arbour/Mandap/Chuppah",
      "Signage/Welcome Board", "Table Numbers/Names", "Place Cards/Settings",
      "Menu Display Boards", "Photo Display", "Memory Table", "Gift Table Décor",
      "Cake Table Décor", "Head Table Décor", "Lounge Area Styling",
      "Outdoor Area Décor", "Balloon Installation", "Props & Accessories",
      "Candles/Candelabras", "Lanterns/Votives", "Carpet/Red Carpet", "Stanchions/Rope Barriers"
    ]
  },
  {
    name: "Flowers & Floral",
    icon: "flower",
    subcategories: [
      "Bridal Bouquet", "Bridesmaids Bouquets", "Buttonholes/Boutonnieres", "Corsages",
      "Flower Girl Basket/Crown", "Ceremony Arrangement", "Altar/Arch Flowers",
      "Pew End Flowers", "Reception Centrepieces (Floral)", "Top Table Flowers",
      "Cake Flowers", "Hair Flowers", "Welcome Arrangement", "Buffet/Bar Flowers",
      "Restroom Flowers", "Flower Wall/Backdrop", "Hanging Installations",
      "Loose Petals/Confetti", "Floral Preservation", "Delivery & Setup"
    ]
  },
  {
    name: "Lighting & Effects",
    icon: "lightbulb",
    subcategories: [
      "Ambient/Uplighting", "Fairy Lights/String Lights", "Chandeliers",
      "Stage Lighting", "Dance Floor Lighting", "Spot Lights", "Follow Spot",
      "LED Screens/Panels", "Gobo Projection/Monogram Light", "Laser Lights",
      "Neon Signs", "Candle Lighting", "Outdoor/Garden Lighting",
      "Pathway Lighting", "Festoon Lights", "Pin Spot Lighting",
      "Colour Wash", "Haze/Fog Machine", "Dry Ice", "Confetti Machine",
      "Bubble Machine", "Fireworks", "Sparklers", "Cold Sparks/Pyrotechnics",
      "CO2 Jets", "Lighting Technician", "Lighting Rigging & Setup"
    ]
  },
  {
    name: "Sound & Audio-Visual",
    icon: "music",
    subcategories: [
      "PA System/Sound System", "Microphones (Wireless/Lapel/Handheld)", "Speakers/Monitors",
      "Mixing Console/Sound Desk", "Sound Engineer", "AV Technician",
      "Projector & Screen", "LED Video Wall/Screens", "Presentation/Slides Setup",
      "Live Streaming Equipment", "Live Stream Production", "Internet/WiFi Provision",
      "Video Conferencing Setup", "Audio Recording", "Video Playback System",
      "Hearing Loop/Assisted Listening", "Walkie Talkies/Comms"
    ]
  },
  {
    name: "Photography & Videography",
    icon: "camera",
    subcategories: [
      "Lead Photographer", "Second Photographer", "Engagement/Pre-Event Shoot",
      "Bridal/Getting Ready Shoot", "Ceremony Coverage", "Reception Coverage",
      "Photo Editing/Post-Production", "Photo Album/Book", "Digital Gallery/USB",
      "Photo Prints/Enlargements", "Photo Booth", "Photo Booth Props",
      "360 Photo/Video Booth", "Drone Photography/Videography",
      "Lead Videographer", "Second Videographer", "Same-Day Edit Video",
      "Highlight Reel", "Full-Length Video", "Video Editing/Post-Production",
      "Raw Footage", "Cinematographer", "GoPro/Action Cameras",
      "Instant Print Photos", "Social Media Content Creator"
    ]
  },
  {
    name: "Entertainment & Music",
    icon: "music",
    subcategories: [
      "Live Band", "DJ", "MC/Host/Compere", "Traditional Musicians",
      "Cultural Performers", "Solo Artist/Singer", "Choir/Gospel Group",
      "String Quartet/Ensemble", "Saxophonist", "Pianist/Keyboardist",
      "Drummer/Percussionist", "Dancers/Dance Troupe",
      "Comedian", "Magician/Illusionist", "Acrobats/Circus Acts",
      "Fire Performer", "Face Painter/Caricaturist", "Kids Entertainer",
      "Casino/Games Tables", "Karaoke Machine", "Silent Disco",
      "Dance Floor Hire", "Dance Floor Wrapping", "Stage Hire",
      "Stage Setup/Rigging", "Green Room/Artist Hospitality",
      "Artist Travel & Accommodation", "Performance Rights/Licensing"
    ]
  },
  {
    name: "Stationery & Print",
    icon: "file",
    subcategories: [
      "Save the Dates", "Wedding/Event Invitations", "RSVP Cards",
      "Information Cards/Inserts", "Envelope Addressing/Calligraphy",
      "Postage/Delivery", "Order of Service/Ceremony Programs",
      "Menu Cards", "Place Cards/Name Cards", "Table Numbers/Names",
      "Welcome Signs", "Directional Signage", "Thank You Cards",
      "Guest Book", "Event Brochure/Programme", "Flyers/Handouts",
      "Banners/Pull-Up Banners", "Step & Repeat Banner",
      "Posters", "Branded Materials/Logo Design", "Name Badges/Lanyards",
      "Wristbands", "Ticket Printing"
    ]
  },
  {
    name: "Transportation & Logistics",
    icon: "truck",
    subcategories: [
      "Bridal/VIP Car", "Guest Shuttle/Bus", "Vendor Transportation",
      "Equipment Transportation/Haulage", "Airport Transfers",
      "Valet Parking Service", "Parking Attendants", "Parking Lot Hire",
      "Traffic Management", "LASTMA/Traffic Officers", "Fuel/Petrol",
      "Toll Fees", "Loading/Offloading Labour", "Delivery Vehicle Hire",
      "Motorcycle/Dispatch Riders", "Driver Hire", "Logistics Coordinator"
    ]
  },
  {
    name: "Accommodation & Hospitality",
    icon: "building",
    subcategories: [
      "Bridal Suite/Night Before", "Honeymoon Suite", "Guest Hotel Rooms",
      "VIP/Speaker Accommodation", "Vendor Accommodation",
      "Staff/Crew Accommodation", "Room Block Reservation",
      "Hotel Welcome Bags", "Room Decoration", "Late Checkout",
      "Guest House/Airbnb", "Breakfast/Meals for Guests"
    ]
  },
  {
    name: "Furniture & Equipment Hire",
    icon: "package",
    subcategories: [
      "Tables (Round/Rectangle/Cocktail)", "Chairs (Chiavari/Ghost/Tiffany/Banquet)",
      "Lounge Furniture/Sofas", "Bar/Counter", "Bar Stools",
      "Cocktail Tables/High Tables", "Kids Furniture", "Throne Chairs",
      "Stage/Platform", "Riser/Podium/Lectern", "Dance Floor",
      "Red Carpet/Carpet", "Stanchions & Ropes", "Easels/Display Stands",
      "Clothing Racks/Coat Hangers", "Registration Desk",
      "Charging Station", "Prayer Mats", "Table Linens/Cloths",
      "Napkins", "Crockery/China Hire", "Cutlery/Flatware Hire",
      "Glassware Hire", "Serving Platters/Bowls", "Drink Dispensers",
      "Ice Buckets/Wine Coolers", "Chafing Dishes", "Trolleys/Carts"
    ]
  },
  {
    name: "Tent, Marquee & Structure",
    icon: "tent",
    subcategories: [
      "Main Marquee/Tent", "Reception Tent", "Ceremony Canopy/Tent",
      "VIP/Cocktail Tent", "Kitchen/Catering Tent", "Bar Tent",
      "Kids/Play Tent", "Vendor/Backstage Tent",
      "Tent Flooring/Matting", "Tent Sidewalls/Lining",
      "Tent Air Conditioning/Fans", "Tent Heating",
      "Tent Lighting", "Tent Setup/Teardown Labour",
      "Gazebo/Pergola", "Clear Span Tent", "Stretch Tent",
      "Pagoda Tent", "Pop-Up Tent"
    ]
  },
  {
    name: "Power & Utilities",
    icon: "plug",
    subcategories: [
      "Generator Hire (Small)", "Generator Hire (Large/Industrial)",
      "Generator Fuel/Diesel", "Generator Operator",
      "Power Distribution Board", "Extension Cables/Power Strips",
      "Electrical Installation", "Electrician",
      "Water Supply/Connection", "Water Tanker",
      "Sewage/Waste Management", "Portable Toilets/Restrooms",
      "Luxury Toilet Trailers", "Toilet Attendant",
      "Hand Wash Stations", "Waste Bins/Disposal",
      "Skip Hire/Waste Removal"
    ]
  },
  {
    name: "Health, Safety & Security",
    icon: "shield",
    subcategories: [
      "Private Security Personnel", "Bouncers/Door Staff", "Police Detail",
      "LASTMA/Traffic Officers", "Fire Marshals",
      "First Aid/Medical Team", "Ambulance on Standby",
      "Nurse/Paramedic", "Doctor on Call",
      "Fire Extinguishers/Safety Equipment", "First Aid Kit",
      "Safety Signage", "Security Metal Detectors",
      "CCTV/Surveillance", "Crowd Control Barriers",
      "Health & Safety Inspection", "COVID-19 Compliance/Testing",
      "Sanitising Stations", "PPE/Masks"
    ]
  },
  {
    name: "Internal Team & Staff",
    icon: "users",
    subcategories: [
      "Event Planner Fee", "Day-of Coordinator", "Event Coordinator",
      "Project Manager", "Production Manager", "Stage Manager",
      "Floor Manager", "Ushers/Greeters", "Guest Manager",
      "Protocol Officer", "Registration/Check-in Staff",
      "Cleaners (Pre-Event)", "Cleaners (During Event)", "Cleaners (Post-Event)",
      "Decorators/Setup Crew", "Teardown/Breakdown Crew",
      "Carpenter", "Drapper/Fabric Installer", "Lights Installer",
      "Ceiling Installer", "Florist Setup Team",
      "Wardrobe Manager", "Wardrobe Assistants",
      "Graphics Artist", "3D Visualisation Artist",
      "Social Media Manager", "Content Creator",
      "Runner/Errand Staff", "Driver", "Personal Assistant",
      "Caterer Liaison", "Vendor Coordinator",
      "Staff Meals/Refreshments", "Staff Transportation",
      "Staff Uniforms/T-Shirts", "Staff ID/Badges"
    ]
  },
  {
    name: "Professional Services",
    icon: "briefcase",
    subcategories: [
      "Event Planning Consultancy", "Event Design/Styling Consultancy",
      "Legal/Contractual Services", "Insurance (Event Liability)",
      "Insurance (Cancellation/Postponement)", "Insurance (Equipment)",
      "Accounting/Financial Management", "Tax Advisory",
      "Translation/Interpreter Services", "Sign Language Interpreter",
      "Toastmaster/Master of Ceremonies", "Officiant/Celebrant Fee",
      "Religious Leader/Clergy", "Wedding/Event Celebrant",
      "Pre-Event Counselling", "PR/Media Relations"
    ]
  },
  {
    name: "Guest Experience & Gifts",
    icon: "gift",
    subcategories: [
      "Welcome Bags/Packs", "Guest Favours/Party Favours",
      "Gift Bags", "Souvenir Items", "Branded Merchandise",
      "Thank You Gifts (Vendors/Staff)", "Bridesmaid/Groomsmen Gifts",
      "Parents Gifts", "Kids Activity Packs/Goodie Bags",
      "Photo Frame Favours", "Edible Favours",
      "Charity Donation Favours", "Guest Transportation Gifts",
      "Late Night Snack Bags", "Hangover Kits"
    ]
  },
  {
    name: "Permits, Licenses & Legal",
    icon: "filecheck",
    subcategories: [
      "Event Permit/Council License", "Noise Permit/License",
      "Alcohol License (Temporary)", "Food Hygiene Certificate",
      "Music/Performance License (PRS/PPL)", "Street Closure Permit",
      "Fire Department Permit", "Police Notification/Permit",
      "Environmental Impact Assessment", "Vendor Permits",
      "Building/Structure Permit", "Health & Safety Certification",
      "Road Block/Closure Permit", "Filming Permit",
      "Drone Flight Permission"
    ]
  },
  {
    name: "Communication & Marketing",
    icon: "megaphone",
    subcategories: [
      "Event Website/App", "Social Media Campaign",
      "PR & Media Coverage", "Press Release/Media Kit",
      "Advertisement (Print/Online)", "Email Marketing/Mailchimp",
      "SMS/WhatsApp Broadcast", "Live Streaming Setup",
      "Event Hashtag Campaign", "Influencer/Brand Ambassador",
      "Video Teaser/Trailer", "Post-Event Video/Content",
      "Event Photography for PR", "Media Wall/Press Area"
    ]
  },
  {
    name: "Attire & Beauty",
    icon: "shirt",
    subcategories: [
      "Bride/Main Host Outfit", "Groom/Co-Host Outfit",
      "Second Outfit/Outfit Change", "Traditional Attire",
      "Bridal Party Outfits", "Groom's Party Outfits",
      "Flower Girl/Page Boy Outfits", "Mother of Bride/Groom Outfit",
      "Bridal Hair Styling", "Bridal Makeup", "Bridesmaids Hair & Makeup",
      "Groom Grooming/Barbering", "Trial Hair & Makeup",
      "On-Site Touch-Up Artist", "Accessories (Jewellery, Veil, etc.)",
      "Shoes", "Undergarments/Shapewear",
      "Outfit Alterations/Tailoring", "Outfit Preservation/Cleaning",
      "Henna/Mehndi Artist"
    ]
  },
  {
    name: "Miscellaneous & Contingency",
    icon: "helpCircle",
    subcategories: [
      "Tips/Gratuities (Vendors)", "Tips/Gratuities (Staff)",
      "Emergency Fund (5-10%)", "Contingency Reserve",
      "Unforeseen Expenses", "Last-Minute Purchases",
      "Currency Exchange Fees", "International Transfer Fees",
      "Bank Charges", "Credit Card Processing Fees",
      "Customs/Import Duties", "Storage Fees",
      "Rehearsal Dinner/Event", "Pre-Event Party",
      "Post-Event Brunch", "Welcome Dinner",
      "Gift Registry Setup", "Website Domain/Hosting",
      "Mobile App Development", "Other/Custom Item"
    ]
  },
];

const UNIT_TYPES = [
  { value: "flat_rate", label: "Flat Rate" },
  { value: "per_person", label: "Per Person" },
  { value: "per_hour", label: "Per Hour" },
  { value: "per_day", label: "Per Day" },
  { value: "per_item", label: "Per Item" },
  { value: "per_unit", label: "Per Unit" },
  { value: "per_plate", label: "Per Plate" },
  { value: "per_table", label: "Per Table" },
  { value: "per_trip", label: "Per Trip" },
  { value: "per_night", label: "Per Night" },
  { value: "per_meter", label: "Per Meter" },
  { value: "per_sqm", label: "Per Sq. Meter" },
  { value: "per_liter", label: "Per Litre" },
  { value: "per_bottle", label: "Per Bottle" },
  { value: "per_kg", label: "Per Kg" },
  { value: "per_piece", label: "Per Piece" },
  { value: "percentage", label: "Percentage of Total" },
];

const EVENT_TEMPLATES: Record<string, string[]> = {
  wedding: [
    "Venue & Facility", "Catering & Food", "Beverages & Bar", "Décor & Styling",
    "Flowers & Floral", "Lighting & Effects", "Sound & Audio-Visual",
    "Photography & Videography", "Entertainment & Music", "Stationery & Print",
    "Transportation & Logistics", "Accommodation & Hospitality",
    "Furniture & Equipment Hire", "Power & Utilities", "Health, Safety & Security",
    "Internal Team & Staff", "Attire & Beauty", "Guest Experience & Gifts",
    "Permits, Licenses & Legal", "Miscellaneous & Contingency"
  ],
  corporate: [
    "Venue & Facility", "Catering & Food", "Beverages & Bar", "Décor & Styling",
    "Lighting & Effects", "Sound & Audio-Visual", "Photography & Videography",
    "Entertainment & Music", "Stationery & Print", "Transportation & Logistics",
    "Accommodation & Hospitality", "Furniture & Equipment Hire", "Power & Utilities",
    "Health, Safety & Security", "Internal Team & Staff", "Professional Services",
    "Communication & Marketing", "Permits, Licenses & Legal", "Miscellaneous & Contingency"
  ],
  birthday: [
    "Venue & Facility", "Catering & Food", "Beverages & Bar", "Décor & Styling",
    "Lighting & Effects", "Sound & Audio-Visual", "Photography & Videography",
    "Entertainment & Music", "Transportation & Logistics", "Furniture & Equipment Hire",
    "Power & Utilities", "Internal Team & Staff", "Guest Experience & Gifts",
    "Miscellaneous & Contingency"
  ],
  conference: [
    "Venue & Facility", "Catering & Food", "Beverages & Bar",
    "Sound & Audio-Visual", "Photography & Videography", "Stationery & Print",
    "Transportation & Logistics", "Accommodation & Hospitality",
    "Furniture & Equipment Hire", "Power & Utilities", "Health, Safety & Security",
    "Internal Team & Staff", "Professional Services", "Communication & Marketing",
    "Permits, Licenses & Legal", "Miscellaneous & Contingency"
  ],
  funeral: [
    "Venue & Facility", "Catering & Food", "Beverages & Bar", "Décor & Styling",
    "Flowers & Floral", "Sound & Audio-Visual", "Photography & Videography",
    "Stationery & Print", "Transportation & Logistics", "Furniture & Equipment Hire",
    "Power & Utilities", "Internal Team & Staff", "Miscellaneous & Contingency"
  ],
  general: COMPREHENSIVE_CATEGORIES.map(c => c.name),
};

const PLANNER_COLORS = ["#8B1538","#ffffff","#3B82F6","#10B981","#F59E0B","#8B5CF6","#EC4899","#06B6D4","#F97316","#6366F1","#14B8A6","#E11D48","#84CC16","#A855F7","#EF4444","#0EA5E9","#D946EF","#78716C","#22D3EE","#FB923C","#4ADE80","#818CF8","#F472B6"];

const DEFAULT_ALLOCATIONS: Record<string, Record<string, number>> = {
  wedding: { "Venue & Facility": 15, "Catering & Food": 25, "Beverages & Bar": 8, "Décor & Styling": 12, "Flowers & Floral": 5, "Lighting & Effects": 4, "Photography & Videography": 8, "Entertainment & Music": 6, "Stationery & Print": 2, "Transportation & Logistics": 3, "Attire & Beauty": 4, "Miscellaneous & Contingency": 8 },
  corporate: { "Venue & Facility": 20, "Catering & Food": 20, "Beverages & Bar": 8, "Sound & Audio-Visual": 12, "Lighting & Effects": 5, "Décor & Styling": 6, "Photography & Videography": 5, "Entertainment & Music": 4, "Stationery & Print": 3, "Transportation & Logistics": 5, "Professional Services": 4, "Miscellaneous & Contingency": 8 },
  birthday: { "Venue & Facility": 18, "Catering & Food": 25, "Beverages & Bar": 12, "Décor & Styling": 15, "Entertainment & Music": 10, "Photography & Videography": 6, "Lighting & Effects": 4, "Transportation & Logistics": 2, "Guest Experience & Gifts": 3, "Miscellaneous & Contingency": 5 },
  conference: { "Venue & Facility": 25, "Catering & Food": 18, "Beverages & Bar": 5, "Sound & Audio-Visual": 15, "Stationery & Print": 5, "Transportation & Logistics": 8, "Accommodation & Hospitality": 10, "Professional Services": 5, "Communication & Marketing": 4, "Miscellaneous & Contingency": 5 },
};

function BudgetPlannerTab({ totalBudget, currency, eventType, guestCount, budgetItems, categoryBreakdown, formatCurrency, onAddItems, isSaving }: {
  totalBudget: number; currency: string; eventType?: string; guestCount?: number;
  budgetItems: any[]; categoryBreakdown: Map<string, any>; formatCurrency: (n: number) => string;
  onAddItems: (items: any[]) => void; isSaving: boolean;
}) {
  const { toast } = useToast();
  const availableCategories = COMPREHENSIVE_CATEGORIES.map(c => c.name);
  const defaultAllocs = DEFAULT_ALLOCATIONS[(eventType || "").toLowerCase()] || DEFAULT_ALLOCATIONS.wedding;

  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    if (categoryBreakdown.size > 0) {
      const existing: Record<string, number> = {};
      const total = Array.from(categoryBreakdown.values()).reduce((s, d) => s + d.estimated, 0);
      categoryBreakdown.forEach((data, cat) => {
        if (data.estimated > 0 && total > 0) existing[cat] = Math.round((data.estimated / total) * 100);
      });
      if (Object.keys(existing).length > 0) return existing;
    }
    return { ...defaultAllocs };
  });

  const [customCategory, setCustomCategory] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const totalPct = Object.values(allocations).reduce((s, v) => s + v, 0);
  const sortedEntries = Object.entries(allocations).sort((a, b) => b[1] - a[1]);

  const updateAllocation = (cat: string, val: number) => {
    setAllocations(prev => ({ ...prev, [cat]: Math.max(0, Math.min(100, val)) }));
  };

  const removeCategory = (cat: string) => {
    setAllocations(prev => {
      const next = { ...prev };
      delete next[cat];
      return next;
    });
  };

  const addCategory = (cat: string) => {
    if (cat && !allocations[cat]) {
      setAllocations(prev => ({ ...prev, [cat]: 5 }));
      setCustomCategory("");
      setShowAddCategory(false);
    }
  };

  const normalise = () => {
    if (totalPct === 0) return;
    const factor = 100 / totalPct;
    const normalised: Record<string, number> = {};
    Object.entries(allocations).forEach(([k, v]) => {
      normalised[k] = Math.round(v * factor);
    });
    const diff = 100 - Object.values(normalised).reduce((s, v) => s + v, 0);
    const firstKey = Object.keys(normalised)[0];
    if (firstKey) normalised[firstKey] += diff;
    setAllocations(normalised);
  };

  const resetToDefault = () => setAllocations({ ...defaultAllocs });

  const applyToEvent = () => {
    const items: any[] = [];
    Object.entries(allocations).forEach(([cat, pct]) => {
      const amount = Math.round(totalBudget * pct / 100);
      if (amount > 0) {
        items.push({
          category: cat, subcategory: "", item: `${cat} — Planned Budget`,
          description: `Budget allocation: ${pct}% of total budget`,
          quantity: "1", unitCost: String(amount), unitType: "flat_rate",
          estimatedCost: String(amount), currency: currency || "USD",
          status: "pending", priority: "medium",
          notes: `Auto-generated from Budget Planner (${pct}% allocation)`,
          markupPercent: "0",
        });
      }
    });
    if (items.length === 0) {
      toast({ title: "No categories with allocation to apply", variant: "destructive" });
      return;
    }
    onAddItems(items);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-gradient-to-r from-[#8B1538] to-[#6d102c] text-white rounded-t-lg py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5" /> Interactive Budget Planner</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs border-white/40 ${totalPct === 100 ? 'text-green-300' : totalPct > 100 ? 'text-red-300' : 'text-amber-300'}`}>
                {totalPct}% allocated {totalPct !== 100 && `(${totalPct > 100 ? 'over' : 'under'} by ${Math.abs(100 - totalPct)}%)`}
              </Badge>
            </div>
          </div>
          <CardDescription className="text-white/70 text-xs mt-1">
            Set percentage allocations for each category, then apply to create budget line items. Total should equal 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={normalise} variant="outline" size="sm" disabled={totalPct === 0 || totalPct === 100}>
              <Target className="w-3 h-3 mr-1" /> Normalise to 100%
            </Button>
            <Button onClick={resetToDefault} variant="outline" size="sm">
              <Zap className="w-3 h-3 mr-1" /> Reset to {(eventType || "Wedding").charAt(0).toUpperCase() + (eventType || "wedding").slice(1)} Defaults
            </Button>
            <Button onClick={() => setShowAddCategory(!showAddCategory)} variant="outline" size="sm">
              <Plus className="w-3 h-3 mr-1" /> Add Category
            </Button>
          </div>

          {showAddCategory && (
            <div className="flex gap-2 mb-4">
              <Select value={customCategory} onValueChange={setCustomCategory}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select category to add..." /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {availableCategories.filter(c => !allocations[c]).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => addCategory(customCategory)} disabled={!customCategory} size="sm" className="bg-[#8B1538] hover:bg-[#6d102c] text-white">
                Add
              </Button>
            </div>
          )}

          <div className="mb-4">
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden flex">
              {sortedEntries.map(([cat, pct], i) => (
                <div key={cat} className="h-full transition-all relative group" style={{ width: `${pct}%`, background: PLANNER_COLORS[i % PLANNER_COLORS.length], minWidth: pct > 0 ? "2px" : "0" }}>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {cat}: {pct}%
                  </div>
                </div>
              ))}
              {totalPct < 100 && <div className="h-full bg-gray-200 flex-1" />}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>0%</span>
              <span>{formatCurrency(totalBudget)}</span>
            </div>
          </div>

          <div className="space-y-2">
            {sortedEntries.map(([cat, pct], i) => {
              const amount = Math.round(totalBudget * pct / 100);
              const perGuest = guestCount && guestCount > 0 ? amount / guestCount : 0;
              return (
                <div key={cat} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                  <div className="w-3 h-8 rounded-sm flex-shrink-0" style={{ background: PLANNER_COLORS[i % PLANNER_COLORS.length] }} />
                  <div className="w-44 min-w-0">
                    <div className="text-sm font-medium truncate">{cat}</div>
                    <div className="text-[10px] text-gray-400">{formatCurrency(amount)}{perGuest > 0 ? ` (${formatCurrency(perGuest)}/guest)` : ""}</div>
                  </div>
                  <input
                    type="range" min={0} max={50} value={pct}
                    onChange={e => updateAllocation(cat, parseInt(e.target.value))}
                    className="flex-1 h-2 accent-[#8B1538] cursor-pointer"
                  />
                  <div className="flex items-center gap-1 w-20">
                    <Input
                      type="number" min={0} max={100} value={pct}
                      onChange={e => updateAllocation(cat, parseInt(e.target.value) || 0)}
                      className="h-7 w-14 text-xs text-center p-0"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                  <button onClick={() => removeCategory(cat)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2"><PieChart className="w-4 h-4 text-[#8B1538]" /> Planned Allocation</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {(() => {
              const entries = sortedEntries.filter(([, pct]) => pct > 0);
              if (entries.length === 0) return <div className="text-center text-gray-400 py-6 text-sm">Add categories and set allocations.</div>;
              const size = 180;
              const cx = size / 2, cy = size / 2, radius = 72, innerRadius = 45;
              let cumAngle = -Math.PI / 2;
              const arcs = entries.map(([cat, pct], i) => {
                const fraction = totalPct > 0 ? pct / totalPct : 0;
                const angle = fraction * Math.PI * 2;
                const startAngle = cumAngle;
                cumAngle += angle;
                const endAngle = cumAngle;
                const largeArc = angle > Math.PI ? 1 : 0;
                const x1 = cx + radius * Math.cos(startAngle), y1 = cy + radius * Math.sin(startAngle);
                const x2 = cx + radius * Math.cos(endAngle), y2 = cy + radius * Math.sin(endAngle);
                const ix1 = cx + innerRadius * Math.cos(startAngle), iy1 = cy + innerRadius * Math.sin(startAngle);
                const ix2 = cx + innerRadius * Math.cos(endAngle), iy2 = cy + innerRadius * Math.sin(endAngle);
                const path = entries.length === 1
                  ? `M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius - 0.01} ${cy} M ${cx + innerRadius} ${cy} A ${innerRadius} ${innerRadius} 0 1 0 ${cx + innerRadius - 0.01} ${cy}`
                  : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
                return { cat, pct, color: PLANNER_COLORS[i % PLANNER_COLORS.length], path, amount: Math.round(totalBudget * pct / 100) };
              });
              return (
                <div className="flex flex-col items-center gap-3">
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {arcs.map((a, i) => (
                      <path key={i} d={a.path} fill={a.color} stroke="white" strokeWidth="2" className="transition-opacity hover:opacity-80 cursor-pointer">
                        <title>{a.cat}: {a.pct}% = {formatCurrency(a.amount)}</title>
                      </path>
                    ))}
                    <text x={cx} y={cy - 6} textAnchor="middle" className="fill-gray-700 text-xs font-bold">{entries.length}</text>
                    <text x={cx} y={cy + 8} textAnchor="middle" className="fill-gray-400 text-[9px]">categories</text>
                  </svg>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full text-xs">
                    {arcs.slice(0, 10).map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: a.color }} />
                        <span className="truncate flex-1">{a.cat}</span>
                        <span className="font-medium">{a.pct}%</span>
                      </div>
                    ))}
                    {arcs.length > 10 && <div className="text-gray-400 text-xs col-span-2">+{arcs.length - 10} more</div>}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2"><Calculator className="w-4 h-4 text-[#8B1538]" /> Allocation Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-xs text-gray-500">Total Budget</span>
                <span className="font-bold text-lg">{formatCurrency(totalBudget)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Categories</span>
                <span className="font-semibold">{sortedEntries.filter(([, p]) => p > 0).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Allocated</span>
                <span className={`font-semibold ${totalPct === 100 ? 'text-green-600' : 'text-amber-600'}`}>{totalPct}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Allocated Amount</span>
                <span className="font-semibold">{formatCurrency(Math.round(totalBudget * Math.min(totalPct, 100) / 100))}</span>
              </div>
              {totalPct < 100 && (
                <div className="flex justify-between items-center text-amber-600">
                  <span className="text-xs">Unallocated</span>
                  <span className="font-semibold">{formatCurrency(Math.round(totalBudget * (100 - totalPct) / 100))}</span>
                </div>
              )}
              {guestCount && guestCount > 0 && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-gray-500">Per Guest</span>
                  <span className="font-semibold">{formatCurrency(Math.round(totalBudget / guestCount))}</span>
                </div>
              )}
              <div className="pt-2 border-t">
                <div className="text-xs text-gray-500 mb-2">Top 3 Categories</div>
                {sortedEntries.slice(0, 3).map(([cat, pct], i) => (
                  <div key={cat} className="flex items-center gap-2 text-xs mb-1">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: PLANNER_COLORS[i % PLANNER_COLORS.length] }} />
                    <span className="flex-1 truncate">{cat}</span>
                    <span className="font-semibold">{formatCurrency(Math.round(totalBudget * pct / 100))}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button
              onClick={applyToEvent}
              disabled={isSaving || totalPct === 0}
              className="w-full mt-4 bg-[#8B1538] hover:bg-[#6d102c] text-white"
            >
              {isSaving ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Applying...</>
              ) : (
                <><ClipboardList className="w-4 h-4 mr-2" /> Apply Plan to Budget ({sortedEntries.filter(([, p]) => p > 0).length} items)</>
              )}
            </Button>
            <p className="text-[10px] text-gray-400 mt-2 text-center">This creates budget line items for each category based on your planned allocations.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface BudgetManagerProps {
  eventId: string;
  totalBudget: number;
  currency: string;
  eventType?: string;
  guestCount?: number;
  importedData?: any[];
  onBudgetUpdate?: (updatedBudget: any[]) => void;
}

export function BudgetManager({ eventId, totalBudget, currency, eventType, guestCount, importedData, onBudgetUpdate }: BudgetManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [contingencyPercent, setContingencyPercent] = useState(10);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const [newItem, setNewItem] = useState({
    category: "", subcategory: "", item: "", description: "",
    quantity: 1, unitCost: 0, unitType: "flat_rate",
    estimatedCost: 0, vendor: "", status: "pending",
    priority: "medium", notes: "", markupPercent: 0, dueDate: ""
  });

  const { data: budgetItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "budget"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/budget`);
      if (!res.ok) throw new Error("Failed to fetch budget");
      return res.json();
    },
    enabled: !!eventId,
  });

  const { data: staffCosts = [] } = useQuery<any[]>({
    queryKey: ["/api/events", eventId, "staff-costs"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/staff-costs`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: async (item: any) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/budget`, item);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "budget"] });
      toast({ title: "Budget item added" });
      resetForm();
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/budget/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "budget"] });
      toast({ title: "Budget item updated" });
      setEditingItemId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/budget/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "budget"] });
      toast({ title: "Budget item removed" });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/budget/bulk`, { items });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "budget"] });
      toast({ title: "Budget template loaded" });
      setShowTemplateModal(false);
    },
  });

  const resetForm = () => {
    setNewItem({
      category: "", subcategory: "", item: "", description: "",
      quantity: 1, unitCost: 0, unitType: "flat_rate",
      estimatedCost: 0, vendor: "", status: "pending",
      priority: "medium", notes: "", markupPercent: 0, dueDate: ""
    });
    setShowAddForm(false);
  };

  useEffect(() => {
    if (newItem.quantity > 0 && newItem.unitCost > 0) {
      const base = newItem.quantity * newItem.unitCost;
      const markup = base * (newItem.markupPercent / 100);
      setNewItem(prev => ({ ...prev, estimatedCost: base + markup }));
    }
  }, [newItem.quantity, newItem.unitCost, newItem.unitType, newItem.markupPercent]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: currency || 'USD',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalEstimated = budgetItems.reduce((s, i) => s + parseFloat(String(i.estimatedCost || 0)), 0);
  const totalActual = budgetItems.reduce((s, i) => s + parseFloat(String(i.actualCost || 0)), 0);
  const totalPaid = budgetItems.reduce((s, i) => s + parseFloat(String(i.paidAmount || 0)), 0);
  const staffTotal = staffCosts.reduce((s: number, r: any) => s + (r.totalCost || 0), 0);
  const grandTotal = totalEstimated + staffTotal;
  const contingencyAmount = grandTotal * (contingencyPercent / 100);
  const grandTotalWithContingency = grandTotal + contingencyAmount;
  const remaining = totalBudget - grandTotalWithContingency;

  const categoryBreakdown = useMemo(() => {
    const catMap = new Map<string, { estimated: number; actual: number; paid: number; items: any[] }>();
    budgetItems.forEach(item => {
      const cat = item.category || "Uncategorized";
      const existing = catMap.get(cat) || { estimated: 0, actual: 0, paid: 0, items: [] };
      existing.estimated += parseFloat(String(item.estimatedCost || 0));
      existing.actual += parseFloat(String(item.actualCost || 0));
      existing.paid += parseFloat(String(item.paidAmount || 0));
      existing.items.push(item);
      catMap.set(cat, existing);
    });
    return catMap;
  }, [budgetItems]);

  const filtered = useMemo(() => {
    let result = budgetItems;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(i =>
        (i.item || "").toLowerCase().includes(lower) ||
        (i.category || "").toLowerCase().includes(lower) ||
        (i.subcategory || "").toLowerCase().includes(lower) ||
        (i.vendor || "").toLowerCase().includes(lower)
      );
    }
    if (filterCategory !== "all") result = result.filter(i => i.category === filterCategory);
    if (filterStatus !== "all") result = result.filter(i => i.status === filterStatus);
    return result;
  }, [budgetItems, searchTerm, filterCategory, filterStatus]);

  const usedCategories = Array.from(new Set(budgetItems.map(i => i.category)));

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const generateTemplate = (templateType: string) => {
    const categories = EVENT_TEMPLATES[templateType] || EVENT_TEMPLATES.general;
    const items: any[] = [];
    categories.forEach(catName => {
      const cat = COMPREHENSIVE_CATEGORIES.find(c => c.name === catName);
      if (cat) {
        items.push({
          category: cat.name,
          subcategory: "",
          item: `${cat.name} - Budget Allocation`,
          description: `Budget allocation for ${cat.name.toLowerCase()}`,
          quantity: "1", unitCost: "0", unitType: "flat_rate",
          estimatedCost: "0", currency: currency || "USD",
          status: "pending", priority: "medium",
          notes: `Subcategories: ${cat.subcategories.slice(0, 8).join(", ")}...`,
          markupPercent: "0",
        });
      }
    });
    bulkCreateMutation.mutate(items);
  };

  const handleAddItem = () => {
    if (!newItem.category || !newItem.item) {
      toast({ title: "Category and item name are required", variant: "destructive" });
      return;
    }
    const payload = {
      ...newItem,
      quantity: String(newItem.quantity),
      unitCost: String(newItem.unitCost),
      estimatedCost: String(newItem.estimatedCost || 0),
      actualCost: "0",
      paidAmount: "0",
      markupPercent: String(newItem.markupPercent),
      currency: currency || "USD",
      dueDate: newItem.dueDate ? new Date(newItem.dueDate).toISOString() : undefined,
    };
    createMutation.mutate(payload);
  };

  const handlePrint = () => {
    const printContent = `
      <html><head><title>Event Budget Costing - Event Perfekt</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
        .header { text-align: center; border-bottom: 3px solid #8B1538; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { color: #8B1538; margin: 0; font-size: 24px; }
        .header p { color: #666; margin: 5px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .summary-card { border: 1px solid #ddd; padding: 10px; text-align: center; border-radius: 5px; }
        .summary-card .label { font-size: 11px; color: #666; text-transform: uppercase; }
        .summary-card .value { font-size: 18px; font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
        th { background: #8B1538; color: white; padding: 8px 4px; text-align: left; font-size: 10px; }
        td { padding: 6px 4px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #f9f9f9; }
        .cat-header { background: #f3e8eb; font-weight: bold; color: #8B1538; }
        .cat-header td { padding: 8px 4px; font-size: 12px; }
        .total-row { background: #8B1538; color: white; font-weight: bold; }
        .total-row td { padding: 10px 4px; font-size: 13px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #8B1538; font-size: 10px; color: #666; }
        .signature-section { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; }
        .signature-box { text-align: center; }
        .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 11px; }
        @media print { body { margin: 10px; } }
      </style></head><body>
        <div class="header">
          <h1>EVENT PERFEKT GLOBAL LTD</h1>
          <p style="font-size: 12px; color: #8B1538;">Comprehensive Event Budget & Costing</p>
          <p>Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p>Currency: ${currency || 'USD'} | ${guestCount ? `Guests: ${guestCount}` : ''}</p>
        </div>
        <div class="summary-grid">
          <div class="summary-card"><div class="label">Total Budget</div><div class="value">${formatCurrency(totalBudget)}</div></div>
          <div class="summary-card"><div class="label">Total Estimated</div><div class="value">${formatCurrency(grandTotalWithContingency)}</div></div>
          <div class="summary-card"><div class="label">Contingency (${contingencyPercent}%)</div><div class="value">${formatCurrency(contingencyAmount)}</div></div>
          <div class="summary-card"><div class="label">${remaining >= 0 ? 'Remaining' : 'Over Budget'}</div><div class="value" style="color: ${remaining >= 0 ? 'green' : 'red'}">${formatCurrency(Math.abs(remaining))}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>Category</th><th>Subcategory</th><th>Item</th>
            <th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Markup%</th>
            <th>Estimated</th><th>Actual</th><th>Paid</th><th>Vendor</th><th>Status</th>
          </tr></thead>
          <tbody>
            ${Array.from(categoryBreakdown.entries()).map(([cat, data]) => `
              <tr class="cat-header"><td colspan="13">${cat} (${data.items.length} items) — Subtotal: ${formatCurrency(data.estimated)}</td></tr>
              ${data.items.map((item: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td><td>${item.category || ''}</td><td>${item.subcategory || ''}</td>
                  <td>${item.item || ''}</td><td>${item.quantity || 1}</td><td>${item.unitType || 'flat_rate'}</td>
                  <td>${formatCurrency(parseFloat(String(item.unitCost || 0)))}</td>
                  <td>${item.markupPercent || 0}%</td>
                  <td>${formatCurrency(parseFloat(String(item.estimatedCost || 0)))}</td>
                  <td>${formatCurrency(parseFloat(String(item.actualCost || 0)))}</td>
                  <td>${formatCurrency(parseFloat(String(item.paidAmount || 0)))}</td>
                  <td>${item.vendor || '-'}</td><td>${item.status || 'pending'}</td>
                </tr>
              `).join('')}
            `).join('')}
            ${staffCosts.length > 0 ? `
              <tr class="cat-header"><td colspan="13">Internal Team / Staff Costs (from approved staff budget) — Subtotal: ${formatCurrency(staffTotal)}</td></tr>
              ${staffCosts.map((s: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td><td>Internal Team</td><td>${s.role}</td>
                  <td>${s.name || s.role}</td><td>${s.quantity}</td><td>per person</td>
                  <td>${formatCurrency(s.ratePerUnit)}</td><td>0%</td>
                  <td>${formatCurrency(s.totalCost)}</td><td>-</td><td>-</td>
                  <td>In-House</td><td>Approved</td>
                </tr>
              `).join('')}
            ` : ''}
            <tr class="total-row">
              <td colspan="8">SUBTOTAL (All Categories)</td>
              <td>${formatCurrency(grandTotal)}</td>
              <td>${formatCurrency(totalActual)}</td>
              <td>${formatCurrency(totalPaid)}</td>
              <td colspan="2"></td>
            </tr>
            <tr style="background:#f3e8eb;font-weight:bold">
              <td colspan="8">CONTINGENCY (${contingencyPercent}%)</td>
              <td>${formatCurrency(contingencyAmount)}</td>
              <td colspan="4"></td>
            </tr>
            <tr class="total-row">
              <td colspan="8">GRAND TOTAL (with Contingency)</td>
              <td>${formatCurrency(grandTotalWithContingency)}</td>
              <td colspan="4"></td>
            </tr>
          </tbody>
        </table>
        <div class="signature-section">
          <div class="signature-box"><div class="signature-line">Prepared By (Event Planner)</div></div>
          <div class="signature-box"><div class="signature-line">Planner in Charge</div></div>
          <div class="signature-box"><div class="signature-line">Approved By (Lead/Manager)</div></div>
        </div>
        <div class="footer">
          <p>Event Perfekt Global Ltd | Since 2015 | Comprehensive Event Management</p>
          <p>This is a confidential document. All costs are estimates subject to final confirmation.</p>
        </div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
  };

  const handleExportCSV = () => {
    const headers = "Category,Subcategory,Item,Description,Qty,Unit Type,Unit Cost,Markup%,Estimated Cost,Actual Cost,Paid Amount,Vendor,Status,Priority,Notes\n";
    const rows = budgetItems.map(i =>
      `"${i.category}","${i.subcategory || ''}","${i.item}","${i.description || ''}",${i.quantity || 1},"${i.unitType || 'flat_rate'}",${i.unitCost || 0},${i.markupPercent || 0},${i.estimatedCost || 0},${i.actualCost || 0},${i.paidAmount || 0},"${i.vendor || ''}","${i.status || 'pending'}","${i.priority || 'medium'}","${i.notes || ''}"`
    ).join("\n");
    const staffRows = staffCosts.map((s: any) =>
      `"Internal Team","${s.role}","${s.name || s.role}","Staff from approved budget",${s.quantity},"per person",${s.ratePerUnit},0,${s.totalCost},0,0,"In-House","approved","high",""`
    ).join("\n");
    const totals = `\n"","","","SUBTOTAL",,,,,"${grandTotal}","${totalActual}","${totalPaid}","","","",""\n"","","","CONTINGENCY (${contingencyPercent}%)",,,,,"${contingencyAmount}","","","","","",""\n"","","","GRAND TOTAL",,,,,"${grandTotalWithContingency}","","","","","",""`;
    const csv = headers + rows + (staffRows ? "\n" + staffRows : "") + totals;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `event-budget-${eventId}-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const selectedSubcategories = COMPREHENSIVE_CATEGORIES.find(c => c.name === newItem.category)?.subcategories || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B1538]"></div></div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="planner">Budget Planner</TabsTrigger>
          <TabsTrigger value="items">Line Items ({budgetItems.length})</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="staff">Staff Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-blue-600" /><span className="text-xs font-medium text-blue-700">Total Budget</span></div>
                <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalBudget)}</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Calculator className="w-4 h-4 text-purple-600" /><span className="text-xs font-medium text-purple-700">Estimated (+ Contingency)</span></div>
                <div className="text-2xl font-bold text-purple-900">{formatCurrency(grandTotalWithContingency)}</div>
                <div className="text-xs text-purple-600">{totalBudget > 0 ? ((grandTotalWithContingency / totalBudget) * 100).toFixed(1) : 0}% of budget</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-green-600" /><span className="text-xs font-medium text-green-700">Paid</span></div>
                <div className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</div>
                <div className="text-xs text-green-600">{totalActual > 0 ? ((totalPaid / totalActual) * 100).toFixed(1) : 0}% of actual</div>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br ${remaining < 0 ? 'from-red-50 to-red-100 border-red-200' : 'from-amber-50 to-amber-100 border-amber-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {remaining < 0 ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <TrendingUp className="w-4 h-4 text-amber-600" />}
                  <span className={`text-xs font-medium ${remaining < 0 ? 'text-red-700' : 'text-amber-700'}`}>{remaining < 0 ? 'Over Budget' : 'Remaining'}</span>
                </div>
                <div className={`text-2xl font-bold ${remaining < 0 ? 'text-red-900' : 'text-amber-900'}`}>{formatCurrency(Math.abs(remaining))}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="p-4">
              <div className="text-xs text-gray-500">Line Items</div>
              <div className="text-xl font-bold">{budgetItems.length}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-gray-500">Categories Used</div>
              <div className="text-xl font-bold">{usedCategories.length}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-gray-500">Staff Roles (Approved)</div>
              <div className="text-xl font-bold">{staffCosts.length}</div>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <div className="text-xs text-gray-500">Contingency ({contingencyPercent}%)</div>
              <div className="text-xl font-bold">{formatCurrency(contingencyAmount)}</div>
              <Input type="number" min={0} max={25} value={contingencyPercent} onChange={e => setContingencyPercent(Number(e.target.value))} className="mt-1 h-7 w-20 text-xs" />
            </CardContent></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader className="bg-[#8B1538] text-white rounded-t-lg py-3 px-4">
                <CardTitle className="text-base flex items-center gap-2"><PieChart className="w-5 h-5" /> Budget Allocation</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(() => {
                  const CHART_COLORS = ["#8B1538","#ffffff","#3B82F6","#10B981","#F59E0B","#8B5CF6","#EC4899","#06B6D4","#F97316","#6366F1","#14B8A6","#E11D48","#84CC16","#A855F7","#EF4444","#0EA5E9","#D946EF","#78716C","#22D3EE","#FB923C","#4ADE80","#818CF8","#F472B6"];
                  const entries = Array.from(categoryBreakdown.entries()).filter(([, d]) => d.estimated > 0);
                  if (staffTotal > 0) entries.push(["Internal Team", { estimated: staffTotal, actual: 0, paid: 0, items: [] }]);
                  if (entries.length === 0) return <div className="text-center text-gray-400 py-8 text-sm">No budget items yet. Add items or generate a template to see the visual breakdown.</div>;
                  const total = entries.reduce((s, [, d]) => s + d.estimated, 0);
                  const size = 200;
                  const cx = size / 2, cy = size / 2, radius = 80, innerRadius = 50;
                  let cumAngle = -Math.PI / 2;
                  const arcs = entries.map(([cat, data], i) => {
                    const fraction = total > 0 ? data.estimated / total : 0;
                    const angle = fraction * Math.PI * 2;
                    const startAngle = cumAngle;
                    cumAngle += angle;
                    const endAngle = cumAngle;
                    const largeArc = angle > Math.PI ? 1 : 0;
                    const x1 = cx + radius * Math.cos(startAngle);
                    const y1 = cy + radius * Math.sin(startAngle);
                    const x2 = cx + radius * Math.cos(endAngle);
                    const y2 = cy + radius * Math.sin(endAngle);
                    const ix1 = cx + innerRadius * Math.cos(startAngle);
                    const iy1 = cy + innerRadius * Math.sin(startAngle);
                    const ix2 = cx + innerRadius * Math.cos(endAngle);
                    const iy2 = cy + innerRadius * Math.sin(endAngle);
                    const path = entries.length === 1
                      ? `M ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius - 0.01} ${cy} M ${cx + innerRadius} ${cy} A ${innerRadius} ${innerRadius} 0 1 0 ${cx + innerRadius - 0.01} ${cy}`
                      : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
                    return { cat, data, color: CHART_COLORS[i % CHART_COLORS.length], path, pct: (fraction * 100).toFixed(1) };
                  });
                  return (
                    <div className="flex flex-col items-center gap-4">
                      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                        {arcs.map((a, i) => (
                          <path key={i} d={a.path} fill={a.color} stroke="white" strokeWidth="2" className="transition-opacity hover:opacity-80 cursor-pointer">
                            <title>{a.cat}: {formatCurrency(a.data.estimated)} ({a.pct}%)</title>
                          </path>
                        ))}
                        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-gray-800 text-xs font-bold">{formatCurrency(total)}</text>
                        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-gray-400 text-[10px]">TOTAL EST.</text>
                      </svg>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full">
                        {arcs.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: a.color }} />
                            <span className="truncate flex-1">{a.cat}</span>
                            <span className="font-semibold text-gray-600">{a.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-[#8B1538] text-white rounded-t-lg py-3 px-4">
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Estimated vs Actual vs Paid</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {(() => {
                  const entries = Array.from(categoryBreakdown.entries()).filter(([, d]) => d.estimated > 0 || d.actual > 0);
                  if (entries.length === 0) return <div className="text-center text-gray-400 py-8 text-sm">No budget data to compare yet.</div>;
                  const maxVal = Math.max(...entries.map(([, d]) => Math.max(d.estimated, d.actual, d.paid)));
                  return (
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {entries.map(([cat, data]) => {
                        const estW = maxVal > 0 ? (data.estimated / maxVal) * 100 : 0;
                        const actW = maxVal > 0 ? (data.actual / maxVal) * 100 : 0;
                        const paidW = maxVal > 0 ? (data.paid / maxVal) * 100 : 0;
                        return (
                          <div key={cat}>
                            <div className="text-xs font-medium text-gray-700 mb-1 truncate">{cat}</div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] w-14 text-gray-400">Est.</span>
                                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                  <div className="h-full bg-[#8B1538] rounded-full transition-all" style={{ width: `${estW}%` }} />
                                </div>
                                <span className="text-[10px] w-20 text-right font-medium">{formatCurrency(data.estimated)}</span>
                              </div>
                              {data.actual > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] w-14 text-gray-400">Actual</span>
                                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${actW}%` }} />
                                  </div>
                                  <span className="text-[10px] w-20 text-right font-medium">{formatCurrency(data.actual)}</span>
                                </div>
                              )}
                              {data.paid > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] w-14 text-gray-400">Paid</span>
                                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${paidW}%` }} />
                                  </div>
                                  <span className="text-[10px] w-20 text-right font-medium">{formatCurrency(data.paid)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t text-[10px] text-gray-500">
                  <div className="flex items-center gap-1"><div className="w-3 h-2 bg-[#8B1538] rounded" />Estimated</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-2 bg-blue-500 rounded" />Actual</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-2 bg-green-500 rounded" />Paid</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader className="bg-gradient-to-r from-[#8B1538] to-[#ffffff] text-white rounded-t-lg py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2"><Wallet className="w-5 h-5" /> Budget Health</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Budget Used</span>
                  <span>{totalBudget > 0 ? ((grandTotalWithContingency / totalBudget) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden relative">
                  <div className={`h-full rounded-full transition-all ${grandTotalWithContingency > totalBudget ? 'bg-red-500' : grandTotalWithContingency > totalBudget * 0.85 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, totalBudget > 0 ? (grandTotalWithContingency / totalBudget) * 100 : 0)}%` }} />
                  {totalActual > 0 && (
                    <div className="absolute top-0 h-full border-r-2 border-dashed border-blue-600" style={{ left: `${Math.min(100, totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0)}%` }}>
                      <span className="absolute -top-5 -translate-x-1/2 text-[9px] text-blue-600 font-medium whitespace-nowrap">Actual: {totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(0) : 0}%</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500">Top Category</div>
                  <div className="text-sm font-bold text-[#8B1538] truncate">
                    {Array.from(categoryBreakdown.entries()).sort((a, b) => b[1].estimated - a[1].estimated)[0]?.[0] || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Avg per Item</div>
                  <div className="text-sm font-bold">{budgetItems.length > 0 ? formatCurrency(totalEstimated / budgetItems.length) : "-"}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Payment Progress</div>
                  <div className="text-sm font-bold text-green-700">{totalActual > 0 ? ((totalPaid / totalActual) * 100).toFixed(0) : 0}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setShowTemplateModal(true)} className="bg-[#8B1538] hover:bg-[#6d102c] text-white">
              <LayoutTemplate className="w-4 h-4 mr-2" /> Generate Budget Template
            </Button>
            <Button onClick={() => { setActiveTab("items"); setShowAddForm(true); }} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Add Line Item
            </Button>
            <Button onClick={handlePrint} variant="outline"><Printer className="w-4 h-4 mr-2" /> Print Costing</Button>
            <Button onClick={handleExportCSV} variant="outline"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
          </div>
        </TabsContent>

        <TabsContent value="planner">
          <BudgetPlannerTab
            totalBudget={totalBudget}
            currency={currency}
            eventType={eventType}
            guestCount={guestCount}
            budgetItems={budgetItems}
            categoryBreakdown={categoryBreakdown}
            formatCurrency={formatCurrency}
            onAddItems={(items: any[]) => bulkCreateMutation.mutate(items)}
            isSaving={bulkCreateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="items">
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {usedCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-[#8B1538] hover:bg-[#6d102c] text-white">
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm"><Printer className="w-4 h-4" /></Button>
            <Button onClick={handleExportCSV} variant="outline" size="sm"><Download className="w-4 h-4" /></Button>
          </div>

          {showAddForm && (
            <Card className="mb-6 border-[#8B1538]/30">
              <CardHeader className="bg-[#8B1538] text-white rounded-t-lg py-3 px-4">
                <CardTitle className="text-base flex items-center gap-2"><Plus className="w-5 h-5" /> Add Budget Line Item</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Category *</Label>
                    <Select value={newItem.category} onValueChange={v => setNewItem({ ...newItem, category: v, subcategory: "" })}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent className="max-h-[400px]">
                        {COMPREHENSIVE_CATEGORIES.map(c => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Subcategory</Label>
                    <Select value={newItem.subcategory} onValueChange={v => setNewItem({ ...newItem, subcategory: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                      <SelectContent className="max-h-[400px]">
                        {selectedSubcategories.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Item Name *</Label>
                    <Input value={newItem.item} onChange={e => setNewItem({ ...newItem, item: e.target.value })} placeholder="e.g. Grand Ballroom Hire" />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs">Description</Label>
                    <Input value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="Brief description of this cost" />
                  </div>
                  <div>
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min={0} step={0.5} value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Type</Label>
                    <Select value={newItem.unitType} onValueChange={v => setNewItem({ ...newItem, unitType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Unit Cost ({currency})</Label>
                    <Input type="number" min={0} step={100} value={newItem.unitCost} onChange={e => setNewItem({ ...newItem, unitCost: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Markup %</Label>
                    <Input type="number" min={0} max={100} value={newItem.markupPercent} onChange={e => setNewItem({ ...newItem, markupPercent: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Estimated Cost ({currency})</Label>
                    <Input type="number" min={0} value={newItem.estimatedCost} onChange={e => setNewItem({ ...newItem, estimatedCost: Number(e.target.value) })} className={newItem.unitCost > 0 ? "bg-gray-100" : ""} readOnly={newItem.unitCost > 0} />
                    {newItem.unitCost > 0 && <p className="text-xs text-gray-500 mt-1">Auto: {newItem.quantity} × {formatCurrency(newItem.unitCost)} {newItem.markupPercent > 0 ? `+ ${newItem.markupPercent}% markup` : ''}</p>}
                    {newItem.unitCost === 0 && <p className="text-xs text-gray-500 mt-1">Enter unit cost for auto-calc, or type estimated cost directly</p>}
                  </div>
                  <div>
                    <Label className="text-xs">Vendor</Label>
                    <Input value={newItem.vendor} onChange={e => setNewItem({ ...newItem, vendor: e.target.value })} placeholder="Vendor/supplier name" />
                  </div>
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Select value={newItem.priority} onValueChange={v => setNewItem({ ...newItem, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Due Date</Label>
                    <Input type="date" value={newItem.dueDate} onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })} />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs">Notes</Label>
                    <Textarea value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} placeholder="Additional notes..." rows={2} />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button onClick={handleAddItem} disabled={createMutation.isPending} className="bg-[#8B1538] hover:bg-[#6d102c] text-white">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> {createMutation.isPending ? "Adding..." : "Add Item"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No budget items yet</p>
                <p className="text-sm">Click "Add Item" or "Generate Budget Template" to get started with your event costing</p>
              </CardContent></Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#8B1538] text-white text-xs">
                      <th className="p-2 text-left">Category</th>
                      <th className="p-2 text-left">Item</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-left">Unit</th>
                      <th className="p-2 text-right">Unit Cost</th>
                      <th className="p-2 text-right">Estimated</th>
                      <th className="p-2 text-right">Actual</th>
                      <th className="p-2 text-right">Paid</th>
                      <th className="p-2 text-left">Vendor</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item: any) => (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div className="text-xs font-medium">{item.category}</div>
                          {item.subcategory && <div className="text-xs text-gray-500">{item.subcategory}</div>}
                        </td>
                        <td className="p-2">
                          <div className="font-medium">{item.item}</div>
                          {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                        </td>
                        <td className="p-2 text-right">{item.quantity || 1}</td>
                        <td className="p-2 text-xs">{UNIT_TYPES.find(u => u.value === item.unitType)?.label || 'Flat Rate'}</td>
                        <td className="p-2 text-right">{formatCurrency(parseFloat(String(item.unitCost || 0)))}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(parseFloat(String(item.estimatedCost || 0)))}</td>
                        <td className="p-2 text-right">
                          {editingItemId === item.id ? (
                            <div className="flex items-center gap-1">
                              <Input type="number" defaultValue={item.actualCost || 0} className="w-24 h-7 text-xs"
                                onBlur={e => updateMutation.mutate({ id: item.id, data: { actualCost: e.target.value } })} />
                              {updateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                            </div>
                          ) : (
                            <span className="cursor-pointer" onClick={() => setEditingItemId(item.id)}>
                              {formatCurrency(parseFloat(String(item.actualCost || 0)))}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {editingItemId === item.id ? (
                            <div className="flex items-center gap-1">
                              <Input type="number" defaultValue={item.paidAmount || 0} className="w-24 h-7 text-xs"
                                onBlur={e => updateMutation.mutate({ id: item.id, data: { paidAmount: e.target.value, paid: parseFloat(e.target.value) > 0 } })} />
                              {updateMutation.isPending && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                            </div>
                          ) : (
                            <span className="cursor-pointer" onClick={() => setEditingItemId(item.id)}>
                              {formatCurrency(parseFloat(String(item.paidAmount || 0)))}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-xs">{item.vendor || '-'}</td>
                        <td className="p-2 text-center">
                          <Badge className={`text-xs ${item.status === 'paid' ? 'bg-green-100 text-green-800' : item.status === 'approved' ? 'bg-blue-100 text-blue-800' : item.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {item.status || 'pending'}
                          </Badge>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingItemId(item.id === editingItemId ? null : item.id)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => deleteMutation.mutate(item.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#8B1538] text-white font-bold">
                      <td className="p-2" colSpan={5}>TOTAL</td>
                      <td className="p-2 text-right">{formatCurrency(totalEstimated)}</td>
                      <td className="p-2 text-right">{formatCurrency(totalActual)}</td>
                      <td className="p-2 text-right">{formatCurrency(totalPaid)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="space-y-3">
            <div className="flex gap-3 mb-4">
              <Button onClick={() => setShowTemplateModal(true)} className="bg-[#8B1538] hover:bg-[#6d102c] text-white">
                <LayoutTemplate className="w-4 h-4 mr-2" /> Generate Template
              </Button>
              <p className="text-sm text-gray-500 flex items-center">
                {COMPREHENSIVE_CATEGORIES.length} categories available covering every aspect of event planning
              </p>
            </div>
            {COMPREHENSIVE_CATEGORIES.map(cat => {
              const catData = categoryBreakdown.get(cat.name);
              const isExpanded = expandedCategories.has(cat.name);
              const itemCount = catData?.items.length || 0;
              return (
                <Card key={cat.name} className={`${itemCount > 0 ? 'border-[#8B1538]/30' : 'border-gray-200 opacity-75'}`}>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50" onClick={() => toggleCategory(cat.name)}>
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="font-medium text-sm">{cat.name}</span>
                      <Badge variant="outline" className="text-xs">{itemCount} items</Badge>
                      <Badge variant="outline" className="text-xs text-gray-400">{cat.subcategories.length} subcategories</Badge>
                    </div>
                    <div className="text-right">
                      {catData && <span className="font-semibold text-sm">{formatCurrency(catData.estimated)}</span>}
                    </div>
                  </div>
                  {isExpanded && (
                    <CardContent className="pt-0 pb-3 px-3">
                      <div className="bg-gray-50 rounded p-3 mb-3">
                        <p className="text-xs text-gray-600 font-medium mb-1">Available subcategories:</p>
                        <div className="flex flex-wrap gap-1">
                          {cat.subcategories.map(s => (
                            <Badge key={s} variant="outline" className="text-xs bg-white cursor-pointer hover:bg-[#8B1538] hover:text-white"
                              onClick={() => { setNewItem({ ...newItem, category: cat.name, subcategory: s, item: s }); setShowAddForm(true); setActiveTab("items"); }}>
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {catData && catData.items.length > 0 && (
                        <div className="space-y-1">
                          {catData.items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border">
                              <div>
                                <span className="font-medium">{item.item}</span>
                                {item.subcategory && <span className="text-gray-500 ml-2">({item.subcategory})</span>}
                              </div>
                              <span className="font-semibold">{formatCurrency(parseFloat(String(item.estimatedCost || 0)))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="staff">
          <Card>
            <CardHeader className="bg-[#8B1538] text-white rounded-t-lg py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2"><Users className="w-5 h-5" /> Approved Internal Team Costs</CardTitle>
              <CardDescription className="text-white/70 text-sm">Staff costs from the Internal Team Budget that have been approved and added to bill</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {staffCosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>No approved staff costs yet</p>
                  <p className="text-sm">Approve staff in the Internal Team Budget to see them here</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-xs">
                          <th className="p-2 text-left">Role</th>
                          <th className="p-2 text-left">Name</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">Rate/Unit</th>
                          <th className="p-2 text-right">Total Cost</th>
                          <th className="p-2 text-left">Shift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffCosts.map((s: any) => (
                          <tr key={s.id} className="border-b">
                            <td className="p-2 font-medium">{s.role}</td>
                            <td className="p-2">{s.name || '-'}</td>
                            <td className="p-2 text-right">{s.quantity}</td>
                            <td className="p-2 text-right">{formatCurrency(s.ratePerUnit)}</td>
                            <td className="p-2 text-right font-semibold">{formatCurrency(s.totalCost)}</td>
                            <td className="p-2 text-xs">{s.shift || '-'}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#8B1538] text-white font-bold">
                          <td className="p-2" colSpan={4}>TOTAL STAFF COSTS</td>
                          <td className="p-2 text-right">{formatCurrency(staffTotal)}</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="bg-[#8B1538] text-white rounded-t-lg py-3 px-4">
              <CardTitle className="text-base">Generate Budget Template</CardTitle>
              <CardDescription className="text-white/70 text-sm">Choose an event type to pre-populate budget categories</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {Object.entries(EVENT_TEMPLATES).map(([type, cats]) => (
                <Button key={type} variant="outline" className="w-full justify-between" onClick={() => generateTemplate(type)} disabled={bulkCreateMutation.isPending}>
                  <span className="capitalize font-medium">{type} Event</span>
                  <Badge variant="outline">{cats.length} categories</Badge>
                </Button>
              ))}
              <Button variant="outline" className="w-full" onClick={() => setShowTemplateModal(false)}>Cancel</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
