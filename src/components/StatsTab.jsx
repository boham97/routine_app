import { useState } from 'react'
import { MONTHS, dateKey } from '../constants.js'
import { sectionLabel } from '../styles.js'
import { NavCard, NavBtn, EmptyCard, StatCard } from './ui.jsx'

export default function StatsTab({
  statsSearch, setStatsSearch,
  todos, workoutSessions,
  planTasks, todoGroups,
  viewYear, setViewYear, viewMonth, setViewMonth,
  thisYear, isCurrentMonth, prevMonth, nextMonth,
  todosVM, todosVY, sessionsVM, allSetsVM, doneSetsVM,
  monthlyData, maxTodo, maxSets,
  rate,
}) {
  const [showExDetail,   setShowExDetail]   = useState(false)
  const [showTodoDetail, setShowTodoDetail] = useState(false)

  // ── 월 필터링 공통 계산 ────────────────────────────────────
  const monthStr  = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}`
  const ptVM      = (planTasks||[]).filter(t => t.date.startsWith(monthStr))
  const tgVM      = (todoGroups||[]).filter(g => g.date.startsWith(monthStr))
  const generalVM = todosVM.filter(t => t.taskType !== 'workout')

  const tgTotal = tgVM.reduce((sum,g) => sum + g.items.reduce((a,item) => a + item.count, 0), 0)
  const tgDone  = tgVM.reduce((sum,g) => sum + g.items.reduce((a,item) => a + item.completedCounts.filter(Boolean).length, 0), 0)
  const totalTasks = generalVM.length + ptVM.length + tgTotal
  const doneTasks  = generalVM.filter(t=>t.completed).length + ptVM.filter(t=>t.completed).length + tgDone

  // ── 일반 태스크별 달성률 맵 ────────────────────────────────
  const todoStatMap = {}
  generalVM.forEach(t => {
    if (!todoStatMap[t.text]) todoStatMap[t.text] = { text: t.text, total: 0, done: 0 }
    todoStatMap[t.text].total += 1
    if (t.completed) todoStatMap[t.text].done += 1
  })
  ptVM.forEach(t => {
    if (!todoStatMap[t.text]) todoStatMap[t.text] = { text: t.text, total: 0, done: 0 }
    todoStatMap[t.text].total += 1
    if (t.completed) todoStatMap[t.text].done += 1
  })
  tgVM.forEach(g => g.items.forEach(item => {
    if (!todoStatMap[item.text]) todoStatMap[item.text] = { text: item.text, total: 0, done: 0 }
    todoStatMap[item.text].total += item.count
    todoStatMap[item.text].done  += item.completedCounts.filter(Boolean).length
  }))
  const todoStatList = Object.values(todoStatMap).sort((a,b) => b.total - a.total)

  // ── 종목별 달성률 맵 ───────────────────────────────────────
  const exMap = {}
  sessionsVM.forEach(s => s.exercises.forEach(e => {
    if (!exMap[e.name]) exMap[e.name] = { name: e.name, color: s.color, totalSets: 0, doneSets: 0, count: 0 }
    exMap[e.name].totalSets += e.sets
    exMap[e.name].doneSets  += e.completedSets.filter(Boolean).length
    exMap[e.name].count++
  }))
  const exList = Object.values(exMap)

  // ── 연간 공통 계산 ─────────────────────────────────────────
  const yearStr   = `${viewYear}-`
  const ptVY      = (planTasks||[]).filter(t => t.date.startsWith(yearStr))
  const tgVY      = (todoGroups||[]).filter(g => g.date.startsWith(yearStr))
  const generalVY = todosVY.filter(t => t.taskType !== 'workout')
  const tgTotalY  = tgVY.reduce((sum,g) => sum + g.items.reduce((a,item) => a + item.count, 0), 0)
  const tgDoneY   = tgVY.reduce((sum,g) => sum + g.items.reduce((a,item) => a + item.completedCounts.filter(Boolean).length, 0), 0)
  const totalY    = generalVY.length + ptVY.length + tgTotalY
  const doneY     = generalVY.filter(t=>t.completed).length + ptVY.filter(t=>t.completed).length + tgDoneY
  const workoutDaysY = new Set(workoutSessions.filter(s=>s.date.startsWith(yearStr)).map(s=>s.date)).size

  return (
    <div style={{ flex:1, minHeight:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', padding:'0 16px 16px' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

        {/* 검색창 */}
        <div style={{ display:'flex', alignItems:'center', background:'#fff', borderRadius:'12px', padding:'8px 12px', gap:'8px' }}>
          <span style={{ fontSize:'16px' }}>🔍</span>
          <input value={statsSearch} onChange={e=>setStatsSearch(e.target.value)} placeholder="운동/태스크 검색..." style={{ flex:1, border:'none', background:'transparent', fontSize:'15px', outline:'none' }} />
          {statsSearch && <button onClick={()=>setStatsSearch('')} style={{ background:'none', border:'none', color:'#8e8e93', fontSize:'16px', cursor:'pointer' }}>✕</button>}
        </div>

        {/* 검색 결과 */}
        {statsSearch.trim() && (() => {
          const q = statsSearch.trim().toLowerCase()
          const todoMap = {}
          todos.filter(t=>t.text.toLowerCase().includes(q)).forEach(t => {
            if (!todoMap[t.text]) todoMap[t.text]={text:t.text,type:'todo',total:0,done:0,dates:[]}
            todoMap[t.text].total++
            if (t.completed) todoMap[t.text].done++
            todoMap[t.text].dates.push({date:dateKey(t.createdAt),completed:t.completed})
          })
          const exSearchMap = {}
          workoutSessions.forEach(s => s.exercises.forEach(e => {
            if (!e.name.toLowerCase().includes(q)) return
            if (!exSearchMap[e.name]) exSearchMap[e.name]={text:e.name,type:'workout',totalSets:0,doneSets:0,sessions:0,dates:[]}
            exSearchMap[e.name].totalSets += e.sets
            exSearchMap[e.name].doneSets  += e.completedSets.filter(Boolean).length
            exSearchMap[e.name].sessions++
            exSearchMap[e.name].dates.push({date:s.date,doneSets:e.completedSets.filter(Boolean).length,totalSets:e.sets})
          }))
          const results = [...Object.values(todoMap), ...Object.values(exSearchMap)]
          if (results.length === 0) return <EmptyCard>검색 결과가 없습니다</EmptyCard>
          return (
            <div>
              <div style={sectionLabel}>"{statsSearch}" 검색 결과</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {results.map((r, i) => {
                  const isTodo = r.type==='todo'
                  const color  = isTodo?'#007aff':'#ff9500'
                  const done   = isTodo?r.done:r.doneSets
                  const total  = isTodo?r.total:r.totalSets
                  const recent = [...r.dates].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)
                  return (
                    <div key={i} style={{ background:'#fff', borderRadius:'12px', padding:'14px', borderLeft:`4px solid ${color}` }}>
                      <div style={{ display:'flex', alignItems:'flex-start', marginBottom:'8px' }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'14px', fontWeight:'700' }}>{r.text}</div>
                          <div style={{ fontSize:'11px', color, marginTop:'2px' }}>{isTodo?'태스크':'운동'}</div>
                        </div>
                        <span style={{ fontSize:'16px', fontWeight:'800', color }}>{rate(done,total)}%</span>
                      </div>
                      <div style={{ height:'3px', background:'#e5e5ea', borderRadius:'2px', marginBottom:'8px' }}>
                        <div style={{ height:'3px', background:color, width:`${rate(done,total)}%`, borderRadius:'2px' }}/>
                      </div>
                      <div style={{ display:'flex', gap:'12px', fontSize:'12px', color:'#8e8e93' }}>
                        {isTodo ? <>
                          <span>총 <b style={{color:'#007aff'}}>{r.total}</b>회</span>
                          <span>완료 <b style={{color:'#34c759'}}>{r.done}</b></span>
                        </> : <>
                          <span><b style={{color:'#ff9500'}}>{r.sessions}</b>회 수행</span>
                          <span>세트 <b style={{color:'#34c759'}}>{r.doneSets}</b>/{r.totalSets}</span>
                        </>}
                      </div>
                      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginTop:'8px' }}>
                        {recent.map((d,j) => {
                          const ok = isTodo?d.completed:d.doneSets===d.totalSets
                          return <span key={j} style={{ fontSize:'10px', padding:'2px 6px', borderRadius:'6px', border:`1px solid ${ok?'#34c759':'#ff3b30'}`, color:ok?'#34c759':'#ff3b30', background:ok?'#34c75918':'#ff3b3018' }}>{d.date}</span>
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* 월 네비게이터 */}
        <NavCard>
          <NavBtn onClick={prevMonth}>‹</NavBtn>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:'17px', fontWeight:'700' }}>{viewYear}년 {MONTHS[viewMonth]}</div>
            {isCurrentMonth && <div style={{ fontSize:'11px', color:'#007aff', marginTop:'2px' }}>이번 달</div>}
          </div>
          <NavBtn onClick={nextMonth} disabled={isCurrentMonth}>›</NavBtn>
        </NavCard>

        {/* 태스크 월간 통계 */}
        <div>
          <div
            onClick={() => todoStatList.length > 0 && setShowTodoDetail(v => !v)}
            style={{ ...sectionLabel, color: showTodoDetail ? '#8e8e93' : '#000', cursor: todoStatList.length > 0 ? 'pointer' : 'default', userSelect: 'none', transition: 'color 0.15s' }}
          >📋 태스크 월간 통계</div>
          <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', display:'flex', gap:'8px' }}>
            <StatCard label="추가"   value={totalTasks}                       color="#007aff"/>
            <StatCard label="완료"   value={doneTasks}                        color="#34c759"/>
            <StatCard label="달성률" value={`${rate(doneTasks,totalTasks)}%`} color="#ff9500"/>
          </div>
          {showTodoDetail && (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginTop:'8px' }}>
              {todoStatList.map((item, i) => (
                <div key={i} style={{ background:'#fff', borderRadius:'12px', padding:'14px', borderLeft:'4px solid #007aff' }}>
                  <div style={{ display:'flex', alignItems:'center', marginBottom:'8px' }}>
                    <span style={{ flex:1, fontSize:'14px', fontWeight:'700' }}>{item.text}</span>
                    <span style={{ fontSize:'16px', fontWeight:'800', color:'#007aff' }}>{rate(item.done, item.total)}%</span>
                  </div>
                  <div style={{ height:'3px', background:'#e5e5ea', borderRadius:'2px', marginBottom:'8px' }}>
                    <div style={{ height:'3px', background:'#007aff', width:`${rate(item.done,item.total)}%`, borderRadius:'2px' }}/>
                  </div>
                  <div style={{ display:'flex', gap:'12px', fontSize:'12px', color:'#8e8e93' }}>
                    <span>총 <b style={{color:'#007aff'}}>{item.total}</b>회</span>
                    <span>완료 <b style={{color:'#34c759'}}>{item.done}</b>회</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 운동 월간 통계 */}
        <div>
          <div
            onClick={() => exList.length > 0 && setShowExDetail(v => !v)}
            style={{ ...sectionLabel, color: showExDetail ? '#8e8e93' : '#000', cursor: exList.length > 0 ? 'pointer' : 'default', userSelect: 'none', transition: 'color 0.15s' }}
          >🏋️ 운동 월간 통계</div>
          <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', display:'flex', gap:'8px' }}>
            <StatCard label="운동일"   value={sessionsVM.length}  color="#ff9500"/>
            <StatCard label="완료세트" value={doneSetsVM.length}  color="#34c759"/>
            <StatCard label="달성률"   value={`${rate(doneSetsVM.length,allSetsVM.length)}%`} color="#007aff"/>
          </div>
          {showExDetail && (
            <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginTop:'8px' }}>
              {exList.map((ex, i) => (
                <div key={i} style={{ background:'#fff', borderRadius:'12px', padding:'14px', borderLeft:`4px solid ${ex.color}` }}>
                  <div style={{ display:'flex', alignItems:'center', marginBottom:'8px' }}>
                    <span style={{ flex:1, fontSize:'14px', fontWeight:'700' }}>{ex.name}</span>
                    <span style={{ fontSize:'16px', fontWeight:'800', color:ex.color }}>{rate(ex.doneSets,ex.totalSets)}%</span>
                  </div>
                  <div style={{ height:'3px', background:'#e5e5ea', borderRadius:'2px', marginBottom:'8px' }}>
                    <div style={{ height:'3px', background:ex.color, width:`${rate(ex.doneSets,ex.totalSets)}%`, borderRadius:'2px' }}/>
                  </div>
                  <div style={{ display:'flex', gap:'12px', fontSize:'12px', color:'#8e8e93' }}>
                    <span>{ex.count}회 수행</span>
                    <span>세트 <b style={{color:'#34c759'}}>{ex.doneSets}</b>/{ex.totalSets}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 연간 통계 */}
        <div>
          <div style={{ ...sectionLabel, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>연간 통계 ({viewYear}년)</span>
            <div style={{ display:'flex', gap:'4px' }}>
              <NavBtn small onClick={()=>setViewYear(y=>y-1)}>‹</NavBtn>
              <NavBtn small onClick={()=>setViewYear(y=>y+1)} disabled={viewYear>=thisYear}>›</NavBtn>
            </div>
          </div>
          <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', display:'flex', gap:'8px' }}>
            <StatCard label="태스크추가" value={totalY}        color="#007aff"/>
            <StatCard label="태스크완료" value={doneY}         color="#34c759"/>
            <StatCard label="운동일수"   value={workoutDaysY}  color="#ff9500"/>
          </div>
        </div>

        {/* 월별 막대 그래프 */}
        <div>
          <div style={sectionLabel}>월별 현황 ({viewYear}년)</div>
          <div style={{ background:'#fff', borderRadius:'12px', padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'flex-end', height:'80px', gap:'3px' }}>
              {monthlyData.map((m, i) => {
                const tH  = Math.max((m.todoAdded/maxTodo)*60, m.todoAdded>0?4:0)
                const tdH = m.todoDone>0?(m.todoDone/m.todoAdded)*tH:0
                const wH  = Math.max((m.totalSets/maxSets)*60, m.totalSets>0?4:0)
                const wdH = m.doneSets>0?(m.doneSets/m.totalSets)*wH:0
                return (
                  <div key={i} onClick={()=>setViewMonth(i)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', cursor:'pointer' }}>
                    <div style={{ width:'100%', height:'60px', display:'flex', alignItems:'flex-end', justifyContent:'center', gap:'2px' }}>
                      {m.todoAdded>0&&<div style={{ flex:1, height:`${tH}px`, background:i===viewMonth?'#a0c4ff':'#d1e4ff', borderRadius:'3px 3px 0 0', position:'relative' }}>
                        {m.todoDone>0&&<div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${tdH}px`, background:'#34c759', borderRadius:'3px 3px 0 0' }}/>}
                      </div>}
                      {m.totalSets>0&&<div style={{ flex:1, height:`${wH}px`, background:i===viewMonth?'#ffd080':'#ffe5b4', borderRadius:'3px 3px 0 0', position:'relative' }}>
                        {m.doneSets>0&&<div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${wdH}px`, background:'#ff9500', borderRadius:'3px 3px 0 0' }}/>}
                      </div>}
                    </div>
                    <span style={{ fontSize:'9px', color:i===viewMonth?'#007aff':'#8e8e93', fontWeight:i===viewMonth?'700':'400', marginTop:'3px' }}>{i+1}월</span>
                  </div>
                )
              })}
            </div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'center', marginTop:'12px', flexWrap:'wrap' }}>
              {[['#d1e4ff','태스크'],['#34c759','태스크완료'],['#ffe5b4','운동세트'],['#ff9500','운동완료']].map(([c,l])=>(
                <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                  <div style={{ width:'10px', height:'10px', background:c, borderRadius:'2px' }}/>
                  <span style={{ fontSize:'11px', color:'#8e8e93' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
