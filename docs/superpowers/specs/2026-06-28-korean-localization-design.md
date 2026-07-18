# 한국어화 설계 (Korean Localization Spec)

> ⚠️ **[대체됨 / SUPERSEDED]** 이 문서는 **직역판**이다. 2026-07-17 딥 인터뷰에서
> 톤을 "친근·따뜻 응원"으로 확정하며 **감성 현지화판으로 개정**되었다. 실제 구현은
> 아래 문서를 따를 것:
> `docs/superpowers/specs/2026-07-17-korean-localization-tone-revision.md`
> (이 문서는 이력 보존용으로만 유지)

작성일: 2026-06-28
대상: habit-tracker (Expo SDK 54 / React Native)
구현: **Codex** (이 문서는 설계 산출물이며, 실제 코드 수정은 Codex가 수행)

## 목표

UI에 보이는 영어 텍스트를 모두 한국어로 교체한다 (방식 A: 통째 교체, i18n 라이브러리/언어 전환 없음).

## 범위 원칙

### ✅ 바꾼다 — 화면에 보이는 텍스트만
탭 이름, 화면 문구, 버튼 라벨, 섹션 제목, `Alert` 메시지, `placeholder`, 날짜 표시, 기본/추천 습관 이름.

### 🚫 절대 안 바꾼다 — 바꾸면 데이터/로직이 깨짐
- AsyncStorage 키: `'habits'`, `'completions'`, `'challenges'`, `'onboarding_complete'`
- `HabitType` 값: `'daily'`, `'quantity'` (내부 식별자)
- 습관 `id`, 날짜 키 포맷 `YYYY-MM-DD`
- 사용자가 입력한 데이터(챌린지 이름, 사용자가 만든 습관 이름 등) — 런타임 값이므로 건드리지 않음

### ⚠️ 이번 범위에서 제외 (의도적)
`context/habits.tsx`의 `getToday()` **UTC 날짜 버그**(자정~오전 9시에 "오늘"이 어제로 잡히는 문제)는 한국어화에 포함하지 않는다. 표시 텍스트가 아니라 계산 로직 수정이라 성격이 다르며, 잘못 건드리면 스트릭/챌린지 계산이 깨질 수 있다. CLAUDE.md 세션 로그에 별건으로 기록되어 있으며, 한국어화 완료 후 별도로 다룬다.

---

## 파일별 번역 대상

### `app/(tabs)/_layout.tsx` — 탭 이름
| 영어 | 한국어 |
|---|---|
| Today | 오늘 |
| History | 기록 |
| Manage | 관리 |

### `app/(tabs)/index.tsx` — 오늘 화면
| 영어 | 한국어 |
|---|---|
| `{completedCount} of {total} complete` | `{total}개 중 {completedCount}개 완료` |
| All done for today! | 오늘 목표 모두 완료! |
| `{completedDays} / {totalDays} days` | `{totalDays}일 중 {completedDays}일` |
| `No habits yet.\nHead to the Manage tab to add some!` | `아직 습관이 없어요.\n관리 탭에서 추가해보세요!` |

**날짜 표시** (현재 `toLocaleDateString('en-US', { weekday, month, day })`):
```ts
new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
// → "6월 28일 토요일"
```
> 챌린지 카드의 `{activeChallenge.name}`은 사용자 데이터이므로 그대로 둔다.

### `app/(tabs)/history.tsx` — 기록 화면
| 영어 | 한국어 |
|---|---|
| (title) History | 기록 |
| Streak | 연속 |
| Best | 최고 |
| Add habits to see consistency data. | 습관을 추가하면 일관성 데이터가 표시됩니다. |

> 구현 시 확인: `components/consistency-chart.tsx`, `components/calendar-heatmap.tsx`에 영어로 표시되는 축/요일/월 라벨이 있으면 함께 한국어화(또는 `ko-KR` 로케일 적용). 없으면 변경 없음.

### `app/(tabs)/explore.tsx` — 관리 화면
| 영어 | 한국어 |
|---|---|
| Pick an icon | 아이콘 선택 |
| Habit type | 습관 유형 |
| Daily ✓ | 매일 ✓ |
| Quantity | 횟수 |
| Daily target: | 일일 목표: |
| Habit name | 습관 이름 |
| placeholder: `e.g. Morning Run` | `예: 아침 달리기` |
| Add | 추가 |
| Your habits | 내 습관 |
| Remind at | 알림 시각 |
| Set | 설정 |
| No habits yet — add one above! | 아직 습관이 없어요 — 위에서 추가하세요! |
| Challenges | 챌린지 |
| placeholder: `Challenge name` | `챌린지 이름` |
| Duration | 기간 |
| 기간 버튼 `{d}d` (3/7/14/30) | `{d}일` |
| Include habits | 포함할 습관 |
| Start Challenge | 챌린지 시작 |
| Developer Tools | 개발자 도구 |
| Force Complete Challenge | 챌린지 강제 완료 |
| Reset Onboarding | 온보딩 초기화 |

**Alert 메시지**
| 영어 | 한국어 |
|---|---|
| 제목 `Remove Habit` / 본문 `Delete "{habitName}"?` | `습관 삭제` / `"{habitName}"을(를) 삭제할까요?` |
| `Cancel` / `Delete` | `취소` / `삭제` |
| 제목 `Permissions needed` / 본문 `Enable notifications in device settings.` | `권한 필요` / `기기 설정에서 알림을 켜주세요.` |

### `app/challenge-complete.tsx` — 챌린지 완료 모달
| 영어 | 한국어 |
|---|---|
| Challenge Complete! | 챌린지 완료! |
| `{completedDays} days completed` | `{completedDays}일 달성` |
| `{habitIds.length} habits tracked` | `습관 {habitIds.length}개` |
| Continue | 계속 |

### `app/onboarding.tsx` — 온보딩

**Step 0 (Welcome)**
| 영어 | 한국어 |
|---|---|
| Build Better Habits | 더 나은 습관 만들기 |
| Track your daily habits, build streaks, and become the best version of yourself. | 매일의 습관을 기록하고, 연속 기록을 쌓아 더 나은 나를 만들어보세요. |
| Get Started | 시작하기 |

**Step 1 (How It Works)** — 제목/버튼
| 영어 | 한국어 |
|---|---|
| How It Works | 사용 방법 |
| Skip | 건너뛰기 |
| Continue | 계속 |

**Step 1 — `HOW_IT_WORKS` 카드 4개 (title / desc)**
| 영어 title | 한국어 title | 영어 desc → 한국어 desc |
|---|---|---|
| Create Habits | 습관 만들기 | Add daily check-ins or counted goals like "drink 8 glasses of water" → 매일 체크하거나 "물 8잔 마시기"처럼 횟수 목표를 추가하세요 |
| Take Challenges | 챌린지 도전 | Push yourself with 3, 7, or 30-day streaks and earn achievements → 3일, 7일, 30일 연속에 도전하고 성취를 얻으세요 |
| Track Progress | 진행 확인 | See your streaks, consistency charts, and activity history → 연속 기록, 일관성 차트, 활동 기록을 확인하세요 |
| Stay on Track | 꾸준히 유지 | Set personalized reminders for each habit at the time that works for you → 습관마다 원하는 시간에 맞춤 알림을 설정하세요 |

**Step 2 (Choose Habits)**
| 영어 | 한국어 |
|---|---|
| Choose Your Habits | 습관 선택 |
| Pick at least 3 habits to start your journey. | 최소 3개의 습관을 골라 시작해보세요. |
| `{target}x/day` | `하루 {target}회` |

**Step 2 — `SUGGESTED` 추천 습관 8개 (name만 번역, emoji/type/target 유지)**
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
| 영어 | 한국어 |
|---|---|
| 3-Day Challenge | 3일 챌린지 |
| Complete all your habits for 3 days to earn your first achievement. Ready? | 3일 동안 모든 습관을 완료하고 첫 성취를 얻어보세요. 준비됐나요? |
| Start Challenge | 챌린지 시작 |

### `context/habits.tsx` — 기본 습관 5개 (`DEFAULT_HABITS`)
`name`만 번역. `id` / `type` / `targetCount` / `createdAt` 등은 그대로.
| 영어 | 한국어 |
|---|---|
| Exercise | 운동 |
| Read | 독서 |
| Meditate | 명상 |
| Drink Water | 물 마시기 |
| Sleep 8hrs | 8시간 수면 |

---

## 검증 방법

1. `npx tsc --noEmit` — 타입 에러 없음
2. `npm run lint` — 린트 통과
3. Expo Go에서 실행 후 육안 확인:
   - 온보딩 초기화(관리 탭 → 개발자 도구 → 온보딩 초기화) 후 온보딩 전 단계 한글 확인
   - 세 탭(오늘/기록/관리) 문구 한글 확인
   - 챌린지 생성 → 강제 완료 → 완료 모달 한글 확인
   - 오늘 화면 날짜가 "6월 28일 토요일" 형식인지 확인

## 주의 사항

- 기존에 영어 기본 습관(운동/독서 등)을 이미 저장한 사용자는 AsyncStorage에 영어 이름이 남아 있다. `DEFAULT_HABITS` 변경은 **신규 설치/온보딩 초기화 시에만** 반영된다 (기존 데이터 마이그레이션은 범위 밖, 의도적).
- 조사 `을(를)`, `이(가)` 등은 단순 고정 문자열로 처리한다 (동적 받침 처리는 과한 범위, YAGNI).
