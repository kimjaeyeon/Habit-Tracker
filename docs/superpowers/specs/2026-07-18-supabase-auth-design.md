# Supabase 인증 설계 — Phase 1 (Supabase Auth Design)

작성일: 2026-07-18
대상: habit-tracker (Expo SDK 54 / React Native 0.81 / expo-router)
구현: **Codex** (이 문서는 설계 산출물이며, 실제 코드 작성은 Codex가 수행)
상태: 브레인스토밍 확정 → 스펙

---

## 0. 배경 & 전체 로드맵

강의 과제 목표 = **DB(Supabase) + 로컬 캐싱(빠릿함) + 사용자 인증**. 이를 3개 하위 시스템으로 분해했고, 각각 스펙 → 계획 → Codex 구현 사이클로 진행한다.

1. **인증(Auth)** ← **이 문서 (먼저 구현)**
2. **클라우드 데이터 레이어** — Postgres 테이블(habits/completions/challenges) `user_id`별 분리 + RLS
3. **오프라인 캐싱 + 동기화** — optimistic 로컬 쓰기, 백그라운드 sync, 기존 로컬 데이터 계정 이전(migration)

**핵심 원칙(전 phase 공통):** 지금 앱의 "빠릿함"은 로컬 AsyncStorage 즉시 쓰기에서 나온다. 토글마다 네트워크를 `await`하면 안 된다. → **오프라인 우선(optimistic)**, 동기화는 뒤에서. (이 원칙은 phase 2/3에서 본격 적용되며, phase 1은 인증만 다룬다.)

---

## 1. 이번 Phase 스코프 & 알려진 한계

### ✅ 이번에 만든다 (인증 + 앱 게이팅만)
- 이메일 + 비밀번호 **회원가입 / 로그인 / 로그아웃**
- **세션 유지**(앱 재시작해도 로그인 상태 유지, AsyncStorage에 저장)
- **앱 전체 게이팅** — 로그인 안 하면 앱(탭) 진입 불가
- 인증 상태를 앱 전역에 제공하는 `AuthProvider` / `useAuth()`

### 🚫 이번엔 안 건드린다
- 습관/완료/챌린지 **데이터는 여전히 로컬 AsyncStorage 그대로.** 클라우드 이전·동기화는 phase 2.
- 기존 AsyncStorage 키(`habits`, `completions`, `challenges`, `onboarding_complete`), `HabitType` 값(`daily`/`quantity`), `YYYY-MM-DD` 포맷, 습관 `id` — **불변.**
- `getToday()`의 **UTC 날짜 버그** — 별건, 손대지 않는다.

### ⚠️ 알려진 중간 한계 (의도적, phase 2에서 해소)
Phase 1에서는 데이터가 아직 `user_id`로 분리되지 않는다. 따라서 **같은 기기에서 A가 로그아웃하고 B가 로그인해도 동일한 로컬 습관 데이터가 보인다.** 1인 1기기 사용에서는 실사용 문제가 없으며, phase 2(클라우드 데이터 + 계정별 분리 + 로컬 데이터 이전)에서 해소된다. 이 단계는 "로그인 벽을 먼저 세우고, 데이터 분리는 다음 단계"라는 점진적 접근이다.

---

## 2. 결정사항 요약 (브레인스토밍)

| # | 항목 | 결정 |
|---|---|---|
| 빌드 순서 | 3개 하위 시스템 중 | **인증 먼저** |
| Q1 | 로그인 방식 | **이메일 + 비밀번호** (Expo Go에서 딥링크/리다이렉트 설정 불필요) |
| Q2 | 게이팅 | **로그인 필수 (앱 전체 게이팅)** — 게스트 모드 없음 |
| Q3 | Supabase 프로젝트 | **생성 완료** (URL·publishable 키 확보, 상태 Healthy) |
| Q4 | 이메일 확인 | **OFF** (가입 즉시 로그인) — 콘솔에서 이미 꺼져 있음 확인 |
| 구조 | 라우팅/게이팅 | **A안 — `(auth)` 라우트 그룹 + 리다이렉트 게이트** |

**보안(레포 Public):** publishable(=anon) 키는 클라이언트에 embed되는 게 정상이며 RLS가 데이터를 지킨다. `sb_secret_...`(service_role) 키는 **절대 커밋 금지 / 클라이언트 사용 금지.** 키는 `.env.local`(gitignore됨)에만 둔다.

---

## 3. 아키텍처 개요

### 프로바이더 중첩 (수정 후)
현재: `ThemeProvider > HabitProvider > ChallengeProvider`
변경: **`AuthProvider`를 최상위(HabitProvider 바깥)에 추가**
```
ThemeProvider
  └─ AuthProvider          ← 신규 (최외곽 관심사; phase 2에서 데이터 provider가 user_id를 읽음)
       └─ HabitProvider
            └─ ChallengeProvider
                 └─ RootStack (게이팅)
```

### 라우트 구조 (수정 후)
```
app/
  _layout.tsx            (수정) — AuthProvider 래핑 + (auth) 등록 + 게이팅 로직
  (auth)/                (신규)
    _layout.tsx          (신규) — 인증 그룹 Stack (headerShown: false)
    sign-in.tsx          (신규)
    sign-up.tsx          (신규)
  (tabs)/                (기존)
    explore.tsx          (수정) — 관리 탭에 이메일 표시 + 로그아웃 버튼
  onboarding.tsx         (기존, 변경 없음)
  challenge-complete.tsx (기존)
lib/
  supabase.ts            (신규) — 클라이언트 싱글턴
context/
  auth.tsx               (신규) — AuthProvider / useAuth()
components/
  auth-form.tsx          (신규) — sign-in/sign-up 공유 폼 UI
```

---

## 4. 파일별 명세

### 4.1 `lib/supabase.ts` (신규) — 클라이언트 싱글턴

- 최상단에서 `import 'react-native-url-polyfill/auto';` (RN에서 supabase-js가 `URL`을 필요로 함).
- 세션 저장소로 `AsyncStorage` 사용 → 앱 재시작 후에도 세션 복원(웹에서는 AsyncStorage가 localStorage로 동작하므로 크로스플랫폼 OK).
- 환경변수 누락 시 명확한 에러를 던져 설정 실수를 즉시 드러낸다.

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; // 값은 sb_publishable_... (anon 대체)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 환경변수가 없습니다. .env.local에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN: URL 기반 세션 감지 없음
  },
});
```

> **권장(세션 자동 갱신):** Supabase 공식 Expo 가이드대로 `AppState` 리스너에서 앱이 포그라운드일 때 `supabase.auth.startAutoRefresh()`, 백그라운드일 때 `stopAutoRefresh()`를 호출하면 토큰 갱신이 안정적이다. `AuthProvider` 마운트 시 등록/해제한다. (선택이지만 권장.)

### 4.2 `context/auth.tsx` (신규) — AuthProvider / useAuth()

기존 `context/habits.tsx`·`challenges.tsx`의 Context+Provider 패턴을 그대로 따른다(provider 밖 사용 시 throw 포함).

**노출 타입:**
```ts
type AuthContextType = {
  session: Session | null;
  user: User | null;        // session?.user ?? null
  loading: boolean;         // 초기 세션 확인 중 여부
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};
```

**동작:**
- 마운트 시 `supabase.auth.getSession()`으로 저장된 세션 복원 → `session` set, `loading=false`.
- `supabase.auth.onAuthStateChange((_event, session) => setSession(session))` 구독, 언마운트 시 `subscription.unsubscribe()`.
- `signUp` → `supabase.auth.signUp({ email, password })`. 이메일 확인이 OFF이므로 성공 시 `data.session`이 즉시 발급되고 `onAuthStateChange`가 발화한다.
- `signIn` → `supabase.auth.signInWithPassword({ email, password })`.
- `signOut` → `supabase.auth.signOut()`.
- 액션은 성공 시 `{ error: null }`, 실패 시 `{ error: <한국어 메시지> }`(§6 매핑)를 반환한다. 화면이 이 값을 받아 인라인 에러로 표시한다. (throw 대신 반환값으로 흐름 제어 → 화면 코드가 단순해짐.)
- `session` 변화는 `onAuthStateChange`가 처리하므로 액션 내부에서 수동 setSession 하지 않는다.

### 4.3 `app/(auth)/_layout.tsx` (신규)
```tsx
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 4.4 `app/(auth)/sign-in.tsx` · `sign-up.tsx` (신규)
- 각각 `AuthForm`(§4.5)을 `mode="signin"` / `mode="signup"`로 렌더.
- 서로를 향한 링크 제공: 로그인 화면 하단 "계정이 없으신가요? 회원가입", 가입 화면 하단 "이미 계정이 있으신가요? 로그인" → `router.replace('/(auth)/sign-up')` / `sign-in`.
- 제출 성공(`{ error: null }`) 시 별도 네비게이션 불필요 — `onAuthStateChange`로 세션이 잡히면 루트 게이트(§5)가 자동으로 앱 안으로 보낸다.

### 4.5 `components/auth-form.tsx` (신규) — 공유 폼
- Props: `mode: 'signin' | 'signup'`. 폼은 내부에서 `useAuth()`를 호출해 `mode`에 따라 `signIn`/`signUp`을 실행한다(별도 제출 핸들러 prop 없음).
- 필드: 이메일(`keyboardType="email-address"`, `autoCapitalize="none"`), 비밀번호(`secureTextEntry`).
- **클라이언트 검증(호출 전):** 이메일 형식(간단 정규식), 비밀번호 6자 이상, 빈 값 방지 → 인라인 에러.
- **로딩 상태:** 제출 중 버튼 비활성 + 스피너(`ActivityIndicator`), 중복 제출 방지.
- **에러 표시:** 검증 에러 및 서버 에러(§6)를 폼 하단에 한 줄로.
- UI는 `ThemedText`/`ThemedView`/`useThemeColor`와 온보딩 화면의 버튼 스타일(둥근 primary 버튼)을 재사용. **문구는 친근·따뜻한 존댓말 톤**(코치가 반겨주는 느낌). 예: 로그인 제목 "다시 오셨네요 👋", 가입 제목 "함께 시작해볼까요?", 버튼 "로그인" / "가입하고 시작하기".

### 4.6 `app/_layout.tsx` (수정)
- `AuthProvider`를 `HabitProvider` 바깥에 래핑.
- `<Stack>`에 `<Stack.Screen name="(auth)" options={{ headerShown: false }} />` 추가.
- 온보딩 로드(`onboarding_complete`) 로직은 유지하되, 게이팅을 §5의 통합 리다이렉트로 교체.
- `authLoading || onboardingDone === null`이면 `null`(스플래시) 렌더.

### 4.7 `app/(tabs)/explore.tsx` (수정) — 로그아웃
- 관리 탭 상단 또는 하단에 **계정 섹션** 추가: 로그인 이메일(`useAuth().user?.email`) 표시 + **로그아웃** 버튼(`signOut()` 호출).
- 개발자 도구 섹션과 구분되는 별도 카드/영역. 로그아웃 시 게이트가 자동으로 `(auth)/sign-in`으로 보낸다.
- 로그아웃 확인 `Alert`("로그아웃할까요?") 1단계 권장(실수 방지).

### 4.8 환경변수 파일
- `.env.local` (커밋 금지, `.gitignore`의 `.env*.local`로 이미 무시됨):
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://ytfmtzrocfuxvhxflkqf.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
  ```
- `.env.example` (커밋, placeholder만):
  ```
  EXPO_PUBLIC_SUPABASE_URL=your-project-url
  EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
  ```
- 실제 키를 커밋되는 어떤 파일/코드에도 하드코딩하지 않는다.

---

## 5. 게이팅 흐름 (핵심)

`useSegments()`로 "현재 어느 그룹에 있는지"를 보고 판단해 **리다이렉트 루프를 방지**한다. 세션(`useAuth`)과 온보딩(`onboarding_complete`) 두 상태를 함께 본다.

```ts
const segments = useSegments();
const { session, loading: authLoading } = useAuth();
// onboardingDone: boolean | null (기존 로직 유지)

useEffect(() => {
  if (authLoading || onboardingDone === null) return; // 아직 로딩 → 대기

  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segments[0] === 'onboarding';

  if (!session && !inAuthGroup) {
    router.replace('/(auth)/sign-in');            // 미로그인 → 로그인 화면
  } else if (session && inAuthGroup) {
    router.replace(onboardingDone ? '/(tabs)' : '/onboarding'); // 로그인됨인데 auth화면 → 탈출
  } else if (session && !onboardingDone && !inOnboarding) {
    router.replace('/onboarding');                // 로그인됐고 온보딩 미완 → 온보딩
  }
}, [session, authLoading, onboardingDone, segments]);
```

우선순위: **로그인 여부 → 온보딩 여부 → 앱**. 로그인/가입 성공은 `onAuthStateChange`로 세션이 잡히며 위 효과가 자동으로 다음 화면으로 보낸다. 로그아웃은 세션이 null이 되며 로그인 화면으로.

---

## 6. 에러 처리 — Supabase → 친근한 한국어 매핑

`context/auth.tsx`(또는 작은 헬퍼 `lib/auth-errors.ts`)에서 Supabase `error.message`를 한국어로 매핑한다. 매칭 안 되면 일반 메시지 fallback.

| Supabase 원문(부분 매칭) | 한국어 메시지 |
|---|---|
| `Invalid login credentials` | 이메일 또는 비밀번호가 맞지 않아요. |
| `User already registered` | 이미 가입된 이메일이에요. 로그인해보세요. |
| `Password should be at least 6 characters` | 비밀번호는 6자 이상으로 해주세요. |
| `Unable to validate email address` / 형식 오류 | 이메일 형식을 확인해주세요. |
| 네트워크/타임아웃 계열 | 연결 상태를 확인하고 다시 시도해 주세요. |
| (그 외) | 문제가 생겼어요. 잠시 후 다시 시도해 주세요. |

---

## 7. 하드룰 (Codex 준수 사항)

1. **AsyncStorage 키/`HabitType`/`YYYY-MM-DD`/습관 `id` 불변.** 인증은 이들과 무관하게 별도 레이어로 추가.
2. **UTC 날짜 버그(`getToday`) 손대지 않는다.**
3. **컨벤션 준수:** Context+Provider 패턴, `ThemedText`/`ThemedView`/`useThemeColor`, 친근 존댓말 톤, 영어 내부 식별자.
4. **`service_role`/`sb_secret_` 키를 코드·커밋에 절대 넣지 않는다.** 클라이언트는 publishable(anon) 키만.
5. **오프라인 우선 원칙 유지:** 이번 phase는 습관 데이터 로직을 바꾸지 않는다(인증만 추가). 습관 토글에 네트워크 개입 없음.
6. 데이터 스키마를 바꾸지 않으므로 `migrateHabits`/`migrateCompletions`는 이번 범위 밖.

---

## 8. 검증 체크리스트 (테스트 러너 없음 → 수동)

웹(`npm run web`) 먼저 → 필요 시 Expo Go 순서로:

- [ ] 앱 최초 실행 → 로그인 화면으로 게이팅됨(탭 진입 불가).
- [ ] 신규 가입 → (확인 메일 없이) **즉시 로그인되어** 온보딩/오늘 탭 진입. Supabase 콘솔 Authentication → Users에 계정이 뜸.
- [ ] 앱 껐다 켜기 → **로그인 상태 유지**(세션 복원).
- [ ] 관리 탭 → 이메일 표시 확인 → **로그아웃** → 로그인 화면으로.
- [ ] 기존 계정으로 로그인 성공.
- [ ] **틀린 비밀번호** → "이메일 또는 비밀번호가 맞지 않아요." 인라인 에러.
- [ ] 이미 가입된 이메일로 가입 시도 → "이미 가입된 이메일이에요." 에러.
- [ ] 짧은 비밀번호(5자) → 클라이언트 검증 또는 서버 에러로 안내.
- [ ] `.env.local` 없이 실행 → 명확한 환경변수 누락 에러.
- [ ] `npx tsc --noEmit` 클린, `npm run lint` 클린.
- [ ] 사용한 키가 `sb_publishable_`(anon)인지 재확인 — `sb_secret_` 아님.

---

## 9. 명시적 컷 (YAGNI, 이번 phase 제외)

- 소셜 로그인(OAuth) / 매직 링크 / 패스키
- 비밀번호 재설정("비밀번호를 잊으셨나요") — 이메일 발송 필요, phase 후속
- 프로필 편집 / 표시 이름
- 게스트(익명) 모드
- 클라우드 데이터 동기화 · 다기기 · 로컬→계정 이전 → **phase 2/3**
- UTC 날짜 버그 수정 → 별건

---

## 10. 추가 의존성

- `@supabase/supabase-js` (신규 설치)
- `react-native-url-polyfill` (신규 설치, RN에서 supabase-js `URL` 폴리필)
- `@react-native-async-storage/async-storage` — **이미 설치됨**(2.2.0), 세션 저장에 재사용

설치는 Expo 호환 버전으로: `npx expo install @supabase/supabase-js react-native-url-polyfill`
