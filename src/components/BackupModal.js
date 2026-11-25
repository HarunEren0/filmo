import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Share,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exportBackupData, importBackupData } from '../services/storage';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import i18n from '../services/i18n';

export default function BackupModal({ visible, onClose, onRestored }) {
  const [mode, setMode] = useState('export'); // 'export' | 'import'
  const [exportedJson, setExportedJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const payload = await exportBackupData();
      const jsonString = JSON.stringify(payload, null, 2);
      setExportedJson(jsonString);
      await Share.share({
        message: jsonString,
        title: 'Filmo Backup JSON',
      });
    } catch {
      Alert.alert(i18n.t('error'), i18n.t('backup_export_error'));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!importJson.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('backup_import_error'));
      return;
    }

    setBusy(true);
    const result = await importBackupData(importJson.trim());
    setBusy(false);

    if (result.success) {
      setImportJson('');
      Alert.alert(i18n.t('data_backup'), i18n.t('backup_import_success'));
      onRestored?.();
      onClose();
    } else {
      Alert.alert(i18n.t('error'), i18n.t('backup_import_error'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>{i18n.t('data_backup')}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.description}>{i18n.t('backup_desc')}</Text>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'export' && styles.tabActive]}
                onPress={() => setMode('export')}
              >
                <Text style={[styles.tabText, mode === 'export' && styles.tabTextActive]}>
                  {i18n.t('export_backup')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'import' && styles.tabActive]}
                onPress={() => setMode('import')}
              >
                <Text style={[styles.tabText, mode === 'import' && styles.tabTextActive]}>
                  {i18n.t('import_backup')}
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'export' ? (
              <View>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleExport}
                  disabled={busy}
                >
                  <Ionicons name="share-outline" size={20} color={COLORS.textDark} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>{i18n.t('export_backup')}</Text>
                </TouchableOpacity>

                {exportedJson ? (
                  <View style={styles.previewBox}>
                    <Text style={styles.previewHint}>{i18n.t('backup_generated')}</Text>
                    <TextInput
                      style={styles.jsonInput}
                      value={exportedJson}
                      multiline
                      editable={false}
                      selectTextOnFocus
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.jsonInput}
                  value={importJson}
                  onChangeText={setImportJson}
                  multiline
                  placeholder={i18n.t('backup_paste_placeholder')}
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleImport}
                  disabled={busy}
                >
                  <Ionicons name="cloud-upload-outline" size={20} color={COLORS.textDark} style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>{i18n.t('backup_import_button')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: 8,
  },
  primaryButtonText: {
    color: COLORS.textDark,
    fontWeight: 'bold',
    fontSize: 15,
  },
  previewBox: {
    marginTop: 14,
  },
  previewHint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  jsonInput: {
    backgroundColor: COLORS.background,
    color: COLORS.text,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 12,
    minHeight: 140,
    maxHeight: 220,
    textAlignVertical: 'top',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
});
