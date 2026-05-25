import { useState, useEffect, useRef } from 'react'
import { MONTHS, PALETTE, dateKey, addDays, getToday, load } from './constants.js'
import TodoTab from './components/TodoTab.jsx'
import RoutineTab from './components/RoutineTab.jsx'
import StatsTab from './components/StatsTab.jsx'
import { DrumWheelModal, ConfirmModal } from './components/Modals.jsx'

export default function App() {
  const TABS = ['todo', 'routine', 'stats']
  const [tabIdx,   setTabIdx]   = useState(0)
  const [swipeDx,  setSwipeDx]  = useState(0)
  const tab = TABS[tabIdx]
  function setTab(key) { setTabIdx(TABS.indexOf(key)); setSwipeDx(0) }

  const tabSwipeTx    = useRef(null)
  const tabSwipeTy    = useRef(null)
  const tabSwipeIsH   = useRef(false)

  function onTabSwipeStart(e) {
    tabSwipeTx.current  = e.touches[0].clientX
    tabSwipeTy.current  = e.touches[0].clientY
    tabSwipeIsH.current = false
  }
  function onTabSwipeMove(e) {
    if (tabSwipeTx.current === null) return
    const dx = e.touches[0].clientX - tabSwipeTx.current
    const dy = e.touches[0].clientY - tabSwipeTy.current
    if (!tabSwipeIsH.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    if (!tabSwipeIsH.current) tabSwipeIsH.current = Math.abs(dx) > Math.abs(dy)
    if (!tabSwipeIsH.current) return
    // 첫/마지막 탭에서 더 이상 못 넘어가도록 클램프
    const clamped = tabIdx === 0 ? Math.min(0, dx)
                  : tabIdx === TABS.length - 1 ? Math.max(0, dx)
                  : dx
    setSwipeDx(clamped)
  }
  function onTabSwipeEnd(e) {
    if (!tabSwipeIsH.current) return
    const dx = e.changedTouches[0].clientX - (tabSwipeTx.current ?? 0)
    tabSwipeTx.current = null
    setSwipeDx(0)   // transition으로 snap
    if (Math.abs(dx) < 60) return
    setTabIdx(prev => {
      if (dx < 0 && prev < TABS.length - 1) return prev + 1
      if (dx > 0 && prev > 0) return prev - 1
      return prev
    })
  }

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

  // ── 운동 루틴 ──────────────────────────────────────────────
  const [workoutTemplates, setWorkoutTemplates] = useState(() => load('workoutTemplates', []))
  const [workoutSessions,  setWorkoutSessions]  = useState(() => load('workoutSessions',  []))
  const [expandedSession,  setExpandedSession]  = useState({})

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

  function getMondayOfWeek(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    return dateKey(d)
  }

  const labelForDate = d => {
    const key = dateKey(d)
    if (key === todayKey) return '오늘'
    if (key === dateKey(addDays(getToday(), -1))) return '어제'
    if (key === dateKey(addDays(getToday(),  1))) return '내일'
    return null
  }

  // ── 태스크 CRUD ────────────────────────────────────────────
  function addTask({ name, taskType, goalMode, sets, reps, seconds, desc }) {
    const createdAt = getToday(); createdAt.setHours(12,0,0,0)
    const base = { id: Date.now(), text: name, completed: false, createdAt: createdAt.toISOString(), taskType, ...(desc ? { desc } : {}) }
    if (taskType === 'workout') {
      base.goalMode = goalMode
      if (goalMode === 'reps') {
        const s = Math.max(1, parseInt(sets) || 4)
        base.sets = s; base.reps = parseInt(reps) || 10
        base.completedSets = Array(s).fill(false)
      } else {
        const s = Math.max(1, parseInt(sets) || 4)
        base.sets = s; base.seconds = parseInt(seconds) || 60
        base.completedSets = Array(s).fill(false)
      }
    }
    setTodos(p => [...p, base])
  }
  function toggleTaskSet(taskId, setIdx) {
    setTodos(p => p.map(t => {
      if (t.id !== taskId) return t
      const newSets = (t.completedSets || []).map((v, i) => i === setIdx ? !v : v)
      return { ...t, completedSets: newSets, completed: newSets.every(Boolean) }
    }))
  }
  function toggleTodo(id) {
    setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }
  function deleteTodo(id) { setTodos(p => p.filter(t => t.id !== id)) }
  function updateTask(id, changes) {
    setTodos(p => p.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, ...changes }
      if ('sets' in changes && t.taskType === 'workout') {
        const newSets = Math.max(1, parseInt(changes.sets) || 1)
        updated.sets = newSets
        const old = t.completedSets || []
        updated.completedSets = Array(newSets).fill(false).map((_, i) => old[i] ?? false)
      }
      return updated
    }))
  }
  const todosForDay    = todos.filter(t => dateKey(t.createdAt) === selKey)
  const tasksForToday  = todos.filter(t => dateKey(t.createdAt) === todayKey)

  // ── 플랜 일회성 태스크 ─────────────────────────────────────
  const [planTasks, setPlanTasks] = useState(() => load('planTasks', []))
  useEffect(() => { localStorage.setItem('planTasks', JSON.stringify(planTasks)) }, [planTasks])

  function addPlanTask(text, date) {
    setPlanTasks(p => [...p, { id: Date.now(), text: text.trim(), date, completed: false }])
  }
  function removePlanTask(id) { setPlanTasks(p => p.filter(t => t.id !== id)) }
  function togglePlanTask(id) { setPlanTasks(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t)) }

  const planTasksForDay = planTasks.filter(t => t.date === selKey)

  // ── 할일 그룹 CRUD ─────────────────────────────────────────
  function applyTodoTemplate(tpl, scope = 'today') {
    if (scope === 'today') {
      if (todoGroups.find(g => g.templateId === tpl.id && g.date === selKey)) return
      const group = {
        id: Date.now(), templateId: tpl.id, name: tpl.name, color: tpl.color, date: selKey,
        items: tpl.items.map(item => ({ ...item, completedCounts: Array(item.count).fill(false) }))
      }
      setTodoGroups(p => [...p, group])
      setExpandedTodoGroup(p => ({ ...p, [group.id]: true }))
    } else {
      const base = Date.now()
      const monday = new Date(getMondayOfWeek(selKey) + 'T00:00:00')
      const toAdd = []
      for (let i = 0; i < 7; i++) {
        const dKey = dateKey(addDays(monday, i))
        if (!todoGroups.find(g => g.templateId === tpl.id && g.date === dKey)) {
          toAdd.push({ id: base + i, templateId: tpl.id, name: tpl.name, color: tpl.color, date: dKey, isWeekly: true,
            items: tpl.items.map(item => ({ ...item, completedCounts: Array(item.count).fill(false) })) })
        }
      }
      if (toAdd.length > 0) {
        setTodoGroups(p => [...p, ...toAdd])
        const exp = {}; toAdd.forEach(g => { exp[g.id] = true })
        setExpandedTodoGroup(p => ({ ...p, ...exp }))
      }
    }
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
  function applyWorkoutTemplate(tpl, scope = 'today') {
    if (scope === 'today') {
      if (workoutSessions.find(s => s.templateId === tpl.id && s.date === selKey)) return
      const session = {
        id: Date.now(), templateId: tpl.id, name: tpl.name, color: tpl.color, date: selKey,
        exercises: tpl.exercises.map(e => ({ ...e, completedSets: Array(e.sets).fill(false) }))
      }
      setWorkoutSessions(p => [...p, session])
      setExpandedSession(p => ({ ...p, [session.id]: true }))
    } else {
      const base = Date.now()
      const monday = new Date(getMondayOfWeek(selKey) + 'T00:00:00')
      const toAdd = []
      for (let i = 0; i < 7; i++) {
        const dKey = dateKey(addDays(monday, i))
        if (!workoutSessions.find(s => s.templateId === tpl.id && s.date === dKey)) {
          toAdd.push({ id: base + i, templateId: tpl.id, name: tpl.name, color: tpl.color, date: dKey, isWeekly: true,
            exercises: tpl.exercises.map(e => ({ ...e, completedSets: Array(e.sets).fill(false) })) })
        }
      }
      if (toAdd.length > 0) {
        setWorkoutSessions(p => [...p, ...toAdd])
        const exp = {}; toAdd.forEach(s => { exp[s.id] = true })
        setExpandedSession(p => ({ ...p, ...exp }))
      }
    }
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

  // ── 그룹 간편 추가 (RoutineTab용) ─────────────────────────
  function addWorkoutGroup(name, color, exercises) {
    setWorkoutTemplates(p => [...p, { id: Date.now(), name: name.trim(), color, exercises }])
  }
  function updateWorkoutGroup(id, changes) {
    setWorkoutTemplates(p => p.map(t => t.id === id ? { ...t, ...changes } : t))
  }
  function addGeneralGroup(name, color, items) {
    setTodoTemplates(p => [...p, { id: Date.now(), name: name.trim(), color, items }])
  }
  function updateGeneralGroup(id, changes) {
    setTodoTemplates(p => p.map(t => t.id === id ? { ...t, ...changes } : t))
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
    const monthStr = `${viewYear}-${String(mi+1).padStart(2,'0')}`
    const pt = planTasks.filter(t => t.date.startsWith(monthStr))
    const tg = todoGroups.filter(g => g.date.startsWith(monthStr))
    const tgTotal = tg.reduce((sum,g) => sum + g.items.reduce((a,item) => a + item.count, 0), 0)
    const tgDone  = tg.reduce((sum,g) => sum + g.items.reduce((a,item) => a + item.completedCounts.filter(Boolean).length, 0), 0)
    const s = workoutSessions.filter(s=>{ const d=new Date(s.date); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    const totalSets = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).length
    const doneSets  = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).filter(Boolean).length
    return {
      todoAdded: pt.length + tgTotal,
      todoDone:  pt.filter(x=>x.completed).length + tgDone,
      totalSets, doneSets
    }
  })
  const maxTodo = Math.max(...monthlyData.map(m=>m.todoAdded), 1)
  const maxSets = Math.max(...monthlyData.map(m=>m.totalSets), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', position:'fixed', inset:0, background:'#f2f2f7' }}>

      {/* 휴식 타이머 */}
      {restSec !== null && (
        <div style={{ background: restSec <= 10 ? '#ff3b30' : '#34c759', color:'#fff', textAlign:'center', padding:'6px', fontSize:'14px', fontWeight:'600', flex:'0 0 auto' }}>
          휴식 {restSec}초 남음
        </div>
      )}

      {/* Content — 슬라이딩 탭 컨테이너 */}
      <div
        onTouchStart={onTabSwipeStart}
        onTouchMove={onTabSwipeMove}
        onTouchEnd={onTabSwipeEnd}
        style={{ flex:1, minHeight:0, overflow:'hidden', position:'relative' }}
      >
        <div style={{
          display: 'flex',
          width: '300%',
          height: '100%',
          transform: `translateX(calc(${-tabIdx * (100/3)}% + ${swipeDx}px))`,
          transition: swipeDx !== 0 ? 'none' : 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform',
        }}>

          {/* 플랜 탭 */}
          <div style={{ width:'33.333%', flexShrink:0, display:'flex', flexDirection:'column', minHeight:0 }}>
            <TodoTab
              selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              labelForDate={labelForDate}
              sessionsForDay={sessionsForDay} expandedSession={expandedSession} setExpandedSession={setExpandedSession} toggleSet={toggleSet} exTimer={exTimer}
              groupsForDay={groupsForDay} expandedTodoGroup={expandedTodoGroup} setExpandedTodoGroup={setExpandedTodoGroup}
              toggleGroupItemCount={toggleGroupItemCount} removeTodoGroup={removeTodoGroup}
              removeSession={removeSession}
              confirm={confirm} rate={rate}
              availableWorkoutTpls={availableTemplates} applyWorkoutTemplate={applyWorkoutTemplate}
              availableTodoTpls={availableTodoTemplates} applyTodoTemplate={applyTodoTemplate}
              planTasksForDay={planTasksForDay}
              addPlanTask={text => addPlanTask(text, selKey)}
              removePlanTask={removePlanTask} togglePlanTask={togglePlanTask}
            />
          </div>

          {/* 루틴 탭 */}
          <div style={{ width:'33.333%', flexShrink:0, display:'flex', flexDirection:'column', minHeight:0 }}>
            <RoutineTab
              addTask={addTask} tasks={tasksForToday}
              toggleTaskSet={toggleTaskSet}
              deleteTodo={deleteTodo} updateTask={updateTask} confirm={confirm} rate={rate}
              workoutTemplates={workoutTemplates} addWorkoutGroup={addWorkoutGroup} updateWorkoutGroup={updateWorkoutGroup} deleteWorkoutTpl={deleteWorkoutTpl}
              todoTemplates={todoTemplates} addGeneralGroup={addGeneralGroup} updateGeneralGroup={updateGeneralGroup} deleteTodoTpl={deleteTodoTpl}
            />
          </div>

          {/* 통계 탭 */}
          <div style={{ width:'33.333%', flexShrink:0, display:'flex', flexDirection:'column', minHeight:0 }}>
            <StatsTab
              statsSearch={statsSearch} setStatsSearch={setStatsSearch}
              todos={todos} workoutSessions={workoutSessions}
              planTasks={planTasks} todoGroups={todoGroups}
              viewYear={viewYear} viewMonth={viewMonth} setViewMonth={setViewMonth}
              isCurrentMonth={isCurrentMonth} prevMonth={prevMonth} nextMonth={nextMonth}
              todosVM={todosVM} sessionsVM={sessionsVM} allSetsVM={allSetsVM} doneSetsVM={doneSetsVM}
              monthlyData={monthlyData} maxTodo={maxTodo} maxSets={maxSets}
              rate={rate}
            />
          </div>

        </div>
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
          { key:'todo',    label:'플랜', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="11" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="17" width="10" height="2.5" rx="1.25" fill="currentColor"/></svg> },
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
