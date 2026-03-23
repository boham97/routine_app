import { MONTHS, DAYS, addDays } from '../constants.js'
import { card, row, circle, delBtn, inputStyle, confirmBtn } from '../styles.js'
import { NavCard, NavBtn, EmptyCard, AddRowBtn } from './ui.jsx'

export default function TodoTab({
  selectedDate, setSelectedDate,
  labelForDate,
  sessionsForDay, expandedSession, setExpandedSession, toggleSet, exTimer,
  groupsForDay, expandedTodoGroup, setExpandedTodoGroup, toggleGroupItemCount, removeTodoGroup,
  todosForDay, toggleTodo, deleteTodo,
  showTodoInput, setShowTodoInput, todoInput, setTodoInput, addTodo,
  showWorkoutPanel, setShowWorkoutPanel, workoutTemplates, availableTemplates, applyWorkoutTemplate,
  showTodoGroupPanel, setShowTodoGroupPanel, todoTemplates, availableTodoTemplates, applyTodoTemplate,
  removeSession,
  confirm, rate,
}) {
  return <>
    {/* 날짜 네비게이터 - 고정 */}
    <div style={{ padding:'8px 16px', flexShrink:0 }}>
      <NavCard>
        <NavBtn onClick={()=>setSelectedDate(d=>addDays(d,-1))}>‹</NavBtn>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'17px', fontWeight:'700' }}>
            {selectedDate.getFullYear()}년 {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}일
            <span style={{ fontSize:'14px', fontWeight:'500', color:'#8e8e93', marginLeft:'4px' }}>({DAYS[selectedDate.getDay()]})</span>
          </div>
          {labelForDate(selectedDate) && <div style={{ fontSize:'11px', color:'#007aff', marginTop:'2px' }}>{labelForDate(selectedDate)}</div>}
        </div>
        <NavBtn onClick={()=>setSelectedDate(d=>addDays(d,1))}>›</NavBtn>
      </NavCard>
    </div>

    {/* 스크롤 영역 */}
    <div style={{ flex:1, minHeight:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', padding:'0 16px 8px' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

        {/* 운동 세션 */}
        {sessionsForDay.map(session => {
          const totalSets = session.exercises.reduce((a,e)=>a+e.sets,0)
          const doneSets  = session.exercises.reduce((a,e)=>a+e.completedSets.filter(Boolean).length,0)
          const progress  = totalSets===0 ? 0 : doneSets/totalSets
          const expanded  = expandedSession[session.id] !== false
          return (
            <div key={session.id} style={{ background:'#fff', borderRadius:'12px', overflow:'hidden', borderTop:`3px solid ${session.color}` }}>
              <div style={{ display:'flex', alignItems:'center', padding:'14px', gap:'8px' }}>
                <div onClick={()=>setExpandedSession(p=>({...p,[session.id]:!expanded}))} style={{ display:'flex', flex:1, alignItems:'center', gap:'8px', cursor:'pointer' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:session.color, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'15px', fontWeight:'700' }}>{session.name}</div>
                    <div style={{ fontSize:'11px', color:'#8e8e93', marginTop:'1px' }}>{doneSets}/{totalSets} 세트</div>
                  </div>
                  <span style={{ fontSize:'13px', fontWeight:'600', color: doneSets===totalSets&&totalSets>0?'#34c759':'#8e8e93' }}>{rate(doneSets,totalSets)}%</span>
                  <span style={{ color:'#8e8e93', fontSize:'14px', marginLeft:'4px' }}>{expanded?'▲':'▼'}</span>
                </div>
                <button onClick={()=>confirm(`"${session.name}" 운동을 제거할까요?`, ()=>removeSession(session.id))} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer', paddingLeft:'12px' }}>제거</button>
              </div>
              <div style={{ height:'3px', background:'#e5e5ea', margin:'0 14px 4px', borderRadius:'2px' }}>
                <div style={{ height:'3px', background:session.color, width:`${progress*100}%`, borderRadius:'2px', transition:'width 0.3s' }}/>
              </div>
              {expanded && session.exercises.map((ex, i) => {
                const exDone = ex.completedSets.filter(Boolean).length
                return (
                  <div key={ex.id} style={{ padding:'12px 14px', borderTop: i===0?'none':'0.5px solid #e5e5ea' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                      <span style={{ fontSize:'15px', fontWeight:'600' }}>{ex.name}</span>
                      <span style={{ fontSize:'12px', color:'#8e8e93' }}>{exDone}/{ex.sets}세트 · {ex.reps}{ex.unit}</span>
                    </div>
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                      {Array.from({length: ex.sets}, (_, si) => {
                        const val = ex.completedSets?.[si] ?? false
                        const done = val !== false
                        const isRunning = exTimer && exTimer.sessionId === session.id && exTimer.exerciseId === ex.id && exTimer.setIdx === si
                        const isOvertime = isRunning && exTimer.elapsed >= exTimer.total
                        const btnColor = isRunning ? (isOvertime ? '#ff3b30' : '#ff9500') : (done ? session.color : 'transparent')
                        const borderColor = btnColor === 'transparent' ? '#c6c6c8' : btnColor
                        const label = isRunning
                          ? (isOvertime ? `+${exTimer.elapsed - exTimer.total}초` : `${exTimer.total - exTimer.elapsed}초`)
                          : (done ? `${val}${ex.unit}` : si+1)
                        return (
                          <button key={si} onClick={()=>toggleSet(session.id, ex.id, si)} style={{
                            minWidth:'36px', height:'36px', borderRadius:'8px', padding:'0 6px',
                            border:`1.5px solid ${borderColor}`,
                            background: btnColor, color: (done || isRunning) ?'#fff':'#8e8e93',
                            fontSize:'12px', fontWeight:'600', cursor:'pointer',
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
          const totalCounts = group.items.reduce((a,item)=>a+item.count,0)
          const doneCounts  = group.items.reduce((a,item)=>a+item.completedCounts.filter(Boolean).length,0)
          const expanded    = expandedTodoGroup[group.id] !== false
          return (
            <div key={group.id} style={{ background:'#fff', borderRadius:'12px', overflow:'hidden', borderTop:`3px solid ${group.color}` }}>
              <div style={{ display:'flex', alignItems:'center', padding:'14px', gap:'8px' }}>
                <div onClick={()=>setExpandedTodoGroup(p=>({...p,[group.id]:!expanded}))} style={{ display:'flex', flex:1, alignItems:'center', gap:'8px', cursor:'pointer' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:group.color, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'15px', fontWeight:'700' }}>{group.name}</div>
                    <div style={{ fontSize:'11px', color: doneCounts===totalCounts&&totalCounts>0?'#34c759':'#8e8e93', marginTop:'1px' }}>{doneCounts}/{totalCounts} 완료</div>
                  </div>
                  <span style={{ fontSize:'13px', fontWeight:'600', color: doneCounts===totalCounts&&totalCounts>0?'#34c759':'#8e8e93' }}>{rate(doneCounts,totalCounts)}%</span>
                  <span style={{ color:'#8e8e93', fontSize:'14px', marginLeft:'4px' }}>{expanded?'▲':'▼'}</span>
                </div>
                <button onClick={()=>confirm(`"${group.name}" 그룹을 제거할까요?`, ()=>removeTodoGroup(group.id))} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer', paddingLeft:'12px' }}>제거</button>
              </div>
              <div style={{ height:'3px', background:'#e5e5ea', margin:'0 14px 4px', borderRadius:'2px' }}>
                <div style={{ height:'3px', background:group.color, width:`${totalCounts===0?0:doneCounts/totalCounts*100}%`, borderRadius:'2px', transition:'width 0.3s' }}/>
              </div>
              {expanded && group.items.map((item, i) => {
                const itemDone = item.completedCounts.filter(Boolean).length
                return (
                  <div key={item.id} style={{ padding:'12px 14px', borderTop: i===0?'none':'0.5px solid #e5e5ea' }}>
                    {item.count === 1 ? (
                      <div onClick={()=>toggleGroupItemCount(group.id, item.id, 0)} style={{ display:'flex', alignItems:'center', gap:'12px', cursor:'pointer' }}>
                        <div style={{ ...circle, background: item.completedCounts[0]?group.color:'transparent', border: item.completedCounts[0]?'none':`2px solid #c6c6c8` }}>
                          {item.completedCounts[0] && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ flex:1, fontSize:'15px', color: item.completedCounts[0]?'#8e8e93':'#000', textDecoration: item.completedCounts[0]?'line-through':'none' }}>{item.text}</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                          <span style={{ fontSize:'15px', fontWeight:'600', color: itemDone===item.count?'#8e8e93':'#000', textDecoration: itemDone===item.count?'line-through':'none' }}>{item.text}</span>
                          <span style={{ fontSize:'12px', color:'#8e8e93' }}>{itemDone}/{item.count}회</span>
                        </div>
                        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                          {item.completedCounts.map((done, ci) => (
                            <button key={ci} onClick={()=>toggleGroupItemCount(group.id, item.id, ci)} style={{
                              width:'36px', height:'36px', borderRadius:'8px', border:`1.5px solid ${done?group.color:'#c6c6c8'}`,
                              background: done?group.color:'transparent', color: done?'#fff':'#8e8e93',
                              fontSize:'13px', fontWeight:'600', cursor:'pointer',
                            }}>{done?'✓':ci+1}</button>
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

        {/* 개별 할일 */}
        {todosForDay.length > 0 && (
          <div style={card}>
            {todosForDay.map((todo, i) => (
              <div key={todo.id} style={{ ...row, borderTop: i===0?'none':'0.5px solid #e5e5ea' }}>
                <div onClick={()=>toggleTodo(todo.id)} style={{ ...circle, background: todo.completed?'#34c759':'transparent', border: todo.completed?'none':'2px solid #c6c6c8', cursor:'pointer' }}>
                  {todo.completed && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span onClick={()=>toggleTodo(todo.id)} style={{ flex:1, fontSize:'15px', color: todo.completed?'#8e8e93':'#000', textDecoration: todo.completed?'line-through':'none', cursor:'pointer' }}>{todo.text}</span>
                <button onClick={()=>confirm(`"${todo.text}" 할일을 삭제할까요?`, ()=>deleteTodo(todo.id))} style={delBtn}>−</button>
              </div>
            ))}
          </div>
        )}

        {todosForDay.length===0 && groupsForDay.length===0 && sessionsForDay.length===0 && !showTodoInput && !showTodoGroupPanel && !showWorkoutPanel &&
          <EmptyCard>오늘의 할일이 없습니다</EmptyCard>}

        {/* 개별 할일 입력 */}
        {showTodoInput && (
          <div style={{ ...card, flexDirection:'row', gap:'8px', alignItems:'center', padding:'12px' }}>
            <input autoFocus value={todoInput} onChange={e=>setTodoInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') addTodo(); if(e.key==='Escape') setShowTodoInput(false) }}
              placeholder="할 일 입력..." style={inputStyle} />
            <button onClick={addTodo} style={confirmBtn}>추가</button>
          </div>
        )}

        {/* 운동 루틴 선택 패널 */}
        {showWorkoutPanel && (
          <div style={{ ...card, padding:'16px', display:'flex', flexDirection:'column', gap:'10px' }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93' }}>운동 루틴 선택</div>
            {workoutTemplates.length === 0 ? (
              <div style={{ color:'#8e8e93', fontSize:'14px', textAlign:'center', padding:'8px 0' }}>
                루틴 탭에서 운동 루틴을 먼저 만들어주세요
              </div>
            ) : availableTemplates.length === 0 ? (
              <div style={{ color:'#8e8e93', fontSize:'14px', textAlign:'center', padding:'8px 0' }}>오늘 모든 루틴이 추가되었습니다</div>
            ) : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                {availableTemplates.map(tpl => (
                  <button key={tpl.id} onClick={()=>applyWorkoutTemplate(tpl)} style={{ display:'flex', alignItems:'center', gap:'4px', borderRadius:'14px', border:`1px solid ${tpl.color}`, background:'transparent', padding:'5px 10px', cursor:'pointer' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:tpl.color }}/>
                    <span style={{ color:tpl.color, fontWeight:'600', fontSize:'13px' }}>{tpl.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 할일 그룹 선택 패널 */}
        {showTodoGroupPanel && (
          <div style={{ ...card, padding:'16px', display:'flex', flexDirection:'column', gap:'10px' }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93' }}>할일 그룹 선택</div>
            {todoTemplates.length === 0 ? (
              <div style={{ color:'#8e8e93', fontSize:'14px', textAlign:'center', padding:'8px 0' }}>
                루틴 탭에서 할일 그룹을 먼저 만들어주세요
              </div>
            ) : availableTodoTemplates.length === 0 ? (
              <div style={{ color:'#8e8e93', fontSize:'14px', textAlign:'center', padding:'8px 0' }}>오늘 모든 그룹이 추가되었습니다</div>
            ) : (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                {availableTodoTemplates.map(tpl => (
                  <button key={tpl.id} onClick={()=>applyTodoTemplate(tpl)} style={{ display:'flex', alignItems:'center', gap:'4px', borderRadius:'14px', border:`1px solid ${tpl.color}`, background:'transparent', padding:'5px 10px', cursor:'pointer' }}>
                    <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:tpl.color }}/>
                    <span style={{ color:tpl.color, fontWeight:'600', fontSize:'13px' }}>{tpl.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>

    {/* 하단 추가 버튼 3종 - 고정 */}
    <div style={{ padding:'8px 16px 10px', display:'flex', gap:'8px', background:'#f2f2f7', borderTop:'0.5px solid #e5e5ea' }}>
      <AddRowBtn active={showWorkoutPanel} onClick={()=>{ setShowWorkoutPanel(v=>!v); setShowTodoGroupPanel(false); setShowTodoInput(false) }} style={{ flex:1 }}>
        {showWorkoutPanel ? '✕' : '+ 운동'}
      </AddRowBtn>
      <AddRowBtn active={showTodoGroupPanel} onClick={()=>{ setShowTodoGroupPanel(v=>!v); setShowWorkoutPanel(false); setShowTodoInput(false) }} style={{ flex:1 }}>
        {showTodoGroupPanel ? '✕' : '+ 그룹'}
      </AddRowBtn>
      <AddRowBtn active={showTodoInput} onClick={()=>{ setShowTodoInput(v=>!v); setShowWorkoutPanel(false); setShowTodoGroupPanel(false) }} style={{ flex:1 }}>
        {showTodoInput ? '✕' : '+ 할일'}
      </AddRowBtn>
    </div>
  </>
}
