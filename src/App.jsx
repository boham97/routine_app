import { useState, useEffect, useRef } from 'react'

const MONTHS  = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DAYS    = ['일','월','화','수','목','금','토']
const PALETTE = ['#ff9500','#007aff','#34c759','#ff3b30','#af52de','#5ac8fa','#ff2d55','#a2845e']
const UNITS   = ['회','초','분','km']

function dateKey(d) {
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }
function getToday() { const d = new Date(); d.setHours(0,0,0,0); return d }
function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

export default function App() {
  const [tab, setTab] = useState('todo')

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
  const [showTodoGroupPanel,  setShowTodoGroupPanel]  = useState(false)

  // ── 운동 루틴 ──────────────────────────────────────────────
  const [workoutTemplates, setWorkoutTemplates] = useState(() => load('workoutTemplates', []))
  const [workoutSessions,  setWorkoutSessions]  = useState(() => load('workoutSessions',  []))
  const [expandedSession,  setExpandedSession]  = useState({})
  const [showWorkoutPanel, setShowWorkoutPanel] = useState(false)

  // ── 루틴 탭 상태 ───────────────────────────────────────────
  const [routineTab,        setRoutineTab]        = useState('workout') // 'workout' | 'todo'
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
  const [wheelOffset, setWheelOffset] = useState(0) // 부드러운 시각적 오프셋(px)
  const dragStartY = useRef(null)
  const dragStartVal = useRef(0)
  const ITEM_H = 52

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
  const todayKey   = dateKey(getToday())
  const selKey     = dateKey(selectedDate)

  const labelForDate = d => {
    const key = dateKey(d)
    if (key === todayKey) return '오늘'
    if (key === dateKey(addDays(getToday(), -1))) return '어제'
    if (key === dateKey(addDays(getToday(),  1))) return '내일'
    return null
  }

  // ── 개별 할일 CRUD ─────────────────────────────────────────
  function addTodo() {
    const text = todoInput.trim(); if (!text) return
    const createdAt = new Date(selectedDate); createdAt.setHours(12,0,0,0)
    setTodos(p => [...p, { id: Date.now(), text, completed: false, createdAt: createdAt.toISOString() }])
    setTodoInput(''); setShowTodoInput(false)
  }
  function toggleTodo(id) {
    setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }
  function deleteTodo(id) { setTodos(p => p.filter(t => t.id !== id)) }
  const todosForDay = todos.filter(t => dateKey(t.createdAt) === selKey)

  // ── 할일 그룹 CRUD ─────────────────────────────────────────
  function applyTodoTemplate(tpl) {
    if (todoGroups.find(g => g.templateId === tpl.id && g.date === selKey)) return
    const group = {
      id: Date.now(), templateId: tpl.id, name: tpl.name, color: tpl.color, date: selKey,
      items: tpl.items.map(item => ({
        ...item,
        completedCounts: Array(item.count).fill(false)
      }))
    }
    setTodoGroups(p => [...p, group])
    setExpandedTodoGroup(p => ({ ...p, [group.id]: true }))
    setShowTodoGroupPanel(false)
  }
  function removeTodoGroup(id) { setTodoGroups(p => p.filter(g => g.id !== id)) }
  function toggleGroupItemCount(groupId, itemId, idx) {
    setTodoGroups(p => p.map(g => g.id !== groupId ? g : {
      ...g, items: g.items.map(item => item.id !== itemId ? item : {
        ...item, completedCounts: item.completedCounts.map((v, i) => i === idx ? !v : v)
      })
    }))
  }

  const groupsForDay          = todoGroups.filter(g => g.date === selKey)
  const appliedTodoTplIds     = groupsForDay.map(g => g.templateId)
  const availableTodoTemplates = todoTemplates.filter(t => !appliedTodoTplIds.includes(t.id))

  // ── 운동 CRUD ──────────────────────────────────────────────
  function applyWorkoutTemplate(tpl) {
    if (workoutSessions.find(s => s.templateId === tpl.id && s.date === selKey)) return
    const session = {
      id: Date.now(), templateId: tpl.id, name: tpl.name, color: tpl.color, date: selKey,
      exercises: tpl.exercises.map(e => ({ ...e, completedSets: Array(e.sets).fill(false) }))
    }
    setWorkoutSessions(p => [...p, session])
    setExpandedSession(p => ({ ...p, [session.id]: true }))
    setShowWorkoutPanel(false)
  }
  function removeSession(id) { setWorkoutSessions(p => p.filter(s => s.id !== id)) }
  function toggleSet(sessionId, exerciseId, setIdx) {
    // 이미 완료된 세트면 취소, 아니면 횟수 입력 모달 열기
    const session = workoutSessions.find(s => s.id === sessionId)
    const ex = session?.exercises.find(e => e.id === exerciseId)
    const cur = ex?.completedSets?.[setIdx] ?? false
    if (cur !== false) {
      // 완료 → 취소
      setWorkoutSessions(p => p.map(s => s.id !== sessionId ? s : {
        ...s, exercises: s.exercises.map(e => e.id !== exerciseId ? e : {
          ...e, completedSets: Array.from({length: e.sets}, (_, i) =>
            i === setIdx ? false : (e.completedSets?.[i] ?? false)
          )
        })
      }))
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
    const t = todos.filter(t=>{ const d=new Date(t.createdAt); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    const s = workoutSessions.filter(s=>{ const d=new Date(s.date); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    const totalSets = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).length
    const doneSets  = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).filter(Boolean).length
    return { todoAdded: t.length, todoDone: t.filter(x=>x.completed).length, totalSets, doneSets }
  })
  const maxTodo = Math.max(...monthlyData.map(m=>m.todoAdded), 1)
  const maxSets = Math.max(...monthlyData.map(m=>m.totalSets), 1)

  const tabTitle = tab==='todo' ? '할 일' : tab==='routine' ? '루틴' : '통계'

  return (
    <div style={{ display:'flex', flexDirection:'column', position:'fixed', inset:0, background:'#f2f2f7' }}>

      {/* Status Bar */}
      <div style={{ height:'44px', flexShrink:0, background:'#f2f2f7', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', fontSize:'15px', fontWeight:'600' }}>
        <span>9:41</span><span>●●●</span>
      </div>


      {/* Content */}
      <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column' }}>

        {/* ════ 할일 탭 ════ */}
        {tab==='todo' && <>
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
          <div style={{ flex:1, minHeight:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', padding:'0 16px 8px' }}><div style={{ display:'flex', flexDirection:'column', gap:'12px' }}><>

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
                          return (
                            <button key={si} onClick={()=>toggleSet(session.id, ex.id, si)} style={{
                              minWidth:'36px', height:'36px', borderRadius:'8px', padding:'0 6px',
                              border:`1.5px solid ${done?session.color:'#c6c6c8'}`,
                              background: done?session.color:'transparent', color: done?'#fff':'#8e8e93',
                              fontSize:'12px', fontWeight:'600', cursor:'pointer',
                            }}>{done ? `${val}${ex.unit}` : si+1}</button>
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
                        // 1회짜리는 체크박스로
                        <div onClick={()=>toggleGroupItemCount(group.id, item.id, 0)} style={{ display:'flex', alignItems:'center', gap:'12px', cursor:'pointer' }}>
                          <div style={{ ...circle, background: item.completedCounts[0]?group.color:'transparent', border: item.completedCounts[0]?'none':`2px solid #c6c6c8` }}>
                            {item.completedCounts[0] && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{ flex:1, fontSize:'15px', color: item.completedCounts[0]?'#8e8e93':'#000', textDecoration: item.completedCounts[0]?'line-through':'none' }}>{item.text}</span>
                        </div>
                      ) : (
                        // 여러 번은 버블 버튼
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

        </></div></div>
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
        </>}

        {/* ════ 루틴 탭 ════ */}
        {tab==='routine' && <div style={{ flex:1, minHeight:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', padding:'0 16px 16px' }}><div style={{ display:'flex', flexDirection:'column', gap:'12px' }}><>
          {/* Sub-tab */}
          {!showWorkoutForm && !showTodoTplForm && (
            <div style={{ display:'flex', background:'#e5e5ea', borderRadius:'10px', padding:'2px' }}>
              {[['workout','🏋️ 운동 루틴'],['todo','📋 할일 그룹']].map(([key,label])=>(
                <button key={key} onClick={()=>setRoutineTab(key)} style={{ flex:1, padding:'8px', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', background: routineTab===key?'#fff':'transparent', color: routineTab===key?'#000':'#8e8e93', transition:'all 0.2s' }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* 운동 루틴 목록 */}
          {routineTab==='workout' && !showWorkoutForm && <>
            {workoutTemplates.length === 0 && <EmptyCard>저장된 운동 루틴이 없습니다</EmptyCard>}
            {workoutTemplates.map(tpl => (
              <div key={tpl.id} style={{ background:'#fff', borderRadius:'12px', overflow:'hidden', borderLeft:`4px solid ${tpl.color}` }}>
                <div style={{ display:'flex', alignItems:'center', padding:'14px', gap:'8px' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:tpl.color, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'15px', fontWeight:'700' }}>{tpl.name}</div>
                    <div style={{ fontSize:'12px', color:'#8e8e93', marginTop:'2px' }}>{tpl.exercises.length}종목</div>
                  </div>
                  <button onClick={()=>openEditWorkout(tpl)} style={{ background:'none', border:'none', color:'#007aff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>수정</button>
                  <button onClick={()=>confirm(`"${tpl.name}" 루틴을 삭제할까요?\n관련된 모든 기록도 삭제됩니다.`, ()=>deleteWorkoutTpl(tpl.id))} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>삭제</button>
                </div>
                <div style={{ padding:'0 14px 12px', display:'flex', flexDirection:'column', gap:'4px' }}>
                  {tpl.exercises.map(ex => (
                    <div key={ex.id} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'#8e8e93' }}>
                      <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:tpl.color }}/>
                      <span>{ex.name}</span>
                      <span style={{ marginLeft:'auto' }}>{ex.sets}세트×{ex.reps}{ex.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <AddRowBtn onClick={openAddWorkout}>+ 새 운동 루틴 만들기</AddRowBtn>
          </>}

          {/* 운동 루틴 폼 */}
          {routineTab==='workout' && showWorkoutForm && (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div style={{ ...card, padding:'16px', display:'flex', flexDirection:'column', gap:'0' }}>
                <div style={{ fontSize:'17px', fontWeight:'700', marginBottom:'16px' }}>{editingWorkoutId?'루틴 수정':'새 운동 루틴'}</div>
                <input value={wName} onChange={e=>setWName(e.target.value)} placeholder="루틴 이름 (예: 상체 A)" style={{ ...inputStyle, flex:'none', width:'100%', boxSizing:'border-box', marginBottom:'12px' }} />
                <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>색상</div>
                <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                  {PALETTE.map(c => (
                    <button key={c} onClick={()=>setWColor(c)} style={{ width:'28px', height:'28px', borderRadius:'50%', background:c, border: wColor===c?'3px solid #000':'none', cursor:'pointer' }}/>
                  ))}
                </div>
                {wExercises.length > 0 && (
                  <div style={{ marginBottom:'12px' }}>
                    <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>종목 ({wExercises.length}개)</div>
                    <div style={card}>
                      {wExercises.map((ex, i) => (
                        <div key={ex.id} style={{ ...row, borderTop: i===0?'none':'0.5px solid #e5e5ea' }}>
                          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:wColor, flexShrink:0 }}/>
                          <span style={{ flex:1, fontSize:'14px' }}>{ex.name}</span>
                          <span style={{ fontSize:'12px', color:'#8e8e93', marginRight:'8px' }}>{ex.sets}×{ex.reps}{ex.unit}</span>
                          <button onClick={()=>removeExercise(ex.id)} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'16px', cursor:'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>종목 추가</div>
                <input ref={exInputRef} value={exInput} onChange={e=>setExInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addExercise()}
                  placeholder="종목명 (예: 스쿼트)" style={{ ...inputStyle, flex:'none', width:'100%', boxSizing:'border-box', marginBottom:'8px' }} />
                <div style={{ display:'flex', gap:'8px', alignItems:'flex-end', marginBottom:'8px' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                    <span style={{ fontSize:'11px', color:'#8e8e93' }}>세트</span>
                    <input value={exSets} onChange={e=>setExSets(e.target.value)} type="number" style={{ width:'56px', height:'40px', background:'#f2f2f7', border:'none', borderRadius:'8px', textAlign:'center', fontSize:'16px', fontWeight:'600' }} />
                  </div>
                  <span style={{ fontSize:'18px', color:'#8e8e93', paddingBottom:'8px' }}>×</span>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                    <span style={{ fontSize:'11px', color:'#8e8e93' }}>횟수</span>
                    <input value={exReps} onChange={e=>setExReps(e.target.value)} type="number" style={{ width:'56px', height:'40px', background:'#f2f2f7', border:'none', borderRadius:'8px', textAlign:'center', fontSize:'16px', fontWeight:'600' }} />
                  </div>
                  <div style={{ display:'flex', gap:'4px', paddingBottom:'4px' }}>
                    {UNITS.map(u => (
                      <button key={u} onClick={()=>setExUnit(u)} style={{ padding:'6px 8px', borderRadius:'8px', border:`1px solid ${exUnit===u?wColor:'#c6c6c8'}`, background: exUnit===u?wColor:'transparent', color: exUnit===u?'#fff':'#8e8e93', fontSize:'12px', cursor:'pointer' }}>{u}</button>
                    ))}
                  </div>
                </div>
                <button onClick={addExercise} style={{ width:'100%', padding:'10px', background:'none', border:`1px solid ${wColor}`, borderRadius:'10px', color:wColor, fontWeight:'600', fontSize:'14px', cursor:'pointer', marginBottom:'16px' }}>
                  + 종목 추가
                </button>
                <button onClick={saveWorkoutTpl} disabled={!wName.trim()||wExercises.length===0} style={{ height:'44px', background: wName.trim()&&wExercises.length>0?wColor:'#c6c6c8', border:'none', borderRadius:'10px', color:'#fff', fontSize:'15px', fontWeight:'600', cursor:'pointer' }}>
                  {editingWorkoutId?'수정 완료':'루틴 저장'}
                </button>
              </div>
              <AddRowBtn active onClick={()=>setShowWorkoutForm(false)}>✕ 취소</AddRowBtn>
            </div>
          )}

          {/* 할일 그룹 목록 */}
          {routineTab==='todo' && !showTodoTplForm && <>
            {todoTemplates.length === 0 && <EmptyCard>저장된 할일 그룹이 없습니다</EmptyCard>}
            {todoTemplates.map(tpl => (
              <div key={tpl.id} style={{ background:'#fff', borderRadius:'12px', overflow:'hidden', borderLeft:`4px solid ${tpl.color}` }}>
                <div style={{ display:'flex', alignItems:'center', padding:'14px', gap:'8px' }}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:tpl.color, flexShrink:0 }}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'15px', fontWeight:'700' }}>{tpl.name}</div>
                    <div style={{ fontSize:'12px', color:'#8e8e93', marginTop:'2px' }}>{tpl.items.length}항목</div>
                  </div>
                  <button onClick={()=>openEditTodoTpl(tpl)} style={{ background:'none', border:'none', color:'#007aff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>수정</button>
                  <button onClick={()=>confirm(`"${tpl.name}" 그룹을 삭제할까요?\n관련된 모든 기록도 삭제됩니다.`, ()=>deleteTodoTpl(tpl.id))} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>삭제</button>
                </div>
                <div style={{ padding:'0 14px 12px', display:'flex', flexDirection:'column', gap:'4px' }}>
                  {tpl.items.map(item => (
                    <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'#8e8e93' }}>
                      <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:tpl.color }}/>
                      <span>{item.text}</span>
                      {item.count > 1 && <span style={{ marginLeft:'auto' }}>{item.count}회</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <AddRowBtn onClick={openAddTodoTpl}>+ 새 할일 그룹 만들기</AddRowBtn>
          </>}

          {/* 할일 그룹 폼 */}
          {routineTab==='todo' && showTodoTplForm && (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div style={{ ...card, padding:'16px', display:'flex', flexDirection:'column', gap:'0' }}>
                <div style={{ fontSize:'17px', fontWeight:'700', marginBottom:'16px' }}>{editingTodoTplId?'그룹 수정':'새 할일 그룹'}</div>
                <input value={ttName} onChange={e=>setTtName(e.target.value)} placeholder="그룹 이름 (예: 아침 루틴)" style={{ ...inputStyle, flex:'none', width:'100%', boxSizing:'border-box', marginBottom:'12px' }} />
                <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>색상</div>
                <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                  {PALETTE.map(c => (
                    <button key={c} onClick={()=>setTtColor(c)} style={{ width:'28px', height:'28px', borderRadius:'50%', background:c, border: ttColor===c?'3px solid #000':'none', cursor:'pointer' }}/>
                  ))}
                </div>
                {ttItems.length > 0 && (
                  <div style={{ marginBottom:'12px' }}>
                    <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>항목 ({ttItems.length}개)</div>
                    <div style={card}>
                      {ttItems.map((item, i) => (
                        <div key={item.id} style={{ ...row, borderTop: i===0?'none':'0.5px solid #e5e5ea' }}>
                          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:ttColor, flexShrink:0 }}/>
                          <span style={{ flex:1, fontSize:'14px' }}>{item.text}</span>
                          {item.count > 1 && <span style={{ fontSize:'12px', color:'#8e8e93', marginRight:'8px' }}>{item.count}회</span>}
                          <button onClick={()=>removeTtItem(item.id)} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'16px', cursor:'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>항목 추가</div>
                <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                  <input ref={ttInputRef} value={ttInput} onChange={e=>setTtInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&addTtItem()}
                    placeholder="항목 (예: 물 마시기)" style={inputStyle} />
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                    <span style={{ fontSize:'10px', color:'#8e8e93' }}>반복</span>
                    <input value={ttCount} onChange={e=>setTtCount(e.target.value)} type="number" min="1" style={{ width:'52px', height:'44px', background:'#f2f2f7', border:'none', borderRadius:'10px', textAlign:'center', fontSize:'16px', fontWeight:'600' }} />
                  </div>
                </div>
                <button onClick={addTtItem} style={{ width:'100%', padding:'10px', background:'none', border:`1px solid ${ttColor}`, borderRadius:'10px', color:ttColor, fontWeight:'600', fontSize:'14px', cursor:'pointer', marginBottom:'16px' }}>
                  + 항목 추가
                </button>
                <button onClick={saveTodoTpl} disabled={!ttName.trim()||ttItems.length===0} style={{ height:'44px', background: ttName.trim()&&ttItems.length>0?ttColor:'#c6c6c8', border:'none', borderRadius:'10px', color:'#fff', fontSize:'15px', fontWeight:'600', cursor:'pointer' }}>
                  {editingTodoTplId?'수정 완료':'그룹 저장'}
                </button>
              </div>
              <AddRowBtn active onClick={()=>setShowTodoTplForm(false)}>✕ 취소</AddRowBtn>
            </div>
          )}
        </></div></div>}

        {/* ════ 통계 탭 ════ */}
        {tab==='stats' && <div style={{ flex:1, minHeight:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', padding:'0 16px 16px' }}><div style={{ display:'flex', flexDirection:'column', gap:'12px' }}><>
          {/* 검색창 */}
          <div style={{ display:'flex', alignItems:'center', background:'#fff', borderRadius:'12px', padding:'8px 12px', gap:'8px' }}>
            <span style={{ fontSize:'16px' }}>🔍</span>
            <input value={statsSearch} onChange={e=>setStatsSearch(e.target.value)} placeholder="운동/할일 검색..." style={{ flex:1, border:'none', background:'transparent', fontSize:'15px', outline:'none' }} />
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
            const exMap = {}
            workoutSessions.forEach(s => s.exercises.forEach(e => {
              if (!e.name.toLowerCase().includes(q)) return
              if (!exMap[e.name]) exMap[e.name]={text:e.name,type:'workout',totalSets:0,doneSets:0,sessions:0,dates:[]}
              exMap[e.name].totalSets += e.sets
              exMap[e.name].doneSets  += e.completedSets.filter(Boolean).length
              exMap[e.name].sessions++
              exMap[e.name].dates.push({date:s.date,doneSets:e.completedSets.filter(Boolean).length,totalSets:e.sets})
            }))
            const results = [...Object.values(todoMap), ...Object.values(exMap)]
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
                            <div style={{ fontSize:'11px', color, marginTop:'2px' }}>{isTodo?'할일':'운동'}</div>
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

          {/* 월간 통계 */}
          <div>
            <div style={sectionLabel}>📋 할일 월간 통계</div>
            <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', display:'flex', gap:'8px' }}>
              <StatCard label="추가"   value={todosVM.length}                       color="#007aff"/>
              <StatCard label="완료"   value={todosVM.filter(t=>t.completed).length} color="#34c759"/>
              <StatCard label="달성률" value={`${rate(todosVM.filter(t=>t.completed).length,todosVM.length)}%`} color="#ff9500"/>
            </div>
          </div>
          <div>
            <div style={sectionLabel}>🏋️ 운동 월간 통계</div>
            <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', display:'flex', gap:'8px' }}>
              <StatCard label="운동일"   value={sessionsVM.length}  color="#ff9500"/>
              <StatCard label="완료세트" value={doneSetsVM.length}  color="#34c759"/>
              <StatCard label="달성률"   value={`${rate(doneSetsVM.length,allSetsVM.length)}%`} color="#007aff"/>
            </div>
          </div>

          {/* 종목별 달성률 */}
          {sessionsVM.length > 0 && (() => {
            const exMap = {}
            sessionsVM.forEach(s => s.exercises.forEach(e => {
              if (!exMap[e.name]) exMap[e.name]={name:e.name,color:s.color,totalSets:0,doneSets:0,count:0}
              exMap[e.name].totalSets += e.sets
              exMap[e.name].doneSets  += e.completedSets.filter(Boolean).length
              exMap[e.name].count++
            }))
            return (
              <div>
                <div style={sectionLabel}>종목별 달성률</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {Object.values(exMap).map((ex, i) => (
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
              </div>
            )
          })()}

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
              <StatCard label="할일추가" value={todosVY.length}                        color="#007aff"/>
              <StatCard label="할일완료" value={todosVY.filter(t=>t.completed).length}  color="#34c759"/>
              <StatCard label="운동일수" value={new Set(workoutSessions.filter(s=>new Date(s.date).getFullYear()===viewYear).map(s=>s.date)).size} color="#ff9500"/>
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
                {[['#d1e4ff','할일'],['#34c759','할일완료'],['#ffe5b4','운동세트'],['#ff9500','운동완료']].map(([c,l])=>(
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                    <div style={{ width:'10px', height:'10px', background:c, borderRadius:'2px' }}/>
                    <span style={{ fontSize:'11px', color:'#8e8e93' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </></div></div>}
      </div>

      {/* 세트 횟수 입력 모달 */}
      {pendingSet && (() => {
        const HALF = 2
        const onMove = (clientY) => {
          if (dragStartY.current === null) return
          const rawDelta = dragStartY.current - clientY
          const floatVal = Math.max(0, dragStartVal.current + rawDelta / 12)
          const intVal   = Math.round(floatVal)
          setPendingReps(intVal)
          setWheelOffset((floatVal - intVal) * ITEM_H)
        }
        const onEnd = () => { dragStartY.current = null; setWheelOffset(0) }
        return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
          onMouseMove={e=>onMove(e.clientY)} onMouseUp={onEnd}
          onTouchMove={e=>{ e.preventDefault(); onMove(e.touches[0].clientY) }} onTouchEnd={onEnd}
        >
          <div style={{ background:'#fff', borderRadius:'14px', width:'260px', overflow:'hidden' }}>
            <div style={{ padding:'16px 16px 8px', textAlign:'center' }}>
              <div style={{ fontSize:'13px', color:'#8e8e93', marginBottom:'8px' }}>{pendingSet.setIdx+1}세트 실제 수행 횟수</div>
              {/* 드럼 휠 */}
              <div
                onMouseDown={e=>{ dragStartY.current=e.clientY; dragStartVal.current=pendingReps }}
                onTouchStart={e=>{ dragStartY.current=e.touches[0].clientY; dragStartVal.current=pendingReps }}
                style={{ cursor:'ns-resize', userSelect:'none', touchAction:'none', position:'relative', height: ITEM_H*(HALF*2+1), overflow:'hidden' }}
              >
                {/* 선택 강조 바 */}
                <div style={{ position:'absolute', top: HALF*ITEM_H, left:16, right:16, height:ITEM_H, background:'#f2f2f7', borderRadius:'10px', pointerEvents:'none' }}/>
                {/* 숫자 목록 */}
                <div style={{ transform:`translateY(${-wheelOffset - 2*ITEM_H}px)`, transition: dragStartY.current ? 'none' : 'transform 0.15s ease' }}>
                  {Array.from({length: HALF*2+1+4}, (_, i) => {
                    const val = pendingReps - HALF - 2 + i
                    const dist = Math.abs(i - (HALF+2) - wheelOffset/ITEM_H)
                    const opacity = Math.max(0, 1 - dist * 0.35)
                    const fontSize = Math.max(18, 42 - dist * 10)
                    return (
                      <div key={i} style={{ height:ITEM_H, display:'flex', alignItems:'center', justifyContent:'center', opacity }}>
                        <span style={{ fontSize, fontWeight:'700', color: val===pendingReps?'#000':'#8e8e93', transition:'font-size 0.1s' }}>
                          {Math.max(0, val)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div style={{ fontSize:'13px', color:'#8e8e93', marginTop:'6px' }}>
                {pendingSet.unit} &nbsp;·&nbsp; 계획: {pendingSet.plannedReps}{pendingSet.unit}
              </div>
            </div>
            <div style={{ borderTop:'0.5px solid #e5e5ea', display:'flex', marginTop:'8px' }}>
              <button onClick={()=>{ setPendingSet(null); setWheelOffset(0) }} style={{ flex:1, padding:'14px', background:'none', border:'none', fontSize:'15px', color:'#8e8e93', cursor:'pointer', borderRight:'0.5px solid #e5e5ea' }}>취소</button>
              <button onClick={confirmSet} style={{ flex:1, padding:'14px', background:'none', border:'none', fontSize:'15px', fontWeight:'700', color:'#007aff', cursor:'pointer' }}>완료</button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* 확인 모달 */}
      {modal.show && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:'14px', width:'270px', overflow:'hidden' }}>
            <div style={{ padding:'20px 16px 16px', textAlign:'center' }}>
              <div style={{ fontSize:'15px', fontWeight:'600', marginBottom:'6px', lineHeight:'1.4', whiteSpace:'pre-line' }}>{modal.message}</div>
            </div>
            <div style={{ borderTop:'0.5px solid #e5e5ea', display:'flex' }}>
              <button onClick={closeModal} style={{ flex:1, padding:'14px', background:'none', border:'none', fontSize:'15px', fontWeight:'500', color:'#007aff', cursor:'pointer', borderRight:'0.5px solid #e5e5ea' }}>
                취소
              </button>
              <button onClick={()=>{ modal.onConfirm(); closeModal() }} style={{ flex:1, padding:'14px', background:'none', border:'none', fontSize:'15px', fontWeight:'700', color:'#ff3b30', cursor:'pointer' }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div style={{ height:'56px', flexShrink:0, background:'rgba(242,242,247,0.95)', borderTop:'0.5px solid #c6c6c8', display:'flex', alignItems:'center' }}>
        {[
          { key:'todo',    label:'할 일', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="11" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="17" width="10" height="2.5" rx="1.25" fill="currentColor"/></svg> },
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

// ── 재사용 컴포넌트 ───────────────────────────────────────────

function NavCard({ children }) {
  return <div style={{ background:'#fff', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 8px' }}>{children}</div>
}
function NavBtn({ onClick, disabled, small, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:small?'24px':'32px', height:small?'24px':'32px', borderRadius:'50%', background:disabled?'transparent':'#f2f2f7', border:'none', color:disabled?'#c6c6c8':'#007aff', fontSize:small?'16px':'20px', fontWeight:'600', cursor:disabled?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {children}
    </button>
  )
}
function EmptyCard({ children }) {
  return <div style={{ background:'#fff', borderRadius:'12px', padding:'24px', color:'#8e8e93', textAlign:'center', fontSize:'15px', whiteSpace:'pre-line' }}>{children}</div>
}
function AddRowBtn({ children, onClick, active, style: extraStyle }) {
  return (
    <button onClick={onClick} style={{ background:'#fff', borderRadius:'12px', padding:'16px', textAlign:'center', border:`1px ${active?'solid':'dashed'} ${active?'#ff3b30':'#e5e5ea'}`, fontSize:'15px', fontWeight:'600', color:active?'#ff3b30':'#007aff', cursor:'pointer', width:'100%', ...extraStyle }}>
      {children}
    </button>
  )
}
function StatCard({ label, value, color }) {
  return (
    <div style={{ flex:1, background:'#f2f2f7', borderRadius:'10px', padding:'12px 8px', textAlign:'center' }}>
      <div style={{ fontSize:'22px', fontWeight:'700', color }}>{value}</div>
      <div style={{ fontSize:'12px', color:'#8e8e93', marginTop:'2px' }}>{label}</div>
    </div>
  )
}

// ── 공통 스타일 상수 ─────────────────────────────────────────
const card       = { background:'#fff', borderRadius:'12px', overflow:'hidden' }
const row        = { display:'flex', alignItems:'center', padding:'14px 14px', gap:'12px' }
const circle     = { width:'22px', height:'22px', borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }
const delBtn     = { width:'26px', height:'26px', borderRadius:'50%', background:'#ffe5e5', border:'none', color:'#ff3b30', fontSize:'18px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }
const inputStyle = { flex:1, height:'44px', background:'#f2f2f7', border:'none', borderRadius:'10px', padding:'0 12px', fontSize:'15px', outline:'none' }
const confirmBtn = { height:'44px', padding:'0 16px', background:'#007aff', border:'none', borderRadius:'10px', color:'#fff', fontSize:'15px', fontWeight:'600', cursor:'pointer' }
const sectionLabel = { fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px', paddingLeft:'4px' }
