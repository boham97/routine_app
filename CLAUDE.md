# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # 개발 서버 (Vite, --host 플래그로 모바일 접속 가능)
npm run build    # 프로덕션 빌드 → dist/
npx vercel --prod --yes   # Vercel 프로덕션 배포 (.vercel/project.json에 프로젝트 링크됨)
```

테스트 프레임워크 없음. 빌드 성공 여부로 오류 확인.

## 아키텍처 개요

React + Vite SPA. 라우터·상태관리 라이브러리 없음. 모바일 퍼스트 iOS 스타일 UI, 스타일은 전부 인라인 JS 객체.

### 디렉터리

```
src/
  App.jsx              컴포지션 루트 — 훅 조합 + 레이아웃/탭바 + 모달 렌더
  constants.js         MONTHS/DAYS/PALETTE/UNITS, dateKey/addDays/getToday/load
  styles.js            공유 스타일 상수 (TodoTab/StatsTab)
  main.jsx             React mount

  hooks/               도메인별 상태/로직 캡슐화
    useLocalState.js   useState + localStorage 동기화 통합
    useTodos.js        todos + addTask/toggleTodo/deleteTodo/toggleTaskSet/updateTask
    useWorkoutData.js  workoutTemplates + workoutSessions + applyWorkoutTemplate/CRUD
    useTodoGroupData.js todoTemplates + todoGroups + applyTodoTemplate/CRUD
    useWorkoutRunner.js 세트 토글/휴식·운동 타이머/드럼휠 트리거 런타임
    useBeep.js         AudioContext + playBeep (iOS 터치 시점 init)
    useConfirm.js      확인 모달 상태

  utils/
    date.js            getMondayOfWeek, labelForDate

  components/
    TodoTab.jsx        플랜 탭 (날짜 + 세션/그룹 체크 + 일회성 태스크)
    RoutineTab.jsx     루틴 탭 (todos·템플릿 관리, 슬라이드 패널들)
    StatsTab.jsx       통계 탭
    FoodTab.jsx        식자재 탭 (자체적으로 foods 상태 소유)
    Modals.jsx         DrumWheelModal, ConfirmModal (내부 상태 캡슐화)
    ui.jsx             NavCard/NavBtn/EmptyCard/StatCard + useHold 훅
```

### 상태 관리 원칙

Context/Redux 없음. **도메인별 훅으로 캡슐화**하고, 결과는 **props로 자식에 전달** (props drilling 허용).

- **공유 영속 상태** (탭 간 공유 — App.jsx에서 훅 호출):
  - `useTodos()` → `todos`
  - `useWorkoutData()` → `workoutTemplates`, `workoutSessions`
  - `useTodoGroupData()` → `todoTemplates`, `todoGroups`
- **단일 탭 영속 상태** (해당 컴포넌트가 직접 소유):
  - `FoodTab` 내부 `useLocalState('foods', [])`
  - `TodoTab` 내부 `useLocalState('planTasks', [])`
- **UI 상태** (비영속): `tab`, `selectedDate`(App), `expandedSession/expandedTodoGroup`(TodoTab), 모달/패널 상태 등

영속화는 전부 `useLocalState(key, fallback)` 훅으로 통합 — 직접 `useEffect + localStorage`를 쓰지 말 것.

### App.jsx의 책임

App.jsx는 **컴포지션 루트**로만 동작:
1. 도메인 훅 호출 (`useTodos`, `useWorkoutData`, `useTodoGroupData`, `useWorkoutRunner`, `useConfirm`)
2. 날짜 필터 derive (`sessionsForDay`, `groupsForDay`, `available*`)
3. 슬라이딩 탭 컨테이너 + `TabBar` 서브컴포넌트 렌더
4. `DrumWheelModal`, `ConfirmModal`을 runner/confirm 결과로 렌더
5. `applyWorkoutTemplate/applyTodoTemplate`는 App에서 `selKey`를 바인딩해 자식에 전달

App에 도메인 로직(CRUD, 타이머)을 다시 끌어오지 말 것. 신규 도메인은 새 훅으로 추가.

### 데이터 모델

```
todos[]              개별 태스크. taskType: 'workout' | 'general'
                     workout이면 sets, reps/seconds, completedSets[] 보유
                     createdAt ISO 날짜로 날짜별 필터링

workoutTemplates[]   운동 그룹 템플릿. {id, name, color, exercises:[{id,name,sets,reps,unit}]}
workoutSessions[]    날짜에 적용된 운동 인스턴스. templateId + date + completedSets[]

todoTemplates[]      일반 그룹 템플릿. {id, name, color, items:[{id,text,count}]}
todoGroups[]         날짜에 적용된 일반 인스턴스. templateId + date + completedCounts[]

planTasks[]          일회성 태스크 (TodoTab 소유). {id, text, date, completed}
foods[]              식자재 (FoodTab 소유). {id, name, expiry, quantity, storage, decimal}
                     quantity 수량(문자열). 등록 시 정수(드럼휠·관성·최소 1, 기본 1개). 사용 시 소수 가능
                     decimal '소수 단위 사용' 체크 여부. 사용/수정 시 decimal이면 0.2 단위, 아니면 1 단위 증감
                     storage 보관 장소(기본 '냉장고'), 목록에 회색 배지
                     유통기한 임박할수록 빨간색 배지 (FoodTab의 expiryColor)
                     유통기한 입력은 YYYY.MM.DD readOnly 칸 탭 → 작은 모달 달력. 수량은 탭 → 작은 모달 드럼휠
                     목록 항목 탭 → 사용/수정 슬라이드 패널: 이름·보관·유통기한·소수단위·남은수량 편집, 삭제/완료
                     남은 수량 0개로 저장하면 항목 삭제 (체크 옆 빨간 '0개 되면 삭제됩니다' 경고)
                     달력 모달은 calFor('add'|'edit')로 추가폼/상세폼 분기
```

**템플릿 → 인스턴스 패턴**: 템플릿을 특정 날짜에 적용하면 completedSets/completedCounts가 추가된 인스턴스(session/group)가 생성됨. 템플릿 삭제 시 연결된 인스턴스도 함께 삭제 (`deleteWorkoutTpl`, `deleteTodoTpl` 내부 처리).

`applyWorkoutTemplate(tpl, scope, selKey)` / `applyTodoTemplate(tpl, scope, selKey)` — `scope: 'today' | 'week'`. App에서 `selKey`를 바인딩해 자식에 `(tpl, scope)` 시그니처로 전달.

### 탭 구조

| 탭 | 컴포넌트 | 역할 |
|---|---|---|
| 플랜 | `TodoTab` | 날짜 선택 + 해당 날짜의 workoutSessions·todoGroups 체크 + planTasks (자체 소유) |
| 루틴 | `RoutineTab` | **오늘** 기준 todos 관리 + workoutTemplates·todoTemplates 관리 |
| 통계 | `StatsTab` | 주/월간 통계, 검색 |
| 식자재 | `FoodTab` | 자체 foods 상태. 추가는 슬라이드 패널, 유통기한/수량은 작은 모달, 임박순 정렬·빨간 배지. 항목 탭 → 사용/수정 패널 |

탭 전환: 하단 `TabBar`(App.jsx 내부 서브컴포넌트) 또는 콘텐츠 영역 좌우 스와이프.

### 슬라이드 패널 네비게이션 (`useSlidePanel`)

`RoutineTab.jsx` 내부에 정의된 커스텀 훅. iOS push navigation을 모방.

```
open()  → isOpen=true → rAF×2 후 entered=true → translateX(100%→0%)
close() → leaving=true → translateX(0%→100%) → 280ms 후 isOpen=false
```

RoutineTab은 세 패널(`taskPanel`, `wgPanel`, `ggPanel`) 독립 운용. FoodTab도 동일한 훅을 자체 정의해 추가/사용 패널에 사용.

패널 내부 오른쪽 스와이프(dx > 60px)로 닫힘. `touchmove`에 `passive: false` + `preventDefault`로 브라우저 네이티브 스와이프 간섭 차단. `e.stopPropagation()`으로 탭 스와이프와 충돌 방지.

### 타이머 시스템 (`useWorkoutRunner`)

세트 토글/타이머 런타임을 캡슐화한 훅. App에서 한 번 호출 후 결과를 TodoTab과 DrumWheelModal에 props로 분배.

두 타이머가 독립적으로 동작:
1. **휴식 타이머** (`restSec`): 세트 완료 후 60초 카운트다운. App에서 화면 상단 배너 렌더.
2. **운동 타이머** (`exTimer`): 초 단위 운동(`unit === '초'`)의 세트별 카운트업. elapsed >= total이면 오버타임(빨간색). TodoTab이 세트 버튼에 인라인 표시.

`useBeep()` 훅이 `AudioContext` + `playBeep` 캡슐화. iOS 정책상 사용자 터치 시점에 `beep.init()` 호출 (`toggleSet`, `confirmSet` 내부에서 자동).

드럼휠은 `pendingSet`이 set되면 App이 `DrumWheelModal` 렌더. 모달 내부의 wheelOffset/dragStartY 등 애니메이션 상태는 모달 컴포넌트가 직접 보유.

### 스타일 규칙

- `src/styles.js` — TodoTab·StatsTab 공유 스타일 상수
- `src/components/ui.jsx` — NavCard, NavBtn, EmptyCard, StatCard + `useHold` 훅(길게 누르면 반복: 즉시 1회 → 450ms 후 140ms 간격. 포인터 이벤트 기반)
  - `useHold`는 RoutineTab `Stepper`와 FoodTab 수량 ± 버튼에서 사용
- `RoutineTab.jsx` — SEG, NUM_INPUT, SectionHeader, Stepper, ColorPicker 로컬 정의
- 색상 팔레트: `PALETTE` 배열(`constants.js`), 기본 8색

### 주요 상수 (`src/constants.js`)

```js
PALETTE   // 8가지 색상 배열
dateKey() // Date → 'YYYY-MM-DD'
addDays(), getToday()
load()    // localStorage JSON 파싱 + fallback (useLocalState가 내부적으로 사용)
```

### `todos`의 이중 역할

`todos` 배열은 두 곳에서 다르게 사용됨:
- **루틴 탭**: 오늘 날짜 필터 → 태스크 목록 표시·관리
- **통계 탭**: 전체 기간 필터로 달성률 계산
- **플랜 탭**: 직접 사용하지 않음 (sessions/groups만 사용)

### 배포

Vercel 프로젝트 링크됨 (`.vercel/project.json` — `prj_VxxiE5603pHZMSwQvO576Bhkkhay`, alias `routineapp-two.vercel.app`). `npx vercel --prod --yes`로 배포.
