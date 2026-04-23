import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { User, Event, Booking, Challenge, Notification, WaitingOffer, OrganizerEvent, OrganizerParticipant, AdminComplaint, AdminUser, AdminBanAppeal, BanAppealStatus, AdminEventEditRequestListItem, AdminEventEditRequestDetail } from '../types';
import { MOCK_USER, MOCK_EVENTS, MOCK_ORGANIZER_EVENTS, MOCK_ORGANIZER_PARTICIPANTS, MOCK_ADMIN_COMPLAINTS } from '../constants';
import { api, ApiError } from '../services/api';
import { ThemeVariant } from '../constants/themes';

const prefetchImageUrls = async (urls: Array<string | undefined | null>) => {
  const unique = Array.from(
    new Set(
      urls
        .map((u) => (typeof u === 'string' ? u.trim() : ''))
        .filter((u) => u.startsWith('http://') || u.startsWith('https://'))
    )
  );

  const batch = unique.slice(0, 30);
  await Promise.allSettled(batch.map((u) => Image.prefetch(u)));
};

export type Gender = 'male' | 'female' | 'other';

interface AppStore {
  // Auth state
  isFirstLaunch: boolean;
  onboardingCompleted: boolean;
  isAuthenticated: boolean;
  isTestSession: boolean;
  user: User | null;
  gender: Gender | null;
  birthDate: string | null;
  
  // Theme state
  themeVariant: ThemeVariant;
  
  // Events state
  events: Event[];
  selectedEvent: Event | null;
  eventsLoading: boolean;
  eventsError: string | null;
  
  // Bookings state
  bookings: Booking[];
  bookingsLoading: boolean;
  bookingsError: string | null;
  
  // Challenges state
  challenges: Challenge[];
  activeChallenge: Challenge | null;
  
  // Notifications state
  notifications: Notification[];
  unreadCount: number;
  
  // Waiting offers state
  waitingOffers: WaitingOffer[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Organizer state
  organizerEvents: OrganizerEvent[];
  organizerParticipantsByEventId: Record<string, OrganizerParticipant[]>;
  organizerLoading: boolean;
  organizerError: string | null;
  
  // Admin state
  adminComplaints: AdminComplaint[];
  adminBanAppeals: AdminBanAppeal[];
  adminUsers: AdminUser[];
  adminEventEditRequests: AdminEventEditRequestListItem[];
  adminEventEditRequestDetails: Record<string, AdminEventEditRequestDetail>;
  adminLoading: boolean;
  adminError: string | null;

  // Map pick (temp, non-persisted)
  pickedLocation: { latitude: number; longitude: number; address?: string } | null;
  
  // Actions - Auth
  setFirstLaunch: (value: boolean) => void;
  completeOnboarding: () => void;
  login: (user: User) => void;
  startTestSession: (payload: { role: 'user' | 'organizer' | 'admin' | 'superadmin'; name: string }) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setGender: (gender: Gender) => void;
  setBirthDate: (birthDate: string) => void;
  resetRegistration: () => void;

  // Actions - Map pick
  setPickedLocation: (loc: { latitude: number; longitude: number; address?: string } | null) => void;
  
  // Actions - Theme
  setThemeVariant: (variant: ThemeVariant) => void;
  
  // Actions - Events
  setEvents: (events: Event[]) => void;
  selectEvent: (event: Event | null) => void;
  updateEvent: (eventId: string, updates: Partial<Event>) => void;
  fetchEvents: (filters?: { category?: string; intensity?: string; search?: string }) => Promise<void>;
  fetchEventById: (id: string) => Promise<Event | null>;
  setEventsLoading: (value: boolean) => void;
  setEventsError: (error: string | null) => void;
  
  // Actions - Bookings
  addBooking: (booking: Booking) => void;
  cancelBooking: (bookingId: string, reason?: string, comment?: string) => void;
  updateBookingStatus: (bookingId: string, status: Booking['status']) => void;
  getActiveBookingForEvent: (eventId: string) => Booking | undefined;
  fetchMyBookings: () => Promise<void>;
  createBooking: (eventId: string) => Promise<Booking | null>;
  cancelBookingAsync: (bookingId: string, reason?: string, comment?: string) => Promise<void>;
  setBookingsLoading: (value: boolean) => void;
  setBookingsError: (error: string | null) => void;
  
  // Actions - Waiting List
  joinWaitingList: (eventId: string) => void;
  leaveWaitingList: (eventId: string) => void;
  joinWaitingListAsync: (eventId: string) => Promise<{ position: number } | null>;
  leaveWaitingListAsync: (eventId: string) => Promise<void>;
  fetchMyWaitingList: () => Promise<void>;
  
  // Actions - Waiting Offers
  simulateWaitingOffer: (eventId: string) => WaitingOffer | null;
  acceptWaitingOffer: (offerId: string) => Booking | null;
  declineWaitingOffer: (offerId: string) => void;
  acceptWaitingOfferAsync: (offerId: string) => Promise<{ status: string; eventId: string } | null>;
  declineWaitingOfferAsync: (offerId: string) => Promise<void>;
  getActiveOfferForEvent: (eventId: string) => WaitingOffer | undefined;
  getPendingOffers: () => WaitingOffer[];
  
  // Actions - Challenges
  startChallenge: (challenge: Challenge) => void;
  updateChallengeProgress: (challengeId: string, progress: number) => void;
  
  // Actions - Notifications
  addNotification: (notification: Notification) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  
  // Actions - UI
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  
  // Actions - Organizer
  setOrganizerEvents: (events: OrganizerEvent[]) => void;
  getOrganizerEventById: (id: string) => OrganizerEvent | undefined;
  createOrganizerEvent: (input: Partial<OrganizerEvent>) => OrganizerEvent;
  updateOrganizerEvent: (eventId: string, updates: Partial<OrganizerEvent>) => OrganizerEvent | undefined;
  submitOrganizerEvent: (eventId: string) => OrganizerEvent | undefined;
  cancelOrganizerEvent: (eventId: string) => OrganizerEvent | undefined;
  getOrganizerParticipants: (eventId: string) => OrganizerParticipant[];
  setOrganizerLoading: (value: boolean) => void;
  setOrganizerError: (error: string | null) => void;
  // Async actions
  fetchOrganizerEvents: () => Promise<void>;
  fetchOrganizerEventById: (id: string) => Promise<OrganizerEvent | null>;
  createOrganizerEventAsync: (input: Partial<OrganizerEvent>) => Promise<OrganizerEvent | null>;
  updateOrganizerEventAsync: (eventId: string, updates: Partial<OrganizerEvent>) => Promise<OrganizerEvent | null>;
  cancelOrganizerEventAsync: (eventId: string) => Promise<OrganizerEvent | null>;
  finishOrganizerEventAsync: (eventId: string) => Promise<{ status: string; stats: any } | null>;
  fetchOrganizerParticipants: (eventId: string) => Promise<OrganizerParticipant[]>;
  
  // Actions - Admin
  setAdminComplaints: (complaints: AdminComplaint[]) => void;
  setAdminUsers: (users: AdminUser[]) => void;
  getAdminPendingEvents: () => OrganizerEvent[];
  approveEvent: (eventId: string) => OrganizerEvent | undefined;
  rejectEvent: (eventId: string) => OrganizerEvent | undefined;
  getAdminComplaints: () => AdminComplaint[];
  getAdminOpenComplaints: () => AdminComplaint[];
  getAdminBanAppeals: () => AdminBanAppeal[];
  getAdminPendingBanAppeals: () => AdminBanAppeal[];
  getAdminUsers: () => AdminUser[];
  getAdminPendingEventEditRequests: () => AdminEventEditRequestListItem[];
  getAdminEventEditRequestById: (id: string) => AdminEventEditRequestDetail | null;
  closeComplaint: (complaintId: string) => AdminComplaint | undefined;
  setAdminLoading: (value: boolean) => void;
  setAdminError: (error: string | null) => void;
  // Async actions
  fetchAdminPendingEvents: () => Promise<void>;
  approveEventAsync: (eventId: string) => Promise<OrganizerEvent | null>;
  rejectEventAsync: (eventId: string) => Promise<OrganizerEvent | null>;
  fetchAdminComplaints: () => Promise<void>;
  fetchAdminBanAppeals: (params?: { status?: BanAppealStatus }) => Promise<void>;
  closeComplaintAsync: (complaintId: string) => Promise<AdminComplaint | null>;
  banAdminUserAsync: (userId: string, reason?: string) => Promise<boolean>;
  freezeAdminUserAsync: (userId: string, reason: string, until?: string) => Promise<boolean>;
  resolveComplaintAsync: (
    complaintId: string,
    payload: {
      action: 'dismiss' | 'freeze' | 'ban' | 'unpublish_event' | 'reject_event' | 'delete_event';
      note?: string;
      freezeUntil?: string;
    }
  ) => Promise<AdminComplaint | null>;
  resolveBanAppealAsync: (appealId: string, status: 'approved' | 'rejected', adminResponse: string) => Promise<AdminBanAppeal | null>;
  fetchAdminUsers: (params?: { q?: string; role?: string }) => Promise<void>;
  setAdminUserRoleAsync: (userId: string, role: 'user' | 'organizer' | 'admin' | 'superadmin') => Promise<boolean>;
  fetchAdminEventEditRequests: () => Promise<void>;
  fetchAdminEventEditRequestById: (id: string) => Promise<AdminEventEditRequestDetail | null>;
  approveAdminEventEditRequestAsync: (id: string) => Promise<boolean>;
  rejectAdminEventEditRequestAsync: (id: string) => Promise<boolean>;
  
  // Actions - Points & Experience
  addPoints: (points: number) => void;
  addExperience: (exp: number) => void;

  // Actions - Gamification sync
  refreshGamification: () => Promise<void>;

  // Actions - Subscription sync
  refreshSubscriptionStatus: () => Promise<void>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isFirstLaunch: true,
      onboardingCompleted: false,
      isAuthenticated: false,
      isTestSession: false,
      user: null,
      gender: null,
      birthDate: null,
      themeVariant: 'feminine' as ThemeVariant,
      events: [],  // Данные из backend
      selectedEvent: null,
      eventsLoading: false,
      eventsError: null,
      bookings: [],
      bookingsLoading: false,
      bookingsError: null,
      challenges: [],
      activeChallenge: null,
      notifications: [],
      unreadCount: 0,
      waitingOffers: [],
      isLoading: false,
      error: null,
      
      // Organizer initial state
      organizerEvents: [],  // Данные из backend
      organizerParticipantsByEventId: {},
      organizerLoading: false,
      organizerError: null,
      
      // Admin initial state
      adminComplaints: [],  // Данные из backend
      adminBanAppeals: [],
      adminUsers: [],
      adminEventEditRequests: [],  // Данные из backend
      adminEventEditRequestDetails: {},
      adminLoading: false,
      adminError: null,

      pickedLocation: null,
      
      // Auth actions
      setFirstLaunch: (value) => set({ isFirstLaunch: value }),
      
      completeOnboarding: () => {
        const existingUser = get().user;
        if (existingUser) {
          api.setAuthContext(existingUser.id, (existingUser.role as 'user' | 'organizer' | 'admin' | 'superadmin') || 'user');
        }
        set({
          onboardingCompleted: true,
          isFirstLaunch: false,
          isAuthenticated: Boolean(existingUser),
          user: existingUser ? { ...existingUser, onboardingCompleted: true } : null,
        });
      },

      fetchAdminEventEditRequests: async () => {
        set({ adminLoading: true, adminError: null });
        try {
          const res = await api.getAdminEventEditRequests({ status: 'pending' });
          set({ adminEventEditRequests: res.items || [], adminLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch event edit requests';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] fetchAdminEventEditRequests error:', message);
        }
      },

      fetchAdminEventEditRequestById: async (id) => {
        set({ adminLoading: true, adminError: null });
        try {
          const detail = await api.getAdminEventEditRequestById(id);
          set((state) => ({
            adminEventEditRequestDetails: {
              ...state.adminEventEditRequestDetails,
              [id]: detail,
            },
            adminLoading: false,
          }));
          return detail;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch edit request';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] fetchAdminEventEditRequestById error:', message);
          return null;
        }
      },

      approveAdminEventEditRequestAsync: async (id) => {
        set({ adminLoading: true, adminError: null });
        try {
          const res = await api.approveAdminEventEditRequest(id);
          if (res?.ok) {
            set((state) => ({
              adminEventEditRequests: state.adminEventEditRequests.filter((r) => r.id !== id),
              adminEventEditRequestDetails: {
                ...state.adminEventEditRequestDetails,
                [id]: state.adminEventEditRequestDetails[id]
                  ? { ...state.adminEventEditRequestDetails[id], status: 'approved' as any }
                  : state.adminEventEditRequestDetails[id],
              },
              adminLoading: false,
            }));
            return true;
          }
          set({ adminLoading: false });
          return false;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to approve edit request';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] approveAdminEventEditRequestAsync error:', message);
          return false;
        }
      },

      rejectAdminEventEditRequestAsync: async (id) => {
        set({ adminLoading: true, adminError: null });
        try {
          const res = await api.rejectAdminEventEditRequest(id);
          if (res?.ok) {
            set((state) => ({
              adminEventEditRequests: state.adminEventEditRequests.filter((r) => r.id !== id),
              adminEventEditRequestDetails: {
                ...state.adminEventEditRequestDetails,
                [id]: state.adminEventEditRequestDetails[id]
                  ? { ...state.adminEventEditRequestDetails[id], status: 'rejected' as any }
                  : state.adminEventEditRequestDetails[id],
              },
              adminLoading: false,
            }));
            return true;
          }
          set({ adminLoading: false });
          return false;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to reject edit request';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] rejectAdminEventEditRequestAsync error:', message);
          return false;
        }
      },

      login: (user) => {
        // Устанавливаем auth context для backend запросов
        api.setAuthContext(user.id, (user.role as 'user' | 'organizer' | 'admin' | 'superadmin') || 'user');
        // Always prefer real JWT auth over test headers.
        api.setTestAuthKey(null);
        set({ 
          isAuthenticated: true, 
          isTestSession: false,
          user,
        });
      },

      startTestSession: ({ role, name }) => {
        const safeName = String(name || '').trim() || 'User';
        const testUser: User = {
          ...MOCK_USER,
          id: `test_${role}`,
          email: `${role}@mewego.local`,
          role,
          name: safeName,
          onboardingCompleted: true,
        } as any;

        // For test sessions we intentionally do not rely on backend auth.
        // Important: clear any real JWT token so backend doesn't ignore header-based test role.
        api.setToken(null);
        api.setAuthContext(testUser.id, role);
        api.setTestAuthKey(process.env.EXPO_PUBLIC_TEST_AUTH_KEY || null);
        set({
          isAuthenticated: true,
          isTestSession: true,
          user: testUser,
        });
      },
      
      logout: () => {
        // Очищаем auth context
        api.setToken(null);
        api.setAuthContext('anonymous', 'user');
        api.setTestAuthKey(null);
        set({ 
          isAuthenticated: false, 
          isTestSession: false,
          user: null,
          bookings: [],
          // Сбрасываем данные регистрации, чтобы новый пользователь прошёл онбординг заново
          gender: null,
          birthDate: null,
          organizerEvents: [],
          organizerParticipantsByEventId: {},
        });
      },
      
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
      
      setGender: (gender) => set({
        gender,
      }),

      setBirthDate: (birthDate) => set({ birthDate }),

      resetRegistration: () => set({
        gender: null,
        birthDate: null,
        themeVariant: 'feminine' as ThemeVariant,
      }),

      setPickedLocation: (loc) => set({ pickedLocation: loc }),
      
      // Theme actions
      setThemeVariant: (variant) => set({ themeVariant: variant }),
      
      // Events actions
      setEvents: (events) => set({ events }),
      
      selectEvent: (event) => set({ selectedEvent: event }),

      updateEvent: (eventId, updates) =>
        set((state) => ({
          events: state.events.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
          selectedEvent:
            state.selectedEvent?.id === eventId
              ? ({ ...state.selectedEvent, ...updates } as Event)
              : state.selectedEvent,
        })),
      
      fetchEvents: async (filters) => {
        set({ eventsLoading: true, eventsError: null });
        try {
          const events = await api.getEvents(filters);
          set({ events, eventsLoading: false });

          prefetchImageUrls([
            ...events.map((e) => e.image),
            ...events.map((e: any) => e?.instructor?.avatar),
            ...events.map((e: any) => e?.trainer?.avatar),
            ...events.flatMap((e) => (Array.isArray(e.participants) ? e.participants.map((p) => p.avatar) : [])),
          ]).catch(() => {});
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch events';
          set({ eventsError: message, eventsLoading: false });
          console.error('[Store] fetchEvents error:', message);
        }
      },
      
      fetchEventById: async (id) => {
        set({ eventsLoading: true, eventsError: null });
        try {
          const event = await api.getEvent(id);
          set((state) => {
            const exists = state.events.some((e) => e.id === id);
            return {
              events: exists 
                ? state.events.map((e) => e.id === id ? event : e)
                : [...state.events, event],
              selectedEvent: event,
              eventsLoading: false,
            };
          });
          return event;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch event';
          set({ eventsError: message, eventsLoading: false });
          console.error('[Store] fetchEventById error:', message);
          return null;
        }
      },

      fetchAdminUsers: async (params) => {
        set({ adminLoading: true, adminError: null });
        try {
          const users = await api.getAdminUsers(params);
          set({ adminUsers: users, adminLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch users';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] fetchAdminUsers error:', message);
        }
      },

      setAdminUserRoleAsync: async (userId, role) => {
        set({ adminLoading: true, adminError: null });
        try {
          const updated = await api.setAdminUserRole(userId, role);
          set((state) => ({
            adminUsers: state.adminUsers.map((u) => (u.id === userId ? { ...u, role: updated.role as any } : u)),
            adminLoading: false,
          }));
          return true;
        } catch (error) {
          const e = error as any;
          const message =
            e && typeof e === 'object' && e.name === 'ApiError'
              ? `HTTP ${e.statusCode}: ${e.message}`
              : error instanceof Error
                ? error.message
                : 'Failed to update user role';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] setAdminUserRoleAsync error:', message);
          return false;
        }
      },
      
      setEventsLoading: (value) => set({ eventsLoading: value }),
      setEventsError: (error) => set({ eventsError: error }),
      
      // Bookings actions
      addBooking: (booking) => set((state) => ({
        bookings: [...state.bookings, booking],
      })),
      
      cancelBooking: (bookingId, reason, comment) =>
        set((state) => {
          const booking = state.bookings.find((b) => b.id === bookingId);
          if (!booking) {
            return {
              bookings: state.bookings,
            };
          }

          const events = state.events.map((e) => {
            if (e.id !== booking.eventId) return e;
            const newSpotsTaken = Math.max(0, (e.spotsTaken || 0) - 1);
            return {
              ...e,
              spotsTaken: newSpotsTaken,
              isFull: newSpotsTaken >= e.spotsTotal,
            };
          });

          return {
            bookings: state.bookings.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    status: 'cancelled' as const,
                    cancellationReason: reason,
                    cancellationComment: comment,
                    cancelledAt: new Date().toISOString(),
                  }
                : b
            ),
            events,
            selectedEvent:
              state.selectedEvent?.id === booking.eventId
                ? ({
                    ...state.selectedEvent,
                    spotsTaken: Math.max(0, (state.selectedEvent.spotsTaken || 0) - 1),
                    isFull:
                      Math.max(0, (state.selectedEvent.spotsTaken || 0) - 1) >=
                      state.selectedEvent.spotsTotal,
                  } as Event)
                : state.selectedEvent,
          };
        }),
      
      getActiveBookingForEvent: (eventId) => {
        const state = get();
        return state.bookings.find(
          (b) =>
            b.eventId === eventId &&
            (b.status === 'pending' || b.status === 'confirmed')
        );
      },
      
      updateBookingStatus: (bookingId, status) => set((state) => ({
        bookings: state.bookings.map((b) =>
          b.id === bookingId ? { ...b, status } : b
        ),
      })),
      
      fetchMyBookings: async () => {
        set({ bookingsLoading: true, bookingsError: null });
        try {
          const bookings = await api.getMyBookings();
          set({ bookings, bookingsLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch bookings';
          set({ bookingsError: message, bookingsLoading: false });
          console.error('[Store] fetchMyBookings error:', message);
        }
      },
      
      createBooking: async (eventId) => {
        set({ bookingsLoading: true, bookingsError: null });
        try {
          const booking = await api.createBooking(eventId);
          set((state) => {
            const events = state.events.map((e) => {
              if (e.id !== eventId) return e;
              const newSpotsTaken = (e.spotsTaken || 0) + 1;
              return {
                ...e,
                spotsTaken: newSpotsTaken,
                isFull: newSpotsTaken >= e.spotsTotal,
              };
            });
            return {
              bookings: [...state.bookings, booking],
              events,
              bookingsLoading: false,
            };
          });
          return booking;
        } catch (error) {
          let message = error instanceof Error ? error.message : 'Не удалось записаться на событие';

          // Backend conflicts: already joined / full
          if (error instanceof ApiError && error.statusCode === 409) {
            const data = (error.data && typeof error.data === 'object' ? (error.data as any) : null) as any;
            const backendError = typeof data?.error === 'string' ? data.error : '';
            const backendMessage = typeof data?.message === 'string' ? data.message : '';
            const conflictText = `${backendError} ${backendMessage}`.toLowerCase();

            if (conflictText.includes('full') || conflictText.includes('no spots') || conflictText.includes('capacity')) {
              message = 'Событие уже заполнено';
            } else if (
              conflictText.includes('already') ||
              conflictText.includes('joined') ||
              conflictText.includes('participation') ||
              conflictText.includes('exists')
            ) {
              message = 'Вы уже записаны на это событие';
            } else if (backendMessage) {
              message = backendMessage;
            }

            // Refresh bookings to return the existing booking instead of failing
            try {
              const bookings = await api.getMyBookings();
              const existing = bookings.find(
                (b: any) => b.eventId === eventId && (b.status === 'pending' || b.status === 'confirmed')
              );
              set({ bookings, bookingsLoading: false, bookingsError: existing ? null : message });
              return existing || null;
            } catch {
              // fallthrough to show message
            }
          }

          set({ bookingsError: message, bookingsLoading: false });
          console.error('[Store] createBooking error:', message);
          return null;
        }
      },
      
      cancelBookingAsync: async (bookingId, reason, comment) => {
        set({ bookingsLoading: true, bookingsError: null });
        try {
          const state = get();
          const booking = state.bookings.find((b) => b.id === bookingId);
          if (!booking) {
            set({ bookingsLoading: false });
            return;
          }

          await api.cancelBooking(booking.eventId, reason, comment);
          if (booking) {
            set((s) => {
              const events = s.events.map((e) => {
                if (e.id !== booking.eventId) return e;
                const newSpotsTaken = Math.max(0, (e.spotsTaken || 0) - 1);
                return {
                  ...e,
                  spotsTaken: newSpotsTaken,
                  isFull: newSpotsTaken >= e.spotsTotal,
                };
              });
              return {
                bookings: s.bookings.map((b) =>
                  b.id === bookingId
                    ? {
                        ...b,
                        status: 'cancelled' as const,
                        cancellationReason: reason,
                        cancellationComment: comment,
                        cancelledAt: new Date().toISOString(),
                      }
                    : b
                ),
                events,
                bookingsLoading: false,
              };
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to cancel booking';
          set({ bookingsError: message, bookingsLoading: false });
          console.error('[Store] cancelBookingAsync error:', message);
        }
      },
      
      setBookingsLoading: (value) => set({ bookingsLoading: value }),
      setBookingsError: (error) => set({ bookingsError: error }),
      
      // Waiting list actions
      joinWaitingList: (eventId) => set((state) => {
        const events = state.events.map((e) => {
          if (e.id === eventId && state.user) {
            return {
              ...e,
              waitingList: [
                ...e.waitingList,
                {
                  userId: state.user.id,
                  position: e.waitingList.length + 1,
                  joinedAt: new Date().toISOString(),
                },
              ],
            };
          }
          return e;
        });
        return {
          events,
          selectedEvent:
            state.selectedEvent?.id === eventId
              ? ({
                  ...state.selectedEvent,
                  waitingList: [
                    ...state.selectedEvent.waitingList,
                    {
                      userId: state.user!.id,
                      position: state.selectedEvent.waitingList.length + 1,
                      joinedAt: new Date().toISOString(),
                    },
                  ],
                } as Event)
              : state.selectedEvent,
        };
      }),
      
      leaveWaitingList: (eventId) => set((state) => {
        const events = state.events.map((e) => {
          if (e.id === eventId && state.user) {
            return {
              ...e,
              waitingList: e.waitingList.filter(
                (w) => w.userId !== state.user!.id
              ),
            };
          }
          return e;
        });
        return {
          events,
          selectedEvent:
            state.selectedEvent?.id === eventId
              ? ({
                  ...state.selectedEvent,
                  waitingList: state.selectedEvent.waitingList.filter(
                    (w) => w.userId !== state.user!.id
                  ),
                } as Event)
              : state.selectedEvent,
          waitingOffers: state.waitingOffers.filter(
            (o) => o.eventId !== eventId || o.userId !== state.user?.id
          ),
        };
      }),
      
      joinWaitingListAsync: async (eventId) => {
        const state = get();
        if (!state.user) return null;
        
        try {
          const result = await api.joinWaitingList(eventId);
          set((s) => {
            const events = s.events.map((e) => {
              if (e.id === eventId) {
                return {
                  ...e,
                  waitingList: [
                    ...e.waitingList,
                    {
                      userId: s.user!.id,
                      position: result.position,
                      joinedAt: new Date().toISOString(),
                    },
                  ],
                };
              }
              return e;
            });
            return { events };
          });
          return result;
        } catch (error) {
          console.error('[Store] joinWaitingListAsync error:', error);
          return null;
        }
      },
      
      leaveWaitingListAsync: async (eventId) => {
        const state = get();
        if (!state.user) return;
        
        try {
          await api.leaveWaitingList(eventId);
          set((s) => {
            const events = s.events.map((e) => {
              if (e.id === eventId) {
                return {
                  ...e,
                  waitingList: e.waitingList.filter(
                    (w) => w.userId !== s.user!.id
                  ),
                };
              }
              return e;
            });
            return {
              events,
              waitingOffers: s.waitingOffers.filter(
                (o) => o.eventId !== eventId || o.userId !== s.user?.id
              ),
            };
          });
        } catch (error) {
          console.error('[Store] leaveWaitingListAsync error:', error);
        }
      },
      
      fetchMyWaitingList: async () => {
        try {
          const waitingList = await api.getMyWaitingList();
          // Update events with waiting list info if needed
          console.log('[Store] fetchMyWaitingList:', waitingList.length, 'items');
        } catch (error) {
          console.error('[Store] fetchMyWaitingList error:', error);
        }
      },
      
      // Waiting Offers actions
      simulateWaitingOffer: (eventId) => {
        const state = get();
        if (!state.user) return null;
        
        const event = state.events.find((e) => e.id === eventId);
        if (!event) return null;
        
        const inQueue = event.waitingList?.some((w) => w.userId === state.user!.id);
        if (!inQueue) return null;
        
        const existingOffer = state.waitingOffers.find(
          (o) => o.eventId === eventId && o.userId === state.user!.id && o.status === 'pending'
        );
        if (existingOffer) return existingOffer;
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min
        
        const offer: WaitingOffer = {
          id: `offer-${Date.now()}`,
          eventId,
          userId: state.user.id,
          status: 'pending',
          offeredAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        };
        
        set((s) => ({
          waitingOffers: [...s.waitingOffers, offer],
        }));
        
        return offer;
      },
      
      acceptWaitingOffer: (offerId) => {
        const state = get();
        const offer = state.waitingOffers.find((o) => o.id === offerId);
        if (!offer || offer.status !== 'pending' || !state.user) return null;
        
        const event = state.events.find((e) => e.id === offer.eventId);
        if (!event) return null;
        
        const booking: Booking = {
          id: `booking-${Date.now()}`,
          eventId: offer.eventId,
          event,
          userId: state.user.id,
          status: 'confirmed',
          bookedAt: new Date().toISOString(),
          paidAmount: event.price || 0,
        };
        
        set((s) => ({
          waitingOffers: s.waitingOffers.map((o) =>
            o.id === offerId ? { ...o, status: 'accepted' as const } : o
          ),
          bookings: [...s.bookings, booking],
          events: s.events.map((e) => {
            if (e.id !== offer.eventId) return e;
            return {
              ...e,
              spotsTaken: (e.spotsTaken || 0) + 1,
              waitingList: e.waitingList.filter((w) => w.userId !== state.user!.id),
            };
          }),
        }));
        
        return booking;
      },
      
      declineWaitingOffer: (offerId) => set((state) => ({
        waitingOffers: state.waitingOffers.map((o) =>
          o.id === offerId ? { ...o, status: 'declined' as const } : o
        ),
      })),

      acceptWaitingOfferAsync: async (offerId) => {
        try {
          const result = await api.acceptWaitingOffer(offerId);
          // Обновляем локальное состояние
          set((state) => ({
            waitingOffers: state.waitingOffers.map((o) =>
              o.id === offerId ? { ...o, status: 'accepted' as const } : o
            ),
          }));
          // Перезагружаем события и бронирования
          get().fetchEvents();
          get().fetchMyBookings();
          return result;
        } catch (error) {
          console.error('[Store] acceptWaitingOfferAsync error:', error);
          return null;
        }
      },

      declineWaitingOfferAsync: async (offerId) => {
        try {
          await api.declineWaitingOffer(offerId);
          set((state) => ({
            waitingOffers: state.waitingOffers.map((o) =>
              o.id === offerId ? { ...o, status: 'declined' as const } : o
            ),
          }));
        } catch (error) {
          console.error('[Store] declineWaitingOfferAsync error:', error);
        }
      },
      
      getActiveOfferForEvent: (eventId) => {
        const state = get();
        return state.waitingOffers.find(
          (o) => o.eventId === eventId && o.userId === state.user?.id && o.status === 'pending'
        );
      },
      
      getPendingOffers: () => {
        const state = get();
        return state.waitingOffers.filter(
          (o) => o.userId === state.user?.id && o.status === 'pending'
        );
      },
      
      // Challenges actions
      startChallenge: (challenge) => set((state) => ({
        challenges: [...state.challenges, challenge],
        activeChallenge: challenge,
      })),
      
      updateChallengeProgress: (challengeId, progress) => set((state) => ({
        challenges: state.challenges.map((c) =>
          c.id === challengeId
            ? {
                ...c,
                progress,
                status: progress >= c.target ? 'completed' : c.status,
              }
            : c
        ),
        activeChallenge:
          state.activeChallenge?.id === challengeId
            ? {
                ...state.activeChallenge,
                progress,
                status:
                  progress >= state.activeChallenge.target
                    ? 'completed'
                    : state.activeChallenge.status,
              }
            : state.activeChallenge,
      })),
      
      // Notifications actions
      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      })),
      
      markNotificationRead: (notificationId) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      })),
      
      markAllNotificationsRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      })),
      
      // UI actions
      setLoading: (value) => set({ isLoading: value }),
      setError: (error) => set({ error }),
      
      // Organizer actions
      setOrganizerEvents: (events) => set({ organizerEvents: events }),
      
      getOrganizerEventById: (id) => {
        const state = get();
        return state.organizerEvents.find((e) => e.id === id);
      },
      
      createOrganizerEvent: (input) => {
        const state = get();
        const now = new Date().toISOString();
        const newEvent: OrganizerEvent = {
          id: `event-${Date.now()}`,
          organizerId: state.user?.id || 't1',
          title: input.title || '',
          description: input.description || '',
          movementType: input.movementType || 'yoga',
          level: input.level || 'novice',
          startAt: input.startAt || now,
          durationMin: input.durationMin || 60,
          locationName: input.locationName || '',
          locationAddress: input.locationAddress,
          locationType: input.locationType || 'public_place',
          capacity: input.capacity,
          priceType: input.priceType || 'free',
          priceValue: input.priceValue,
          paymentInstructions: input.paymentInstructions,
          visibility: input.visibility || 'public',
          status: 'pending',
          participantsJoinedCount: 0,
          participantsAttendedCount: 0,
          participantsCanceledCount: 0,
          revenueTotal: 0,
          createdAt: now,
          updatedAt: now,
        };
        
        set((s) => ({
          organizerEvents: [...s.organizerEvents, newEvent],
          organizerParticipantsByEventId: {
            ...s.organizerParticipantsByEventId,
            [newEvent.id]: [],
          },
        }));
        
        return newEvent;
      },
      
      updateOrganizerEvent: (eventId, updates) => {
        const state = get();
        const event = state.organizerEvents.find((e) => e.id === eventId);
        if (!event) return undefined;
        
        const updatedEvent = {
          ...event,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        
        set((s) => ({
          organizerEvents: s.organizerEvents.map((e) =>
            e.id === eventId ? updatedEvent : e
          ),
        }));
        
        return updatedEvent;
      },
      
      submitOrganizerEvent: (eventId) => {
        const state = get();
        const event = state.organizerEvents.find((e) => e.id === eventId);
        if (!event || event.status !== 'draft') return undefined;
        
        const updatedEvent = {
          ...event,
          status: 'pending' as const,
          updatedAt: new Date().toISOString(),
        };
        
        set((s) => ({
          organizerEvents: s.organizerEvents.map((e) =>
            e.id === eventId ? updatedEvent : e
          ),
        }));
        
        return updatedEvent;
      },
      
      cancelOrganizerEvent: (eventId) => {
        const state = get();
        const event = state.organizerEvents.find((e) => e.id === eventId);
        if (!event || event.status === 'canceled' || event.status === 'finished') return undefined;
        
        const updatedEvent = {
          ...event,
          status: 'canceled' as const,
          updatedAt: new Date().toISOString(),
        };
        
        set((s) => ({
          organizerEvents: s.organizerEvents.map((e) =>
            e.id === eventId ? updatedEvent : e
          ),
        }));
        
        return updatedEvent;
      },
      
      getOrganizerParticipants: (eventId) => {
        const state = get();
        return state.organizerParticipantsByEventId[eventId] || [];
      },
      
      setOrganizerLoading: (value) => set({ organizerLoading: value }),
      setOrganizerError: (error) => set({ organizerError: error }),
      
      // Organizer async actions
      fetchOrganizerEvents: async () => {
        set({ organizerLoading: true, organizerError: null });
        try {
          const events = await api.getOrganizerEvents();
          set({ organizerEvents: events, organizerLoading: false });

          prefetchImageUrls([
            ...events.map((e: any) => e?.image),
            ...events.map((e: any) => e?.coverImage),
          ]).catch(() => {});
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch organizer events';
          set({ organizerError: message, organizerLoading: false });
          console.error('[Store] fetchOrganizerEvents error:', message);
        }
      },
      
      fetchOrganizerEventById: async (id) => {
        set({ organizerLoading: true, organizerError: null });
        try {
          const event = await api.getOrganizerEvent(id);
          set((state) => {
            const exists = state.organizerEvents.some((e) => e.id === id);
            return {
              organizerEvents: exists 
                ? state.organizerEvents.map((e) => e.id === id ? event : e)
                : [...state.organizerEvents, event],
              organizerLoading: false,
            };
          });
          return event;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch organizer event';
          set({ organizerError: message, organizerLoading: false });
          console.error('[Store] fetchOrganizerEventById error:', message);
          return null;
        }
      },
      
      createOrganizerEventAsync: async (input) => {
        set({ organizerLoading: true, organizerError: null });
        try {
          const event = await api.createOrganizerEvent(input);
          set((state) => ({
            organizerEvents: [...state.organizerEvents, event],
            organizerParticipantsByEventId: {
              ...state.organizerParticipantsByEventId,
              [event.id]: [],
            },
            organizerLoading: false,
          }));
          return event;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to create event';
          set({ organizerError: message, organizerLoading: false });
          console.error('[Store] createOrganizerEventAsync error:', message);
          return null;
        }
      },
      
      updateOrganizerEventAsync: async (eventId, updates) => {
        set({ organizerLoading: true, organizerError: null });
        try {
          const response: any = await api.updateOrganizerEvent(eventId, updates);

          // When editing an approved event, backend may return an edit request instead of the updated event.
          if (response && response.mode === 'edit_request') {
            set({ organizerLoading: false });
            const state = get();
            return state.organizerEvents.find((e) => e.id === eventId) || null;
          }

          const event = response as OrganizerEvent;
          set((state) => ({
            organizerEvents: state.organizerEvents.map((e) =>
              e.id === eventId ? event : e
            ),
            organizerLoading: false,
          }));
          return event;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to update event';
          set({ organizerError: message, organizerLoading: false });
          console.error('[Store] updateOrganizerEventAsync error:', message);
          return null;
        }
      },
      
      cancelOrganizerEventAsync: async (eventId) => {
        set({ organizerLoading: true, organizerError: null });
        try {
          const event = await api.cancelOrganizerEvent(eventId);
          set((state) => ({
            organizerEvents: state.organizerEvents.map((e) =>
              e.id === eventId ? event : e
            ),
            organizerLoading: false,
          }));
          return event;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to cancel event';
          set({ organizerError: message, organizerLoading: false });
          console.error('[Store] cancelOrganizerEventAsync error:', message);
          return null;
        }
      },
      
      finishOrganizerEventAsync: async (eventId) => {
        set({ organizerLoading: true, organizerError: null });
        try {
          const result = await api.finishOrganizerEvent(eventId);
          set((state) => ({
            organizerEvents: state.organizerEvents.map((e) =>
              e.id === eventId ? { ...e, status: 'finished' as const } : e
            ),
            organizerLoading: false,
          }));
          return result;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to finish event';
          set({ organizerError: message, organizerLoading: false });
          console.error('[Store] finishOrganizerEventAsync error:', message);
          return null;
        }
      },
      
      fetchOrganizerParticipants: async (eventId) => {
        try {
          const participants = await api.getOrganizerEventParticipants(eventId);
          set((state) => ({
            organizerParticipantsByEventId: {
              ...state.organizerParticipantsByEventId,
              [eventId]: participants,
            },
          }));
          return participants;
        } catch (error) {
          console.error('[Store] fetchOrganizerParticipants error:', error);
          return [];
        }
      },
      
      // Admin actions
      setAdminComplaints: (complaints) => set({ adminComplaints: complaints }),
      setAdminUsers: (users) => set({ adminUsers: users }),
      
      getAdminPendingEvents: () => {
        const state = get();
        return state.organizerEvents.filter((e) => e.status === 'pending');
      },
      
      getAdminUsers: () => {
        const state = get();
        return state.adminUsers;
      },

      getAdminPendingEventEditRequests: () => {
        return get().adminEventEditRequests.filter((r) => r.status === 'pending');
      },

      getAdminEventEditRequestById: (id) => {
        const state = get();
        return state.adminEventEditRequestDetails[id] || null;
      },
      
      approveEvent: (eventId) => {
        const state = get();
        const event = state.organizerEvents.find((e) => e.id === eventId);
        if (!event || event.status !== 'pending') return undefined;
        
        const updatedEvent = {
          ...event,
          status: 'approved' as const,
          updatedAt: new Date().toISOString(),
        };
        
        set((s) => ({
          organizerEvents: s.organizerEvents.map((e) =>
            e.id === eventId ? updatedEvent : e
          ),
        }));
        
        return updatedEvent;
      },
      
      rejectEvent: (eventId) => {
        const state = get();
        const event = state.organizerEvents.find((e) => e.id === eventId);
        if (!event || event.status !== 'pending') return undefined;
        
        const updatedEvent = {
          ...event,
          status: 'rejected' as const,
          updatedAt: new Date().toISOString(),
        };
        
        set((s) => ({
          organizerEvents: s.organizerEvents.map((e) =>
            e.id === eventId ? updatedEvent : e
          ),
        }));
        
        return updatedEvent;
      },
      
      getAdminComplaints: () => {
        return get().adminComplaints;
      },
      
      getAdminOpenComplaints: () => {
        return get().adminComplaints.filter((c) => c.status === 'open');
      },

      getAdminBanAppeals: () => {
        return get().adminBanAppeals;
      },

      getAdminPendingBanAppeals: () => {
        return get().adminBanAppeals.filter((a) => a.status === 'pending');
      },
      
      closeComplaint: (complaintId) => {
        const state = get();
        const complaint = state.adminComplaints.find((c) => c.id === complaintId);
        if (!complaint || complaint.status === 'closed') return undefined;
        
        const updatedComplaint = {
          ...complaint,
          status: 'closed' as const,
          closedAt: new Date().toISOString(),
        };
        
        set((s) => ({
          adminComplaints: s.adminComplaints.map((c) =>
            c.id === complaintId ? updatedComplaint : c
          ),
        }));
        
        return updatedComplaint;
      },
      
      setAdminLoading: (value) => set({ adminLoading: value }),
      setAdminError: (error) => set({ adminError: error }),
      
      // Admin async actions
      fetchAdminPendingEvents: async () => {
        set({ adminLoading: true, adminError: null });
        try {
          const events = await api.getAdminPendingEvents();
          // Update organizerEvents with pending events from admin API
          set((state) => {
            const existingIds = new Set(state.organizerEvents.map((e) => e.id));
            const newEvents = events.filter((e) => !existingIds.has(e.id));
            return {
              organizerEvents: [...state.organizerEvents, ...newEvents],
              adminLoading: false,
            };
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch pending events';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] fetchAdminPendingEvents error:', message);
        }
      },
      
      approveEventAsync: async (eventId) => {
        set({ adminLoading: true, adminError: null });
        try {
          const event = await api.approveAdminEvent(eventId);
          set((state) => ({
            organizerEvents: state.organizerEvents.map((e) =>
              e.id === eventId ? event : e
            ),
            adminLoading: false,
          }));
          return event;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to approve event';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] approveEventAsync error:', message);
          return null;
        }
      },
      
      rejectEventAsync: async (eventId) => {
        set({ adminLoading: true, adminError: null });
        try {
          const event = await api.rejectAdminEvent(eventId);
          set((state) => ({
            organizerEvents: state.organizerEvents.map((e) =>
              e.id === eventId ? event : e
            ),
            adminLoading: false,
          }));
          return event;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to reject event';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] rejectEventAsync error:', message);
          return null;
        }
      },
      
      fetchAdminComplaints: async () => {
        set({ adminLoading: true, adminError: null });
        try {
          const complaints = await api.getAdminComplaints();
          set({ adminComplaints: complaints, adminLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch complaints';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] fetchAdminComplaints error:', message);
        }
      },

      fetchAdminBanAppeals: async (params) => {
        set({ adminLoading: true, adminError: null });
        try {
          const res = await api.getAdminBanAppeals(params);
          set({ adminBanAppeals: res.items || [], adminLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch ban appeals';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] fetchAdminBanAppeals error:', message);
        }
      },
      
      closeComplaintAsync: async (complaintId) => {
        set({ adminLoading: true, adminError: null });
        try {
          const complaint = await api.closeAdminComplaint(complaintId);
          set((state) => ({
            adminComplaints: state.adminComplaints.map((c) =>
              c.id === complaintId ? complaint : c
            ),
            adminLoading: false,
          }));
          return complaint;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to close complaint';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] closeComplaintAsync error:', message);
          return null;
        }
      },
      
      banAdminUserAsync: async (userId, reason) => {
        set({ adminLoading: true, adminError: null });
        try {
          await api.banAdminUser(userId, reason);
          set({ adminLoading: false });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to ban user';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] banAdminUserAsync error:', message);
          return false;
        }
      },
      
      freezeAdminUserAsync: async (userId, reason, until) => {
        set({ adminLoading: true, adminError: null });
        try {
          await api.freezeAdminUser(userId, reason, until);
          set({ adminLoading: false });
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to freeze user';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] freezeAdminUserAsync error:', message);
          return false;
        }
      },

      resolveComplaintAsync: async (complaintId, payload) => {
        set({ adminLoading: true, adminError: null });
        try {
          const updated = await api.resolveAdminComplaint(complaintId, payload);
          set((state) => ({
            adminComplaints: state.adminComplaints.map((c) => (c.id === complaintId ? updated : c)),
            adminLoading: false,
          }));
          return updated;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to resolve complaint';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] resolveComplaintAsync error:', message);
          return null;
        }
      },
      
      resolveBanAppealAsync: async (appealId, status, adminResponse) => {
        set({ adminLoading: true, adminError: null });
        try {
          const result = await api.resolveAdminBanAppeal(appealId, { status, adminResponse });
          set((state) => ({
            adminBanAppeals: state.adminBanAppeals.map((a) =>
              a.id === appealId
                ? {
                    ...a,
                    status: result.status as any,
                    adminResponse: result.adminResponse,
                    resolvedAt: result.resolvedAt || null,
                    updatedAt: new Date().toISOString(),
                  }
                : a
            ),
            adminLoading: false,
          }));
          return get().adminBanAppeals.find((a) => a.id === appealId) || null;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to resolve ban appeal';
          set({ adminError: message, adminLoading: false });
          console.error('[Store] resolveBanAppealAsync error:', message);
          return null;
        }
      },
      
      // Points & Experience actions
      addPoints: (points) => set((state) => ({
        user: state.user
          ? { ...state.user, points: state.user.points + points }
          : null,
      })),
      
      addExperience: (exp) => set((state) => {
        if (!state.user) return {};
        const newExp = state.user.experience + exp;
        const LEVEL_THRESHOLDS = [0, 500, 1000, 2000, 4000, 8000, 16000];
        let newLevel = state.user.level;
        
        for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
          if (newExp >= LEVEL_THRESHOLDS[i]) {
            newLevel = i + 1;
            break;
          }
        }
        
        return {
          user: {
            ...state.user,
            experience: newExp,
            level: newLevel,
          },
        };
      }),

      refreshGamification: async () => {
        const user = get().user;
        const isAuthenticated = get().isAuthenticated;
        if (!user || !isAuthenticated) return;

        try {
          const points = await api.getMyPoints();
          const status = await api.getMyStatus();
          const totalPoints = typeof points.totalPoints === 'number' ? points.totalPoints : user.points;
          const exp = totalPoints;
          const LEVEL_THRESHOLDS = [0, 500, 1000, 2000, 4000, 8000, 16000];
          let level = user.level;
          for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (exp >= LEVEL_THRESHOLDS[i]) {
              level = i + 1;
              break;
            }
          }
          set((state) => ({
            user: state.user
              ? {
                  ...state.user,
                  points: totalPoints,
                  experience: exp,
                  level,
                }
              : null,
          }));
        } catch (e) {
          // Ошибки сети при ручном refresh не критичны
        }
      },

      refreshSubscriptionStatus: async () => {
        const user = get().user;
        const isAuthenticated = get().isAuthenticated;
        if (!user || !isAuthenticated) return;

        try {
          const sub = await api.getSubscriptionStatus();
          set((state) => {
            if (!state.user) return { user: null };

            if (sub?.hasSubscription && sub.endAt) {
              const isTrial = sub.status === 'trial';
              const plan = isTrial ? 'trial' : sub.plan === 'organizer_999' ? 'organizer' : 'basic';
              return {
                user: {
                  ...state.user,
                  subscription: {
                    plan: plan as 'free' | 'trial' | 'basic' | 'organizer',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: sub.endAt.split('T')[0],
                    isActive: true,
                    trialUsed: !isTrial,
                  },
                },
              };
            }

            return {
              user: {
                ...state.user,
                subscription: {
                  plan: 'free',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                  isActive: false,
                  trialUsed: true,
                },
              },
            };
          });
        } catch {
          // Игнорируем ошибки сети
        }
      },
    }),
    {
      name: 'mewego-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        try {
          const user = state?.user;
          const isAuthenticated = state?.isAuthenticated;
          const isLikelyTestUser =
            Boolean(user && typeof (user as any).id === 'string' && String((user as any).id).startsWith('test_')) ||
            Boolean(user && typeof (user as any).email === 'string' && String((user as any).email).endsWith('.local'));

          if (user && isAuthenticated) {
            api.setAuthContext(user.id, (user.role as 'user' | 'organizer' | 'admin' | 'superadmin') || 'user');

            // If the app crashed and restarted, keep test sessions in "no-backend" mode.
            if (isLikelyTestUser) {
              useAppStore.setState({ isTestSession: true });
              api.setTestAuthKey(process.env.EXPO_PUBLIC_TEST_AUTH_KEY || null);
              return;
            }
            api.setTestAuthKey(null);
            
            // Подгружаем актуальный статус подписки из backend при старте приложения
            api.getSubscriptionStatus().then((sub) => {
              useAppStore.setState((s) => {
                if (!s.user) return s;
                if (sub?.hasSubscription && sub.endAt) {
                  const isTrial = sub.status === 'trial';
                  const plan = isTrial ? 'trial' : sub.plan === 'organizer_999' ? 'organizer' : 'basic';
                  return {
                    ...s,
                    user: {
                      ...s.user,
                      subscription: {
                        plan: plan as 'free' | 'trial' | 'basic' | 'organizer',
                        startDate: new Date().toISOString().split('T')[0],
                        endDate: sub.endAt.split('T')[0],
                        isActive: true,
                        trialUsed: !isTrial,
                      },
                    },
                  };
                }

                return {
                  ...s,
                  user: {
                    ...s.user,
                    subscription: {
                      plan: 'free',
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: new Date().toISOString().split('T')[0],
                      isActive: false,
                      trialUsed: true,
                    },
                  },
                };
              });
            }).catch(() => {
              // Игнорируем ошибки сети при старте
            });
          } else {
            api.setAuthContext('anonymous', 'user');
            api.setTestAuthKey(null);
          }
        } catch (e) {
          api.setAuthContext('anonymous', 'user');
          api.setTestAuthKey(null);
        }
      },
      partialize: (state) => ({
        isFirstLaunch: state.isFirstLaunch,
        onboardingCompleted: state.onboardingCompleted,
        isAuthenticated: state.isAuthenticated,
        isTestSession: state.isTestSession,
        user: state.user,
        gender: state.gender,
        birthDate: state.birthDate,
        themeVariant: state.themeVariant,
        bookings: state.bookings,
        challenges: state.challenges,
      }),
    }
  )
);
