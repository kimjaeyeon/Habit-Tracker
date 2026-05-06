# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Start dev server:** `npx expo start` (or `npm start`)
- **Platform-specific:** `npm run ios`, `npm run android`, `npm run web`
- **Lint:** `npm run lint` (uses `expo lint` with flat ESLint config)
- **Type check:** `npx tsc --noEmit`
- **No test runner configured.**

## Architecture

Expo SDK 54 + React Native 0.81 habit tracker using expo-router (file-based routing) with React Navigation. New Architecture enabled, React Compiler enabled.

**Routing:** `app/` directory uses expo-router. `(tabs)/` group provides bottom tab navigation with three tabs: Today (`index.tsx`), History (`history.tsx`), and Manage (`explore.tsx`). A `challenge-complete.tsx` route is presented modally from the root stack. `onboarding.tsx` is a full-screen flow shown on first launch (gated by `onboarding_complete` key in AsyncStorage).

**State:** Two React Contexts wrap the app in the root layout (`app/_layout.tsx`):
- `HabitProvider` (`context/habits.tsx`) — habit CRUD, two habit types (`daily` toggle and `quantity` increment/decrement), completions stored as `Record<habitId, Record<dateStr, count>>`, streak/consistency calculations. Exposes `useHabits()`.
- `ChallengeProvider` (`context/challenges.tsx`) — time-boxed challenges over selected habits. Auto-detects completion from completion data and triggers the challenge-complete modal. Exposes `useChallenges()`. Depends on `HabitProvider` (must be nested inside it).

Both contexts persist to AsyncStorage and include migration functions for schema changes.

**Theming:** `constants/theme.ts` defines light/dark color tokens (`Colors`) and platform-specific font stacks (`Fonts`). Components use `useThemeColor()` hook and themed wrappers (`ThemedText`, `ThemedView`) rather than raw RN primitives.

**Utilities:** `utils/notifications.ts` wraps `expo-notifications` for per-habit daily reminders (no-ops on web). `utils/sounds.ts` uses `expo-av` on native and Web Audio API on web for completion/celebration sound effects.

**Path aliases:** `@/*` maps to project root (configured in `tsconfig.json`).
