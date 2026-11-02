import React, { useState, useCallback, useContext } from 'react';
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
  updateUserProfile
} from '../services/storage';
import { LanguageContext } from '../context/LanguageContext';
import i18n from '../services/i18n';

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [watchedCount, setWatchedCount] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [totalWatchTimeText, setTotalWatchTimeText] = useState('0 Sa');
  
  const { language, switchLanguage } = useContext(LanguageContext);
  
  const [customLists, setCustomLists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Profil Düzenleme Modal State'leri
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSurname, setEditSurname] = useState('');
  const [editPhoto, setEditPhoto] = useState(null);

  const loadProfile = async () => {
    const user = await getUserProfile();
    const watched = await getWatchedMovies();
    const planned = await getWatchlist();
    const custom = await getCustomLists();
    const favs = await getFavorites();
    
    setProfile(user);
    setWatchedCount(watched.length);
    setWatchlistCount(planned.length);
    setCustomLists(custom);
    setFavoritesCount(favs.length);

    // Toplam izleme süresini hesapla
    const totalMinutes = watched.reduce((acc, m) => acc + (m.runtime || 110), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours >= 24) {
      const days = (totalHours / 24).toFixed(1);
      setTotalWatchTimeText(`${days} ${i18n.t('days_short')}`);
    } else {
      setTotalWatchTimeText(`${totalHours} ${i18n.t('hours_short')}`);
    }
    
    if (user) {
      setEditName(user.name);
      setEditSurname(user.surname);
      setEditPhoto(user.photo);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

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

  // Profil Fotoğrafı Seçme
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setEditPhoto(result.assets[0].uri);
    }
  };

  // Profili Kaydet
  const handleSaveProfile = async () => {
    if (editName.trim() === '') {
      Alert.alert(i18n.t('error'), i18n.t('name_required'));
      return;
    }
    
    const updatedUser = await updateUserProfile({
      name: editName,
      surname: editSurname,
      photo: editPhoto
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
      <LinearGradient colors={['#35230f', '#211b16', '#1e1e1e']} style={styles.profileHeader}>
        {/* Ayarlar / Düzenle Butonu */}
        <TouchableOpacity 
          style={styles.editProfileButton} 
          onPress={() => setEditModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('edit_profile')}
        >
          <Ionicons name="pencil" size={20} color="#121212" />
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
          <Ionicons name="calendar-outline" size={14} color="#aaa" />
          <Text style={styles.memberText}>
            {i18n.t('member_since')} {new Date(profile.createdAt).toLocaleDateString(language?.startsWith('en') ? 'en-US' : 'tr-TR')}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={styles.statBox} 
          onPress={() => navigation.navigate('ListsTab', { activeTab: 'watched' })}
          accessibilityRole="button"
        >
          <Ionicons name="eye-outline" size={18} color="#ff9800" style={styles.statIcon} />
          <Text style={styles.statNumber}>{watchedCount}</Text>
          <Text style={styles.statLabel}>{i18n.t('watched_movies')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statBox}
          onPress={() => navigation.navigate('ListsTab', { activeTab: 'watchlist' })}
          accessibilityRole="button"
        >
          <Ionicons name="bookmark-outline" size={18} color="#ff9800" style={styles.statIcon} />
          <Text style={styles.statNumber}>{watchlistCount}</Text>
          <Text style={styles.statLabel}>{i18n.t('watchlist')}</Text>
        </TouchableOpacity>

        <View style={styles.statBox}>
          <Ionicons name="time-outline" size={18} color="#ff9800" style={styles.statIcon} />
          <Text style={[styles.statNumber, styles.watchTimeNumber]}>{totalWatchTimeText}</Text>
          <Text style={styles.statLabel}>{i18n.t('total_watch_time')}</Text>
        </View>
      </View>

      {/* FAVORİLER KISAYOLU */}
      <View style={styles.favoritesSection}>
        <TouchableOpacity 
          style={styles.favoritesCard}
          onPress={() => navigation.navigate('CustomList', { listId: 'favorites', listName: i18n.t('favorites') })}
        >
          <View style={styles.listIconBox}>
            <Ionicons name="heart" size={24} color="#ff4444" />
          </View>
          <View style={styles.listInfo}>
            <Text style={styles.listName}>{i18n.t('favorites')}</Text>
            <Text style={styles.listCount}>{favoritesCount} {i18n.t('movies')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#888" />
        </TouchableOpacity>
      </View>

      {/* ÖZEL LİSTELER BÖLÜMÜ */}
      <View style={styles.customListsSection}>
        <View style={styles.customListsHeader}>
          <Text style={styles.sectionTitle}>{i18n.t('custom_lists')}</Text>
          <TouchableOpacity onPress={() => setIsCreatingList(!isCreatingList)}>
            <Ionicons name={isCreatingList ? "close-circle" : "add-circle"} size={28} color="#ff9800" />
          </TouchableOpacity>
        </View>

        {isCreatingList && (
          <View style={styles.createListForm}>
            <TextInput
              style={styles.createListInput}
              placeholder={i18n.t('list_name_placeholder')}
              placeholderTextColor="#888"
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
                <Ionicons name="film-outline" size={24} color="#ff9800" />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>{list.name}</Text>
                <Text style={styles.listCount}>{list.movies.length} {i18n.t('movies')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#888" />
            </TouchableOpacity>
          ))
        )}
      </View>
      
      {/* AYARLAR - DİL SEÇİMİ */}
      <View style={[styles.customListsSection, { marginTop: 20 }]}>
        <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>{i18n.t('app_language')}</Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity 
            style={[styles.langSwitchButton, language === 'tr-TR' && styles.langSwitchActive]}
            onPress={() => switchLanguage('tr-TR')}
          >
            <Text style={[styles.langSwitchText, language === 'tr-TR' && styles.langSwitchTextActive]}>Türkçe</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.langSwitchButton, language === 'en-US' && styles.langSwitchActive]}
            onPress={() => switchLanguage('en-US')}
          >
            <Text style={[styles.langSwitchText, language === 'en-US' && styles.langSwitchTextActive]}>English</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />

      {/* Profil Düzenleme Modalı */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalScrollContent}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{i18n.t('edit_profile')}</Text>
            
            <TouchableOpacity style={styles.photoPickerContainer} onPress={pickImage}>
              {editPhoto ? (
                <Image source={{ uri: editPhoto }} style={styles.photoPickerImage} />
              ) : (
                <View style={styles.photoPickerPlaceholder}>
                  <Ionicons name="camera" size={30} color="#121212" />
                </View>
              )}
              <Text style={styles.photoPickerText}>{i18n.t('change_photo')}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>{i18n.t('first_name')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('first_name')}
              placeholderTextColor="#888"
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.label}>{i18n.t('last_name')}</Text>
            <TextInput
              style={styles.input}
              placeholder={i18n.t('last_name')}
              placeholderTextColor="#888"
              value={editSurname}
              onChangeText={setEditSurname}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.mButton, styles.mCancelButton]} onPress={() => {
                setEditModalVisible(false);
                setEditName(profile.name);
                setEditSurname(profile.surname);
                setEditPhoto(profile.photo);
              }}>
                <Text style={styles.mButtonText}>{i18n.t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mButton, styles.mSaveButton]} onPress={handleSaveProfile}>
                <Text style={styles.mButtonText}>{i18n.t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
    borderColor: '#ff9800',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#ff9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLetter: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#121212',
  },
  nameText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  memberText: {
    color: '#aaaaaa',
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
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 108,
    paddingHorizontal: 5,
    paddingVertical: 12,
  },
  statIcon: { marginBottom: 5 },
  statNumber: {
    color: '#ff9800',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  watchTimeNumber: { fontSize: 21 },
  statLabel: {
    color: '#aaaaaa',
    fontSize: 12,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#2c2c2c',
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
    color: '#ffffff',
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
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
    fontSize: 15,
  },
  createListButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  createListButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyCustomLists: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  emptyText: {
    color: '#aaaaaa',
    fontSize: 15,
    marginBottom: 5,
  },
  emptySubText: {
    color: '#ff9800',
    fontSize: 13,
  },
  customListCard: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  favoritesCard: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  listIconBox: {
    width: 45,
    height: 45,
    backgroundColor: '#2c2c2c',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  listCount: {
    color: '#888',
    fontSize: 13,
  },
  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
  modalView: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  modalTitle: {
    color: '#ffffff',
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
    borderColor: '#ff9800',
    marginBottom: 8,
  },
  photoPickerPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ff9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoPickerText: {
    color: '#ff9800',
    fontSize: 14,
    fontWeight: 'bold',
  },
  label: {
    color: '#aaaaaa',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#2c2c2c',
    color: '#ffffff',
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: 'center',
  },
  mCancelButton: {
    backgroundColor: '#333333',
    marginRight: 8,
  },
  mSaveButton: {
    backgroundColor: '#ff9800',
    marginLeft: 8,
  },
  mButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  langSwitchButton: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2c2c2c',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  langSwitchActive: {
    borderColor: '#ff9800',
    backgroundColor: '#2c1e0f', // slightly orange tinted dark background
  },
  langSwitchText: {
    color: '#aaaaaa',
    fontWeight: 'bold',
  },
  langSwitchTextActive: {
    color: '#ff9800',
  }
});
