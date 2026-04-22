export * from './theme';

// App constants
export const APP_NAME = 'ME·WE·GO';
export const APP_VERSION = '1.0.0';

// Subscription prices
export const SUBSCRIPTION_PRICES = {
  basic: 349,
  organizer: 999,
  trial_days: 7,
};

// Activation window
export const ACTIVATION_WINDOW_DAYS = 3;

// Churn prevention limits
export const CHURN_LIMITS = {
  maxPushPerDay: 2,
  maxTouchesIn3Days: 5,
  minAppOpens: 2,
  minEventsViewed: 3,
  inactivityHours: 48,
};

// Waiting list
export const WAITING_LIST = {
  confirmationTimeMinutes: 30,
};

// Post-event
export const POST_EVENT = {
  firstReminderHours: 6,
  secondReminderHours: 24,
};

// Challenge
export const CHALLENGE_INITIAL = {
  title: '2 движения за 7 дней',
  target: 2,
  durationDays: 7,
};

// Points
export const POINTS = {
  eventAttended: 100,
  reviewLeft: 25,
  challengeCompleted: 200,
};

// User statuses thresholds
export const USER_STATUS_THRESHOLDS = {
  начал_движение: 0,
  вошел_в_ритм: 3,
  привычка_формируется: 10,
  стабильный: 30,
};

// Experience for levels
export const LEVEL_EXPERIENCE = [
  0,     // Level 1
  500,   // Level 2
  1000,  // Level 3
  2000,  // Level 4
  4000,  // Level 5
  8000,  // Level 6
  16000, // Level 7
];

export const CATEGORY_SLUGS = ['yoga', 'running', 'cycling', 'strength', 'swimming', 'badminton', 'tennis', 'padel', 'team', 'martial'] as const;

export const CATEGORY_LABELS: Record<(typeof CATEGORY_SLUGS)[number], string> = {
  yoga: 'Йога',
  running: 'Бег',
  cycling: 'Велоспорт',
  strength: 'Силовые',
  swimming: 'Плавание',
  badminton: 'Бадминтон',
  tennis: 'Теннис',
  padel: 'Падел',
  team: 'Групповые виды спорта',
  martial: 'Единоборства',
};

// Mock data (пустые массивы — все данные теперь из backend)
export const MOCK_EVENTS: any[] = [];

export const MOCK_USER = {
  id: 'u1',
  email: 'alex.mewego@mail.ru',
  name: 'Алексей',
  avatar: 'https://i.pravatar.cc/150?u=me',
  role: 'user' as const,
  subscription: {
    plan: 'free' as const,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isActive: false,
    trialUsed: false,
  },
  points: 0,
  status: 'начал_движение' as const,
  level: 1,
  experience: 0,
  totalEvents: 0,
  createdAt: new Date().toISOString(),
  city: '',
  interests: [],
  onboardingCompleted: false,
};

export const MOCK_TRAINER = {
  id: 't1',
  email: 'anna.trainer@mewego.ru',
  name: 'Анна Кузнецова',
  avatar: 'https://i.pravatar.cc/150?u=trainer',
  role: 'organizer' as const,
  subscription: {
    plan: 'organizer' as const,
    startDate: '2024-06-01',
    endDate: '2025-06-01',
    isActive: true,
    trialUsed: true,
  },
  points: 2400,
  status: 'стабильный' as const,
  level: 5,
  experience: 4800,
  totalEvents: 48,
  createdAt: '2024-01-10',
  city: 'Москва',
  interests: ['Йога', 'Медитация', 'Растяжка'],
  onboardingCompleted: true,
};

export const MOCK_ADMIN = {
  id: 'a1',
  email: 'admin@mewego.ru',
  name: 'Администратор',
  avatar: 'https://i.pravatar.cc/150?u=admin',
  role: 'admin' as const,
  subscription: {
    plan: 'organizer' as const,
    startDate: '2024-01-01',
    endDate: '2030-01-01',
    isActive: true,
    trialUsed: true,
  },
  points: 0,
  status: 'стабильный' as const,
  level: 10,
  experience: 99999,
  totalEvents: 0,
  createdAt: '2024-01-01',
  city: 'Москва',
  interests: [],
  onboardingCompleted: true,
};

export const DEMO_ACCOUNTS = [
  
];

// Organizer mock data (пустые — все данные теперь из backend)
export const MOCK_ORGANIZER_EVENTS: any[] = [];

export const MOCK_ORGANIZER_PARTICIPANTS: Record<string, any[]> = {};

// Admin mock data (пустые — все данные теперь из backend)
export const MOCK_ADMIN_COMPLAINTS: any[] = [];
