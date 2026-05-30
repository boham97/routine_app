# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 개발 서버 (Vite, --host 플래그로 모바일 접속 가능)
npm run build    # 프로덕션 빌드 → dist/
```

테스트 프레임워크 없음. 빌드 성공 여부로 오류 확인.

## 아키텍처 개요

React + Vite SPA. 라우터·상태관리 라이브러리 없음. 모바일 퍼스트 iOS 스타일 UI, 스타일은 전부 인라인 JS 객체.

### 상태 관리

**모든 상태는 `App.jsx`에 집중**되어 있고 props로 내려보냄. Context/Redux 없음.

- **영속 상태** (localStorage 동기화): `todos`, `todoTemplates`, `todoGroups`, `workoutTemplates`, `workoutSessions`, `planTasks`, `foods`
- **UI 상태** (비영속): `tab`, `selectedDate`, `modal`, 타이머 상태 등

각 localStorage 키는 `useEffect`로 개별 동기화. `load(key, fallback)` 유틸(`constants.js`)로 초기 로드.

### 데이터 모델

```
todos[]              개별 태스크. taskType: 'workout' | 'general'
                     workout이면 sets, reps/seconds, completedSets[] 보유
                     createdAt ISO 날짜로 날짜별 필터링

workoutTemplates[]   운동 그룹 템플릿. {id, name, color, exercises:[{id,name,sets,reps,unit}]}
workoutSessions[]    날짜에 적용된 운동 인스턴스. templateId + date + completedSets[]

todoTemplates[]      일반 그룹 템플릿. {id, name, color, items:[{id,text,count}]}
todoGroups[]         날짜에 적용된 일반 인스턴스. templateId + date + completedCounts[]

foods[]              식자재. {id, name, expiry:'YYYY-MM-DD'|null, quantity, unit:'개'|'통', storage:'상온'|'냉장고'|'냉동실'}
                     unit '개'=개수(숫자), '통'=용기 잔량(0/25/50/75/100% 4칸 막대)
                     storage 보관 장소(기본 '냉장고'), 목록에 회색 배지로 표시
                     유통기한 임박할수록 빨간색 배지 (FoodTab의 expiryColor)
                     유통기한 입력은 인라인 달력(좌우 스와이프로 월 이동)
```

**템플릿 → 인스턴스 패턴**: 템플릿을 특정 날짜에 적용하면 completedSets/completedCounts 배열이 추가된 인스턴스(session/group)가 생성됨. 템플릿 삭제 시 연결된 인스턴스도 함께 삭제.

### 탭 구조

| 탭 | 컴포넌트 | 역할 |
|---|---|---|
| 플랜 | `TodoTab` | 날짜 선택 + 해당 날짜의 workoutSessions·todoGroups 체크 |
| 루틴 | `RoutineTab` | **오늘** 기준 todos 관리 + workoutTemplates·todoTemplates 관리 |
| 통계 | `StatsTab` | 월/연간 통계, 검색 |
| 식자재 | `FoodTab` | 날짜 선택 없는 식자재 목록. 유통기한·수량(개/g) 입력(인라인 달력), 임박순 정렬·빨간색 배지 |

탭 전환: 하단 탭바 버튼 또는 콘텐츠 영역 좌우 스와이프(`onTabSwipeStart/Move/End` in App.jsx).

### 슬라이드 패널 네비게이션 (`useSlidePanel` hook)

`RoutineTab.jsx` 내부에 정의된 커스텀 훅. iOS push navigation을 모방.

```
open()  → isOpen=true → rAF×2 후 entered=true → translateX(100%→0%)
close() → leaving=true → translateX(0%→100%) → 280ms 후 isOpen=false
```

현재 세 개의 패널이 독립적으로 존재:
- `taskPanel` — 태스크 상세/수정
- `wgPanel` — 운동 그룹 상세/수정
- `ggPanel` — 일반 그룹 상세/수정

패널 내부 오른쪽 스와이프(dx > 60px)로 닫힘. `touchmove`에 `passive: false` + `preventDefault`로 브라우저 네이티브 스와이프 간섭 차단. `e.stopPropagation()`으로 탭 스와이프와 충돌 방지.

### 타이머 시스템 (App.jsx)

두 타이머가 독립적으로 동작:

1. **휴식 타이머** (`restSec`): 세트 완료 후 60초 카운트다운. 화면 상단 배너 표시.
2. **운동 타이머** (`exTimer`): 초 단위 운동(`unit === '초'`)의 세트별 카운트업. elapsed >= total이면 오버타임(빨간색). 세트 버튼에 인라인 표시.

Web Audio API(`AudioContext`)로 완료 비프음. iOS 정책상 사용자 터치 이벤트(`confirmSet`, `toggleSet`) 시점에 `initAudioCtx()` 호출.

### 스타일 규칙

- `src/styles.js` — TodoTab·StatsTab에서 쓰는 공유 스타일 상수
- `src/components/ui.jsx` — NavCard, NavBtn, EmptyCard, StatCard 등 공유 컴포넌트
- `RoutineTab.jsx` — SEG(세그먼트 버튼), NUM_INPUT, SectionHeader, Stepper, ColorPicker를 파일 내 로컬 정의
- 색상 팔레트: `PALETTE` 배열(`constants.js`), 기본 8색

### 주요 상수 (`src/constants.js`)

```js
PALETTE   // 8가지 색상 배열 (그룹/세션 색상 선택용)
dateKey() // Date → 'YYYY-MM-DD' 문자열 (날짜별 데이터 필터 키)
load()    // localStorage JSON 파싱 + fallback
```

### `todos`의 이중 역할

`todos` 배열은 두 곳에서 다르게 사용됨:
- **루틴 탭**: `tasksForToday` (오늘 날짜 필터) → 태스크 목록으로 표시·관리
- **통계 탭**: 전체 기간 필터링으로 달성률 계산
- **플랜 탭**: 직접 사용하지 않음 (플랜 탭은 sessions/groups만 사용)
