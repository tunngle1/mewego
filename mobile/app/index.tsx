import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAppStore } from '../src/store/useAppStore';
import { api, ApiError } from '../src/services/api';

export default function Index() {
  const { isFirstLaunch, onboardingCompleted, isAuthenticated, isTestSession, user } = useAppStore();
  const updateUser = useAppStore((s) => s.updateUser);
  const logout = useAppStore((s) => s.logout);
  const [checking, setChecking] = useState(false);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    const done = useAppStore.persist.onFinishHydration(() => {
      setStoreHydrated(true);
    });
    if (useAppStore.persist.hasHydrated()) {
      setStoreHydrated(true);
    }
    return done;
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkAccount = async () => {
      // For local test login we skip backend /me checks entirely.
      if (isTestSession) {
        if (mounted) {
          setChecking(false);
          setCheckedOnce(true);
        }
        return;
      }

      // If we are not authenticated (or user isn't loaded yet), don't call /me.
      // Still mark check as done to avoid blocking navigation.
      if (!isAuthenticated || !user) {
        if (mounted) {
          setChecking(false);
          setCheckedOnce(true);
        }
        return;
      }

      setChecking(true);
      try {
        const me = await api.getMe();
        if (!mounted) return;

        // Sync role from backend (important when role was changed by superadmin)
        if (me?.role && me.role !== user.role) {
          updateUser({ role: me.role } as any);
          api.setAuthContext(user.id, me.role);
        }

        // backend returns accountStatus always for active users
        if (me?.accountStatus) {
          updateUser({
            accountStatus: me.accountStatus,
            bannedAt: me.bannedAt,
            bannedReason: me.bannedReason,
            frozenAt: me.frozenAt,
            frozenUntil: me.frozenUntil,
            frozenReason: me.frozenReason,
          } as any);

          if (me.accountStatus !== 'active') {
            return;
          }
        }
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 403 && err.data && typeof err.data === 'object') {
          const data = err.data as any;
          if (data.status === 'banned' || data.status === 'frozen') {
            updateUser({
              accountStatus: data.status,
              bannedAt: data.bannedAt,
              bannedReason: data.bannedReason,
              frozenAt: data.frozenAt,
              frozenUntil: data.frozenUntil,
              frozenReason: data.frozenReason,
            } as any);
            return;
          }
        }

        // If backend is temporarily unreachable, don't force logout.
        // This allows offline usage and dev-login flows without a running backend.
        const message = err instanceof Error ? err.message : String(err);
        const isNetworkError = message.toLowerCase().includes('network') || message.toLowerCase().includes('failed');
        if (!isNetworkError) {
          // For real auth failures (401 etc) - force logout to auth
          logout();
        }
      } finally {
        if (mounted) {
          setChecking(false);
          setCheckedOnce(true);
        }
      }
    };

    checkAccount();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isTestSession, user?.id, updateUser, logout]);

  if (!storeHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (isFirstLaunch || !onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/auth" />;
  }

  // Don't allow navigation until we've checked /me at least once.
  if (!checkedOnce || checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (user.accountStatus && user.accountStatus !== 'active') {
    return (
      <Redirect
        href={{
          pathname: '/blocked',
          params: {
            status: user.accountStatus,
            reason: user.accountStatus === 'banned' ? (user.bannedReason || '') : (user.frozenReason || ''),
            until: user.frozenUntil || '',
          },
        }}
      />
    );
  }

  // All roles enter the main app as participant UI.
  // Admin panel is opened explicitly from Profile.
  return <Redirect href="/(tabs)/explore" />;
}
