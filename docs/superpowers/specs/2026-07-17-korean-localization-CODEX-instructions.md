# Codex 작업 지침서 — 한국어 감성 현지화 (2026-07-17)

이 문서는 **Codex가 실제 코드 수정을 수행하기 위한 실행 지침**이다.
번역 대상 전체 표(파일별 영→한, **친근·응원 톤**)는 아래 스펙에 있으니
**반드시 함께 열어두고 그 표를 그대로 따른다**:

> 📄 **번역 소스 오브 트루스:** `docs/superpowers/specs/2026-07-17-korean-localization-tone-revision.md`
>
> ⚠️ 구버전 `2026-06-28-korean-localization-*.md`(직역판)는 **사용하지 말 것.** 이 문서로 대체됨.

## 작업 개요

Expo/React Native 습관 추적 앱의 **UI에 보이는 영어 텍스트만** 한국어로 교체한다.
단순 번역이 아니라 **현지화(transcreation)** — 한국인이 처음부터 쓴 것처럼,
**친근하고 따뜻하게 응원하는 존댓말**(다정한 코치 톤).
방식 A: 통째 교체 (i18n 라이브러리·언어 전환 없음).

### 보이스 원칙 (스펙의 "보이스 가이드"와 동일)
- 존댓말 기본, 사용자를 다정하게 격려.
- **감성은 순간에 집중:** 온보딩·빈 상태·챌린지 완료·CTA는 따뜻하게. **짧은 라벨**
  (탭 이름/입력 라벨/통계 라벨)은 깔끔·간결하게 유지.
- 감성 단어 치환 예: `일관성` → **꾸준함**.
- 이모지는 축하·완료 순간에만 절제해서(🎉). 라벨엔 넣지 않는다.

---

## 🚫 하드 룰 — 절대 건드리지 말 것 (위반 시 데이터/로직 파손)

1. **AsyncStorage 키 문자열**: `'habits'`, `'completions'`, `'challenges'`, `'onboarding_complete'` — 그대로.
2. **`HabitType` 값**: `'daily'`, `'quantity'` — 내부 식별자. 문자열 리터럴을 한글로 바꾸지 않는다.
3. **습관 `id`, 날짜 키 포맷 `YYYY-MM-DD`** — 그대로.
4. **사용자 입력/런타임 데이터**: `challenge.name`, 사용자가 만든 habit의 `name` 등 렌더링되는
   **변수 값은 번역 대상이 아니다.** 오직 **소스에 하드코딩된 영어 리터럴**만 바꾼다.
5. **로직 변경 금지**: `getToday()`의 UTC 날짜 버그는 **이번 작업 범위 밖.** 날짜 관련은 아래
   "날짜 표시"의 로케일 문자열 하나만 바꾼다. 계산 로직은 손대지 않는다.
6. **스타일/구조 변경 금지**: `StyleSheet` 키 이름, 컴포넌트 구조, prop 이름은 그대로.
   오직 사용자에게 보이는 텍스트 리터럴만 교체.

---

## ✅ 작업 순서 (파일별 체크리스트)

각 파일의 정확한 영→한 매핑은 **톤 스펙의 해당 표**를 그대로 따른다.

- [ ] **`app/(tabs)/_layout.tsx`** — 탭 `title` 3개 (오늘/기록/관리)
- [ ] **`app/(tabs)/index.tsx`** — 진행 문구, "오늘도 다 해냈어요! 🎉", 챌린지 카드 진행, 빈 상태 안내, **날짜 로케일**(아래)
- [ ] **`app/(tabs)/history.tsx`** — title "기록", "연속", "최고", 빈 상태("…꾸준함을 확인할 수 있어요.")
- [ ] **`app/(tabs)/explore.tsx`** — 섹션 제목/라벨, placeholder 2개, 버튼 라벨, 기간 버튼 `{d}d → {d}일`, **`Alert.alert(...)` 문자열 전부**(제목/본문/버튼)
- [ ] **`app/challenge-complete.tsx`** — "챌린지 완료! 🎉", "{n}일 동안 해냈어요", "습관 {n}개 완주", "계속"
- [ ] **`app/onboarding.tsx`** — Step 0~3 제목/부제/버튼, `HOW_IT_WORKS` 4개 카드(title+desc), `SUGGESTED` 8개 habit `name`, "하루 {target}회"
- [ ] **`context/habits.tsx`** — `DEFAULT_HABITS` 5개의 `name`만 (운동/독서/명상/물 마시기/8시간 수면). `id`/`type`/`targetCount`/`createdAt` 유지.

### 날짜 표시 (index.tsx) — 로케일만 교체, 계산 로직 불변
```ts
// 변경 전
new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
// 변경 후
new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
// → "7월 17일 목요일"
```

### 추가 확인 (있으면 처리, 없으면 넘어감)
- [ ] **`components/consistency-chart.tsx`**, **`components/calendar-heatmap.tsx`** 에 하드코딩된
  영어 축/요일/월 라벨이 있으면 한글화(또는 `ko-KR` 로케일). 없으면 변경하지 않는다.

---

## 문구 처리 규칙

- 한국어 조사(`을(를)`, `이(가)` 등)는 **고정 문자열**로 처리(받침 동적 분기 만들지 않음, YAGNI).
- 이모지는 스펙에 명시된 곳(🎉 등)에만. 나머지는 유지/미추가.
- 템플릿 리터럴 안 변수(`${...}`)는 유지하고 주변 영어만 한글로.
  **변수 위치가 바뀌는 것 주의** — 예:
  `` `${completedCount} of ${total} complete` `` → `` `${total}개 중 ${completedCount}개 완료` ``.

---

## 검증 (작업 완료 후 반드시 실행)

```bash
npx tsc --noEmit     # 타입 에러 0
npm run lint         # 린트 통과
```

그다음 `npm run web`(크롬) 또는 Expo Go 실행 후 육안 확인:
1. 관리 탭 → 개발자 도구 → **온보딩 초기화** → 온보딩 Step 0~3 톤 확인
2. 세 탭(오늘/기록/관리) 문구 확인
3. 챌린지 생성 → "챌린지 강제 완료" → **완료 모달** "🎉" 확인
4. 오늘 화면 날짜가 **"7월 17일 목요일"** 형식인지
5. 습관 삭제 시도 → **Alert 다이얼로그** 한글 확인

## 커밋

- 하나의 논리적 변경이므로 **단일 커밋** 권장 (예: `Localize UI to Korean (friendly tone)`).
- 커밋 전 위 검증(tsc/lint)이 통과해야 한다.

## 완료 후

Claude가 코드 리뷰를 수행한다 (톤 일관성 / 하드룰 위반 / 번역 누락 / tsc·lint / 조사 어색함).
