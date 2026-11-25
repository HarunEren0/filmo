import React, { useState, useCallback, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import {
  getUserProfile,
  getWatchedMovies,
  getWatchlist,
  getCustomLists,
  createCustomList,
  getFavorites,
  updateUserProfile,
} from '../services/storage';
import { LanguageContext } from '../context/LanguageContext';
import { normalizePickerAssetUri } from '../utils/movieHelpers';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import BackupModal from '../components/BackupModal';
import i18n from '../services/i18n';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [watchedCount, setWatchedCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  const { language, switchLanguage } = useContext(LanguageContext);

  const [customLists, setCustomLists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Profil Düzenleme Modal State'leri
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editPhoto, setEditPhoto] = useState(null);

  // Yedekleme Modal State'i
  const [backupModalVisible, setBackupModalVisible] = useState(false);

  const loadProfile = useCallback(async () => {
    const [user, watched, planned, custom, favs] = await Promise.all([
      getUserProfile(),
      getWatchedMovies(),
      getWatchlist(),
      getCustomLists(),
      getFavorites(),
    ]);

    setProfile(user);
    setWatchedCount(watched.length);
    setWatchlistCount(planned.length);
    setCustomLists(custom);
    setFavoritesCount(favs.length);
    setTotalMinutes(watched.reduce((acc, m) => acc + (m.runtime || 110), 0));

    if (user) {
      setEditName(user.name);
      setEditSurname(user.surname || '');
      setEditPhoto(user.photo || null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  useEffect(() => {
    navigation.setOptions({ title: i18n.t('profile') });
  }, [navigation, language]);

  const totalHours = Math.floor(totalMinutes / 60);
  const totalWatchTimeText =
    totalHours >= 24
      ? `${(totalHours / 24).toFixed(1)} ${i18n.t('days_short')}`
      : `${totalHours} ${i18n.t('hours_short')}`;

  const handleCreateList = async () => {
    if (newListName.trim() === '') return;

    const newList = await createCustomList(newListName.trim());
    if (newList) {
      setCustomLists([...customLists, newList]);
      setNewListName('');
      setIsCreatingList(false);
    } else {
      Alert.alert(i18n.t('error'), i18n.t('list_create_error'));
    }
  };

  // Profil Fotoğrafı Seçme (kalıcı base64 data URI ile)
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(i18n.t('error'), i18n.t('gallery_permission_error'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      setEditPhoto(normalizePickerAssetUri(result.assets[0]));
    }
  };

  const handleSaveProfile = async () => {
    if (editName.trim() === '') {
      Alert.alert(i18n.t('error'), i18n.t('name_required'));
      return;
    }

    const updatedUser = await updateUserProfile({
      name: editName.trim(),
      surname: editSurname.trim(),
      photo: editPhoto,
    });

    if (updatedUser) {
      setProfile(updatedUser);
      setEditModalVisible(false);
    }
  };

  if (!profile) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#35230f', '#211b16', COLORS.surface]} style={styles.profileHeader}>
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => setEditModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('edit_profile')}
        >
          <Ionicons name="pencil" size={20} color={COLORS.text} />
        </TouchableOpacity>

        {profile.photo ? (
          <Image source={{ uri: profile.photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
        )}

        <Text style={styles.nameText}>
          {profile.name} {profile.surname}
        </Text>
        <View style={styles.memberRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.memberText}>
            {i18n.t('member_since')}{' '}
            {new Date(profile.createdAt).toLocaleDateString(language?.startsWith('en') ? 'en-US' : 'tr-TR')}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statBox}
          onPress={() => navigation.navigate('ListsTab', { activeTab: 'watched' })}
          accessibilityRole="button"
        >
          <Ionicons name="eye-outline" size={18} color={COLORS.primary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{watchedCount}</Text>
          <Text style={styles.statLabel}>{i18n.t('watched_movies')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statBox}
          onPress={() => navigation.navigate('ListsTab', { activeTab: 'watchlist' })}
          accessibilityRole="button"
        >
          <Ionicons name="bookmark-outline" size={18} color={COLORS.primary} style={styles.statIcon} />
          <Text style={styles.statNumber}>{watchlistCount}</Text>
          <Text style={styles.statLabel}>{i18n.t('watchlist')}</Text>
        </TouchableOpacity>

        <View style={styles.statBox}>
          <Ionicons name="time-outline" size={18} color={COLORS.primary} style={styles.statIcon} />
          <Text style={[styles.statNumber, styles.watchTimeNumber]}>{totalWatchTimeText}</Text>
          <Text style={styles.statLabel}>{i18n.t('total_watch_time')}</Text>
        </View>
      </View>

      {/* FAVORİLER KISAYOLU */}
      <View style={styles.favoritesSection}>
        <TouchableOpacity
          style={styles.favoritesCard}
          onPress={() =>
            navigation.navigate('CustomList', { listId: 'favorites', listName: i18n.t('favorites') })
          }
        >
          <View style={styles.listIconBox}>
            <Ionicons name="heart" size={24} color={COLORS.danger} />
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{i18n.t('favorites')}</Text>
            <Text style={styles.listCount}>
              {favoritesCount} {i18n.t('movies')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ÖZEL LİSTELER BÖLÜMÜ */}
      <View style={styles.customListsSection}>
        <View style={styles.customListsHeader}>
          <Text style={styles.sectionTitle}>{i18n.t('custom_lists')}</Text>
          <TouchableOpacity onPress={() => setIsCreatingList(!isCreatingList)}>
            <Ionicons name={isCreatingList ? 'close-circle' : 'add-circle'} size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {isCreatingList && (
          <View style={styles.createListForm}>
            <TextInput
              style={styles.createListInput}
              placeholder={i18n.t('list_name_placeholder')}
              placeholderTextColor={COLORS.textMuted}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
            <TouchableOpacity style={styles.createListButton} onPress={handleCreateList}>
              <Text style={styles.createListButtonText}>{i18n.t('create')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {customLists.length === 0 && !isCreatingList ? (
          <View style={styles.emptyCustomLists}>
            <Text style={styles.emptyText}>{i18n.t('list_empty')}</Text>
          </View>
        ) : (
          customLists.map((list) => (
            <TouchableOpacity
              key={list.id}
              style={styles.customListCard}
              onPress={() => navigation.navigate('CustomList', { listId: list.id, listName: list.name })}
            >
              <View style={styles.listIconBox}>
                <Ionicons name="film-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{list.name}</Text>
                <Text style={styles.listCount}>
                  {list.movies.length} {i18n.t('movies')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* VERİ YEDEKLEME */}
      <View style={[styles.customListsSection, { marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{i18n.t('data_backup')}</Text>
        <TouchableOpacity
          style={styles.favoritesCard}
          onPress={() => setBackupModalVisible(true)}
        >
          <View style={styles.listIconBox}>
            <Ionicons name="cloud-download-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{i18n.t('export_backup')}</Text>
            <Text style={styles.listCount}>{i18n.t('import_backup')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* AYARLAR - DİL SEÇİMİ */}
      <View style={[styles.customListsSection, { marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>{i18n.t('app_language')}</Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity
            style={[styles.langSwitchButton, language === 'tr-TR' && styles.langSwitchActive]}
            onPress={() => switchLanguage('tr-TR')}
          >
            <Text style={[styles.langSwitchText, language === 'tr-TR' && styles.langSwitchTextActive]}>
              Türkçe
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.langSwitchButton, language === 'en-US' && styles.langSwitchActive]}
            onPress={() => switchLanguage('en-US')}
          >
            <Text style={[styles.langSwitchText, language === 'en-US' && styles.langSwitchTextActive]}>
              English
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* Profil Düzenleme Modalı */}
      <Modal
        animationType="slide"
        transparent
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>{i18n.t('edit_profile')}</Text>

              <TouchableOpacity style={styles.photoPickerContainer} onPress={pickImage}>
                {editPhoto ? (
                  <Image source={{ uri: editPhoto }} style={styles.photoPickerImage} />
                ) : (
                  <View style={styles.photoPickerPlaceholder}>
                    <Ionicons name="camera" size={30} color={COLORS.textDark} />
                  </View>
                )}
                <Text style={styles.photoPickerText}>{i18n.t('change_photo')}</Text>
              </TouchableOpacity>

              <Text style={styles.label}>{i18n.t('first_name')}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('first_name')}
                placeholderTextColor={COLORS.textMuted}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.label}>{i18n.t('last_name')}</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('last_name')}
                placeholderTextColor={COLORS.textMuted}
                value={editSurname}
                onChangeText={setEditSurname}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.mButton, styles.mCancelButton]}
                  onPress={() => {
                    setEditModalVisible(false);
                    setEditName(profile.name);
                    setEditSurname(profile.surname || '');
                    setEditPhoto(profile.photo || null);
                  }}
                >
                  <Text style={styles.mButtonText}>{i18n.t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mButton, styles.mSaveButton]} onPress={handleSaveProfile}>
                  <Text style={styles.mSaveButtonText}>{i18n.t('save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <BackupModal
        visible={backupModalVisible}
        onClose={() => setBackupModalVisible(false)}
        onRestored={loadProfile}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: { paddingBottom: 24 },
  profileHeader: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingTop: 30,
    paddingBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#44311d',
    position: 'relative',
    overflow: 'hidden',
  },
  editProfileButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 10,
    borderRadius: 20,
    zIndex: 1,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLetter: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  nameText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  memberText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginLeft: 6,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 16,
    marginBottom: 14,
    paddingHorizontal: 20,
    gap: 9,
  },
  statBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 108,
    paddingHorizontal: 5,
    paddingVertical: 12,
  },
  statIcon: { marginBottom: 5 },
  statNumber: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  watchTimeNumber: { fontSize: 21 },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  favoritesSection: {
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 10,
  },
  customListsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  customListsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  createListForm: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  createListInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    color: COLORS.text,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
    fontSize: 15,
  },
  createListButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
  },
  createListButtonText: {
    color: COLORS.textDark,
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyCustomLists: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginBottom: 5,
  },
  customListCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  favoritesCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 15,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listIconBox: {
    width: 45,
    height: 45,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listCount: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
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
  photoPickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoPickerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginBottom: 8,
  },
  photoPickerPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoPickerText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
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
  langSwitchButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  langSwitchActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#2c1e0f',
  },
  langSwitchText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  langSwitchTextActive: {
    color: COLORS.primary,
  },
});
