import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import i18n from '../services/i18n';

export default function WatchRatingModal({
  visible,
  isEditing,
  rating,
  review,
  onChangeRating,
  onChangeReview,
  onSave,
  onRemove,
  onClose,
}) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            {isEditing ? i18n.t('edit_watched') : i18n.t('rate_movie')}
          </Text>

          <Text style={styles.label}>{i18n.t('rating_label')}</Text>
          <View style={styles.ratingGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.ratingButton, Number(rating) === num && styles.ratingButtonActive]}
                onPress={() => onChangeRating(Number(rating) === num ? '' : num)}
              >
                <Text
                  style={[
                    styles.ratingButtonText,
                    Number(rating) === num && styles.ratingButtonTextActive,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{i18n.t('review_label')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={4}
            placeholder={i18n.t('review_placeholder')}
            placeholderTextColor={COLORS.textMuted}
            value={review}
            onChangeText={onChangeReview}
            maxLength={1000}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.mButton, styles.mCancelButton]} onPress={onClose}>
              <Text style={styles.mButtonText}>{i18n.t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mButton, styles.mSaveButton]} onPress={onSave}>
              <Text style={styles.mSaveButtonText}>{i18n.t('save')}</Text>
            </TouchableOpacity>
          </View>

          {isEditing && onRemove ? (
            <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
              <Text style={styles.removeButtonText}>{i18n.t('remove_from_watched')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalView: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.text,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  ratingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ratingButton: {
    width: '18%',
    aspectRatio: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingButtonActive: {
    backgroundColor: COLORS.primary,
  },
  ratingButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingButtonTextActive: {
    color: COLORS.textDark,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  mButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  mCancelButton: {
    backgroundColor: COLORS.surfaceHover,
    marginRight: 8,
  },
  mSaveButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  mButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  mSaveButtonText: {
    color: COLORS.textDark,
    fontWeight: 'bold',
    fontSize: 16,
  },
  removeButton: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.dangerLight,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  removeButtonText: {
    color: COLORS.danger,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
