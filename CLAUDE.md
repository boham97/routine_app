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
                     날짜 필터 없이 모든 날짜에서 하나의 접이식 그룹('일회성 태스크')으로 표시
                     date는 생성일 기록용 (표시 여부에 관여하지 않음)
                     체크하면 completed=true로 표시 후 450ms 뒤 자동 삭제 (완료 항목이 남지 않음)
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

### 기기 간 동기화 (계획 — 미구현)

**목적**: 회사 PC ↔ 폰(PWA) 사이에서 데이터가 자동으로 같아지게 하기. 수동 JSON 내보내기/가져오기는 깜빡하면 한쪽이 날아가므로 채택하지 않음.

**선택한 방식**: Vercel 서버리스 함수 1개 + 키-값 저장소에 **전체 상태를 JSON 한 덩어리**로 저장.
데이터가 작은 배열 7개뿐이라 테이블로 정규화할 이유가 없고, 로그인 UI 없이 '동기화 키' 하나로 기기를 묶을 수 있어 코드 추가량이 가장 적음 (서버 ~60줄 + 클라이언트 ~130줄, 암호화 포함).

#### 동기화 대상 (localStorage 키 7개, 전부 `useLocalState`)

| 키 | 소유 |
|---|---|
| `todos` | `useTodos` |
| `workoutTemplates`, `workoutSessions` | `useWorkoutData` |
| `todoTemplates`, `todoGroups` | `useTodoGroupData` |
| `planTasks` | `TodoTab` |
| `foods` | `FoodTab` |

신규 영속 상태를 추가하면 **이 목록과 `SYNC_KEYS` 상수에 반드시 같이 추가**할 것.

#### 페이로드 스키마

```jsonc
{
  "version": 1,          // 스키마 버전. 향후 마이그레이션 분기용
  "rev": 7,              // 서버가 write마다 +1. 충돌 감지용
  "updatedAt": "2026-11-18T09:00:00.000Z",
  "enc": { "iv": "<base64 12B>", "ct": "<base64 AES-GCM 암호문>" }
}
```

서버에 저장·전송되는 형태. `version`/`rev`/`updatedAt`만 평문이고 실제 데이터는 `enc` 안에 암호문으로만 존재.
복호화하면 아래 평문 `data`가 나옴 (클라이언트 메모리에서만):

```jsonc
{
  "todos": [], "workoutTemplates": [], "workoutSessions": [],
  "todoTemplates": [], "todoGroups": [], "planTasks": [], "foods": []
}
```

누락된 키는 `useLocalState`의 fallback(`[]`)으로 채움 — 구버전 payload도 받아들일 수 있어야 함.

#### 서버: `api/sync.js` (신규)

Vercel은 레포 루트의 `api/` 디렉터리를 서버리스 함수로 자동 인식 (Vite 빌드와 별개, 설정 불필요).

인증은 **`Authorization: Bearer <authId>` 헤더**로만 받음. 쿼리스트링(`?key=`) 금지 — URL은 Vercel 요청 로그·브라우저 기록·회사 프록시 로그에 남음.
서버는 원본 동기화 키를 **절대 받지 않음** (아래 '보안' 참고). 받는 건 키에서 파생된 `authId`뿐.

- `GET /api/sync` → 저장된 payload 또는 `{ rev: 0, enc: null }`
- `POST /api/sync` body `{ baseRev, enc }`
  - 저장소의 현재 `rev`가 `baseRev`와 다르면 **409 + 서버 payload 반환** (충돌)
  - 같으면 `rev+1`로 저장 후 새 payload 반환
- `DELETE /api/sync` → 해당 항목 삭제 (키 재발급 시 구 키 폐기용)
- 저장소 키: `routine:<sha256(authId)>` — 저장소 덤프나 대시보드를 봐도 유효한 `authId`를 알 수 없게 한 번 더 해시
- `authId` 검증: 64자 hex만 허용 (`/^[0-9a-f]{64}$/`). 임의 문자열로 저장소를 오염시키지 못하게.
- 요청 바디 크기 제한 (예: 1MB 초과 시 413). 키 없이도 아무나 호출 가능한 엔드포인트이므로.
- `enc`는 서버가 해석하지 않고 그대로 저장. 서버 로직은 `rev` 비교만.

**저장소**: Upstash Redis(Vercel 마켓플레이스 통합) 또는 Vercel Blob.
→ 구현 시점에 Vercel 대시보드에서 현재 제공되는 무료 티어 상품명을 먼저 확인할 것 (KV 상품 구성이 바뀌었을 수 있음).
자격증명은 **서버 환경변수로만** 두고 클라이언트에 노출 금지 (`vercel env add`).

#### 클라이언트

- `src/utils/backup.js` (신규) — `SYNC_KEYS` 상수, `collectLocal()` / `writeLocal(data)` 직렬화·역직렬화. 순수 함수만.
- `src/utils/crypto.js` (신규) — Web Crypto(`crypto.subtle`)만 사용, 외부 라이브러리 없음.
  - `deriveKeys(syncKey)` → `{ authId, encKey }` (HKDF-SHA256, info 문자열로 분리)
  - `encrypt(encKey, data)` → `{ iv, ct }` / `decrypt(encKey, enc)` → `data`
  - 복호화 실패(GCM 태그 불일치) 시 예외 → 키가 틀렸거나 데이터 손상. 로컬 데이터를 건드리지 말고 오류 표시.
- `src/hooks/useSync.js` (신규) — App.jsx에서 **한 번만** 호출. 도메인 훅(`useTodos` 등)에 동기화 로직을 넣지 말 것.
  - `syncKey`, `rev`는 `useLocalState('syncKey', '')` / `useLocalState('syncRev', 0)`로 영속화
  - **pull**: 앱 마운트 시 + `visibilitychange`로 포그라운드 복귀 시 (폰 PWA는 종료가 아니라 백그라운드로 가므로 마운트 훅만으로는 부족)
  - **push**: `SYNC_KEYS`에 해당하는 `storage` 변화를 감지해 **2초 디바운스** 후 전송
  - **오프라인**: 실패하면 조용히 넘기고 다음 pull/push 때 재시도. 별도 큐 불필요
- **pull 적용은 localStorage 일괄 write 후 `location.reload()`**.
  훅 7개가 이미 마운트된 상태라 setState를 분산 호출하면 일부만 반영되거나 그 setState가 다시 push를 유발하는 루프가 생김. 리로드가 가장 안전.
- 상태 표시: 화면 상단에 작은 인디케이터(동기화 중 / 완료 / 오프라인). 휴식 타이머 배너와 자리가 겹치지 않게 주의.

#### 보안

**전제: 동기화 키 = 비밀번호.** 키를 아는 사람은 데이터를 읽고 덮어쓸 수 있음. 아래 조치는 '키 자체 말고는 새는 경로가 없게' 하는 것이 목적이며, 키가 유출되면 재발급 외 대응 수단은 없음.

- **키 생성**: `crypto.getRandomValues(new Uint8Array(16))` → 32자 hex (128비트). 무작위 추측은 사실상 불가능.
- **키 파생 (HKDF-SHA256)**: 하나의 동기화 키에서 용도별로 분리
  - `authId` (info `"routine-sync/auth"`, 32B → 64자 hex) — 서버 인증·조회용. 서버에 전송됨
  - `encKey` (info `"routine-sync/enc"`, AES-GCM 256) — 암호화용. **기기 밖으로 나가지 않음**
  - `authId`로는 `encKey`를 역산할 수 없으므로 **서버·저장소 운영자·Vercel 로그 모두 데이터 내용을 볼 수 없음**
- **클라이언트 측 암호화 (AES-GCM)**: push 직전 `data` 전체를 암호화, pull 직후 복호화. `iv`는 매 암호화마다 새로 생성(재사용 금지).
- **전송**: `Authorization` 헤더만. 쿼리스트링·로그·`console.log`에 키/`authId` 출력 금지.
- **저장**: localStorage에는 원본 `syncKey`만 저장(`useLocalState('syncKey', '')`). 파생 키는 메모리에서 매번 계산.
- **키 재발급 (설정 UI 버튼)**:
  1. 새 키 생성 → 현재 로컬 데이터를 새 키로 암호화해 `baseRev: 0`으로 POST
  2. 성공하면 구 키로 `DELETE` → 로컬 `syncKey`/`syncRev` 교체
  3. 다른 기기는 새 키를 다시 입력해야 함 (UI에 안내)
- **구 키 기기 보호**: pull 결과가 `rev: 0, enc: null`인데 로컬 `syncRev > 0`이면 → **키가 폐기됐거나 서버 데이터가 사라진 것**. 자동 push 하지 말고(구 키로 데이터를 되살려버림) 동기화 일시정지 + "키를 다시 확인하세요" 표시.
- **UI 문구**: 키 표시 화면에 "이 키를 아는 사람은 모든 데이터를 볼 수 있습니다. 메신저·스크린샷 공유 주의. 유출이 의심되면 재발급하세요." 명시.

#### 충돌 처리

전체 덩어리 교체이므로 **양쪽에서 같은 시간대에 수정하면 한쪽이 사라짐**. `rev` 기반 409로 이를 감지해서 사용자에게 선택을 넘김:

- 409를 받으면 push를 중단하고 `useConfirm`으로 모달 — "서버 쪽 / 이 기기 쪽" 중 선택
- 서버 쪽 선택 → pull 후 리로드 / 이 기기 쪽 선택 → 서버 `rev`를 `baseRev`로 재전송(강제 덮어쓰기)
- 조용한 자동 병합은 하지 말 것. 어느 쪽이 맞는지 코드가 판단할 수 없음

#### 기기 연결 절차

1. 회사 PC에서 동기화 키 생성 (`crypto.getRandomValues` 16바이트 → hex) → 화면에 표시 (기본은 가림, 탭하면 표시)
2. 폰에서 그 키를 입력 (복사 붙여넣기, 추후 QR 고려)
3. 입력 직후 pull 해서 복호화 성공 여부로 키 검증 → 실패하면 저장하지 않음
4. 키가 곧 인증 수단이므로 **노출되면 데이터가 읽힌다**는 점을 UI에 명시 (위 '보안' 문구)

#### 구현 순서

1. `src/utils/backup.js` — `SYNC_KEYS` + 직렬화. 여기까지만으로 수동 내보내기/가져오기도 가능
2. `src/utils/crypto.js` — `deriveKeys`/`encrypt`/`decrypt`. 브라우저 콘솔에서 왕복(암호화→복호화) 먼저 확인
3. `api/sync.js` + 저장소 연결 + `vercel env` (헤더 인증, `sha256(authId)` 저장 키, 크기 제한, DELETE)
4. `src/hooks/useSync.js` — pull만 (수동 버튼으로 먼저 검증)
5. 자동 push(디바운스) + 충돌 모달 + 구 키 기기 보호
6. 동기화 설정 UI — 기존 `useSlidePanel` 패턴을 따르는 패널. 키 생성/입력/가림 표시/재발급
