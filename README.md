# Example Project

A habit tracker built with Expo SDK 54 and React Native 0.81. Track daily habits, count-based goals, streaks, and take on time-boxed challenges.

## Features

- **Daily & quantity habits** -- toggle check-ins or track counted goals (e.g. "drink 8 glasses of water")
- **Streaks & consistency** -- current streak, best streak, and per-habit consistency percentages
- **Challenges** -- create 3/7/14/30-day challenges across selected habits with automatic completion detection
- **History dashboard** -- calendar heatmap and consistency charts
- **Reminders** -- per-habit daily notifications at custom times (native only)
- **Sound & haptics** -- completion sounds and haptic feedback
- **Onboarding flow** -- guided first-launch setup with suggested habits and a starter challenge
- **Dark mode** -- automatic light/dark theming

## Getting Started

```bash
npm install
npx expo start
```

Then open in Expo Go, a simulator, or a development build:

- `npm run ios` -- iOS simulator
- `npm run android` -- Android emulator
- `npm run web` -- browser

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run lint` | Lint with ESLint (flat config) |
| `npx tsc --noEmit` | Type check |
| `npm run reset-project` | Reset to blank app scaffold |

## Tech Stack

- **Expo SDK 54** with New Architecture and React Compiler enabled
- **expo-router** for file-based routing
- **React Navigation** bottom tabs (Today, History, Manage)
- **AsyncStorage** for persistence
- **expo-notifications** for reminders
- **expo-av** / Web Audio API for sound effects
- **expo-haptics** for tactile feedback
