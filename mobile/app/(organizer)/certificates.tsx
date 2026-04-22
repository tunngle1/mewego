import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/contexts/ThemeContext';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { Button } from '../../src/components/ui/Button';
import { Certificate } from '../../src/types';

const MOCK_CERTIFICATES: Certificate[] = [
  {
    id: '1',
    title: 'RYT-200 Yoga Alliance',
    issuer: 'Yoga Alliance',
    issuedAt: '2019-06-15',
    assetUrl: 'https://via.placeholder.com/300x200',
    verified: true,
  },
  {
    id: '2',
    title: 'Инструктор по медитации',
    issuer: 'Mindfulness Academy',
    issuedAt: '2021-03-20',
    verified: false,
  },
  {
    id: '3',
    title: 'Первая помощь',
    issuer: 'Красный Крест',
    issuedAt: '2023-01-10',
    verified: true,
  },
];

const formatDate = (isoDate?: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export default function CertificatesScreen() {
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [assetUri, setAssetUri] = useState<string | null>(null);

  const fetchCertificates = async () => {
    // TODO: Replace with real API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setCertificates(MOCK_CERTIFICATES);
  };

  useEffect(() => {
    fetchCertificates().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCertificates();
    setRefreshing(false);
  };

  const resetForm = () => {
    setTitle('');
    setIssuer('');
    setIssuedAt('');
    setAssetUri(null);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAssetUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название сертификата');
      return;
    }

    setSaving(true);
    try {
      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newCertificate: Certificate = {
        id: Date.now().toString(),
        title: title.trim(),
        issuer: issuer.trim() || undefined,
        issuedAt: issuedAt || undefined,
        assetUrl: assetUri || undefined,
        verified: false,
      };

      setCertificates(prev => [newCertificate, ...prev]);
      setModalVisible(false);
      resetForm();
      Alert.alert('Успешно', 'Сертификат добавлен');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось сохранить сертификат');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Удалить сертификат?',
      'Это действие нельзя отменить',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            // TODO: Replace with real API call
            setCertificates(prev => prev.filter(c => c.id !== id));
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.neutralMuted,
    },
    headerTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    addButton: {
      backgroundColor: colors.accent,
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl * 2,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyIcon: {
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    emptyText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    certificateCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    certificateHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    certificateIcon: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    certificateImage: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.lg,
      marginRight: spacing.md,
    },
    certificateInfo: {
      flex: 1,
    },
    certificateTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: 4,
    },
    certificateIssuer: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    certificateDate: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 4,
    },
    certificateActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.successLight || colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      gap: 4,
    },
    verifiedText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      color: colors.success,
    },
    deleteButton: {
      padding: spacing.xs,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
      maxHeight: '90%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    modalTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    closeButton: {
      padding: spacing.xs,
    },
    inputGroup: {
      marginBottom: spacing.lg,
    },
    inputLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
    },
    imagePickerButton: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.neutralMuted,
      borderStyle: 'dashed',
      minHeight: 120,
    },
    imagePickerText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    selectedImage: {
      width: '100%',
      height: 150,
      borderRadius: borderRadius.lg,
    },
    removeImageButton: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.error,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Сертификаты</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {certificates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={64} color={colors.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Нет сертификатов</Text>
            <Text style={styles.emptyText}>
              Добавьте свои сертификаты и достижения, чтобы повысить доверие участников
            </Text>
            <Button title="Добавить сертификат" onPress={() => setModalVisible(true)} />
          </View>
        ) : (
          certificates.map((cert) => (
            <View key={cert.id} style={styles.certificateCard}>
              <View style={styles.certificateHeader}>
                {cert.assetUrl ? (
                  <Image source={{ uri: cert.assetUrl }} style={styles.certificateImage} />
                ) : (
                  <View style={styles.certificateIcon}>
                    <Ionicons name="ribbon" size={28} color={colors.primary} />
                  </View>
                )}
                <View style={styles.certificateInfo}>
                  <Text style={styles.certificateTitle}>{cert.title}</Text>
                  {cert.issuer && <Text style={styles.certificateIssuer}>{cert.issuer}</Text>}
                  {cert.issuedAt && (
                    <Text style={styles.certificateDate}>Выдан: {formatDate(cert.issuedAt)}</Text>
                  )}
                </View>
                <View style={styles.certificateActions}>
                  {cert.verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text style={styles.verifiedText}>Проверен</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(cert.id)}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Certificate Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новый сертификат</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Название *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Например: RYT-200 Yoga Alliance"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Кем выдан</Text>
                <TextInput
                  style={styles.input}
                  value={issuer}
                  onChangeText={setIssuer}
                  placeholder="Организация или учебное заведение"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Дата выдачи</Text>
                <TextInput
                  style={styles.input}
                  value={issuedAt}
                  onChangeText={setIssuedAt}
                  placeholder="ГГГГ-ММ-ДД"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Фото сертификата</Text>
                {assetUri ? (
                  <View>
                    <Image source={{ uri: assetUri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setAssetUri(null)}
                    >
                      <Ionicons name="close" size={18} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                    <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.imagePickerText}>Нажмите, чтобы выбрать фото</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Button
                title={saving ? 'Сохранение...' : 'Сохранить'}
                onPress={handleSave}
                disabled={saving || !title.trim()}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
