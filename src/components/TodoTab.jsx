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
  sessionsForDay, expandedSession, setExpandedSession, toggleSet, addExerciseSet, exTimer,
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

  // ── 날짜 슬라이드 애니메이션 ─────────────────────────────
  // navAnim: 진행 중인 슬라이드의 이전(outgoing) 데이터 스냅샷 + 방향(dir: -1 prev, +1 next)
  const [navAnim,    setNavAnim]    = useState(null)
  const [navEntered, setNavEntered] = useState(false)
  function navigateDate(dir) {
    if (navAnim) return
    setNavAnim({ dir, sessions: sessionsForDay, groups: groupsForDay, planTasks: planTasksForDay })
    setNavEntered(false)
    setSelectedDate(d => addDays(d, dir))
    requestAnimationFrame(() => requestAnimationFrame(() => setNavEntered(true)))
    setTimeout(() => { setNavAnim(null); setNavEntered(false) }, 340)
  }

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
    navigateDate(dx > 0 ? -1 : 1)
  }

  // ── 바텀 시트 (플랜 추가) ─────────────────────────────────
  const [sheetEntered, setSheetEntered] = useState(false)
  const [sheetLeaving, setSheetLeaving] = useState(false)
  const [sheetDragY,   setSheetDragY]   = useState(0)
  const [sheetDragging, setSheetDragging] = useState(false)
  const sheetTouchStart = useRef(null)
  function openSheet() {
    setShowAdd(true); setSheetLeaving(false); setSheetDragY(0)
    requestAnimationFrame(() => requestAnimationFrame(() => setSheetEntered(true)))
  }
  function closeSheet() {
    setSheetLeaving(true); setSheetDragY(0)
    setTimeout(() => { setShowAdd(false); setSheetEntered(false); setSheetLeaving(false) }, 280)
  }
  function onSheetTouchStart(e) {
    e.stopPropagation()
    sheetTouchStart.current = e.touches[0].clientY
    setSheetDragging(false)
  }
  function onSheetTouchMove(e) {
    e.stopPropagation()
    if (sheetTouchStart.current === null) return
    const dy = e.touches[0].clientY - sheetTouchStart.current
    if (dy > 5) { setSheetDragging(true); setSheetDragY(dy) }
  }
  function onSheetTouchEnd(e) {
    e.stopPropagation()
    if (sheetTouchStart.current === null) return
    const dy = e.changedTouches[0].clientY - sheetTouchStart.current
    sheetTouchStart.current = null
    setSheetDragging(false); setSheetDragY(0)
    if (dy > 80) closeSheet()
  }
  const sheetTransform = sheetLeaving ? 'translateY(100%)'
    : sheetEntered ? `translateY(${sheetDragging ? Math.max(0, sheetDragY) : 0}px)`
    : 'translateY(100%)'
  const sheetTransition = sheetDragging ? 'none' : 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

  // ── 하루치 콘텐츠 렌더 (슬라이드 두 레이어에서 공통 사용) ──
  function renderDay(sessionsList, groupsList, planTasksList) {
    const empty = (sessionsList?.length ?? 0) === 0 && (groupsList?.length ?? 0) === 0 && (planTasksList?.length ?? 0) === 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>

        {/* 일회성 태스크 */}
        {(planTasksList?.length ?? 0) > 0 && planTasksList.map(task => (
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
        {sessionsList.map(session => {
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
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
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
                      <button
                        onClick={() => addExerciseSet(session.id, ex.id)}
                        aria-label="세트 추가"
                        style={{ width: '36px', height: '36px', borderRadius: '8px', border: 'none', background: '#34c759', color: '#fff', fontSize: '22px', fontWeight: '600', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
                      >+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* 할일 그룹 */}
        {groupsList.map(group => {
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

        {empty && <EmptyCard>오늘의 플랜이 없습니다{'\n'}아래 버튼으로 추가해보세요</EmptyCard>}

      </div>
    )
  }

  return <div
    onTouchStart={onSwipeStart}
    onTouchMove={onSwipeMove}
    onTouchEnd={onSwipeEnd}
    style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}
  >
    {/* 날짜 네비게이터 */}
    <div style={{ padding: '8px 16px', flexShrink: 0 }}>
      <NavCard>
        <NavBtn onClick={() => navigateDate(-1)}>‹</NavBtn>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '17px', fontWeight: '700', position: 'relative', display: 'inline-block' }}>
            {selectedDate.getFullYear()}년 {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}일
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#8e8e93', marginLeft: '4px' }}>({DAYS[selectedDate.getDay()]})</span>
            {labelForDate(selectedDate) && <span style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '6px', fontSize: '12px', fontWeight: '600', color: '#007aff', whiteSpace: 'nowrap' }}>{labelForDate(selectedDate)}</span>}
          </div>
        </div>
        <NavBtn onClick={() => navigateDate(1)}>›</NavBtn>
      </NavCard>

    </div>

    {/* 바텀 시트 (플랜 추가) */}
    {showAdd && (
      <>
        <div
          onClick={closeSheet}
          style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
            opacity: sheetLeaving ? 0 : sheetEntered ? 1 : 0,
            transition: 'opacity 0.28s', zIndex: 20,
          }}
        />
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70vh',
            background: '#f2f2f7', borderRadius: '20px 20px 0 0',
            display: 'flex', flexDirection: 'column',
            transform: sheetTransform, transition: sheetTransition,
            zIndex: 21, boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
          }}
        >
          {/* 드래그 핸들 */}
          <div
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
            style={{ flexShrink: 0, padding: '10px 0 6px', touchAction: 'none' }}
          >
            <div style={{ width: '40px', height: '5px', borderRadius: '3px', background: '#c6c6c8', margin: '0 auto' }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 16px 8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* 일회성 태스크 */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', padding: '8px 2px 6px', letterSpacing: '0.3px' }}>일회성 태스크</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={taskInput} onChange={e => setTaskInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur() } }}
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
            onClick={closeSheet}
            style={{
              width: '100%', height: '40px', borderRadius: '10px', border: 'none',
              background: '#007aff', color: '#fff',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            }}
          >닫기</button>
        </div>
      </div>
      </>
    )}

    {/* 스크롤 영역 (날짜 변경 시 슬라이드 애니메이션) */}
    <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
      {navAnim && (
        <div style={{
          position: 'absolute', inset: 0, overflow: 'hidden',
          transform: `translateX(${navEntered ? -navAnim.dir * 100 : 0}%)`,
          transition: navEntered ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          willChange: 'transform', pointerEvents: 'none',
          padding: '0 16px 8px',
        }}>
          {renderDay(navAnim.sessions, navAnim.groups, navAnim.planTasks)}
        </div>
      )}
      <div style={{
        position: 'absolute', inset: 0,
        overflowY: 'scroll', WebkitOverflowScrolling: 'touch',
        padding: '0 16px 8px',
        transform: navAnim ? `translateX(${navEntered ? 0 : navAnim.dir * 100}%)` : 'none',
        transition: navAnim && navEntered ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        willChange: navAnim ? 'transform' : 'auto',
      }}>
        {renderDay(sessionsForDay, groupsForDay, planTasksForDay)}
      </div>
    </div>

    {/* 플랜 추가 버튼 (플랜 목록 아래 고정) */}
    <div style={{ flexShrink: 0, padding: '8px 16px 12px' }}>
      <button
        onClick={openSheet}
        style={{
          width: '100%', height: '40px', borderRadius: '10px', border: 'none',
          background: '#fff', color: '#007aff',
          fontSize: '14px', fontWeight: '600', cursor: 'pointer',
        }}
      >+ 플랜 추가</button>
    </div>
  </div>
}
