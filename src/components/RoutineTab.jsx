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
}

function SectionHeader({ children }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', padding: '16px 4px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {children}
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

export default function RoutineTab({ addTask, tasks, toggleTaskSet, deleteTodo, updateTask, confirm, rate }) {
  // ── 등록 폼 ──
  const [name,     setName]     = useState('')
  const [type,     setType]     = useState('general')
  const [goalMode, setGoalMode] = useState('reps')
  const [sets,     setSets]     = useState('3')
  const [reps,     setReps]     = useState('10')
  const [seconds,  setSeconds]  = useState('60')
  const [desc,     setDesc]     = useState('')

  // ── 디테일 페이지 ──
  const [detailTask,     setDetailTask]     = useState(null)
  const [detailEntered,  setDetailEntered]  = useState(false)  // 진입 완료 여부
  const [detailLeaving,  setDetailLeaving]  = useState(false)  // 나가는 중 여부
  const [detailDragX,    setDetailDragX]    = useState(0)
  const [detailDragging, setDetailDragging] = useState(false)

  // ── 디테일 로컬 편집 상태 ──
  const [dDesc,    setDDesc]    = useState('')
  const [dSets,    setDSets]    = useState(3)
  const [dReps,    setDReps]    = useState(10)
  const [dSeconds, setDSeconds] = useState(60)

  const [formExpanded, setFormExpanded] = useState(false)

  // ── 스와이프 추적 refs ──
  const detailPanelRef = useRef(null)
  const txStart        = useRef(null)
  const tyStart        = useRef(null)
  const isHSwipe       = useRef(false)

  const canAdd = name.trim().length > 0

  function handleAdd() {
    if (!canAdd) return
    addTask({ name: name.trim(), taskType: type, goalMode, sets, reps, seconds, desc: desc.trim() })
    setName('')
    setDesc('')
    setFormExpanded(false)
  }

  // ── 디테일 열기 ──
  function openDetail(task) {
    setDDesc(task.desc || '')
    setDSets(task.sets || 3)
    setDReps(task.reps || 10)
    setDSeconds(task.seconds || 60)
    setDetailTask(task)
    setDetailLeaving(false)
    setDetailDragX(0)
    requestAnimationFrame(() => requestAnimationFrame(() => setDetailEntered(true)))
  }

  // ── 디테일 닫기 (저장 없이) ──
  function closeDetail() {
    setDetailLeaving(true)
    setDetailDragX(0)
    setTimeout(() => {
      setDetailTask(null)
      setDetailEntered(false)
      setDetailLeaving(false)
    }, 280)
  }

  // ── 디테일 저장 후 닫기 ──
  function saveDetail() {
    if (!detailTask) return
    if (detailTask.taskType === 'workout') {
      updateTask(detailTask.id, {
        sets: dSets,
        ...(detailTask.goalMode === 'reps' ? { reps: dReps } : { seconds: dSeconds }),
      })
    } else {
      updateTask(detailTask.id, { desc: dDesc.trim() })
    }
    closeDetail()
  }

  // ── 스와이프 핸들러 (오른쪽 스와이프 = 닫기) ──
  function onTouchStart(e) {
    e.stopPropagation()
    txStart.current = e.touches[0].clientX
    tyStart.current = e.touches[0].clientY
    isHSwipe.current = false
    setDetailDragging(false)
  }

  function onTouchMove(e) {
    e.stopPropagation()
    if (txStart.current === null) return
    const dx = e.touches[0].clientX - txStart.current
    const dy = e.touches[0].clientY - tyStart.current
    if (!isHSwipe.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    if (!isHSwipe.current) isHSwipe.current = Math.abs(dx) > Math.abs(dy)
    if (isHSwipe.current && dx > 0) {   // 오른쪽 스와이프만 추적
      setDetailDragging(true)
      setDetailDragX(dx)
    }
  }

  function onTouchEnd(e) {
    e.stopPropagation()
    if (!isHSwipe.current) { setDetailDragX(0); return }
    const dx = e.changedTouches[0].clientX - (txStart.current ?? 0)
    setDetailDragging(false)
    setDetailDragX(0)
    if (dx > 60) closeDetail()
    txStart.current = null
  }

  // passive:false → preventDefault 로 브라우저 네이티브 스와이프 차단
  useEffect(() => {
    const el = detailPanelRef.current
    if (!el) return
    const handler = (e) => { if (isHSwipe.current) e.preventDefault() }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }, [detailTask])

  // ── 디테일 패널 transform 계산 ──
  // 열기: 오른쪽에서 슬라이드 인 (100% → 0%)
  // 닫기: 오른쪽으로 슬라이드 아웃 (0% → 100%)
  const detailTransform = detailLeaving
    ? 'translateX(100%)'
    : detailEntered
      ? `translateX(${detailDragging ? detailDragX : 0}px)`
      : 'translateX(100%)'

  const detailTransition = detailDragging
    ? 'none'
    : 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

  const workoutTasks = (tasks || []).filter(t => t.taskType === 'workout')
  const generalTasks = (tasks || []).filter(t => !t.taskType || t.taskType === 'general')

  return (
    <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* ── 태스크 목록 (메인) ── */}
      <div style={{ height: '100%', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* 등록 폼 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden' }}>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFormExpanded(true)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="태스크 이름을 입력하세요"
                style={{ width: '100%', boxSizing: 'border-box', padding: '16px', fontSize: '16px', border: 'none', outline: 'none', background: 'transparent' }}
              />
            </div>

            {formExpanded && <>
              <div style={{ background: '#fff', borderRadius: '14px', padding: '12px 14px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>종류</div>
                <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: '10px', padding: '2px', gap: '2px' }}>
                  <button onClick={() => setType('general')} style={SEG(type === 'general', '#007aff')}>📋 일반</button>
                  <button onClick={() => setType('workout')} style={SEG(type === 'workout', '#ff9500')}>🏋️ 운동</button>
                </div>
              </div>

              {type === 'general' && (
                <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden' }}>
                  <textarea
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="설명 (선택)"
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px', fontSize: '15px', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', color: '#3c3c43', lineHeight: '1.5' }}
                  />
                </div>
              )}

              {type === 'workout' && (
                <div style={{ background: '#fff', borderRadius: '14px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>목표 유형</div>
                    <div style={{ display: 'flex', background: '#f2f2f7', borderRadius: '10px', padding: '2px', gap: '2px' }}>
                      <button onClick={() => setGoalMode('reps')} style={SEG(goalMode === 'reps', '#ff9500')}>횟수</button>
                      <button onClick={() => setGoalMode('time')} style={SEG(goalMode === 'time', '#ff9500')}>시간</button>
                    </div>
                  </div>
                  {goalMode === 'reps' && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>세트 × 횟수</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <input value={sets} onChange={e => setSets(e.target.value)} type="number" min="1" style={NUM_INPUT} />
                          <span style={{ fontSize: '12px', color: '#8e8e93' }}>세트</span>
                        </div>
                        <span style={{ fontSize: '22px', color: '#c6c6c8', fontWeight: '300' }}>×</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <input value={reps} onChange={e => setReps(e.target.value)} type="number" min="1" style={NUM_INPUT} />
                          <span style={{ fontSize: '12px', color: '#8e8e93' }}>횟수</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {goalMode === 'time' && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>세트 × 목표 시간</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <input value={sets} onChange={e => setSets(e.target.value)} type="number" min="1" style={NUM_INPUT} />
                          <span style={{ fontSize: '12px', color: '#8e8e93' }}>세트</span>
                        </div>
                        <span style={{ fontSize: '22px', color: '#c6c6c8', fontWeight: '300' }}>×</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <input value={seconds} onChange={e => setSeconds(e.target.value)} type="number" min="1" style={NUM_INPUT} />
                          <span style={{ fontSize: '12px', color: '#8e8e93' }}>초</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={!canAdd}
                style={{
                  height: '52px', borderRadius: '14px', border: 'none', cursor: canAdd ? 'pointer' : 'default',
                  background: canAdd ? (type === 'workout' ? '#ff9500' : '#007aff') : '#e5e5ea',
                  color: canAdd ? '#fff' : '#c6c6c8',
                  fontSize: '16px', fontWeight: '700', transition: 'all 0.15s',
                }}
              >태스크 추가</button>
            </>}
          </div>

          {/* 운동 태스크 목록 */}
          {workoutTasks.length > 0 && (
            <>
              <SectionHeader>운동 태스크</SectionHeader>
              <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden' }}>
                {workoutTasks.map((task, i) => {
                  const isReps    = task.goalMode === 'reps'
                  const unitValue = isReps ? task.reps : task.seconds
                  const unitLabel = isReps ? '회' : '초'
                  return (
                    <div key={task.id} onClick={() => openDetail(task)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '10px', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none', cursor: 'pointer' }}>
                      <span style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: '#000' }}>{task.text}</span>
                      <span style={{ fontSize: '14px', color: '#8e8e93' }}>{task.sets}세트 · {unitValue}{unitLabel}</span>
                      <span style={{ color: '#c6c6c8', fontSize: '16px', flexShrink: 0 }}>›</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* 일반 태스크 목록 */}
          {generalTasks.length > 0 && (
            <>
              <SectionHeader>일반 태스크</SectionHeader>
              <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden' }}>
                {generalTasks.map((task, i) => (
                  <div key={task.id} onClick={() => openDetail(task)} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: '10px', borderTop: i > 0 ? '0.5px solid #f2f2f7' : 'none', cursor: 'pointer' }}>
                    <span style={{ flex: 1, fontSize: '15px', color: '#000' }}>{task.text}</span>
                    {task.desc && <span style={{ fontSize: '14px', color: '#8e8e93', flexShrink: 0 }}>{task.desc.length > 10 ? task.desc.slice(0, 10) + '…' : task.desc}</span>}
                    <span style={{ color: '#c6c6c8', fontSize: '16px', flexShrink: 0 }}>›</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {workoutTasks.length === 0 && generalTasks.length === 0 && (
            <div style={{ textAlign: 'center', color: '#c6c6c8', fontSize: '14px', marginTop: '24px' }}>
              오늘 등록된 태스크가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* ── 디테일 페이지 ── */}
      {detailTask && (
        <div
          ref={detailPanelRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            position: 'absolute', inset: 0,
            background: '#f2f2f7',
            transform: detailTransform,
            transition: detailTransition,
            display: 'flex', flexDirection: 'column',
            zIndex: 10,
            touchAction: 'pan-y',
          }}
        >
          {/* 네비게이션 바 */}
          <div style={{ height: '52px', flexShrink: 0, background: 'rgba(242,242,247,0.96)', borderBottom: '0.5px solid #c6c6c8', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
            <button
              onClick={closeDetail}
              style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'none', border: 'none', color: '#007aff', fontSize: '16px', cursor: 'pointer', padding: '8px 10px' }}
            >
              <span style={{ fontSize: '22px', lineHeight: 1, marginTop: '-1px' }}>‹</span> 루틴
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: '600', color: '#000' }}>
              {detailTask.text}
            </span>
            <button
              onClick={saveDetail}
              style={{ background: 'none', border: 'none', color: '#007aff', fontSize: '16px', fontWeight: '600', cursor: 'pointer', padding: '8px 12px' }}
            >완료</button>
          </div>

          {/* 컨텐츠 */}
          <div style={{ flex: 1, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {detailTask.taskType === 'workout' ? (
              <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  {detailTask.goalMode === 'reps' ? '세트 × 횟수' : '세트 × 시간'}
                </div>
                <div style={{ display: 'flex', gap: '28px' }}>
                  <Stepper label="세트" value={dSets} onChange={setDSets} color="#ff9500" />
                  {detailTask.goalMode === 'reps'
                    ? <Stepper label="횟수" value={dReps} onChange={setDReps} color="#ff9500" />
                    : <Stepper label="초"   value={dSeconds} onChange={setDSeconds} color="#ff9500" />
                  }
                </div>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#8e8e93', padding: '12px 16px 4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>설명</div>
                <textarea
                  value={dDesc}
                  onChange={e => setDDesc(e.target.value)}
                  placeholder="설명을 입력하세요"
                  rows={4}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '6px 16px 16px', fontSize: '15px', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontFamily: 'inherit', color: '#3c3c43', lineHeight: '1.6' }}
                />
              </div>
            )}

            <button
              onClick={() => confirm(`"${detailTask.text}" 태스크를 삭제할까요?`, () => { deleteTodo(detailTask.id); closeDetail() })}
              style={{ width: '100%', height: '50px', border: 'none', borderRadius: '14px', background: '#fff', color: '#ff3b30', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}
            >태스크 삭제</button>

          </div>
        </div>
      )}
    </div>
  )
}
