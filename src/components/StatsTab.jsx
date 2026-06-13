import { useState, useRef, useEffect } from 'react'
import { MONTHS, DAYS } from '../constants.js'
import { sectionLabel, rateColor } from '../styles.js'
import { NavCard, NavBtn, EmptyCard, StatCard } from './ui.jsx'

// iOS push 네비게이션 슬라이드 패널
function useSlidePanel() {
  const [isOpen,   setIsOpen]   = useState(false)
  const [entered,  setEntered]  = useState(false)
  const [leaving,  setLeaving]  = useState(false)
  function open() {
    setIsOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
  }
  function close() {
    setLeaving(true)
    setTimeout(() => { setIsOpen(false); setEntered(false); setLeaving(false) }, 280)
  }
  const tx = !entered ? '100%' : leaving ? '100%' : '0%'
  return { isOpen, open, close, tx }
}

export default function StatsTab({
  workoutSessions,
  todoGroups,
  rate,
}) {
  const [viewWeekOffset, setViewWeekOffset] = useState(0)
  const [expandedItem,   setExpandedItem]   = useState(null)  // 상세 패널 내 히스토리 열린 항목
  const [detailInfo,     setDetailInfo]     = useState(null)  // { type:'task'|'workout', period:'week'|'month' }
  const detail = useSlidePanel()

  // 패널 스와이프-오른쪽 닫기
  const panelTx = useRef(null)
  const panelTy = useRef(null)
  function onPanelTouchStart(e) {
    e.stopPropagation()
    panelTx.current = e.touches[0].clientX
    panelTy.current = e.touches[0].clientY
  }
  function onPanelTouchEnd(e) {
    e.stopPropagation()
    if (panelTx.current === null) return
    const dx = e.changedTouches[0].clientX - panelTx.current
    const dy = e.changedTouches[0].clientY - panelTy.current
    panelTx.current = null
    if (dx > 60 && Math.abs(dy) < Math.abs(dx)) closeDetail()
  }

  // ── 좌우 스와이프로 주차 이동 ─────────────────────────────
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
    setViewWeekOffset(v => v + (dx > 0 ? -1 : 1))
  }

  function openDetail(type, period) {
    setDetailInfo({ type, period })
    setExpandedItem(null)
    detail.open()
  }
  function closeDetail() {
    detail.close()
    setTimeout(() => setDetailInfo(null), 300)
  }

  // 패널이 닫힐 때 expandedItem 초기화
  useEffect(() => { if (!detail.isOpen) setExpandedItem(null) }, [detail.isOpen])

  // ── 주 범위 (offset 기반) ─────────────────────────────────────
  const todayDate    = new Date()
  const todayDay     = todayDate.getDay()
  const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDate)
    d.setDate(todayDate.getDate() + mondayOffset + i + viewWeekOffset * 7)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  })
  const weekStart = weekDates[0]
  const weekEnd   = weekDates[6]
  const [,wsMm, wsDd] = weekStart.split('-')
  const [,weMm, weDd] = weekEnd.split('-')
  const weekLabel = `${+wsMm}/${+wsDd}(${DAYS[new Date(weekStart+'T12:00:00').getDay()]}) ~ ${+weMm}/${+weDd}(${DAYS[new Date(weekEnd+'T12:00:00').getDay()]})`

  // ── 월은 주의 월요일 기준으로 파생 ──────────────────────────
  const viewMonday = new Date(weekStart + 'T00:00:00')
  const viewYear   = viewMonday.getFullYear()
  const viewMonth  = viewMonday.getMonth()
  const nowRef     = new Date()
  const isCurrentWeek  = viewWeekOffset === 0
  const isCurrentMonth = viewYear === nowRef.getFullYear() && viewMonth === nowRef.getMonth()

  // ── 주간 태스크 ───────────────────────────────────────────────
  const tgWeek      = (todoGroups||[]).filter(g => weekDates.includes(g.date))
  const tgWeekTotal = tgWeek.reduce((s,g) => s + g.items.reduce((a,item) => a + item.count, 0), 0)
  const tgWeekDone  = tgWeek.reduce((s,g) => s + g.items.reduce((a,item) => a + item.completedCounts.filter(Boolean).length, 0), 0)
  const totalWeekTasks = tgWeekTotal
  const doneWeekTasks  = tgWeekDone

  const todoWeekStatMap = {}
  const ensureW = t => { if (!todoWeekStatMap[t]) todoWeekStatMap[t] = { text:t, total:0, done:0, history:[] } }
  tgWeek.forEach(g => g.items.forEach(item => {
    ensureW(item.text)
    todoWeekStatMap[item.text].total += item.count
    todoWeekStatMap[item.text].done  += item.completedCounts.filter(Boolean).length
    todoWeekStatMap[item.text].history.push({ date:g.date, done:item.completedCounts.filter(Boolean).length, total:item.count })
  }))
  const todoWeekStatList = Object.values(todoWeekStatMap).sort((a,b)=>b.total-a.total)

  // ── 주간 운동 ─────────────────────────────────────────────────
  const sessionsWeek = (workoutSessions||[]).filter(s => weekDates.includes(s.date))
  const workoutDaysWeek = new Set(sessionsWeek.map(s => s.date)).size
  const allSetsWeek  = sessionsWeek.flatMap(s => s.exercises.flatMap(e => e.completedSets))
  const doneSetsWeek = allSetsWeek.filter(Boolean)
  const exWeekMap = {}
  sessionsWeek.forEach(s => s.exercises.forEach(e => {
    if (!exWeekMap[e.name]) exWeekMap[e.name] = { name:e.name, totalSets:0, doneSets:0, count:0, totalReps:0, unit:e.unit }
    exWeekMap[e.name].totalSets += e.sets
    exWeekMap[e.name].doneSets  += e.completedSets.filter(Boolean).length
    exWeekMap[e.name].count++
    exWeekMap[e.name].totalReps += e.completedSets.filter(v=>v!==false).reduce((a,v)=>a+v,0)
  }))
  const exWeekList = Object.values(exWeekMap)

  // ── 월 필터 ────────────────────────────────────────────────────
  const monthStr = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}`
  const tgVM     = (todoGroups||[]).filter(g => g.date.startsWith(monthStr))
  const tgTotal    = tgVM.reduce((s,g)=>s+g.items.reduce((a,item)=>a+item.count,0),0)
  const tgDone     = tgVM.reduce((s,g)=>s+g.items.reduce((a,item)=>a+item.completedCounts.filter(Boolean).length,0),0)
  const totalTasks = tgTotal
  const doneTasks  = tgDone

  // ── 월간 태스크 ───────────────────────────────────────────────
  const todoStatMap = {}
  const ensureM = t => { if (!todoStatMap[t]) todoStatMap[t] = { text:t, total:0, done:0, history:[] } }
  tgVM.forEach(g => g.items.forEach(item => {
    ensureM(item.text)
    todoStatMap[item.text].total += item.count
    todoStatMap[item.text].done  += item.completedCounts.filter(Boolean).length
    todoStatMap[item.text].history.push({ date:g.date, done:item.completedCounts.filter(Boolean).length, total:item.count })
  }))
  const todoStatList = Object.values(todoStatMap).sort((a,b)=>b.total-a.total)

  // ── 월간 운동 ─────────────────────────────────────────────────
  const sessionsVM = (workoutSessions||[]).filter(s => { const d=new Date(s.date); return d.getFullYear()===viewYear&&d.getMonth()===viewMonth })
  const workoutDaysVM = new Set(sessionsVM.map(s => s.date)).size
  const allSetsVM  = sessionsVM.flatMap(s=>s.exercises.flatMap(e=>e.completedSets))
  const doneSetsVM = allSetsVM.filter(Boolean)
  const exMap = {}
  sessionsVM.forEach(s => s.exercises.forEach(e => {
    if (!exMap[e.name]) exMap[e.name] = { name:e.name, totalSets:0, doneSets:0, count:0, totalReps:0, unit:e.unit }
    exMap[e.name].totalSets += e.sets
    exMap[e.name].doneSets  += e.completedSets.filter(Boolean).length
    exMap[e.name].count++
    exMap[e.name].totalReps += e.completedSets.filter(v=>v!==false).reduce((a,v)=>a+v,0)
  }))
  const exList = Object.values(exMap)

  // ── 상세 패널 데이터 결정 ────────────────────────────────────
  const panelTitle = detailInfo
    ? detailInfo.period === 'week'
      ? detailInfo.type === 'task' ? '📋 태스크 주간 상세' : '🏋️ 운동 주간 상세'
      : detailInfo.type === 'task' ? '📋 태스크 월간 상세' : '🏋️ 운동 월간 상세'
    : ''
  const panelSubtitle = detailInfo
    ? detailInfo.period === 'week' ? weekLabel : `${viewYear}년 ${MONTHS[viewMonth]}${isCurrentMonth?' · 이번 달':''}`
    : ''
  const panelIsTodo    = detailInfo?.type === 'task'
  const panelList      = detailInfo ? (detailInfo.type === 'task' ? (detailInfo.period === 'week' ? todoWeekStatList : todoStatList) : (detailInfo.period === 'week' ? exWeekList : exList)) : []

  // 히스토리 칩 렌더
  function renderChips(history) {
    return [...history].sort((a,b)=>b.date.localeCompare(a.date)).map((h, j) => {
      const ok      = h.done === h.total
      const partial = h.done > 0 && h.done < h.total
      const color   = ok ? '#34c759' : partial ? '#ff9500' : '#c6c6c8'
      const [,mm,dd] = h.date.split('-')
      const dayStr  = DAYS[new Date(h.date+'T12:00:00').getDay()]
      const label   = h.total === 1 ? `${+mm}/${+dd}(${dayStr})` : `${+mm}/${+dd}(${dayStr}) ${h.done}/${h.total}`
      return <span key={j} style={{ fontSize:'11px', padding:'3px 8px', borderRadius:'7px', border:`1px solid ${color}`, color, background:`${color}1a`, fontWeight:'500' }}>{label}</span>
    })
  }

  return (
    <div
      onTouchStart={onSwipeStart}
      onTouchMove={onSwipeMove}
      onTouchEnd={onSwipeEnd}
      style={{ flex:1, minHeight:0, position:'relative', overflow:'hidden' }}
    >

      {/* ── 메인 스크롤 뷰 ── */}
      <div style={{ position:'absolute', inset:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', padding:'0 16px 16px' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

          {/* 주 네비게이터 */}
          <NavCard>
            <NavBtn onClick={() => setViewWeekOffset(v => v - 1)}>‹</NavBtn>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'14px', fontWeight:'700' }}>{weekLabel}</div>
              {isCurrentWeek && <div style={{ fontSize:'11px', color:'#007aff', marginTop:'2px' }}>이번 주</div>}
            </div>
            <NavBtn onClick={() => setViewWeekOffset(v => v + 1)}>›</NavBtn>
          </NavCard>

          {/* 주간 통계 */}
          <div>
            <div style={{ ...sectionLabel, fontSize:'17px', fontWeight:'700', color:'#000' }}>주간 통계</div>
            <div style={{ background:'#fff', borderRadius:'12px', overflow:'hidden' }}>
              <div onClick={() => openDetail('task','week')}
                style={{ padding:'14px 16px', cursor:'pointer', userSelect:'none', WebkitTapHighlightColor:'transparent' }}>
                <div style={{ fontSize:'13px', color:'#8e8e93', fontWeight:'600', marginBottom:'10px' }}>📋 태스크</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <StatCard label="추가"   value={totalWeekTasks}                           color="#007aff"/>
                  <StatCard label="완료"   value={doneWeekTasks}                            color="#34c759"/>
                  <StatCard label="달성률" value={`${rate(doneWeekTasks,totalWeekTasks)}%`} color={rateColor(doneWeekTasks,totalWeekTasks)}/>
                </div>
              </div>
              <div style={{ height:'0.5px', background:'#e5e5ea', margin:'0 16px' }}/>
              <div onClick={() => openDetail('workout','week')}
                style={{ padding:'14px 16px', cursor:'pointer', userSelect:'none', WebkitTapHighlightColor:'transparent' }}>
                <div style={{ fontSize:'13px', color:'#8e8e93', fontWeight:'600', marginBottom:'10px' }}>🏋️ 운동</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <StatCard label="운동일"   value={workoutDaysWeek}  color="#007aff"/>
                  <StatCard label="완료세트" value={doneSetsWeek.length}  color="#34c759"/>
                  <StatCard label="달성률"   value={`${rate(doneSetsWeek.length,allSetsWeek.length)}%`} color={rateColor(doneSetsWeek.length,allSetsWeek.length)}/>
                </div>
              </div>
            </div>
          </div>

          {/* 월간 통계 */}
          <div>
            <div style={{ ...sectionLabel, fontSize:'17px', fontWeight:'700', color:'#000' }}>
              월간 통계
              <span style={{ fontSize:'13px', fontWeight:'500', color:'#8e8e93', marginLeft:'6px' }}>
                ({viewYear}년 {MONTHS[viewMonth]}{isCurrentMonth?' · 이번 달':''})
              </span>
            </div>
            <div style={{ background:'#fff', borderRadius:'12px', overflow:'hidden' }}>
              <div onClick={() => openDetail('task','month')}
                style={{ padding:'14px 16px', cursor:'pointer', userSelect:'none', WebkitTapHighlightColor:'transparent' }}>
                <div style={{ fontSize:'13px', color:'#8e8e93', fontWeight:'600', marginBottom:'10px' }}>📋 태스크</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <StatCard label="추가"   value={totalTasks}                       color="#007aff"/>
                  <StatCard label="완료"   value={doneTasks}                        color="#34c759"/>
                  <StatCard label="달성률" value={`${rate(doneTasks,totalTasks)}%`} color={rateColor(doneTasks,totalTasks)}/>
                </div>
              </div>
              <div style={{ height:'0.5px', background:'#e5e5ea', margin:'0 16px' }}/>
              <div onClick={() => openDetail('workout','month')}
                style={{ padding:'14px 16px', cursor:'pointer', userSelect:'none', WebkitTapHighlightColor:'transparent' }}>
                <div style={{ fontSize:'13px', color:'#8e8e93', fontWeight:'600', marginBottom:'10px' }}>🏋️ 운동</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <StatCard label="운동일"   value={workoutDaysVM}  color="#007aff"/>
                  <StatCard label="완료세트" value={doneSetsVM.length}  color="#34c759"/>
                  <StatCard label="달성률"   value={`${rate(doneSetsVM.length,allSetsVM.length)}%`} color={rateColor(doneSetsVM.length,allSetsVM.length)}/>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 상세 슬라이드 패널 ── */}
      {detail.isOpen && (
        <div
          onTouchStart={onPanelTouchStart}
          onTouchEnd={onPanelTouchEnd}
          style={{
            position:'absolute', inset:0, background:'#f2f2f7',
            transform:`translateX(${detail.tx})`,
            transition: detail.tx === '0%' ? 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)' : detail.tx === '100%' && detail.isOpen ? 'transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
            display:'flex', flexDirection:'column',
          }}
        >
          {/* 패널 헤더 */}
          <div style={{ display:'flex', alignItems:'center', padding:'12px 16px 8px', gap:'8px', flexShrink:0 }}>
            <button onClick={closeDetail} style={{ background:'none', border:'none', color:'#007aff', fontSize:'17px', cursor:'pointer', padding:'4px 0', display:'flex', alignItems:'center', gap:'4px' }}>
              <span style={{ fontSize:'20px', lineHeight:1 }}>‹</span> 뒤로
            </button>
          </div>
          <div style={{ padding:'0 16px 8px', flexShrink:0 }}>
            <div style={{ fontSize:'20px', fontWeight:'700' }}>{panelTitle}</div>
            <div style={{ fontSize:'13px', color:'#8e8e93', marginTop:'3px' }}>{panelSubtitle}</div>
          </div>

          {/* 패널 콘텐츠 */}
          <div style={{ flex:1, minHeight:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', padding:'0 16px 24px' }}>
            {panelList.length === 0
              ? <EmptyCard>데이터가 없습니다</EmptyCard>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {panelIsTodo
                    ? panelList.map((item, i) => {
                        const isExp = expandedItem === item.text
                        return (
                          <div key={i} onClick={() => setExpandedItem(isExp ? null : item.text)}
                            style={{ background:'#fff', borderRadius:'12px', padding:'14px', cursor:'pointer', userSelect:'none' }}>
                            <div style={{ display:'flex', alignItems:'center', marginBottom:'8px' }}>
                              <span style={{ flex:1, fontSize:'15px', fontWeight:'700' }}>{item.text}</span>
                              <span style={{ fontSize:'17px', fontWeight:'800', color:rateColor(item.done,item.total) }}>{rate(item.done,item.total)}%</span>
                            </div>
                            <div style={{ height:'3px', background:'#e5e5ea', borderRadius:'2px', marginBottom:'8px' }}>
                              <div style={{ height:'3px', background:rateColor(item.done,item.total), width:`${rate(item.done,item.total)}%`, borderRadius:'2px' }}/>
                            </div>
                            <div style={{ display:'flex', gap:'12px', fontSize:'12px', color:'#8e8e93' }}>
                              <span>총 <b style={{color:'#007aff'}}>{item.total}</b>회</span>
                              <span>완료 <b style={{color:'#34c759'}}>{item.done}</b>회</span>
                            </div>
                            {isExp && (
                              <div style={{ marginTop:'10px', paddingTop:'10px', borderTop:'0.5px solid #f2f2f7', display:'flex', gap:'5px', flexWrap:'wrap' }}>
                                {renderChips(item.history)}
                              </div>
                            )}
                          </div>
                        )
                      })
                    : panelList.map((ex, i) => (
                        <div key={i} style={{ background:'#fff', borderRadius:'12px', padding:'14px' }}>
                          <div style={{ display:'flex', alignItems:'center', marginBottom:'8px' }}>
                            <span style={{ flex:1, fontSize:'15px', fontWeight:'700' }}>{ex.name}</span>
                            <span style={{ fontSize:'17px', fontWeight:'800', color:rateColor(ex.doneSets,ex.totalSets) }}>{rate(ex.doneSets,ex.totalSets)}%</span>
                          </div>
                          <div style={{ height:'3px', background:'#e5e5ea', borderRadius:'2px', marginBottom:'8px' }}>
                            <div style={{ height:'3px', background:rateColor(ex.doneSets,ex.totalSets), width:`${rate(ex.doneSets,ex.totalSets)}%`, borderRadius:'2px' }}/>
                          </div>
                          <div style={{ display:'flex', gap:'12px', fontSize:'12px', color:'#8e8e93' }}>
                            <span>{ex.count}회 수행</span>
                            <span>세트 <b style={{color:'#34c759'}}>{ex.doneSets}</b>/{ex.totalSets}</span>
                            {ex.totalReps > 0 && <span>총 <b style={{color:'#007aff'}}>{ex.totalReps}</b>{ex.unit}</span>}
                          </div>
                        </div>
                      ))
                  }
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  )
}
