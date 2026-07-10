/**
 * 130-person guest longlist import
 * Structured data ready for import into Guest Intelligence Database
 */

export interface GuestImportData {
  name: string;
  company: string;
  role: string;
  sector: string;
  region: string;
  notes?: string;
}

export const GUEST_LONGLIST: GuestImportData[] = [
  // Property / Interiors / Construction (22)
  { name: "Karen Howes", company: "Taylor Howes", role: "Director", sector: "Property/Interiors", region: "London", notes: "Interior design" },
  { name: "Charu Gandhi", company: "Elicyon", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Luxury interiors" },
  { name: "Sophie Ashby", company: "Studio Ashby", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Interior design" },
  { name: "Jo Littlefair", company: "Goddard Littlefair", role: "Director", sector: "Property/Interiors", region: "London", notes: "Architects" },
  { name: "Fiona Barratt-Campbell", company: "Fiona Barratt Interiors", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Interior designer" },
  { name: "Sarah Christie", company: "Balance Out Living", role: "Founder", sector: "Property/Interiors", region: "South East", notes: "Interior design" },
  { name: "Hanna Afolabi", company: "Mood and Space", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Interior design" },
  { name: "Trish Barrigan", company: "Benson Elliot", role: "Managing Director", sector: "Property/Interiors", region: "London", notes: "Interior design" },
  { name: "Gabriela Hersham", company: "Huckletree", role: "CEO", sector: "Property/Interiors", region: "London", notes: "Workspace" },
  { name: "Nicola Bird", company: "AccXel / K W Bell", role: "Director", sector: "Property/Interiors", region: "London", notes: "Property" },
  { name: "Lynda Shillaw", company: "Harworth", role: "Executive", sector: "Property/Interiors", region: "North East", notes: "Development" },
  { name: "Katrina Lelliott", company: "The Lelliott Group", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Property" },
  { name: "Becky Worthington", company: "Canary Wharf Group", role: "Executive", sector: "Property/Interiors", region: "London", notes: "Real estate" },
  { name: "Mandy St John Davey", company: "TBM Properties", role: "Director", sector: "Property/Interiors", region: "London", notes: "Property" },
  { name: "Savannah de Savary", company: "Built-ID", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Construction tech" },
  { name: "Orla Shields", company: "Kamma", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Property tech" },
  { name: "Tripty Arya", company: "Travtus", role: "CEO", sector: "Property/Interiors", region: "London", notes: "Commercial real estate" },
  { name: "Gemma Young", company: "Settled", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Proptech" },
  { name: "Brittany Harris", company: "Qflow", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Construction tech" },
  { name: "Lucy Sharp", company: "Dot Residential", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Property" },
  { name: "Ruth Devine", company: "SJD Electrical", role: "Director", sector: "Property/Interiors", region: "East Midlands", notes: "MK-based, electrical" },
  { name: "Merilee Karr", company: "UnderTheDoormat", role: "Founder", sector: "Property/Interiors", region: "London", notes: "Property tech" },

  // Fintech / Finance / Investment (21)
  { name: "Anne Boden", company: "Starling", role: "CEO", sector: "Finance", region: "London", notes: "Fintech founder" },
  { name: "Dame Jayne-Anne Gadhia", company: "Snoop", role: "CEO", sector: "Finance", region: "London", notes: "Banking/fintech" },
  { name: "Addy Loudiadis", company: "Rothesay", role: "CEO", sector: "Finance", region: "London", notes: "Investment" },
  { name: "Katrin Herrling", company: "Funding Xchange", role: "CEO", sector: "Finance", region: "London", notes: "Fintech" },
  { name: "Michelle Pearce-Burke", company: "Wealthify", role: "Executive", sector: "Finance", region: "London", notes: "Fintech" },
  { name: "Nancy Butler", company: "Bank North", role: "CEO", sector: "Finance", region: "Yorkshire", notes: "Community bank" },
  { name: "Charlotte Hogg", company: "Visa Europe", role: "Executive", sector: "Finance", region: "London", notes: "Payments" },
  { name: "Romi Savova", company: "PensionBee", role: "CEO", sector: "Finance", region: "London", notes: "Fintech" },
  { name: "Elizabeth Rossiello", company: "AZA Finance", role: "CEO", sector: "Finance", region: "London", notes: "Crypto finance" },
  { name: "Nicky Goulimis", company: "Tunic Pay", role: "CEO", sector: "Finance", region: "London", notes: "Fintech" },
  { name: "Dame Amanda Blanc", company: "Aviva", role: "CEO", sector: "Finance", region: "London", notes: "Insurance" },
  { name: "Milena Mondini de Focatiis", company: "Admiral", role: "CEO", sector: "Finance", region: "Wales", notes: "Insurance" },
  { name: "Eileen Burbidge", company: "Passion Capital", role: "Investor", sector: "Finance", region: "London", notes: "Venture capital" },
  { name: "Sam Smith", company: "Cavendish/finnCap", role: "Executive", sector: "Finance", region: "London", notes: "Investment banking" },
  { name: "Debbie Woskow", company: "AllBright", role: "Founder", sector: "Finance", region: "London", notes: "Women in business" },
  { name: "Dame Alison Rose", company: "NatWest", role: "CEO", sector: "Finance", region: "London", notes: "Banking" },
  { name: "Catherine Sin", company: "Beyla", role: "CEO", sector: "Finance", region: "London", notes: "Fintech" },
  { name: "Emma Hagan", company: "ClearBank", role: "CEO", sector: "Finance", region: "London", notes: "Fintech" },
  { name: "Janine Hirt", company: "Innovate Finance", role: "Executive", sector: "Finance", region: "London", notes: "Fintech association" },
  { name: "Susanne Chishti", company: "FINTECH Circle", role: "Founder", sector: "Finance", region: "London", notes: "Fintech community" },
  { name: "Andrea Reynolds", company: "Swoop", role: "CEO", sector: "Finance", region: "London", notes: "Fintech" },

  // Professional Services (8)
  { name: "Sally Dewar", company: "A&O Shearman", role: "Partner", sector: "Professional Services", region: "London", notes: "Law" },
  { name: "Claire Wills", company: "Freshfields", role: "Partner", sector: "Professional Services", region: "London", notes: "Law" },
  { name: "Frances Swaine", company: "Leigh Day", role: "Partner", sector: "Professional Services", region: "London", notes: "Law" },
  { name: "Caroline Firstbrook", company: "Clifford Chance", role: "Partner", sector: "Professional Services", region: "London", notes: "Law" },
  { name: "Linda Woolley", company: "Kingsley Napley", role: "Partner", sector: "Professional Services", region: "London", notes: "Law" },
  { name: "Joanne Bell", company: "Bells Accountants", role: "Director", sector: "Professional Services", region: "London", notes: "Accounting" },
  { name: "Erica Turner", company: "Jacksons Law", role: "Partner", sector: "Professional Services", region: "London", notes: "Law" },
  { name: "Clare King", company: "Freeths", role: "Partner", sector: "Professional Services", region: "Midlands", notes: "Law" },

  // Tech / SaaS / Digital (12)
  { name: "Martha Lane Fox", company: "Lastminute.com", role: "Founder", sector: "Tech/SaaS", region: "London", notes: "Tech entrepreneur" },
  { name: "Sarah Wood", company: "Unruly", role: "Founder", sector: "Tech/SaaS", region: "London", notes: "Video tech" },
  { name: "Alex Depledge", company: "Resi", role: "Founder", sector: "Tech/SaaS", region: "London", notes: "Proptech" },
  { name: "Tabitha Goldstaub", company: "CognitionX", role: "Founder", sector: "Tech/SaaS", region: "London", notes: "AI/tech" },
  { name: "Sukhi Jutla", company: "MarketOrders", role: "Founder", sector: "Tech/SaaS", region: "London", notes: "Fintech" },
  { name: "Tanya Suárez", company: "IoT Tribe", role: "Founder", sector: "Tech/SaaS", region: "London", notes: "IoT" },
  { name: "Tugce Bulut", company: "Streetbees", role: "Founder", sector: "Tech/SaaS", region: "London", notes: "Consumer insights" },
  { name: "Rachel Carrell", company: "Koru Kids", role: "Founder", sector: "Tech/SaaS", region: "London", notes: "Childcare tech" },
  { name: "Lourdes Agapito", company: "Synthesia", role: "Executive", sector: "Tech/SaaS", region: "London", notes: "AI video" },
  { name: "Vinita Rathi", company: "Systango", role: "Executive", sector: "Tech/SaaS", region: "London", notes: "Software" },
  { name: "Catriona Campbell", company: "EY", role: "Executive", sector: "Tech/SaaS", region: "London", notes: "Professional services" },
  { name: "Sara Murray", company: "Confused.com", role: "Executive", sector: "Tech/SaaS", region: "London", notes: "Fintech" },

  // Fashion / Retail / E-commerce (15)
  { name: "Anya Hindmarch", company: "Anya Hindmarch", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Fashion designer" },
  { name: "Dame Natalie Massenet", company: "Net-a-Porter", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Luxury e-commerce" },
  { name: "Julia Straus", company: "Sweaty Betty", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Athletic wear" },
  { name: "Anne Pitcher", company: "Selfridges", role: "Executive", sector: "Fashion/Retail", region: "London", notes: "Retail" },
  { name: "Alannah Weston", company: "Selfridges", role: "Executive", sector: "Fashion/Retail", region: "London", notes: "Retail" },
  { name: "Eshita Kabra-Davies", company: "By Rotation", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Fashion rental" },
  { name: "Amy Knight", company: "Must Have Ideas", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Fashion" },
  { name: "Safia Minney", company: "People Tree", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Ethical fashion" },
  { name: "Cherry Freeman", company: "LoveCrafts", role: "CEO", sector: "Fashion/Retail", region: "London", notes: "E-commerce" },
  { name: "Chrissie Rucker", company: "The White Company", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Lifestyle retail" },
  { name: "Connie Nam", company: "Astrid & Miyu", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Luxury jewelry" },
  { name: "Suzannah Crabb", company: "Suzannah London", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Fashion designer" },
  { name: "Chelsy Davy", company: "Aya", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Fashion brand" },
  { name: "Holly Tucker", company: "Notonthehighstreet", role: "Founder", sector: "Fashion/Retail", region: "London", notes: "Marketplace" },
  { name: "Linda Bennett", company: "L.K.Bennett", role: "Executive", sector: "Fashion/Retail", region: "London", notes: "Retail" },

  // Food / Hospitality / Drinks (12)
  { name: "Pip Murray", company: "Pip & Nut", role: "Founder", sector: "Food/Hospitality", region: "London", notes: "Food" },
  { name: "Fran Wyatt", company: "Porky Whites", role: "Founder", sector: "Food/Hospitality", region: "South West", notes: "Food" },
  { name: "Nagma Ebanks-Beni", company: "Prima Cheese", role: "Founder", sector: "Food/Hospitality", region: "London", notes: "Food" },
  { name: "Kit Kemp", company: "Firmdale Hotels", role: "CEO", sector: "Food/Hospitality", region: "London", notes: "Hospitality" },
  { name: "Eccie Newton", company: "Karma Kitchen", role: "Founder", sector: "Food/Hospitality", region: "London", notes: "Dining" },
  { name: "Emma Heal", company: "Lucky Saint", role: "Founder", sector: "Food/Hospitality", region: "London", notes: "Beverage" },
  { name: "Samyukta Nair", company: "Jamavar", role: "Founder", sector: "Food/Hospitality", region: "London", notes: "Dining" },
  { name: "Ros Heathcote", company: "Borough Broth", role: "Founder", sector: "Food/Hospitality", region: "London", notes: "Food" },
  { name: "Chantelle Nicholson", company: "Apricity", role: "Founder", sector: "Food/Hospitality", region: "London", notes: "Dining" },
  { name: "Ravinder Bhogal", company: "Jikoni", role: "Founder", sector: "Food/Hospitality", region: "London", notes: "Dining" },
  { name: "Hannah Gibson", company: "Ocado Retail", role: "Executive", sector: "Food/Hospitality", region: "East Anglia", notes: "Herts/MK area" },
  { name: "Karen O'Flaherty", company: "Pip Organic", role: "Founder", sector: "Food/Hospitality", region: "London", notes: "Food" },

  // Creative / Media / Marketing / PR (13)
  { name: "Dame Carolyn McCall", company: "ITV", role: "CEO", sector: "Creative/Media", region: "London", notes: "Media" },
  { name: "Sara McCorquodale", company: "CORQ", role: "Founder", sector: "Creative/Media", region: "London", notes: "PR" },
  { name: "Sedge Beswick", company: "SEEN Connects", role: "Founder", sector: "Creative/Media", region: "London", notes: "Marketing" },
  { name: "Maxine Freer", company: "We Do", role: "Founder", sector: "Creative/Media", region: "London", notes: "Events/creative" },
  { name: "Cathy White", company: "CEW", role: "Executive", sector: "Creative/Media", region: "London", notes: "Beauty industry" },
  { name: "Jennifer Davidson", company: "Sleek Events", role: "Founder", sector: "Creative/Media", region: "London", notes: "Events" },
  { name: "Monica Ferguson", company: "The Stables", role: "Director", sector: "Creative/Media", region: "East Midlands", notes: "MK-based, events venue" },
  { name: "AJ Bouchada", company: "Cebiso M Studio", role: "Founder", sector: "Creative/Media", region: "East Midlands", notes: "MK-based, creative" },
  { name: "Kirsty Leighton", company: "Milk & Honey PR", role: "Founder", sector: "Creative/Media", region: "London", notes: "PR" },
  { name: "Vanessa Chapman", company: "VJC Media", role: "Founder", sector: "Creative/Media", region: "London", notes: "Media" },
  { name: "Julia Munder", company: "RO Pictures", role: "Founder", sector: "Creative/Media", region: "London", notes: "Film/production" },
  { name: "Amanda Pearce", company: "Diva Creative", role: "Founder", sector: "Creative/Media", region: "London", notes: "Creative" },
  { name: "Heather Baker", company: "TopLine Comms", role: "Founder", sector: "Creative/Media", region: "London", notes: "Communications" },

  // Manufacturing / Product / Trade (8)
  { name: "Alison Orrells", company: "Safety Letterbox Co", role: "Founder", sector: "Manufacturing", region: "London", notes: "Manufacturing" },
  { name: "Camilla Hadcock", company: "Roach Bridge Tissues", role: "Founder", sector: "Manufacturing", region: "London", notes: "Manufacturing" },
  { name: "Natalie Kerres", company: "SCALED", role: "Founder", sector: "Manufacturing", region: "London", notes: "Product" },
  { name: "Dawn Childs", company: "Pure Data Centres", role: "CEO", sector: "Manufacturing", region: "London", notes: "Infrastructure" },
  { name: "Dr Giorgia Longobardi", company: "Cambridge GaN", role: "CEO", sector: "Manufacturing", region: "East Anglia", notes: "Semiconductor" },
  { name: "Emma Shipley", company: "Emma J Shipley", role: "Founder", sector: "Manufacturing", region: "London", notes: "Luxury product" },
  { name: "Pam Parker", company: "PPSGB", role: "Director", sector: "Manufacturing", region: "East Midlands", notes: "MK-based" },
  { name: "Sarah Black-Smith", company: "Siemens", role: "Executive", sector: "Manufacturing", region: "London", notes: "Industrial" },

  // Energy / Sustainability / Cleantech (10)
  { name: "Juliet Davenport", company: "Good Energy", role: "Founder", sector: "Energy/Sustainability", region: "South West", notes: "Renewable energy" },
  { name: "Dr Nina Skorupska", company: "REA", role: "CEO", sector: "Energy/Sustainability", region: "London", notes: "Renewable energy" },
  { name: "Linda Grave", company: "EV Driver", role: "Founder", sector: "Energy/Sustainability", region: "London", notes: "Electric vehicles" },
  { name: "Jordan Brompton", company: "myenergi", role: "Founder", sector: "Energy/Sustainability", region: "North West", notes: "Energy tech" },
  { name: "Charnjit Singh", company: "EZOO", role: "Founder", sector: "Energy/Sustainability", region: "London", notes: "Sustainability" },
  { name: "Tara Singh", company: "RenewableUK", role: "Executive", sector: "Energy/Sustainability", region: "London", notes: "Renewable energy" },
  { name: "Jane Cooper", company: "RenewableUK", role: "Executive", sector: "Energy/Sustainability", region: "London", notes: "Renewable energy" },
  { name: "Sarah Webb", company: "Anesco", role: "Executive", sector: "Energy/Sustainability", region: "South West", notes: "Energy" },
  { name: "Vicky Read", company: "ChargeUK", role: "Executive", sector: "Energy/Sustainability", region: "London", notes: "Electric vehicles" },
  { name: "Liv Garfield", company: "Severn Trent", role: "CEO", sector: "Energy/Sustainability", region: "Midlands", notes: "Utilities" },

  // Recruitment / HR / People / Talent (9)
  { name: "Rosaleen Blair", company: "AMS", role: "CEO", sector: "Recruitment", region: "London", notes: "Recruitment" },
  { name: "Caroline Foote", company: "Career Moves", role: "Founder", sector: "Recruitment", region: "London", notes: "Recruitment" },
  { name: "Laura Beavis", company: "Stott and May", role: "Director", sector: "Recruitment", region: "London", notes: "Recruitment" },
  { name: "Samantha Hurley", company: "APSCo", role: "Executive", sector: "Recruitment", region: "London", notes: "Recruitment" },
  { name: "Sian Wilson", company: "Day One", role: "Founder", sector: "Recruitment", region: "London", notes: "HR tech" },
  { name: "Vanessa Gavan", company: "Imprint Global", role: "Founder", sector: "Recruitment", region: "London", notes: "Recruitment" },
  { name: "Helen Cook", company: "Finastra", role: "Executive", sector: "Recruitment", region: "London", notes: "Tech" },
  { name: "Geeta Sidhu-Robb", company: "WCorp", role: "Founder", sector: "Recruitment", region: "London", notes: "HR" },
  { name: "Suzie Vincent", company: "Baltimore Consulting", role: "Founder", sector: "Recruitment", region: "London", notes: "Recruitment" },
];
