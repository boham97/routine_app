import { useState, useRef } from 'react'
import { MONTHS, DAYS, addDays } from '../constants.js'
import { NavCard, NavBtn, EmptyCard } from './ui.jsx'
import { circle, rateColor } from '../styles.js'

const scopeBtn = (color, outline) => ({
  height: '28px', padding: '0 10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
  border: `1.5px solid ${color}`, borderRadius: '8px', flexShrink: 0,
  background: outline ? 'transparent' : color,
  color: outline ? color : '#fff',
})

export default function TodoTab({
  selectedDate, setSelectedDate,
  labelForDate,
  sessionsForDay, expandedSession, setExpandedSession, toggleSet, exTimer,
  groupsForDay, expandedTodoGroup, setExpandedTodoGroup, toggleGroupItemCount, removeTodoGroup,
  removeSession,
  confirm, rate,
  availableWorkoutTpls, applyWorkoutTemplate,
  availableTodoTpls, applyTodoTemplate,
  planTasksForDay, addPlanTask, removePlanTask, togglePlanTask,
}) {
  const [showAdd,    setShowAdd]    = useState(false)
  const [taskInput,  setTaskInput]  = useState('')

  function handleAddTask() {
    if (!taskInput.trim()) return
    addPlanTask(taskInput.trim())
    setTaskInput('')
  }

  const hasAvailable = (availableWorkoutTpls?.length ?? 0) + (availableTodoTpls?.length ?? 0) > 0
  const isEmpty = sessionsForDay.length === 0 && groupsForDay.length === 0 && (planTasksForDay?.length ?? 0) === 0

  // ── 좌우 스와이프로 날짜 이동 ─────────────────────────────
  const swTx  = useRef(null)
  const swTy  = useRef(null)
  const swIsH = useRef(false)
  function onSwipeStart(e) {
    swTx.current = e.touches[0].clientX
    swTy.current = e.touches[0].clientY
    swIsH.current = false
  }
  function onSwipeMove(e) {
    if (swTx.current === null) return
    const dx = e.touches[0].clientX - swTx.current
    const dy = e.touches[0].clientY - swTy.current
    if (!swIsH.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    if (!swIsH.current) swIsH.current = Math.abs(dx) > Math.abs(dy)
  }
  function onSwipeEnd(e) {
    if (swTx.current === null) return
    const dx = e.changedTouches[0].clientX - swTx.current
    const isH = swIsH.current
    swTx.current = null; swIsH.current = false
    if (!isH || Math.abs(dx) < 60) return
    setSelectedDate(d => addDays(d, dx > 0 ? -1 : 1))
  }

  return <div
    onTouchStart={onSwipeStart}
    onTouchMove={onSwipeMove}
    onTouchEnd={onSwipeEnd}
    style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
  >
    {/* 날짜 네비게이터 */}
    <div style={{ padding: '8px 16px', flexShrink: 0 }}>
      <NavCard>
        <NavBtn onClick={() => setSelectedDate(d => addDays(d, -1))}>‹</NavBtn>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '17px', fontWeight: '700' }}>
            {selectedDate.getFullYear()}년 {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}일
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#8e8e93', marginLeft: '4px' }}>({DAYS[selectedDate.getDay()]})</span>
          </div>
          {labelForDate(selectedDate) && <div style={{ fontSize: '11px', color: '#007aff', marginTop: '2px' }}>{labelForDate(selectedDate)}</div>}
        </div>
        <NavBtn onClick={() => setSelectedDate(d => addDays(d, 1))}>›</NavBtn>
      </NavCard>

      {/* 플랜 추가 토글 버튼 (열려있을 땐 숨김) */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: '100%', marginTop: '8px', height: '36px', borderRadius: '10px', border: 'none',
            background: '#fff', color: '#007aff',
            fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
          }}
        >+ 플랜 추가</button>
      )}
    </div>

    {/* 추가 패널 */}
    {showAdd && (
      <div style={{ flexShrink: 0, maxHeight: '42vh', display: 'flex', flexDirection: 'column', borderBottom: '0.5px solid #c6c6c8' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 16px 8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* 일회성 태스크 */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', padding: '8px 2px 6px', letterSpacing: '0.3px' }}>일회성 태스크</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={taskInput} onChange={e => setTaskInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
              placeholder="오늘 할 일..."
              style={{ flex: 1, height: '40px', background: '#fff', border: 'none', borderRadius: '10px', padding: '0 12px', fontSize: '15px', outline: 'none' }}
            />
            <button
              onClick={handleAddTask}
              style={{ height: '40px', padding: '0 14px', background: '#007aff', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}
            >추가</button>
          </div>
        </div>

        {/* 운동 그룹 */}
        {(availableWorkoutTpls?.length ?? 0) > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', padding: '0 2px 6px', letterSpacing: '0.3px' }}>운동 그룹</div>
            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              {availableWorkoutTpls.map((tpl, i) => (
                <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: '8px', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none' }}>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: '600' }}>{tpl.name}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { applyWorkoutTemplate(tpl, 'today'); }} style={scopeBtn('#007aff', false)}>오늘</button>
                    <button onClick={() => { applyWorkoutTemplate(tpl, 'week'); }} style={scopeBtn('#007aff', true)}>이번주</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 일반 그룹 */}
        {(availableTodoTpls?.length ?? 0) > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', padding: '0 2px 6px', letterSpacing: '0.3px' }}>일반 그룹</div>
            <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              {availableTodoTpls.map((tpl, i) => (
                <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: '8px', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none' }}>
                  <span style={{ flex: 1, fontSize: '14px', fontWeight: '600' }}>{tpl.name}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => { applyTodoTemplate(tpl, 'today'); }} style={scopeBtn('#007aff', false)}>오늘</button>
                    <button onClick={() => { applyTodoTemplate(tpl, 'week'); }} style={scopeBtn('#007aff', true)}>이번주</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!hasAvailable && (
          <div style={{ fontSize: '13px', color: '#c6c6c8', textAlign: 'center', padding: '4px 0' }}>추가 가능한 그룹이 없습니다</div>
        )}
        </div>
        <div style={{ flexShrink: 0, padding: '8px 16px 12px' }}>
          <button
            onClick={() => setShowAdd(false)}
            style={{
              width: '100%', height: '40px', borderRadius: '10px', border: 'none',
              background: '#007aff', color: '#fff',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}
          >닫기</button>
        </div>
      </div>
    )}

    {/* 스크롤 영역 */}
    <div style={{ flex: 1, minHeight: 0, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '0 16px 8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>

        {/* 일회성 태스크 */}
        {(planTasksForDay?.length ?? 0) > 0 && planTasksForDay.map(task => (
          <div key={task.id} style={{ background: '#fff', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              onClick={() => togglePlanTask(task.id)}
              style={{ ...circle, background: task.completed ? '#34c759' : 'transparent', border: task.completed ? 'none' : '2px solid #c6c6c8', cursor: 'pointer', flexShrink: 0 }}
            >
              {task.completed && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span
              onClick={() => togglePlanTask(task.id)}
              style={{ flex: 1, fontSize: '15px', color: task.completed ? '#8e8e93' : '#000', textDecoration: task.completed ? 'line-through' : 'none', cursor: 'pointer' }}
            >{task.text}</span>
            <button onClick={() => removePlanTask(task.id)} style={{ background: 'none', border: 'none', color: '#c6c6c8', fontSize: '20px', cursor: 'pointer', padding: '0 2px', lineHeight: 1 }}>×</button>
          </div>
        ))}

        {/* 운동 세션 */}
        {sessionsForDay.map(session => {
          const totalSets = session.exercises.reduce((a, e) => a + e.sets, 0)
          const doneSets  = session.exercises.reduce((a, e) => a + e.completedSets.filter(Boolean).length, 0)
          const progress  = totalSets === 0 ? 0 : doneSets / totalSets
          const expanded  = expandedSession[session.id] !== false
          return (
            <div key={session.id} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px', gap: '8px' }}>
                <div onClick={() => setExpandedSession(p => ({ ...p, [session.id]: !expanded }))} style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700' }}>{session.name}</span>
                      {session.isWeekly && <span style={{ fontSize: '10px', color: '#007aff', background: '#e8f4ff', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }}>주간</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '1px' }}>{doneSets}/{totalSets} 세트</div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: rateColor(doneSets, totalSets) }}>{rate(doneSets, totalSets)}%</span>
                </div>
                {expanded && <button onClick={() => confirm(`"${session.name}" 운동을 제거할까요?`, () => removeSession(session.id))} style={{ background: 'none', border: 'none', color: '#ff3b30', fontSize: '13px', fontWeight: '600', cursor: 'pointer', paddingLeft: '12px' }}>제거</button>}
              </div>
              <div style={{ height: '3px', background: '#e5e5ea', margin: '0 14px 4px', borderRadius: '2px' }}>
                <div style={{ height: '3px', background: '#34c759', width: `${progress * 100}%`, borderRadius: '2px', transition: 'width 0.3s' }}/>
              </div>
              {expanded && session.exercises.map((ex, i) => {
                const exDone = ex.completedSets.filter(Boolean).length
                return (
                  <div key={ex.id} style={{ padding: '12px 14px', borderTop: i === 0 ? 'none' : '0.5px solid #e5e5ea' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '600' }}>{ex.name}</span>
                      <span style={{ fontSize: '12px', color: '#8e8e93' }}>{exDone}/{ex.sets}세트 · {ex.reps}{ex.unit}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {Array.from({ length: ex.sets }, (_, si) => {
                        const val = ex.completedSets?.[si] ?? false
                        const done = val !== false
                        const isRunning = exTimer && exTimer.sessionId === session.id && exTimer.exerciseId === ex.id && exTimer.setIdx === si
                        const isOvertime = isRunning && exTimer.elapsed >= exTimer.total
                        const btnColor = isRunning ? (isOvertime ? '#ff3b30' : '#007aff') : (done ? '#34c759' : 'transparent')
                        const borderColor = btnColor === 'transparent' ? '#c6c6c8' : btnColor
                        const label = isRunning
                          ? (isOvertime ? `+${exTimer.elapsed - exTimer.total}초` : `${exTimer.total - exTimer.elapsed}초`)
                          : (done ? `${val}${ex.unit}` : si + 1)
                        return (
                          <button key={si} onClick={() => toggleSet(session.id, ex.id, si)} style={{
                            minWidth: '36px', height: '36px', borderRadius: '8px', padding: '0 6px',
                            border: `1.5px solid ${borderColor}`,
                            background: btnColor, color: (done || isRunning) ? '#fff' : '#8e8e93',
                            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                          }}>{label}</button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* 할일 그룹 */}
        {groupsForDay.map(group => {
          const totalCounts = group.items.reduce((a, item) => a + item.count, 0)
          const doneCounts  = group.items.reduce((a, item) => a + item.completedCounts.filter(Boolean).length, 0)
          const expanded    = expandedTodoGroup[group.id] !== false
          return (
            <div key={group.id} style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px', gap: '8px' }}>
                <div onClick={() => setExpandedTodoGroup(p => ({ ...p, [group.id]: !expanded }))} style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '700' }}>{group.name}</span>
                      {group.isWeekly && <span style={{ fontSize: '10px', color: '#007aff', background: '#e8f4ff', padding: '1px 5px', borderRadius: '4px', fontWeight: '600' }}>주간</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: doneCounts === totalCounts && totalCounts > 0 ? '#34c759' : '#8e8e93', marginTop: '1px' }}>{doneCounts}/{totalCounts} 완료</div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: rateColor(doneCounts, totalCounts) }}>{rate(doneCounts, totalCounts)}%</span>
                </div>
                {expanded && <button onClick={() => confirm(`"${group.name}" 그룹을 제거할까요?`, () => removeTodoGroup(group.id))} style={{ background: 'none', border: 'none', color: '#ff3b30', fontSize: '13px', fontWeight: '600', cursor: 'pointer', paddingLeft: '12px' }}>제거</button>}
              </div>
              <div style={{ height: '3px', background: '#e5e5ea', margin: '0 14px 4px', borderRadius: '2px' }}>
                <div style={{ height: '3px', background: '#34c759', width: `${totalCounts === 0 ? 0 : doneCounts / totalCounts * 100}%`, borderRadius: '2px', transition: 'width 0.3s' }}/>
              </div>
              {expanded && group.items.map((item, i) => {
                const itemDone = item.completedCounts.filter(Boolean).length
                return (
                  <div key={item.id} style={{ padding: '12px 14px', borderTop: i === 0 ? 'none' : '0.5px solid #e5e5ea' }}>
                    {item.count === 1 ? (
                      <div onClick={() => toggleGroupItemCount(group.id, item.id, 0)} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <div style={{ ...circle, background: item.completedCounts[0] ? '#34c759' : 'transparent', border: item.completedCounts[0] ? 'none' : '2px solid #c6c6c8' }}>
                          {item.completedCounts[0] && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ flex: 1, fontSize: '15px', color: item.completedCounts[0] ? '#8e8e93' : '#000', textDecoration: item.completedCounts[0] ? 'line-through' : 'none' }}>{item.text}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '600', color: itemDone === item.count ? '#8e8e93' : '#000', textDecoration: itemDone === item.count ? 'line-through' : 'none' }}>{item.text}</span>
                          <span style={{ fontSize: '12px', color: '#8e8e93' }}>{itemDone}/{item.count}회</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {item.completedCounts.map((done, ci) => (
                            <button key={ci} onClick={() => toggleGroupItemCount(group.id, item.id, ci)} style={{
                              width: '36px', height: '36px', borderRadius: '8px', border: `1.5px solid ${done ? '#34c759' : '#c6c6c8'}`,
                              background: done ? '#34c759' : 'transparent', color: done ? '#fff' : '#8e8e93',
                              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                            }}>{done ? '✓' : ci + 1}</button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {isEmpty && <EmptyCard>오늘의 플랜이 없습니다{'\n'}위의 버튼으로 추가해보세요</EmptyCard>}

      </div>
    </div>
  </div>
}
