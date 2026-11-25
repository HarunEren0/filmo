import React, { useEffect, useState, useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getUserProfile } from '../services/storage';
import { LanguageContext } from '../context/LanguageContext';
import { COLORS } from '../constants/theme';
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

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
  },
};

function MainTabs() {
  const insets = useSafeAreaInsets();
  // Dil değiştiğinde sekme başlıklarının anında güncellenmesi için context'i dinle
  useContext(LanguageContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: COLORS.surface, shadowColor: 'transparent' },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 5,
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
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
    const checkProfile = async () => {
      const profile = await getUserProfile();
      setHasProfile(Boolean(profile && profile.name));
      setIsLoading(false);
    };
    checkProfile();
  }, []);

  if (isLoading || !isLanguageLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  let initialRoute = 'LanguageSelection';
  if (language) {
    initialRoute = hasProfile ? 'MainTabs' : 'Onboarding';
  }

  return (
    <NavigationContainer theme={CustomDarkTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
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
        <Stack.Screen
          name="Details"
          component={DetailsScreen}
          options={{ title: i18n.t('view_details'), headerBackTitleVisible: false }}
        />
        <Stack.Screen
          name="CustomList"
          component={CustomListScreen}
          options={({ route }) => ({
            title: route.params?.listName || i18n.t('custom_list_default'),
            headerBackTitleVisible: false,
          })}
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
