import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from '../services/i18n';
import { setTMDBLanguage } from '../services/tmdb';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(null);
  const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem('app_language');
        if (storedLanguage) {
          setLanguage(storedLanguage);
          i18n.locale = storedLanguage;
          setTMDBLanguage(storedLanguage);
        }
      } catch (error) {
        console.error("Error loading language from storage", error);
      } finally {
        setIsLanguageLoaded(true);
      }
    };
    loadLanguage();
  }, []);

  const switchLanguage = async (langCode) => {
    try {
      await AsyncStorage.setItem('app_language', langCode);
      setLanguage(langCode);
      i18n.locale = langCode;
      setTMDBLanguage(langCode);
    } catch (error) {
      console.error("Error saving language", error);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, switchLanguage, isLanguageLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};
