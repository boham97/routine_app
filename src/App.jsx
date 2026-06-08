import { useState } from 'react'
import { dateKey, getToday } from './constants.js'
import { labelForDate } from './utils/date.js'
import { useTodos } from './hooks/useTodos.js'
import { useWorkoutData } from './hooks/useWorkoutData.js'
import { useTodoGroupData } from './hooks/useTodoGroupData.js'
import { useWorkoutRunner } from './hooks/useWorkoutRunner.js'
import { useConfirm } from './hooks/useConfirm.js'
import TodoTab from './components/TodoTab.jsx'
import RoutineTab from './components/RoutineTab.jsx'
import StatsTab from './components/StatsTab.jsx'
import FoodTab from './components/FoodTab.jsx'
import { DrumWheelModal, ConfirmModal } from './components/Modals.jsx'

const TABS = ['todo', 'routine', 'stats', 'food']

const rate = (done, total) => total === 0 ? 0 : Math.round((done / total) * 100)

export default function App() {
  const [tabIdx, setTabIdx]               = useState(0)
  const [selectedDate, setSelectedDate]   = useState(getToday())
  const selKey = dateKey(selectedDate)

  const todosApi   = useTodos()
  const workouts   = useWorkoutData()
  const todoGroups = useTodoGroupData()
  const runner     = useWorkoutRunner({ workoutSessions: workouts.workoutSessions, setWorkoutSessions: workouts.setWorkoutSessions })
  const { modal, confirm, closeModal } = useConfirm()

  const sessionsForDay       = workouts.workoutSessions.filter(s => s.date === selKey)
  const groupsForDay         = todoGroups.todoGroups.filter(g => g.date === selKey)
  const availableWorkoutTpls = workouts.workoutTemplates.filter(t => !sessionsForDay.some(s => s.templateId === t.id))
  const availableTodoTpls    = todoGroups.todoTemplates.filter(t => !groupsForDay.some(g => g.templateId === t.id))

  return (
    <div style={{ display:'flex', flexDirection:'column', position:'fixed', inset:0, background:'#f2f2f7' }}>

      {runner.restSec !== null && (
        <div style={{ background: runner.restSec <= 10 ? '#ff3b30' : '#34c759', color:'#fff', textAlign:'center', padding:'6px', fontSize:'14px', fontWeight:'600', flex:'0 0 auto' }}>
          휴식 {runner.restSec}초 남음
        </div>
      )}

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
              toggleGroupItemCount={todoGroups.toggleGroupItemCount} removeTodoGroup={todoGroups.removeTodoGroup}
              confirm={confirm} rate={rate}
              availableWorkoutTpls={availableWorkoutTpls}
              applyWorkoutTemplate={(tpl, scope) => workouts.applyWorkoutTemplate(tpl, scope, selKey)}
              availableTodoTpls={availableTodoTpls}
              applyTodoTemplate={(tpl, scope) => todoGroups.applyTodoTemplate(tpl, scope, selKey)}
            />
          </div>

          <div style={{ width:'25%', flexShrink:0, display:'flex', flexDirection:'column', minHeight:0 }}>
            <RoutineTab
              addTask={todosApi.addTask} tasks={todosApi.todos}
              toggleTaskSet={todosApi.toggleTaskSet}
              deleteTodo={todosApi.deleteTodo} updateTask={todosApi.updateTask}
              confirm={confirm} rate={rate}
              workoutTemplates={workouts.workoutTemplates}
              addWorkoutGroup={workouts.addWorkoutGroup} updateWorkoutGroup={workouts.updateWorkoutGroup} deleteWorkoutTpl={workouts.deleteWorkoutTpl}
              todoTemplates={todoGroups.todoTemplates}
              addGeneralGroup={todoGroups.addGeneralGroup} updateGeneralGroup={todoGroups.updateGeneralGroup} deleteTodoTpl={todoGroups.deleteTodoTpl}
            />
          </div>

          <div style={{ width:'25%', flexShrink:0, display:'flex', flexDirection:'column', minHeight:0 }}>
            <StatsTab workoutSessions={workouts.workoutSessions} todoGroups={todoGroups.todoGroups} rate={rate} />
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

      <TabBar tab={TABS[tabIdx]} setTab={key => setTabIdx(TABS.indexOf(key))} />
    </div>
  )
}

function TabBar({ tab, setTab }) {
  const items = [
    { key:'todo',    label:'플랜',   icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="11" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="17" width="10" height="2.5" rx="1.25" fill="currentColor"/></svg> },
    { key:'routine', label:'루틴',   icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="11" width="3" height="2" rx="1" fill="currentColor"/><rect x="19" y="11" width="3" height="2" rx="1" fill="currentColor"/><rect x="5" y="8" width="2" height="8" rx="1" fill="currentColor"/><rect x="17" y="8" width="2" height="8" rx="1" fill="currentColor"/><rect x="7" y="10" width="10" height="4" rx="2" fill="currentColor"/></svg> },
    { key:'stats',   label:'통계',   icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="4" y="13" width="4" height="7" rx="1" fill="currentColor"/><rect x="10" y="9" width="4" height="11" rx="1" fill="currentColor"/><rect x="16" y="5" width="4" height="15" rx="1" fill="currentColor"/></svg> },
    { key:'food',    label:'식자재', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="2.5" stroke="currentColor" strokeWidth="2"/><line x1="6" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2"/><line x1="9" y1="6" x2="9" y2="7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="9" y1="13" x2="9" y2="14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> },
  ]
  return (
    <div style={{ height:'86px', flexShrink:0, background:'rgba(242,242,247,0.95)', borderTop:'0.5px solid #c6c6c8', display:'flex', alignItems:'center' }}>
      {items.map(t => (
        <button key={t.key} onClick={() => setTab(t.key)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', background:'none', border:'none', cursor:'pointer', color: tab === t.key ? '#007aff' : '#8e8e93' }}>
          {t.icon}
          <span style={{ fontSize:'12px', fontWeight:'600' }}>{t.label}</span>
        </button>
      ))}
    </div>
  )
}
