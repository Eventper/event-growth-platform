import { useState, useEffect } from "react";
import { format, differenceInDays, differenceInWeeks, addDays, isBefore, isAfter, startOfDay } from "date-fns";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  Users, 
  MapPin, 
  Palette, 
  Camera, 
  Music, 
  Utensils, 
  FileText, 
  CreditCard, 
  Star,
  TrendingUp,
  Activity,
  ChevronRight,
  ChevronDown,
  Filter,
  BarChart3,
  Target,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimelineTask {
  id: string;
  title: string;
  description: string;
  category: 'planning' | 'venue' | 'vendor' | 'logistics' | 'final';
  phase: 'initial' | 'detailed' | 'final' | 'execution';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  assignee?: string;
  dueDate: Date;
  completedDate?: Date;
  estimatedHours: number;
  actualHours?: number;
  dependencies?: string[];
  clientVisible: boolean;
  notes?: string;
}

interface TimelineMilestone {
  id: string;
  title: string;
  description: string;
  phase: 'initial' | 'detailed' | 'final' | 'execution';
  targetDate: Date;
  completedDate?: Date;
  status: 'pending' | 'completed' | 'missed';
  importance: 'low' | 'medium' | 'high' | 'critical';
  clientVisible: boolean;
}

interface TimelinePhase {
  id: string;
  title: string;
  timeframe: string;
  description: string;
  startWeek: number;
  endWeek: number;
  color: string;
  tasks: TimelineTask[];
  milestones: TimelineMilestone[];
}

interface DynamicEventTimelineProps {
  eventId: string;
  eventDate: Date;
  eventType: 'private' | 'corporate';
  eventCategory?: string;
  guestCount: number;
  budget: number;
  complexity: 'simple' | 'moderate' | 'complex';
  currentPhase?: string;
  onTaskUpdate?: (taskId: string, status: string) => void;
  onMilestoneUpdate?: (milestoneId: string, status: string) => void;
}

export function DynamicEventTimeline({
  eventId,
  eventDate,
  eventType,
  eventCategory,
  guestCount,
  budget,
  complexity,
  currentPhase = 'initial',
  onTaskUpdate,
  onMilestoneUpdate
}: DynamicEventTimelineProps) {
  const [activePhase, setActivePhase] = useState<string>(currentPhase);
  const [viewMode, setViewMode] = useState<'timeline' | 'kanban' | 'calendar' | 'calendar-grid'>('timeline');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set([currentPhase]));

  const weeksUntilEvent = Math.max(0, differenceInWeeks(eventDate, new Date()));
  const daysUntilEvent = Math.max(0, differenceInDays(eventDate, new Date()));

  // Generate dynamic timeline phases based on event details
  const generateTimelinePhases = (): TimelinePhase[] => {
    const phases: TimelinePhase[] = [
      {
        id: 'initial',
        title: '12-6 Months Before — Foundation & Discovery',
        timeframe: '12-6 Months Before',
        description: 'Establish vision, secure venue, set budget, and begin vendor research',
        startWeek: 26,
        endWeek: 52,
        color: 'border-burgundy-600 bg-burgundy-50',
        tasks: [],
        milestones: []
      },
      {
        id: 'detailed',
        title: '6-3 Months Before — Detailed Planning',
        timeframe: '6-3 Months Before',
        description: 'Confirm vendors, finalise design, coordinate logistics, and manage contracts',
        startWeek: 12,
        endWeek: 25,
        color: 'border-burgundy-500 bg-burgundy-50',
        tasks: [],
        milestones: []
      },
      {
        id: 'final',
        title: '3-1 Months Before — Final Preparations',
        timeframe: '3-1 Months Before',
        description: 'Lock guest lists, finalise decor, rehearsals, and confirm every detail',
        startWeek: 4,
        endWeek: 11,
        color: 'border-burgundy-400 bg-burgundy-50',
        tasks: [],
        milestones: []
      },
      {
        id: 'execution',
        title: 'Final 4 Weeks & Event Day',
        timeframe: 'Final 4 Weeks',
        description: 'Final confirmations, rehearsals, setup, event day coordination, and post-event wrap-up',
        startWeek: 0,
        endWeek: 3,
        color: 'border-burgundy-700 bg-burgundy-100',
        tasks: [],
        milestones: []
      }
    ];

    phases.forEach(phase => {
      phase.tasks = generatePhaseTasks(phase.id, eventType, eventCategory, complexity, guestCount, budget);
      phase.milestones = generatePhaseMilestones(phase.id, eventType);
    });

    return phases;
  };

  const makeTask = (id: string, phase: string, title: string, description: string, category: TimelineTask['category'], priority: TimelineTask['priority'], assignee: string, daysBefore: number, hours: number, clientVisible: boolean, deps?: string[]): TimelineTask => ({
    id, title, description, category, phase: phase as any, priority, status: 'pending', assignee,
    dueDate: addDays(eventDate, -daysBefore), estimatedHours: hours, clientVisible, dependencies: deps
  });

  const generatePhaseTasks = (
    phase: string,
    type: string,
    category: string | undefined,
    complexity: string,
    guests: number,
    budgetAmt: number
  ): TimelineTask[] => {
    const isComplex = complexity === 'complex';
    const isLarge = guests > 150;
    const isCorporate = type === 'corporate';
    const t = (id: string, title: string, desc: string, cat: TimelineTask['category'], pri: TimelineTask['priority'], assignee: string, daysBefore: number, hours: number, vis: boolean, deps?: string[]) =>
      makeTask(`${phase}-${id}`, phase, title, desc, cat, pri, assignee, daysBefore, hours, vis, deps);

    const tasks: Record<string, TimelineTask[]> = {
      initial: [
        t('client-brief', 'Client Discovery Meeting', 'Conduct detailed consultation to understand vision, preferences, guest profile, and must-haves', 'planning', 'critical', 'Lead Planner', 365, 3, true),
        t('concept', 'Event Concept Development', 'Define theme, style, colour palette, and overall creative direction', 'planning', 'high', 'Lead Planner', 350, isComplex ? 5 : 3, true),
        t('mood-board', 'Mood Board & Inspiration Deck', 'Create visual mood board with reference images, colour swatches, and style direction for client approval', 'planning', 'medium', 'Design Lead', 340, 4, true),
        t('budget-draft', 'Initial Budget Framework', 'Create first-draft budget with category allocations based on priorities and event scope', 'planning', 'critical', 'Financial Coordinator', 335, 3, false),
        t('budget-approval', 'Client Budget Review & Approval', 'Present budget breakdown to client, discuss trade-offs, and get sign-off', 'planning', 'critical', 'Lead Planner', 320, 2, true, [`${phase}-budget-draft`]),
        t('venue-research', 'Venue Research & Shortlist', 'Research and shortlist 5-8 suitable venues based on capacity, location, style, and budget', 'venue', 'critical', 'Venue Coordinator', 330, isLarge ? 10 : 6, true),
        t('venue-visits', 'Venue Site Visits', 'Schedule and conduct site visits with client at top 3 venues', 'venue', 'critical', 'Venue Coordinator', 310, 8, true, [`${phase}-venue-research`]),
        t('venue-book', 'Venue Booking & Deposit', 'Secure chosen venue with signed contract and deposit payment', 'venue', 'critical', 'Venue Coordinator', 290, 2, true, [`${phase}-venue-visits`]),
        t('vendor-research', 'Key Vendor Research', 'Research and create shortlists for caterer, photographer, videographer, florist, DJ/band, and lighting', 'vendor', 'high', 'Vendor Manager', 300, isComplex ? 12 : 8, false),
        t('caterer-shortlist', 'Caterer Selection & Tasting Schedule', 'Shortlist 3 caterers and arrange tasting sessions with client', 'vendor', 'high', 'Catering Coordinator', 280, 4, true, [`${phase}-vendor-research`]),
        t('photo-video-shortlist', 'Photographer & Videographer Review', 'Review portfolios, check availability, and shortlist 3 options for each', 'vendor', 'high', 'Vendor Manager', 280, 3, true, [`${phase}-vendor-research`]),
        t('event-insurance', 'Event Insurance Research', 'Investigate and secure appropriate event insurance coverage', 'planning', 'medium', 'Lead Planner', 270, 2, false),
        t('guest-list-draft', 'Draft Guest List', 'Compile preliminary guest list with client, note dietary requirements and accessibility needs', 'logistics', 'high', 'Event Coordinator', 270, 3, true),
        t('save-the-date', 'Save-the-Date Design & Distribution', 'Design and send save-the-date notices to all guests', 'logistics', 'high', 'Design Lead', 260, 4, true, [`${phase}-guest-list-draft`]),
        ...(isCorporate ? [
          t('sponsor-strategy', 'Sponsorship & Partnership Strategy', 'Identify potential sponsors, create sponsorship packages and outreach plan', 'planning', 'high', 'Account Manager', 300, 6, false),
          t('branding-guidelines', 'Corporate Branding & Compliance Check', 'Review corporate branding guidelines and ensure all materials comply', 'planning', 'high', 'Design Lead', 320, 3, false),
          t('av-requirements', 'AV & Technology Requirements Scoping', 'Define presentation equipment, live streaming, Wi-Fi, and technical support needs', 'logistics', 'high', 'Technical Lead', 280, 4, false),
        ] : []),
        ...(isLarge ? [
          t('transport-plan', 'Transportation & Parking Assessment', 'Evaluate guest transport needs, parking capacity, shuttle requirements', 'logistics', 'medium', 'Logistics Coordinator', 270, 3, false),
        ] : []),
      ],

      detailed: [
        t('caterer-confirm', 'Caterer Confirmation & Menu Planning', 'Select caterer, sign contract, begin detailed menu planning', 'vendor', 'critical', 'Catering Coordinator', 170, 4, true),
        t('menu-tasting', 'Menu Tasting Session', 'Attend tasting with client, finalize menu choices including dietary options', 'vendor', 'high', 'Catering Coordinator', 150, 3, true, [`${phase}-caterer-confirm`]),
        t('photographer-book', 'Book Photographer & Videographer', 'Sign contracts, discuss shot lists and coverage hours', 'vendor', 'high', 'Vendor Manager', 160, 2, true),
        t('music-book', 'Book Entertainment / DJ / Band', 'Sign contracts, discuss playlist preferences, ceremony/reception music', 'vendor', 'high', 'Vendor Manager', 155, 2, true),
        t('florist-book', 'Book Florist & Floral Design Meeting', 'Select florist, review arrangements, table centrepieces, bouquets, and venue florals', 'vendor', 'high', 'Decor Specialist', 150, 4, true),
        t('cake-select', 'Cake Design & Baker Selection', 'Choose baker, arrange tasting, finalise cake design and flavours', 'vendor', 'medium', 'Catering Coordinator', 140, 3, true),
        t('decor-concept', 'Decor & Styling Concept Development', 'Create detailed decor plan including table settings, centrepieces, lighting, and draping', 'vendor', 'high', 'Decor Specialist', 145, isComplex ? 8 : 5, true),
        t('invitation-design', 'Invitation Design & Stationery', 'Design invitations, RSVP cards, menus, place cards, and ceremony programmes', 'logistics', 'high', 'Design Lead', 140, 6, true),
        t('invitation-send', 'Send Invitations', 'Print and distribute invitations to all guests (digital and/or physical)', 'logistics', 'critical', 'Event Coordinator', 120, 3, true, [`${phase}-invitation-design`]),
        t('floor-plan', 'Floor Plan & Seating Layout Draft', 'Create initial venue floor plan with table layouts, dance floor, stage, and bar areas', 'venue', 'high', 'Design Lead', 130, 5, true),
        t('lighting-plan', 'Lighting & Sound Design Plan', 'Plan ambient, feature, and dance floor lighting; coordinate sound system requirements', 'vendor', 'medium', 'Technical Lead', 125, 4, false),
        t('hotel-block', 'Accommodation Block Booking', 'Reserve hotel room blocks for out-of-town guests at negotiated rates', 'logistics', 'medium', 'Logistics Coordinator', 135, 2, true),
        t('transport-arrange', 'Guest Transportation Arrangements', 'Arrange shuttle buses, car service, or transport for VIPs and groups', 'logistics', 'medium', 'Logistics Coordinator', 120, 3, isLarge),
        t('budget-review-2', 'Mid-Planning Budget Review', 'Review actual spend vs. budget, adjust allocations, flag overruns', 'planning', 'high', 'Financial Coordinator', 110, 2, false),
        t('vendor-insurance', 'Vendor Insurance & Licence Verification', 'Collect and verify insurance certificates, licences, and health & safety docs from all vendors', 'vendor', 'medium', 'Vendor Manager', 115, 3, false),
        t('timeline-draft', 'Draft Day-of Timeline', 'Create preliminary hour-by-hour event schedule from setup to breakdown', 'planning', 'high', 'Lead Planner', 105, 3, false),
        ...(isCorporate ? [
          t('speaker-confirm', 'Confirm Speakers & Presenters', 'Finalise speaker lineup, collect bios, headshots, and presentation requirements', 'planning', 'critical', 'Account Manager', 140, 4, true),
          t('reg-system', 'Attendee Registration System Setup', 'Configure online registration, ticketing, and badge printing', 'logistics', 'high', 'Technical Lead', 130, 6, false),
          t('signage-design', 'Signage & Wayfinding Design', 'Design event signage, directional signs, sponsor displays, and banners', 'vendor', 'medium', 'Design Lead', 120, 4, false),
        ] : []),
        ...(isLarge ? [
          t('security-plan', 'Security & Crowd Management Plan', 'Hire security team, plan entry/exit flow, emergency procedures', 'logistics', 'high', 'Logistics Coordinator', 120, 4, false),
        ] : []),
      ],

      final: [
        t('rsvp-track', 'RSVP Tracking & Follow-Up', 'Chase outstanding RSVPs, compile final head count by meal choice and dietary needs', 'logistics', 'critical', 'Event Coordinator', 75, 4, true),
        t('seating-chart', 'Final Seating Chart', 'Create detailed seating plan based on final guest list, relationships, and dietary requirements', 'logistics', 'high', 'Lead Planner', 60, isLarge ? 6 : 3, true, [`${phase}-rsvp-track`]),
        t('menu-final', 'Menu Finalization & Guest Count to Caterer', 'Submit final guest count and meal selections to caterer', 'vendor', 'critical', 'Catering Coordinator', 55, 2, false, [`${phase}-rsvp-track`]),
        t('place-cards', 'Place Cards & Escort Cards Preparation', 'Prepare and proofread all place cards and table assignments', 'logistics', 'medium', 'Design Lead', 50, 3, true, [`${phase}-seating-chart`]),
        t('decor-final', 'Decor & Styling Finalization', 'Confirm all decor items, rental inventory, delivery schedules, and setup instructions', 'vendor', 'high', 'Decor Specialist', 55, 4, true),
        t('flower-final', 'Final Floral Order & Colour Confirmation', 'Confirm all floral arrangements, quantities, and delivery schedule with florist', 'vendor', 'high', 'Decor Specialist', 50, 2, true),
        t('cake-final', 'Cake Order Confirmation', 'Confirm final cake design, flavour, size, delivery time, and setup instructions', 'vendor', 'medium', 'Catering Coordinator', 45, 1, true),
        t('timeline-final', 'Finalize Day-of Timeline', 'Complete detailed minute-by-minute schedule and distribute to all vendors', 'planning', 'critical', 'Lead Planner', 45, 4, false),
        t('vendor-timeline-send', 'Distribute Vendor Load-In Schedule', 'Send arrival times, setup areas, and contact details to every vendor', 'vendor', 'critical', 'Vendor Manager', 40, 2, false, [`${phase}-timeline-final`]),
        t('photo-shotlist', 'Photography & Video Shot List', 'Create detailed shot list including must-have group photos, key moments, and detail shots', 'vendor', 'medium', 'Lead Planner', 40, 2, true),
        t('music-playlist', 'Music & Playlist Finalization', 'Submit playlist requests, do-not-play list, and ceremony music order to DJ/band', 'vendor', 'medium', 'Lead Planner', 40, 2, true),
        t('readings-vows', 'Ceremony Details & Readings Confirmation', 'Confirm ceremony format, readings, vows, officiant requirements', 'planning', 'high', 'Lead Planner', 45, 2, true),
        t('gift-registry', 'Gift & Guest Bag Preparation', 'Prepare welcome bags, guest favours, and gift table setup', 'logistics', 'low', 'Event Coordinator', 35, 3, true),
        t('emergency-kit', 'Emergency Kit Preparation', 'Assemble day-of emergency kit (sewing kit, stain remover, painkillers, phone chargers, etc.)', 'logistics', 'medium', 'Event Coordinator', 35, 2, false),
        t('budget-review-3', 'Pre-Event Budget Reconciliation', 'Final budget review, process outstanding payments, verify all deposits received', 'planning', 'high', 'Financial Coordinator', 40, 3, false),
        t('venue-walkthrough', 'Final Venue Walkthrough', 'Walk through venue with coordinator to confirm setup areas, power, restrictions, and timing', 'venue', 'high', 'Lead Planner', 35, 3, true),
        ...(isCorporate ? [
          t('speaker-pres', 'Collect & Review Presentations', 'Gather all speaker presentations, test on AV system, create backup copies', 'logistics', 'critical', 'Technical Lead', 40, 4, false),
          t('badge-print', 'Print Badges & Materials', 'Print attendee badges, programmes, agendas, and handout materials', 'logistics', 'high', 'Event Coordinator', 35, 3, false),
        ] : []),
      ],

      execution: [
        t('vendor-confirm-final', 'Final Vendor Reconfirmation Calls', 'Call every vendor to reconfirm arrival time, contact person, and requirements', 'logistics', 'critical', 'Vendor Manager', 14, 3, false),
        t('payment-final', 'Final Payments & Gratuities', 'Process all remaining vendor payments, prepare tip envelopes for day-of staff', 'planning', 'critical', 'Financial Coordinator', 10, 2, false),
        t('rehearsal', 'Rehearsal / Run-Through', 'Conduct full rehearsal with key participants covering ceremony, speeches, and transitions', 'logistics', 'high', 'Lead Planner', 7, 4, true),
        t('rehearsal-dinner', 'Rehearsal Dinner / Pre-Event Gathering', 'Coordinate rehearsal dinner or welcome drinks for key guests', 'logistics', 'medium', 'Event Coordinator', 7, 3, true),
        t('packing-list', 'Pack Day-of Supplies & Documents', 'Pack all printed materials, emergency kit, timeline copies, vendor contacts, and supplies', 'logistics', 'high', 'Event Coordinator', 3, 2, false),
        t('weather-check', 'Weather Contingency Review', 'Check forecast, activate backup plans if needed (outdoor events)', 'logistics', 'high', 'Lead Planner', 3, 1, false),
        t('setup-day', 'Venue Setup & Styling', 'Oversee full venue setup including tables, chairs, decor, lighting, and signage', 'venue', 'critical', 'Decor Specialist', 1, isComplex ? 10 : 6, false),
        t('tech-check', 'Sound, AV & Lighting Check', 'Test all microphones, speakers, projectors, and lighting cues', 'logistics', 'critical', 'Technical Lead', 1, 2, false),
        t('day-of-coord', 'Day-of Event Coordination', 'Full on-site management: vendor arrivals, guest flow, timeline management, troubleshooting', 'logistics', 'critical', 'All Team', 0, 14, true),
        t('guest-welcome', 'Guest Welcome & Registration', 'Manage arrival area, guest sign-in, distribute programmes and escort to seats', 'logistics', 'high', 'Event Coordinator', 0, 3, true),
        t('vendor-manage-dayof', 'Day-of Vendor Management', 'Coordinate vendor setup, breaks, meals, and pack-down timing', 'vendor', 'critical', 'Vendor Manager', 0, 8, false),
        t('post-event-cleanup', 'Post-Event Venue Breakdown', 'Supervise breakdown, collect all personal items, return rented equipment', 'venue', 'high', 'Logistics Coordinator', -1, 4, false),
        t('post-vendor-settle', 'Final Vendor Settlements & Reviews', 'Process final payments, collect invoices, and submit vendor reviews', 'vendor', 'high', 'Financial Coordinator', -7, 3, false),
        t('post-thankyou', 'Thank You Notes & Follow-Up', 'Send thank you cards to guests, vendors, and venue; share photo gallery link', 'logistics', 'medium', 'Event Coordinator', -14, 4, true),
        t('post-debrief', 'Post-Event Debrief & Report', 'Review what went well, capture lessons learned, compile final budget report', 'planning', 'medium', 'Lead Planner', -14, 3, false),
        t('post-photo-delivery', 'Photo & Video Delivery Follow-Up', 'Follow up with photographer/videographer on editing timeline and deliverables', 'vendor', 'low', 'Vendor Manager', -21, 1, true),
      ]
    };

    return tasks[phase] || [];
  };

  const generatePhaseMilestones = (phase: string, type: string): TimelineMilestone[] => {
    const milestones: Record<string, TimelineMilestone[]> = {
      initial: [
        {
          id: `${phase}-ms-brief`,
          title: 'Client Brief Approved',
          description: 'Event vision, requirements, and budget signed off by client',
          phase: phase as any,
          targetDate: addDays(eventDate, -340),
          status: 'pending',
          importance: 'critical',
          clientVisible: true
        },
        {
          id: `${phase}-ms-venue`,
          title: 'Venue Secured',
          description: 'Venue contract signed and deposit paid',
          phase: phase as any,
          targetDate: addDays(eventDate, -280),
          status: 'pending',
          importance: 'critical',
          clientVisible: true
        },
        {
          id: `${phase}-ms-savedate`,
          title: 'Save-the-Dates Sent',
          description: 'All save-the-date notices distributed to guests',
          phase: phase as any,
          targetDate: addDays(eventDate, -250),
          status: 'pending',
          importance: 'high',
          clientVisible: true
        }
      ],
      detailed: [
        {
          id: `${phase}-ms-vendors`,
          title: 'All Key Vendors Contracted',
          description: 'Caterer, photographer, florist, entertainment, and decor vendors confirmed with signed contracts',
          phase: phase as any,
          targetDate: addDays(eventDate, -140),
          status: 'pending',
          importance: 'critical',
          clientVisible: true
        },
        {
          id: `${phase}-ms-invites`,
          title: 'Invitations Sent',
          description: 'All invitations printed and distributed to guest list',
          phase: phase as any,
          targetDate: addDays(eventDate, -120),
          status: 'pending',
          importance: 'high',
          clientVisible: true
        },
        {
          id: `${phase}-ms-floorplan`,
          title: 'Floor Plan Approved',
          description: 'Venue layout, seating arrangement, and decor placement confirmed',
          phase: phase as any,
          targetDate: addDays(eventDate, -110),
          status: 'pending',
          importance: 'high',
          clientVisible: true
        }
      ],
      final: [
        {
          id: `${phase}-ms-rsvp`,
          title: 'RSVP Deadline Passed',
          description: 'Final guest count confirmed and communicated to all vendors',
          phase: phase as any,
          targetDate: addDays(eventDate, -55),
          status: 'pending',
          importance: 'critical',
          clientVisible: true
        },
        {
          id: `${phase}-ms-seating`,
          title: 'Seating Chart Finalised',
          description: 'Complete seating assignments approved by client',
          phase: phase as any,
          targetDate: addDays(eventDate, -40),
          status: 'pending',
          importance: 'high',
          clientVisible: true
        },
        {
          id: `${phase}-ms-details`,
          title: 'All Details Locked',
          description: 'Every vendor timeline, decor item, and logistics detail confirmed — no more changes',
          phase: phase as any,
          targetDate: addDays(eventDate, -30),
          status: 'pending',
          importance: 'critical',
          clientVisible: true
        }
      ],
      execution: [
        {
          id: `${phase}-ms-rehearsal`,
          title: 'Rehearsal Complete',
          description: 'Full run-through done with key participants',
          phase: phase as any,
          targetDate: addDays(eventDate, -2),
          status: 'pending',
          importance: 'high',
          clientVisible: true
        },
        {
          id: `${phase}-ms-event`,
          title: 'Event Successfully Executed',
          description: 'Event delivered on time, on budget, and to client satisfaction',
          phase: phase as any,
          targetDate: eventDate,
          status: 'pending',
          importance: 'critical',
          clientVisible: true
        },
        {
          id: `${phase}-ms-closeout`,
          title: 'Project Closeout Complete',
          description: 'All payments settled, reviews submitted, final report delivered to client',
          phase: phase as any,
          targetDate: addDays(eventDate, -(-21)),
          status: 'pending',
          importance: 'high',
          clientVisible: false
        }
      ]
    };

    return milestones[phase] || [];
  };

  const [timelinePhases, setTimelinePhases] = useState<TimelinePhase[]>(() => generateTimelinePhases());

  // Calculate progress and statistics
  const calculatePhaseProgress = (phase: TimelinePhase) => {
    const allItems = [...phase.tasks, ...phase.milestones];
    if (allItems.length === 0) return 0;
    
    const completed = phase.tasks.filter(task => completedTasks.has(task.id)).length +
                     phase.milestones.filter(milestone => completedMilestones.has(milestone.id)).length;
    
    return Math.round((completed / allItems.length) * 100);
  };

  const calculateOverallProgress = () => {
    const allTasks = timelinePhases.flatMap(phase => phase.tasks);
    const allMilestones = timelinePhases.flatMap(phase => phase.milestones);
    const totalItems = allTasks.length + allMilestones.length;
    
    if (totalItems === 0) return 0;
    
    const completedItems = completedTasks.size + completedMilestones.size;
    return Math.round((completedItems / totalItems) * 100);
  };

  const getCurrentPhaseFromDate = () => {
    if (weeksUntilEvent >= 26) return 'initial';
    if (weeksUntilEvent >= 12) return 'detailed';
    if (weeksUntilEvent >= 4) return 'final';
    return 'execution';
  };

  const getPhaseStatus = (phase: TimelinePhase) => {
    const currentPhaseId = getCurrentPhaseFromDate();
    const phaseOrder = ['initial', 'detailed', 'final', 'execution'];
    const currentIndex = phaseOrder.indexOf(currentPhaseId);
    const phaseIndex = phaseOrder.indexOf(phase.id);
    
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      planning: Target,
      venue: MapPin,
      vendor: Users,
      logistics: Activity,
      final: Zap
    };
    const Icon = icons[category] || Circle;
    return <Icon className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const handleTaskToggle = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newStatus === 'completed') {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });

    onTaskUpdate?.(taskId, newStatus);
  };

  const filteredPhases = timelinePhases.map(phase => ({
    ...phase,
    tasks: phase.tasks.filter(task => {
      const categoryMatch = filterCategory === 'all' || task.category === filterCategory;
      const statusMatch = filterStatus === 'all' || task.status === filterStatus;
      return categoryMatch && statusMatch;
    })
  }));

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-burgundy-900 to-burgundy-800 text-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dynamic Event Timeline</h1>
            <p className="text-burgundy-200">
              {format(eventDate, 'MMMM d, yyyy')} • {daysUntilEvent} days remaining
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <Badge className="bg-white text-burgundy-900">
              {eventType} Event
            </Badge>
            <Badge className="bg-burgundy-700 text-white">
              {guestCount} Guests
            </Badge>
          </div>
        </div>

        {/* Overall Progress */}
        <Card className="bg-white/10 border-burgundy-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Overall Progress</h3>
              <span className="text-2xl font-bold text-white">{calculateOverallProgress()}%</span>
            </div>
            <Progress value={calculateOverallProgress()} className="h-3 bg-burgundy-700" />
            <div className="flex justify-between text-sm text-burgundy-200 mt-2">
              <span>Started</span>
              <span>Current Phase: {getCurrentPhaseFromDate()}</span>
              <span>Event Day</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-burgundy-700 border border-burgundy-600 rounded-lg p-1">
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className={viewMode === 'timeline' ? 'bg-white text-burgundy-900' : 'text-white hover:bg-burgundy-600'}
            >
              Timeline
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className={viewMode === 'kanban' ? 'bg-white text-burgundy-900' : 'text-white hover:bg-burgundy-600'}
            >
              Kanban
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={viewMode === 'calendar' ? 'bg-white text-burgundy-900' : 'text-white hover:bg-burgundy-600'}
            >
              Calendar
            </Button>
            <Button
              variant={viewMode === 'calendar-grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar-grid')}
              className={viewMode === 'calendar-grid' ? 'bg-white text-burgundy-900' : 'text-white hover:bg-burgundy-600'}
            >
              Calendar Grid
            </Button>
          </div>
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48 bg-burgundy-700 border-burgundy-600 text-white">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="venue">Venue</SelectItem>
            <SelectItem value="vendor">Vendors</SelectItem>
            <SelectItem value="logistics">Logistics</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-burgundy-700 border-burgundy-600 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline Content */}
      <div>
        {viewMode === 'timeline' && (
          <div className="space-y-6">
            {filteredPhases.map((phase, phaseIndex) => {
              const phaseProgress = calculatePhaseProgress(phase);
              const phaseStatus = getPhaseStatus(phase);
              const isExpanded = expandedPhases.has(phase.id);

              return (
                <Card key={phase.id} className={cn(
                  "transition-all duration-200 bg-burgundy-800/50 border-burgundy-600",
                  phaseStatus === 'current' && "ring-2 ring-white shadow-lg"
                )}>
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => togglePhaseExpansion(phase.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full",
                          phaseStatus === 'completed' ? 'bg-green-600' :
                          phaseStatus === 'current' ? 'bg-burgundy-600' : 'bg-gray-400'
                        )}>
                          <span className="text-white font-bold text-lg">{phaseIndex + 1}</span>
                        </div>
                        <div>
                          <CardTitle className="text-xl text-white flex items-center">
                            {phase.title}
                            <Badge className={cn(
                              "ml-2",
                              phaseStatus === 'completed' ? 'bg-green-600 text-white' :
                              phaseStatus === 'current' ? 'bg-blue-600 text-white' :
                              'bg-burgundy-600 text-white'
                            )}>
                              {phaseStatus}
                            </Badge>
                          </CardTitle>
                          <p className="text-burgundy-200 text-sm">{phase.timeframe} • {phase.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{phaseProgress}%</div>
                          <Progress value={phaseProgress} className="w-24 h-2" />
                        </div>
                        {isExpanded ? 
                          <ChevronDown className="h-5 w-5 text-white" /> : 
                          <ChevronRight className="h-5 w-5 text-white" />
                        }
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      {/* Milestones */}
                      {phase.milestones.length > 0 && (
                        <div className="mb-6">
                          <h4 className="text-sm font-semibold text-white mb-3 flex items-center">
                            <Star className="h-4 w-4 mr-2" />
                            Key Milestones
                          </h4>
                          <div className="space-y-2">
                            {phase.milestones.map(milestone => (
                              <div key={milestone.id} 
                                className="flex items-center justify-between p-3 bg-burgundy-700/50 rounded-lg border border-burgundy-500">
                                <div className="flex items-center space-x-3">
                                  <div className={cn(
                                    "w-3 h-3 rounded-full",
                                    completedMilestones.has(milestone.id) ? 'bg-green-600' : 'bg-burgundy-400'
                                  )} />
                                  <div>
                                    <p className="font-medium text-white">{milestone.title}</p>
                                    <p className="text-sm text-burgundy-200">{milestone.description}</p>
                                  </div>
                                </div>
                                <div className="text-right text-sm text-burgundy-200">
                                  <p>{format(milestone.targetDate, 'MMM d')}</p>
                                  <Badge className={getPriorityColor(milestone.importance)}>
                                    {milestone.importance}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tasks */}
                      <div className="space-y-3">
                        {phase.tasks.map(task => {
                          const isCompleted = completedTasks.has(task.id);
                          const isOverdue = isBefore(task.dueDate, new Date()) && !isCompleted;

                          return (
                            <div key={task.id} 
                              className={cn(
                                "flex items-center justify-between p-4 rounded-lg border transition-all",
                                isCompleted ? 'bg-green-800/30 border-green-500' : 
                                isOverdue ? 'bg-red-800/30 border-red-500' : 'bg-burgundy-700/30 border-burgundy-500'
                              )}>
                              <div className="flex items-start space-x-4 flex-1">
                                <button 
                                  onClick={() => handleTaskToggle(task.id, task.status)}
                                  className="mt-1"
                                >
                                  {getStatusIcon(isCompleted ? 'completed' : isOverdue ? 'overdue' : task.status)}
                                </button>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-1">
                                    {getCategoryIcon(task.category)}
                                    <h5 className={cn(
                                      "font-medium",
                                      isCompleted ? 'line-through text-gray-400' : 'text-white'
                                    )}>
                                      {task.title}
                                    </h5>
                                    <Badge className={getPriorityColor(task.priority)}>
                                      {task.priority}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-burgundy-200 mb-2">{task.description}</p>
                                  <div className="flex items-center space-x-4 text-xs text-burgundy-300">
                                    <span className="flex items-center">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      Due: {format(task.dueDate, 'MMM d')}
                                    </span>
                                    <span className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {task.estimatedHours}h estimated
                                    </span>
                                    {task.assignee && (
                                      <span className="flex items-center">
                                        <Users className="h-3 w-3 mr-1" />
                                        {task.assignee}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {['pending', 'in-progress', 'completed', 'overdue'].map(status => {
              const statusTasks = filteredPhases.flatMap(phase => 
                phase.tasks.filter(task => {
                  const isCompleted = completedTasks.has(task.id);
                  const isOverdue = isBefore(task.dueDate, new Date()) && !isCompleted;
                  
                  if (status === 'completed') return isCompleted;
                  if (status === 'overdue') return isOverdue;
                  return task.status === status && !isCompleted && !isOverdue;
                })
              );

              return (
                <Card key={status} className="bg-white/10 border-burgundy-600">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center justify-between">
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                      <Badge className="bg-burgundy-700 text-white">{statusTasks.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                    {statusTasks.map(task => (
                      <div key={task.id} className="p-3 bg-white/20 rounded-lg border border-burgundy-500">
                        <h6 className="font-medium text-white text-sm mb-1">{task.title}</h6>
                        <p className="text-burgundy-200 text-xs mb-2 line-clamp-2">{task.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <span className="text-burgundy-300">
                            {format(task.dueDate, 'MMM d')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {viewMode === 'calendar' && (
          <Card className="bg-white/10 border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Calendar View
              </CardTitle>
              <p className="text-burgundy-200">Task and milestone calendar visualization</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Tasks */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Upcoming Tasks
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {timelinePhases.flatMap(phase => phase.tasks)
                      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                      .slice(0, 10)
                      .map(task => {
                        const daysUntil = differenceInDays(new Date(task.dueDate), new Date());
                        const isOverdue = daysUntil < 0;
                        const isUpcoming = daysUntil <= 7 && daysUntil >= 0;
                        
                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "p-4 rounded-lg border-l-4",
                              isOverdue ? "bg-red-900/20 border-red-400" :
                              isUpcoming ? "bg-yellow-900/20 border-yellow-400" :
                              "bg-white/10 border-burgundy-400"
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-medium text-white text-sm">{task.title}</h5>
                              <Badge className={cn(
                                "text-xs",
                                isOverdue ? "bg-red-100 text-red-800" :
                                isUpcoming ? "bg-yellow-100 text-yellow-800" :
                                "bg-blue-100 text-blue-800"
                              )}>
                                {isOverdue ? 'Overdue' : isUpcoming ? 'Due Soon' : 'Scheduled'}
                              </Badge>
                            </div>
                            <p className="text-burgundy-200 text-xs mb-2 line-clamp-2">
                              {task.description}
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-burgundy-300">
                                {format(task.dueDate, 'MMM d, yyyy')}
                              </span>
                              <span className="text-burgundy-300">
                                {Math.abs(daysUntil)} {daysUntil === 1 || daysUntil === -1 ? 'day' : 'days'} {isOverdue ? 'ago' : 'remaining'}
                              </span>
                            </div>
                            {task.assignee && (
                              <div className="flex items-center mt-2 text-xs text-burgundy-300">
                                <Users className="h-3 w-3 mr-1" />
                                {task.assignee}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Milestones Timeline */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Target className="mr-2 h-4 w-4" />
                    Key Milestones
                  </h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {timelinePhases.flatMap(phase => phase.milestones)
                      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime())
                      .map(milestone => {
                        const daysUntil = differenceInDays(new Date(milestone.targetDate), new Date());
                        const isCompleted = completedMilestones.has(milestone.id);
                        const isOverdue = daysUntil < 0 && !isCompleted;
                        const isUpcoming = daysUntil <= 14 && daysUntil >= 0;
                        
                        return (
                          <div
                            key={milestone.id}
                            className={cn(
                              "p-4 rounded-lg border",
                              isCompleted ? "bg-green-900/20 border-green-400" :
                              isOverdue ? "bg-red-900/20 border-red-400" :
                              isUpcoming ? "bg-blue-900/20 border-blue-400" :
                              "bg-white/10 border-burgundy-400"
                            )}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-400 mr-2" />
                                ) : (
                                  <Circle className="h-4 w-4 text-burgundy-300 mr-2" />
                                )}
                                <h5 className="font-medium text-white text-sm">{milestone.title}</h5>
                              </div>
                              <Badge className={cn(
                                "text-xs",
                                milestone.importance === 'critical' ? "bg-red-100 text-red-800" :
                                milestone.importance === 'high' ? "bg-orange-100 text-orange-800" :
                                "bg-blue-100 text-blue-800"
                              )}>
                                {milestone.importance}
                              </Badge>
                            </div>
                            <p className="text-burgundy-200 text-xs mb-2 line-clamp-2">
                              {milestone.description}
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-burgundy-300">
                                Target: {format(milestone.targetDate, 'MMM d, yyyy')}
                              </span>
                              {!isCompleted && (
                                <span className={cn(
                                  "text-xs",
                                  isOverdue ? "text-red-400" : isUpcoming ? "text-yellow-400" : "text-burgundy-300"
                                )}>
                                  {Math.abs(daysUntil)} {daysUntil === 1 || daysUntil === -1 ? 'day' : 'days'} {isOverdue ? 'overdue' : 'remaining'}
                                </span>
                              )}
                              {isCompleted && milestone.completedDate && (
                                <span className="text-green-400">
                                  Completed {format(milestone.completedDate, 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Calendar Summary */}
              <div className="mt-8 pt-6 border-t border-burgundy-600">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-burgundy-800/50 border-burgundy-600">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {timelinePhases.flatMap(p => p.tasks).filter(t => differenceInDays(new Date(t.dueDate), new Date()) <= 7 && differenceInDays(new Date(t.dueDate), new Date()) >= 0).length}
                      </div>
                      <div className="text-xs text-burgundy-200">Due This Week</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-burgundy-800/50 border-burgundy-600">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {timelinePhases.flatMap(p => p.tasks).filter(t => differenceInDays(new Date(t.dueDate), new Date()) < 0).length}
                      </div>
                      <div className="text-xs text-burgundy-200">Overdue Tasks</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-burgundy-800/50 border-burgundy-600">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {timelinePhases.flatMap(p => p.milestones).filter(m => differenceInDays(new Date(m.targetDate), new Date()) <= 14 && differenceInDays(new Date(m.targetDate), new Date()) >= 0).length}
                      </div>
                      <div className="text-xs text-burgundy-200">Upcoming Milestones</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-burgundy-800/50 border-burgundy-600">
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-white mb-1">
                        {Math.round(calculateOverallProgress())}%
                      </div>
                      <div className="text-xs text-burgundy-200">Overall Progress</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {viewMode === 'calendar-grid' && (
          <Card className="bg-white/10 border-burgundy-600">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Calendar Grid View
              </CardTitle>
              <p className="text-burgundy-200">Monthly calendar grid with tasks and milestones</p>
            </CardHeader>
            <CardContent>
              {(() => {
                // Generate calendar grid for the next 6 months
                const today = new Date();
                const months = [];
                for (let i = 0; i < 6; i++) {
                  const monthDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
                  months.push(monthDate);
                }

                const getTasksForDate = (date: Date) => {
                  return timelinePhases.flatMap(phase => phase.tasks).filter(task => {
                    const taskDate = new Date(task.dueDate);
                    return taskDate.getDate() === date.getDate() && 
                           taskDate.getMonth() === date.getMonth() && 
                           taskDate.getFullYear() === date.getFullYear();
                  });
                };

                const getMilestonesForDate = (date: Date) => {
                  return timelinePhases.flatMap(phase => phase.milestones).filter(milestone => {
                    const milestoneDate = new Date(milestone.targetDate);
                    return milestoneDate.getDate() === date.getDate() && 
                           milestoneDate.getMonth() === date.getMonth() && 
                           milestoneDate.getFullYear() === date.getFullYear();
                  });
                };

                const getDaysInMonth = (date: Date) => {
                  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
                };

                const getFirstDayOfMonth = (date: Date) => {
                  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
                };

                return (
                  <div className="space-y-8">
                    {months.map(monthDate => {
                      const daysInMonth = getDaysInMonth(monthDate);
                      const firstDay = getFirstDayOfMonth(monthDate);
                      const days = [];

                      // Add empty cells for days before the first day of the month
                      for (let i = 0; i < firstDay; i++) {
                        days.push(null);
                      }

                      // Add all days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), day));
                      }

                      return (
                        <div key={monthDate.getTime()} className="bg-burgundy-800/30 rounded-lg p-6">
                          <h3 className="text-xl font-bold text-white mb-4 text-center">
                            {format(monthDate, 'MMMM yyyy')}
                          </h3>
                          
                          {/* Calendar Header */}
                          <div className="grid grid-cols-7 gap-2 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                              <div key={day} className="text-center text-burgundy-200 font-semibold py-2">
                                {day}
                              </div>
                            ))}
                          </div>

                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-2">
                            {days.map((date, index) => {
                              if (!date) {
                                return <div key={index} className="h-20"></div>;
                              }

                              const dayTasks = getTasksForDate(date);
                              const dayMilestones = getMilestonesForDate(date);
                              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                              const hasEvents = dayTasks.length > 0 || dayMilestones.length > 0;

                              return (
                                <div
                                  key={date.getTime()}
                                  className={cn(
                                    "h-20 p-1 border rounded-lg relative overflow-hidden",
                                    isToday ? "border-white bg-white/20" : "border-burgundy-600 bg-burgundy-800/20",
                                    hasEvents && "ring-1 ring-burgundy-400"
                                  )}
                                >
                                  <div className={cn(
                                    "text-xs font-semibold mb-1",
                                    isToday ? "text-white" : "text-burgundy-200"
                                  )}>
                                    {date.getDate()}
                                  </div>
                                  
                                  <div className="space-y-1">
                                    {/* Show up to 2 tasks */}
                                    {dayTasks.slice(0, 2).map(task => (
                                      <div
                                        key={task.id}
                                        className={cn(
                                          "text-xs px-1 py-0.5 rounded truncate",
                                          task.priority === 'critical' ? "bg-red-600/80 text-white" :
                                          task.priority === 'high' ? "bg-orange-600/80 text-white" :
                                          "bg-blue-600/80 text-white"
                                        )}
                                        title={task.title}
                                      >
                                        {task.title}
                                      </div>
                                    ))}
                                    
                                    {/* Show milestones */}
                                    {dayMilestones.slice(0, 1).map(milestone => (
                                      <div
                                        key={milestone.id}
                                        className="text-xs px-1 py-0.5 rounded bg-green-600/80 text-white truncate flex items-center"
                                        title={milestone.title}
                                      >
                                        <Target className="h-2 w-2 mr-1" />
                                        {milestone.title}
                                      </div>
                                    ))}

                                    {/* Show overflow indicator */}
                                    {(dayTasks.length > 2 || (dayTasks.length > 1 && dayMilestones.length > 0)) && (
                                      <div className="text-xs text-burgundy-300">
                                        +{dayTasks.length + dayMilestones.length - 2} more
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}