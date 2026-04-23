import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '../src/contexts/ThemeContext';
import { api, ApiError } from '../src/services/api';
import { useAppStore } from '../src/store/useAppStore';

type ParsedQr = { type?: string; eventId?: string; code?: string };

export default function CheckInScreen() {
  const router = useRouter();
  const { eventId, bookingId } = useLocalSearchParams<{ eventId?: string; bookingId?: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const updateBookingStatus = useAppStore((s) => s.updateBookingStatus);
  const fetchMyBookings = useAppStore((s) => s.fetchMyBookings);
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const scannedRef = useRef(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { padding: spacing.lg, gap: spacing.lg },
        title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
        muted: { fontSize: fontSize.sm, color: colors.textMuted },
        card: {
          backgroundColor: colors.white,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.neutralLight,
          ...shadows.sm,
        },
        input: {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.neutralLight,
          color: colors.text,
          fontSize: fontSize.lg,
          letterSpacing: 4,
          textAlign: 'center',
        },
        button: {
          marginTop: spacing.md,
          backgroundColor: colors.accent,
          borderRadius: borderRadius.lg,
          paddingVertical: spacing.md,
          alignItems: 'center',
        },
        buttonText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
        cameraWrap: {
          height: 360,
          borderRadius: borderRadius.xl,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.neutralLight,
          backgroundColor: colors.surface,
        },
      }),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission().catch(() => {});
    }
  }, [permission]);

  const performCheckIn = async (payload: { code?: string; token?: string }) => {
    if (!eventId) {
      Alert.alert('Ошибка', 'Нет eventId');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const result = await api.checkInEvent(eventId, payload);
      if (bookingId) {
        updateBookingStatus(bookingId, 'attended');
      }
      fetchMyBookings().catch(() => {});
      Alert.alert('Готово', result.message || 'Посещение отмечено!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
      Alert.alert('Ошибка', msg);
      scannedRef.current = false;
    } finally {
      setBusy(false);
    }
  };

  const parseQr = (raw: string): ParsedQr | null => {
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') return obj as ParsedQr;
      return null;
    } catch {
      return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Чек-ин на событии</Text>
        <Text style={styles.muted}>
          Отсканируй QR у организатора или введи код вручную.
        </Text>

        <View style={styles.card}>
          <Text style={[styles.muted, { marginBottom: spacing.sm }]}>Сканер QR</Text>
          <View style={styles.cameraWrap}>
            {permission?.granted ? (
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={(event) => {
                  if (scannedRef.current) return;
                  scannedRef.current = true;
                  const parsed = parseQr(event.data);
                  const code = parsed?.code;
                  const qrEventId = parsed?.eventId;
                  if (qrEventId && eventId && qrEventId !== eventId) {
                    Alert.alert('Не то событие', 'Этот QR относится к другому событию.');
                    scannedRef.current = false;
                    return;
                  }
                  if (!code) {
                    Alert.alert('Ошибка', 'QR не содержит код.');
                    scannedRef.current = false;
                    return;
                  }
                  performCheckIn({ code });
                }}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
                <Text style={styles.muted}>Нужен доступ к камере</Text>
                <TouchableOpacity style={styles.button} onPress={() => requestPermission()} activeOpacity={0.9}>
                  <Text style={styles.buttonText}>Разрешить камеру</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.muted, { marginBottom: spacing.sm }]}>Ввод кода</Text>
          <TextInput
            value={manualCode}
            onChangeText={(v) => setManualCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.button, (!manualCode || manualCode.length !== 6 || busy) && { opacity: 0.5 }]}
            disabled={!manualCode || manualCode.length !== 6 || busy}
            onPress={() => performCheckIn({ code: manualCode })}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>{busy ? 'Проверяем…' : 'Отметиться'}</Text>
          </TouchableOpacity>
        </View>

        {bookingId ? <Text style={styles.muted}>Запись: {bookingId}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

