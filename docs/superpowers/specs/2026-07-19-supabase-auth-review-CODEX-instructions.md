# Supabase 인증 구현 — 코드 리뷰 & Codex 수정 지침

작성일: 2026-07-19
리뷰 대상: Phase 1 인증 구현 (staged, 미커밋 — 730줄 추가)
설계 스펙: [`2026-07-18-supabase-auth-design.md`](./2026-07-18-supabase-auth-design.md)
리뷰어: Claude / 구현: **Codex**

---

## 0. 요약

인증 구현은 스펙을 충실히 따랐고 하드룰(저장키/`HabitType`/습관 `id`/UTC 날짜 버그 미변경, `service_role` 키 없음, 친근 존댓말 톤, 영어 내부 식별자)도 모두 준수했다. 자동 검증도 통과:

- ✅ `npx tsc --noEmit` — 에러 0
- ✅ `npm run lint` — 에러 0 (경고 2개는 기존 파일 `index.tsx`·`confetti.tsx`, 인증과 무관)

아래 5건은 리뷰에서 발견한 이슈다. **#1·#2를 우선 수정**하고, #3~#5는 여유 시 처리한다.

---

## 1. 🔴 [높음] 재로그인 시 온보딩이 다시 뜸

**위치:** `app/_layout.tsx:19` (상태 정의), `app/_layout.tsx:55` (게이트 분기)

**문제:** `RootLayout`이 `onboarding_complete`를 **마운트 시 한 번만** 읽고(`useState<boolean|null>` + 마운트 effect) 이후 절대 갱신하지 않는다. `RootLayout`은 최상위라 로그아웃/로그인으로 언마운트되지 않으므로, 온보딩을 마친 뒤에도 `onboardingDone` 값은 계속 stale(`false`)로 남는다.

**재현 시나리오 (실사용에서 바로 걸림):**
1. 신규 가입 → 온보딩 완료 (AsyncStorage `onboarding_complete='true'` 저장, 탭으로 이동)
2. `RootLayout`의 `onboardingDone` state는 **여전히 `false`** (다시 안 읽음)
3. 관리 탭 → 로그아웃 → 세션 null → 로그인 화면
4. **다시 로그인** → 게이트 분기 `session && inAuthGroup` 실행 → `router.replace(onboardingDone ? '/(tabs)' : '/onboarding')` 가 stale `false`로 평가 → **온보딩으로 또 보냄**

`initialGateComplete` ref는 branch 3만 막고 이 branch 2 경로는 못 막는다. 즉 ref 우회는 근본 해결이 아니다.

**수정 방향 (택1, A 권장):**

- **A. 온보딩 상태를 반응형으로 관리 (권장, 근본 해결):** 기존 Context+AsyncStorage 패턴(habits/challenges/auth와 동일)대로 온보딩 완료 여부를 반응형 상태로 만든다. 예) 작은 `OnboardingProvider`/`useOnboarding()` 또는 root에서 내려주는 `markOnboardingComplete()` 콜백. 온보딩 화면이 완료 시 AsyncStorage 저장과 **동시에 이 상태를 갱신**하면 게이트가 stale해지지 않는다. 이 경우 `initialGateComplete` ref 우회는 **제거**한다.
- **B. 최소 변경:** 게이트가 결정 직전에 `onboarding_complete`를 AsyncStorage에서 다시 읽는다(세션이 truthy로 바뀔 때). effect 내 async + `router.replace` 경합을 `mounted`/ref로 방어할 것. (A보다 임시방편.)

**주의:** 어느 쪽이든 `onboarding_complete` **키 이름·값(`'true'`) 포맷은 불변** (하드룰).

---

## 2. 🟠 [중] `getSession()` 실패 시 무한 스플래시

**위치:** `context/auth.tsx:41`

**문제:** `supabase.auth.getSession().then(({ data }) => { ... setLoading(false) })` 에 `.catch`가 없고 `loading=false`가 성공 콜백 안에만 있다. getSession이 reject되면 `loading`이 영영 `true` → `RootStack`의 `if (loading) return null`로 **빈 화면 고착**.

**재현:** 저장된 세션이 손상됐거나 AsyncStorage 읽기가 throw → `.then` 미실행 → `setLoading(false)` 미호출 → 앱이 빈 스플래시에서 멈춤. (평소엔 `onAuthStateChange`의 `INITIAL_SESSION`이 가려주지만, 저장소 읽기 자체가 실패하면 못 가림.)

**수정 방향:** `getSession()`에 `.catch(() => setLoading(false))` 추가(또는 async/`try...finally`로 감싸 `mounted`일 때 항상 `setLoading(false)`). 실패 시 세션 없음으로 간주하고 로그인 화면으로 게이팅되게.

---

## 3. 🟡 [낮음·잠재] 이메일 확인이 ON이면 가입이 조용히 무반응

**위치:** `context/auth.tsx:78` (`signUp`)

**문제:** 확인 메일이 켜진 경우 `supabase.auth.signUp`은 `data.session=null, error=null`로 리턴한다. 현재 코드는 `error`만 보고 `{ error: null }`을 반환 → 폼은 에러도 안 뜨고 화면 전환도 안 됨. 사용자는 "가입 버튼을 눌렀는데 아무 일도 안 일어남" 상태가 된다.

**현재는 문제 없음:** 스펙(§2 Q4)대로 확인 OFF라 즉시 세션이 발급된다. 다만 콘솔 설정이 바뀌면 무방비.

**수정 방향(방어):** `signUp` 후 `error`가 없고 `data.session`도 없으면, 폼에 "확인 메일을 보냈어요. 메일함을 확인해 주세요." 같은 **안내 메시지를 반환**하도록 처리. (선택이지만 저비용 방어.)

---

## 4. 🟡 [낮음] 미로그인 콜드스타트 시 `(tabs)` 한 프레임 깜빡임

**위치:** `app/_layout.tsx:14` (`anchor:'(tabs)'`), `app/_layout.tsx:62`

**문제:** `unstable_settings.anchor='(tabs)'` + 리다이렉트가 effect(렌더 후)라, 로그아웃 상태 콜드스타트에서 `loading`이 false가 되는 순간 `(tabs)`가 한 프레임 마운트됐다가 sign-in으로 교체될 수 있다.

**참고:** expo-router 인증에서 흔한 패턴이라 치명적이지 않다. 신경 쓰인다면 게이트 판정 전까지 보호 라우트 렌더를 지연하거나 스플래시 유지로 완화 가능. **낮은 우선순위.**

---

## 5. 🟡 [낮음·정리] 웹에서 불필요한 AppState autoRefresh 배선

**위치:** `context/auth.tsx:57` (AppState 리스너 + `startAutoRefresh`/`stopAutoRefresh`)

**문제:** AppState 리스너와 auto-refresh를 플랫폼 무관하게 등록한다. 웹(react-native-web)에선 `AppState`가 shim이라 `'change'`가 부정확하고, supabase-js가 이미 브라우저 탭에서 자동 갱신한다. shim의 포그라운드/블러성 이벤트로 `stopAutoRefresh`가 불필요하게 불릴 수 있다.

**수정 방향:** Supabase 공식 Expo 가이드처럼 AppState 배선을 `if (Platform.OS !== 'web')`로 감싼다. 네이티브 동작은 그대로 유지.

---

## 6. 하드룰 (수정 시 반드시 유지)

1. AsyncStorage 키(`habits`, `completions`, `challenges`, `onboarding_complete`) · `HabitType`(`daily`/`quantity`) · `YYYY-MM-DD` 포맷 · 습관 `id` **불변.**
2. `getToday()`의 **UTC 날짜 버그는 손대지 않는다** (별건).
3. 컨벤션 유지: Context+Provider 패턴, `ThemedText`/`ThemedView`/`useThemeColor`, **친근 존댓말 톤**, 영어 내부 식별자.
4. `service_role`/`sb_secret_` 키를 코드·커밋에 절대 넣지 않는다. 클라이언트는 publishable(anon) 키만.
5. 이번 수정은 **인증 게이팅 레이어에 한정** — 습관/완료/챌린지 데이터 로직은 건드리지 않는다.

---

## 7. 수정 후 검증 (테스트 러너 없음 → 수동)

- [ ] `npx tsc --noEmit` 클린
- [ ] `npm run lint` 클린 (기존 경고 2개 외 신규 0)
- [ ] `npm run web` 으로 실행 후 스펙 §8 체크리스트 재확인, 특히:
  - [ ] **#1 재현 시나리오:** 가입 → 온보딩 완료 → 로그아웃 → 재로그인 → **온보딩이 다시 뜨지 않고 바로 탭으로** 진입하는지
  - [ ] 앱 껐다 켜기 → 로그인 상태 유지
  - [ ] 관리 탭 로그아웃 → 로그인 화면
  - [ ] 틀린 비밀번호 / 이미 가입된 이메일 → 친근한 한글 인라인 에러

---

## 8. 우선순위 정리

| # | 이슈 | 우선순위 | 비고 |
|---|------|---------|------|
| 1 | 재로그인 시 온보딩 재노출 | 🔴 높음 | 우선 수정, 근본 해결(A) 권장 |
| 2 | getSession 실패 → 무한 스플래시 | 🟠 중 | 우선 수정, 저비용 |
| 3 | 이메일 확인 ON 시 무반응 | 🟡 낮음 | 방어(선택) |
| 4 | (tabs) 한 프레임 깜빡임 | 🟡 낮음 | 선택 |
| 5 | 웹 AppState 배선 | 🟡 낮음 | 정리(선택) |

---

# 🔴🔴 2차 (긴급/차단) — 런타임 검증에서 발견 (2026-07-19)

> 1차 수정(#1·#2·#5) 반영분을 **실제 웹으로 구동(`npm run web`)** 하며 검증하다 발견. tsc·lint는 통과했으나 **앱이 부팅 중 크래시(exit 7)** 함. 아래를 먼저 고쳐야 웹에서 인증 플로우 검증을 진행할 수 있음.

## C1. 🔴 웹 실행 시 SSR 크래시 — `window is not defined`

**증상:** `npm run web` → 서버가 8081을 잠깐 열었다가 첫 렌더 중 크래시, 프로세스 종료(exit 7). 웹 화면이 아예 안 뜸.

**스택(요약):**
```
ReferenceError: window is not defined
  at AsyncStorage getValue (localStorage 접근)
  at @supabase/auth-js getItemAsync
  at GoTrueClient._recoverAndRefresh / _emitInitialSession → _initialize
```

**원인:** `app.json`의 `web.output: "static"` 때문에 Expo Router가 **라우트를 Node(서버)에서 정적 렌더**한다. 그런데 `lib/supabase.ts`가 **모듈 로드 시점**에 `createClient(..., { storage: AsyncStorage, persistSession: true })`를 실행하고, supabase `GoTrueClient`가 **생성 즉시** 세션 복원을 위해 `AsyncStorage.getItem`을 호출한다. 웹 빌드에서 AsyncStorage는 `window.localStorage`를 쓰는데 **Node 렌더 환경엔 `window`가 없어** 크래시한다. (native/브라우저 런타임에선 정상 — 순수 웹 SSR에서만 터짐.)

> 참고: 이 크래시는 이번 Supabase 통합으로 **새로 생긴 회귀**다. 기존 habits/challenges 컨텍스트는 AsyncStorage를 `useEffect`(런타임) 안에서만 읽어 SSR 때 안 건드렸다. supabase 클라이언트는 import 시점에 즉시 스토리지를 읽는 게 차이.

**수정안 A — `web.output`을 `"single"`로 (권장, 가장 간단):**
`app.json`에서 `"web": { "output": "static" }` → `"single"`(SPA). 이 앱은 로그인 뒤에서 도는 개인용이라 SEO/정적 프리렌더가 불필요하고, **Node SSR 자체가 사라져** `window`가 항상 존재한다. 앞으로 import 시점에 `window`/`localStorage`를 만지는 코드가 늘어도 안전. (트레이드오프: 라우트별 정적 HTML 프리렌더 없음 — 이 앱엔 무의미.)

**수정안 B — 정적 출력을 유지하고 싶다면, 서버 환경에서 스토리지를 가드:**
`lib/supabase.ts`에서 **웹+Node(SSR)일 때만** in-memory 스토리지 + 세션 비영속으로. (native는 반드시 AsyncStorage를 유지해야 하므로 `Platform.OS`로 정확히 구분.)
```ts
import { Platform } from 'react-native';

const isServer = Platform.OS === 'web' && typeof window === 'undefined';
const memoryStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServer ? memoryStorage : AsyncStorage,
    persistSession: !isServer,
    autoRefreshToken: !isServer,
    detectSessionInUrl: false,
  },
});
```
⚠️ **주의:** 서버에서 `storage`를 `undefined`로 두면 supabase가 웹에서 `localStorage`로 폴백해 **Node에서 또 크래시**한다. 반드시 메모리 스토리지를 **명시**할 것. `isServer` 판정은 `typeof window` 단독보다 `Platform.OS === 'web' && ...` 조합이 안전(native의 `window` 유무에 의존하지 않음).

**권장:** 이 앱 성격상 **A(single)** 가 가장 깔끔. 정적 출력이 꼭 필요하면 B.

## C2. 검증 재개 (수정 후)
- [ ] `npm run web` → 크래시 없이 8081 정상, 로그인 화면 렌더
- [ ] 이후 스펙 §8 + 본 문서 §7 수동 시나리오 (특히 #1 재로그인) 진행

## C3. 2차 우선순위

| # | 이슈 | 우선순위 | 비고 |
|---|------|---------|------|
| C1 | 웹 SSR `window` 크래시 | 🔴🔴 **차단** | A(`output:"single"`) 권장 / B(스토리지 가드) 대안 |
