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
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../src/contexts/ThemeContext';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { Button } from '../../src/components/ui/Button';
import { Certificate } from '../../src/types';
import { api } from '../../src/services/api';


export default function OrganizerCertificatesScreen() {
  const router = useRouter();
  const { colors, spacing, fontSize, fontWeight, borderRadius, shadows } = useTheme();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newCertTitle, setNewCertTitle] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertImage, setNewCertImage] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const data = await api.getOrganizerCertificates();
      setCertificates(data);
    } catch (e) {
      console.error('Failed to fetch certificates:', e);
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCertificates();
    setRefreshing(false);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужен доступ', 'Разрешите доступ к галерее в настройках');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewCertImage(result.assets[0].uri);
    }
  };

  const handleAddCertificate = async () => {
    if (!newCertTitle.trim()) {
      Alert.alert('Ошибка', 'Введите название сертификата');
      return;
    }

    try {
      const newCert = await api.addOrganizerCertificate({
        title: newCertTitle.trim(),
        issuer: newCertIssuer.trim() || undefined,
        issuedAt: new Date().toISOString(),
        assetUrl: newCertImage || undefined,
      });

      setCertificates([newCert, ...certificates]);
      setModalVisible(false);
      setNewCertTitle('');
      setNewCertIssuer('');
      setNewCertImage(null);
      Alert.alert('Готово', 'Сертификат добавлен и отправлен на проверку');
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось добавить сертификат');
    }
  };

  const handleDeleteCertificate = (id: string) => {
    Alert.alert(
      'Удалить сертификат?',
      'Это действие нельзя отменить',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteOrganizerCertificate(id);
              setCertificates(certificates.filter(c => c.id !== id));
            } catch (e) {
              Alert.alert('Ошибка', 'Не удалось удалить сертификат');
            }
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
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.sm,
    },
    title: {
      flex: 1,
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    addButton: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    addButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl * 2,
    },
    certCard: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    certHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    certTitle: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.text,
      flex: 1,
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
      fontWeight: fontWeight.bold,
      color: colors.success,
    },
    pendingBadge: {
      backgroundColor: colors.warningLight || colors.primaryLight,
    },
    pendingText: {
      color: colors.warning,
    },
    certIssuer: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    certDate: {
      fontSize: fontSize.xs,
      color: colors.textDisabled,
    },
    certImage: {
      width: '100%',
      height: 150,
      borderRadius: borderRadius.lg,
      marginTop: spacing.md,
      backgroundColor: colors.surfaceMuted,
    },
    certActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: spacing.md,
    },
    deleteButton: {
      padding: spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxl * 2,
    },
    emptyEmoji: {
      fontSize: 64,
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    emptyText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.lg,
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
      padding: spacing.xl,
      maxHeight: '80%',
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
    input: {
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.neutralMuted,
      marginBottom: spacing.md,
    },
    imagePickerButton: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      borderWidth: 2,
      borderColor: colors.neutralMuted,
      borderStyle: 'dashed',
    },
    imagePickerText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    previewImage: {
      width: '100%',
      height: 150,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LoadingSpinner fullScreen text="Загрузка сертификатов..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Сертификаты</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Добавить</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {certificates.length > 0 ? (
          certificates.map((cert) => (
            <View key={cert.id} style={styles.certCard}>
              <View style={styles.certHeader}>
                <Text style={styles.certTitle}>{cert.title}</Text>
                <View style={[styles.verifiedBadge, !cert.verified && styles.pendingBadge]}>
                  <Ionicons
                    name={cert.verified ? 'checkmark-circle' : 'time'}
                    size={14}
                    color={cert.verified ? colors.success : colors.warning}
                  />
                  <Text style={[styles.verifiedText, !cert.verified && styles.pendingText]}>
                    {cert.verified ? 'Проверен' : 'На проверке'}
                  </Text>
                </View>
              </View>
              {cert.issuer && <Text style={styles.certIssuer}>{cert.issuer}</Text>}
              {cert.issuedAt && (
                <Text style={styles.certDate}>
                  Выдан: {new Date(cert.issuedAt).toLocaleDateString('ru-RU')}
                </Text>
              )}
              {cert.assetUrl && (
                <Image source={{ uri: cert.assetUrl }} style={styles.certImage} resizeMode="cover" />
              )}
              <View style={styles.certActions}>
                <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteCertificate(cert.id)}>
                  <Ionicons name="trash-outline" size={20} color={colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎓</Text>
            <Text style={styles.emptyTitle}>Нет сертификатов</Text>
            <Text style={styles.emptyText}>
              Добавьте сертификаты, чтобы повысить доверие участников
            </Text>
            <Button title="Добавить сертификат" onPress={() => setModalVisible(true)} />
          </View>
        )}
      </ScrollView>

      {/* Add Certificate Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView 
            style={styles.modalOverlay} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Новый сертификат</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Название сертификата"
                  placeholderTextColor={colors.textMuted}
                  value={newCertTitle}
                  onChangeText={setNewCertTitle}
                  returnKeyType="next"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Кем выдан (необязательно)"
                  placeholderTextColor={colors.textMuted}
                  value={newCertIssuer}
                  onChangeText={setNewCertIssuer}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                {newCertImage ? (
                  <TouchableOpacity onPress={handlePickImage}>
                    <Image source={{ uri: newCertImage }} style={styles.previewImage} resizeMode="cover" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                    <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                    <Text style={styles.imagePickerText}>Добавить фото сертификата</Text>
                  </TouchableOpacity>
                )}

                <Button title="Сохранить" onPress={handleAddCertificate} />
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
