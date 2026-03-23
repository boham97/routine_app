import { useState, useEffect, useRef } from 'react'
import { MONTHS, PALETTE, dateKey, addDays, getToday, load } from './constants.js'
import TodoTab from './components/TodoTab.jsx'
import RoutineTab from './components/RoutineTab.jsx'
import StatsTab from './components/StatsTab.jsx'
import { DrumWheelModal, ConfirmModal } from './components/Modals.jsx'

export default function App() {
  const [tab, setTab] = useState('todo')

  // ── 공통 날짜 ──────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(getToday())

  // ── 개별 할일 ──────────────────────────────────────────────
  const [todos,         setTodos]         = useState(() => load('todos', []))
  const [todoInput,     setTodoInput]     = useState('')
  const [showTodoInput, setShowTodoInput] = useState(false)

  // ── 할일 그룹 (템플릿 기반, 반복횟수 지원) ─────────────────
  const [todoTemplates,       setTodoTemplates]       = useState(() => load('todoTemplates', []))
  const [todoGroups,          setTodoGroups]          = useState(() => load('todoGroups', []))
  const [expandedTodoGroup,   setExpandedTodoGroup]   = useState({})
  const [showTodoGroupPanel,  setShowTodoGroupPanel]  = useState(false)

  // ── 운동 루틴 ──────────────────────────────────────────────
  const [workoutTemplates, setWorkoutTemplates] = useState(() => load('workoutTemplates', []))
  const [workoutSessions,  setWorkoutSessions]  = useState(() => load('workoutSessions',  []))
  const [expandedSession,  setExpandedSession]  = useState({})
  const [showWorkoutPanel, setShowWorkoutPanel] = useState(false)

  // ── 루틴 탭 상태 ───────────────────────────────────────────
  const [routineTab,        setRoutineTab]        = useState('workout')
  const [showWorkoutForm,   setShowWorkoutForm]   = useState(false)
  const [editingWorkoutId,  setEditingWorkoutId]  = useState(null)
  const [wName,  setWName]  = useState('')
  const [wColor, setWColor] = useState(PALETTE[0])
  const [wExercises, setWExercises] = useState([])
  const [exInput, setExInput] = useState('')
  const [exSets,  setExSets]  = useState('3')
  const [exReps,  setExReps]  = useState('10')
  const [exUnit,  setExUnit]  = useState('회')
  const exInputRef = useRef(null)

  const [showTodoTplForm,  setShowTodoTplForm]  = useState(false)
  const [editingTodoTplId, setEditingTodoTplId] = useState(null)
  const [ttName,  setTtName]  = useState('')
  const [ttColor, setTtColor] = useState(PALETTE[1])
  const [ttItems, setTtItems] = useState([])
  const [ttInput, setTtInput] = useState('')
  const [ttCount, setTtCount] = useState('1')
  const ttInputRef = useRef(null)

  // ── 세트 실제 횟수 입력 ────────────────────────────────────
  const [pendingSet, setPendingSet] = useState(null)
  const [pendingReps, setPendingReps] = useState(0)
  const [wheelOffset, setWheelOffset] = useState(0)
  const dragStartY = useRef(null)
  const dragStartVal = useRef(0)
  const restTimerRef = useRef(null)
  const [restSec, setRestSec] = useState(null)
  const audioCtxRef = useRef(null)

  // ── 초 단위 운동 타이머 ────────────────────────────────────
  const exTimerIntervalRef = useRef(null)
  const [exTimer, setExTimer] = useState(null) // { sessionId, exerciseId, setIdx, remaining, total }

  function initAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }

  function playBeep() {
    try {
      const ctx = audioCtxRef.current
      if (!ctx) return
      const beep = (freq, start, dur) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq; osc.type = 'sine'
        gain.gain.setValueAtTime(0.7, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
        osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur)
      }
      beep(880, 0, 0.15); beep(880, 0.2, 0.15); beep(1100, 0.4, 0.4)
    } catch {}
  }

  // ── 통계 ───────────────────────────────────────────────────
  const now = new Date()
  const thisYear = now.getFullYear(); const thisMonth = now.getMonth()
  const [viewYear,    setViewYear]    = useState(thisYear)
  const [viewMonth,   setViewMonth]   = useState(thisMonth)
  const [statsSearch, setStatsSearch] = useState('')

  // ── localStorage 동기화 ────────────────────────────────────
  useEffect(() => { localStorage.setItem('todos',            JSON.stringify(todos))            }, [todos])
  useEffect(() => { localStorage.setItem('todoTemplates',    JSON.stringify(todoTemplates))    }, [todoTemplates])
  useEffect(() => { localStorage.setItem('todoGroups',       JSON.stringify(todoGroups))       }, [todoGroups])
  useEffect(() => { localStorage.setItem('workoutTemplates', JSON.stringify(workoutTemplates)) }, [workoutTemplates])
  useEffect(() => { localStorage.setItem('workoutSessions',  JSON.stringify(workoutSessions))  }, [workoutSessions])

  // ── 날짜 helpers ───────────────────────────────────────────
  const todayKey = dateKey(getToday())
  const selKey   = dateKey(selectedDate)

  const labelForDate = d => {
    const key = dateKey(d)
    if (key === todayKey) return '오늘'
    if (key === dateKey(addDays(getToday(), -1))) return '어제'
    if (key === dateKey(addDays(getToday(),  1))) return '내일'
    return null
  }

  // ── 개별 할일 CRUD ─────────────────────────────────────────
  function addTodo() {
    const text = todoInput.trim(); if (!text) return
    const createdAt = new Date(selectedDate); createdAt.setHours(12,0,0,0)
    setTodos(p => [...p, { id: Date.now(), text, completed: false, createdAt: createdAt.toISOString() }])
    setTodoInput(''); setShowTodoInput(false)
  }
  function toggleTodo(id) {
    setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }
  function deleteTodo(id) { setTodos(p => p.filter(t => t.id !== id)) }
  const todosForDay = todos.filter(t => dateKey(t.createdAt) === selKey)

  // ── 할일 그룹 CRUD ─────────────────────────────────────────
  function applyTodoTemplate(tpl) {
    if (todoGroups.find(g => g.templateId === tpl.id && g.date === selKey)) return
    const group = {
      id: Date.now(), templateId: tpl.id, name: tpl.name, color: tpl.color, date: selKey,
      items: tpl.items.map(item => ({ ...item, completedCounts: Array(item.count).fill(false) }))
    }
    setTodoGroups(p => [...p, group])
    setExpandedTodoGroup(p => ({ ...p, [group.id]: true }))
    setShowTodoGroupPanel(false)
  }
  function removeTodoGroup(id) { setTodoGroups(p => p.filter(g => g.id !== id)) }
  function toggleGroupItemCount(groupId, itemId, idx) {
    setTodoGroups(p => p.map(g => g.id !== groupId ? g : {
      ...g, items: g.items.map(item => item.id !== itemId ? item : {
        ...item, completedCounts: item.completedCounts.map((v, i) => i === idx ? !v : v)
      })
    }))
  }

  const groupsForDay           = todoGroups.filter(g => g.date === selKey)
  const appliedTodoTplIds      = groupsForDay.map(g => g.templateId)
  const availableTodoTemplates = todoTemplates.filter(t => !appliedTodoTplIds.includes(t.id))

  // exTimer: elapsed가 total에 도달하면 알림음만 (완료는 탭으로)
  useEffect(() => {
    if (exTimer?.elapsed !== exTimer?.total) return
    playBeep()
  }, [exTimer])

  // ── 운동 CRUD ──────────────────────────────────────────────
  function applyWorkoutTemplate(tpl) {
    if (workoutSessions.find(s => s.templateId === tpl.id && s.date === selKey)) return
    const session = {
      id: Date.now(), templateId: tpl.id, name: tpl.name, color: tpl.color, date: selKey,
      exercises: tpl.exercises.map(e => ({ ...e, completedSets: Array(e.sets).fill(false) }))
    }
    setWorkoutSessions(p => [...p, session])
    setExpandedSession(p => ({ ...p, [session.id]: true }))
    setShowWorkoutPanel(false)
  }
  function removeSession(id) {
    if (exTimer?.sessionId === id) { clearInterval(exTimerIntervalRef.current); setExTimer(null) }
    setWorkoutSessions(p => p.filter(s => s.id !== id))
  }
  function toggleSet(sessionId, exerciseId, setIdx) {
    const session = workoutSessions.find(s => s.id === sessionId)
    const ex = session?.exercises.find(e => e.id === exerciseId)
    const cur = ex?.completedSets?.[setIdx] ?? false

    // 이 세트의 타이머가 돌고 있으면 실제 경과 시간으로 기록
    if (exTimer && exTimer.sessionId === sessionId && exTimer.exerciseId === exerciseId && exTimer.setIdx === setIdx) {
      clearInterval(exTimerIntervalRef.current)
      const actual = exTimer.elapsed
      setExTimer(null)
      setWorkoutSessions(p => p.map(s => s.id !== sessionId ? s : {
        ...s, exercises: s.exercises.map(e => e.id !== exerciseId ? e : {
          ...e, completedSets: Array.from({length: e.sets}, (_, i) =>
            i === setIdx ? actual : (e.completedSets?.[i] ?? false)
          )
        })
      }))
      initAudioCtx()
      if (restTimerRef.current) clearInterval(restTimerRef.current)
      setRestSec(60)
      restTimerRef.current = setInterval(() => {
        setRestSec(prev => {
          if (prev <= 1) { clearInterval(restTimerRef.current); restTimerRef.current = null; playBeep(); return null }
          return prev - 1
        })
      }, 1000)
      return
    }

    if (cur !== false) {
      setWorkoutSessions(p => p.map(s => s.id !== sessionId ? s : {
        ...s, exercises: s.exercises.map(e => e.id !== exerciseId ? e : {
          ...e, completedSets: Array.from({length: e.sets}, (_, i) =>
            i === setIdx ? false : (e.completedSets?.[i] ?? false)
          )
        })
      }))
    } else if (ex?.unit === '초') {
      // 초 단위: 카운트다운 타이머 시작
      initAudioCtx()
      clearInterval(exTimerIntervalRef.current)
      const total = ex.reps
      setExTimer({ sessionId, exerciseId, setIdx, elapsed: 0, total })
      exTimerIntervalRef.current = setInterval(() => {
        setExTimer(prev => {
          if (!prev) { clearInterval(exTimerIntervalRef.current); return null }
          return { ...prev, elapsed: prev.elapsed + 1 }
        })
      }, 1000)
    } else {
      setPendingSet({ sessionId, exerciseId, setIdx, plannedReps: ex?.reps ?? 0, unit: ex?.unit ?? '회' })
      setPendingReps(ex?.reps ?? 0)
    }
  }
  function confirmSet() {
    const reps = pendingReps > 0 ? pendingReps : pendingSet.plannedReps
    setWorkoutSessions(p => p.map(s => s.id !== pendingSet.sessionId ? s : {
      ...s, exercises: s.exercises.map(e => e.id !== pendingSet.exerciseId ? e : {
        ...e, completedSets: Array.from({length: e.sets}, (_, i) =>
          i === pendingSet.setIdx ? reps : (e.completedSets?.[i] ?? false)
        )
      })
    }))
    setPendingSet(null)
    // 1분 휴식 타이머 (iOS용: 유저 터치 시점에 AudioContext 초기화)
    initAudioCtx()
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    setRestSec(60)
    restTimerRef.current = setInterval(() => {
      setRestSec(prev => {
        if (prev <= 1) {
          clearInterval(restTimerRef.current)
          restTimerRef.current = null
          playBeep()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  const sessionsForDay     = workoutSessions.filter(s => s.date === selKey)
  const appliedTemplateIds = sessionsForDay.map(s => s.templateId)
  const availableTemplates = workoutTemplates.filter(t => !appliedTemplateIds.includes(t.id))

  // ── 운동 루틴 템플릿 CRUD ──────────────────────────────────
  function openAddWorkout() {
    setEditingWorkoutId(null); setWName(''); setWColor(PALETTE[0]); setWExercises([])
    setExInput(''); setExSets('3'); setExReps('10'); setExUnit('회')
    setShowWorkoutForm(true)
  }
  function openEditWorkout(tpl) {
    setEditingWorkoutId(tpl.id); setWName(tpl.name); setWColor(tpl.color); setWExercises([...tpl.exercises])
    setExInput(''); setExSets('3'); setExReps('10'); setExUnit('회')
    setShowWorkoutForm(true)
  }
  function addExercise() {
    const name = exInput.trim(); if (!name) return
    setWExercises(p => [...p, { id: Date.now(), name, sets: parseInt(exSets)||3, reps: parseInt(exReps)||10, unit: exUnit }])
    setExInput(''); setExSets('3'); setExReps('10'); setExUnit('회')
    setTimeout(() => exInputRef.current?.focus(), 50)
  }
  function removeExercise(id) { setWExercises(p => p.filter(e => e.id !== id)) }
  function saveWorkoutTpl() {
    if (!wName.trim() || wExercises.length === 0) return
    if (editingWorkoutId) {
      setWorkoutTemplates(p => p.map(t => t.id === editingWorkoutId
        ? { ...t, name: wName.trim(), color: wColor, exercises: [...wExercises] } : t))
    } else {
      setWorkoutTemplates(p => [...p, { id: Date.now(), name: wName.trim(), color: wColor, exercises: [...wExercises] }])
    }
    setShowWorkoutForm(false); setEditingWorkoutId(null)
  }
  function deleteWorkoutTpl(id) {
    setWorkoutTemplates(p => p.filter(t => t.id !== id))
    setWorkoutSessions(p => p.filter(s => s.templateId !== id))
  }

  // ── 할일 그룹 템플릿 CRUD ──────────────────────────────────
  function openAddTodoTpl() {
    setEditingTodoTplId(null); setTtName(''); setTtColor(PALETTE[1]); setTtItems([])
    setTtInput(''); setTtCount('1'); setShowTodoTplForm(true)
  }
  function openEditTodoTpl(tpl) {
    setEditingTodoTplId(tpl.id); setTtName(tpl.name); setTtColor(tpl.color); setTtItems([...tpl.items])
    setTtInput(''); setTtCount('1'); setShowTodoTplForm(true)
  }
  function addTtItem() {
    const text = ttInput.trim(); if (!text) return
    setTtItems(p => [...p, { id: Date.now(), text, count: parseInt(ttCount)||1 }])
    setTtInput(''); setTtCount('1')
    setTimeout(() => ttInputRef.current?.focus(), 50)
  }
  function removeTtItem(id) { setTtItems(p => p.filter(x => x.id !== id)) }
  function saveTodoTpl() {
    if (!ttName.trim() || ttItems.length === 0) return
    if (editingTodoTplId) {
      setTodoTemplates(p => p.map(t => t.id === editingTodoTplId
        ? { ...t, name: ttName.trim(), color: ttColor, items: [...ttItems] } : t))
      setTodoGroups(p => p.map(g => g.templateId === editingTodoTplId
        ? { ...g, name: ttName.trim(), color: ttColor } : g))
    } else {
      setTodoTemplates(p => [...p, { id: Date.now(), name: ttName.trim(), color: ttColor, items: [...ttItems] }])
    }
    setShowTodoTplForm(false); setEditingTodoTplId(null)
  }
  function deleteTodoTpl(id) {
    setTodoTemplates(p => p.filter(t => t.id !== id))
    setTodoGroups(p => p.filter(g => g.templateId !== id))
  }

  // ── 확인 모달 ──────────────────────────────────────────────
  const [modal, setModal] = useState({ show: false, message: '', onConfirm: null })
  function confirm(message, onConfirm) { setModal({ show: true, message, onConfirm }) }
  function closeModal() { setModal({ show: false, message: '', onConfirm: null }) }

  // ── 통계 helpers ───────────────────────────────────────────
  const isCurrentMonth = viewYear === thisYear && viewMonth === thisMonth
  function prevMonth() { viewMonth===0?(setViewMonth(11),setViewYear(y=>y-1)):setViewMonth(m=>m-1) }
  function nextMonth() { viewMonth===11?(setViewMonth(0),setViewYear(y=>y+1)):setViewMonth(m=>m+1) }
  const rate = (done, total) => total===0 ? 0 : Math.round((done/total)*100)

  const todosVM    = todos.filter(t => { const d=new Date(t.createdAt); return d.getFullYear()===viewYear&&d.getMonth()===viewMonth })
  const todosVY    = todos.filter(t => new Date(t.createdAt).getFullYear()===viewYear)
  const sessionsVM = workoutSessions.filter(s => { const d=new Date(s.date); return d.getFullYear()===viewYear&&d.getMonth()===viewMonth })
  const allSetsVM  = sessionsVM.flatMap(s => s.exercises.flatMap(e => e.completedSets))
  const doneSetsVM = allSetsVM.filter(Boolean)

  const monthlyData = MONTHS.map((_,mi) => {
    const t = todos.filter(t=>{ const d=new Date(t.createdAt); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    const s = workoutSessions.filter(s=>{ const d=new Date(s.date); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    const totalSets = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).length
    const doneSets  = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).filter(Boolean).length
    return { todoAdded: t.length, todoDone: t.filter(x=>x.completed).length, totalSets, doneSets }
  })
  const maxTodo = Math.max(...monthlyData.map(m=>m.todoAdded), 1)
  const maxSets = Math.max(...monthlyData.map(m=>m.totalSets), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', position:'fixed', inset:0, background:'#f2f2f7' }}>

      {/* 휴식 타이머 */}
      {restSec !== null && (
        <div style={{ background: restSec <= 10 ? '#ff3b30' : '#34c759', color:'#fff', textAlign:'center', padding:'6px', fontSize:'14px', fontWeight:'600', flexShrink:0 }}>
          휴식 {restSec}초 남음
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>

        {tab==='todo' && (
          <TodoTab
            selectedDate={selectedDate} setSelectedDate={setSelectedDate}
            labelForDate={labelForDate}
            sessionsForDay={sessionsForDay} expandedSession={expandedSession} setExpandedSession={setExpandedSession} toggleSet={toggleSet} exTimer={exTimer}
            groupsForDay={groupsForDay} expandedTodoGroup={expandedTodoGroup} setExpandedTodoGroup={setExpandedTodoGroup}
            toggleGroupItemCount={toggleGroupItemCount} removeTodoGroup={removeTodoGroup}
            todosForDay={todosForDay} toggleTodo={toggleTodo} deleteTodo={deleteTodo}
            showTodoInput={showTodoInput} setShowTodoInput={setShowTodoInput}
            todoInput={todoInput} setTodoInput={setTodoInput} addTodo={addTodo}
            showWorkoutPanel={showWorkoutPanel} setShowWorkoutPanel={setShowWorkoutPanel}
            workoutTemplates={workoutTemplates} availableTemplates={availableTemplates} applyWorkoutTemplate={applyWorkoutTemplate}
            showTodoGroupPanel={showTodoGroupPanel} setShowTodoGroupPanel={setShowTodoGroupPanel}
            todoTemplates={todoTemplates} availableTodoTemplates={availableTodoTemplates} applyTodoTemplate={applyTodoTemplate}
            removeSession={removeSession}
            confirm={confirm} rate={rate}
          />
        )}

        {tab==='routine' && (
          <RoutineTab
            routineTab={routineTab} setRoutineTab={setRoutineTab}
            workoutTemplates={workoutTemplates}
            showWorkoutForm={showWorkoutForm} setShowWorkoutForm={setShowWorkoutForm}
            editingWorkoutId={editingWorkoutId}
            wName={wName} setWName={setWName} wColor={wColor} setWColor={setWColor} wExercises={wExercises}
            exInput={exInput} setExInput={setExInput} exSets={exSets} setExSets={setExSets}
            exReps={exReps} setExReps={setExReps} exUnit={exUnit} setExUnit={setExUnit}
            exInputRef={exInputRef} addExercise={addExercise} removeExercise={removeExercise}
            saveWorkoutTpl={saveWorkoutTpl} deleteWorkoutTpl={deleteWorkoutTpl}
            openAddWorkout={openAddWorkout} openEditWorkout={openEditWorkout}
            todoTemplates={todoTemplates}
            showTodoTplForm={showTodoTplForm} setShowTodoTplForm={setShowTodoTplForm}
            editingTodoTplId={editingTodoTplId}
            ttName={ttName} setTtName={setTtName} ttColor={ttColor} setTtColor={setTtColor} ttItems={ttItems}
            ttInput={ttInput} setTtInput={setTtInput} ttCount={ttCount} setTtCount={setTtCount}
            ttInputRef={ttInputRef} addTtItem={addTtItem} removeTtItem={removeTtItem}
            saveTodoTpl={saveTodoTpl} deleteTodoTpl={deleteTodoTpl}
            openAddTodoTpl={openAddTodoTpl} openEditTodoTpl={openEditTodoTpl}
            confirm={confirm}
          />
        )}

        {tab==='stats' && (
          <StatsTab
            statsSearch={statsSearch} setStatsSearch={setStatsSearch}
            todos={todos} workoutSessions={workoutSessions}
            viewYear={viewYear} setViewYear={setViewYear} viewMonth={viewMonth} setViewMonth={setViewMonth}
            thisYear={thisYear} isCurrentMonth={isCurrentMonth} prevMonth={prevMonth} nextMonth={nextMonth}
            todosVM={todosVM} todosVY={todosVY} sessionsVM={sessionsVM} allSetsVM={allSetsVM} doneSetsVM={doneSetsVM}
            monthlyData={monthlyData} maxTodo={maxTodo} maxSets={maxSets}
            rate={rate}
          />
        )}

      </div>

      {/* 드럼휠 모달 */}
      <DrumWheelModal
        pendingSet={pendingSet} setPendingSet={setPendingSet}
        pendingReps={pendingReps} setPendingReps={setPendingReps}
        wheelOffset={wheelOffset} setWheelOffset={setWheelOffset}
        dragStartY={dragStartY} dragStartVal={dragStartVal}
        confirmSet={confirmSet}
      />

      {/* 확인 모달 */}
      <ConfirmModal modal={modal} closeModal={closeModal} />

      {/* Tab Bar */}
      <div style={{ height:'56px', flexShrink:0, background:'rgba(242,242,247,0.95)', borderTop:'0.5px solid #c6c6c8', display:'flex', alignItems:'center' }}>
        {[
          { key:'todo',    label:'할 일', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="11" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="17" width="10" height="2.5" rx="1.25" fill="currentColor"/></svg> },
          { key:'routine', label:'루틴',  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="11" width="3" height="2" rx="1" fill="currentColor"/><rect x="19" y="11" width="3" height="2" rx="1" fill="currentColor"/><rect x="5" y="8" width="2" height="8" rx="1" fill="currentColor"/><rect x="17" y="8" width="2" height="8" rx="1" fill="currentColor"/><rect x="7" y="10" width="10" height="4" rx="2" fill="currentColor"/></svg> },
          { key:'stats',   label:'통계',  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="13" width="4" height="7" rx="1" fill="currentColor"/><rect x="10" y="9" width="4" height="11" rx="1" fill="currentColor"/><rect x="16" y="5" width="4" height="15" rx="1" fill="currentColor"/></svg> },
        ].map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', background:'none', border:'none', cursor:'pointer', color: tab===t.key?'#007aff':'#8e8e93' }}>
            {t.icon}
            <span style={{ fontSize:'10px', fontWeight:'500' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
