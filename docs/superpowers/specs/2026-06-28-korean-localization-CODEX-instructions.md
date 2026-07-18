# Codex 작업 지침서 — 한국어화 구현

> ⚠️ **[대체됨 / SUPERSEDED]** 직역판 지침이다. **사용하지 말 것.**
> 최신 감성 톤 지침을 따를 것:
> `docs/superpowers/specs/2026-07-17-korean-localization-CODEX-instructions.md`

이 문서는 **Codex가 실제 코드 수정을 수행하기 위한 실행 지침**이다.
번역 대상 전체 표(파일별 영→한)는 아래 설계 스펙에 있으니 **반드시 함께 열어두고 작업**한다:

> 📄 설계 스펙: `docs/superpowers/specs/2026-06-28-korean-localization-design.md`

## 작업 개요

Expo/React Native 습관 추적 앱의 **UI에 보이는 영어 텍스트만** 한국어로 교체한다.
방식 A: 통째 교체 (i18n 라이브러리·언어 전환 없음).

---

## 🚫 하드 룰 — 절대 건드리지 말 것 (위반 시 데이터/로직 파손)

1. **AsyncStorage 키 문자열**: `'habits'`, `'completions'`, `'challenges'`, `'onboarding_complete'` — 그대로 둔다.
2. **`HabitType` 값**: `'daily'`, `'quantity'` — 내부 식별자. 문자열 리터럴을 한글로 바꾸지 않는다.
3. **습관 `id`, 날짜 키 포맷 `YYYY-MM-DD`** — 그대로 둔다.
4. **사용자 입력/런타임 데이터**: `challenge.name`, 사용자가 만든 habit의 `name` 등 렌더링되는 **변수 값은 번역 대상이 아니다**. 오직 **소스에 하드코딩된 영어 리터럴**만 바꾼다.
5. **로직 변경 금지**: `getToday()`의 UTC 날짜 버그는 **이번 작업 범위 밖**이다. 날짜 관련해서는 아래 "날짜 표시"의 로케일 문자열 하나만 바꾼다. 계산 로직은 손대지 않는다.
6. **스타일/구조 변경 금지**: `StyleSheet` 키 이름, 컴포넌트 구조, prop 이름은 그대로. 오직 사용자에게 보이는 텍스트 리터럴만 교체.

---

## ✅ 작업 순서 (파일별)

각 파일의 정확한 영→한 매핑은 **설계 스펙의 해당 표**를 그대로 따른다. 아래는 체크리스트.

- [ ] **`app/(tabs)/_layout.tsx`** — 탭 `title` 3개 (Today/History/Manage → 오늘/기록/관리)
- [ ] **`app/(tabs)/index.tsx`** — 진행 문구, "All done for today!", 챌린지 카드 "n/총 days", 빈 상태 안내, **날짜 로케일**(아래 참고)
- [ ] **`app/(tabs)/history.tsx`** — title "History", "Streak", "Best", 빈 상태 안내
- [ ] **`app/(tabs)/explore.tsx`** — 섹션 제목/라벨, placeholder 2개, 버튼 라벨, 기간 버튼 `{d}d → {d}일`, **`Alert.alert(...)` 문자열 전부**(제목/본문/버튼)
- [ ] **`app/challenge-complete.tsx`** — "Challenge Complete!", "n days completed", "n habits tracked", "Continue"
- [ ] **`app/onboarding.tsx`** — Step 0~3 제목/부제/버튼, `HOW_IT_WORKS` 4개 카드(title+desc), `SUGGESTED` 8개 habit `name`, "{target}x/day → 하루 {target}회"
- [ ] **`context/habits.tsx`** — `DEFAULT_HABITS` 5개의 `name`만 (운동/독서/명상/물 마시기/8시간 수면). `id`/`type`/`targetCount`/`createdAt` 유지.

### 날짜 표시 (index.tsx)
```ts
// 변경 전
new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
// 변경 후 (로케일만 교체, 옵션 순서는 무관)
new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
```

### 추가 확인 (있으면 처리, 없으면 넘어감)
- [ ] **`components/consistency-chart.tsx`**, **`components/calendar-heatmap.tsx`** 에 영어로 하드코딩된 축/요일/월 라벨이 있으면 한글화(또는 `ko-KR` 로케일 적용). 없으면 변경하지 않는다.

---

## 문구 처리 규칙

- 한국어 조사(`을(를)`, `이(가)` 등)는 **고정 문자열**로 처리한다. 받침에 따른 동적 분기는 만들지 않는다 (YAGNI).
- 이모지(🏃 📚 🔥 등)는 그대로 유지.
- 템플릿 리터럴 안의 변수(`${...}`)는 유지하고, 그 주변 영어 텍스트만 한글로. 예: `` `${completedCount} of ${total} complete` `` → `` `${total}개 중 ${completedCount}개 완료` `` (변수 위치가 바뀌는 것에 주의).

---

## 검증 (작업 완료 후 반드시 실행)

```bash
npx tsc --noEmit     # 타입 에러 0
npm run lint         # 린트 통과
```

그다음 Expo Go 실행 후 육안 확인:
1. 관리 탭 → 개발자 도구 → **온보딩 초기화** → 온보딩 Step 0~3 전부 한글인지
2. 세 탭(오늘/기록/관리) 문구 한글인지
3. 챌린지 생성 → 개발자 도구 "챌린지 강제 완료" → **완료 모달** 한글인지
4. 오늘 화면 날짜가 **"6월 28일 토요일"** 형식인지
5. 습관 삭제 시도 → **Alert 다이얼로그**가 한글인지

## 커밋

- 하나의 논리적 변경이므로 **단일 커밋** 권장 (예: `Localize UI strings to Korean`).
- 커밋 전 위 검증(tsc/lint)이 통과해야 한다.

## 완료 후

Claude가 코드 리뷰를 수행한다 (번역 누락 / 하드룰 위반 여부 / tsc·lint / 조사 어색함).
