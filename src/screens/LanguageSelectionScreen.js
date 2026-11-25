import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageContext } from '../context/LanguageContext';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

export default function LanguageSelectionScreen({ navigation }) {
  const { switchLanguage } = useContext(LanguageContext);

  const handleSelectLanguage = async (langCode) => {
    await switchLanguage(langCode);
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
    backgroundColor: COLORS.background,
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
    color: COLORS.primary,
    marginBottom: 40,
  },
  subtitle: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitleEn: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  langButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: 18,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 16,
    alignItems: 'center',
  },
  langButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
