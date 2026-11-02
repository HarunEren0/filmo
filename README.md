# Filmo

Filmo is a personal movie discovery and watch-tracking app built with React Native and Expo. Browse films, search for movies and actors, view movie details, and manage watched, watchlist, favorites, and custom lists. Profile data, preferences, and lists are stored locally on the device.

## Tech stack

- React Native and Expo
- React Navigation
- TMDB API for movie and actor data
- AsyncStorage for local profile and list data
- Turkish and English interface

## Requirements

- Node.js and npm
- An Expo-compatible device or simulator
- A TMDB API key from [the TMDB API settings](https://www.themoviedb.org/settings/api)

## Setup

1. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/HarunEren0/filmo.git
   cd filmo
   npm install
   ```

2. Create a local environment file and add your TMDB API key:

   ```sh
   cp .env.example .env
   ```

   Set `EXPO_PUBLIC_TMDB_API_KEY` in `.env` to your own key. Environment variables prefixed with `EXPO_PUBLIC_` are included in the client app bundle, so treat the key as public when distributing builds and rotate it if it is exposed.

3. Start Expo:

   ```sh
   npm start
   ```

Use the Expo terminal options to open the app on Android, iOS, or web.

## Useful commands

```sh
npm run android  # Start on Android
npm run ios      # Start on iOS
npm run web      # Start on web
npm run doctor   # Check Expo project configuration
npm run verify   # Export Android and iOS bundles
```

## Data and attribution

Filmo does not use account sign-in or cloud sync. Your profile and lists stay in the app's local storage and are not automatically transferred to another device.

This product uses the TMDB API but is not endorsed or certified by TMDB. Movie data and images are provided by [TMDB](https://www.themoviedb.org/).
