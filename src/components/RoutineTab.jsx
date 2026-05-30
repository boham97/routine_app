import { useState, useRef, useEffect } from 'react'

const SEG = (active, color = '#007aff') => ({
  flex: 1, padding: '7px', border: 'none', borderRadius: '7px', fontSize: '14px',
  fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
  background: active ? '#fff' : 'transparent',
  color: active ? color : '#8e8e93',
  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
})

const NUM_INPUT = {
  width: '64px', height: '44px', background: '#f2f2f7', border: 'none',
  borderRadius: '10px', textAlign: 'center', fontSize: '18px', fontWeight: '700', outline: 'none',
  color: '#8e8e93',
}

const HEADER_H = 44

function SectionHeader({ children, count, action, top, bottom, innerRef, onClick }) {
  return (
    <div
      ref={innerRef}
      onClick={onClick}
      style={{
        position: 'sticky', top, bottom, zIndex: 5, background: '#f2f2f7',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: `${HEADER_H}px`, padding: '0 4px', userSelect: 'none', cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        <span style={{ fontSize: '17px', fontWeight: '700', color: '#000' }}>
          {children}
        </span>
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: '12px', fontWeight: '600', color: '#fff', background: '#8e8e93', borderRadius: '10px', padding: '1px 7px' }}>
            {count}
          </span>
        )}
      </div>
      {action && (
        <button
          onClick={e => { e.stopPropagation(); action.onClick() }}
          style={{ height: '30px', padding: '0 18px', background: 'none', color: '#007aff', border: 'none', fontSize: '28px', fontWeight: '300', lineHeight: 1, cursor: 'pointer' }}
        >{action.label}</button>
      )}
    </div>
  )
}

function Stepper({ label, value, onChange, color = '#007aff' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button onClick={() => onChange(Math.max(1, value - 1))} style={{ width: '34px', height: '34px', border: 'none', background: '#ebebeb', borderRadius: '8px 0 0 8px', fontSize: '20px', cursor: 'pointer', color, fontWeight: '700', lineHeight: 1 }}>−</button>
        <div style={{ minWidth: '48px', height: '34px', background: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', borderLeft: '0.5px solid #d1d1d6', borderRight: '0.5px solid #d1d1d6' }}>{value}</div>
        <button onClick={() => onChange(value + 1)} style={{ width: '34px', height: '34px', border: 'none', background: '#ebebeb', borderRadius: '0 8px 8px 0', fontSize: '20px', cursor: 'pointer', color, fontWeight: '700', lineHeight: 1 }}>+</button>
      </div>
      <span style={{ fontSize: '11px', color: '#8e8e93' }}>{label}</span>
    </div>
  )
}

// 슬라이드 패널을 공통으로 쓰는 훅
function useSlidePanel() {
  const [isOpen,    setIsOpen]    = useState(false)
  const [entered,   setEntered]   = useState(false)
  const [leaving,   setLeaving]   = useState(false)
  const [dragX,     setDragX]     = useState(0)
  const [dragging,  setDragging]  = useState(false)
  const panelRef  = useRef(null)
  const txStart   = useRef(null)
  const tyStart   = useRef(null)
  const isHSwipe  = useRef(false)

  function open() {
    setIsOpen(true); setLeaving(false); setDragX(0)
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
  }
  function close(onDone) {
    setLeaving(true); setDragX(0)
    setTimeout(() => { setIsOpen(false); setEntered(false); setLeaving(false); onDone?.() }, 280)
  }

  function onTouchStart(e) {
    e.stopPropagation()
    txStart.current = e.touches[0].clientX; tyStart.current = e.touches[0].clientY
    isHSwipe.current = false; setDragging(false)
  }
  function onTouchMove(e) {
    e.stopPropagation()
    if (txStart.current === null) return
    const dx = e.touches[0].clientX - txStart.current
    const dy = e.touches[0].clientY - tyStart.current
    if (!isHSwipe.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    if (!isHSwipe.current) isHSwipe.current = Math.abs(dx) > Math.abs(dy)
    if (isHSwipe.current && dx > 0) { setDragging(true); setDragX(dx) }
  }
  function onTouchEnd(e, onSwipeClose) {
    e.stopPropagation()
    if (!isHSwipe.current) { setDragX(0); return }
    const dx = e.changedTouches[0].clientX - (txStart.current ?? 0)
    setDragging(false); setDragX(0)
    if (dx > 60) onSwipeClose()
    txStart.current = null
  }

  useEffect(() => {
    const el = panelRef.current; if (!el) return
    const handler = e => { if (isHSwipe.current) e.preventDefault() }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }, [isOpen])

  const transform = leaving ? 'translateX(100%)' : entered ? `translateX(${dragging ? dragX : 0}px)` : 'translateX(100%)'
  const transition = dragging ? 'none' : 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

  return { isOpen, open, close, panelRef, onTouchStart, onTouchMove, onTouchEnd, transform, transition }
}

export default function RoutineTab({
  addTask, tasks, toggleTaskSet, deleteTodo, updateTask, confirm, rate,
  workoutTemplates, todoTemplates,
  addWorkoutGroup, updateWorkoutGroup, deleteWorkoutTpl,
  addGeneralGroup, updateGeneralGroup, deleteTodoTpl,
}) {
  // ── 등록 폼 ──
  const [name,     setName]     = useState('')
  const [type,     setType]     = useState('general')
  const [goalMode, setGoalMode] = useState('reps')
  const [sets,     setSets]     = useState('')
  const [reps,     setReps]     = useState('')
  const [seconds,  setSeconds]  = useState('')
  const [desc,     setDesc]     = useState('')

  const scrollRef = useRef(null)
  const headerRefs = useRef({})

  // ── 일반 그룹 디테일 패널 ──
  const ggPanel       = useSlidePanel()
  const [ggTarget,       setGgTarget]       = useState(null)
  const [ggdName,        setGgdName]        = useState('')
  const [ggdSelectedIds, setGgdSelectedIds] = useState([])

  // ── 태스크 추가 패널 ──
  const addPanel = useSlidePanel()

  // ── 태스크 디테일 패널 ──
  const taskPanel   = useSlidePanel()
  const [detailTask, setDetailTask] = useState(null)
  const [dDesc,    setDDesc]    = useState('')
  const [dSets,    setDSets]    = useState(3)
  const [dReps,    setDReps]    = useState(10)
  const [dSeconds, setDSeconds] = useState(60)

  // ── 운동 그룹 디테일 패널 ──
  const wgPanel      = useSlidePanel()
  const [wgTarget,      setWgTarget]      = useState(null)   // null = 새 그룹, or template
  const [wgdName,       setWgdName]       = useState('')
  const [wgdSelectedIds, setWgdSelectedIds] = useState([])

  const canAdd = name.trim().length > 0
  const nameInputRef = useRef(null)

  function handleAdd() {
    if (!canAdd) return
    addTask({ name: name.trim(), taskType: type, goalMode, sets, reps, seconds, desc: desc.trim() })
    setName(''); setDesc(''); setSets(''); setReps(''); setSeconds('')
    addPanel.close()
  }

  function startAdd(taskType) {
    setType(taskType)
    setName(''); setDesc(''); setGoalMode('reps')
    if (taskType === 'workout') { setSets('4'); setReps('10'); setSeconds('60') }
    addPanel.open()
    setTimeout(() => nameInputRef.current?.focus(), 320)
  }
  function closeAdd() { addPanel.close() }

  // ── 태스크 디테일 ──
  function openDetail(task) {
    setDDesc(task.desc || ''); setDSets(task.sets || 3)
    setDReps(task.reps || 10); setDSeconds(task.seconds || 60)
    setDetailTask(task); taskPanel.open()
  }
  function closeDetail() { taskPanel.close(() => setDetailTask(null)) }
  function saveDetail() {
    if (!detailTask) return
    if (detailTask.taskType === 'workout') {
      updateTask(detailTask.id, { sets: dSets, ...(detailTask.goalMode === 'reps' ? { reps: dReps } : { seconds: dSeconds }) })
    } else {
      updateTask(detailTask.id, { desc: dDesc.trim() })
    }
    closeDetail()
  }

  // ── 운동 그룹 디테일 ──
  function openWgDetail(tpl) {
    setWgTarget(tpl ?? null)
    setWgdName(tpl ? tpl.name : '')
    setWgdSelectedIds(tpl ? tpl.exercises.map(e => e.id) : [])
    wgPanel.open()
  }
  function closeWgDetail() { wgPanel.close(() => setWgTarget(null)) }
  function saveWgDetail() {
    const selected = workoutTasks.filter(t => wgdSelectedIds.includes(t.id))
    if (!wgdName.trim() || selected.length === 0) return
    const exercises = selected.map(t => ({
      id: t.id, name: t.text, sets: t.sets,
      reps: t.goalMode === 'reps' ? t.reps : t.seconds,
      unit: t.goalMode === 'reps' ? '회' : '초',
    }))
    if (wgTarget) {
      updateWorkoutGroup(wgTarget.id, { name: wgdName.trim(), exercises })
    } else {
      addWorkoutGroup(wgdName.trim(), exercises)
    }
    closeWgDetail()
  }

  // ── 일반 그룹 디테일 핸들러 ──
  function openGgDetail(tpl) {
    setGgTarget(tpl ?? null)
    setGgdName(tpl ? tpl.name : '')
    setGgdSelectedIds(tpl ? tpl.items.map(i => i.id) : [])
    ggPanel.open()
  }
  function closeGgDetail() { ggPanel.close(() => setGgTarget(null)) }
  function saveGgDetail() {
    const selected = generalTasks.filter(t => ggdSelectedIds.includes(t.id))
    if (!ggdName.trim() || selected.length === 0) return
    const items = selected.map(t => ({ id: t.id, text: t.text, count: 1 }))
    if (ggTarget) {
      updateGeneralGroup(ggTarget.id, { name: ggdName.trim(), items })
    } else {
      addGeneralGroup(ggdName.trim(), items)
    }
    closeGgDetail()
  }

  const workoutTasks = (tasks || []).filter(t => t.taskType === 'workout').sort((a, b) => a.text.localeCompare(b.text, 'ko'))
  const generalTasks = (tasks || []).filter(t => !t.taskType || t.taskType === 'general').sort((a, b) => a.text.localeCompare(b.text, 'ko'))
  const wTemplates   = workoutTemplates || []
  const gTemplates   = todoTemplates    || []

  // ── sticky 섹션: 렌더되는 순서대로 위쪽 오프셋 계산 ──
  // 스크롤하면 지나간 섹션 헤더가 상단에 누적되어 붙음
  const sectionOrder = ['wg', 'wt', 'gg', 'gt']
  const topOf = key => `${sectionOrder.indexOf(key) * HEADER_H}px`
  const botOf = key => `${(sectionOrder.length - 1 - sectionOrder.indexOf(key)) * HEADER_H}px`

  // 헤더는 상·하단 양방향 sticky라 offsetTop이 stuck 위치를 반영해 신뢰 불가.
  // 각 섹션 앞에 높이 0짜리 static 앵커를 두고 그 offsetTop으로 자연 위치를 잡는다.
  function scrollToSection(key) {
    const el = headerRefs.current[key]
    const cont = scrollRef.current
    if (!el || !cont) return
    const target = el.offsetTop - sectionOrder.indexOf(key) * HEADER_H
    cont.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

          <div style={{ flexShrink: 0, height: '12px' }} />

          {/* ── 메인 목록 (스크롤) ── */}
          <div ref={scrollRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '0 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '16px', minHeight: `calc(100% + ${(sectionOrder.length - 1) * HEADER_H}px)` }}>

          {/* ── 운동 그룹 ── */}
          <div ref={el => { headerRefs.current.wg = el }} style={{ height: 0 }} />
          <SectionHeader
            onClick={() => scrollToSection('wg')}
            top={topOf('wg')} bottom={botOf('wg')}
            action={{ label: '+', onClick: () => openWgDetail(null) }}
            count={wTemplates.length}
          >운동 그룹</SectionHeader>
          {wTemplates.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px' }}>
              {wTemplates.map((tpl, i) => (
                <div key={tpl.id} onClick={() => openWgDetail(tpl)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '10px', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none', cursor: 'pointer' }}>
                  <span style={{ flex: 1, fontSize: '15px', color: '#000' }}>{tpl.name}</span>
                  <span style={{ fontSize: '14px', color: '#8e8e93', flexShrink: 0 }}>{tpl.exercises.length}개 운동</span>
                  <span style={{ color: '#c6c6c8', fontSize: '16px', flexShrink: 0 }}>›</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#c6c6c8', fontSize: '13px', padding: '8px 0 12px' }}>운동 그룹이 없습니다</div>
          )}

          {/* ── 운동 태스크 목록 ── */}
          <div ref={el => { headerRefs.current.wt = el }} style={{ height: 0 }} />
          <SectionHeader
            onClick={() => scrollToSection('wt')}
            top={topOf('wt')} bottom={botOf('wt')}
            action={{ label: '+', onClick: () => startAdd('workout') }}
            count={workoutTasks.length}
          >운동 태스크</SectionHeader>
          {workoutTasks.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px' }}>
              {workoutTasks.map((task, i) => {
                const isReps = task.goalMode === 'reps'
                return (
                  <div key={task.id} onClick={() => openDetail(task)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '10px', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none', cursor: 'pointer' }}>
                    <span style={{ flex: 1, fontSize: '15px', color: '#000' }}>{task.text}</span>
                    <span style={{ fontSize: '14px', color: '#8e8e93' }}>{task.sets}세트 · {isReps ? task.reps : task.seconds}{isReps ? '회' : '초'}</span>
                    <span style={{ color: '#c6c6c8', fontSize: '16px', flexShrink: 0 }}>›</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#c6c6c8', fontSize: '13px', padding: '8px 0 12px' }}>운동 태스크가 없습니다</div>
          )}

          {/* ── 일반 그룹 ── */}
          <div ref={el => { headerRefs.current.gg = el }} style={{ height: 0 }} />
          <SectionHeader
            onClick={() => scrollToSection('gg')}
            top={topOf('gg')} bottom={botOf('gg')}
            action={{ label: '+', onClick: () => openGgDetail(null) }}
            count={gTemplates.length}
          >일반 그룹</SectionHeader>
          {gTemplates.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px' }}>
              {gTemplates.map((tpl, i) => (
                <div key={tpl.id} onClick={() => openGgDetail(tpl)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '10px', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none', cursor: 'pointer' }}>
                  <span style={{ flex: 1, fontSize: '15px', color: '#000' }}>{tpl.name}</span>
                  <span style={{ fontSize: '14px', color: '#8e8e93', flexShrink: 0 }}>{tpl.items.length}개 항목</span>
                  <span style={{ color: '#c6c6c8', fontSize: '16px', flexShrink: 0 }}>›</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#c6c6c8', fontSize: '13px', padding: '8px 0 12px' }}>일반 그룹이 없습니다</div>
          )}

          {/* ── 일반 태스크 목록 ── */}
          <div ref={el => { headerRefs.current.gt = el }} style={{ height: 0 }} />
          <SectionHeader
            onClick={() => scrollToSection('gt')}
            top={topOf('gt')} bottom={botOf('gt')}
            action={{ label: '+', onClick: () => startAdd('general') }}
            count={generalTasks.length}
          >일반 태스크</SectionHeader>
          {generalTasks.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', marginBottom: '8px' }}>
              {generalTasks.map((task, i) => (
                <div key={task.id} onClick={() => openDetail(task)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '10px', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none', cursor: 'pointer' }}>
                  <span style={{ flex: 1, fontSize: '15px', color: '#000' }}>{task.text}</span>
                  {task.desc && <span style={{ fontSize: '14px', color: '#8e8e93', flexShrink: 0 }}>{task.desc.length > 10 ? task.desc.slice(0, 10) + '…' : task.desc}</span>}
                  <span style={{ color: '#c6c6c8', fontSize: '16px', flexShrink: 0 }}>›</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#c6c6c8', fontSize: '13px', padding: '8px 0 12px' }}>일반 태스크가 없습니다</div>
          )}
            </div>
          </div>
      </div>

      {/* ── 태스크 추가 패널 ── */}
      {addPanel.isOpen && (
        <div
          ref={addPanel.panelRef}
          onTouchStart={addPanel.onTouchStart}
          onTouchMove={addPanel.onTouchMove}
          onTouchEnd={e => addPanel.onTouchEnd(e, closeAdd)}
          style={{ position: 'absolute', inset: 0, background: '#f2f2f7', transform: addPanel.transform, transition: addPanel.transition, display: 'flex', flexDirection: 'column', zIndex: 10, touchAction: 'pan-y' }}
        >
          <div style={{ height: '52px', flexShrink: 0, background: 'rgba(242,242,247,0.96)', borderBottom: '0.5px solid #c6c6c8', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
            <button onClick={closeAdd} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'none', border: 'none', color: '#007aff', fontSize: '16px', cursor: 'pointer', padding: '8px 10px' }}>
              <span style={{ fontSize: '22px', lineHeight: 1, marginTop: '-1px' }}>‹</span> 루틴
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: '600', color: '#000' }}>
              {type === 'workout' ? '새 운동 태스크' : '새 일반 태스크'}
            </span>
            <div style={{ width: '60px' }}/>
          </div>
          <div style={{ flex: 1, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#fff', borderRadius: '14px' }}>
              <input
                ref={nameInputRef}
                value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder={type === 'workout' ? '운동 이름' : '태스크 이름'}
                style={{ width: '100%', height: '52px', boxSizing: 'border-box', padding: '0 16px', fontSize: '16px', border: 'none', outline: 'none', background: 'transparent', borderRadius: '14px' }}
              />
            </div>
            {type === 'general' && (
              <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden' }}>
                <textarea
                  value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="설명 (선택)" rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', fontSize: '15px', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', color: '#3c3c43', lineHeight: '1.5' }}
                />
              </div>
            )}
            {type === 'workout' && (
              <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>목표 유형</div>
                  <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: '10px', padding: '2px', gap: '2px' }}>
                    <button onClick={() => setGoalMode('reps')} style={SEG(goalMode === 'reps', '#007aff')}>횟수</button>
                    <button onClick={() => setGoalMode('time')} style={SEG(goalMode === 'time', '#007aff')}>시간</button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{goalMode === 'reps' ? '세트 × 횟수' : '세트 × 목표 시간'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <input value={sets} onChange={e => setSets(e.target.value)} onFocus={e => e.target.select()} type="number" min="1" style={NUM_INPUT} />
                      <span style={{ fontSize: '12px', color: '#8e8e93' }}>세트</span>
                    </div>
                    <span style={{ fontSize: '22px', color: '#c6c6c8', fontWeight: '300' }}>×</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      {goalMode === 'reps'
                        ? <input value={reps} onChange={e => setReps(e.target.value)} onFocus={e => e.target.select()} type="number" min="1" style={NUM_INPUT} />
                        : <input value={seconds} onChange={e => setSeconds(e.target.value)} onFocus={e => e.target.select()} type="number" min="1" style={NUM_INPUT} />}
                      <span style={{ fontSize: '12px', color: '#8e8e93' }}>{goalMode === 'reps' ? '횟수' : '초'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleAdd} disabled={!canAdd}
              style={{ height: '52px', borderRadius: '14px', border: 'none', cursor: canAdd ? 'pointer' : 'default', background: canAdd ? '#007aff' : '#e5e5ea', color: canAdd ? '#fff' : '#c6c6c8', fontSize: '16px', fontWeight: '700', marginTop: '4px' }}
            >추가</button>
          </div>
        </div>
      )}

      {/* ── 태스크 디테일 패널 ── */}
      {taskPanel.isOpen && detailTask && (
        <div
          ref={taskPanel.panelRef}
          onTouchStart={taskPanel.onTouchStart}
          onTouchMove={taskPanel.onTouchMove}
          onTouchEnd={e => taskPanel.onTouchEnd(e, closeDetail)}
          style={{ position: 'absolute', inset: 0, background: '#f2f2f7', transform: taskPanel.transform, transition: taskPanel.transition, display: 'flex', flexDirection: 'column', zIndex: 10, touchAction: 'pan-y' }}
        >
          <div style={{ height: '52px', flexShrink: 0, background: 'rgba(242,242,247,0.96)', borderBottom: '0.5px solid #c6c6c8', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
            <button onClick={closeDetail} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'none', border: 'none', color: '#007aff', fontSize: '16px', cursor: 'pointer', padding: '8px 10px' }}>
              <span style={{ fontSize: '22px', lineHeight: 1, marginTop: '-1px' }}>‹</span> 루틴
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: '600', color: '#000' }}>{detailTask.text}</span>
            <div style={{ width: '60px' }}/>
          </div>
          <div style={{ flex: 1, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {detailTask.taskType === 'workout' ? (
              <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {detailTask.goalMode === 'reps' ? '세트 × 횟수' : '세트 × 시간'}
                </div>
                <div style={{ display: 'flex', gap: '28px' }}>
                  <Stepper label="세트" value={dSets} onChange={setDSets} color="#007aff" />
                  {detailTask.goalMode === 'reps'
                    ? <Stepper label="횟수" value={dReps} onChange={setDReps} color="#007aff" />
                    : <Stepper label="초"   value={dSeconds} onChange={setDSeconds} color="#007aff" />}
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', padding: '12px 16px 4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>설명</div>
                <textarea value={dDesc} onChange={e => setDDesc(e.target.value)} placeholder="설명을 입력하세요" rows={4}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '6px 16px 16px', fontSize: '15px', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', color: '#3c3c43', lineHeight: '1.6' }}
                />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                onClick={() => confirm(`"${detailTask.text}" 태스크를 삭제할까요?`, () => { deleteTodo(detailTask.id); closeDetail() })}
                style={{ flex: 1, height: '50px', border: 'none', borderRadius: '14px', background: '#fff', color: '#ff3b30', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
              >삭제</button>
              <button
                onClick={saveDetail}
                style={{ flex: 1, height: '50px', border: 'none', borderRadius: '14px', background: '#007aff', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
              >완료</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 운동 그룹 디테일 패널 ── */}
      {wgPanel.isOpen && (
        <div
          ref={wgPanel.panelRef}
          onTouchStart={wgPanel.onTouchStart}
          onTouchMove={wgPanel.onTouchMove}
          onTouchEnd={e => wgPanel.onTouchEnd(e, closeWgDetail)}
          style={{ position: 'absolute', inset: 0, background: '#f2f2f7', transform: wgPanel.transform, transition: wgPanel.transition, display: 'flex', flexDirection: 'column', zIndex: 10, touchAction: 'pan-y' }}
        >
          {/* 네비게이션 바 */}
          <div style={{ height: '52px', flexShrink: 0, background: 'rgba(242,242,247,0.96)', borderBottom: '0.5px solid #c6c6c8', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
            <button onClick={closeWgDetail} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'none', border: 'none', color: '#007aff', fontSize: '16px', cursor: 'pointer', padding: '8px 10px' }}>
              <span style={{ fontSize: '22px', lineHeight: 1, marginTop: '-1px' }}>‹</span> 루틴
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: '600', color: '#000' }}>
              {wgTarget ? '그룹 수정' : '새 운동 그룹'}
            </span>
            <div style={{ width: '60px' }}/>
          </div>

          {/* 컨텐츠 */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>

            {/* 이름 */}
            <div style={{ background: '#fff', borderRadius: '14px', flexShrink: 0 }}>
              <input
                value={wgdName} onChange={e => setWgdName(e.target.value)}
                placeholder="운동 그룹 이름"
                style={{ width: '100%', height: '52px', boxSizing: 'border-box', padding: '0 16px', fontSize: '16px', border: 'none', outline: 'none', background: 'transparent', display: 'block', borderRadius: '14px' }}
              />
            </div>

            {/* 운동 태스크 선택 (내부 스크롤) */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 0 14px 16px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0, paddingRight: '16px' }}>운동 태스크 선택</div>
              {workoutTasks.length === 0 ? (
                <div style={{ fontSize: '14px', color: '#c6c6c8', textAlign: 'center', padding: '16px 16px 16px 0' }}>등록된 운동 태스크가 없습니다</div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '8px' }}>
                  {workoutTasks.map(task => {
                    const selected = wgdSelectedIds.includes(task.id)
                    const isReps   = task.goalMode === 'reps'
                    return (
                      <div
                        key={task.id}
                        onClick={() => setWgdSelectedIds(p => selected ? p.filter(id => id !== task.id) : [...p, task.id])}
                        style={{ display: 'flex', alignItems: 'center', padding: '12px', background: selected ? '#e8f4ff' : '#f9f9f9', borderRadius: '10px', gap: '10px', cursor: 'pointer', border: `1.5px solid ${selected ? '#007aff' : 'transparent'}`, flexShrink: 0 }}
                      >
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${selected ? '#007aff' : '#c6c6c8'}`, background: selected ? '#007aff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ flex: 1, fontSize: '15px', fontWeight: selected ? '600' : '400' }}>{task.text}</span>
                        <span style={{ fontSize: '13px', color: '#8e8e93' }}>{task.sets}세트 · {isReps ? task.reps : task.seconds}{isReps ? '회' : '초'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {wgTarget && (
                <button
                  onClick={() => confirm(`"${wgTarget.name}" 그룹을 삭제할까요?`, () => { deleteWorkoutTpl(wgTarget.id); closeWgDetail() })}
                  style={{ flex: 1, height: '50px', border: 'none', borderRadius: '14px', background: '#fff', color: '#ff3b30', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                >삭제</button>
              )}
              <button
                onClick={saveWgDetail}
                disabled={!(wgdName.trim() && wgdSelectedIds.length > 0)}
                style={{ flex: 1, height: '50px', border: 'none', borderRadius: '14px', background: wgdName.trim() && wgdSelectedIds.length > 0 ? '#007aff' : '#e5e5ea', color: wgdName.trim() && wgdSelectedIds.length > 0 ? '#fff' : '#c6c6c8', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
              >완료</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 일반 그룹 디테일 패널 ── */}
      {ggPanel.isOpen && (
        <div
          ref={ggPanel.panelRef}
          onTouchStart={ggPanel.onTouchStart}
          onTouchMove={ggPanel.onTouchMove}
          onTouchEnd={e => ggPanel.onTouchEnd(e, closeGgDetail)}
          style={{ position: 'absolute', inset: 0, background: '#f2f2f7', transform: ggPanel.transform, transition: ggPanel.transition, display: 'flex', flexDirection: 'column', zIndex: 10, touchAction: 'pan-y' }}
        >
          {/* 네비게이션 바 */}
          <div style={{ height: '52px', flexShrink: 0, background: 'rgba(242,242,247,0.96)', borderBottom: '0.5px solid #c6c6c8', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
            <button onClick={closeGgDetail} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'none', border: 'none', color: '#007aff', fontSize: '16px', cursor: 'pointer', padding: '8px 10px' }}>
              <span style={{ fontSize: '22px', lineHeight: 1, marginTop: '-1px' }}>‹</span> 루틴
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: '600', color: '#000' }}>
              {ggTarget ? '그룹 수정' : '새 일반 그룹'}
            </span>
            <div style={{ width: '60px' }}/>
          </div>

          {/* 컨텐츠 */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>

            {/* 이름 */}
            <div style={{ background: '#fff', borderRadius: '14px', flexShrink: 0 }}>
              <input
                value={ggdName} onChange={e => setGgdName(e.target.value)}
                placeholder="일반 그룹 이름"
                style={{ width: '100%', height: '52px', boxSizing: 'border-box', padding: '0 16px', fontSize: '16px', border: 'none', outline: 'none', background: 'transparent', display: 'block', borderRadius: '14px' }}
              />
            </div>

            {/* 일반 태스크 선택 (내부 스크롤) */}
            <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 0 14px 16px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0, paddingRight: '16px' }}>일반 태스크 선택</div>
              {generalTasks.length === 0 ? (
                <div style={{ fontSize: '14px', color: '#c6c6c8', textAlign: 'center', padding: '16px 16px 16px 0' }}>등록된 일반 태스크가 없습니다</div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '8px' }}>
                  {generalTasks.map(task => {
                    const selected = ggdSelectedIds.includes(task.id)
                    return (
                      <div
                        key={task.id}
                        onClick={() => setGgdSelectedIds(p => selected ? p.filter(id => id !== task.id) : [...p, task.id])}
                        style={{ display: 'flex', alignItems: 'center', padding: '12px', background: selected ? '#e8f4ff' : '#f9f9f9', borderRadius: '10px', gap: '10px', cursor: 'pointer', border: `1.5px solid ${selected ? '#007aff' : 'transparent'}`, flexShrink: 0 }}
                      >
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${selected ? '#007aff' : '#c6c6c8'}`, background: selected ? '#007aff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ flex: 1, fontSize: '15px', fontWeight: selected ? '600' : '400' }}>{task.text}</span>
                        {task.desc && <span style={{ fontSize: '12px', color: '#8e8e93' }}>{task.desc.length > 12 ? task.desc.slice(0, 12) + '…' : task.desc}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {ggTarget && (
                <button
                  onClick={() => confirm(`"${ggTarget.name}" 그룹을 삭제할까요?`, () => { deleteTodoTpl(ggTarget.id); closeGgDetail() })}
                  style={{ flex: 1, height: '50px', border: 'none', borderRadius: '14px', background: '#fff', color: '#ff3b30', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                >삭제</button>
              )}
              <button
                onClick={saveGgDetail}
                disabled={!(ggdName.trim() && ggdSelectedIds.length > 0)}
                style={{ flex: 1, height: '50px', border: 'none', borderRadius: '14px', background: ggdName.trim() && ggdSelectedIds.length > 0 ? '#007aff' : '#e5e5ea', color: ggdName.trim() && ggdSelectedIds.length > 0 ? '#fff' : '#c6c6c8', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
              >완료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
