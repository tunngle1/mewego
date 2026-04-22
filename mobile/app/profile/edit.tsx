import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAppStore } from '../../src/store/useAppStore';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/services/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();
  const { user, updateUser } = useAppStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [about, setAbout] = useState(user?.about || '');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveAvatar = avatarDataUrl || user?.avatar || null;

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужен доступ', 'Разрешите доступ к галерее в настройках');
      return;
    }

    const anyPicker: any = ImagePicker as any;
    const mediaTypes = anyPicker.MediaType
      ? [anyPicker.MediaType.Images]
      : anyPicker.MediaTypeOptions
        ? anyPicker.MediaTypeOptions.Images
        : undefined;

    const result = await ImagePicker.launchImageLibraryAsync({
      ...(mediaTypes ? { mediaTypes } : {}),
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert('Ошибка', 'Не удалось прочитать изображение. Попробуйте другое фото.');
      return;
    }
    const mime = asset.mimeType || 'image/jpeg';
    setAvatarDataUrl(`data:${mime};base64,${asset.base64}`);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        about: about.trim() || null,
        ...(avatarDataUrl ? { avatarUrl: avatarDataUrl } : {}),
      };

      await api.updateProfile(payload);

      updateUser({
        name: name.trim(),
        about: about.trim() || '',
        ...(avatarDataUrl ? { avatar: avatarDataUrl } : {}),
      });

      Alert.alert('Сохранено', 'Профиль обновлён', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось сохранить профиль');
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.neutralLight,
      ...shadows.sm,
    },
    backIcon: {
      fontSize: fontSize.xl,
      color: colors.text,
    },
    headerTitle: {
      flex: 1,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginRight: 40,
    },
    content: {
      padding: spacing.lg,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    avatarText: {
      fontSize: 40,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    changeAvatarButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    changeAvatarText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.accent,
    },
    fieldContainer: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.neutralLight,
      fontSize: fontSize.md,
      color: colors.text,
    },
    inputMultiline: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    inputDisabled: {
      backgroundColor: colors.neutralMuted,
      color: colors.textMuted,
    },
    hint: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.xl,
      ...shadows.md,
    },
    saveButtonDisabled: {
      backgroundColor: colors.neutralLight,
    },
    saveButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
  }), [colors, spacing, fontSize, fontWeight, borderRadius, shadows]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Редактировать</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            {effectiveAvatar ? (
              <Image source={{ uri: effectiveAvatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : '👤'}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.changeAvatarButton} onPress={handlePickAvatar} activeOpacity={0.8}>
            <Text style={styles.changeAvatarText}>Изменить фото</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Фото сохранится после “Сохранить”</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Имя</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ваше имя"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Телефон</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={phone}
            editable={false}
          />
          <Text style={styles.hint}>Телефон нельзя изменить</Text>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>О себе</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={about}
            onChangeText={setAbout}
            placeholder="Коротко о себе, что любите, чем занимаетесь…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
