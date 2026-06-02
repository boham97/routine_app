import { useState } from 'react'
import { dateKey, addDays, getToday } from './constants.js'
import { useLocalState } from './hooks/useLocalState.js'
import { useWorkoutRunner } from './hooks/useWorkoutRunner.js'
import TodoTab from './components/TodoTab.jsx'
import RoutineTab from './components/RoutineTab.jsx'
import StatsTab from './components/StatsTab.jsx'
import FoodTab from './components/FoodTab.jsx'
import { DrumWheelModal, ConfirmModal } from './components/Modals.jsx'

const TABS = ['todo', 'routine', 'stats', 'food']

const rate = (done, total) => total === 0 ? 0 : Math.round((done / total) * 100)

function getMondayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return dateKey(d)
}

export default function App() {
  const [tabIdx, setTabIdx] = useState(0)
  const tab = TABS[tabIdx]
  const setTab = key => setTabIdx(TABS.indexOf(key))

  const [selectedDate, setSelectedDate] = useState(getToday())
  const selKey = dateKey(selectedDate)
  const todayKey = dateKey(getToday())

  const labelForDate = d => {
    const k = dateKey(d)
    if (k === todayKey) return '오늘'
    if (k === dateKey(addDays(getToday(), -1))) return '어제'
    if (k === dateKey(addDays(getToday(),  1))) return '내일'
    return null
  }

  // ── 공유 영속 상태 (탭 간 공유 필요) ─────────────────────────
  const [todos,            setTodos]            = useLocalState('todos', [])
  const [todoTemplates,    setTodoTemplates]    = useLocalState('todoTemplates', [])
  const [todoGroups,       setTodoGroups]       = useLocalState('todoGroups', [])
  const [workoutTemplates, setWorkoutTemplates] = useLocalState('workoutTemplates', [])
  const [workoutSessions,  setWorkoutSessions]  = useLocalState('workoutSessions', [])

  // ── 운동 세션 실행 흐름 (타이머·드럼휠·휴식배너) ──────────────
  const runner = useWorkoutRunner({ workoutSessions, setWorkoutSessions })

  // ── 확인 모달 ─────────────────────────────────────────────────
  const [modal, setModal] = useState({ show: false, message: '', onConfirm: null })
  const confirm    = (message, onConfirm) => setModal({ show: true, message, onConfirm })
  const closeModal = () => setModal({ show: false, message: '', onConfirm: null })

  // ── 태스크(루틴 탭에서만 사용) ────────────────────────────────
  function addTask({ name, taskType, goalMode, sets, reps, seconds, desc }) {
    const createdAt = getToday(); createdAt.setHours(12, 0, 0, 0)
    const base = { id: Date.now(), text: name, completed: false, createdAt: createdAt.toISOString(), taskType, ...(desc ? { desc } : {}) }
    if (taskType === 'workout') {
      const s = Math.max(1, parseInt(sets) || 4)
      base.goalMode = goalMode; base.sets = s
      if (goalMode === 'reps') base.reps    = parseInt(reps)    || 10
      else                     base.seconds = parseInt(seconds) || 60
      base.completedSets = Array(s).fill(false)
    }
    setTodos(p => [...p, base])
  }
  const toggleTodo = id => setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  const deleteTodo = id => setTodos(p => p.filter(t => t.id !== id))
  function toggleTaskSet(taskId, setIdx) {
    setTodos(p => p.map(t => {
      if (t.id !== taskId) return t
      const newSets = (t.completedSets || []).map((v, i) => i === setIdx ? !v : v)
      return { ...t, completedSets: newSets, completed: newSets.every(Boolean) }
    }))
  }
  function updateTask(id, changes) {
    setTodos(p => p.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, ...changes }
      if ('sets' in changes && t.taskType === 'workout') {
        const n = Math.max(1, parseInt(changes.sets) || 1)
        updated.sets = n
        const old = t.completedSets || []
        updated.completedSets = Array(n).fill(false).map((_, i) => old[i] ?? false)
      }
      return updated
    }))
  }

  // ── 템플릿 적용 (오늘/이번주) ─────────────────────────────────
  function applyTemplate(kind, tpl, scope) {
    const collection      = kind === 'workout' ? workoutSessions : todoGroups
    const setCollection   = kind === 'workout' ? setWorkoutSessions : setTodoGroups
    const makeInstance = (date, id) => kind === 'workout'
      ? { id, templateId: tpl.id, name: tpl.name, date,
          exercises: tpl.exercises.map(e => ({ ...e, completedSets: Array(e.sets).fill(false) })) }
      : { id, templateId: tpl.id, name: tpl.name, date,
          items: tpl.items.map(item => ({ ...item, completedCounts: Array(item.count).fill(false) })) }

    if (scope === 'today') {
      if (collection.find(x => x.templateId === tpl.id && x.date === selKey)) return
      setCollection(p => [...p, makeInstance(selKey, Date.now())])
    } else {
      const base = Date.now()
      const monday = new Date(getMondayOfWeek(selKey) + 'T00:00:00')
      const toAdd = []
      for (let i = 0; i < 7; i++) {
        const dKey = dateKey(addDays(monday, i))
        if (!collection.find(x => x.templateId === tpl.id && x.date === dKey)) {
          const inst = makeInstance(dKey, base + i)
          inst.isWeekly = true
          toAdd.push(inst)
        }
      }
      if (toAdd.length > 0) setCollection(p => [...p, ...toAdd])
    }
  }
  const applyWorkoutTemplate = (tpl, scope = 'today') => applyTemplate('workout', tpl, scope)
  const applyTodoTemplate    = (tpl, scope = 'today') => applyTemplate('todo',    tpl, scope)

  // ── 할일 그룹 ────────────────────────────────────────────────
  const removeTodoGroup = id => setTodoGroups(p => p.filter(g => g.id !== id))
  function toggleGroupItemCount(groupId, itemId, idx) {
    setTodoGroups(p => p.map(g => g.id !== groupId ? g : {
      ...g, items: g.items.map(item => item.id !== itemId ? item : {
        ...item, completedCounts: item.completedCounts.map((v, i) => i === idx ? !v : v)
      })
    }))
  }

  // ── 템플릿 CRUD (루틴 탭) ────────────────────────────────────
  const addWorkoutGroup    = (name, exercises) => setWorkoutTemplates(p => [...p, { id: Date.now(), name: name.trim(), exercises }])
  const updateWorkoutGroup = (id, changes)     => setWorkoutTemplates(p => p.map(t => t.id === id ? { ...t, ...changes } : t))
  function deleteWorkoutTpl(id) {
    setWorkoutTemplates(p => p.filter(t => t.id !== id))
    setWorkoutSessions(p => p.filter(s => s.templateId !== id))
  }
  const addGeneralGroup    = (name, items)  => setTodoTemplates(p => [...p, { id: Date.now(), name: name.trim(), items }])
  const updateGeneralGroup = (id, changes)  => setTodoTemplates(p => p.map(t => t.id === id ? { ...t, ...changes } : t))
  function deleteTodoTpl(id) {
    setTodoTemplates(p => p.filter(t => t.id !== id))
    setTodoGroups(p => p.filter(g => g.templateId !== id))
  }

  // ── 날짜 필터 ────────────────────────────────────────────────
  const sessionsForDay         = workoutSessions.filter(s => s.date === selKey)
  const groupsForDay           = todoGroups.filter(g => g.date === selKey)
  const availableWorkoutTpls   = workoutTemplates.filter(t => !sessionsForDay.some(s => s.templateId === t.id))
  const availableTodoTpls      = todoTemplates.filter(t => !groupsForDay.some(g => g.templateId === t.id))

  return (
    <div style={{ display:'flex', flexDirection:'column', position:'fixed', inset:0, background:'#f2f2f7' }}>

      {/* 휴식 타이머 배너 */}
      {runner.restSec !== null && (
        <div style={{ background: runner.restSec <= 10 ? '#ff3b30' : '#34c759', color:'#fff', textAlign:'center', padding:'6px', fontSize:'14px', fontWeight:'600', flex:'0 0 auto' }}>
          휴식 {runner.restSec}초 남음
        </div>
      )}

      {/* 슬라이딩 탭 컨테이너 */}
      <div style={{ flex:1, minHeight:0, overflow:'hidden', position:'relative' }}>
        <div style={{
          display: 'flex', width: '400%', height: '100%',
          transform: `translateX(${-tabIdx * 25}%)`,
          transition: 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'transform',
        }}>

          <div style={{ width:'25%', flexShrink:0, display:'flex', flexDirection:'column', minHeight:0 }}>
            <TodoTab
              selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              labelForDate={labelForDate}
              sessionsForDay={sessionsForDay}
              toggleSet={runner.toggleSet} addExerciseSet={runner.addExerciseSet} removeSession={runner.removeSession}
              exTimer={runner.exTimer}
              groupsForDay={groupsForDay}
              toggleGroupItemCount={toggleGroupItemCount} removeTodoGroup={removeTodoGroup}
              confirm={confirm} rate={rate}
              availableWorkoutTpls={availableWorkoutTpls} applyWorkoutTemplate={applyWorkoutTemplate}
              availableTodoTpls={availableTodoTpls}       applyTodoTemplate={applyTodoTemplate}
            />
          </div>

          <div style={{ width:'25%', flexShrink:0, display:'flex', flexDirection:'column', minHeight:0 }}>
            <RoutineTab
              addTask={addTask} tasks={todos}
              toggleTaskSet={toggleTaskSet}
              deleteTodo={deleteTodo} updateTask={updateTask} confirm={confirm} rate={rate}
              workoutTemplates={workoutTemplates} addWorkoutGroup={addWorkoutGroup} updateWorkoutGroup={updateWorkoutGroup} deleteWorkoutTpl={deleteWorkoutTpl}
              todoTemplates={todoTemplates}       addGeneralGroup={addGeneralGroup} updateGeneralGroup={updateGeneralGroup} deleteTodoTpl={deleteTodoTpl}
            />
          </div>

          <div style={{ width:'25%', flexShrink:0, display:'flex', flexDirection:'column', minHeight:0 }}>
            <StatsTab workoutSessions={workoutSessions} todoGroups={todoGroups} rate={rate} />
          </div>

          <div style={{ width:'25%', flexShrink:0, display:'flex', flexDirection:'column', minHeight:0 }}>
            <FoodTab confirm={confirm} />
          </div>

        </div>
      </div>

      <DrumWheelModal
        pendingSet={runner.pendingSet}
        pendingReps={runner.pendingReps}
        setPendingReps={runner.setPendingReps}
        onCancel={runner.cancelPending}
        onConfirm={runner.confirmSet}
      />

      <ConfirmModal modal={modal} closeModal={closeModal} />

      {/* 탭바 */}
      <div style={{ height:'72px', flexShrink:0, background:'rgba(242,242,247,0.95)', borderTop:'0.5px solid #c6c6c8', display:'flex', alignItems:'center' }}>
        {[
          { key:'todo',    label:'플랜',   icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="11" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="17" width="10" height="2.5" rx="1.25" fill="currentColor"/></svg> },
          { key:'routine', label:'루틴',   icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="11" width="3" height="2" rx="1" fill="currentColor"/><rect x="19" y="11" width="3" height="2" rx="1" fill="currentColor"/><rect x="5" y="8" width="2" height="8" rx="1" fill="currentColor"/><rect x="17" y="8" width="2" height="8" rx="1" fill="currentColor"/><rect x="7" y="10" width="10" height="4" rx="2" fill="currentColor"/></svg> },
          { key:'stats',   label:'통계',   icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="4" y="13" width="4" height="7" rx="1" fill="currentColor"/><rect x="10" y="9" width="4" height="11" rx="1" fill="currentColor"/><rect x="16" y="5" width="4" height="15" rx="1" fill="currentColor"/></svg> },
          { key:'food',    label:'식자재', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="2.5" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2"/><line x1="9" y1="6" x2="9" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="13" x2="9" y2="14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', background:'none', border:'none', cursor:'pointer', color: tab === t.key ? '#007aff' : '#8e8e93' }}>
            {t.icon}
            <span style={{ fontSize:'12px', fontWeight:'600' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
