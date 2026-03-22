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

  // ── 할일 ──────────────────────────────────────────────────
  const [todos,        setTodos]        = useState(() => load('todos', []))
  const [todoDate,     setTodoDate]     = useState(getToday())
  const [todoInput,    setTodoInput]    = useState('')
  const [showTodoInput,setShowTodoInput]= useState(false)

  // ── 할일 그룹 (템플릿 기반) ───────────────────────────────
  const [todoTemplates,      setTodoTemplates]      = useState(() => load('todoTemplates', []))
  const [todoGroups,         setTodoGroups]         = useState(() => load('todoGroups',    []))
  const [expandedTodoGroup,  setExpandedTodoGroup]  = useState({})
  const [showTodoGroupPanel, setShowTodoGroupPanel] = useState(false)
  const [showTodoTplForm,    setShowTodoTplForm]    = useState(false)
  const [editingTodoTplId,   setEditingTodoTplId]   = useState(null)
  const [ttplName,  setTtplName]  = useState('')
  const [ttplColor, setTtplColor] = useState(PALETTE[1])
  const [ttplTasks, setTtplTasks] = useState([])
  const [ttplInput, setTtplInput] = useState('')
  const ttplInputRef = useRef(null)

  // ── 운동 ──────────────────────────────────────────────────
  const [workoutTemplates, setWorkoutTemplates] = useState(() => load('workoutTemplates', []))
  const [workoutSessions,  setWorkoutSessions]  = useState(() => load('workoutSessions',  []))
  const [workoutDate,      setWorkoutDate]      = useState(getToday())
  const [expandedSession,  setExpandedSession]  = useState({})
  const [showTemplatePanel,setShowTemplatePanel]= useState(false)

  // 운동 템플릿 폼
  const [showTemplateForm,  setShowTemplateForm]  = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState(null)
  const [tplName,  setTplName]  = useState('')
  const [tplColor, setTplColor] = useState(PALETTE[0])
  const [tplExercises, setTplExercises] = useState([])
  const [exInput, setExInput] = useState('')
  const [exSets,  setExSets]  = useState('3')
  const [exReps,  setExReps]  = useState('10')
  const [exUnit,  setExUnit]  = useState('회')
  const exInputRef = useRef(null)

  // ── 통계 ──────────────────────────────────────────────────
  const now = new Date()
  const thisYear = now.getFullYear(); const thisMonth = now.getMonth()
  const [viewYear,    setViewYear]    = useState(thisYear)
  const [viewMonth,   setViewMonth]   = useState(thisMonth)
  const [statsSearch, setStatsSearch] = useState('')

  useEffect(() => { localStorage.setItem('todos',            JSON.stringify(todos))            }, [todos])
  useEffect(() => { localStorage.setItem('todoTemplates',    JSON.stringify(todoTemplates))    }, [todoTemplates])
  useEffect(() => { localStorage.setItem('todoGroups',       JSON.stringify(todoGroups))       }, [todoGroups])
  useEffect(() => { localStorage.setItem('workoutTemplates', JSON.stringify(workoutTemplates)) }, [workoutTemplates])
  useEffect(() => { localStorage.setItem('workoutSessions',  JSON.stringify(workoutSessions))  }, [workoutSessions])

  // ── 날짜 helpers ───────────────────────────────────────────
  const todayKey   = dateKey(getToday())
  const todoKey    = dateKey(todoDate)
  const workoutKey = dateKey(workoutDate)

  const labelForDate = d => {
    const key = dateKey(d)
    if (key === todayKey) return '오늘'
    if (key === dateKey(addDays(getToday(), -1))) return '어제'
    if (key === dateKey(addDays(getToday(),  1))) return '내일'
    return null
  }

  // ── 할일 CRUD ──────────────────────────────────────────────
  function addTodo() {
    const text = todoInput.trim(); if (!text) return
    const createdAt = new Date(todoDate); createdAt.setHours(12,0,0,0)
    setTodos(p => [...p, { id: Date.now(), text, completed: false, createdAt: createdAt.toISOString(), completedAt: null }])
    setTodoInput(''); setShowTodoInput(false)
  }
  function toggleTodo(id) {
    setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t))
  }
  function deleteTodo(id) { setTodos(p => p.filter(t => t.id !== id)) }
  const todosForDay = todos.filter(t => dateKey(t.createdAt) === todoKey)

  // ── 할일 그룹 CRUD ────────────────────────────────────────
  function openAddTodoTpl() {
    setEditingTodoTplId(null); setTtplName(''); setTtplColor(PALETTE[1]); setTtplTasks([])
    setTtplInput(''); setShowTodoTplForm(true); setShowTodoGroupPanel(false)
  }
  function openEditTodoTpl(tpl) {
    setEditingTodoTplId(tpl.id); setTtplName(tpl.name); setTtplColor(tpl.color); setTtplTasks([...tpl.tasks])
    setTtplInput(''); setShowTodoTplForm(true); setShowTodoGroupPanel(false)
  }
  function addTtplTask() {
    const text = ttplInput.trim(); if (!text) return
    setTtplTasks(p => [...p, { id: Date.now(), text }])
    setTtplInput('')
    setTimeout(() => ttplInputRef.current?.focus(), 50)
  }
  function saveTodoTpl() {
    if (!ttplName.trim() || ttplTasks.length === 0) return
    if (editingTodoTplId) {
      setTodoTemplates(p => p.map(t => t.id === editingTodoTplId ? { ...t, name: ttplName.trim(), color: ttplColor, tasks: [...ttplTasks] } : t))
      setTodoGroups(p => p.map(g => g.templateId === editingTodoTplId ? { ...g, name: ttplName.trim(), color: ttplColor } : g))
    } else {
      setTodoTemplates(p => [...p, { id: Date.now(), name: ttplName.trim(), color: ttplColor, tasks: [...ttplTasks] }])
    }
    setShowTodoTplForm(false); setEditingTodoTplId(null)
  }
  function deleteTodoTpl(id) {
    setTodoTemplates(p => p.filter(t => t.id !== id))
    setTodoGroups(p => p.filter(g => g.templateId !== id))
  }
  function applyTodoTemplate(tpl) {
    if (todoGroups.find(g => g.templateId === tpl.id && g.date === todoKey)) return
    const group = { id: Date.now(), templateId: tpl.id, name: tpl.name, color: tpl.color, date: todoKey,
      tasks: tpl.tasks.map(t => ({ ...t, completed: false })) }
    setTodoGroups(p => [...p, group])
    setExpandedTodoGroup(p => ({ ...p, [group.id]: true }))
    setShowTodoGroupPanel(false)
  }
  function removeTodoGroup(groupId) { setTodoGroups(p => p.filter(g => g.id !== groupId)) }
  function toggleGroupTask(groupId, taskId) {
    setTodoGroups(p => p.map(g => g.id !== groupId ? g : {
      ...g, tasks: g.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t)
    }))
  }

  const groupsForDay          = todoGroups.filter(g => g.date === todoKey)
  const appliedTodoTplIds     = groupsForDay.map(g => g.templateId)
  const availableTodoTemplates = todoTemplates.filter(t => !appliedTodoTplIds.includes(t.id))

  // ── 운동 템플릿 CRUD ───────────────────────────────────────
  function openAddTemplate() {
    setEditingTemplateId(null); setTplName(''); setTplColor(PALETTE[0]); setTplExercises([])
    setExInput(''); setExSets('3'); setExReps('10'); setExUnit('회')
    setShowTemplateForm(true); setShowTemplatePanel(false)
  }
  function openEditTemplate(tpl) {
    setEditingTemplateId(tpl.id); setTplName(tpl.name); setTplColor(tpl.color); setTplExercises([...tpl.exercises])
    setExInput(''); setExSets('3'); setExReps('10'); setExUnit('회')
    setShowTemplateForm(true); setShowTemplatePanel(false)
  }
  function addExercise() {
    const name = exInput.trim(); if (!name) return
    setTplExercises(p => [...p, { id: Date.now(), name, sets: parseInt(exSets)||3, reps: parseInt(exReps)||10, unit: exUnit }])
    setExInput(''); setExSets('3'); setExReps('10'); setExUnit('회')
    setTimeout(() => exInputRef.current?.focus(), 50)
  }
  function removeExercise(id) { setTplExercises(p => p.filter(e => e.id !== id)) }
  function saveTemplate() {
    if (!tplName.trim() || tplExercises.length === 0) return
    if (editingTemplateId) {
      setWorkoutTemplates(p => p.map(t => t.id === editingTemplateId ? { ...t, name: tplName.trim(), color: tplColor, exercises: [...tplExercises] } : t))
    } else {
      setWorkoutTemplates(p => [...p, { id: Date.now(), name: tplName.trim(), color: tplColor, exercises: [...tplExercises] }])
    }
    setShowTemplateForm(false); setEditingTemplateId(null)
  }
  function deleteTemplate(id) {
    setWorkoutTemplates(p => p.filter(t => t.id !== id))
    setWorkoutSessions(p => p.filter(s => s.templateId !== id))
  }

  // ── 운동 세션 CRUD ─────────────────────────────────────────
  function applyTemplate(tpl) {
    if (workoutSessions.find(s => s.templateId === tpl.id && s.date === workoutKey)) return
    const session = {
      id: Date.now(), templateId: tpl.id, name: tpl.name, color: tpl.color, date: workoutKey,
      exercises: tpl.exercises.map(e => ({ ...e, completedSets: Array(e.sets).fill(false) })),
    }
    setWorkoutSessions(p => [...p, session])
    setExpandedSession(p => ({ ...p, [session.id]: true }))
    setShowTemplatePanel(false)
  }
  function removeSession(id) { setWorkoutSessions(p => p.filter(s => s.id !== id)) }
  function toggleSet(sessionId, exerciseId, setIdx) {
    setWorkoutSessions(p => p.map(s => s.id !== sessionId ? s : {
      ...s, exercises: s.exercises.map(e => e.id !== exerciseId ? e : {
        ...e, completedSets: e.completedSets.map((v, i) => i === setIdx ? !v : v),
      }),
    }))
  }

  const sessionsForDay     = workoutSessions.filter(s => s.date === workoutKey)
  const appliedTemplateIds = sessionsForDay.map(s => s.templateId)
  const availableTemplates = workoutTemplates.filter(t => !appliedTemplateIds.includes(t.id))

  // ── 통계 ───────────────────────────────────────────────────
  const isCurrentMonth = viewYear === thisYear && viewMonth === thisMonth
  function prevMonth() { viewMonth===0?(setViewMonth(11),setViewYear(y=>y-1)):setViewMonth(m=>m-1) }
  function nextMonth() { viewMonth===11?(setViewMonth(0),setViewYear(y=>y+1)):setViewMonth(m=>m+1) }

  const todosVM    = todos.filter(t => { const d=new Date(t.createdAt); return d.getFullYear()===viewYear&&d.getMonth()===viewMonth })
  const todosVY    = todos.filter(t => new Date(t.createdAt).getFullYear()===viewYear)
  const sessionsVM = workoutSessions.filter(s => { const d=new Date(s.date); return d.getFullYear()===viewYear&&d.getMonth()===viewMonth })
  const allSetsVM  = sessionsVM.flatMap(s => s.exercises.flatMap(e => e.completedSets))
  const doneSetsVM = allSetsVM.filter(Boolean)

  const rate = (done, total) => total===0 ? 0 : Math.round((done/total)*100)

  const monthlyData = MONTHS.map((_,mi) => {
    const t = todos.filter(t=>{ const d=new Date(t.createdAt); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    const s = workoutSessions.filter(s=>{ const d=new Date(s.date); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    const totalSets = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).length
    const doneSets  = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).filter(Boolean).length
    return { todoAdded: t.length, todoDone: t.filter(x=>x.completed).length, totalSets, doneSets }
  })
  const maxTodo = Math.max(...monthlyData.map(m=>m.todoAdded), 1)
  const maxSets = Math.max(...monthlyData.map(m=>m.totalSets), 1)

  const tabTitle = tab==='todo' ? '할 일' : tab==='workout' ? '운동' : '통계'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'812px', background:'#f2f2f7', overflow:'hidden' }}>

      {/* Status Bar */}
      <div style={{ height:'44px', background:'#f2f2f7', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', fontSize:'15px', fontWeight:'600' }}>
        <span>9:41</span><span>●●●</span>
      </div>

      {/* Header */}
      <div style={{ padding:'8px 20px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h1 style={{ fontSize:'34px', fontWeight:'700', color:'#000', margin:0 }}>{tabTitle}</h1>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 16px 16px', display:'flex', flexDirection:'column', gap:'12px' }}>

        {/* ════ 할일 탭 ════ */}
        {tab==='todo' && !showTodoTplForm && <>
          {/* 날짜 네비게이터 */}
          <NavCard>
            <NavBtn onClick={()=>setTodoDate(d=>addDays(d,-1))}>‹</NavBtn>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'17px', fontWeight:'700' }}>
                {todoDate.getFullYear()}년 {MONTHS[todoDate.getMonth()]} {todoDate.getDate()}일
                <span style={{ fontSize:'14px', fontWeight:'500', color:'#8e8e93', marginLeft:'4px' }}>({DAYS[todoDate.getDay()]})</span>
              </div>
              {labelForDate(todoDate) && <div style={{ fontSize:'11px', color:'#007aff', marginTop:'2px' }}>{labelForDate(todoDate)}</div>}
            </div>
            <NavBtn onClick={()=>setTodoDate(d=>addDays(d,1))}>›</NavBtn>
          </NavCard>

          {/* 할일 그룹 */}
          {groupsForDay.map(group => {
            const done     = group.tasks.filter(t=>t.completed).length
            const total    = group.tasks.length
            const expanded = expandedTodoGroup[group.id] !== false
            return (
              <div key={group.id} style={{ background:'#fff', borderRadius:'12px', overflow:'hidden', borderTop:`3px solid ${group.color}` }}>
                <div style={{ display:'flex', alignItems:'center', padding:'14px', gap:'8px' }}>
                  <div onClick={()=>setExpandedTodoGroup(p=>({...p,[group.id]:!expanded}))} style={{ display:'flex', flex:1, alignItems:'center', gap:'8px', cursor:'pointer' }}>
                    <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:group.color, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'15px', fontWeight:'700' }}>{group.name}</div>
                      <div style={{ fontSize:'11px', color: done===total&&total>0?'#34c759':'#8e8e93', marginTop:'1px' }}>{done}/{total} 완료</div>
                    </div>
                    <span style={{ color:'#8e8e93', fontSize:'14px' }}>{expanded?'▲':'▼'}</span>
                  </div>
                  <button onClick={()=>removeTodoGroup(group.id)} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer', paddingLeft:'12px' }}>제거</button>
                </div>
                <div style={{ height:'3px', background:'#e5e5ea', margin:'0 14px 4px', borderRadius:'2px' }}>
                  <div style={{ height:'3px', background:group.color, width:`${total===0?0:done/total*100}%`, borderRadius:'2px', transition:'width 0.3s' }}/>
                </div>
                {expanded && group.tasks.map((task, i) => (
                  <div key={task.id} onClick={()=>toggleGroupTask(group.id, task.id)} style={{ ...row, borderTop: i===0?'none':'0.5px solid #e5e5ea', cursor:'pointer' }}>
                    <div style={{ ...circle, background: task.completed ? group.color : 'transparent', border: task.completed ? 'none' : '2px solid #c6c6c8' }}>
                      {task.completed && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ flex:1, fontSize:'15px', color: task.completed?'#8e8e93':'#000', textDecoration: task.completed?'line-through':'none' }}>{task.text}</span>
                  </div>
                ))}
              </div>
            )
          })}

          {/* 개별 할일 */}
          {todosForDay.length > 0 && (
            <div>
              {groupsForDay.length > 0 && <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'6px', paddingLeft:'4px' }}>개인 할일</div>}
              <div style={card}>
                {todosForDay.map((todo, i) => (
                  <div key={todo.id} style={{ ...row, borderTop: i===0 ? 'none' : '0.5px solid #e5e5ea' }}>
                    <div onClick={()=>toggleTodo(todo.id)} style={{ ...circle, background: todo.completed ? '#34c759' : 'transparent', border: todo.completed ? 'none' : '2px solid #c6c6c8', cursor:'pointer' }}>
                      {todo.completed && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span onClick={()=>toggleTodo(todo.id)} style={{ flex:1, fontSize:'15px', color: todo.completed ? '#8e8e93' : '#000', textDecoration: todo.completed ? 'line-through' : 'none', cursor:'pointer' }}>{todo.text}</span>
                    <button onClick={()=>deleteTodo(todo.id)} style={delBtn}>−</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todosForDay.length === 0 && groupsForDay.length === 0 && !showTodoInput && !showTodoGroupPanel && <EmptyCard>할 일이 없습니다</EmptyCard>}

          {/* 개별 할일 입력 */}
          {showTodoInput && (
            <div style={{ ...card, flexDirection:'row', gap:'8px', alignItems:'center', padding:'12px' }}>
              <input autoFocus value={todoInput} onChange={e=>setTodoInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') addTodo(); if(e.key==='Escape') setShowTodoInput(false) }}
                placeholder="할 일 입력..." style={inputStyle} />
              <button onClick={addTodo} style={confirmBtn}>추가</button>
            </div>
          )}

          {/* 그룹 추가 패널 */}
          {showTodoGroupPanel && (
            <div style={{ ...card, padding:'16px', display:'flex', flexDirection:'column', gap:'12px' }}>
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93' }}>할일 그룹 선택</div>
              {todoTemplates.length === 0 ? (
                <div style={{ color:'#8e8e93', fontSize:'14px', textAlign:'center', padding:'8px 0' }}>저장된 그룹이 없습니다</div>
              ) : availableTodoTemplates.length === 0 ? (
                <div style={{ color:'#8e8e93', fontSize:'14px', textAlign:'center', padding:'8px 0' }}>모든 그룹이 추가되었습니다</div>
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
              {todoTemplates.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93' }}>저장된 그룹</div>
                  {todoTemplates.map(tpl => (
                    <div key={tpl.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px', background:'#f2f2f7', borderRadius:'8px', borderLeft:`3px solid ${tpl.color}` }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:tpl.color }}/>
                      <span style={{ flex:1, fontSize:'14px', fontWeight:'600' }}>{tpl.name}</span>
                      <span style={{ fontSize:'12px', color:'#8e8e93' }}>{tpl.tasks.length}개</span>
                      <button onClick={()=>openEditTodoTpl(tpl)} style={{ background:'none', border:'none', color:'#007aff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>수정</button>
                      <button onClick={()=>deleteTodoTpl(tpl.id)} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={openAddTodoTpl} style={{ background:'none', border:'1px solid #007aff', borderRadius:'10px', padding:'10px', color:'#007aff', fontWeight:'600', fontSize:'14px', cursor:'pointer' }}>
                + 새 그룹 만들기
              </button>
            </div>
          )}

          {/* 하단 추가 버튼 2종 */}
          <div style={{ display:'flex', gap:'8px' }}>
            <AddRowBtn active={showTodoInput} onClick={()=>{ setShowTodoInput(v=>!v); setShowTodoGroupPanel(false) }} style={{ flex:1 }}>
              {showTodoInput ? '✕ 닫기' : '+ 개별 추가'}
            </AddRowBtn>
            <AddRowBtn active={showTodoGroupPanel} onClick={()=>{ setShowTodoGroupPanel(v=>!v); setShowTodoInput(false) }} style={{ flex:1 }}>
              {showTodoGroupPanel ? '✕ 닫기' : '+ 그룹 추가'}
            </AddRowBtn>
          </div>
        </>}

        {/* ── 할일 그룹 템플릿 폼 ── */}
        {tab==='todo' && showTodoTplForm && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ ...card, padding:'16px', display:'flex', flexDirection:'column', gap:'0' }}>
              <div style={{ fontSize:'17px', fontWeight:'700', marginBottom:'16px' }}>{editingTodoTplId?'그룹 수정':'새 그룹 만들기'}</div>
              <input value={ttplName} onChange={e=>setTtplName(e.target.value)} placeholder="그룹 이름 (예: 아침 루틴, 청소)" style={{ ...inputStyle, flex:'none', width:'100%', boxSizing:'border-box', marginBottom:'12px' }} />
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>색상</div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={()=>setTtplColor(c)} style={{ width:'28px', height:'28px', borderRadius:'50%', background:c, border: ttplColor===c?'3px solid #000':'none', cursor:'pointer' }}/>
                ))}
              </div>
              {ttplTasks.length > 0 && (
                <div style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>항목 ({ttplTasks.length}개)</div>
                  <div style={card}>
                    {ttplTasks.map((t, i) => (
                      <div key={t.id} style={{ ...row, borderTop: i===0?'none':'0.5px solid #e5e5ea' }}>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:ttplColor, flexShrink:0 }}/>
                        <span style={{ flex:1, fontSize:'14px' }}>{t.text}</span>
                        <button onClick={()=>setTtplTasks(p=>p.filter(x=>x.id!==t.id))} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'16px', cursor:'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>항목 추가</div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
                <input ref={ttplInputRef} value={ttplInput} onChange={e=>setTtplInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addTtplTask()}
                  placeholder="할일 항목 (예: 세수, 스트레칭)" style={inputStyle} />
                <button onClick={addTtplTask} style={confirmBtn}>+</button>
              </div>
              <button onClick={saveTodoTpl} disabled={!ttplName.trim()||ttplTasks.length===0} style={{ height:'44px', background: ttplName.trim()&&ttplTasks.length>0?ttplColor:'#c6c6c8', border:'none', borderRadius:'10px', color:'#fff', fontSize:'15px', fontWeight:'600', cursor:'pointer' }}>
                {editingTodoTplId ? '수정 완료' : '그룹 저장'}
              </button>
            </div>
            <AddRowBtn active onClick={()=>setShowTodoTplForm(false)}>✕  취소</AddRowBtn>
          </div>
        )}

        {/* ════ 운동 탭 ════ */}
        {tab==='workout' && !showTemplateForm && <>
          {/* 날짜 네비게이터 */}
          <NavCard>
            <NavBtn onClick={()=>setWorkoutDate(d=>addDays(d,-1))}>‹</NavBtn>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'17px', fontWeight:'700' }}>
                {workoutDate.getFullYear()}년 {MONTHS[workoutDate.getMonth()]} {workoutDate.getDate()}일
                <span style={{ fontSize:'14px', fontWeight:'500', color:'#8e8e93', marginLeft:'4px' }}>({DAYS[workoutDate.getDay()]})</span>
              </div>
              {labelForDate(workoutDate) && <div style={{ fontSize:'11px', color:'#007aff', marginTop:'2px' }}>{labelForDate(workoutDate)}</div>}
            </div>
            <NavBtn onClick={()=>setWorkoutDate(d=>addDays(d,1))}>›</NavBtn>
          </NavCard>

          {sessionsForDay.length === 0 && !showTemplatePanel && <EmptyCard>{'오늘 운동 기록이 없습니다\n아래 버튼으로 루틴을 추가하세요'}</EmptyCard>}

          {/* 운동 세션 카드 */}
          {sessionsForDay.map(session => {
            const totalSets = session.exercises.reduce((a,e)=>a+e.sets,0)
            const doneSets  = session.exercises.reduce((a,e)=>a+e.completedSets.filter(Boolean).length,0)
            const progress  = totalSets===0 ? 0 : doneSets/totalSets
            const expanded  = expandedSession[session.id] !== false
            return (
              <div key={session.id} style={{ background:'#fff', borderRadius:'12px', overflow:'hidden', borderTop:`3px solid ${session.color}` }}>
                {/* 세션 헤더 */}
                <div style={{ display:'flex', alignItems:'center', padding:'14px', gap:'8px' }}>
                  <div onClick={()=>setExpandedSession(p=>({...p,[session.id]:!expanded}))} style={{ display:'flex', flex:1, alignItems:'center', gap:'8px', cursor:'pointer' }}>
                    <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:session.color, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'15px', fontWeight:'700' }}>{session.name}</div>
                      <div style={{ fontSize:'11px', color:'#8e8e93', marginTop:'1px' }}>{doneSets}/{totalSets} 세트</div>
                    </div>
                    <span style={{ fontSize:'13px', fontWeight:'600', color: doneSets===totalSets&&totalSets>0 ? '#34c759' : '#8e8e93' }}>{rate(doneSets,totalSets)}%</span>
                    <span style={{ color:'#8e8e93', fontSize:'14px', marginLeft:'4px' }}>{expanded?'▲':'▼'}</span>
                  </div>
                  <button onClick={()=>removeSession(session.id)} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer', paddingLeft:'12px' }}>제거</button>
                </div>
                {/* 진행 바 */}
                <div style={{ height:'3px', background:'#e5e5ea', margin:'0 14px 4px', borderRadius:'2px' }}>
                  <div style={{ height:'3px', background:session.color, width:`${progress*100}%`, borderRadius:'2px', transition:'width 0.3s' }}/>
                </div>
                {/* 운동 목록 */}
                {expanded && session.exercises.map((ex, i) => {
                  const exDone = ex.completedSets.filter(Boolean).length
                  return (
                    <div key={ex.id} style={{ padding:'12px 14px', borderTop: i===0 ? 'none' : '0.5px solid #e5e5ea' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                        <span style={{ fontSize:'15px', fontWeight:'600' }}>{ex.name}</span>
                        <span style={{ fontSize:'12px', color:'#8e8e93' }}>{exDone}/{ex.sets}세트 · {ex.reps}{ex.unit}</span>
                      </div>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        {ex.completedSets.map((done, si) => (
                          <button key={si} onClick={()=>toggleSet(session.id, ex.id, si)} style={{
                            width:'36px', height:'36px', borderRadius:'8px', border:`1.5px solid ${done ? session.color : '#c6c6c8'}`,
                            background: done ? session.color : 'transparent', color: done ? '#fff' : '#8e8e93',
                            fontSize:'13px', fontWeight:'600', cursor:'pointer',
                          }}>{done ? '✓' : si+1}</button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* 루틴 선택 패널 */}
          {showTemplatePanel && (
            <div style={{ ...card, gap:'12px' }}>
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93' }}>루틴 선택</div>
              {workoutTemplates.length === 0 ? (
                <div style={{ color:'#8e8e93', fontSize:'14px', textAlign:'center', padding:'8px 0' }}>저장된 루틴이 없습니다</div>
              ) : availableTemplates.length === 0 ? (
                <div style={{ color:'#8e8e93', fontSize:'14px', textAlign:'center', padding:'8px 0' }}>모든 루틴이 추가되었습니다</div>
              ) : (
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                  {availableTemplates.map(tpl => (
                    <button key={tpl.id} onClick={()=>applyTemplate(tpl)} style={{ display:'flex', alignItems:'center', gap:'4px', borderRadius:'14px', border:`1px solid ${tpl.color}`, background:'transparent', padding:'5px 10px', cursor:'pointer' }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:tpl.color }}/>
                      <span style={{ color:tpl.color, fontWeight:'600', fontSize:'13px' }}>{tpl.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {workoutTemplates.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginTop:'4px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93' }}>저장된 루틴</div>
                  {workoutTemplates.map(tpl => (
                    <div key={tpl.id} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px', background:'#f2f2f7', borderRadius:'8px', borderLeft:`3px solid ${tpl.color}` }}>
                      <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:tpl.color }}/>
                      <span style={{ flex:1, fontSize:'14px', fontWeight:'600' }}>{tpl.name}</span>
                      <span style={{ fontSize:'12px', color:'#8e8e93' }}>{tpl.exercises.length}종목</span>
                      <button onClick={()=>openEditTemplate(tpl)} style={{ background:'none', border:'none', color:'#007aff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>수정</button>
                      <button onClick={()=>deleteTemplate(tpl.id)} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={openAddTemplate} style={{ background:'none', border:'1px solid #007aff', borderRadius:'10px', padding:'10px', color:'#007aff', fontWeight:'600', fontSize:'14px', cursor:'pointer' }}>
                + 새 루틴 만들기
              </button>
            </div>
          )}
          <AddRowBtn active={showTemplatePanel} onClick={()=>setShowTemplatePanel(v=>!v)}>
            {showTemplatePanel ? '✕  닫기' : '+ 운동 추가하기'}
          </AddRowBtn>
        </>}

        {/* ── 운동 루틴 폼 ── */}
        {tab==='workout' && showTemplateForm && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={card}>
              <div style={{ fontSize:'17px', fontWeight:'700', marginBottom:'16px' }}>{editingTemplateId?'루틴 수정':'새 루틴 만들기'}</div>

              <input value={tplName} onChange={e=>setTplName(e.target.value)} placeholder="루틴 이름 (예: 상체 A, 하체 루틴)" style={{ ...inputStyle, marginBottom:'12px', flex:'none', width:'100%', boxSizing:'border-box' }} />

              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>색상</div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={()=>setTplColor(c)} style={{ width:'28px', height:'28px', borderRadius:'50%', background:c, border: tplColor===c ? '3px solid #000' : 'none', cursor:'pointer' }}/>
                ))}
              </div>

              {tplExercises.length > 0 && (
                <div style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>종목 ({tplExercises.length}개)</div>
                  <div style={card}>
                    {tplExercises.map((ex, i) => (
                      <div key={ex.id} style={{ ...row, borderTop: i===0?'none':'0.5px solid #e5e5ea' }}>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:tplColor, flexShrink:0 }}/>
                        <span style={{ flex:1, fontSize:'14px' }}>{ex.name}</span>
                        <span style={{ fontSize:'12px', color:'#8e8e93', marginRight:'8px' }}>{ex.sets}세트×{ex.reps}{ex.unit}</span>
                        <button onClick={()=>removeExercise(ex.id)} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'16px', cursor:'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>종목 추가</div>
              <input ref={exInputRef} value={exInput} onChange={e=>setExInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addExercise()}
                placeholder="종목명 (예: 스쿼트, 풀업)" style={{ ...inputStyle, flex:'none', width:'100%', boxSizing:'border-box', marginBottom:'8px' }} />

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
                    <button key={u} onClick={()=>setExUnit(u)} style={{ padding:'6px 8px', borderRadius:'8px', border:`1px solid ${exUnit===u?tplColor:'#c6c6c8'}`, background: exUnit===u?tplColor:'transparent', color: exUnit===u?'#fff':'#8e8e93', fontSize:'12px', cursor:'pointer' }}>{u}</button>
                  ))}
                </div>
              </div>

              <button onClick={addExercise} style={{ width:'100%', padding:'10px', background:'none', border:`1px solid ${tplColor}`, borderRadius:'10px', color:tplColor, fontWeight:'600', fontSize:'14px', cursor:'pointer', marginBottom:'16px' }}>
                + 종목 추가
              </button>

              <button onClick={saveTemplate} disabled={!tplName.trim()||tplExercises.length===0} style={{ width:'100%', height:'44px', background: tplName.trim()&&tplExercises.length>0 ? tplColor : '#c6c6c8', border:'none', borderRadius:'10px', color:'#fff', fontSize:'15px', fontWeight:'600', cursor:'pointer' }}>
                {editingTemplateId ? '수정 완료' : '루틴 저장'}
              </button>
            </div>
            <AddRowBtn active onClick={()=>setShowTemplateForm(false)}>✕  취소</AddRowBtn>
          </div>
        )}

        {/* ════ 통계 탭 ════ */}
        {tab==='stats' && <>
          {/* 검색창 */}
          <div style={{ display:'flex', alignItems:'center', background:'#fff', borderRadius:'12px', padding:'8px 12px', gap:'8px', marginTop:'0' }}>
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
                    const isTodo = r.type === 'todo'
                    const color  = isTodo ? '#007aff' : '#ff9500'
                    const done   = isTodo ? r.done : r.doneSets
                    const total  = isTodo ? r.total : r.totalSets
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
                            <span>미완 <b style={{color:'#ff3b30'}}>{r.total-r.done}</b></span>
                          </> : <>
                            <span><b style={{color:'#ff9500'}}>{r.sessions}</b>회 수행</span>
                            <span>세트 <b style={{color:'#34c759'}}>{r.doneSets}</b>/{r.totalSets}</span>
                          </>}
                        </div>
                        <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', marginTop:'8px' }}>
                          {recent.map((d,j) => {
                            const ok = isTodo ? d.completed : d.doneSets===d.totalSets
                            return <span key={j} style={{ fontSize:'10px', padding:'2px 6px', borderRadius:'6px', border:`1px solid ${ok?'#34c759':'#ff3b30'}`, color: ok?'#34c759':'#ff3b30', background: ok?'#34c75918':'#ff3b3018' }}>{d.date}</span>
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

          {/* 월간 할일 통계 */}
          <div>
            <div style={sectionLabel}>📋 할일 월간 통계</div>
            <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', display:'flex', gap:'8px' }}>
              <StatCard label="추가"   value={todosVM.length}                        color="#007aff"/>
              <StatCard label="완료"   value={todosVM.filter(t=>t.completed).length}  color="#34c759"/>
              <StatCard label="달성률" value={`${rate(todosVM.filter(t=>t.completed).length,todosVM.length)}%`} color="#ff9500"/>
            </div>
          </div>

          {/* 월간 운동 통계 */}
          <div>
            <div style={sectionLabel}>🏋️ 운동 월간 통계</div>
            <div style={{ background:'#fff', borderRadius:'12px', padding:'16px', display:'flex', gap:'8px' }}>
              <StatCard label="운동일"  value={sessionsVM.length}   color="#ff9500"/>
              <StatCard label="완료세트" value={doneSetsVM.length}  color="#34c759"/>
              <StatCard label="달성률"  value={`${rate(doneSetsVM.length,allSetsVM.length)}%`} color="#007aff"/>
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
                  const tH = Math.max((m.todoAdded/maxTodo)*60, m.todoAdded>0?4:0)
                  const tdH = m.todoDone>0?(m.todoDone/m.todoAdded)*tH:0
                  const wH = Math.max((m.totalSets/maxSets)*60, m.totalSets>0?4:0)
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
                      <span style={{ fontSize:'9px', color: i===viewMonth?'#007aff':'#8e8e93', fontWeight: i===viewMonth?'700':'400', marginTop:'3px' }}>{i+1}월</span>
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
        </>}
      </div>

      {/* Tab Bar */}
      <div style={{ height:'83px', background:'rgba(242,242,247,0.95)', borderTop:'0.5px solid #c6c6c8', display:'flex', alignItems:'flex-start', paddingTop:'10px' }}>
        {[
          { key:'todo',    label:'할 일', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="11" width="16" height="2.5" rx="1.25" fill="currentColor"/><rect x="4" y="17" width="10" height="2.5" rx="1.25" fill="currentColor"/></svg> },
          { key:'workout', label:'운동',  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="11" width="3" height="2" rx="1" fill="currentColor"/><rect x="19" y="11" width="3" height="2" rx="1" fill="currentColor"/><rect x="5" y="8" width="2" height="8" rx="1" fill="currentColor"/><rect x="17" y="8" width="2" height="8" rx="1" fill="currentColor"/><rect x="7" y="10" width="10" height="4" rx="2" fill="currentColor"/></svg> },
          { key:'stats',   label:'통계',  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="13" width="4" height="7" rx="1" fill="currentColor"/><rect x="10" y="9" width="4" height="11" rx="1" fill="currentColor"/><rect x="16" y="5" width="4" height="15" rx="1" fill="currentColor"/></svg> },
        ].map(t => (
          <button key={t.key} onClick={()=>{setTab(t.key);setShowTemplateForm(false)}} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'3px', background:'none', border:'none', cursor:'pointer', color: tab===t.key?'#007aff':'#8e8e93' }}>
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
    <button onClick={onClick} disabled={disabled} style={{ width: small?'24px':'32px', height: small?'24px':'32px', borderRadius:'50%', background: disabled?'transparent':'#f2f2f7', border:'none', color: disabled?'#c6c6c8':'#007aff', fontSize: small?'16px':'20px', fontWeight:'600', cursor: disabled?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {children}
    </button>
  )
}
function EmptyCard({ children }) {
  return <div style={{ background:'#fff', borderRadius:'12px', padding:'24px', color:'#8e8e93', textAlign:'center', fontSize:'15px', whiteSpace:'pre-line' }}>{children}</div>
}
function AddRowBtn({ children, onClick, active, style: extraStyle }) {
  return (
    <button onClick={onClick} style={{ background:'#fff', borderRadius:'12px', padding:'16px', textAlign:'center', border:`1px ${active?'solid':'dashed'} ${active?'#ff3b30':'#e5e5ea'}`, fontSize:'15px', fontWeight:'600', color: active?'#ff3b30':'#007aff', cursor:'pointer', width:'100%', ...extraStyle }}>
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
