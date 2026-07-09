import type { Express, Request, Response, NextFunction } from "express";

type RouteSEO = {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogType: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  keywords?: string;
};

export const ROUTE_SEO: Record<string, RouteSEO> = {
  "/iamher": {
    title: "The Woman Who Leads the Room | Invitation-Only Evening for Accomplished Women | Event Perfekt",
    description: "A private, invitation-only evening for accomplished women. The Woman Who Leads the Room — Friday 30 October 2026, Milton Keynes. 100 carefully selected women from across business, healthcare, finance, the arts and public life. Thoughtful conversation, exceptional hospitality and recognition. Curated by Event Perfekt.",
    canonical: "https://eventperfekt.net/iamher",
    ogTitle: "The Woman Who Leads the Room | Invitation-Only Evening for Accomplished Women",
    ogDescription: "A private, invitation-only evening for accomplished women. 100 carefully selected women from across business, healthcare, finance, the arts and public life. Thoughtful conversation, exceptional hospitality and recognition.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "The Woman Who Leads the Room — a private, invitation-only evening for accomplished women",
    ogType: "event",
    twitterTitle: "The Woman Who Leads the Room | Invitation-Only Evening for Accomplished Women",
    twitterDescription: "A private, invitation-only evening for accomplished women. 100 carefully selected women from across business, healthcare, finance, the arts and public life.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "invitation-only evening for women, accomplished women UK, curated women's evening, private event for women, female founders UK, women in business, Event Perfekt, The Woman Who Leads the Room, I Am Her, Milton Keynes event 2026",
  },
  "/iamher/media": {
    title: "Media & Press — I Am Her | Event Perfekt",
    description: "Watch the I Am Her event introduction video and Esther Emenike on the wellbeing story behind the room. Press coverage, media kit, videos, and podcast content for I Am Her — the luxury leadership wellbeing evening for women who lead.",
    canonical: "https://eventperfekt.net/iamher/media",
    ogTitle: "Media & Press — I Am Her | Event Perfekt",
    ogDescription: "Watch the I Am Her event introduction video and Esther Emenike on the wellbeing story behind the room. Press coverage, media kit, videos, and podcast content.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her — luxury leadership wellbeing evening for women who lead",
    ogType: "video.other",
    twitterTitle: "Media & Press — I Am Her | Event Perfekt",
    twitterDescription: "Watch the I Am Her event introduction video and Esther Emenike on the wellbeing story behind the room.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her, event introduction video, Esther Emenike, women leadership, Milton Keynes, women founders, women executives, leadership wellbeing, press, media kit, video, luxury women evening",
  },
  "/booth": {
    title: "360 Photo Booth Hire | UK & Nigeria | Event Perfekt",
    description: "Premium 360 photo booth hire for weddings, birthdays, corporate events and private parties across the UK and Nigeria. Instant sharing, professional attendant, stylish setup. Book your booth today.",
    canonical: "https://eventperfekt.net/booth",
    ogTitle: "360 Photo Booth Hire | UK & Nigeria | Event Perfekt",
    ogDescription: "Premium 360 photo booth hire for weddings, birthdays, corporate events and private parties across the UK and Nigeria. Book your booth today.",
    ogImage: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
    ogImageAlt: "Guests enjoying a 360 photo booth experience at a luxury event",
    ogType: "product",
    twitterTitle: "360 Photo Booth Hire | UK & Nigeria | Event Perfekt",
    twitterDescription: "Premium 360 photo booth hire for weddings, birthdays, corporate events and private parties across the UK and Nigeria.",
    twitterImage: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
    keywords: "360 photo booth hire, 360 booth rental, photo booth UK, photo booth Nigeria, wedding photo booth, corporate event booth, birthday photo booth, party booth hire, 360 video booth, event photo booth, instant sharing booth, photo booth Milton Keynes, photo booth Lagos",
  },
  "/360-booth-hire-milton-keynes": {
    title: "360 Booth Hire Milton Keynes & Buckinghamshire | 360 Photo Booth Rental | Event Perfekt",
    description: "Premium 360 booth hire in Milton Keynes, Buckinghamshire and surrounding areas. Weddings, birthdays, private parties and corporate events. Instant sharing, stylish setup and booth attendant included.",
    canonical: "https://eventperfekt.net/360-booth-hire-milton-keynes",
    ogTitle: "360 Booth Hire Milton Keynes & Buckinghamshire | 360 Photo Booth Rental",
    ogDescription: "Premium 360 booth hire in Milton Keynes, Buckinghamshire and surrounding areas for weddings, birthdays, private parties and corporate events.",
    ogImage: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
    ogImageAlt: "Guests enjoying a 360 photo booth experience at a luxury event in Milton Keynes",
    ogType: "product",
    twitterTitle: "360 Booth Hire Milton Keynes & Buckinghamshire | 360 Photo Booth Rental",
    twitterDescription: "Premium 360 booth hire in Milton Keynes, Buckinghamshire and surrounding areas for weddings, birthdays, private parties and corporate events.",
    twitterImage: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
    keywords: "360 booth hire Milton Keynes, 360 photo booth rental Buckinghamshire, photo booth hire Bedford, 360 video booth Northampton, party booth hire Luton, wedding 360 booth Milton Keynes, birthday photo booth hire, corporate event booth rental, 360 spinning booth hire UK, event photo booth Milton Keynes, party entertainment Buckinghamshire, video booth rental, 360 camera booth hire",
  },
  "/iamher/partnership/product-brands": {
    title: "Product Brand Partnership | I Am Her | The Woman Who Leads the Room",
    description: "Put your product in the hands of 100 women who lead. Goody bag, consultation station, and branded room moments for luxury skincare, wellness, fashion, fragrance, and lifestyle brands. I Am Her, Milton Keynes, 30 October 2026.",
    canonical: "https://eventperfekt.net/iamher/partnership/product-brands",
    ogTitle: "Product Brand Partnership | I Am Her | The Woman Who Leads the Room",
    ogDescription: "Put your product in the hands of 100 women who lead. Goody bag, consultation station, and branded room moments for luxury skincare, wellness, fashion, fragrance, and lifestyle brands.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her event — luxury leadership wellbeing evening for women who lead",
    ogType: "product",
    twitterTitle: "Product Brand Partnership | I Am Her | The Woman Who Leads the Room",
    twitterDescription: "Put your product in the hands of 100 women who lead. Goody bag, consultation station, and branded room moments.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "product brand partnership women's event, goody bag brand placement, women founders product sampling, luxury skincare brand event UK, wellness brand partnership, female executive brand discovery, product consultation event, brand experience women leaders, I Am Her product partner, eventperfekt brand partnership",
  },
  "/access": {
    title: "Request Access | The Woman Who Leads the Room | I Am Her",
    description: "Request your invitation to The Woman Who Leads the Room — a luxury leadership wellbeing evening for 100 women who lead. Founders, executives, and changemakers. Milton Keynes, 30 October 2026.",
    canonical: "https://eventperfekt.net/access",
    ogTitle: "Request Access | The Woman Who Leads the Room | I Am Her",
    ogDescription: "Request your invitation to The Woman Who Leads the Room — a luxury leadership wellbeing evening for 100 women who lead.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "The Woman Who Leads the Room — request your invitation",
    ogType: "website",
    twitterTitle: "Request Access | The Woman Who Leads the Room | I Am Her",
    twitterDescription: "Request your invitation to The Woman Who Leads the Room — a luxury leadership wellbeing evening for 100 women who lead.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "request access women leadership event, invitation women's event Milton Keynes, I Am Her request invitation, women founders event UK, executive women event 2026",
  },
  "/access/payment": {
    title: "Complete Your Access | Payment | The Woman Who Leads the Room",
    description: "Complete your payment for The Woman Who Leads the Room — a luxury leadership wellbeing experience for founders, executives, and women who lead. Milton Keynes, 30 October 2026.",
    canonical: "https://eventperfekt.net/access/payment",
    ogTitle: "Complete Your Access | Payment | The Woman Who Leads the Room",
    ogDescription: "Complete your payment for The Woman Who Leads the Room — a luxury leadership wellbeing experience.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "The Woman Who Leads the Room — complete your access",
    ogType: "website",
    twitterTitle: "Complete Your Access | Payment | The Woman Who Leads the Room",
    twitterDescription: "Complete your payment for The Woman Who Leads the Room — a luxury leadership wellbeing experience.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "women's event payment, leadership event payment UK, I Am Her payment, event access payment",
  },
  "/meet-the-room": {
    title: "Meet the Room | I Am Her | The Women Behind the Titles",
    description: "Meet the 100 women who lead the room — founders, executives, professionals, and changemakers. The Woman Who Leads the Room, 30 October 2026, Milton Keynes.",
    canonical: "https://eventperfekt.net/meet-the-room",
    ogTitle: "Meet the Room | I Am Her | The Women Behind the Titles",
    ogDescription: "Meet the 100 women who lead the room — founders, executives, professionals, and changemakers.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "Meet the Room — the women behind the titles at I Am Her",
    ogType: "website",
    twitterTitle: "Meet the Room | I Am Her | The Women Behind the Titles",
    twitterDescription: "Meet the 100 women who lead the room — founders, executives, professionals, and changemakers.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "meet the room women leaders, women founders UK, female executives Milton Keynes, women who lead the room",
  },
  "/iamher/stay": {
    title: "Stay & Explore | I Am Her | Milton Keynes",
    description: "Hotels, things to do, and how to get here for The Woman Who Leads the Room. Milton Keynes — closer than you think, with more than you expect.",
    canonical: "https://eventperfekt.net/iamher/stay",
    ogTitle: "Stay & Explore | I Am Her | Milton Keynes",
    ogDescription: "Hotels, things to do, and how to get here for The Woman Who Leads the Room.",
    ogImage: "https://eventperfekt.net/assets/mk-hero-lake.png",
    ogImageAlt: "Stay and explore Milton Keynes for I Am Her event",
    ogType: "website",
    twitterTitle: "Stay & Explore | I Am Her | Milton Keynes",
    twitterDescription: "Hotels, things to do, and how to get here for The Woman Who Leads the Room.",
    twitterImage: "https://eventperfekt.net/assets/mk-hero-lake.png",
    keywords: "Milton Keynes hotels, things to do Milton Keynes, I Am Her event travel, stay Milton Keynes weekend",
  },
  "/iamher/feature": {
    title: "I Am Her — The Campaign | Share Your Story | The Woman Who Leads the Room",
    description: "The I Am Her campaign celebrates the founders, executives, professionals, and changemakers behind the titles. Get featured across Event Perfekt's editorial platforms.",
    canonical: "https://eventperfekt.net/iamher/feature",
    ogTitle: "I Am Her — The Campaign | Share Your Story | The Woman Who Leads the Room",
    ogDescription: "The I Am Her campaign celebrates the founders, executives, professionals, and changemakers behind the titles.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her campaign — share your story",
    ogType: "website",
    twitterTitle: "I Am Her — The Campaign | Share Your Story | The Woman Who Leads the Room",
    twitterDescription: "The I Am Her campaign celebrates the founders, executives, professionals, and changemakers behind the titles.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her campaign, women in leadership editorial UK, female founder spotlight, women executives feature",
  },
  "/iamher/submit-story": {
    title: "Share Your Story | I Am Her · The Woman Who Leads the Room",
    description: "Share your story with I Am Her — a space for founders, executives and professional women to speak honestly about burnout, leadership, reinvention and resilience.",
    canonical: "https://eventperfekt.net/iamher/submit-story",
    ogTitle: "Share Your Story | I Am Her · The Woman Who Leads the Room",
    ogDescription: "Share your story with I Am Her — a space for founders, executives and professional women.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "Share your story with I Am Her",
    ogType: "website",
    twitterTitle: "Share Your Story | I Am Her · The Woman Who Leads the Room",
    twitterDescription: "Share your story with I Am Her — a space for founders, executives and professional women.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her story submission, women's leadership stories, burnout stories women, share your story women",
  },

  /* ── Main marketing pages ─────────────────────────────────────── */
  "/home": {
    title: "Event Perfekt — Programme Delivery & Strategic Events | UK & Africa",
    description: "Event Perfekt delivers complex programmes and strategic events for government bodies, institutions, NGOs, and corporates. UK-headquartered, Africa-capable, government-awarded. Making yours perfekt.",
    canonical: "https://eventperfekt.net/home",
    ogTitle: "Event Perfekt — Programme Delivery & Strategic Events | UK & Africa",
    ogDescription: "UK-headquartered, Africa-capable, government-awarded. We deliver programmes and events where execution, governance, and control matter.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Event Perfekt — Professional Event Planning & Management",
    ogType: "website",
    twitterTitle: "Event Perfekt — Programme Delivery & Strategic Events",
    twitterDescription: "UK-headquartered, Africa-capable, government-awarded. We deliver programmes and events where execution, governance, and control matter.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "event management UK, programme delivery, strategic events, government event management, government events, British High Commission events, corporate conference UK, event planner London, event planner Nigeria, Event Perfekt",
  },
  "/about": {
    title: "About Event Perfekt — Our Story, Mission & Team",
    description: "Learn about Event Perfekt — the UK and Nigeria-based event management firm delivering programmes and events for government, corporates, and institutions. Headquartered in London, operating across 9+ countries.",
    canonical: "https://eventperfekt.net/about",
    ogTitle: "About Event Perfekt — Our Story, Mission & Team",
    ogDescription: "Event Perfekt is a UK and Nigeria-based event management and programme delivery firm. Government-awarded. Africa-capable. Making yours perfekt.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "About Event Perfekt",
    ogType: "website",
    twitterTitle: "About Event Perfekt — Our Story, Mission & Team",
    twitterDescription: "Event Perfekt is a UK and Nigeria-based event management and programme delivery firm. Government-awarded. Africa-capable.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "about Event Perfekt, event management company UK, event company Nigeria, event management London, event management Lagos, government event supplier UK",
  },
  "/contact": {
    title: "Contact Event Perfekt — Get in Touch",
    description: "Contact Event Perfekt to discuss your event or programme. UK office: 20 Wenlock Road, London N1 7PG. Nigeria office: 25 Kusenla Street, Lagos. We'd love to hear about your next project.",
    canonical: "https://eventperfekt.net/contact",
    ogTitle: "Contact Event Perfekt — Get in Touch",
    ogDescription: "Contact Event Perfekt to discuss your event or programme. Offices in London and Lagos.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Contact Event Perfekt",
    ogType: "website",
    twitterTitle: "Contact Event Perfekt — Get in Touch",
    twitterDescription: "Contact Event Perfekt to discuss your event or programme. Offices in London and Lagos.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "contact Event Perfekt, event management contact, event planner UK contact, event company London contact",
  },
  "/booking-enquiry": {
    title: "Book Your Event | Event Perfekt — Weddings, Corporate & Private Events",
    description: "Submit a booking enquiry for your wedding, corporate event, private celebration, or day coordination with Event Perfekt. UK and Nigeria. We'll be in touch within 24 hours.",
    canonical: "https://eventperfekt.net/booking-enquiry",
    ogTitle: "Book Your Event | Event Perfekt",
    ogDescription: "Submit a booking enquiry for your wedding, corporate event, private celebration, or day coordination with Event Perfekt. UK and Nigeria.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Book your event with Event Perfekt",
    ogType: "website",
    twitterTitle: "Book Your Event | Event Perfekt",
    twitterDescription: "Submit a booking enquiry for your wedding, corporate event, private celebration, or day coordination. UK and Nigeria.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "book event planner UK, book wedding planner Nigeria, event booking enquiry, corporate event booking, day coordination booking, Event Perfekt booking",
  },
  "/consultation-request": {
    title: "Request a Consultation | Event Perfekt",
    description: "Request a free consultation with Event Perfekt to discuss your programme, event, or project needs. UK and Nigeria delivery. Government, corporate, and private clients welcome.",
    canonical: "https://eventperfekt.net/consultation-request",
    ogTitle: "Request a Consultation | Event Perfekt",
    ogDescription: "Request a free consultation with Event Perfekt to discuss your programme, event, or project needs.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Request a consultation with Event Perfekt",
    ogType: "website",
    twitterTitle: "Request a Consultation | Event Perfekt",
    twitterDescription: "Request a free consultation with Event Perfekt to discuss your programme, event, or project needs.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "event management consultation UK, event planning consultation Nigeria, free event consultation, programme delivery consultation",
  },

  /* ── Photo Booth ──────────────────────────────────────────────── */
  "/photo-booth-nigeria": {
    title: "360 Photo Booth Hire Nigeria | Lagos 360 Booth Rental | Event Perfekt",
    description: "Premium 360 photo booth hire in Lagos, Nigeria. Weddings, birthdays, corporate events, and private celebrations. Instant sharing, branded overlays, and professional booth attendant included. Get a quote today.",
    canonical: "https://eventperfekt.net/photo-booth-nigeria",
    ogTitle: "360 Photo Booth Hire Nigeria | Lagos 360 Booth Rental",
    ogDescription: "Premium 360 photo booth hire in Lagos, Nigeria. Weddings, birthdays, corporate events, and private celebrations. Instant sharing and professional booth attendant included.",
    ogImage: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
    ogImageAlt: "Guests enjoying a 360 photo booth experience at a Lagos event",
    ogType: "product",
    twitterTitle: "360 Photo Booth Hire Nigeria | Lagos 360 Booth Rental",
    twitterDescription: "Premium 360 photo booth hire in Lagos, Nigeria. Weddings, birthdays, corporate events, and private celebrations.",
    twitterImage: "https://eventperfekt.net/assets/360-booth/hero-real-party.png",
    keywords: "360 photo booth Nigeria, 360 booth hire Lagos, photo booth rental Lagos, 360 video booth Nigeria, party booth Lagos, wedding photo booth Nigeria, corporate event booth Lagos, birthday photo booth Nigeria, 360 spinning booth hire Nigeria, event photo booth Lagos",
  },

  /* ── Projects & Programmes ────────────────────────────────────── */
  "/projects-and-programmes": {
    title: "Projects & Programmes | Event Perfekt — Government & Corporate Delivery",
    description: "Explore Event Perfekt's track record of delivering complex programmes and events for UK government, international institutions, NGOs, and corporates.",
    canonical: "https://eventperfekt.net/projects-and-programmes",
    ogTitle: "Projects & Programmes | Event Perfekt",
    ogDescription: "Event Perfekt's track record of delivering complex programmes and events for UK government, international institutions, NGOs, and corporates.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Event Perfekt — Projects and Programmes",
    ogType: "website",
    twitterTitle: "Projects & Programmes | Event Perfekt",
    twitterDescription: "Event Perfekt's track record of delivering complex programmes for UK government, international institutions, NGOs, and corporates.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "government programme delivery UK, event management government contract, government events UK, British Council events, NGO programme management, corporate programme delivery, Event Perfekt projects",
  },
  "/projects/public-sector": {
    title: "UK Government Agency Programme | Event Perfekt",
    description: "Event Perfekt delivers governance-aligned programme management and events for UK Government agencies across multiple African markets.",
    canonical: "https://eventperfekt.net/projects/public-sector",
    ogTitle: "UK Government Agency Programme | Event Perfekt",
    ogDescription: "Event Perfekt delivers governance-aligned programme management and events for UK Government agencies.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "UK Government Agency programme — Event Perfekt",
    ogType: "website",
    twitterTitle: "UK Government Agency Programme | Event Perfekt",
    twitterDescription: "Event Perfekt delivers governance-aligned programme management and events for UK Government agencies.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "government programme delivery UK, government events UK, government contract events, UK Africa programme, Event Perfekt government",
  },
  "/projects/remittance": {
    title: "Remittance & Financial Inclusion Project | Event Perfekt",
    description: "Event Perfekt's work on remittance corridors and financial inclusion programmes connecting the UK-Africa diaspora. Stakeholder engagement, research facilitation, and policy events.",
    canonical: "https://eventperfekt.net/projects/remittance",
    ogTitle: "Remittance & Financial Inclusion Project | Event Perfekt",
    ogDescription: "Event Perfekt's work on remittance corridors and financial inclusion programmes connecting the UK-Africa diaspora.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Remittance and financial inclusion project — Event Perfekt",
    ogType: "website",
    twitterTitle: "Remittance & Financial Inclusion Project | Event Perfekt",
    twitterDescription: "Event Perfekt's work on remittance corridors and financial inclusion programmes connecting the UK-Africa diaspora.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "remittance UK Africa, financial inclusion programme, diaspora remittance events, UK Africa financial corridor, Event Perfekt remittance",
  },
  "/projects/funding": {
    title: "Funding & Grant Facilitation Project | Event Perfekt",
    description: "Event Perfekt supports funding and grant facilitation programmes for NGOs, community organisations, and social enterprises across the UK and Africa.",
    canonical: "https://eventperfekt.net/projects/funding",
    ogTitle: "Funding & Grant Facilitation Project | Event Perfekt",
    ogDescription: "Event Perfekt supports funding and grant facilitation programmes for NGOs, community organisations, and social enterprises across the UK and Africa.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Funding and grant facilitation project — Event Perfekt",
    ogType: "website",
    twitterTitle: "Funding & Grant Facilitation Project | Event Perfekt",
    twitterDescription: "Event Perfekt supports funding and grant facilitation programmes for NGOs and social enterprises.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "NGO funding facilitation, grant programme UK Africa, social enterprise funding, community funding events, Event Perfekt funding",
  },
  "/projects/twinpay": {
    title: "TwinPay Remittance Platform | Event Perfekt",
    description: "TwinPay is Event Perfekt's remittance and payments platform project connecting the UK-Africa corridor. Powering financial access for the diaspora.",
    canonical: "https://eventperfekt.net/projects/twinpay",
    ogTitle: "TwinPay Remittance Platform | Event Perfekt",
    ogDescription: "TwinPay is Event Perfekt's remittance and payments platform project connecting the UK-Africa corridor.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "TwinPay remittance platform — Event Perfekt",
    ogType: "website",
    twitterTitle: "TwinPay Remittance Platform | Event Perfekt",
    twitterDescription: "TwinPay is Event Perfekt's remittance and payments platform project connecting the UK-Africa corridor.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "TwinPay remittance, UK Africa payments, diaspora payments platform, remittance fintech, Event Perfekt TwinPay",
  },
  "/projects/twintrade": {
    title: "Twin Trade UK-Africa Trade Programme | Event Perfekt",
    description: "Twin Trade is Event Perfekt's UK-Africa trade and business development programme. Supporting trade missions, business matching, and commercial partnerships between the UK and Africa.",
    canonical: "https://eventperfekt.net/projects/twintrade",
    ogTitle: "Twin Trade UK-Africa Trade Programme | Event Perfekt",
    ogDescription: "Twin Trade supports trade missions, business matching, and commercial partnerships between the UK and Africa.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Twin Trade UK-Africa trade programme — Event Perfekt",
    ogType: "website",
    twitterTitle: "Twin Trade UK-Africa Trade Programme | Event Perfekt",
    twitterDescription: "Twin Trade supports trade missions, business matching, and commercial partnerships between the UK and Africa.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "UK Africa trade programme, twin trade, business matching UK Africa, trade mission Africa, UK Africa commercial partnership, Event Perfekt trade",
  },

  /* ── Case Studies ──────────────────────────────────────────────── */
  "/case-studies/public-sector": {
    title: "UK Government Agency Case Study | Event Perfekt",
    description: "How Event Perfekt secured and delivers the UK Government Africa Regional Support Programme — governance-aligned programme management and stakeholder events.",
    canonical: "https://eventperfekt.net/case-studies/public-sector",
    ogTitle: "UK Government Agency Case Study | Event Perfekt",
    ogDescription: "How Event Perfekt secured and delivers the UK Government Africa Regional Support Programme.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "UK Government Agency case study — Event Perfekt",
    ogType: "article",
    twitterTitle: "UK Government Agency Case Study | Event Perfekt",
    twitterDescription: "How Event Perfekt delivers the UK Government Africa Regional Support Programme.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "government case study, government event delivery case study, UK Africa programme, government contract events, Event Perfekt",
  },
  "/case-studies/oxford": {
    title: "Oxford Programme Case Study | Event Perfekt",
    description: "Event Perfekt's programme delivery case study for an Oxford-linked institutional engagement. Stakeholder management, academic event coordination, and strategic event planning.",
    canonical: "https://eventperfekt.net/case-studies/oxford",
    ogTitle: "Oxford Programme Case Study | Event Perfekt",
    ogDescription: "Event Perfekt's programme delivery for an Oxford-linked institutional engagement — stakeholder management and strategic event planning.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Oxford programme case study — Event Perfekt",
    ogType: "article",
    twitterTitle: "Oxford Programme Case Study | Event Perfekt",
    twitterDescription: "Event Perfekt's programme delivery for an Oxford-linked institutional engagement.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "Oxford programme event management, institutional event delivery UK, academic conference management, Event Perfekt Oxford",
  },
  "/case-studies/twinpay": {
    title: "TwinPay Case Study — Remittance Platform Delivery | Event Perfekt",
    description: "How Event Perfekt built and launched TwinPay, a remittance and payments platform connecting UK-Africa corridors. From concept to live — stakeholder engagement, compliance events, and launch coordination.",
    canonical: "https://eventperfekt.net/case-studies/twinpay",
    ogTitle: "TwinPay Case Study — Remittance Platform Delivery | Event Perfekt",
    ogDescription: "How Event Perfekt built and launched TwinPay — a remittance platform connecting UK-Africa corridors.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "TwinPay case study — Event Perfekt",
    ogType: "article",
    twitterTitle: "TwinPay Case Study — Remittance Platform Delivery | Event Perfekt",
    twitterDescription: "How Event Perfekt built and launched TwinPay — a remittance platform connecting UK-Africa corridors.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "TwinPay case study, remittance platform delivery, UK Africa fintech, diaspora payments launch, Event Perfekt fintech",
  },
  "/case-studies/youth": {
    title: "Youth & Community Programme Case Study | Event Perfekt",
    description: "Event Perfekt's youth engagement and community programme case study. Delivering structured interventions, community events, and stakeholder coordination for young people and their communities.",
    canonical: "https://eventperfekt.net/case-studies/youth",
    ogTitle: "Youth & Community Programme Case Study | Event Perfekt",
    ogDescription: "Event Perfekt's youth engagement and community programme — structured interventions, events, and stakeholder coordination.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Youth programme case study — Event Perfekt",
    ogType: "article",
    twitterTitle: "Youth & Community Programme Case Study | Event Perfekt",
    twitterDescription: "Event Perfekt's youth engagement and community programme case study.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "youth programme delivery UK, community event management, youth engagement programme, ALLI Foundation, Event Perfekt youth",
  },
  "/case-studies/energy": {
    title: "Energy Sector Programme Case Study | Event Perfekt",
    description: "Event Perfekt's energy sector programme delivery case study. Stakeholder convenings, policy workshops, and sector events for energy transition and sustainability initiatives in the UK and Africa.",
    canonical: "https://eventperfekt.net/case-studies/energy",
    ogTitle: "Energy Sector Programme Case Study | Event Perfekt",
    ogDescription: "Event Perfekt's energy sector programme delivery — stakeholder convenings, policy workshops, and sector events.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Energy sector case study — Event Perfekt",
    ogType: "article",
    twitterTitle: "Energy Sector Programme Case Study | Event Perfekt",
    twitterDescription: "Event Perfekt's energy sector programme delivery — stakeholder convenings and policy workshops.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "energy sector events UK, energy transition programme, sustainability conference management, energy policy workshop, Event Perfekt energy",
  },

  /* ── Legal pages ──────────────────────────────────────────────── */
  "/privacy-policy": {
    title: "Privacy Policy | Event Perfekt",
    description: "Event Perfekt's privacy policy. How we collect, use, and protect your personal data. Applies to eventperfekt.net and all Event Perfekt services. Event Perfekt Global Ltd (UK) and Event Perfekt Management Services Limited (Nigeria).",
    canonical: "https://eventperfekt.net/privacy-policy",
    ogTitle: "Privacy Policy | Event Perfekt",
    ogDescription: "Event Perfekt's privacy policy — how we collect, use, and protect your personal data.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Event Perfekt Privacy Policy",
    ogType: "website",
    twitterTitle: "Privacy Policy | Event Perfekt",
    twitterDescription: "Event Perfekt's privacy policy — how we collect, use, and protect your personal data.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "Event Perfekt privacy policy, data protection, GDPR, personal data Event Perfekt",
  },
  "/terms-of-service": {
    title: "Terms of Service | Event Perfekt",
    description: "Event Perfekt's terms of service. The terms and conditions governing use of eventperfekt.net and all Event Perfekt services. Event Perfekt Global Ltd (UK) and Event Perfekt Management Services Limited (Nigeria).",
    canonical: "https://eventperfekt.net/terms-of-service",
    ogTitle: "Terms of Service | Event Perfekt",
    ogDescription: "Event Perfekt's terms and conditions governing use of eventperfekt.net and all Event Perfekt services.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Event Perfekt Terms of Service",
    ogType: "website",
    twitterTitle: "Terms of Service | Event Perfekt",
    twitterDescription: "Event Perfekt's terms and conditions governing use of eventperfekt.net and all Event Perfekt services.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "Event Perfekt terms of service, terms and conditions, Event Perfekt legal",
  },

  /* ── Additional I Am Her pages ────────────────────────────────── */
  "/iamher/community": {
    title: "The Community | I Am Her — Women Who Lead | Event Perfekt",
    description: "Join The Woman Who Leads the Room community — a private network of founders, executives, and women in leadership. Curated connection, peer conversations, and continued dialogue beyond the room.",
    canonical: "https://eventperfekt.net/iamher/community",
    ogTitle: "The Community | I Am Her — Women Who Lead",
    ogDescription: "Join The Woman Who Leads the Room community — a private network of founders, executives, and women in leadership.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her community — women who lead",
    ogType: "website",
    twitterTitle: "The Community | I Am Her — Women Who Lead",
    twitterDescription: "Join The Woman Who Leads the Room community — a private network of founders, executives, and women in leadership.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "women leadership community UK, women founders network, executive women community, I Am Her community, women who lead network",
  },
  "/iamher/nominate": {
    title: "Nominate a Woman Who Leads | I Am Her | Event Perfekt",
    description: "Nominate a founder, executive, or woman in leadership for The Woman Who Leads the Room. Recognise the women who inspire you — leaders, builders, and changemakers in your network.",
    canonical: "https://eventperfekt.net/iamher/nominate",
    ogTitle: "Nominate a Woman Who Leads | I Am Her",
    ogDescription: "Nominate a founder, executive, or woman in leadership for The Woman Who Leads the Room.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "Nominate a woman who leads — I Am Her",
    ogType: "website",
    twitterTitle: "Nominate a Woman Who Leads | I Am Her",
    twitterDescription: "Nominate a founder, executive, or woman in leadership for The Woman Who Leads the Room.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "nominate women leaders UK, women leadership award nomination, I Am Her nomination, women founders recognition, female executive nomination",
  },
  "/iamher/partnership": {
    title: "Partnership Brochure | I Am Her — The Woman Who Leads the Room",
    description: "Partner with The Woman Who Leads the Room — a luxury leadership wellbeing evening for 100 women who lead. Venue, lead, product brand, and curated partner tiers available. Milton Keynes, 30 October 2026.",
    canonical: "https://eventperfekt.net/iamher/partnership",
    ogTitle: "Partnership Brochure | I Am Her — The Woman Who Leads the Room",
    ogDescription: "Partner with The Woman Who Leads the Room — venue, lead, product brand, and curated partner tiers for a luxury leadership event for 100 women.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her partnership brochure — partner with the room",
    ogType: "website",
    twitterTitle: "Partnership Brochure | I Am Her",
    twitterDescription: "Partner with The Woman Who Leads the Room — venue, lead, product brand, and curated partner tiers.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "women leadership event partnership UK, brand partnership women event, luxury event sponsorship UK, I Am Her partnership, women founders event sponsor, partner with women leaders",
  },
  "/iamher/partnership/founding-assessment": {
    title: "Founding Partner Assessment | I Am Her — The Woman Who Leads the Room",
    description: "Apply to become a founding partner of The Woman Who Leads the Room — a luxury leadership wellbeing experience for 100 women who lead. Complete the founding partner assessment to reserve your position.",
    canonical: "https://eventperfekt.net/iamher/partnership/founding-assessment",
    ogTitle: "Founding Partner Assessment | I Am Her",
    ogDescription: "Apply to become a founding partner of The Woman Who Leads the Room — reserve your position for this luxury leadership event.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her founding partner assessment",
    ogType: "website",
    twitterTitle: "Founding Partner Assessment | I Am Her",
    twitterDescription: "Apply to become a founding partner of The Woman Who Leads the Room — reserve your position.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "founding partner women leadership event, brand partner assessment, I Am Her founding partner",
  },
  "/iamher/partnership/table-nominations": {
    title: "Table Nominations | I Am Her — The Woman Who Leads the Room",
    description: "Nominate your table guests for The Woman Who Leads the Room. Corporate table partners — curate the women who represent your brand at this luxury leadership wellbeing experience.",
    canonical: "https://eventperfekt.net/iamher/partnership/table-nominations",
    ogTitle: "Table Nominations | I Am Her — The Woman Who Leads the Room",
    ogDescription: "Nominate your table guests for The Woman Who Leads the Room — curate the women who represent your brand.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her table nominations",
    ogType: "website",
    twitterTitle: "Table Nominations | I Am Her",
    twitterDescription: "Nominate your table guests for The Woman Who Leads the Room.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "corporate table women leadership event, I Am Her table nominations, women event table partner",
  },
  "/iamher/stories": {
    title: "Women's Leadership Stories | I Am Her — The Woman Who Leads the Room",
    description: "Read stories from founders, executives, and women in leadership — honest accounts of burnout, reinvention, resilience, and what it really means to lead. Curated by I Am Her.",
    canonical: "https://eventperfekt.net/iamher/stories",
    ogTitle: "Women's Leadership Stories | I Am Her",
    ogDescription: "Read stories from founders, executives, and women in leadership — honest accounts of burnout, reinvention, and resilience.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her women's leadership stories",
    ogType: "website",
    twitterTitle: "Women's Leadership Stories | I Am Her",
    twitterDescription: "Read stories from founders, executives, and women in leadership — honest accounts of burnout, reinvention, and resilience.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "women leadership stories UK, female founder stories, executive women testimonials, burnout recovery women, I Am Her stories, women who lead stories",
  },
  "/iamher/confirm": {
    title: "Access Confirmed — The Woman Who Leads the Room | Event Perfekt",
    description: "Your access to The Woman Who Leads the Room has been confirmed. Join 100 women who lead at a luxury leadership wellbeing evening in Milton Keynes, Friday 30 October 2026.",
    canonical: "https://eventperfekt.net/iamher/confirm",
    ogTitle: "Access Confirmed — The Woman Who Leads the Room",
    ogDescription: "Your access to I Am Her has been confirmed. Prepare for an evening of confidence, wellbeing, and meaningful connection.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her access confirmed",
    ogType: "website",
    twitterTitle: "Access Confirmed — The Woman Who Leads the Room",
    twitterDescription: "Your access to I Am Her has been confirmed. We look forward to welcoming you.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her access confirmed, The Woman Who Leads the Room confirmed, event perfekt iamher",
  },
  "/iamher/invite": {
    title: "Your Invitation — The Woman Who Leads the Room | Event Perfekt",
    description: "You have been personally invited to The Woman Who Leads the Room — an invitation-only luxury leadership wellbeing evening in Milton Keynes, Friday 30 October 2026. Hosted by Event Perfekt.",
    canonical: "https://eventperfekt.net/iamher/invite",
    ogTitle: "Your Invitation — The Woman Who Leads the Room",
    ogDescription: "You have been personally invited to an invitation-only luxury leadership wellbeing evening for 100 women in Milton Keynes.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her personal invitation",
    ogType: "website",
    twitterTitle: "Your Invitation — The Woman Who Leads the Room",
    twitterDescription: "You have been personally invited to an invitation-only luxury leadership wellbeing evening for 100 women.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her invitation, The Woman Who Leads the Room invite, leadership evening Milton Keynes invitation",
  },
  "/iamher/card": {
    title: "Your Digital Card — I Am Her | Event Perfekt",
    description: "Your personalised I Am Her digital card — your mark as a woman who leads. Carry it, share it, own it.",
    canonical: "https://eventperfekt.net/iamher/card",
    ogTitle: "Your Digital Card — I Am Her",
    ogDescription: "Your personalised I Am Her digital card — your mark as a woman who leads.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her digital card",
    ogType: "website",
    twitterTitle: "Your Digital Card — I Am Her",
    twitterDescription: "Your personalised I Am Her digital card — your mark as a woman who leads.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her digital card, women leadership digital card, iamher card event perfekt",
  },
  "/iamher/analytics": {
    title: "Event Analytics — I Am Her | Event Perfekt",
    description: "I Am Her event analytics and engagement insights. The Woman Who Leads the Room, Milton Keynes, Friday 30 October 2026.",
    canonical: "https://eventperfekt.net/iamher/analytics",
    ogTitle: "Event Analytics — I Am Her",
    ogDescription: "I Am Her event analytics and engagement insights.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her analytics",
    ogType: "website",
    twitterTitle: "Event Analytics — I Am Her",
    twitterDescription: "I Am Her event analytics and engagement insights.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her analytics, iamher event insights, women leadership event analytics",
  },
  "/iamher/signature": {
    title: "Your I Am Her Signature | Event Perfekt",
    description: "Create your I Am Her email signature — celebrate your identity as a woman who leads. A small but powerful mark of who you are.",
    canonical: "https://eventperfekt.net/iamher/signature",
    ogTitle: "Your I Am Her Signature",
    ogDescription: "Create your I Am Her email signature — celebrate your identity as a woman who leads.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her signature",
    ogType: "website",
    twitterTitle: "Your I Am Her Signature",
    twitterDescription: "Create your I Am Her email signature — celebrate your identity as a woman who leads.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her signature, women leader email signature, iamher brand signature",
  },
  "/iamher/partnership/payment": {
    title: "Partnership Payment — I Am Her | Event Perfekt",
    description: "Complete your partnership payment for The Woman Who Leads the Room. Secure your brand's presence among 100 women who lead in Milton Keynes, Friday 30 October 2026.",
    canonical: "https://eventperfekt.net/iamher/partnership/payment",
    ogTitle: "Partnership Payment — I Am Her",
    ogDescription: "Complete your partnership payment for The Woman Who Leads the Room.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her partnership payment",
    ogType: "website",
    twitterTitle: "Partnership Payment — I Am Her",
    twitterDescription: "Complete your partnership payment for The Woman Who Leads the Room.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her partnership payment, women leadership event partnership, iamher brand partner payment",
  },
  "/iamher/apply/confirm": {
    title: "Application Submitted — I Am Her | Event Perfekt",
    description: "Your application to The Woman Who Leads the Room has been submitted. We will review your request and respond within 48 hours. Thank you for applying.",
    canonical: "https://eventperfekt.net/iamher/apply/confirm",
    ogTitle: "Application Submitted — I Am Her",
    ogDescription: "Your application to I Am Her has been submitted. We look forward to reviewing it.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her application submitted",
    ogType: "website",
    twitterTitle: "Application Submitted — I Am Her",
    twitterDescription: "Your application to I Am Her has been submitted. We look forward to reviewing it.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her application submitted, iamher apply confirm, women leadership event application",
  },
  "/iamher/apply/respond": {
    title: "Application Response — I Am Her | Event Perfekt",
    description: "Respond to your I Am Her application decision. The Woman Who Leads the Room — an invitation-only luxury leadership wellbeing evening in Milton Keynes.",
    canonical: "https://eventperfekt.net/iamher/apply/respond",
    ogTitle: "Application Response — I Am Her",
    ogDescription: "Respond to your I Am Her application decision.",
    ogImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    ogImageAlt: "I Am Her application response",
    ogType: "website",
    twitterTitle: "Application Response — I Am Her",
    twitterDescription: "Respond to your I Am Her application decision.",
    twitterImage: "https://eventperfekt.net/assets/iamher-hero-home.png",
    keywords: "I Am Her application response, iamher decision, women leadership event apply",
  },
  "/grant-application": {
    title: "Grant Application | Event Perfekt",
    description: "Apply for a grant or funding facilitation through Event Perfekt. We support NGOs, community organisations, and social enterprises with grant discovery and application support.",
    canonical: "https://eventperfekt.net/grant-application",
    ogTitle: "Grant Application | Event Perfekt",
    ogDescription: "Apply for a grant or funding facilitation through Event Perfekt. We support NGOs, community organisations, and social enterprises.",
    ogImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    ogImageAlt: "Grant application — Event Perfekt",
    ogType: "website",
    twitterTitle: "Grant Application | Event Perfekt",
    twitterDescription: "Apply for a grant or funding facilitation through Event Perfekt.",
    twitterImage: "https://eventperfekt.net/assets/3d%20Logo%20(1)_1754249114645.jpg",
    keywords: "grant application UK, funding facilitation NGO, community grant UK, social enterprise grant, Event Perfekt funding",
  },
};

/* Strict patterns (homepage defaults in client/index.html) — avoids accidental rewrites */
const PATTERNS = {
  title: /<title>[^<]*<\/title>/i,
  description: /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
  keywords: /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i,
  canonical: /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
  ogTitle: /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
  ogDescription: /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
  ogImage: /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
  ogImageAlt: /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/i,
  ogType: /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
  ogUrl: /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
  twitterTitle: /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
  twitterDescription: /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
  twitterImage: /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
};

const HEAD_END = /<\/head>/i;
const BODY_END = /<\/body>/i;

/* Build JSON-LD structured data for each route */
function buildJsonLd(path: string, seo: RouteSEO): string | null {
  if (path === "/iamher") {
    return JSON.stringify([{
      "@context": "https://schema.org",
      "@type": "Event",
      "name": "The Woman Who Leads the Room — I Am Her",
      "startDate": "2026-10-30T18:00:00+01:00",
      "endDate": "2026-10-30T22:00:00+01:00",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
      "location": {
        "@type": "Place",
        "name": "Milton Keynes, Buckinghamshire, UK",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Milton Keynes",
          "addressRegion": "Buckinghamshire",
          "addressCountry": "GB"
        }
      },
      "image": seo.ogImage,
      "description": seo.description,
      "organizer": {
        "@type": "Organization",
        "name": "Event Perfekt Global Ltd",
        "url": "https://eventperfekt.net"
      },
      "performer": [
        { "@type": "Person", "name": "Dr Sarah Jenkins", "jobTitle": "Harley Street GP — Women's Health & Menopause Specialist" },
        { "@type": "Person", "name": "Esther Emenike-Okorie", "jobTitle": "Wellbeing Authority & Confidence-Led Skin Wellness Expert" }
      ],
      "offers": {
        "@type": "Offer",
        "url": seo.canonical,
        "price": "300",
        "priceCurrency": "GBP",
        "availability": "https://schema.org/LimitedAvailability",
        "validFrom": "2026-04-01T00:00:00+01:00"
      },
      "audience": {
        "@type": "Audience",
        "audienceType": "Women who lead — founders, executives, directors, and changemakers"
      }
    }, {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Event Perfekt", "item": "https://eventperfekt.net/" },
        { "@type": "ListItem", "position": 2, "name": "The Woman Who Leads the Room", "item": seo.canonical }
      ]
    }, {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Who is the evening for?", "acceptedAnswer": { "@type": "Answer", "text": "The evening is for women who lead — founders, executives, directors, professionals and builders. Limited to 100 women, by invitation only." } },
        { "@type": "Question", "name": "When and where is the event?", "acceptedAnswer": { "@type": "Answer", "text": "Friday 30 October 2026 in Milton Keynes, Buckinghamshire, UK. The exact venue is revealed only to confirmed guests." } },
        { "@type": "Question", "name": "How do I get an invitation?", "acceptedAnswer": { "@type": "Answer", "text": "Submit a Request Access form. Each request is reviewed by Event Perfekt and the event partners. Attendance is confirmed after review." } },
        { "@type": "Question", "name": "Can my brand partner with the room?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. Partnership tiers are available for brands seeking genuine access to and relationships with 100 established women leaders — founders, executives, and directors. Visit /iamher/partnership for the full partnership brochure." } }
      ]
    }]);
  }
  if (path === "/iamher/stay") {
    return JSON.stringify([{
      "@context": "https://schema.org",
      "@type": "Event",
      "name": "The Woman Who Leads the Room — Stay & Explore",
      "startDate": "2026-10-30",
      "endDate": "2026-10-30",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "eventStatus": "https://schema.org/EventScheduled",
      "location": {
        "@type": "Place",
        "name": "Milton Keynes, Buckinghamshire, UK",
        "address": { "@type": "PostalAddress", "addressLocality": "Milton Keynes", "addressRegion": "Buckinghamshire", "addressCountry": "GB" }
      },
      "image": seo.ogImage,
      "description": seo.description,
      "organizer": { "@type": "Organization", "name": "Event Perfekt Global Ltd", "url": "https://eventperfekt.net" }
    }, {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Event Perfekt", "item": "https://eventperfekt.net/" },
        { "@type": "ListItem", "position": 2, "name": "The Woman Who Leads the Room", "item": "https://eventperfekt.net/iamher" },
        { "@type": "ListItem", "position": 3, "name": "Stay & Explore", "item": seo.canonical }
      ]
    }]);
  }
  if (path === "/meet-the-room") {
    return JSON.stringify([{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Event Perfekt", "item": "https://eventperfekt.net/" },
        { "@type": "ListItem", "position": 2, "name": "The Woman Who Leads the Room", "item": "https://eventperfekt.net/iamher" },
        { "@type": "ListItem", "position": 3, "name": "Meet the Room", "item": seo.canonical }
      ]
    }]);
  }
  if (path === "/access") {
    return JSON.stringify([{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Event Perfekt", "item": "https://eventperfekt.net/" },
        { "@type": "ListItem", "position": 2, "name": "The Woman Who Leads the Room", "item": "https://eventperfekt.net/iamher" },
        { "@type": "ListItem", "position": 3, "name": "Request Access", "item": seo.canonical }
      ]
    }]);
  }
  return null;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ── Static body content per route ───────────────────────────────────────
 * React 18 createRoot().render() replaces #root entirely on mount, so
 * injecting static HTML here is safe — no hydration mismatch risk.
 * This content is visible to non-JS crawlers (GPTBot, ClaudeBot, etc.)
 * and social link-preview scrapers that don't execute JavaScript.
 */
const EP_NAV = `<nav aria-label="Site navigation"><ul>
  <li><a href="/home">Home</a></li>
  <li><a href="/about">About</a></li>
  <li><a href="/projects-and-programmes">Projects &amp; Programmes</a></li>
  <li><a href="/360-booth-hire-milton-keynes">360 Photo Booth Hire Milton Keynes</a></li>
  <li><a href="/photo-booth-nigeria">360 Photo Booth Hire Nigeria</a></li>
  <li><a href="/iamher">The Woman Who Leads the Room</a></li>
  <li><a href="/contact">Contact</a></li>
  <li><a href="/booking-enquiry">Book an Event</a></li>
</ul></nav>`;

const EP_FOOTER = `<footer><p>Event Perfekt Global Ltd &mdash; 20 Wenlock Road, London, N1 7PG &middot; Event Perfekt Management Services Limited &mdash; 25 Kusenla Street, Lagos, Nigeria</p>
<ul><li><a href="/privacy-policy">Privacy Policy</a></li><li><a href="/terms-of-service">Terms of Service</a></li><li><a href="/contact">Contact</a></li></ul></footer>`;

function buildStaticBody(path: string, seo: RouteSEO): string {
  const h = esc;
  const base = (heading: string, body: string, extra = "") =>
    `${EP_NAV}<main id="ep-static-shell"><h1>${heading}</h1>${body}${extra}</main>${EP_FOOTER}`;

  /* ── Homepage ───────────────────────────────────────────────────── */
  if (path === "/home") {
    return base(
      "Programme Delivery. Strategic Events. One Firm.",
      `<p>${h(seo.description)}</p>
      <h2>What We Deliver</h2>
      <ul>
        <li><a href="/projects-and-programmes">Government Programmes &amp; Projects</a></li>
        <li><a href="/booking-enquiry">Corporate Events &amp; Conferences</a></li>
        <li><a href="/booking-enquiry">Private Events &amp; Weddings</a></li>
        <li><a href="/360-booth-hire-milton-keynes">360 Photo Booth Hire — Milton Keynes</a></li>
        <li><a href="/photo-booth-nigeria">360 Photo Booth Hire — Nigeria</a></li>
      </ul>
      <h2>Our Credentials</h2>
      <ul>
        <li>15+ years experience in event management and programme delivery</li>
        <li>UK Government contract holder</li>
        <li>Operations in the UK and across 9+ countries in Africa</li>
        <li>Clients include UK Government agencies, British Council, and international NGOs</li>
      </ul>
      <p><a href="/booking-enquiry">Work With Us</a> | <a href="/contact">Contact Event Perfekt</a></p>`,
    );
  }

  /* ── About ──────────────────────────────────────────────────────── */
  if (path === "/about") {
    return base(
      "About Event Perfekt",
      `<p>${h(seo.description)}</p>
      <h2>Who We Are</h2>
      <p>Event Perfekt is a dual-entity event management and programme delivery firm headquartered in London, UK with operations in Nigeria. We deliver complex programmes and strategic events for government bodies, institutions, NGOs, and corporate clients.</p>
      <h2>Our Entities</h2>
      <ul>
        <li>Event Perfekt Global Ltd — 20 Wenlock Road, London, N1 7PG, UK</li>
        <li>Event Perfekt Management Services Limited — 25 Kusenla Street, Lagos, Nigeria</li>
      </ul>
      <h2>Our Services</h2>
      <ul>
        <li>Programme Delivery &amp; Project Management</li>
        <li>Corporate Events &amp; Conferences</li>
        <li>Government Stakeholder Events</li>
        <li>Private Events &amp; Weddings</li>
        <li>360 Photo Booth Hire</li>
        <li>Day Coordination</li>
      </ul>
      <p><a href="/contact">Contact Us</a> | <a href="/booking-enquiry">Book an Event</a></p>`,
    );
  }

  /* ── Contact ────────────────────────────────────────────────────── */
  if (path === "/contact") {
    return base(
      "Contact Event Perfekt",
      `<p>${h(seo.description)}</p>
      <h2>Our Offices</h2>
      <address>
        <strong>UK:</strong> Event Perfekt Global Ltd, 20 Wenlock Road, London, N1 7PG<br />
        <strong>Nigeria:</strong> Event Perfekt Management Services Limited, 25 Kusenla Street, Lagos, Nigeria
      </address>
      <p>Email: <a href="mailto:info@eventperfekt.com">info@eventperfekt.com</a></p>
      <p><a href="/booking-enquiry">Submit a Booking Enquiry</a></p>`,
    );
  }

  /* ── Booking enquiry ────────────────────────────────────────────── */
  if (path === "/booking-enquiry") {
    return base(
      "Book Your Event with Event Perfekt",
      `<p>${h(seo.description)}</p>
      <h2>Types of Events We Plan</h2>
      <ul>
        <li>Weddings — UK and Nigeria</li>
        <li>Corporate events and conferences</li>
        <li>Government stakeholder events</li>
        <li>Private celebrations (birthdays, anniversaries, graduations)</li>
        <li>Day coordination services</li>
        <li>360 photo booth hire</li>
      </ul>
      <p><a href="/contact">Contact Us</a> | <a href="/consultation-request">Request a Consultation</a></p>`,
    );
  }

  /* ── Consultation request ───────────────────────────────────────── */
  if (path === "/consultation-request") {
    return base(
      "Request a Consultation — Event Perfekt",
      `<p>${h(seo.description)}</p>
      <h2>What to Expect</h2>
      <p>Tell us about your event or programme needs. We will respond within 24 hours with our initial assessment and recommended next steps.</p>
      <p><a href="/booking-enquiry">Submit a Booking Enquiry</a> | <a href="/contact">Contact Us</a></p>`,
    );
  }

  /* ── 360 Booth — Milton Keynes ──────────────────────────────────── */
  if (path === "/360-booth-hire-milton-keynes") {
    return base(
      "360 Booth Hire Milton Keynes &amp; Buckinghamshire",
      `<p>${h(seo.description)}</p>
      <h2>Our 360 Booth Packages</h2>
      <ul>
        <li><strong>Quick Spin</strong> — 2 hours from &pound;395. Ideal for smaller parties and celebrations.</li>
        <li><strong>Signature Experience</strong> — 3 hours from &pound;495. Our most popular package for weddings and birthdays.</li>
        <li><strong>Luxe Event Experience</strong> — 4 hours from &pound;695. For corporate events and full evening celebrations.</li>
      </ul>
      <h2>What's Included</h2>
      <ul>
        <li>Setup and pack-down</li>
        <li>Professional booth attendant throughout</li>
        <li>Instant digital sharing for guests</li>
        <li>Custom branded overlays available</li>
      </ul>
      <h2>Areas Covered</h2>
      <p>Milton Keynes, Buckinghamshire, Bedford, Northampton, Luton, and surrounding areas.</p>
      <p><a href="/booking-enquiry">Book Your 360 Booth</a></p>`,
    );
  }

  /* ── 360 Booth — Nigeria ────────────────────────────────────────── */
  if (path === "/photo-booth-nigeria") {
    return base(
      "360 Photo Booth Hire Nigeria — Lagos",
      `<p>${h(seo.description)}</p>
      <h2>Our Nigeria 360 Booth Packages</h2>
      <ul>
        <li>Wedding packages</li>
        <li>Birthday and private celebration packages</li>
        <li>Corporate event and brand activation packages</li>
      </ul>
      <h2>What's Included</h2>
      <ul>
        <li>Setup and pack-down</li>
        <li>Professional booth attendant throughout</li>
        <li>Instant digital sharing for guests</li>
        <li>Travel within Lagos included</li>
      </ul>
      <p><a href="/booking-enquiry">Get a Quote</a></p>`,
    );
  }

  /* ── Projects & Programmes ──────────────────────────────────────── */
  if (path === "/projects-and-programmes") {
    return base(
      "Projects &amp; Programmes — Event Perfekt",
      `<p>${h(seo.description)}</p>
      <h2>Our Projects</h2>
      <ul>
        <li><a href="/projects/public-sector">UK Government Agency — Africa Regional Support Programme</a></li>
        <li><a href="/projects/remittance">Remittance &amp; Financial Inclusion Programme</a></li>
        <li><a href="/projects/funding">Funding &amp; Grant Facilitation</a></li>
        <li><a href="/projects/twinpay">TwinPay Remittance Platform</a></li>
        <li><a href="/projects/twintrade">Twin Trade UK-Africa Programme</a></li>
      </ul>
      <h2>Case Studies</h2>
      <ul>
        <li><a href="/case-studies/public-sector">UK Government Agency Case Study</a></li>
        <li><a href="/case-studies/oxford">Oxford Programme Case Study</a></li>
        <li><a href="/case-studies/twinpay">TwinPay Platform Case Study</a></li>
        <li><a href="/case-studies/youth">Youth &amp; Community Programme Case Study</a></li>
        <li><a href="/case-studies/energy">Energy Sector Programme Case Study</a></li>
      </ul>`,
    );
  }

  /* ── Individual project pages ───────────────────────────────────── */
  if (path === "/projects/public-sector") {
    return base("UK Government Agency — Africa Regional Support", `<p>${h(seo.description)}</p><p><a href="/case-studies/public-sector">Read the Case Study</a> | <a href="/projects-and-programmes">All Projects</a></p>`);
  }
  if (path === "/projects/remittance") {
    return base("Remittance &amp; Financial Inclusion Programme", `<p>${h(seo.description)}</p><p><a href="/projects-and-programmes">All Projects</a></p>`);
  }
  if (path === "/projects/funding") {
    return base("Funding &amp; Grant Facilitation Project", `<p>${h(seo.description)}</p><p><a href="/projects-and-programmes">All Projects</a></p>`);
  }
  if (path === "/projects/twinpay") {
    return base("TwinPay Remittance Platform", `<p>${h(seo.description)}</p><p><a href="/case-studies/twinpay">Read the TwinPay Case Study</a> | <a href="/projects-and-programmes">All Projects</a></p>`);
  }
  if (path === "/projects/twintrade") {
    return base("Twin Trade UK-Africa Programme", `<p>${h(seo.description)}</p><p><a href="/projects-and-programmes">All Projects</a></p>`);
  }

  /* ── Case study pages ───────────────────────────────────────────── */
  if (path === "/case-studies/public-sector") {
    return base("UK Government Agency Case Study", `<p>${h(seo.description)}</p><h2>About the Project</h2><p>Event Perfekt holds a UK Government contract, delivering governance-aligned programme management and stakeholder events for UK Government agencies across Africa.</p><p><a href="/projects/public-sector">View the Project</a> | <a href="/projects-and-programmes">All Projects</a></p>`);
  }
  if (path === "/case-studies/oxford") {
    return base("Oxford Programme Case Study", `<p>${h(seo.description)}</p><p><a href="/projects-and-programmes">All Projects &amp; Case Studies</a></p>`);
  }
  if (path === "/case-studies/twinpay") {
    return base("TwinPay Case Study — Remittance Platform Delivery", `<p>${h(seo.description)}</p><p><a href="/projects/twinpay">View the TwinPay Project</a> | <a href="/projects-and-programmes">All Projects</a></p>`);
  }
  if (path === "/case-studies/youth") {
    return base("Youth &amp; Community Programme Case Study", `<p>${h(seo.description)}</p><p><a href="/projects-and-programmes">All Projects &amp; Case Studies</a></p>`);
  }
  if (path === "/case-studies/energy") {
    return base("Energy Sector Programme Case Study", `<p>${h(seo.description)}</p><p><a href="/projects-and-programmes">All Projects &amp; Case Studies</a></p>`);
  }

  /* ── Legal ──────────────────────────────────────────────────────── */
  if (path === "/privacy-policy") {
    return base("Privacy Policy — Event Perfekt", `<p>${h(seo.description)}</p><p>This policy applies to both Event Perfekt Global Ltd (UK) and Event Perfekt Management Services Limited (Nigeria). For questions about your data, contact <a href="mailto:info@eventperfekt.com">info@eventperfekt.com</a>.</p><p><a href="/terms-of-service">Terms of Service</a></p>`);
  }
  if (path === "/terms-of-service") {
    return base("Terms of Service — Event Perfekt", `<p>${h(seo.description)}</p><p><a href="/privacy-policy">Privacy Policy</a></p>`);
  }

  /* ── I Am Her — main event page ─────────────────────────────────── */
  if (path === "/iamher") {
    return base(
      "The Woman Who Leads the Room — I Am Her",
      `<p>${h(seo.description)}</p>
      <p><strong>Friday 30 October 2026 &middot; Milton Keynes, Buckinghamshire &middot; Invitation-only &middot; 100 women &middot; &pound;300</strong></p>

      <h2>The Invitation</h2>
      <p>Most rooms expect something from women. Performance. Leadership. Strength. Results. This room does not.</p>
      <p>The Woman Who Leads The Room is an invitation-only evening created for founders, directors, executives, professionals and women who carry significant responsibility &mdash; women who have already built businesses, led organisations, created wealth, carried responsibility in business, leadership and life, navigated challenges and achieved more than most people realise.</p>
      <p>Women who make decisions. Women who influence them. Women who shape the organisations and the people around them.</p>
      <p>This is not a networking event. It is not a women-in-business event. It is not a room full of advice.</p>
      <p>It is a carefully curated gathering of accomplished women exploring what comes next &mdash; in leadership, wellbeing, confidence, health and life beyond the title.</p>
      <p>A room where conversations matter and expertise is respected. Where the woman beside you may see the world differently, but understands the weight of responsibility you carry.</p>
      <p>A slower, more thoughtful, beautiful room &mdash; where nothing is forced and nothing is loud.</p>
      <p><em>Just the right women, at the right altitude, having the conversations that matter.</em></p>

      <h2>Your Place Includes</h2>
      <ul>
        <li>Champagne welcome on arrival</li>
        <li>Three-course dinner in a premium Milton Keynes setting</li>
        <li>A designer fragrance, curated for the evening</li>
        <li>An intimate wellbeing conversation led by Dr Sarah Jenkins (Harley Street GP &mdash; women&apos;s health &amp; menopause specialist, UK Menopause Advocate of the Year 2025) and Esther Emenike-Okorie (Wellbeing Expert &amp; Confidence Coach, TEDx speaker)</li>
        <li>Your own professional editorial portrait</li>
        <li>A feature in the I Am Her editorial campaign &mdash; recognition for you and your business</li>
        <li>Exclusive weekend staycation rates to explore Milton Keynes</li>
      </ul>

      <h2>The Evening — What Awaits You</h2>
      <ul>
        <li><strong>18:00 &mdash; Arrival &amp; Welcome:</strong> Champagne, curated introductions. The first hour is designed to ease you in, meet the room, and settle the week behind you.</li>
        <li><strong>19:00 &mdash; Wining &amp; Dining:</strong> Three-course dinner in an intimate setting. Good food, honest conversation, space to be present without the pressure of performance.</li>
        <li><strong>20:00 &mdash; Wellbeing Session:</strong> Led by Dr Sarah Jenkins (Harley Street women&apos;s health doctor) and Esther Emenike-Okorie (Wellbeing Expert &amp; Confidence Coach). A moment of confidence-led restoration — not a workshop.</li>
        <li><strong>21:00 &mdash; Storytelling &amp; Connection:</strong> Fireside storytelling, meaningful connection, and conversations that only happen when the room is right. Live music. Soft light.</li>
        <li><strong>22:30 &mdash; Closing &amp; Departure:</strong> Final reflections, a quiet word, and the feeling of leaving lighter than you arrived.</li>
      </ul>

      <h2>Speakers &amp; Facilitators</h2>
      <h3>Dr Sarah Jenkins &mdash; Harley Street Women&apos;s Health &amp; Menopause Doctor</h3>
      <p>A Harley Street GP specialising in women&apos;s health and menopause. Featured on ITV&apos;s This Morning, in Hello! Magazine, and on Olivia Attwood&apos;s The Price of Perfection. UK Menopause Advocate of the Year 2025. Safety in Beauty Rising Star Award 2024.</p>
      <h3>Esther Emenike-Okorie &mdash; Wellbeing Authority &amp; Confidence-Led Skin Wellness Expert</h3>
      <p>Wellbeing authority, confidence coach, and TEDx speaker. Founder of Be Well With Esther. Author of Bloom. Specialist in confidence-led skin wellness.</p>

      <h2>Frequently Asked Questions</h2>
      <dl>
        <dt>Is this open to the public?</dt>
        <dd>No. This is an invitation-only evening. Every guest is personally invited or nominated by a confirmed attendee.</dd>
        <dt>What does the &pound;300 include?</dt>
        <dd>The full evening experience &mdash; champagne welcome, three-course dining, designer fragrance, wellbeing session with Dr Sarah Jenkins and Esther Emenike-Okorie, editorial portraiture, live music, and the I Am Her campaign feature.</dd>
        <dt>Where exactly is it held?</dt>
        <dd>A premium venue in Milton Keynes. Confirmed guests receive the full address and arrival details two weeks before the event.</dd>
        <dt>What is the dress code?</dt>
        <dd>Evening elegance. Cocktail or formal attire.</dd>
        <dt>Can I bring a guest?</dt>
        <dd>Confirmed guests may nominate one additional woman. Nominees are reviewed to preserve the integrity and intimacy of the room.</dd>
      </dl>

      <h2>Key Links</h2>
      <ul>
        <li><a href="/access">Request Your Place &mdash; &pound;300</a></li>
        <li><a href="/iamher/stay">Stay &amp; Explore Milton Keynes</a></li>
        <li><a href="/iamher/partnership">Brand Partnership Opportunities</a></li>
        <li><a href="/iamher/media">Media &amp; Press</a></li>
        <li><a href="/iamher/feature">I Am Her Campaign &mdash; Share Your Story</a></li>
        <li><a href="/meet-the-room">Meet the Room</a></li>
      </ul>`,
    );
  }

  /* ── I Am Her sub-pages ─────────────────────────────────────────── */
  if (path === "/iamher/media") {
    return base("Media &amp; Press — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher">Back to The Woman Who Leads the Room</a> | <a href="/iamher/feature">Share Your Story</a></p>`);
  }
  if (path === "/iamher/stay") {
    return base("Stay &amp; Explore Milton Keynes — I Am Her", `<p>${h(seo.description)}</p><p>Milton Keynes is closer than you think — 35 minutes from London Euston by train, with excellent hotels and things to do.</p><p><a href="/iamher">Back to The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/feature") {
    return base("I Am Her — The Campaign", `<p>${h(seo.description)}</p><p><a href="/iamher/submit-story">Submit Your Story</a> | <a href="/iamher">Back to The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/submit-story") {
    return base("Share Your Story — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher/feature">The I Am Her Campaign</a> | <a href="/iamher">The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/community") {
    return base("The Community — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher">The Woman Who Leads the Room</a> | <a href="/access">Request Access</a></p>`);
  }
  if (path === "/iamher/nominate") {
    return base("Nominate a Woman Who Leads — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher">The Woman Who Leads the Room</a> | <a href="/access">Request Access</a></p>`);
  }
  if (path === "/iamher/stories") {
    return base("Women's Leadership Stories — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher/feature">Share Your Story</a> | <a href="/iamher">The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/partnership") {
    return base("Partnership Brochure — I Am Her", `<p>${h(seo.description)}</p>
      <h2>Partnership Tiers</h2>
      <ul>
        <li>Venue Partner — exclusive venue naming rights and room branding</li>
        <li>Lead Partner — primary event partner with brand immersion across the evening</li>
        <li>Product Brand Partner — curated goody bag placement and consultation station</li>
        <li>Curated Partner — targeted visibility among 100 women who lead</li>
      </ul>
      <p><a href="/iamher/partnership/product-brands">Product Brand Partnership Details</a></p>`,
    );
  }
  if (path === "/iamher/partnership/product-brands") {
    return base("Product Brand Partnership — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher/partnership">Full Partnership Brochure</a> | <a href="/iamher">The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/partnership/founding-assessment") {
    return base("Founding Partner Assessment — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher/partnership">Partnership Brochure</a> | <a href="/iamher">The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/partnership/table-nominations") {
    return base("Table Nominations — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher/partnership">Partnership Brochure</a> | <a href="/iamher">The Woman Who Leads the Room</a></p>`);
  }

  /* ── Access / payment ───────────────────────────────────────────── */
  if (path === "/access") {
    return base("Request Access — The Woman Who Leads the Room", `<p>${h(seo.description)}</p><p>Attendance is by invitation only. Submit your request access form and it will be reviewed by Event Perfekt and the event partners. Confirmed guests will receive an access link for ticketing.</p><p><a href="/iamher">Back to The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/access/payment") {
    return base("Complete Your Access — The Woman Who Leads the Room", `<p>${h(seo.description)}</p><p><a href="/access">Request Access</a> | <a href="/iamher">The Woman Who Leads the Room</a></p>`);
  }

  if (path === "/iamher/confirm") {
    return base("Access Confirmed — The Woman Who Leads the Room", `<p>${h(seo.description)}</p><p><a href="/iamher">Back to The Woman Who Leads the Room</a> | <a href="/access">Request Access</a></p>`);
  }
  if (path === "/iamher/invite") {
    return base("Your Invitation — The Woman Who Leads the Room", `<p>${h(seo.description)}</p><p>You have been personally invited to join 100 women who lead at a luxury leadership wellbeing evening in Milton Keynes, Friday 30 October 2026.</p><p><a href="/iamher">The Woman Who Leads the Room</a> | <a href="/access">Request Access</a></p>`);
  }
  if (path === "/iamher/card") {
    return base("Your Digital Card — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher">The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/analytics") {
    return base("Event Analytics — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher">The Woman Who Leads the Room</a> | <a href="/iamher/partnership">Partnership Brochure</a></p>`);
  }
  if (path === "/iamher/signature") {
    return base("Your I Am Her Signature", `<p>${h(seo.description)}</p><p>Carry your identity. Share who you are.</p><p><a href="/iamher">The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/partnership/payment") {
    return base("Partnership Payment — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher/partnership">Partnership Brochure</a> | <a href="/iamher">The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/apply/confirm") {
    return base("Application Submitted — I Am Her", `<p>${h(seo.description)}</p><p>We will review your request and respond within 48 hours. Thank you for applying.</p><p><a href="/iamher">Back to The Woman Who Leads the Room</a></p>`);
  }
  if (path === "/iamher/apply/respond") {
    return base("Application Response — I Am Her", `<p>${h(seo.description)}</p><p><a href="/iamher">The Woman Who Leads the Room</a> | <a href="/access">Request Access</a></p>`);
  }
  if (path === "/grant-application") {
    return base("Grant Application — Event Perfekt", `<p>${h(seo.description)}</p>
      <h2>Who We Support</h2>
      <ul>
        <li>NGOs and community organisations</li>
        <li>Social enterprises seeking public funding</li>
        <li>Third-sector organisations in the UK and Nigeria</li>
      </ul>
      <p><a href="/projects-and-programmes">Our Projects &amp; Programmes</a> | <a href="/contact">Contact Us</a></p>`);
  }

  /* ── Dynamic route prefix matching ──────────────────────────────── */
  if (path.startsWith("/case-studies/sector/")) {
    const sector = decodeURIComponent(path.split("/").pop() || "").replace(/-/g, " ");
    return base(
      `${h(sector.charAt(0).toUpperCase() + sector.slice(1))} Sector Case Studies — Event Perfekt`,
      `<p>Explore Event Perfekt's delivery record and case studies in the ${h(sector)} sector. Discover how we plan, manage, and execute events for government bodies, international organisations, and the private sector.</p>
      <p><a href="/projects-and-programmes">All Projects &amp; Programmes</a> | <a href="/case-studies/public-sector">Case Study</a> | <a href="/contact">Contact Us</a></p>`,
    );
  }
  if (path.startsWith("/booking-confirmation/")) {
    return base("Booking Confirmed — Event Perfekt", `<p>Your booking with Event Perfekt has been confirmed. You will receive a confirmation email with full details shortly. Thank you for choosing Event Perfekt.</p><p><a href="/home">Event Perfekt Home</a> | <a href="/contact">Contact Us</a></p>`);
  }

  /* ── Meet the room ──────────────────────────────────────────────── */
  if (path === "/meet-the-room") {
    return base("Meet the Room — I Am Her", `<p>${h(seo.description)}</p><p>The room is made of 100 women — founders, executives, directors, professionals and builders. Each one invited for who she is, not just what she does.</p><p><a href="/iamher">The Woman Who Leads the Room</a> | <a href="/access">Request Access</a></p>`);
  }

  /* Default fallback — seo object IS route-specific (captured at middleware time).
   * Even though path arrives normalised to "/" by Vite, seo.title / seo.description /
   * seo.canonical all belong to the originally requested route. */
  const canonicalPath = seo.canonical ? seo.canonical.replace("https://eventperfekt.net", "") : "/home";
  return base(
    h(seo.title),
    `<p>${h(seo.description)}</p>
    <p><a href="${h(canonicalPath)}">View this page</a> &middot; <a href="/home">Event Perfekt Home</a> &middot; <a href="/booking-enquiry">Book an Event</a> &middot; <a href="/contact">Contact Us</a></p>`,
  );
}

const ROOT_DIV = /<div id="root">/;

export function rewriteHtml(html: string, seo: RouteSEO, path: string): string {
  let out = html;
  out = out.replace(PATTERNS.title, `<title>${esc(seo.title)}</title>`);
  out = out.replace(PATTERNS.description, `<meta name="description" content="${esc(seo.description)}" />`);
  if (seo.keywords) out = out.replace(PATTERNS.keywords, `<meta name="keywords" content="${esc(seo.keywords)}" />`);
  out = out.replace(PATTERNS.canonical, `<link rel="canonical" href="${esc(seo.canonical)}" />`);
  out = out.replace(PATTERNS.ogTitle, `<meta property="og:title" content="${esc(seo.ogTitle)}" />`);
  out = out.replace(PATTERNS.ogDescription, `<meta property="og:description" content="${esc(seo.ogDescription)}" />`);
  out = out.replace(PATTERNS.ogImage, `<meta property="og:image" content="${esc(seo.ogImage)}" />`);
  out = out.replace(PATTERNS.ogImageAlt, `<meta property="og:image:alt" content="${esc(seo.ogImageAlt)}" />`);
  out = out.replace(PATTERNS.ogType, `<meta property="og:type" content="${esc(seo.ogType)}" />`);
  out = out.replace(PATTERNS.ogUrl, `<meta property="og:url" content="${esc(seo.canonical)}" />`);
  out = out.replace(PATTERNS.twitterTitle, `<meta name="twitter:title" content="${esc(seo.twitterTitle)}" />`);

  // Geo tags — I Am Her only, targeting Milton Keynes + surrounding regions
  const isIamher = path.startsWith("/iamher") || path.startsWith("/stories/") || path.startsWith("/meet-the-room") || path.startsWith("/access");
  const geoBlock = `
    <meta name="geo.region" content="GB-BKM, GB-LND, GB-BDF, GB-NTH" />
    <meta name="geo.placename" content="Milton Keynes, London, Bedford, Northampton, Luton, Buckinghamshire, Aylesbury" />
    <meta name="geo.position" content="52.0406;-0.7594" />
    <meta name="ICBM" content="52.0406, -0.7594" />`;
  if (isIamher) {
    // Insert before canonical link if not already present
    if (!out.includes('name="geo.region"')) {
      out = out.replace(/<link rel="canonical"/, `${geoBlock}\n    <link rel="canonical"`);
    } else {
      out = out.replace(/<meta\s+name="geo\.region"[^>]*>/i, `<meta name="geo.region" content="GB-BKM, GB-LND, GB-BDF, GB-NTH" />`);
      out = out.replace(/<meta\s+name="geo\.placename"[^>]*>/i, `<meta name="geo.placename" content="Milton Keynes, London, Bedford, Northampton, Luton, Buckinghamshire, Aylesbury" />`);
      out = out.replace(/<meta\s+name="geo\.position"[^>]*>/i, `<meta name="geo.position" content="52.0406;-0.7594" />`);
      out = out.replace(/<meta\s+name="ICBM"[^>]*>/i, `<meta name="ICBM" content="52.0406, -0.7594" />`);
    }
  }
  out = out.replace(PATTERNS.twitterDescription, `<meta name="twitter:description" content="${esc(seo.twitterDescription)}" />`);
  out = out.replace(PATTERNS.twitterImage, `<meta name="twitter:image" content="${esc(seo.twitterImage)}" />`);

  /* Inject JSON-LD structured data before </head> */
  const jsonLd = buildJsonLd(path, seo);
  if (jsonLd) {
    const ldTag = `<script type="application/ld+json">${jsonLd}</script>`;
    const replaced = out.replace(HEAD_END, `${ldTag}\n  </head>`);
    if (replaced === out) {
      console.warn(`[SEO] JSON-LD injection failed for ${path}: </head> not found`);
    } else {
      console.log(`[SEO] JSON-LD injected for ${path}`);
      out = replaced;
    }
  }

  /* Inject static content as a visually-hidden <div> BEFORE <div id="root">.
   * React mounts to #root and never touches #ep-seo-shell, so there is no
   * hydration conflict. The div is off-screen via sr-only CSS (not display:none,
   * which some crawlers skip) so users see the React version while every crawler,
   * social-preview bot, and external fetcher reads the real text in the body. */
  const bodyHtml = buildStaticBody(path, seo);
  if (bodyHtml) {
    const shellBlock =
      `<div id="ep-seo-shell" aria-hidden="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;padding:0;margin:0">` +
      bodyHtml +
      `</div>`;
    const replaced = out.replace(ROOT_DIV, `${shellBlock}\n<div id="root">`);
    if (replaced !== out) {
      out = replaced;
    }
  }

  return out;
}

/**
 * Express middleware that rewrites HTML responses with route-specific SEO
 * for known SPA routes. Crawlers (LinkedIn / Facebook / WhatsApp / iMessage)
 * do not execute JavaScript, so per-page Open Graph and Twitter Card tags
 * must be present in the static HTML response. This wraps res.end on HTML
 * responses for matched routes and applies the rewrite once.
 */

/** Resolve SEO config for a path, supporting both exact matches and dynamic
 *  route prefixes (e.g. /case-studies/sector/* and /booking-confirmation/*). */
function resolveSeo(path: string): RouteSEO | undefined {
  if (ROUTE_SEO[path]) return ROUTE_SEO[path];
  /* Dynamic route prefixes — generic fallback SEO for parameterised paths */
  if (path.startsWith("/case-studies/sector/")) {
    return ROUTE_SEO["/case-studies/public-sector"] && {
      ...ROUTE_SEO["/case-studies/public-sector"],
      title: "Sector Case Studies | Event Perfekt",
      description: "Explore Event Perfekt's delivery record by sector — government, science, finance, youth, and energy. UK and Africa programme delivery.",
      canonical: `https://eventperfekt.net${path}`,
    };
  }
  if (path.startsWith("/booking-confirmation/")) {
    return ROUTE_SEO["/booking-enquiry"] && {
      ...ROUTE_SEO["/booking-enquiry"],
      title: "Booking Confirmed | Event Perfekt",
      description: "Your booking with Event Perfekt has been confirmed. You will receive a full confirmation email shortly.",
      canonical: `https://eventperfekt.net${path}`,
    };
  }
  if (path.startsWith("/meeting/")) {
    return ROUTE_SEO["/contact"] && {
      ...ROUTE_SEO["/contact"],
      title: "Meeting | Event Perfekt",
      description: "Schedule and manage your meeting with Event Perfekt.",
      canonical: `https://eventperfekt.net${path}`,
    };
  }
  if (path.startsWith("/stories/")) {
    const storySlug = path.split("/").pop() || "";
    const storyTitle = storySlug.replace(/-/g, " ");
    return ROUTE_SEO["/iamher/stories"] && {
      ...ROUTE_SEO["/iamher/stories"],
      title: `I Am Her Story: ${storyTitle} | The Woman Who Leads the Room`,
      description: `Read the story of ${storyTitle} — part of I Am Her: The Woman Who Leads the Room. Real stories from women who lead, carry, and persist.`,
      canonical: `https://eventperfekt.net${path}`,
    };
  }
  return undefined;
}

/* Known public paths that should receive a canonical rewrite even when not in ROUTE_SEO.
   Ensures non-JS crawlers get the correct canonical instead of the homepage default. */
const PUBLIC_PATH_PREFIXES = [
  "/home", "/about", "/contact", "/privacy-policy", "/privacy",
  "/terms-of-service", "/terms", "/booking-enquiry", "/consultation-request",
  "/booth", "/photo-booth-nigeria", "/360-booth-hire-milton-keynes", "/photobooth",
  "/projects-and-programmes", "/programmes", "/projects/",
  "/case-studies/", "/iamher", "/meet-the-room", "/access",
  "/stories", "/stories/",
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(prefix =>
    path === prefix || path.startsWith(prefix)
  );
}

export function seoMetaInjector() {
  return function (req: Request, res: Response, next: NextFunction) {
    // Only handle GET requests for HTML pages on known SEO routes.
    if (req.method !== "GET") return next();
    const seo = resolveSeo(req.path);

    if (seo) {
      // Capture path NOW before next() — Vite can normalise req.url (and thus
      // req.path) to "/" for all SPA routes, losing the original route segment.
      const routePath = req.path;
      const origEnd = res.end.bind(res) as any;
      const origWrite = res.write.bind(res) as any;
      const chunks: Buffer[] = [];

      res.write = function (chunk: any, ...args: any[]): boolean {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      } as any;

      res.end = function (chunk: any, ...args: any[]): Response {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        const ct = String(res.getHeader("content-type") || "");
        if (!ct.includes("text/html") || chunks.length === 0) {
          return origEnd(Buffer.concat(chunks), ...args);
        }
        try {
          const original = Buffer.concat(chunks).toString("utf-8");
          const rewritten = rewriteHtml(original, seo, routePath);
          const buf = Buffer.from(rewritten, "utf-8");
          res.setHeader("Content-Length", String(buf.length));
          return origEnd(buf, ...args);
        } catch {
          return origEnd(Buffer.concat(chunks), ...args);
        }
      } as any;

      return next();
    }

    /* Fallback canonical rewrite for public paths not in ROUTE_SEO. */
    if (!isPublicPath(req.path)) return next();

    const canonicalUrl = `https://eventperfekt.net${req.path}`;
    const origEndFb = res.end.bind(res) as any;
    const chunksFb: Buffer[] = [];

    res.write = function (chunk: any, ...args: any[]): boolean {
      if (chunk) chunksFb.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    } as any;

    res.end = function (chunk: any, ...args: any[]): Response {
      if (chunk) chunksFb.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const ct = String(res.getHeader("content-type") || "");
      if (!ct.includes("text/html") || chunksFb.length === 0) {
        return origEndFb(Buffer.concat(chunksFb), ...args);
      }
      try {
        const original = Buffer.concat(chunksFb).toString("utf-8");
        const rewritten = original
          .replace(PATTERNS.canonical, `<link rel="canonical" href="${esc(canonicalUrl)}" />`)
          .replace(PATTERNS.ogUrl, `<meta property="og:url" content="${esc(canonicalUrl)}" />`);
        const buf = Buffer.from(rewritten, "utf-8");
        res.setHeader("Content-Length", String(buf.length));
        return origEndFb(buf, ...args);
      } catch {
        return origEndFb(Buffer.concat(chunksFb), ...args);
      }
    } as any;

    next();
  };
}

export function registerSEOMetaInjector(app: Express) {
  app.use(seoMetaInjector());
}
