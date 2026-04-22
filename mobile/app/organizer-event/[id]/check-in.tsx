import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { api, ApiError } from '../../../src/services/api';

export default function OrganizerEventCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<null | {
    eventId: string;
    title: string;
    active: boolean;
    availableFrom: string;
    expiresAt: string;
    code?: string;
    qrPayload?: string;
  }>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { padding: spacing.lg, gap: spacing.lg },
        card: {
          backgroundColor: colors.white,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.neutralLight,
          ...shadows.sm,
        },
        title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm },
        muted: { fontSize: fontSize.sm, color: colors.textMuted },
        codeRow: { marginTop: spacing.md, alignItems: 'center', gap: spacing.sm },
        code: { fontSize: 28, letterSpacing: 6, fontWeight: fontWeight.bold, color: colors.text },
        button: {
          marginTop: spacing.md,
          backgroundColor: colors.text,
          borderRadius: borderRadius.lg,
          paddingVertical: spacing.md,
          alignItems: 'center',
        },
        buttonText: { color: colors.white, fontWeight: fontWeight.bold, fontSize: fontSize.sm },
      }),
    [colors, spacing, fontSize, fontWeight, borderRadius, shadows]
  );

  useEffect(() => {
    if (!id || loading) return;
    setLoading(true);
    api
      .getOrganizerEventCheckIn(id)
      .then((result) => setData(result))
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : String(err);
        Alert.alert('Ошибка', message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyCode = async () => {
    if (!data?.code) return;
    await Clipboard.setStringAsync(data.code);
    Alert.alert('Скопировано', 'Код скопирован');
  };

  const handleShare = async () => {
    if (!data?.code) return;
    try {
      await Share.share({
        message: `Чек-ин код события: ${data.code}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>QR для чек-ина</Text>
          <Text style={styles.muted}>
            Окно: за 30 минут до старта и 3 часа после окончания.
          </Text>
          {data ? (
            data.active ? (
              <View style={{ alignItems: 'center', marginTop: spacing.lg, gap: spacing.md }}>
                {data.qrPayload ? <QRCode value={data.qrPayload} size={220} /> : null}
                <View style={styles.codeRow}>
                  <Text style={styles.muted}>Код</Text>
                  <Text style={styles.code}>{data.code}</Text>
                </View>
                <TouchableOpacity style={styles.button} onPress={handleCopyCode} activeOpacity={0.9}>
                  <Text style={styles.buttonText}>Скопировать код</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleShare} activeOpacity={0.9}>
                  <Text style={styles.buttonText}>Поделиться</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.muted}>Пока недоступно.</Text>
                <Text style={styles.muted}>Доступно с: {new Date(data.availableFrom).toLocaleString('ru-RU')}</Text>
                <Text style={styles.muted}>До: {new Date(data.expiresAt).toLocaleString('ru-RU')}</Text>
              </View>
            )
          ) : (
            <Text style={[styles.muted, { marginTop: spacing.lg }]}>{loading ? 'Загрузка…' : 'Нет данных'}</Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

