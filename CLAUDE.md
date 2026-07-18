# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Start dev server:** `npx expo start` (or `npm start`)
- **Platform-specific:** `npm run ios`, `npm run android`, `npm run web`
- **Lint:** `npm run lint` (uses `expo lint` with flat ESLint config)
- **Type check:** `npx tsc --noEmit`
- **No test runner configured.**

## Architecture

Expo SDK 54 + React Native 0.81 habit tracker using expo-router (file-based routing) with React Navigation. New Architecture enabled, React Compiler enabled. User-facing UI is Korean; runs on iOS, Android, and web (`react-native-web`).

**Routing:** `app/` directory uses expo-router. `(tabs)/` group provides bottom tab navigation with three tabs: Today (`index.tsx`), History (`history.tsx`), and Manage (`explore.tsx`). A `challenge-complete.tsx` route is presented modally from the root stack. `onboarding.tsx` is a full-screen flow shown on first launch (gated by `onboarding_complete` key in AsyncStorage).

**State:** Two React Contexts wrap the app in the root layout (`app/_layout.tsx`):
- `HabitProvider` (`context/habits.tsx`) — habit CRUD, two habit types (`daily` toggle and `quantity` increment/decrement), completions stored as `Record<habitId, Record<dateStr, count>>`, streak/consistency calculations. Exposes `useHabits()`.
- `ChallengeProvider` (`context/challenges.tsx`) — time-boxed challenges over selected habits. Auto-detects completion from completion data and triggers the challenge-complete modal. Exposes `useChallenges()`. Depends on `HabitProvider` (must be nested inside it).

Both contexts persist to AsyncStorage and include migration functions for schema changes.

**Theming:** `constants/theme.ts` defines light/dark color tokens (`Colors`) and platform-specific font stacks (`Fonts`). Components use `useThemeColor()` hook and themed wrappers (`ThemedText`, `ThemedView`) rather than raw RN primitives.

**Utilities:** `utils/notifications.ts` wraps `expo-notifications` for per-habit daily reminders (no-ops on web). `utils/sounds.ts` uses `expo-av` on native and Web Audio API on web for completion/celebration sound effects.

**Path aliases:** `@/*` maps to project root (configured in `tsconfig.json`).

## Conventions & gotchas

- **Korean UI, English internals.** All user-visible strings are Korean (friendly, encouraging "transcreation" — not literal translation; see `docs/superpowers/specs/2026-07-17-korean-localization-tone-revision.md`). Everything internal stays English: identifiers, AsyncStorage keys, `HabitType` values (`'daily'`/`'quantity'`), and `YYYY-MM-DD` date strings. Default seeded habits are Korean (`DEFAULT_HABITS` in `context/habits.tsx`). Dates are *displayed* via the `ko-KR` locale but *stored* as ISO `YYYY-MM-DD`.
- **Dates are UTC-based (known bug).** `getToday()` in both contexts uses `new Date().toISOString()`, so "today" is a UTC date. In KST (UTC+9) this rolls the day over at 09:00, mis-attributing completions between midnight–09:00. All streak, consistency, and challenge-progress math keys off this. **Deliberately left unfixed** — out of scope for localization work; do not "fix" it incidentally. Stored `YYYY-MM-DD` strings are re-parsed as local time via `+ 'T00:00:00'` when doing day-difference math.
- **AsyncStorage keys:** `habits`, `completions`, `challenges`, `onboarding_complete`. Each context seeds state, then hydrates from storage on mount behind a `loaded` flag (writes are suppressed until `loaded` is true to avoid clobbering stored data with defaults). Reads run through migration functions (`migrateHabits`, `migrateCompletions`) — extend these when changing a persisted schema rather than breaking old data.
- **Dev-only affordances:** `simulateCompletions` (habits) and `forceComplete` (challenges) exist purely to seed/test state and are surfaced under 개발자 도구 (Dev Tools) in the Manage tab. Not production features.
- **Challenge model:** effectively one active challenge at a time (`activeChallenge` picks the first in-progress, else the first completed-but-unclaimed). Completion is auto-detected by an effect in `context/challenges.tsx` that recounts fully-completed days; hitting `durationDays` flips `isComplete` and triggers the `challenge-complete` modal.

## 세션 로그

### 2026-06-24 — 코드베이스 분석

폴더 전체 구조/핵심 로직을 분석함 (구현 변경 없음, 리뷰만).

**리뷰에서 발견한 잠재 이슈 (우선순위순):**

1. **날짜 처리가 UTC 기준 (`toISOString()`)** — `context/habits.tsx`의 `getToday()` 등. 한국(UTC+9)처럼 시차 큰 지역에서 **자정~오전 9시 사이 "오늘"이 어제로 잡히는** 버그 가능. 스트릭·일관성·챌린지 진행도 계산 전반에 영향. → 가장 먼저 검토할 항목.
2. **챌린지 완료 감지 effect** (`context/challenges.tsx:87-121`) — `challengesRef.current`를 읽고 deps는 `[completions, loaded, habits]`. 챌린지 막 추가됐을 때 즉시 재평가 안 되는 엣지 케이스 점검 필요.
3. **에러 무시** — habits 로드 시 `catch {}`로 조용히 삼킴 (`context/habits.tsx:98`). 마이그레이션 실패 디버깅 어려움.
4. **테스트 부재** — 스트릭/일관성/챌린지 등 순수 계산 로직 다수인데 단위 테스트 없음. 회귀 위험. 테스트하기 좋은 후보.

**다음 할 일 (사용자가 방향 선택 대기 중):**
- [ ] UTC 날짜 이슈 상세 리뷰 (로컬 타임존 기반 `getToday()` 설계 제안)
- [ ] 스트릭/일관성 계산 로직 정밀 검토
- [ ] (선택) 신규 기능 브레인스토밍

> 역할 분담: 실제 코드 작성은 사용자가 Codex로 진행. Claude는 설계·리뷰·브레인스토밍 산출물만 제공.

### 2026-06-28 — Expo Go 실행 + 한국어화 설계

**한 일:**
1. **Expo Go로 앱 실행 성공** — 카페 Wi-Fi라 LAN 모드 불가 → **USB(`adb reverse tcp:8081 tcp:8081`) + localhost** 방식으로 갤럭시 S24+(SM-S936N)에 띄움. `npm install`로 의존성 설치 완료(node_modules 존재).
   - 실행 시 `expo-notifications`(Expo Go에서 원격 푸시 미지원, SDK53+), `expo-av` deprecated 경고 발생 → **앱 동작엔 무관**(로컬 리마인더만 사용). 알림 완전 테스트는 추후 dev build 권장.
2. **한국어화 설계 완료 → 스펙 커밋** — 방식 A(통째 한글 교체, i18n 없음). UI 노출 문자열만 번역, 내부 식별자/저장 키/`HabitType` 값/`YYYY-MM-DD`는 영어 유지. 날짜 표시는 `ko-KR` 로케일.
   - 📄 스펙: `docs/superpowers/specs/2026-06-28-korean-localization-design.md` (master에 커밋됨). 파일별 영→한 번역 표 전부 포함.
   - **UTC `getToday()` 버그는 의도적으로 한국어화 범위에서 제외**(별건, 위 2026-06-24 항목 #1 참고).

**다음 할 일:**
- [ ] **Codex가 위 스펙대로 한국어화 구현** → 끝나면 Claude가 코드 리뷰(번역 누락 / 안 건드릴 것 건드림 / tsc·lint)
- [ ] (별건) UTC 날짜 버그 수정 — 한국어화 완료 후
- [ ] (참고) 세션 종료 시 Expo 서버/`adb reverse` 정리함. 다음에 다시 USB로 띄우려면: USB 디버깅 허용 → `adb reverse tcp:8081 tcp:8081` → `npx expo start --android --localhost`

### 2026-07-17 — 한국어 감성 현지화(Codex 완료) + 웹 실행 + UX 개선 브레인스토밍(진행중)

**한 일:**
1. **코드베이스 구조를 TS 초심자에게 설명** — 폴더 역할, TS 개념, 재사용 패턴(테마/Context+AsyncStorage 등).
2. **웹(크롬)으로 앱 실행 성공** — `npm run web` → `http://localhost:8081`. Fast Refresh 확인. (핸드폰 전에 웹으로 먼저 확인하는 흐름.)
3. **한국어화 방향 재정의: 직역 → "친근·따뜻한 응원" 감성 현지화(transcreation)**. deep-interview로 톤 확정(존댓말, 다정한 코치).
   - 📄 개정 스펙: `docs/superpowers/specs/2026-07-17-korean-localization-tone-revision.md` (전체 재보이스 표 + 보이스 가이드)
   - 📄 Codex 지침: `docs/superpowers/specs/2026-07-17-korean-localization-CODEX-instructions.md`
   - 기존 `2026-06-28-*` 두 문서는 "대체됨(SUPERSEDED)" 배너 부착.
4. **Codex가 한국어화 구현 + 커밋(`1f011ac`)** — 8개 파일 84줄± 순수 문자열 교체. `calendar-heatmap.tsx`·개발자도구 버튼까지 빠짐없이. 크롬 검증: 온보딩/오늘/관리 전부 한글, `ko-KR` 날짜("7월 17일 …"), 콘솔 에러 0.
   - ⚠️ 커밋 메시지가 `Localiz)`로 깨짐 → `git commit --amend` 필요.
5. **UX 진단(첫 사용자가 어렵다):** ① 온보딩 과부하(써보기 전 기능4개+습관3개 강제+챌린지 강권) ② **관리 탭 과밀**(습관추가+목록+챌린지생성+개발자도구가 한 화면) ③ **개발자 도구가 실사용 화면에 노출** ④ 오늘 탭 상호작용 혼재(토글 vs +/− 카운터).
6. **브레인스토밍 시작(진행중, superpowers:brainstorming):** 습관 관리 ↔ 챌린지 **분리**. 챌린지 모델 확인 — `activeChallenge` 사실상 1개, **완료 챌린지는 저장되나 화면 미노출**(숨은 기능 → 성취/기록 화면 여지).

**결정사항:**
- 한국어화 범위 = **UI 현지화만**. UTC 날짜 버그 · i18n = **보류**.
- 톤 = **친근·따뜻한 응원(존댓말)**.

**다음 할 일:**
- [ ] **(대기) Claude가 Codex 커밋 `1f011ac` 코드 리뷰** — 하드룰 위반(저장키/로직/`HabitType`/`id`), 번역 누락, 조사 어색함, `tsc`·`lint`.
- [ ] 깨진 커밋 메시지 수정 → `Localize UI to Korean (friendly tone)`.
- [ ] **브레인스토밍 이어가기** — 습관/챌린지 분리 구조. **다음 질문 = "챌린지가 핵심 기능인가 보조 기능인가"**(전용 탭 vs 습관에 딸린 작은 형태). 표면적 게이트(탭 5–7개) 고려. 접근법 2–3개 제안 → 설계안 → 스펙 → (Codex 구현).
- [ ] (함께 논의) 온보딩 다이어트 / 개발자 도구 숨기기 / 오늘 탭 상호작용 통일.
- [ ] (별건·보류) UTC 날짜 버그 수정.

**참고:**
- 웹 개발 서버는 백그라운드 실행 중이었음(세션 종료 시 정리됨). 재실행: `npm run web` → 크롬 `http://localhost:8081`. 크롬 직접 실행: `Start-Process chrome http://localhost:8081`.
- 한국어 기본 습관 확인: 관리 탭 → 개발자 도구 → "온보딩 초기화" 또는 "모든 데이터 삭제"(기존 캐시가 영어일 수 있음).
