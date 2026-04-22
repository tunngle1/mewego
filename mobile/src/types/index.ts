// User roles
export type UserRole = 'guest' | 'user' | 'organizer' | 'admin' | 'superadmin';

// Subscription types
export type SubscriptionPlan = 'free' | 'trial' | 'basic' | 'organizer';

export interface Subscription {
  plan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  isActive: boolean;
  trialUsed: boolean;
}

// Event types
export type EventIntensity = 'мягко' | 'средне' | 'активно' | 'динамичный';
export type LocationType = 'public_place' | 'venue' | 'route' | 'nature' | 'online';

export interface Instructor {
  id: string;
  publicId?: string;
  name: string;
  avatar: string;
  rating: number;
  eventsCount: number;
  returnRate: number;
}

export interface EventLocation {
  name: string;
  type: LocationType;
  address?: string;
  routeStart?: string;
  routeFinish?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Event {
  id: string;
  title: string;
  category: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  location: EventLocation;
  intensity: EventIntensity;
  price: number;
  isFree: boolean;
  paymentInstructions?: string;
  image: string;
  instructor: Instructor;
  vibe: string[];
  spotsTotal: number;
  spotsTaken: number;
  participants: Participant[];
  waitingList: WaitingListEntry[];
  isFull: boolean;
}

export interface Participant {
  id: string;
  avatar: string;
  name: string;
}

export interface WaitingListEntry {
  userId: string;
  position: number;
  joinedAt: string;
}

export type WaitingOfferStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface WaitingOffer {
  id: string;
  eventId: string;
  userId: string;
  status: WaitingOfferStatus;
  offeredAt: string;
  expiresAt: string;
}

// Booking types
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'attended' | 'no_show';

export type BookingViewerPhase = 'upcoming' | 'ongoing' | 'ended';

export interface Booking {
  id: string;
  eventId: string;
  event: Event;
  userId: string;
  status: BookingStatus;
  viewerPhase?: BookingViewerPhase;
  eventStatus?: string;
  bookedAt: string;
  paidAmount: number;
  cancellationReason?: string;
  cancellationComment?: string;
  cancelledAt?: string;
}

// User types
export type UserStatus = 'начал_движение' | 'вошел_в_ритм' | 'привычка_формируется' | 'стабильный';

export interface User {
  id: string;
  publicId?: string;
  email: string;
  name: string;
  avatar?: string;
  about?: string;
  phone?: string;
  telegramId?: string;
  role: UserRole;
  accountStatus?: 'active' | 'banned' | 'frozen';
  bannedAt?: string;
  bannedReason?: string;
  frozenAt?: string;
  frozenUntil?: string;
  frozenReason?: string;
  subscription: Subscription;
  points: number;
  status: UserStatus;
  level: number;
  experience: number;
  totalEvents: number;
  createdAt: string;
  lastActiveAt?: string;
  city?: string;
  interests?: string[];
  onboardingCompleted: boolean;
}

export type BanAppealStatus = 'pending' | 'approved' | 'rejected';

export interface BanAppeal {
  id: string;
  userId: string;
  userMessage: string;
  status: BanAppealStatus;
  adminResponse?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface AdminBanAppeal extends BanAppeal {
  user?: {
    id: string;
    name?: string | null;
    phone?: string | null;
    telegramId?: string | null;
  } | null;
  resolvedBy?: {
    id: string;
    name?: string | null;
  } | null;
}

export type AdminAnalyticsRange = '7d' | '30d' | '90d' | 'all';
export type AdminAnalyticsTimeseriesMetric = 'joined' | 'attended' | 'reviews' | 'positive_reviews';

export interface AdminAnalyticsOverview {
  range: AdminAnalyticsRange;
  events: {
    total: number;
    createdInRange: number;
  };
  participations: {
    joined: number;
    attended: number;
  };
  reviews: {
    total: number;
    avgRating: number;
    positiveCount: number;
    positiveShare: number;
  };
  revenue: {
    eventsEstimated: number;
    subscriptions: number;
  };
}

export interface AdminAnalyticsTimeseriesResponse {
  range: AdminAnalyticsRange;
  metric: AdminAnalyticsTimeseriesMetric;
  items: Array<{ date: string; value: number }>;
}

export interface AdminAnalyticsCategoriesResponse {
  range: AdminAnalyticsRange;
  items: Array<{ movementType: string; joined: number }>;
}

export interface AdminAnalyticsTopEventsResponse {
  range: AdminAnalyticsRange;
  items: Array<{
    id: string;
    title: string;
    movementType: string;
    startAt: string;
    status: string;
    joined: number;
    attended: number;
    reviews: number;
    avgRating: number;
    positiveReviews: number;
    positiveShare: number;
    revenueEstimated: number;
  }>;
}

// Challenge types
export type ChallengeStatus = 'active' | 'completed' | 'paused' | 'failed';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  reward: number;
}

// Review types
export interface Review {
  id: string;
  eventId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

// Notification types
export type NotificationType = 
  | 'reminder_24h'
  | 'reminder_2h'
  | 'reminder_30m'
  | 'waiting_list_spot'
  | 'post_event'
  | 'challenge'
  | 'activation';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Complaint types
export type ComplaintType = 'unsafe' | 'fraud' | 'other';

export interface Complaint {
  id: string;
  eventId?: string;
  organizerId?: string;
  type: ComplaintType;
  description?: string;
  createdAt: string;
}

// Organizer Event types
export type OrganizerEventStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'canceled' | 'finished';
export type OrganizerPriceType = 'free' | 'donation' | 'fixed';
export type OrganizerLocationType = 'public_place' | 'venue' | 'route' | 'nature' | 'online';

export type EventVisibility = 'public' | 'private';

export interface OrganizerEvent {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  movementType: string;
  level: string;
  startAt: string;
  endAt?: string;
  durationMin: number;
  locationName: string;
  locationAddress?: string;
  locationType: OrganizerLocationType;
  lat?: number | null;
  lng?: number | null;
  capacity?: number;
  priceType: OrganizerPriceType;
  priceValue?: number;
  paymentInstructions?: string;
  status: OrganizerEventStatus;
  // Private event fields
  visibility: EventVisibility;
  inviteCode?: string | null;
  inviteLinkToken?: string | null;
  participantsJoinedCount: number;
  participantsAttendedCount: number;
  participantsCanceledCount: number;
  revenueTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateEventResolveResponse {
  eventId: string;
  title: string;
  organizer: string;
  startAt: string;
  status: string;
  message: string;
}

export type OrganizerParticipantStatus = 'joined' | 'attended' | 'no_show' | 'canceled';

export interface OrganizerParticipant {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  status: OrganizerParticipantStatus;
  isRepeat: boolean;
  joinedAt: string;
}

// Admin types
export type AdminComplaintStatus = 'open' | 'closed';
export type AdminComplaintTargetType = 'event' | 'organizer' | 'user';
export type AdminComplaintResolutionAction =
  | 'dismiss'
  | 'freeze'
  | 'ban'
  | 'unpublish_event'
  | 'reject_event'
  | 'delete_event';

export interface AdminComplaint {
  id: string;
  targetType: AdminComplaintTargetType;
  targetId: string;
  reason: ComplaintType;
  description?: string;
  status: AdminComplaintStatus;
  reporterId: string;
  reporterName?: string;
  targetOrganizerId?: string | null;
  targetOrganizerName?: string | null;
  createdAt: string;
  closedAt?: string;

  resolutionAction?: AdminComplaintResolutionAction | null;
  resolutionNote?: string | null;
  resolvedAt?: string | null;
  resolvedById?: string | null;
  resolvedByName?: string | null;
}

export type AdminUserStatus = 'active' | 'banned' | 'frozen';

export interface AdminUser {
  id: string;
  name?: string;
  phone?: string;
  telegramId?: string;
  role: UserRole;
  status?: AdminUserStatus;
  createdAt: string;
  lastActiveAt: string;
}

export interface AdminUserDetail {
  id: string;
  publicId?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  telegramId?: string;
  avatarUrl?: string;
  gender?: string;
  birthDate?: string;
  cityId?: string;
  activityLevel?: string;
  interests: string[];
  role: UserRole;
  status: AdminUserStatus;
  bannedAt?: string;
  bannedReason?: string;
  frozenAt?: string;
  frozenUntil?: string;
  frozenReason?: string;
  onboardingCompleted: boolean;
  createdAt: string;
  lastActiveAt: string;
  organizerProfile?: {
    displayName: string;
    status: string;
    bio?: string;
    tags: string[];
  };
  subscription?: {
    plan: string;
    status: string;
    endAt: string;
  };
  stats: {
    participations: number;
    events: number;
    reviews: number;
    complaintsReported: number;
  };
}

export interface AdminUserComplaints {
  against: Array<{
    id: string;
    reason: string;
    description?: string;
    status: string;
    reporterId: string;
    reporterName?: string;
    createdAt: string;
    closedAt?: string;
  }>;
  by: Array<{
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    description?: string;
    status: string;
    createdAt: string;
    closedAt?: string;
  }>;
}

export type AdminAuditAction =
  | 'ban'
  | 'unban'
  | 'freeze'
  | 'unfreeze'
  | 'reset_progress'
  | 'reset_subscriptions'
  | 'grant_subscription'
  | 'block_organizer'
  | 'unblock_organizer'
  | 'delete_user'
  | 'change_role'
  | 'approve_event'
  | 'reject_event'
  | 'close_complaint';

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName?: string;
  action: AdminAuditAction;
  targetType: string;
  targetId: string;
  targetName?: string;
  details?: Record<string, any>;
  createdAt: string;
}

export type AdminEventEditRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AdminEventEditRequestListItem {
  id: string;
  eventId: string;
  organizerId: string;
  status: AdminEventEditRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEventEditRequestDetail {
  id: string;
  eventId: string;
  organizerId: string;
  status: AdminEventEditRequestStatus;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedById: string | null;
}

// Organizer Profile types
export interface OrganizerPublicProfile {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  tags: string[];
  city?: string;
  contactTelegram?: string;
  paymentInfo?: string;
  ratingAvg: number;
  ratingCount: number;
  eventsHostedCount: number;
  totalAttendeesCount: number;
  certificates: Certificate[];
}

export interface Certificate {
  id: string;
  title: string;
  issuer?: string;
  issuedAt?: string;
  assetUrl?: string;
  verified: boolean;
}

export interface OrganizerStats {
  totalEventsCreated: number;
  eventsHosted: number;
  upcomingEvents: number;
  totalParticipants: number;
  attendanceRate: number;
  noShowRate: number;
  repeatAttendeesCount: number;
  ratingAvg: number;
  ratingCount: number;
}

export interface OrganizerReview {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  organizerReply?: string;
  organizerReplyAt?: string;
}

// User Profile types (public profile for social view)
export interface UserProfile {
  id: string;
  publicId?: string;
  name: string;
  avatarUrl?: string;
  city?: string;
  activityLevel?: string;
  interests: string[];
  memberSince: string;
  lastActive: string;
  isOwnProfile: boolean;
  stats: {
    totalEvents: number;
    attendedCount: number;
    joinedCount: number;
    attendanceRate: number;
    streak: number;
  };
  favoriteCategories: string[];
  recentActivity: {
    eventId: string;
    eventTitle: string;
    category: string;
    date: string;
    status: string;
  }[];
  reviews: {
    id: string;
    eventId: string;
    eventTitle: string;
    rating: number;
    comment?: string;
    createdAt: string;
  }[];
}

// App state types
export interface AdminStatsOverview {
  users: {
    total: number;
    byStatus: Record<string, number>;
    byRole: Record<string, number>;
  };
  events: {
    total: number;
    byStatus: Record<string, number>;
    byMovementType: Record<string, number>;
  };
  participations: {
    total: number;
    byStatus: Record<string, number>;
  };
  reviews: {
    total: number;
    avgRating: number;
    ratingsCount: number;
  };
  complaints: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export type TrainerCrmClientStatus = 'lead' | 'active' | 'inactive' | 'paused' | 'archived';
export type TrainerCrmSessionType = 'personal' | 'group';
export type TrainerCrmSessionVisibility = 'public' | 'private' | 'crm_only';
export type TrainerCrmSessionStatus = 'draft' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled_by_trainer' | 'cancelled_by_client' | 'cancelled' | 'no_show';
export type TrainerCrmParticipantStatus = 'booked' | 'confirmed' | 'attended' | 'late_cancelled' | 'cancelled' | 'no_show' | 'waitlisted' | 'offered_from_waitlist';
export type TrainerCrmPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded' | 'waived';
export type TrainerCrmPackageKind = 'package' | 'membership' | 'drop_in' | 'trial' | 'complimentary';
export type TrainerCrmPackageStatus = 'draft' | 'active' | 'paused' | 'expired' | 'cancelled' | 'completed';
export type TrainerCrmTaskStatus = 'open' | 'done' | 'cancelled';
export type TrainerCrmTaskPriority = 'low' | 'medium' | 'high';
export type TrainerCrmNoteType = 'general' | 'goal' | 'health' | 'progress' | 'follow_up' | 'payment';

export interface TrainerCrmLinkedUser {
  id: string;
  publicId?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  telegramId?: string | null;
}

export interface TrainerCrmClient {
  id: string;
  trainerId: string;
  userId?: string | null;
  fullName: string;
  phone?: string | null;
  telegramHandle?: string | null;
  email?: string | null;
  city?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  status: TrainerCrmClientStatus;
  source: string;
  goals?: string | null;
  medicalNotes?: string | null;
  privateNotes?: string | null;
  tags: string[];
  lastSessionAt?: string | null;
  nextSessionAt?: string | null;
  sessionsCompletedCount: number;
  noShowCount: number;
  cancelledCount: number;
  lifetimeValueMinor: number;
  currency: string;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  linkedUser?: TrainerCrmLinkedUser | null;
  stats?: {
    packagesCount: number;
    notesCount: number;
    tasksCount: number;
    participationsCount: number;
  };
}

export interface TrainerCrmSessionParticipant {
  id: string;
  sessionId: string;
  clientId: string;
  userId?: string | null;
  status: TrainerCrmParticipantStatus;
  paymentStatus: TrainerCrmPaymentStatus;
  priceMinor?: number | null;
  amountPaidMinor: number;
  bookedAt?: string | null;
  confirmedAt?: string | null;
  attendedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  note?: string | null;
  attendanceMarkedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  client?: TrainerCrmClient | null;
  user?: TrainerCrmLinkedUser | null;
}

export interface TrainerCrmSession {
  id: string;
  trainerId: string;
  linkedEventId?: string | null;
  type: TrainerCrmSessionType;
  visibility: TrainerCrmSessionVisibility;
  title: string;
  description?: string | null;
  discipline?: string | null;
  format?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  onlineUrl?: string | null;
  startAt: string;
  endAt?: string | null;
  durationMin: number;
  capacity?: number | null;
  waitlistEnabled: boolean;
  priceMinor?: number | null;
  currency: string;
  paymentNote?: string | null;
  status: TrainerCrmSessionStatus;
  isRecurringTemplate: boolean;
  recurrenceRule?: string | null;
  parentSeriesId?: string | null;
  bufferBeforeMin?: number | null;
  bufferAfterMin?: number | null;
  cancelledAt?: string | null;
  cancelledReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  linkedEvent?: {
    id: string;
    title: string;
    status: string;
    visibility?: string | null;
    startAt?: string | null;
  } | null;
  stats?: {
    participantsCount: number;
    notesCount: number;
  };
  participants?: TrainerCrmSessionParticipant[];
}

export interface TrainerCrmPackage {
  id: string;
  trainerId: string;
  clientId: string;
  title: string;
  kind: TrainerCrmPackageKind;
  discipline?: string | null;
  sessionsIncluded?: number | null;
  sessionsUsed: number;
  sessionsRemaining: number;
  startsAt?: string | null;
  endsAt?: string | null;
  freezeDaysRemaining?: number | null;
  priceMinor?: number | null;
  currency: string;
  paymentStatus: TrainerCrmPaymentStatus;
  status: TrainerCrmPackageStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  client?: TrainerCrmClient | null;
  usageCount?: number;
  usages?: Array<{
    id: string;
    usedUnits: number;
    createdAt: string;
    session?: TrainerCrmSession | null;
    participantId?: string | null;
  }>;
}

export interface TrainerCrmNote {
  id: string;
  trainerId: string;
  clientId?: string | null;
  sessionId?: string | null;
  type: TrainerCrmNoteType;
  title?: string | null;
  content: string;
  visibility: 'private';
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainerCrmTask {
  id: string;
  trainerId: string;
  clientId?: string | null;
  sessionId?: string | null;
  title: string;
  description?: string | null;
  dueAt?: string | null;
  status: TrainerCrmTaskStatus;
  priority: TrainerCrmTaskPriority;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  client?: TrainerCrmClient | null;
  session?: TrainerCrmSession | null;
}

export interface TrainerCrmDashboardResponse {
  todaySessions: TrainerCrmSession[];
  nextSessions: TrainerCrmSession[];
  stats: {
    activeClientsCount: number;
    unpaidParticipantsCount: number;
    packageExpiringCount: number;
    totalSessionsCount: number;
    completedSessionsCount: number;
    recordedRevenueMinor: number;
  };
  alerts: {
    hasOverdueTasks: boolean;
    hasUnpaidParticipants: boolean;
    hasExpiringPackages: boolean;
  };
}

export interface TrainerCrmClientsResponse {
  items: TrainerCrmClient[];
  nextCursor: string | null;
}

export interface TrainerCrmClientHistory {
  clientId: string;
  sessions: Array<TrainerCrmSessionParticipant & { session?: TrainerCrmSession | null }>;
  packages: TrainerCrmPackage[];
  notes: TrainerCrmNote[];
  summary: {
    sessionsCompletedCount: number;
    cancelledCount: number;
    noShowCount: number;
    lifetimeValueMinor: number;
  };
}

export interface TrainerCrmAnalyticsOverview {
  range: '7d' | '30d' | '90d' | 'all' | string;
  stats: {
    scheduledSessions: number;
    completedSessions: number;
    attendanceRate: number;
    noShowRate: number;
    cancellationRate: number;
    activeClients: number;
    newClients: number;
    repeatClients: number;
    repeatRate: number;
    recordedRevenueMinor: number;
    occupancyRate: number;
    ratingAvg: number | null;
    ratingCount: number;
  };
}

export interface AppState {
  isFirstLaunch: boolean;
  onboardingCompleted: boolean;
  user: User | null;
  isAuthenticated: boolean;
}

// Navigation types
export type RootStackParamList = {
  onboarding: undefined;
  '(tabs)': undefined;
  'event/[id]': { id: string };
  booking: { eventId: string };
  waiting: { eventId: string };
  'post-event': { eventId: string };
  paywall: undefined;
};
