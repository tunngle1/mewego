import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const CANCELLATION_REASONS = [
  { id: 'plans_changed', label: 'Планы изменились' },
  { id: 'feeling_unwell', label: 'Плохое самочувствие' },
  { id: 'time_not_suitable', label: 'Не подходит время' },
  { id: 'location_not_suitable', label: 'Не подходит место' },
  { id: 'other', label: 'Другое' },
];

interface CancelBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, comment?: string) => void;
  eventTitle?: string;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  visible,
  onClose,
  onConfirm,
  eventTitle,
}) => {
  const { colors, spacing, fontSize, fontWeight, borderRadius } = useTheme();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) return;
    const reasonLabel =
      CANCELLATION_REASONS.find((r) => r.id === selectedReason)?.label || selectedReason;
    onConfirm(reasonLabel, selectedReason === 'other' ? comment : undefined);
    setSelectedReason(null);
    setComment('');
  };

  const handleClose = () => {
    setSelectedReason(null);
    setComment('');
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      paddingHorizontal: spacing.lg,
      maxHeight: '80%',
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.neutral,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSize.sm,
      color: colors.textLight,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    reasonsList: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    reasonButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutral,
      backgroundColor: colors.white,
    },
    reasonButtonSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    radioOuter: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.neutral,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    radioOuterSelected: {
      borderColor: colors.accent,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    reasonLabel: {
      fontSize: fontSize.md,
      color: colors.text,
      flex: 1,
    },
    commentInput: {
      borderWidth: 1,
      borderColor: colors.neutral,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: fontSize.md,
      color: colors.text,
      backgroundColor: colors.white,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: spacing.lg,
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    cancelButton: {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.neutral,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.textMuted,
    },
    confirmButton: {
      flex: 1,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    confirmButtonDisabled: {
      backgroundColor: colors.neutral,
    },
    confirmButtonText: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.bold,
      color: colors.white,
    },
    warningText: {
      fontSize: fontSize.xs,
      color: colors.textLight,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.container}>
          <View style={styles.handle} />
          <Text style={styles.title}>Отменить запись?</Text>
          {eventTitle && (
            <Text style={styles.subtitle}>Событие: {eventTitle}</Text>
          )}
          <Text style={styles.warningText}>
            Отмена за 12 часов до начала — без штрафа
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.reasonsList}>
              {CANCELLATION_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonButton,
                    selectedReason === reason.id && styles.reasonButtonSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.id)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      selectedReason === reason.id && styles.radioOuterSelected,
                    ]}
                  >
                    {selectedReason === reason.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={styles.reasonLabel}>{reason.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedReason === 'other' && (
              <TextInput
                style={styles.commentInput}
                placeholder="Опишите причину..."
                placeholderTextColor={colors.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
              />
            )}
          </ScrollView>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Назад</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                !selectedReason && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedReason}
            >
              <Text style={styles.confirmButtonText}>Отменить запись</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
