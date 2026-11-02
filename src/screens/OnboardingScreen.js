import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image,
  Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { saveUserProfile } from '../services/storage';
import i18n from '../services/i18n';

export default function OnboardingScreen({ navigation }) {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

  // Fotoğraf seçme işlemi
  const pickImage = async () => {
    // Kullanıcıdan galeri izni iste
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Hata", "Fotoğraf ekleyebilmek için galeri izni gereklidir.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Sadece resimler
      allowsEditing: true, // Kullanıcı fotoğrafı kırpabilsin
      aspect: [1, 1], // Kare formatta kırpılsın
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleFinish = async () => {
    if (!name.trim()) {
      Alert.alert("Eksik Bilgi", "Lütfen adınızı giriniz.");
      return;
    }

    // Bilgileri AsyncStorage'a kaydediyoruz
    const success = await saveUserProfile({
      name,
      surname,
      photo: photoUri,
      createdAt: new Date().toISOString()
    });

    if (success) {
      // Kayıt başarılıysa Ana uygulamaya (MainTabs) yönlendir
      navigation.replace('MainTabs');
    } else {
      Alert.alert("Hata", "Profil kaydedilirken bir sorun oluştu.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('welcome')}</Text>
      <Text style={styles.subtitle}>{i18n.t('onboarding_desc')}</Text>

      {/* Profil Fotoğrafı Seçimi */}
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📷</Text>
            <Text style={styles.imagePlaceholderTextSm}>Fotoğraf Ekle</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>{i18n.t('onboarding_ask_name')}</Text>
        <TextInput
          style={styles.input}
          placeholder={i18n.t('name_placeholder')}
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Soyadınız (İsteğe Bağlı)</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: Doe"
          placeholderTextColor="#888"
          value={surname}
          onChangeText={setSurname}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleFinish}>
        <Text style={styles.buttonText}>{i18n.t('start')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#aaaaaa',
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
    borderColor: '#ff9800',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ff9800',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 30,
  },
  imagePlaceholderTextSm: {
    color: '#888',
    fontSize: 12,
    marginTop: 5,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  label: {
    color: '#aaaaaa',
    marginBottom: 8,
    fontSize: 14,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2c2c2c',
  },
  button: {
    backgroundColor: '#ff9800',
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#121212',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
