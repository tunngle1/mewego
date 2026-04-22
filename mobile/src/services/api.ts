import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Event, User, Booking, Review, Challenge, Notification, OrganizerEvent, OrganizerParticipant, AdminComplaint, AdminUser, AdminUserDetail, AdminUserComplaints, AdminAuditLog, AdminStatsOverview, BanAppeal, Complaint, AdminBanAppeal, BanAppealStatus, AdminAnalyticsOverview, AdminAnalyticsTimeseriesResponse, AdminAnalyticsCategoriesResponse, AdminAnalyticsTopEventsResponse, AdminAnalyticsRange, AdminAnalyticsTimeseriesMetric, AdminEventEditRequestListItem, AdminEventEditRequestDetail, TrainerCrmDashboardResponse, TrainerCrmClient, TrainerCrmClientsResponse, TrainerCrmClientHistory, TrainerCrmNote, TrainerCrmSession, TrainerCrmSessionParticipant, TrainerCrmPackage, TrainerCrmTask, TrainerCrmAnalyticsOverview, UserProfile } from '../types';
import { MOCK_EVENTS, MOCK_USER, MOCK_ORGANIZER_EVENTS, MOCK_ORGANIZER_PARTICIPANTS, MOCK_ADMIN_COMPLAINTS } from '../constants';

export class ApiError extends Error {
  statusCode: number;
  data: unknown;

  constructor(statusCode: number, message: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

// ============================================================
// ДОМЕННЫЕ ФЛАГИ МОКОВ
// true = моки, false = реальный /api/v1
// Моковыми остаются только Auth и Payment
// ============================================================
export const USE_MOCK_AUTH = false;       // Auth: используем реальный backend (Telegram OAuth)
export const USE_MOCK_EVENTS = false;     // Events из backend
export const USE_MOCK_BOOKINGS = false;   // Participation/Bookings из backend
export const USE_MOCK_WAITING = false;    // Waiting list из backend
export const USE_MOCK_ORGANIZER = false;  // Organizer CRUD из backend
export const USE_MOCK_ADMIN = false;      // Admin moderation из backend
export const USE_MOCK_PAYMENT = true;     // Payment остаётся моковой (IAP)

// Legacy alias для обратной совместимости (постепенно убрать)
export const USE_MOCK_API = USE_MOCK_EVENTS;

const resolveApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const hasEnvUrl = typeof envUrl === 'string' && envUrl.trim().length > 0;

  // Android emulator should always use 10.0.2.2 for host machine.
  // This must override envUrl, otherwise emulator will try to use LAN IP and fail.
  if (Platform.OS === 'android' && Constants.isDevice === false) {
    return 'http://10.0.2.2:3000/api/v1';
  }

  // If a URL is explicitly provided via .env, prefer it.
  // (Use LAN IP here for physical devices.)
  if (hasEnvUrl) {
    return envUrl.trim();
  }

  // Android fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/v1';
  }

  // iOS simulator (and other fallback environments)
  return 'http://localhost:3000/api/v1';
};

const getDevApiBaseUrlCandidates = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const debuggerHost =
    typeof Constants.expoConfig?.hostUri === 'string' && Constants.expoConfig.hostUri
      ? Constants.expoConfig.hostUri.split(':')[0]
      : typeof (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost === 'string'
        ? String((Constants as any).manifest2.extra.expoGo.debuggerHost).split(':')[0]
        : undefined;

  const candidates = [
    resolveApiBaseUrl(),
    typeof envUrl === 'string' && envUrl.trim() ? envUrl.trim() : null,
    debuggerHost ? `http://${debuggerHost}:3000/api/v1` : null,
    Platform.OS === 'android' ? 'http://10.0.2.2:3000/api/v1' : null,
    'http://127.0.0.1:3000/api/v1',
    'http://localhost:3000/api/v1',
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  return Array.from(new Set(candidates));
};

let API_BASE_URL = resolveApiBaseUrl();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getApiBaseUrl = () => API_BASE_URL;

class ApiService {
  private token: string | null = null;
  private userId: string | null = null;
  private userRole: 'user' | 'organizer' | 'admin' | 'superadmin' = 'user';

  private isRetryableNetworkError(err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return (
      message.includes('Network request failed') ||
      message.toLowerCase().includes('network request') ||
      message.toLowerCase().includes('aborted') ||
      message.toLowerCase().includes('abort')
    );
  }

  private mapLevelToIntensity(level?: string) {
    const key = String(level || '').trim().toLowerCase();
    switch (key) {
      case 'dynamic':
        return 'динамичный';
      case 'medium':
        return 'средне';
      case 'relaxed':
      case 'novice':
      default:
        return 'мягко';
    }
  }

  private normalizeIntensity(rawIntensity: unknown, rawLevel: unknown) {
    const intensityKey = typeof rawIntensity === 'string' ? rawIntensity.trim().toLowerCase() : '';
    if (intensityKey) {
      if (intensityKey === 'dynamic' || intensityKey === 'динамичный') return 'динамичный';
      if (intensityKey === 'medium' || intensityKey === 'средне') return 'средне';
      if (intensityKey === 'relaxed' || intensityKey === 'novice' || intensityKey === 'мягко') return 'мягко';
      if (intensityKey === 'active' || intensityKey === 'активно') return 'активно';
    }

    return this.mapLevelToIntensity(typeof rawLevel === 'string' ? rawLevel : undefined);
  }

  private formatMoscowDateTime(isoOrDate: string | Date): { date: string; time: string } {
    const dateObj = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;

    // Moscow time formatting (Europe/Moscow)
    const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return {
      date: dateFormatter.format(dateObj),
      time: timeFormatter.format(dateObj),
    };
  }

  private normalizeEvent(raw: any): Event {
    const durationMin =
      typeof raw.durationMin === 'number'
        ? raw.durationMin
        : typeof raw.duration === 'number'
          ? raw.duration
          : typeof raw.duration === 'string'
            ? parseInt(raw.duration, 10) || 60
            : 60;

    const locationName = raw.location?.name || raw.locationName || raw.location || 'Не указано';
    const locationTypeRaw = raw.location?.type || raw.locationType || 'public_place';
    const locationType = String(locationTypeRaw || 'public_place').trim().toLowerCase();

    const instructor = raw.instructor || raw.trainer || raw.organizer || {};

    const startAtIso = typeof raw.startAt === 'string' ? raw.startAt : undefined;
    const rawDateStr = typeof raw.date === 'string' ? raw.date : undefined;
    const dateIsoCandidate =
      startAtIso ||
      (rawDateStr && rawDateStr.includes('T') && (rawDateStr.includes('Z') || rawDateStr.includes('+'))
        ? rawDateStr
        : undefined);

    const moscow = dateIsoCandidate ? this.formatMoscowDateTime(dateIsoCandidate) : null;

    const latRaw = raw?.location?.coordinates?.latitude ?? raw?.lat;
    const lngRaw = raw?.location?.coordinates?.longitude ?? raw?.lng;
    const latitude = typeof latRaw === 'number' ? latRaw : typeof latRaw === 'string' ? Number(latRaw) : undefined;
    const longitude = typeof lngRaw === 'number' ? lngRaw : typeof lngRaw === 'string' ? Number(lngRaw) : undefined;
    const coordinates =
      typeof latitude === 'number' && Number.isFinite(latitude) && typeof longitude === 'number' && Number.isFinite(longitude)
        ? { latitude, longitude }
        : undefined;

    const addressRaw = raw.address || raw.locationAddress || raw.location?.address;
    const addressStr = typeof addressRaw === 'string' ? addressRaw : undefined;

    let routeStart: string | undefined;
    let routeFinish: string | undefined;
    let computedLocationType = locationType;

    if (addressStr) {
      const lines = addressStr
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        const mStart = line.match(/^Старт:\s*(.+)$/i);
        if (mStart?.[1]) routeStart = mStart[1].trim();

        const mFinish = line.match(/^Финиш:\s*(.+)$/i);
        if (mFinish?.[1]) routeFinish = mFinish[1].trim();
      }

      // Если backend вернул неправильный/иной тип, но в адресе есть старт/финиш — считаем это маршрутом.
      if (computedLocationType !== 'route' && (routeStart || routeFinish)) {
        computedLocationType = 'route';
      }
    }

    return {
      id: String(raw.id),
      title: raw.title || '',
      category: raw.category || raw.movementType || 'other',
      description: raw.description || '',
      // Prefer backend startAt and show it in Europe/Moscow (avoid raw ISO strings in UI)
      date: moscow?.date || raw.date || new Date().toISOString(),
      time: moscow?.time || raw.time || '',
      duration: durationMin,
      location: {
        name: locationName,
        type: computedLocationType as any,
        address: addressStr,
        routeStart,
        routeFinish,
        coordinates,
      },
      intensity: this.normalizeIntensity(raw.intensity, raw.level) as any,
      price: typeof raw.price === 'number' ? raw.price : typeof raw.priceValue === 'number' ? raw.priceValue : 0,
      isFree: typeof raw.isFree === 'boolean' ? raw.isFree : raw.priceType ? raw.priceType === 'free' : true,
      paymentInstructions: (() => {
        const direct =
          typeof raw.paymentInstructions === 'string'
            ? raw.paymentInstructions
            : typeof raw.paymentComment === 'string'
              ? raw.paymentComment
              : typeof raw.paymentInfo === 'string'
                ? raw.paymentInfo
                : undefined;

        if (typeof direct === 'string' && direct.trim()) return direct;

        const nested =
          typeof raw?.payment?.instructions === 'string'
            ? raw.payment.instructions
            : typeof raw?.payment?.comment === 'string'
              ? raw.payment.comment
              : typeof raw?.payment?.info === 'string'
                ? raw.payment.info
                : undefined;

        return typeof nested === 'string' && nested.trim() ? nested : undefined;
      })(),
      // If backend didn't provide an image URL, keep it empty so UI can apply local fallback covers.
      image: typeof raw.image === 'string' ? raw.image : '',
      instructor: {
        id: String(instructor.id || raw.organizerId || 'unknown'),
        publicId: instructor.publicId || raw.organizer?.publicId || undefined,
        name: instructor.name || 'Организатор',
        avatar: instructor.avatar || instructor.avatarUrl || '',
        rating: typeof instructor.rating === 'number' ? instructor.rating : 0,
        eventsCount: typeof instructor.eventsCount === 'number' ? instructor.eventsCount : 0,
        returnRate: typeof instructor.returnRate === 'number' ? instructor.returnRate : 0,
      },
      vibe: Array.isArray(raw.vibe) ? raw.vibe : [],
      spotsTotal: typeof raw.spotsTotal === 'number' ? raw.spotsTotal : typeof raw.capacity === 'number' ? raw.capacity : 999,
      spotsTaken: typeof raw.spotsTaken === 'number' ? raw.spotsTaken : typeof raw.participantsJoinedCount === 'number' ? raw.participantsJoinedCount : 0,
      participants: Array.isArray(raw.participants) ? raw.participants : [],
      waitingList: Array.isArray(raw.waitingList) ? raw.waitingList : [],
      isFull: typeof raw.isFull === 'boolean' ? raw.isFull : false,
    };
  }

  setToken(token: string | null) {
    this.token = token;
  }

  // Временная авторизация через headers (пока auth моковая)
  setAuthContext(userId: string, role: 'user' | 'organizer' | 'admin' | 'superadmin') {
    this.userId = userId;
    this.userRole = role;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      // Временные headers для dev-авторизации (backend принимает x-user-id, x-user-role)
      ...(this.userId && { 'x-user-id': this.userId, 'x-user-role': this.userRole }),
      ...options.headers,
    };

    const method = String(options.method || 'GET').toUpperCase();
    const shouldRetry = method === 'GET' || method === 'HEAD';
    const maxAttempts = shouldRetry ? 3 : 1;
    const timeoutMs = 15000;

    const baseUrls = shouldRetry ? getDevApiBaseUrlCandidates() : [API_BASE_URL];
    let response: Response | null = null;
    let lastError: unknown = null;
    let lastTriedUrl = `${API_BASE_URL}${endpoint}`;

    for (const baseUrl of baseUrls) {
      const url = `${baseUrl}${endpoint}`;
      lastTriedUrl = url;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
          });
          lastError = null;
          API_BASE_URL = baseUrl;
          break;
        } catch (err) {
          lastError = err;
          const canRetry = shouldRetry && attempt < maxAttempts && this.isRetryableNetworkError(err);
          if (!canRetry) {
            break;
          }

          const backoffMs = 400 * Math.pow(3, attempt - 1);
          await new Promise((r) => setTimeout(r, backoffMs));
        } finally {
          clearTimeout(timeoutId);
        }
      }

      if (response) {
        break;
      }
    }

    if (lastError && !response) {
      const message = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(`Network request failed (${timeoutMs}ms): ${message}. URL: ${lastTriedUrl}`);
    }

    if (!response) {
      throw new Error(`No response received. URL: ${lastTriedUrl}`);
    }

    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      let data: unknown = null;
      try {
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
      } catch {
        data = null;
      }

      const message = typeof data === 'string' && data ? data : `API Error: ${response.status}`;
      throw new ApiError(response.status, message, data);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    // @ts-expect-error - fallback for non-json responses
    return response.text();
  }

  // Gamification
  async getMyPoints(): Promise<{ totalPoints: number; ledger: any[] }> {
    return this.request<{ totalPoints: number; ledger: any[] }>('/me/points');
  }

  async getMe(): Promise<any> {
    return this.request('/me');
  }

  async getMyBanAppeal(): Promise<{ appeal: BanAppeal | null }> {
    return this.request<{ appeal: BanAppeal | null }>('/me/ban-appeal');
  }

  async createMyBanAppeal(message: string): Promise<{ appeal: BanAppeal }> {
    return this.request<{ appeal: BanAppeal }>('/me/ban-appeal', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getMyStatus(): Promise<{ statusKey: string | null; awardedAt: string | null }> {
    return this.request<{ statusKey: string | null; awardedAt: string | null }>('/me/status');
  }

  async createComplaint(payload: {
    targetType: 'event' | 'organizer' | 'user';
    targetId: string;
    reason: string;
    description?: string;
  }): Promise<Complaint> {
    return this.request<Complaint>('/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async loginWithEmail(email: string, password: string): Promise<{ token: string; user: { id: string; publicId?: string; email?: string; emailVerifiedAt?: string; isEmailVerified?: boolean; name?: string; firstName?: string; lastName?: string; role: string; avatarUrl?: string; cityId?: string; interests?: string[]; onboardingCompleted?: boolean; accountStatus?: 'active' | 'banned' | 'frozen'; bannedAt?: string; bannedReason?: string; frozenAt?: string; frozenUntil?: string; frozenReason?: string; marketingEmailOptIn?: boolean } }> {
    const result = await this.request<{ token: string; user: { id: string; publicId?: string; email?: string; emailVerifiedAt?: string; isEmailVerified?: boolean; name?: string; firstName?: string; lastName?: string; role: string; avatarUrl?: string; cityId?: string; interests?: string[]; onboardingCompleted?: boolean; accountStatus?: 'active' | 'banned' | 'frozen'; bannedAt?: string; bannedReason?: string; frozenAt?: string; frozenUntil?: string; frozenReason?: string; marketingEmailOptIn?: boolean } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async registerWithEmail(payload: { email: string; password: string; name: string; role?: 'user' | 'organizer'; marketingEmailOptIn?: boolean }): Promise<{ token: string; user: { id: string; publicId?: string; email?: string; emailVerifiedAt?: string; isEmailVerified?: boolean; name?: string; firstName?: string; lastName?: string; role: string; avatarUrl?: string; cityId?: string; interests?: string[]; onboardingCompleted?: boolean; accountStatus?: 'active' | 'banned' | 'frozen'; bannedAt?: string; bannedReason?: string; frozenAt?: string; frozenUntil?: string; frozenReason?: string; marketingEmailOptIn?: boolean }; verification?: { required?: boolean; deliveryStatus?: 'sent' | 'queued' | 'skipped' | 'failed' } }> {
    const result = await this.request<{ token: string; user: { id: string; publicId?: string; email?: string; emailVerifiedAt?: string; isEmailVerified?: boolean; name?: string; firstName?: string; lastName?: string; role: string; avatarUrl?: string; cityId?: string; interests?: string[]; onboardingCompleted?: boolean; accountStatus?: 'active' | 'banned' | 'frozen'; bannedAt?: string; bannedReason?: string; frozenAt?: string; frozenUntil?: string; frozenReason?: string; marketingEmailOptIn?: boolean }; verification?: { required?: boolean; deliveryStatus?: 'sent' | 'queued' | 'skipped' | 'failed' } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(result.token);
    return result;
  }

  async requestEmailVerification(email: string): Promise<{ ok: true; deliveryStatus?: 'sent' | 'queued' | 'skipped' | 'failed' }> {
    return this.request<{ ok: true; deliveryStatus?: 'sent' | 'queued' | 'skipped' | 'failed' }>('/auth/verify-email/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyEmailCode(email: string, code: string): Promise<{ token: string; user: { id: string; publicId?: string; email?: string; emailVerifiedAt?: string; isEmailVerified?: boolean; name?: string; firstName?: string; lastName?: string; role: string; avatarUrl?: string; cityId?: string; interests?: string[]; onboardingCompleted?: boolean; accountStatus?: 'active' | 'banned' | 'frozen'; bannedAt?: string; bannedReason?: string; frozenAt?: string; frozenUntil?: string; frozenReason?: string; marketingEmailOptIn?: boolean } }> {
    const result = await this.request<{ token: string; user: { id: string; publicId?: string; email?: string; emailVerifiedAt?: string; isEmailVerified?: boolean; name?: string; firstName?: string; lastName?: string; role: string; avatarUrl?: string; cityId?: string; interests?: string[]; onboardingCompleted?: boolean; accountStatus?: 'active' | 'banned' | 'frozen'; bannedAt?: string; bannedReason?: string; frozenAt?: string; frozenUntil?: string; frozenReason?: string; marketingEmailOptIn?: boolean } }>('/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
    this.setToken(result.token);
    return result;
  }

  async forgotPassword(email: string): Promise<{ ok: true }> {
    return this.request<{ ok: true }>('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<{ token: string; user: { id: string; publicId?: string; email?: string; emailVerifiedAt?: string; isEmailVerified?: boolean; name?: string; firstName?: string; lastName?: string; role: string; avatarUrl?: string; cityId?: string; interests?: string[]; onboardingCompleted?: boolean; accountStatus?: 'active' | 'banned' | 'frozen'; bannedAt?: string; bannedReason?: string; frozenAt?: string; frozenUntil?: string; frozenReason?: string; marketingEmailOptIn?: boolean } }> {
    const result = await this.request<{ token: string; user: { id: string; publicId?: string; email?: string; emailVerifiedAt?: string; isEmailVerified?: boolean; name?: string; firstName?: string; lastName?: string; role: string; avatarUrl?: string; cityId?: string; interests?: string[]; onboardingCompleted?: boolean; accountStatus?: 'active' | 'banned' | 'frozen'; bannedAt?: string; bannedReason?: string; frozenAt?: string; frozenUntil?: string; frozenReason?: string; marketingEmailOptIn?: boolean } }>('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    this.setToken(result.token);
    return result;
  }

  async pingHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health', { method: 'GET' });
  }

  async checkInEvent(eventId: string, payload: { code?: string; token?: string }): Promise<{ ok: true; status: 'attended'; eventId: string; message?: string }> {
    return this.request<{ ok: true; status: 'attended'; eventId: string; message?: string }>(`/events/${eventId}/check-in`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getOrganizerEventCheckIn(eventId: string): Promise<{
    ok: true;
    eventId: string;
    title: string;
    active: boolean;
    availableFrom: string;
    expiresAt: string;
    code?: string;
    qrPayload?: string;
  }> {
    return this.request(`/organizer/events/${eventId}/check-in`, { method: 'GET' });
  }

  // Auth (USE_MOCK_AUTH) - legacy mock login
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    if (USE_MOCK_AUTH) {
      await delay(1000);

      return {
        user: MOCK_USER as User,
        token: 'mock-jwt-token',
      };
    }
    return this.loginWithEmail(email, password) as Promise<{ user: User; token: string }>;
  }

  async register(email: string, password: string, name: string): Promise<{ user: User; token: string }> {
    if (USE_MOCK_AUTH) {
      await delay(1000);
      return {
        user: { ...MOCK_USER, email, name } as User,
        token: 'mock-jwt-token',
      };
    }
    return this.registerWithEmail({ email, password, name }) as Promise<{ user: User; token: string }>;
  }

  async logout(): Promise<void> {
    if (USE_MOCK_AUTH) {
      await delay(300);
      this.setToken(null);
      return;
    }
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
    this.token = null;
  }

  // Events (USE_MOCK_EVENTS)
  async getEvents(filters?: {
    city?: string;
    category?: string;
    intensity?: string;
    date?: string;
    search?: string;
  }): Promise<Event[]> {
    if (USE_MOCK_EVENTS) {
      await delay(500);
      let events = [...MOCK_EVENTS] as Event[];
      
      if (filters?.category) {
        events = events.filter((e) => e.category === filters.category);
      }
      if (filters?.intensity) {
        events = events.filter((e) => e.intensity === filters.intensity);
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        events = events.filter((e) => 
          e.title.toLowerCase().includes(q) || 
          e.description.toLowerCase().includes(q)
        );
      }
      
      return events;
    }
    
    const params = new URLSearchParams();
    if (filters?.city) params.append('city', filters.city);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.intensity) params.append('intensity', filters.intensity);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString();
    const raw = await this.request<any[]>(`/events${query ? `?${query}` : ''}`);
    return raw.map((e) => this.normalizeEvent(e));
  }

  async getEvent(id: string): Promise<Event> {
    if (USE_MOCK_EVENTS) {
      await delay(300);
      const event = MOCK_EVENTS.find((e) => e.id === id);
      if (!event) throw new Error('Event not found');
      return event as Event;
    }
    const raw = await this.request<any>(`/events/${id}`);
    return this.normalizeEvent(raw);
  }

  // Bookings (USE_MOCK_BOOKINGS)
  async createBooking(eventId: string): Promise<Booking> {
    if (USE_MOCK_BOOKINGS) {
      await delay(1000);
      const event = await this.getEvent(eventId);
      return {
        id: `booking-${Date.now()}`,
        eventId,
        event,
        userId: MOCK_USER.id,
        status: 'confirmed',
        bookedAt: new Date().toISOString(),
        paidAmount: 0,
      };
    }
    const participation = await this.request<any>(`/events/${eventId}/join`, {
      method: 'POST',
    });
    const event = await this.getEvent(eventId);
    return {
      id: String(participation.id),
      eventId,
      event,
      userId: String(participation.userId || this.userId || ''),
      status: 'confirmed',
      bookedAt: participation.bookedAt || new Date().toISOString(),
      paidAmount: 0,
    };
  }

  async cancelBooking(eventId: string, reason?: string, comment?: string): Promise<void> {
    if (USE_MOCK_BOOKINGS) {
      await delay(500);
      return;
    }
    await this.request(`/events/${eventId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason, comment }),
    });
  }

  async getMyBookings(): Promise<Booking[]> {
    if (USE_MOCK_BOOKINGS) {
      await delay(500);
      return [];
    }
    const participations = await this.request<any[]>('/me/participations');
    const results: Booking[] = [];
    for (const p of participations) {
      const event = p.event ? this.normalizeEvent(p.event) : await this.getEvent(p.eventId);
      const status =
        p.status === 'canceled'
          ? 'cancelled'
          : p.status === 'attended'
            ? 'attended'
            : p.status === 'no_show'
              ? 'no_show'
              : 'confirmed';
      results.push({
        id: String(p.id),
        eventId: String(p.eventId),
        event,
        userId: String(p.userId || this.userId || ''),
        status,
        viewerPhase: p.viewerPhase,
        eventStatus: p?.event?.status,
        bookedAt: p.bookedAt || p.joinedAt || new Date().toISOString(),
        paidAmount: event.price,
        cancelledAt: p.canceledAt,
      });
    }
    return results;
  }

  // Waiting List (USE_MOCK_WAITING)
  async joinWaitingList(eventId: string): Promise<{ position: number }> {
    if (USE_MOCK_WAITING) {
      await delay(500);
      return { position: 1 };
    }
    return this.request<{ position: number }>(`/events/${eventId}/waiting-list`, {
      method: 'POST',
    });
  }

  async leaveWaitingList(eventId: string): Promise<void> {
    if (USE_MOCK_WAITING) {
      await delay(300);
      return;
    }
    await this.request(`/events/${eventId}/waiting-list`, { method: 'DELETE' });
  }

  async getMyWaitingList(): Promise<{ eventId: string; position: number; joinedAt: string }[]> {
    if (USE_MOCK_WAITING) {
      await delay(400);
      return [];
    }
    return this.request('/me/waiting-list');
  }

  async confirmWaitingListSpot(eventId: string): Promise<Booking> {
    if (USE_MOCK_WAITING) {
      await delay(800);
      const event = await this.getEvent(eventId);
      return {
        id: `booking-${Date.now()}`,
        eventId,
        event,
        userId: MOCK_USER.id,
        status: 'confirmed',
        bookedAt: new Date().toISOString(),
        paidAmount: event.price,
      };
    }
    return this.request<Booking>(`/waiting-list/${eventId}/confirm`, {
      method: 'POST',
    });
  }

  async acceptWaitingOffer(offerId: string): Promise<{ status: string; eventId: string }> {
    if (USE_MOCK_WAITING) {
      await delay(500);
      return { status: 'accepted', eventId: 'mock-event' };
    }
    return this.request<{ status: string; eventId: string }>(`/events/waiting-list/${offerId}/accept`, {
      method: 'POST',
    });
  }

  async declineWaitingOffer(offerId: string): Promise<void> {
    if (USE_MOCK_WAITING) {
      await delay(300);
      return;
    }
    await this.request(`/events/waiting-list/${offerId}/decline`, { method: 'POST' });
  }

  // Reviews
  async createReview(eventId: string, rating: number, comment?: string): Promise<Review> {
    const hasRealAuthContext = Boolean(this.token) || (this.userId !== null && this.userId !== 'anonymous');
    if (!hasRealAuthContext) {
      await delay(500);
      return {
        id: `review-${Date.now()}`,
        eventId,
        userId: MOCK_USER.id,
        rating,
        comment,
        createdAt: new Date().toISOString(),
      };
    }
    return this.request<Review>(`/events/${eventId}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  }

  // Attendance - Self check-in (POST /events/:id/attended)
  async confirmAttendance(eventId: string): Promise<{
    status: string;
    eventId: string;
    message: string;
  }> {
    const hasRealAuthContext = Boolean(this.token) || (this.userId !== null && this.userId !== 'anonymous');
    if (!hasRealAuthContext) {
      await delay(500);
      return {
        status: 'attended',
        eventId,
        message: 'Mock attendance confirmed',
      };
    }
    return this.request(`/events/${eventId}/attended`, {
      method: 'POST',
      body: JSON.stringify({ attended: true }),
    });
  }

  // Legacy attendance method (deprecated)
  async markAttendance(bookingId: string, attended: boolean): Promise<void> {
    await delay(300);
  }

  // Challenges
  async getChallenges(): Promise<Challenge[]> {
    await delay(500);
    return [
      {
        id: 'ch1',
        title: '2 движения за 7 дней',
        description: 'Посетите любые 2 события за неделю',
        target: 2,
        progress: 1,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        reward: 200,
      },
    ];
  }

  async startChallenge(challengeId: string): Promise<Challenge> {
    await delay(500);
    return {
      id: challengeId,
      title: '2 движения за 7 дней',
      description: 'Посетите любые 2 события за неделю',
      target: 2,
      progress: 0,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      reward: 200,
    };
  }

  // Subscriptions
  async getSubscriptionStatus(): Promise<{
    hasSubscription: boolean;
    plan: string | null;
    status: string;
    endAt: string | null;
    canUseWaitingList: boolean;
    canUseChallenges: boolean;
    canCreatePaidEvents: boolean;
    canUseCRM: boolean;
    hasFullStats: boolean;
  }> {
    const hasRealAuthContext = Boolean(this.token) || (this.userId !== null && this.userId !== 'anonymous');
    if (!hasRealAuthContext) {
      // Мок для неавторизованных
      return {
        hasSubscription: false,
        plan: null,
        status: 'none',
        endAt: null,
        canUseWaitingList: false,
        canUseChallenges: false,
        canCreatePaidEvents: false,
        canUseCRM: false,
        hasFullStats: false,
      };
    }

    if (process.env.EXPO_PUBLIC_DISABLE_SUBSCRIPTIONS === 'true') {
      const isOrganizer = this.userRole === 'organizer' || this.userRole === 'admin';
      const endAt = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString();

      return {
        hasSubscription: true,
        plan: isOrganizer ? 'organizer_999' : 'user_349',
        status: 'active',
        endAt,
        canUseWaitingList: true,
        canUseChallenges: true,
        canCreatePaidEvents: isOrganizer,
        canUseCRM: isOrganizer,
        hasFullStats: true,
      };
    }
    return this.request('/subscriptions/status');
  }

  async subscribe(plan: 'user_349' | 'organizer_999', options?: { platform?: 'ios' | 'android'; receipt?: string; trial?: boolean }): Promise<{
    id: string;
    plan: string;
    status: string;
    startAt: string;
    endAt: string;
    autoRenew: boolean;
  }> {
    const hasRealAuthContext = Boolean(this.token) || (this.userId !== null && this.userId !== 'anonymous');
    if (!hasRealAuthContext) {
      await delay(1500);
      if (!options?.trial) {
        throw new Error('Trial is not automatic. User action required.');
      }
      const now = new Date();
      const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return {
        id: `sub-${Date.now()}`,
        plan,
        status: 'trial',
        startAt: now.toISOString(),
        endAt: endAt.toISOString(),
        autoRenew: false,
      };
    }
    return this.request('/subscriptions/start', {
      method: 'POST',
      body: JSON.stringify({ plan, platform: options?.platform, receipt: options?.receipt, trial: options?.trial }),
    });
  }

  async cancelSubscription(): Promise<{ status: string; endAt: string; message: string }> {
    const hasRealAuthContext = Boolean(this.token) || (this.userId !== null && this.userId !== 'anonymous');
    if (!hasRealAuthContext) {
      await delay(500);
      return { status: 'canceled', endAt: new Date().toISOString(), message: 'Mock canceled' };
    }
    return this.request('/subscriptions/cancel', { method: 'POST' });
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    await delay(300);
    return [];
  }

  async sendTestPush(): Promise<{ ok: boolean; response?: any }> {
    const hasRealAuthContext = Boolean(this.token) || (this.userId !== null && this.userId !== 'anonymous');
    if (!hasRealAuthContext) {
      await delay(300);
      return { ok: false };
    }
    return this.request('/me/push-test', {
      method: 'POST',
    });
  }

  async registerPushToken(token: string): Promise<void> {
    const hasRealAuthContext = Boolean(this.token) || (this.userId !== null && this.userId !== 'anonymous');
    if (!hasRealAuthContext) {
      await delay(300);
      return;
    }
    await this.request('/me/push-token', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });
  }

  // User
  async updateProfile(updates: Partial<{ 
    name: string; 
    city: string; 
    interests: string[]; 
    avatarUrl: string;
    about: string;
    gender: string;
    birthDate: string;
    onboardingCompleted: boolean;
  }>): Promise<any> {
    const hasRealAuthContext = Boolean(this.token) || (this.userId !== null && this.userId !== 'anonymous');
    if (USE_MOCK_AUTH && !hasRealAuthContext) {
      await delay(500);
      return { ...MOCK_USER, ...updates };
    }
    return this.request('/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async completeOnboarding(data: {
    city: string;
    interests: string[];
  }): Promise<User> {
    await delay(500);
    return {
      ...MOCK_USER,
      ...data,
      onboardingCompleted: true,
    } as User;
  }

  // Organizer API methods
  private organizerEventsCache: OrganizerEvent[] = [...MOCK_ORGANIZER_EVENTS] as OrganizerEvent[];
  private organizerParticipantsCache: Record<string, OrganizerParticipant[]> = { ...MOCK_ORGANIZER_PARTICIPANTS };

  async getOrganizerEvents(): Promise<OrganizerEvent[]> {
    if (USE_MOCK_ORGANIZER) {
      await delay(500);
      return this.organizerEventsCache;
    }
    return this.request<OrganizerEvent[]>('/organizer/events');
  }

  async getOrganizerEvent(id: string): Promise<OrganizerEvent> {
    if (USE_MOCK_ORGANIZER) {
      await delay(300);
      const event = this.organizerEventsCache.find((e) => e.id === id);
      if (!event) throw new Error('Event not found');
      return event;
    }
    return this.request<OrganizerEvent>(`/organizer/events/${id}`);
  }

  async createOrganizerEvent(payload: Partial<OrganizerEvent>): Promise<OrganizerEvent> {
    if (USE_MOCK_ORGANIZER) {
      await delay(800);
      const now = new Date().toISOString();
      const newEvent: OrganizerEvent = {
        id: `event-${Date.now()}`,
        organizerId: MOCK_USER.id,
        title: payload.title || '',
        description: payload.description || '',
        movementType: payload.movementType || 'yoga',
        level: payload.level || 'novice',
        startAt: payload.startAt || now,
        durationMin: payload.durationMin || 60,
        locationName: payload.locationName || '',
        locationAddress: payload.locationAddress,
        locationType: payload.locationType || 'public_place',
        capacity: payload.capacity,
        priceType: payload.priceType || 'free',
        priceValue: payload.priceValue,
        paymentInstructions: payload.paymentInstructions,
        visibility: payload.visibility || 'public',
        status: 'pending',
        participantsJoinedCount: 0,
        participantsAttendedCount: 0,
        participantsCanceledCount: 0,
        revenueTotal: 0,
        createdAt: now,
        updatedAt: now,
      };
      this.organizerEventsCache.push(newEvent);
      this.organizerParticipantsCache[newEvent.id] = [];
      return newEvent;
    }
    return this.request<OrganizerEvent>('/organizer/events', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateOrganizerEvent(id: string, payload: Partial<OrganizerEvent>): Promise<OrganizerEvent> {
    if (USE_MOCK_ORGANIZER) {
      await delay(500);
      const index = this.organizerEventsCache.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Event not found');
      
      const updatedEvent = {
        ...this.organizerEventsCache[index],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
      this.organizerEventsCache[index] = updatedEvent;
      return updatedEvent;
    }
    return this.request<OrganizerEvent>(`/organizer/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async cancelOrganizerEvent(id: string): Promise<OrganizerEvent> {
    if (USE_MOCK_ORGANIZER) {
      await delay(500);
      const index = this.organizerEventsCache.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Event not found');
      
      const updatedEvent = {
        ...this.organizerEventsCache[index],
        status: 'canceled' as const,
        updatedAt: new Date().toISOString(),
      };
      this.organizerEventsCache[index] = updatedEvent;
      return updatedEvent;
    }
    return this.request<OrganizerEvent>(`/organizer/events/${id}/cancel`, {
      method: 'POST',
    });
  }

  async finishOrganizerEvent(id: string): Promise<{
    status: string;
    eventId: string;
    stats: {
      joinedCount: number;
      attendedCount: number;
      noShowCount: number;
      canceledCount: number;
    };
    message: string;
  }> {
    if (USE_MOCK_ORGANIZER) {
      await delay(500);
      const index = this.organizerEventsCache.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Event not found');
      
      const updatedEvent = {
        ...this.organizerEventsCache[index],
        status: 'finished' as const,
        updatedAt: new Date().toISOString(),
      };
      this.organizerEventsCache[index] = updatedEvent;
      return {
        status: 'finished',
        eventId: id,
        stats: {
          joinedCount: updatedEvent.participantsJoinedCount || 0,
          attendedCount: 0,
          noShowCount: 0,
          canceledCount: 0,
        },
        message: 'Событие завершено',
      };
    }
    return this.request(`/organizer/events/${id}/finish`, {
      method: 'POST',
    });
  }

  async getOrganizerEventParticipants(eventId: string): Promise<OrganizerParticipant[]> {
    if (USE_MOCK_ORGANIZER) {
      await delay(400);
      return this.organizerParticipantsCache[eventId] || [];
    }
    return this.request<OrganizerParticipant[]>(`/organizer/events/${eventId}/participants`);
  }

  async getTrainerCrmDashboard(): Promise<TrainerCrmDashboardResponse> {
    return this.request<TrainerCrmDashboardResponse>('/trainer-crm/dashboard');
  }

  async getTrainerCrmClients(params?: {
    q?: string;
    status?: string;
    source?: string;
    tag?: string;
    archived?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<TrainerCrmClientsResponse> {
    const search = new URLSearchParams();
    if (params?.q) search.append('q', params.q);
    if (params?.status) search.append('status', params.status);
    if (params?.source) search.append('source', params.source);
    if (params?.tag) search.append('tag', params.tag);
    if (typeof params?.archived === 'boolean') search.append('archived', String(params.archived));
    if (params?.limit) search.append('limit', String(params.limit));
    if (params?.cursor) search.append('cursor', params.cursor);
    const query = search.toString();
    return this.request<TrainerCrmClientsResponse>(`/trainer-crm/clients${query ? `?${query}` : ''}`);
  }

  async createTrainerCrmClient(payload: {
    fullName: string;
    phone?: string;
    telegramHandle?: string;
    email?: string;
    city?: string;
    status?: string;
    source?: string;
    goals?: string;
    medicalNotes?: string;
    privateNotes?: string;
    tags?: string[];
  }): Promise<TrainerCrmClient> {
    return this.request<TrainerCrmClient>('/trainer-crm/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTrainerCrmClient(id: string): Promise<TrainerCrmClient> {
    return this.request<TrainerCrmClient>(`/trainer-crm/clients/${id}`);
  }

  async updateTrainerCrmClient(id: string, payload: Partial<TrainerCrmClient>): Promise<TrainerCrmClient> {
    return this.request<TrainerCrmClient>(`/trainer-crm/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async archiveTrainerCrmClient(id: string): Promise<TrainerCrmClient> {
    return this.request<TrainerCrmClient>(`/trainer-crm/clients/${id}/archive`, {
      method: 'POST',
    });
  }

  async getTrainerCrmClientHistory(id: string): Promise<TrainerCrmClientHistory> {
    return this.request<TrainerCrmClientHistory>(`/trainer-crm/clients/${id}/history`);
  }

  async getTrainerCrmClientNotes(id: string): Promise<TrainerCrmNote[]> {
    return this.request<TrainerCrmNote[]>(`/trainer-crm/clients/${id}/notes`);
  }

  async createTrainerCrmClientNote(clientId: string, payload: {
    content: string;
    title?: string;
    type?: string;
    sessionId?: string;
  }): Promise<TrainerCrmNote> {
    return this.request<TrainerCrmNote>(`/trainer-crm/clients/${clientId}/notes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTrainerCrmSessions(params?: {
    from?: string;
    to?: string;
    type?: string;
    status?: string;
    visibility?: string;
    clientId?: string;
  }): Promise<TrainerCrmSession[]> {
    const search = new URLSearchParams();
    if (params?.from) search.append('from', params.from);
    if (params?.to) search.append('to', params.to);
    if (params?.type) search.append('type', params.type);
    if (params?.status) search.append('status', params.status);
    if (params?.visibility) search.append('visibility', params.visibility);
    if (params?.clientId) search.append('clientId', params.clientId);
    const query = search.toString();
    return this.request<TrainerCrmSession[]>(`/trainer-crm/sessions${query ? `?${query}` : ''}`);
  }

  async createTrainerCrmSession(payload: {
    type: string;
    visibility?: string;
    title: string;
    description?: string;
    discipline?: string;
    format?: string;
    locationName?: string;
    locationAddress?: string;
    onlineUrl?: string;
    startAt: string;
    endAt?: string;
    durationMin?: number;
    capacity?: number;
    waitlistEnabled?: boolean;
    priceMinor?: number;
    currency?: string;
    paymentNote?: string;
    status?: string;
  }): Promise<TrainerCrmSession> {
    return this.request<TrainerCrmSession>('/trainer-crm/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTrainerCrmSession(id: string): Promise<TrainerCrmSession> {
    return this.request<TrainerCrmSession>(`/trainer-crm/sessions/${id}`);
  }

  async updateTrainerCrmSession(id: string, payload: Partial<TrainerCrmSession>): Promise<TrainerCrmSession> {
    return this.request<TrainerCrmSession>(`/trainer-crm/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async publishTrainerCrmSession(id: string): Promise<TrainerCrmSession> {
    return this.request<TrainerCrmSession>(`/trainer-crm/sessions/${id}/publish`, {
      method: 'POST',
    });
  }

  async cancelTrainerCrmSession(id: string, reason?: string): Promise<TrainerCrmSession> {
    return this.request<TrainerCrmSession>(`/trainer-crm/sessions/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async rescheduleTrainerCrmSession(id: string, payload: {
    startAt: string;
    endAt?: string;
    durationMin?: number;
  }): Promise<TrainerCrmSession> {
    return this.request<TrainerCrmSession>(`/trainer-crm/sessions/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async duplicateTrainerCrmSession(id: string, payload?: {
    shiftDays?: number;
  }): Promise<TrainerCrmSession> {
    return this.request<TrainerCrmSession>(`/trainer-crm/sessions/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  }

  async getTrainerCrmSessionParticipants(id: string): Promise<TrainerCrmSessionParticipant[]> {
    return this.request<TrainerCrmSessionParticipant[]>(`/trainer-crm/sessions/${id}/participants`);
  }

  async createTrainerCrmSessionParticipant(sessionId: string, payload: {
    clientId?: string;
    userId?: string;
    fullName?: string;
    phone?: string;
    telegramHandle?: string;
    email?: string;
    status?: string;
    paymentStatus?: string;
    priceMinor?: number;
    amountPaidMinor?: number;
    note?: string;
  }): Promise<TrainerCrmSessionParticipant> {
    return this.request<TrainerCrmSessionParticipant>(`/trainer-crm/sessions/${sessionId}/participants`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTrainerCrmParticipant(id: string, payload: {
    status?: string;
    paymentStatus?: string;
    amountPaidMinor?: number;
    priceMinor?: number;
    note?: string | null;
    cancellationReason?: string;
  }): Promise<TrainerCrmSessionParticipant> {
    return this.request<TrainerCrmSessionParticipant>(`/trainer-crm/participants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getTrainerCrmPackages(): Promise<TrainerCrmPackage[]> {
    return this.request<TrainerCrmPackage[]>('/trainer-crm/packages');
  }

  async createTrainerCrmPackage(payload: {
    clientId?: string;
    userId?: string;
    fullName?: string;
    phone?: string;
    telegramHandle?: string;
    email?: string;
    title: string;
    kind: string;
    discipline?: string;
    sessionsIncluded?: number;
    sessionsRemaining?: number;
    startsAt?: string;
    endsAt?: string;
    freezeDaysRemaining?: number;
    priceMinor?: number;
    currency?: string;
    paymentStatus?: string;
    status?: string;
    notes?: string;
  }): Promise<TrainerCrmPackage> {
    return this.request<TrainerCrmPackage>('/trainer-crm/packages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async pauseTrainerCrmPackage(id: string): Promise<TrainerCrmPackage> {
    return this.request<TrainerCrmPackage>(`/trainer-crm/packages/${id}/pause`, {
      method: 'POST',
    });
  }

  async resumeTrainerCrmPackage(id: string): Promise<TrainerCrmPackage> {
    return this.request<TrainerCrmPackage>(`/trainer-crm/packages/${id}/resume`, {
      method: 'POST',
    });
  }

  async expireTrainerCrmPackage(id: string): Promise<TrainerCrmPackage> {
    return this.request<TrainerCrmPackage>(`/trainer-crm/packages/${id}/expire`, {
      method: 'POST',
    });
  }

  async consumeTrainerCrmPackage(id: string, payload: {
    sessionId: string;
    participantId: string;
    usedUnits?: number;
  }): Promise<{ ok: boolean; usageId: string; usedUnits: number }> {
    return this.request<{ ok: boolean; usageId: string; usedUnits: number }>(`/trainer-crm/packages/${id}/consume`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTrainerCrmTasks(): Promise<TrainerCrmTask[]> {
    return this.request<TrainerCrmTask[]>('/trainer-crm/tasks');
  }

  async createTrainerCrmTask(payload: {
    title: string;
    description?: string;
    dueAt?: string;
    status?: string;
    priority?: string;
    clientId?: string;
    sessionId?: string;
  }): Promise<TrainerCrmTask> {
    return this.request<TrainerCrmTask>('/trainer-crm/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTrainerCrmTask(id: string, payload: {
    title?: string;
    description?: string | null;
    dueAt?: string | null;
    status?: string;
    priority?: string;
  }): Promise<TrainerCrmTask> {
    return this.request<TrainerCrmTask>(`/trainer-crm/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async completeTrainerCrmTask(id: string): Promise<TrainerCrmTask> {
    return this.request<TrainerCrmTask>(`/trainer-crm/tasks/${id}/complete`, {
      method: 'POST',
    });
  }

  async getTrainerCrmAnalyticsOverview(range: '7d' | '30d' | '90d' = '30d'): Promise<TrainerCrmAnalyticsOverview> {
    return this.request<TrainerCrmAnalyticsOverview>(`/trainer-crm/analytics/overview?range=${range}`);
  }

  // User Profile API
  async getUserProfile(userId: string): Promise<UserProfile> {
    const hasRealAuthContext = Boolean(this.token) || (this.userId !== null && this.userId !== 'anonymous');
    if (!hasRealAuthContext) {
      await delay(500);
      return {
        id: userId,
        name: 'Участник',
        avatarUrl: undefined,
        city: undefined,
        activityLevel: 'sometimes',
        interests: ['yoga', 'running'],
        memberSince: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        isOwnProfile: false,
        stats: {
          totalEvents: 5,
          attendedCount: 4,
          joinedCount: 1,
          attendanceRate: 80,
          streak: 2,
        },
        favoriteCategories: ['yoga', 'running'],
        recentActivity: [],
        reviews: [],
      };
    }
    return this.request<UserProfile>(`/users/${userId}/profile`);
  }

  // Admin API methods
  private adminComplaintsCache: AdminComplaint[] = [...MOCK_ADMIN_COMPLAINTS] as AdminComplaint[];

  async getAdminPendingEvents(): Promise<OrganizerEvent[]> {
    if (USE_MOCK_ADMIN) {
      await delay(500);
      return this.organizerEventsCache.filter((e) => e.status === 'pending');
    }
    return this.request<OrganizerEvent[]>('/admin/events?status=pending');
  }

  async approveAdminEvent(id: string): Promise<OrganizerEvent> {
    if (USE_MOCK_ADMIN) {
      await delay(500);
      const index = this.organizerEventsCache.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Event not found');
      if (this.organizerEventsCache[index].status !== 'pending') {
        throw new Error('Event is not pending');
      }
      
      const updatedEvent = {
        ...this.organizerEventsCache[index],
        status: 'approved' as const,
        updatedAt: new Date().toISOString(),
      };
      this.organizerEventsCache[index] = updatedEvent;
      return updatedEvent;
    }
    return this.request<OrganizerEvent>(`/admin/events/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectAdminEvent(id: string): Promise<OrganizerEvent> {
    if (USE_MOCK_ADMIN) {
      await delay(500);
      const index = this.organizerEventsCache.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Event not found');
      if (this.organizerEventsCache[index].status !== 'pending') {
        throw new Error('Event is not pending');
      }
      
      const updatedEvent = {
        ...this.organizerEventsCache[index],
        status: 'rejected' as const,
        updatedAt: new Date().toISOString(),
      };
      this.organizerEventsCache[index] = updatedEvent;
      return updatedEvent;
    }
    return this.request<OrganizerEvent>(`/admin/events/${id}/reject`, {
      method: 'POST',
    });
  }

  async getAdminEventEditRequests(params?: { status?: string }): Promise<{ items: AdminEventEditRequestListItem[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ items: AdminEventEditRequestListItem[] }>(`/admin/event-edit-requests${suffix}`);
  }

  async getAdminEventEditRequestById(id: string): Promise<AdminEventEditRequestDetail> {
    return this.request<AdminEventEditRequestDetail>(`/admin/event-edit-requests/${id}`);
  }

  async approveAdminEventEditRequest(id: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(`/admin/event-edit-requests/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectAdminEventEditRequest(id: string): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(`/admin/event-edit-requests/${id}/reject`, {
      method: 'POST',
    });
  }

  async getAdminComplaints(): Promise<AdminComplaint[]> {
    if (USE_MOCK_ADMIN) {
      await delay(400);
      return this.adminComplaintsCache;
    }
    return this.request<AdminComplaint[]>('/admin/complaints');
  }

  async closeAdminComplaint(id: string): Promise<AdminComplaint> {
    if (USE_MOCK_ADMIN) {
      await delay(500);
      const index = this.adminComplaintsCache.findIndex((c) => c.id === id);
      if (index === -1) throw new Error('Complaint not found');
      if (this.adminComplaintsCache[index].status === 'closed') {
        throw new Error('Complaint is already closed');
      }
      
      const updatedComplaint = {
        ...this.adminComplaintsCache[index],
        status: 'closed' as const,
        closedAt: new Date().toISOString(),
      };
      this.adminComplaintsCache[index] = updatedComplaint;
      return updatedComplaint;
    }
    return this.request<AdminComplaint>(`/admin/complaints/${id}/close`, {
      method: 'POST',
    });
  }

  async resolveAdminComplaint(
    id: string,
    payload: {
      action: 'dismiss' | 'freeze' | 'ban' | 'unpublish_event' | 'reject_event' | 'delete_event';
      note?: string;
      freezeUntil?: string;
    }
  ): Promise<AdminComplaint> {
    return this.request<AdminComplaint>(`/admin/complaints/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAdminBanAppeals(params?: { status?: BanAppealStatus }): Promise<{ items: AdminBanAppeal[] }> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ items: AdminBanAppeal[] }>(`/admin/ban-appeals${suffix}`);
  }

  async resolveAdminBanAppeal(id: string, payload: { status: 'approved' | 'rejected'; adminResponse: string }): Promise<{
    id: string;
    userId: string;
    status: string;
    adminResponse?: string | null;
    resolvedAt?: string | null;
  }> {
    return this.request(`/admin/ban-appeals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async getAdminUsers(params?: { q?: string; role?: string }): Promise<AdminUser[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.role) query.set('role', params.role);

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<AdminUser[]>(`/admin/users${suffix}`);
  }

  async setAdminUserRole(userId: string, role: 'user' | 'organizer' | 'admin' | 'superadmin'): Promise<{
    id: string;
    role: string;
    createdAt: string;
    lastActiveAt: string;
  }> {
    return this.request(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
    return this.request<AdminUserDetail>(`/admin/users/${userId}`);
  }

  async getAdminUserComplaints(userId: string): Promise<AdminUserComplaints> {
    return this.request<AdminUserComplaints>(`/admin/users/${userId}/complaints`);
  }

  async banAdminUser(userId: string, reason?: string): Promise<{ id: string; status: string; bannedAt?: string }> {
    return this.request(`/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async unbanAdminUser(userId: string): Promise<{ id: string; status: string }> {
    return this.request(`/admin/users/${userId}/unban`, {
      method: 'POST',
    });
  }

  async freezeAdminUser(userId: string, reason: string, until?: string): Promise<{ id: string; status: string; frozenUntil?: string }> {
    return this.request(`/admin/users/${userId}/freeze`, {
      method: 'POST',
      body: JSON.stringify({ reason, until }),
    });
  }

  async unfreezeAdminUser(userId: string): Promise<{ id: string; status: string }> {
    return this.request(`/admin/users/${userId}/unfreeze`, {
      method: 'POST',
    });
  }

  async resetAdminUserProgress(userId: string): Promise<{ status: string; userId: string }> {
    return this.request(`/admin/users/${userId}/reset-progress`, {
      method: 'POST',
    });
  }

  async resetAdminUserSubscriptions(userId: string): Promise<{ status: string; userId: string }> {
    return this.request(`/admin/users/${userId}/reset-subscriptions`, {
      method: 'POST',
    });
  }

  async grantAdminUserSubscription(
    userId: string,
    plan: 'user_349' | 'organizer_999',
    days?: number
  ): Promise<{ id: string; userId: string; plan: string; status: string; startAt: string; endAt: string }> {
    return this.request(`/admin/users/${userId}/grant-subscription`, {
      method: 'POST',
      body: JSON.stringify({ plan, days }),
    });
  }

  async blockAdminOrganizer(userId: string): Promise<{ userId: string; status: string }> {
    return this.request(`/admin/organizers/${userId}/block`, {
      method: 'POST',
    });
  }

  async unblockAdminOrganizer(userId: string): Promise<{ userId: string; status: string }> {
    return this.request(`/admin/organizers/${userId}/unblock`, {
      method: 'POST',
    });
  }

  async deleteAdminUser(userId: string): Promise<{ status: string; userId: string }> {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getAdminAuditLogs(params?: {
    action?: string;
    targetType?: string;
    targetId?: string;
    adminId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AdminAuditLog[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.targetType) query.set('targetType', params.targetType);
    if (params?.targetId) query.set('targetId', params.targetId);
    if (params?.adminId) query.set('adminId', params.adminId);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ logs: AdminAuditLog[]; total: number }>(`/admin/audit-logs${suffix}`);
  }

  async getAdminStatsOverview(): Promise<AdminStatsOverview> {
    return this.request<AdminStatsOverview>('/admin/stats/overview');
  }

  async getAdminAnalyticsOverview(params?: { range?: AdminAnalyticsRange }): Promise<AdminAnalyticsOverview> {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<AdminAnalyticsOverview>(`/admin/analytics/overview${suffix}`);
  }

  async getAdminAnalyticsTimeseries(params: { range?: AdminAnalyticsRange; metric: AdminAnalyticsTimeseriesMetric }): Promise<AdminAnalyticsTimeseriesResponse> {
    const query = new URLSearchParams();
    if (params.range) query.set('range', params.range);
    query.set('metric', params.metric);
    return this.request<AdminAnalyticsTimeseriesResponse>(`/admin/analytics/timeseries?${query.toString()}`);
  }

  async getAdminAnalyticsCategories(params?: { range?: AdminAnalyticsRange }): Promise<AdminAnalyticsCategoriesResponse> {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<AdminAnalyticsCategoriesResponse>(`/admin/analytics/categories${suffix}`);
  }

  async getAdminAnalyticsTopEvents(params?: { range?: AdminAnalyticsRange }): Promise<AdminAnalyticsTopEventsResponse> {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request<AdminAnalyticsTopEventsResponse>(`/admin/analytics/top-events${suffix}`);
  }

  async searchAdminEvents(params: { q: string }): Promise<{ items: Array<{ id: string; title: string; movementType: string | null; status: string; startAt: string; organizerId: string; organizerName: string | null }> }> {
    const query = new URLSearchParams();
    query.set('q', params.q);
    return this.request(`/admin/search/events?${query.toString()}`);
  }

  // Organizer Profile (owner)
  async getOrganizerProfile(): Promise<any> {
    return this.request('/organizer/profile');
  }

  async updateOrganizerProfile(data: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    tags?: string[];
    city?: string;
    contactPhone?: string;
    contactTelegram?: string;
    contactEmail?: string;
    paymentInfo?: string;
  }): Promise<any> {
    return this.request('/organizer/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getOrganizerCertificates(): Promise<any[]> {
    return this.request('/organizer/certificates');
  }

  async addOrganizerCertificate(data: {
    title: string;
    issuer?: string;
    issuedAt?: string;
    assetUrl?: string;
  }): Promise<any> {
    return this.request('/organizer/certificates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteOrganizerCertificate(id: string): Promise<void> {
    await this.request(`/organizer/certificates/${id}`, {
      method: 'DELETE',
    });
  }

  async getOrganizerStats(): Promise<any> {
    return this.request('/organizer/stats');
  }

  // Trainer Public Profile
  async getTrainerProfile(publicId: string): Promise<any> {
    return this.request(`/trainers/${publicId}`);
  }

  async getTrainerEvents(publicId: string, status: 'upcoming' | 'past'): Promise<any[]> {
    return this.request(`/trainers/${publicId}/events?status=${status}`);
  }

  async getTrainerReviews(publicId: string, sort: string = 'newest'): Promise<{ items: any[]; nextCursor: string | null }> {
    return this.request(`/trainers/${publicId}/reviews?sort=${sort}`);
  }

  // ============================================
  // Private Events
  // ============================================

  async resolvePrivateEventByCode(code: string): Promise<{
    eventId: string;
    title: string;
    organizer: string;
    startAt: string;
    status: string;
    message: string;
  }> {
    return this.request('/events/private/resolve', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async resolvePrivateEventByToken(token: string): Promise<{
    eventId: string;
    title: string;
    organizer: string;
    startAt: string;
    status: string;
    message: string;
  }> {
    return this.request(`/events/invite/${token}`);
  }
}

export const api = new ApiService();
