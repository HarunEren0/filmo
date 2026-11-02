import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageContext } from '../context/LanguageContext';

export default function LanguageSelectionScreen({ navigation }) {
  const { switchLanguage } = useContext(LanguageContext);

  const handleSelectLanguage = async (langCode) => {
    await switchLanguage(langCode);
    // Seçim yapıldıktan sonra Onboarding'e (veya AppNavigator mantığına) yönlendir
    // AppNavigator'daki stack yapısında bu sayfa açılışsa, navigation.replace kullanılabilir
    navigation.replace('Onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Filmo</Text>
        <Text style={styles.subtitle}>Tercih Ettiğiniz Dili Seçin</Text>
        <Text style={styles.subtitleEn}>Select Your Preferred Language</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.langButton} 
            onPress={() => handleSelectLanguage('tr-TR')}
          >
            <Text style={styles.langButtonText}>Türkçe</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.langButton} 
            onPress={() => handleSelectLanguage('en-US')}
          >
            <Text style={styles.langButtonText}>English</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitleEn: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  langButton: {
    backgroundColor: '#1e1e1e',
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff9800',
    marginBottom: 16,
    alignItems: 'center',
  },
  langButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
