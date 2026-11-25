import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { saveUserProfile } from '../services/storage';
import { normalizePickerAssetUri } from '../utils/movieHelpers';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import i18n from '../services/i18n';

export default function OnboardingScreen({ navigation }) {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

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
      setPhotoUri(normalizePickerAssetUri(result.assets[0]));
    }
  };

  const handleFinish = async () => {
    if (!name.trim()) {
      Alert.alert(i18n.t('missing_info'), i18n.t('name_required'));
      return;
    }

    const success = await saveUserProfile({
      name: name.trim(),
      surname: surname.trim(),
      photo: photoUri,
      createdAt: new Date().toISOString(),
    });

    if (success) {
      navigation.replace('MainTabs');
    } else {
      Alert.alert(i18n.t('error'), i18n.t('profile_save_error'));
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.title}>{i18n.t('welcome')}</Text>
      <Text style={styles.subtitle}>{i18n.t('onboarding_desc')}</Text>

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷</Text>
            <Text style={styles.imagePlaceholderTextSm}>{i18n.t('add_photo')}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{i18n.t('onboarding_ask_name')}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('name_placeholder')}
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>{i18n.t('surname_optional')}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('surname_placeholder')}
          placeholderTextColor={COLORS.textMuted}
          value={surname}
          onChangeText={setSurname}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleFinish}>
        <Text style={styles.buttonText}>{i18n.t('start')}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  imagePicker: {
    marginBottom: 30,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 30,
  },
  imagePlaceholderTextSm: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 5,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontSize: 14,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    backgroundColor: COLORS.primary,
    width: '100%',
    padding: 16,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.textDark,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
