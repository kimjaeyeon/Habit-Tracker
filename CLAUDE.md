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

### 2026-07-18 — /init 정리 + GitHub 공개 push + Supabase 통합 브레인스토밍(진행중)

**한 일:**
1. **`/init`** — 프로젝트 `CLAUDE.md`에 "Conventions & gotchas" 섹션 추가(한글 UI vs 영어 내부값, UTC `getToday()` 날짜 버그, AsyncStorage 키·마이그레이션, 개발자도구, 챌린지 모델). Commands/Architecture는 코드 대조 후 정확함 확인.
2. **크롬 실행 검증** — `npm run web` → `http://localhost:8081`. 한글 UI·`ko-KR` 날짜·기본 습관 5개 정상, 콘솔 에러 0(무해 경고 3개). (`CI=1`이라 핫리로드 꺼짐, 이후 서버 종료됨.)
3. **GitHub 저장소 생성 + push** — 기존 `origin`이 **남의 저장소 `nickjwells/Habit-Tracker`**(강의/템플릿 기반)를 가리키고 있었음 → 사용자 저장소 **`kimjaeyeon/Habit-Tracker`(Public)** 로 교체. 세션 잡파일(`.omc/`, `.playwright-mcp/`, `habit-tracker-web.png`) `.gitignore` 처리. 문서 커밋(`2c565bf`) 후 **전체 히스토리 push**. (GCM 브라우저 로그인, 낡은 자격증명 먼저 삭제.)
   - ⚠️ 깨진 커밋 메시지 `1f011ac "Localiz)"` 원격에 그대로 있음("그냥 push" 요청). 수정하려면 히스토리 재작성+force push(솔로 새 저장소라 안전).
   - ⚠️ Public이므로 세션 로그·`docs/superpowers/specs`가 공개됨(사용자 동의함).
4. **현재 Supabase 미연동 확인** — AsyncStorage 전용, 백엔드·계정 없음.
5. **Supabase 통합 브레인스토밍 시작**(superpowers:brainstorming). 요청받은 기능 = DB + 로컬 캐싱(빠릿함) + 사용자 인증.

**결정사항:**
- 핵심 원칙: **오프라인 우선(optimistic) + 백그라운드 동기화.** 지금의 "빠릿함"은 로컬 즉시 쓰기에서 나오므로, 토글마다 네트워크 `await` 금지. 로컬 캐시가 즉시 소스, Supabase는 뒤에서 동기화.
- 3개 하위시스템(**인증 / 클라우드 DB+RLS / 오프라인 동기화**)으로 분해, 각각 스펙→계획→Codex 구현.
- **빌드 순서: 인증부터.**
- **로그인 방식: 이메일 + 비밀번호**(Expo Go에서 딥링크/리다이렉트 설정 불필요, 가장 간단).
- 보안(Public 저장소): `anon key`는 클라이언트 OK(단 **RLS** 필수), **`service_role key` 커밋 금지**, `.env`는 gitignore.

**다음 할 일 (여기서 재개):**
- [ ] **인증 브레인스토밍 이어가기** — 남은 질문: (Q2) 로그인 필수(앱 전체 게이팅) vs 게스트 모드 허용? (Q3) Supabase 계정/프로젝트 이미 만들었나?
- [ ] 이후: 인증 접근법 2~3개 제안 → 설계 섹션 승인 → 스펙 `docs/superpowers/specs/2026-07-18-supabase-auth-design.md` 작성 → 사용자 리뷰 → superpowers:writing-plans → Codex 구현.
- [ ] (phase 2/3) 클라우드 데이터 레이어 + 오프라인 동기화 + **기존 로컬 데이터 → 계정 이전(migration)**.
- [ ] (선택) 깨진 커밋 메시지 `1f011ac` 정정.
- [ ] (별건·보류) UTC 날짜 버그.

> 저장 위치: 이 세션 요약은 OMC 위키(`.omc/wiki/`, git-ignore)에도 저장됨 — `2026-07-18-session-…`, `supabase-integration-plan` 페이지.

### 2026-07-19 — Supabase 인증 Phase 1: 설계 완료 + Codex 구현 + 리뷰 + 웹/DB 검증 완료

**한 일:**
1. **인증 설계 스펙 확정** — `docs/superpowers/specs/2026-07-18-supabase-auth-design.md`(286줄). 결정: 이메일+비번, **로그인 필수(앱 전체 게이팅, 게스트 없음)**, 이메일 확인 **OFF**(가입 즉시 로그인), `(auth)` 라우트 그룹 + 리다이렉트 게이트. Supabase 프로젝트 생성 완료.
2. **`.env.local` 생성** — 실제 URL + **publishable(anon) 키**. `.gitignore`의 `.env*.local`로 무시됨 검증(`git check-ignore`). `service_role` 키는 안 씀.
3. **Codex가 Phase 1 인증 구현**(staged, 미커밋) — `lib/supabase.ts`, `context/auth.tsx`(AuthProvider/useAuth), `components/auth-form.tsx`, `app/(auth)/{_layout,sign-in,sign-up}.tsx`, `app/_layout.tsx`(게이팅), `app/(tabs)/explore.tsx`(로그아웃).
4. **Claude 코드 리뷰(code-review 스킬, high)** — 5건 발견 → 지침 문서 `docs/superpowers/specs/2026-07-19-supabase-auth-review-CODEX-instructions.md` 작성.
   - #1[높음] **재로그인 시 온보딩 재노출**(onboardingDone 마운트 1회만 읽어 stale) / #2[중] getSession 실패 시 무한 스플래시 / #3[낮음] 이메일확인 ON 시 무반응 / #4[낮음] (tabs) 한 프레임 깜빡임 / #5[낮음] 웹 AppState 불필요.
5. **Codex 1차 수정** — #1을 근본해결(A)로: 새 `context/onboarding.tsx`(반응형 OnboardingProvider, `markComplete()`가 저장+상태 동시 갱신) + 게이트가 이 상태 사용, fragile `initialGateComplete` ref 제거. #2(catch/finally), #5(Platform.OS web 가드)도 반영. #3·#4는 보류(선택). → **tsc/lint 클린, 회귀 없음** 확인.
6. **웹 구동 검증에서 차단 버그(C1) 발견** — `npm run web`이 부팅 중 크래시(exit 7). 원인: `app.json` `web.output:"static"`(Expo Router가 Node에서 SSR) + `lib/supabase.ts`가 import 시점에 supabase 클라이언트 생성 → GoTrueClient가 즉시 AsyncStorage(web=`window.localStorage`) 읽음 → Node엔 `window` 없어 `ReferenceError`. **정적 분석(tsc/lint)으론 못 잡는 회귀.** 지침 문서에 C1 추가.
7. **Codex가 C1 수정(A안)** — `app.json` `web.output` `"static"`→**`"single"`**(SPA, SSR 제거). → 서버 재구동: **크래시 없이 부팅**, `λ node/render.js` SSR 번들 사라짐, Playwright로 `/sign-in` 게이팅+한글 로그인 UI 렌더 확인, **콘솔 에러 0**.
8. **Supabase DB 저장 검증(2중 확인)** — (a) anon 키로 Auth API 직접 테스트 가입 → 서버 UUID·created_at·토큰 발급 확인. (b) **사용자가 Supabase 대시보드(Authentication→Users) 스크린샷** → 본인 가입 계정 `dennis439785@gmail.com`(UID `969b5231-…`)이 실제 저장됨 확인. 테스트 계정 UID가 API 응답과 일치(교차검증).

**결정사항:**
- C1 수정 = **`web.output: "single"`**(이 앱은 로그인 뒤 개인용이라 SSR/SEO 불필요). 정적 유지 원하면 대안 B(supabase.ts에서 `Platform.OS==='web' && typeof window==='undefined'`일 때 메모리 스토리지)—문서에 남김.
- 검증 방식: **정적(tsc/lint) → 웹 런타임 구동 → DB 실제 확인**까지 3단. (런타임 구동이 C1 잡음 — 앞으로도 실행 검증 중시.)

**진행 상태:**
- [x] 인증 설계 스펙 / `.env.local` / Codex 구현(Phase 1)
- [x] Claude 리뷰(5건) + Codex 수정(#1·#2·#5 + C1)
- [x] 웹 런타임 검증(부팅/게이팅/로그인 UI/콘솔0) + Supabase DB 저장 확인
- [ ] **미커밋** — 인증 구현 + 온보딩 리팩터 + C1 + 리뷰 문서 전부 staged/untracked 상태

**다음 할 일:**
- [ ] **#1(재로그인 온보딩) 인앱 플로우 런타임 재현 검증** — 가입→온보딩완료→로그아웃→재로그인→온보딩 안 뜨고 탭 진입. (테스트 계정 1개 더 생김)
- [ ] **커밋** — 인증 구현 + `context/onboarding.tsx` + C1(app.json) + 리뷰/설계 문서. (커밋 메시지 예: `Add Supabase email/password auth (Phase 1)`)
- [ ] Supabase 대시보드에서 **테스트 계정 `claude-verify-1784448858@example.com` 삭제**.
- [ ] (phase 2) 클라우드 데이터 레이어(habits/completions/challenges `user_id`별 + RLS) → (phase 3) 오프라인 동기화 + 로컬 데이터 계정 이전.
- [ ] (선택) 깨진 커밋 메시지 `1f011ac` 정정 / (별건·보류) UTC 날짜 버그.

**참고:**
- Supabase 프로젝트 ref `ytfmtzrocfuxvhxflkqf` / Users 대시보드 `https://supabase.com/dashboard/project/ytfmtzrocfuxvhxflkqf/auth/users`.
- 웹 재구동: `npm run web` → `http://localhost:8081`(이메일확인 OFF라 가입 즉시 로그인). 세션 종료 시 dev 서버 정리됨.
