export interface GuideCard {
  id: string;
  title: string;
  category: string;
  icon: string;
  summary: string;
  questions: string[];
  tips: string[];
  link?: string;
  level?: string;
}

export const GUIDE_CATEGORIES = [
  "Fundamentals",
  "Compliance",
  "Strategy",
  "Sector-Specific",
  "Advanced",
];

export const BID_WRITING_GUIDE: GuideCard[] = [
  {
    id: "how-to-win-uk-tenders",
    title: "How to win UK government tenders",
    category: "Fundamentals",
    icon: "Target",
    summary: "Public Contracts Regulations 2015 — complete guide",
    level: "Fundamentals",
    link: "https://www.gov.uk/guidance/the-public-contracts-regulations-2015",
    questions: [
      "Master the core framework for UK government procurement",
      "Learn procurement timelines and tendering processes",
      "Understand pricing strategies and cost-quality ratios",
      "Develop your tender response strategy"
    ],
    tips: [
      "Review the Public Contracts Regulations 2015 thoroughly",
      "Study past tender award notices on Contracts Finder",
      "Develop your baseline response strategy using STAR methodology",
      "Research successful bids in your sector"
    ],
  },
  {
    id: "understanding-ojeu-tenders",
    title: "Understanding OJEU and above-threshold tenders",
    category: "Compliance",
    icon: "Shield",
    summary: "High-value procurement rules and timelines",
    level: "Compliance",
    link: "https://ted.europa.eu/",
    questions: [
      "Above £231k (goods/services) or £5.8m (works) trigger OJEU requirements",
      "OJEU notices 30-day bidding window from publication",
      "Full evaluation criteria disclosure required upfront",
      "Complex compliance requirements apply"
    ],
    tips: [
      "Monitor TED (Tenders Electronic Daily) for international opportunities",
      "Allow 4-6 weeks preparation time minimum",
      "Ensure full technical compliance with procurement regulations",
      "Allocate senior staff for complex tender evaluation"
    ],
  },
  {
    id: "social-value-act-2012",
    title: "Social Value Act 2012 — scoring maximum marks",
    category: "Strategy",
    icon: "Heart",
    summary: "How to score maximum marks on social value",
    level: "Fundamentals",
    link: "https://www.gov.uk/government/publications/public-services-social-value-act-2012-guidance",
    questions: [
      "Minimum 10% weighting on social value in UK public sector tenders",
      "Local jobs, apprenticeships, supply chain benefits, environmental impact",
      "Community partnerships and service user engagement strategies",
      "Measurable outcomes with evidence"
    ],
    tips: [
      "Develop a Social Value Action Plan with quantifiable targets",
      "Align with local authority priorities and economic strategy",
      "Include apprenticeship commitments and local employment pledges",
      "Reference SME/VCSE subcontractor partnerships"
    ],
  },
  {
    id: "bid-writing-best-practice",
    title: "Bid writing best practice & STAR method",
    category: "Fundamentals",
    icon: "BookOpen",
    summary: "Word limits, evaluation criteria matching, proof of delivery",
    level: "Fundamentals",
    link: "https://www.gov.uk/government/organisations/cabinet-office/about/about-us",
    questions: [
      "Situation-Task-Action-Result (STAR) framework for case studies",
      "Bid evaluation criteria-to-response mapping matrix",
      "Word limit compliance and quality scoring implications",
      "Evidence-based claims with proof of delivery"
    ],
    tips: [
      "Use a 'bid bible' spreadsheet to map requirements to evidence",
      "Allocate word budget proportional to scoring weighting",
      "Use STAR format for all examples and case studies",
      "Include proof (certifications, metrics, client testimonials)"
    ],
  },
  {
    id: "ppn-notes-procurement",
    title: "PPN notes and procurement policy",
    category: "Compliance",
    icon: "FileText",
    summary: "Policy notes that affect every government bid",
    level: "Compliance",
    link: "https://www.gov.uk/government/collections/procurement-policy-notes",
    questions: [
      "Prompt payment codes (15-30 day payment terms)",
      "Modern Slavery Act statements and supply chain transparency",
      "Gender pay gap reporting requirements",
      "Cyber security standards (Cyber Essentials minimum)",
      "Tax compliance and IR35 contractor rules"
    ],
    tips: [
      "Check latest PPN releases before submitting",
      "Ensure Modern Slavery Policy is published and current",
      "Commit to prompt payment terms in tender response",
      "Demonstrate Cyber Essentials compliance"
    ],
  },
  {
    id: "framework-agreements-explained",
    title: "Framework agreements explained",
    category: "Advanced",
    icon: "CheckCircle",
    summary: "How to get on government frameworks",
    level: "Advanced",
    link: "https://www.crowncommercial.gov.uk/",
    questions: [
      "Multi-year agreements with guaranteed buyers",
      "Mini-competition for each individual call-off contract",
      "Less frequent tendering vs. direct award opportunities",
      "Benefit: steady revenue; Challenge: competing on price vs. quality"
    ],
    tips: [
      "Research existing Crown Commercial frameworks in your sector",
      "Build relationships with procurement teams of major buyers",
      "Consider framework partnerships to expand capability",
      "Track framework mini-competition opportunities"
    ],
  },
  {
    id: "ojeu-uk-local-government",
    title: "OJEU & UK local government procurement best practice",
    category: "Sector-Specific",
    icon: "Building2",
    summary: "Higher education & public sector procurement standards",
    level: "Sector-Specific",
    link: "https://www.ucisa.ac.uk/",
    questions: [
      "Local authority procurement thresholds and processes",
      "University and higher education procurement frameworks",
      "NHS and health sector tendering requirements",
      "Standing orders and contract regulations"
    ],
    tips: [
      "Join ICLEI Local Governments for Sustainability for best practices",
      "Monitor Find a Tender for local authority opportunities",
      "Build relationships with procurement teams at key public sector bodies",
      "Understand local authority capital and revenue budget cycles"
    ],
  },
  {
    id: "writing-for-fcdo",
    title: "Writing for FCDO and international development",
    category: "Sector-Specific",
    icon: "Globe",
    summary: "FCDO procurement strategy and international development rules",
    level: "Sector-Specific",
    link: "https://www.gov.uk/government/organisations/foreign-commonwealth-development-office",
    questions: [
      "FCDO procurement follows government regulations plus additional safeguarding",
      "International development standards and monitoring requirements",
      "Due diligence on supply chains in fragile/conflict-affected states",
      "Value for money in development context"
    ],
    tips: [
      "Understand FCDO values and development outcomes requirements",
      "Demonstrate international experience and local partnerships",
      "Show safeguarding and conflict-sensitivity approaches",
      "Include monitoring and learning frameworks"
    ],
  },
  {
    id: "university-procurement-lupc",
    title: "University procurement and LUPC rules",
    category: "Sector-Specific",
    icon: "GraduationCap",
    summary: "Higher education eProcurement standards",
    level: "Sector-Specific",
    link: "https://www.lupc.bravosolution.co.uk/",
    questions: [
      "LUPC (London Universities Purchasing Consortium) framework agreements",
      "University procurement regulations and financial thresholds",
      "Academic calendar impact on procurement timelines",
      "Research funding and grant compliance requirements"
    ],
    tips: [
      "Register with LUPC to access university procurement opportunities",
      "Understand university procurement structures (central vs. departmental)",
      "Monitor university research funding sources (Leverhulme, Nuffield, etc.)",
      "Build relationships with university procurement departments"
    ],
  },
  {
    id: "government-frameworks-ccs",
    title: "Government frameworks & Crown Commercial Service",
    category: "Advanced",
    icon: "Briefcase",
    summary: "National frameworks and managed procurement services",
    level: "Advanced",
    link: "https://www.crowncommercial.gov.uk/",
    questions: [
      "Crown Commercial Service (CCS) manages 140+ national frameworks",
      "Benefits: vetted supplier, reduced competition, direct access to public sector",
      "Frameworks cover IT, recruitment, property, professional services, etc.",
      "Call-off contracts mini-competitions required"
    ],
    tips: [
      "Review CCS website for relevant frameworks in your sector",
      "Assess cost-benefit of framework entry vs. individual tendering",
      "Plan for framework call-off competitions with short turnaround",
      "Use frameworks to access NHS, education, and local authority buyers"
    ],
  },
  {
    id: "charity-npo-tenders",
    title: "Charity and NPO tender strategy",
    category: "Sector-Specific",
    icon: "Heart",
    summary: "Commissioning from the voluntary and community sector",
    level: "Sector-Specific",
    link: "https://www.cabinetoffice.gov.uk/charity-commissioning",
    questions: [
      "Reserved tenders for charities and social enterprises",
      "Quality, not just price, key evaluation factor",
      "Impact metrics and outcomes measurement critical",
      "Building sector partnerships and consortia"
    ],
    tips: [
      "Develop strong outcomes measurement frameworks",
      "Partner with local charities and community organizations",
      "Highlight social impact and beneficiary feedback",
      "Show financial sustainability and organizational capacity"
    ],
  },
  {
    id: "data-protection-gdpr",
    title: "Data protection & GDPR in tenders",
    category: "Compliance",
    icon: "Lock",
    summary: "UK GDPR compliance and data processing requirements",
    level: "Compliance",
    link: "https://ico.org.uk/for-organisations/uk-gdpr/",
    questions: [
      "Data processing agreements (DPA) required for personal data handling",
      "UK GDPR compliance mandatory for all government contracts",
      "Data breach notification and incident response procedures",
      "Subprocessor management and audit rights"
    ],
    tips: [
      "Ensure Data Protection Impact Assessment (DPIA) completed",
      "Have standard Data Processing Agreement templates ready",
      "Document all data security measures and safeguards",
      "Include incident response and breach notification procedures"
    ],
  },
  {
    id: "modern-slavery-supply-chain",
    title: "Modern Slavery Act & supply chain transparency",
    category: "Compliance",
    icon: "Users",
    summary: "Supply chain due diligence and transparency reporting",
    level: "Compliance",
    link: "https://www.gov.uk/government/publications/transparency-in-supply-chains-a-practical-guide",
    questions: [
      "Modern Slavery Act 2015 statements required for companies >£36m turnover",
      "Supply chain risk assessment and due diligence processes",
      "Transparent procurement practices and vendor management",
      "Whistleblowing procedures and grievance mechanisms"
    ],
    tips: [
      "Publish annual Modern Slavery Act statement on website",
      "Conduct supply chain risk assessments by geography and sector",
      "Have vendor code of conduct and audit processes",
      "Include grievance and whistleblowing procedures in tenders"
    ],
  },
  {
    id: "apprentice-levy-skills",
    title: "Apprentice Levy and skills investment",
    category: "Strategy",
    icon: "GraduationCap",
    summary: "Apprenticeship commitments and levy compliance",
    level: "Fundamentals",
    link: "https://www.gov.uk/guidance/pay-apprentice-levy",
    questions: [
      "Apprentice Levy applies to payroll >£3m (0.5% levy)",
      "Government contracts require apprenticeship commitments",
      "New Apprenticeship Standards replacing old NVQs",
      "Levy can fund internal training and external apprenticeships"
    ],
    tips: [
      "Quantify apprenticeship commitments in all government bids",
      "Show training investment as percentage of payroll",
      "Partner with training providers to deliver apprenticeships",
      "Use levy to fund training (e.g., online courses, qualifications)"
    ],
  },
  {
    id: "environmental-net-zero",
    title: "Environmental commitments & Net Zero strategy",
    category: "Strategy",
    icon: "Leaf",
    summary: "Climate action and environmental responsibility in tenders",
    level: "Strategy",
    link: "https://www.gov.uk/government/publications/greening-government-commitments-2021-to-2025",
    questions: [
      "Greening Government Commitments (GGC) apply to all government contracts",
      "Net Zero targets: 2035 for public sector, 2050 for UK economy",
      "Carbon footprint assessment and reduction targets required",
      "Scope 1, 2, 3 emissions tracking mandatory"
    ],
    tips: [
      "Develop Net Zero action plan with science-based targets",
      "Calculate and publicly report Scope 1, 2, 3 emissions",
      "Commit to renewable energy and emission reduction timelines",
      "Include circular economy and waste reduction initiatives"
    ],
  },
  {
    id: "accessibility-standards-wcag",
    title: "Accessibility standards & WCAG compliance",
    category: "Compliance",
    icon: "Monitor",
    summary: "Digital accessibility and inclusive service design",
    level: "Compliance",
    link: "https://www.w3.org/WAI/WCAG21/quickref/",
    questions: [
      "WCAG 2.1 Level AA compliance mandatory for government digital services",
      "Public Sector Bodies Accessibility Regulations (PSBAR) 2018",
      "Accessibility Statement required on all public-facing digital services",
      "Ongoing testing with assistive technologies and disabled users"
    ],
    tips: [
      "Conduct accessibility audits for all digital services",
      "Include disabled users in testing and co-design processes",
      "Provide alternative formats (large print, audio, easy-read)",
      "Publish Accessibility Statement and accessibility roadmap"
    ],
  },
  {
    id: "anti-corruption-bribery",
    title: "Anti-corruption & Bribery Act 2010 compliance",
    category: "Compliance",
    icon: "Shield",
    summary: "UK Bribery Act and anti-corruption controls",
    level: "Compliance",
    link: "https://www.sfo.gov.uk/",
    questions: [
      "UK Bribery Act 2010 applies to all UK and overseas business",
      "Zero tolerance for active or passive bribery",
      "Due diligence required on contractors, suppliers, intermediaries",
      "Anti-money laundering (AML) and sanctions screening"
    ],
    tips: [
      "Implement anti-bribery and corruption policy",
      "Conduct AML/sanctions screening on all business partners",
      "Train staff on Bribery Act and anti-corruption procedures",
      "Include anti-bribery and corruption clauses in all contracts"
    ],
  },
  {
    id: "procurement-templates-resources",
    title: "Procurement templates & resource libraries",
    category: "Advanced",
    icon: "FileText",
    summary: "Ready-to-use contracts, policies, and guidance",
    level: "Advanced",
    link: "https://www.gov.uk/government/collections/procurement-policy-notes",
    questions: [
      "Access government template contracts and standard terms",
      "Standard terms and conditions reduce negotiation time",
      "Sector-specific guidance (NHS, education, local authority)",
      "Procurement advice from Cabinet Office and CCS"
    ],
    tips: [
      "Download government template contracts from Cabinet Office",
      "Use standard terms to reduce legal review cycles",
      "Reference guidance on gov.uk for policy interpretation",
      "Join webinars and networks (LACA, PSED, Government Commercial Forum)"
    ],
  },
  {
    id: "tender-submission-checklist",
    title: "Tender submission checklist & final review",
    category: "Fundamentals",
    icon: "CheckCircle",
    summary: "Final review checklist before tender submission",
    level: "Fundamentals",
    link: "https://www.gov.uk/government/organisations/cabinet-office",
    questions: [
      "All mandatory questions answered and evidence provided",
      "Evaluation criteria mapped to response evidence",
      "Word counts, formatting, and document specifications met",
      "Modern Slavery Act, GDPR, and compliance statements included"
    ],
    tips: [
      "Use a detailed submission checklist covering all requirements",
      "Have 2-3 reviewers check for completeness and compliance",
      "Verify all file formats, file sizes, and naming conventions",
      "Submit at least 24 hours before deadline (technical buffer)",
      "Keep submission evidence in organized bid library for future reuse"
    ],
  },
];

export const BID_SECTION_TO_GUIDE_MAP: Record<string, string[]> = {
  "Executive Summary": ["how-to-win-uk-tenders", "bid-writing-best-practice"],
  "Methodology": ["bid-writing-best-practice", "environmental-net-zero"],
  "Technical Approach": ["procurement-templates-resources", "data-protection-gdpr"],
  "Staffing & Resources": ["apprentice-levy-skills", "modern-slavery-supply-chain"],
  "Risk Management": ["data-protection-gdpr", "anti-corruption-bribery"],
  "Social Value": ["social-value-act-2012", "charity-npo-tenders"],
  "Compliance": ["ppn-notes-procurement", "modern-slavery-supply-chain", "data-protection-gdpr"],
  "Environmental": ["environmental-net-zero"],
  "Accessibility": ["accessibility-standards-wcag"],
  "Pricing": ["how-to-win-uk-tenders"],
  "Case Studies": ["bid-writing-best-practice"],
  "Submission": ["tender-submission-checklist"],
};
