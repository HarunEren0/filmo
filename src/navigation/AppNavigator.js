import React, { useEffect, useState, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getUserProfile } from '../services/storage';
import { LanguageContext } from '../context/LanguageContext';
import i18n from '../services/i18n';

// Ekranlar
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ListsScreen from '../screens/ListsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DetailsScreen from '../screens/DetailsScreen';
import CustomListScreen from '../screens/CustomListScreen';
import ActorScreen from '../screens/ActorScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Koyu temamız
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#ff9800',
    background: '#121212',
    card: '#1e1e1e',
    text: '#ffffff',
    border: '#272727',
  },
};

// Alt Navigasyon Çubuğu (Bottom Tabs)
function MainTabs() {
  const insets = useSafeAreaInsets();
  // Tab isimlerinin dil değiştiğinde güncellenmesi için render esnasında i18n çağırıyoruz
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: '#1e1e1e', shadowColor: 'transparent' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: '#1e1e1e',
          borderTopColor: '#272727',
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 5,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: '#ff9800',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'HomeTab') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'SearchTab') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'ListsTab') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: i18n.t('home'), headerShown: false }} />
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: i18n.t('search') }} />
      <Tab.Screen name="ListsTab" component={ListsScreen} options={{ title: i18n.t('my_list') }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: i18n.t('profile') }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const { language, isLanguageLoaded } = useContext(LanguageContext);

  useEffect(() => {
    // Uygulama açıldığında profilin var olup olmadığını kontrol et
    const checkProfile = async () => {
      const profile = await getUserProfile();
      if (profile && profile.name) {
        setHasProfile(true);
      } else {
        setHasProfile(false);
      }
      setIsLoading(false);
    };
    checkProfile();
  }, []);

  if (isLoading || !isLanguageLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ff9800" />
      </View>
    );
  }

  let initialRoute = "LanguageSelection";
  if (language) {
    initialRoute = hasProfile ? "MainTabs" : "Onboarding";
  }

  return (
    <NavigationContainer theme={CustomDarkTheme}>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: { backgroundColor: '#1e1e1e' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen 
          name="LanguageSelection" 
          component={LanguageSelectionScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs} 
          options={{ headerShown: false }} 
        />
        {/* Detay ekranı tab bar'ın üstünde tam ekran çıkması için buraya eklendi */}
        <Stack.Screen 
          name="Details" 
          component={DetailsScreen} 
          options={{ title: 'Detaylar', headerBackTitleVisible: false }} 
        />
        <Stack.Screen 
          name="CustomList" 
          component={CustomListScreen} 
          options={({ route }) => ({ title: route.params?.listName || 'Özel Listem', headerBackTitleVisible: false })} 
        />
        <Stack.Screen 
          name="Actor" 
          component={ActorScreen} 
          options={{ headerBackTitleVisible: false }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
