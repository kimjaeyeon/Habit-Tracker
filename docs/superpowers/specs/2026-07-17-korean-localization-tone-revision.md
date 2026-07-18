# 한국어 현지화 — 감성 톤 개정 (Transcreation Spec)

작성일: 2026-07-17
대상: habit-tracker (Expo SDK 54 / React Native)
구현: **Codex** (이 문서는 설계 산출물, 실제 코드 수정은 Codex가 수행 → 이후 Claude 리뷰)
기반: `2026-06-28-korean-localization-design.md` (직역판) 을 **친근·따뜻 응원 톤으로 개정**

## 이 문서의 목적

기존 2026-06-28 스펙은 영어→한국어 **직역**이었다. 이 문서는 사용자 요구
("한국인의 감성에 맞게")를 반영해 **번역이 아니라 현지화(transcreation)** 로
전환한다 — 한국인이 처음부터 쓴 것처럼 자연스럽고, 다정하게 응원하는 말투.

> 딥 인터뷰(2026-07-17)에서 톤 = **친근·따뜻한 응원(존댓말, 다정한 코치)** 로 확정.

## 보이스 가이드 (모든 문구가 따르는 원칙)

1. **말투:** 존댓말 기본. 사용자를 다정하게 격려하는 코치·트레이너 톤. 지치지 않게.
2. **감성은 "순간"에 집중:** 첫인상(온보딩), 빈 상태, 축하(챌린지 완료), 행동 유도(CTA)
   에서 따뜻하게. 반대로 **짧은 라벨**(탭 이름, 입력 필드 라벨, 통계 라벨)은 깔끔·간결하게
   둔다 — 모든 곳을 꾸미면 오히려 촌스럽다. 이게 한국 앱 UX의 정석.
3. **감성 단어 치환:** 딱딱한 번역어를 정서적 한국어로. 예) `일관성` → **꾸준함**.
4. **이모지:** 축하·완료 순간에만 절제해서(🎉 등). 라벨엔 넣지 않는다.
5. **조사:** `을(를)`, `이(가)` 등은 고정 문자열(YAGNI, 동적 받침 처리 안 함).

## 범위 (Scope)

### ✅ 포함 — UI 텍스트 현지화만
화면에 보이는 하드코딩 영어 문구를 친근·응원 톤 한국어로 교체.

### 🚫 절대 안 바꿈 (기존 스펙과 동일한 하드룰)
- AsyncStorage 키: `'habits'`, `'completions'`, `'challenges'`, `'onboarding_complete'`
- `HabitType` 값: `'daily'`, `'quantity'` (내부 식별자)
- 습관 `id`, 날짜 키 포맷 `YYYY-MM-DD`
- 사용자 입력/런타임 값(챌린지 이름, 사용자가 만든 습관 이름 등)
- `StyleSheet` 키·컴포넌트 구조·prop 이름

### ⏸️ 이번 범위에서 제외 (별건, 딥 인터뷰에서 보류)
- **`getToday()` UTC 날짜 버그 수정** — 한국(UTC+9)에서 자정~오전 9시에 "오늘"이
  어제로 잡히는 문제. 계산 로직 변경이라 성격이 다르고 회귀 위험. **현지화 완료 후 별건**.
- **i18n 언어 전환(영/한 토글)** — 방식 A(통째 교체) 유지. YAGNI.

---

## 파일별 개정 번역표 (친근·응원 톤)

> 표기: 직역판 → **새 톤**. `{...}`는 변수, 그대로 유지.

### `app/(tabs)/_layout.tsx` — 탭 이름 (짧은 라벨: 깔끔 유지)
| 영어 | 한국어 |
|---|---|
| Today | 오늘 |
| History | 기록 |
| Manage | 관리 |

### `app/(tabs)/index.tsx` — 오늘 화면
| 영어 | 직역판 | **새 톤** |
|---|---|---|
| `{completedCount} of {total} complete` | {total}개 중 {completedCount}개 완료 | **{total}개 중 {completedCount}개 완료** (진행 카운터: 간결 유지) |
| All done for today! | 오늘 목표 모두 완료! | **오늘도 다 해냈어요! 🎉** |
| `{completedDays} / {totalDays} days` | {totalDays}일 중 {completedDays}일 | **{totalDays}일 중 {completedDays}일** (챌린지 카드: 간결) |
| `No habits yet.\nHead to the Manage tab to add some!` | 아직 습관이 없어요.\n관리 탭에서 추가해보세요! | **아직 습관이 없어요.\n관리 탭에서 하나 추가해볼까요?** |

**날짜 표시** (로케일만 교체, 로직 불변):
```ts
new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
// → "7월 17일 목요일"
```
> 챌린지 카드의 `{activeChallenge.name}`은 사용자 데이터 → 그대로.

### `app/(tabs)/history.tsx` — 기록 화면
| 영어 | 직역판 | **새 톤** |
|---|---|---|
| (title) History | 기록 | **기록** |
| Streak | 연속 | **연속** (통계 라벨: 간결) |
| Best | 최고 | **최고** |
| Add habits to see consistency data. | 습관을 추가하면 일관성 데이터가 표시됩니다. | **습관을 추가하면 꾸준함을 확인할 수 있어요.** |

> 확인: `components/consistency-chart.tsx`, `components/calendar-heatmap.tsx`에 하드코딩
> 영어 축/요일/월 라벨 있으면 `ko-KR` 로케일 또는 한글화. 없으면 변경 없음.

### `app/(tabs)/explore.tsx` — 관리 화면
| 영어 | 직역판 | **새 톤** |
|---|---|---|
| Pick an icon | 아이콘 선택 | **아이콘을 골라주세요** |
| Habit type | 습관 유형 | **습관 유형** |
| Daily ✓ | 매일 ✓ | **매일 ✓** |
| Quantity | 횟수 | **횟수** |
| Daily target: | 일일 목표: | **하루 목표:** |
| Habit name | 습관 이름 | **습관 이름** |
| placeholder `e.g. Morning Run` | 예: 아침 달리기 | **예: 아침 달리기** |
| Add | 추가 | **추가** |
| Your habits | 내 습관 | **내 습관** |
| Remind at | 알림 시각 | **알림 시각** |
| Set | 설정 | **설정** |
| No habits yet — add one above! | 아직 습관이 없어요 — 위에서 추가하세요! | **아직 습관이 없어요 — 위에서 하나 추가해볼까요?** |
| Challenges | 챌린지 | **챌린지** |
| placeholder `Challenge name` | 챌린지 이름 | **챌린지 이름** |
| Duration | 기간 | **기간** |
| 기간 버튼 `{d}d` (3/7/14/30) | {d}일 | **{d}일** |
| Include habits | 포함할 습관 | **포함할 습관** |
| Start Challenge | 챌린지 시작 | **챌린지 시작** |
| Developer Tools | 개발자 도구 | **개발자 도구** |
| Force Complete Challenge | 챌린지 강제 완료 | **챌린지 강제 완료** |
| Reset Onboarding | 온보딩 초기화 | **온보딩 초기화** |

**Alert 메시지** (다이얼로그: 정중·간결)
| 영어 | **새 톤** |
|---|---|
| 제목 `Remove Habit` / 본문 `Delete "{habitName}"?` | **습관 삭제** / **"{habitName}"을(를) 삭제할까요?** |
| `Cancel` / `Delete` | **취소** / **삭제** |
| 제목 `Permissions needed` / 본문 `Enable notifications in device settings.` | **알림 권한이 필요해요** / **기기 설정에서 알림을 켜주세요.** |

### `app/challenge-complete.tsx` — 챌린지 완료 모달 (축하 순간: 가장 따뜻하게)
| 영어 | 직역판 | **새 톤** |
|---|---|---|
| Challenge Complete! | 챌린지 완료! | **챌린지 완료! 🎉** |
| `{completedDays} days completed` | {completedDays}일 달성 | **{completedDays}일 동안 해냈어요** |
| `{habitIds.length} habits tracked` | 습관 {habitIds.length}개 | **습관 {habitIds.length}개 완주** |
| Continue | 계속 | **계속** |

### `app/onboarding.tsx` — 온보딩 (첫인상: 감성 집중)

**Step 0 (Welcome)**
| 영어 | 직역판 | **새 톤** |
|---|---|---|
| Build Better Habits | 더 나은 습관 만들기 | **오늘부터, 더 나은 나로** |
| Track your daily habits, build streaks, and become the best version of yourself. | 매일의 습관을 기록하고, 연속 기록을 쌓아 더 나은 나를 만들어보세요. | **매일의 습관을 기록하고 연속 기록을 쌓으며, 더 나은 나를 만들어가요.** |
| Get Started | 시작하기 | **지금 시작해볼까요?** |

**Step 1 (How It Works) — 제목/버튼**
| 영어 | 직역판 | **새 톤** |
|---|---|---|
| How It Works | 사용 방법 | **이렇게 사용해요** |
| Skip | 건너뛰기 | **건너뛰기** |
| Continue | 계속 | **계속** |

**Step 1 — `HOW_IT_WORKS` 카드 4개 (title / desc)**
| 영어 title | **새 톤 title** | **새 톤 desc** |
|---|---|---|
| Create Habits | 습관 만들기 | 매일 체크하거나 "물 8잔 마시기"처럼 횟수 목표를 세워보세요 |
| Take Challenges | 챌린지 도전 | 3일, 7일, 30일 연속에 도전하고 성취를 모아보세요 |
| Track Progress | 진행 확인 | 연속 기록과 꾸준함, 활동 기록을 한눈에 확인해요 |
| Stay on Track | 꾸준히 유지 | 습관마다 원하는 시간에 맞춤 알림을 받아보세요 |

**Step 2 (Choose Habits)**
| 영어 | 직역판 | **새 톤** |
|---|---|---|
| Choose Your Habits | 습관 선택 | **어떤 습관을 시작해볼까요?** |
| Pick at least 3 habits to start your journey. | 최소 3개의 습관을 골라 시작해보세요. | **최소 3개를 골라 시작해봐요.** |
| `{target}x/day` | 하루 {target}회 | **하루 {target}회** |

**Step 2 — `SUGGESTED` 추천 습관 8개 (name만, emoji/type/target 유지)**
| 영어 | 한국어 |
|---|---|
| Exercise | 운동 |
| Read | 독서 |
| Meditate | 명상 |
| Drink Water | 물 마시기 |
| Journal | 일기 |
| Walk | 산책 |
| Sleep 8hrs | 8시간 수면 |
| Healthy Meal | 건강한 식사 |

**Step 3 (Start Challenge)**
| 영어 | 직역판 | **새 톤** |
|---|---|---|
| 3-Day Challenge | 3일 챌린지 | **3일 챌린지** |
| Complete all your habits for 3 days to earn your first achievement. Ready? | 3일 동안 모든 습관을 완료하고 첫 성취를 얻어보세요. 준비됐나요? | **3일 동안 모든 습관을 완료하고 첫 성취를 얻어봐요. 준비됐나요?** |
| Start Challenge | 챌린지 시작 | **챌린지 시작** |

### `context/habits.tsx` — 기본 습관 5개 (`DEFAULT_HABITS`, name만)
| 영어 | 한국어 |
|---|---|
| Exercise | 운동 |
| Read | 독서 |
| Meditate | 명상 |
| Drink Water | 물 마시기 |
| Sleep 8hrs | 8시간 수면 |

---

## 검증 방법 (Codex 작업 후)

1. `npx tsc --noEmit` — 타입 에러 0
2. `npm run lint` — 린트 통과
3. 육안 확인 (웹 `npm run web` 또는 Expo Go):
   - 온보딩 초기화(관리 → 개발자 도구 → 온보딩 초기화) 후 Step 0~3 톤 확인
   - 세 탭(오늘/기록/관리) 문구 확인
   - 챌린지 생성 → 강제 완료 → 완료 모달 "🎉" 확인
   - 오늘 화면 날짜 "7월 17일 목요일" 형식
   - 습관 삭제 → Alert 한글 확인

## 인터뷰 산출 요약 (Deep Interview 2026-07-17)

- **Ambiguity: ~12%** (임계값 20% 통과)
- **확정된 톤:** 친근·따뜻한 응원 (존댓말, 다정한 코치)
- **노출된 가정 → 해소:** "한국어화 = 번역"이라는 가정을 뒤집음 → **번역이 아닌 현지화**로 재정의
- **보류(deferred):** UTC 날짜 버그 수정, i18n 언어 전환

## 완료 후

Codex가 구현 → **Claude가 코드 리뷰** (톤 일관성 / 하드룰 위반 / 번역 누락 / tsc·lint / 조사 어색함).
