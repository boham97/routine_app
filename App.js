import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const MONTHS  = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DAYS    = ['일','월','화','수','목','금','토']
const PALETTE = ['#ff9500','#007aff','#34c759','#ff3b30','#af52de','#5ac8fa','#ff2d55','#a2845e']
const UNITS   = ['회','초','분','km']

function dateKey(d) {
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }
function getToday()       { const d = new Date(); d.setHours(0,0,0,0); return d }

export default function App() {

  // ── 공통 ──────────────────────────────────────────────────
  const [tab,      setTab]      = useState('todo')
  const [loaded,   setLoaded]   = useState(false)

  // ── 할일 ──────────────────────────────────────────────────
  const [todos,     setTodos]     = useState([])
  const [todoDate,  setTodoDate]  = useState(getToday())
  const [todoInput, setTodoInput] = useState('')
  const [showTodoInput, setShowTodoInput] = useState(false)

  // ── 운동 ──────────────────────────────────────────────────
  const [workoutTemplates,  setWorkoutTemplates]  = useState([])
  const [workoutSessions,   setWorkoutSessions]   = useState([])
  const [workoutDate,       setWorkoutDate]       = useState(getToday())
  const [expandedSession,   setExpandedSession]   = useState({})
  const [showTemplatePanel, setShowTemplatePanel] = useState(false)

  // 운동 템플릿 폼
  const [showTemplateForm,  setShowTemplateForm]  = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState(null)
  const [tplName,  setTplName]  = useState('')
  const [tplColor, setTplColor] = useState(PALETTE[0])
  const [tplExercises, setTplExercises] = useState([])
  const [exInput,  setExInput]  = useState('')
  const [exSets,   setExSets]   = useState('3')
  const [exReps,   setExReps]   = useState('10')
  const [exUnit,   setExUnit]   = useState('회')
  const exInputRef = useRef(null)

  // ── 통계 ──────────────────────────────────────────────────
  const now = new Date()
  const thisYear = now.getFullYear(); const thisMonth = now.getMonth()
  const [viewYear,    setViewYear]    = useState(thisYear)
  const [viewMonth,   setViewMonth]   = useState(thisMonth)
  const [statsSearch, setStatsSearch] = useState('')

  // ── 저장/불러오기 ──────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('todos'),
      AsyncStorage.getItem('workoutTemplates'),
      AsyncStorage.getItem('workoutSessions'),
    ]).then(([t, wt, ws]) => {
      if (t)  try { setTodos(JSON.parse(t))             } catch {}
      if (wt) try { setWorkoutTemplates(JSON.parse(wt)) } catch {}
      if (ws) try { setWorkoutSessions(JSON.parse(ws))  } catch {}
      setLoaded(true)
    })
  }, [])

  useEffect(() => { if (loaded) AsyncStorage.setItem('todos',            JSON.stringify(todos))            }, [todos,            loaded])
  useEffect(() => { if (loaded) AsyncStorage.setItem('workoutTemplates', JSON.stringify(workoutTemplates)) }, [workoutTemplates, loaded])
  useEffect(() => { if (loaded) AsyncStorage.setItem('workoutSessions',  JSON.stringify(workoutSessions))  }, [workoutSessions,  loaded])

  // ── 날짜 helpers ───────────────────────────────────────────
  const todayKey = dateKey(getToday())
  const todoKey     = dateKey(todoDate)
  const workoutKey  = dateKey(workoutDate)

  const labelForDate = d => {
    const key = dateKey(d)
    if (key === todayKey)                         return '오늘'
    if (key === dateKey(addDays(getToday(), -1))) return '어제'
    if (key === dateKey(addDays(getToday(),  1))) return '내일'
    return null
  }

  // ── 할일 CRUD ──────────────────────────────────────────────
  function addTodo() {
    const text = todoInput.trim(); if (!text) return
    const createdAt = new Date(todoDate); createdAt.setHours(12,0,0,0)
    setTodos(prev => [...prev, { id: Date.now(), text, completed: false, createdAt: createdAt.toISOString(), completedAt: null }])
    setTodoInput(''); setShowTodoInput(false)
  }
  function toggleTodo(id) {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t
    ))
  }
  function deleteTodo(id) { setTodos(prev => prev.filter(t => t.id !== id)) }

  const todosForDay = todos.filter(t => dateKey(t.createdAt) === todoKey)

  // ── 운동 템플릿 CRUD ───────────────────────────────────────
  function openAddTemplate() {
    setEditingTemplateId(null)
    setTplName(''); setTplColor(PALETTE[0]); setTplExercises([])
    setExInput(''); setExSets('3'); setExReps('10'); setExUnit('회')
    setShowTemplateForm(true); setShowTemplatePanel(false)
  }
  function openEditTemplate(tpl) {
    setEditingTemplateId(tpl.id)
    setTplName(tpl.name); setTplColor(tpl.color); setTplExercises([...tpl.exercises])
    setExInput(''); setExSets('3'); setExReps('10'); setExUnit('회')
    setShowTemplateForm(true); setShowTemplatePanel(false)
  }
  function addExercise() {
    const name = exInput.trim(); if (!name) return
    const sets = parseInt(exSets) || 3
    const reps = parseInt(exReps) || 10
    setTplExercises(prev => [...prev, { id: Date.now(), name, sets, reps, unit: exUnit }])
    setExInput(''); setExSets('3'); setExReps('10'); setExUnit('회')
    setTimeout(() => exInputRef.current?.focus(), 50)
  }
  function removeExercise(id) { setTplExercises(prev => prev.filter(e => e.id !== id)) }
  function saveTemplate() {
    if (!tplName.trim() || tplExercises.length === 0) return
    if (editingTemplateId) {
      setWorkoutTemplates(prev => prev.map(t =>
        t.id === editingTemplateId
          ? { ...t, name: tplName.trim(), color: tplColor, exercises: [...tplExercises] }
          : t
      ))
    } else {
      setWorkoutTemplates(prev => [...prev, { id: Date.now(), name: tplName.trim(), color: tplColor, exercises: [...tplExercises] }])
    }
    setShowTemplateForm(false); setEditingTemplateId(null)
  }
  function deleteTemplate(id) {
    setWorkoutTemplates(prev => prev.filter(t => t.id !== id))
    setWorkoutSessions(prev => prev.filter(s => s.templateId !== id))
  }

  // ── 운동 세션 CRUD ─────────────────────────────────────────
  function applyTemplate(tpl) {
    // 같은 날짜에 같은 템플릿 중복 방지
    if (workoutSessions.find(s => s.templateId === tpl.id && s.date === workoutKey)) return
    const session = {
      id: Date.now(),
      templateId: tpl.id,
      name: tpl.name,
      color: tpl.color,
      date: workoutKey,
      exercises: tpl.exercises.map(e => ({
        ...e,
        completedSets: Array(e.sets).fill(false),
      })),
    }
    setWorkoutSessions(prev => [...prev, session])
    setExpandedSession(prev => ({ ...prev, [session.id]: true }))
    setShowTemplatePanel(false)
  }
  function removeSession(id) {
    setWorkoutSessions(prev => prev.filter(s => s.id !== id))
  }
  function toggleSet(sessionId, exerciseId, setIdx) {
    setWorkoutSessions(prev => prev.map(s =>
      s.id !== sessionId ? s : {
        ...s,
        exercises: s.exercises.map(e =>
          e.id !== exerciseId ? e : {
            ...e,
            completedSets: e.completedSets.map((v, i) => i === setIdx ? !v : v),
          }
        ),
      }
    ))
  }

  const sessionsForDay = workoutSessions.filter(s => s.date === workoutKey)
  const appliedTemplateIds = sessionsForDay.map(s => s.templateId)
  const availableTemplates = workoutTemplates.filter(t => !appliedTemplateIds.includes(t.id))

  // ── 통계 ───────────────────────────────────────────────────
  const isCurrentMonth = viewYear === thisYear && viewMonth === thisMonth
  function prevMonth() { viewMonth===0?(setViewMonth(11),setViewYear(y=>y-1)):setViewMonth(m=>m-1) }
  function nextMonth() { viewMonth===11?(setViewMonth(0),setViewYear(y=>y+1)):setViewMonth(m=>m+1) }

  const todosVM = todos.filter(t => { const d=new Date(t.createdAt); return d.getFullYear()===viewYear&&d.getMonth()===viewMonth })
  const todosVY = todos.filter(t => new Date(t.createdAt).getFullYear()===viewYear)

  // 운동 통계: 세션의 exercises 기준
  const sessionsVM = workoutSessions.filter(s => { const d=new Date(s.date); return d.getFullYear()===viewYear&&d.getMonth()===viewMonth })
  const allSetsVM  = sessionsVM.flatMap(s => s.exercises.flatMap(e => e.completedSets))
  const doneSetsVM = allSetsVM.filter(Boolean)

  const rate = (done,total) => total===0?0:Math.round((done/total)*100)

  const monthlyData = MONTHS.map((_,mi) => {
    const t = todos.filter(t=>{ const d=new Date(t.createdAt); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    const s = workoutSessions.filter(s=>{ const d=new Date(s.date); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    const totalSets = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).length
    const doneSets  = s.flatMap(x=>x.exercises.flatMap(e=>e.completedSets)).filter(Boolean).length
    return { todoAdded: t.length, todoDone: t.filter(x=>x.completed).length, totalSets, doneSets }
  })
  const maxTodo = Math.max(...monthlyData.map(m=>m.todoAdded), 1)
  const maxSets = Math.max(...monthlyData.map(m=>m.totalSets), 1)

  // ── Render ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f2f7" />
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>
            {tab==='todo'?'할 일':tab==='workout'?'운동':'통계'}
          </Text>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={{paddingBottom:24}}>

          {/* ════ 할일 탭 ════ */}
          {tab==='todo' && (
            <View style={{gap:12}}>

              {/* 날짜 네비게이터 */}
              <View style={s.navCard}>
                <NavBtn onPress={()=>setTodoDate(d=>addDays(d,-1))}>‹</NavBtn>
                <View style={{alignItems:'center'}}>
                  <Text style={s.navTitle}>
                    {todoDate.getFullYear()}년 {MONTHS[todoDate.getMonth()]} {todoDate.getDate()}일
                    {'  '}<Text style={s.navDay}>({DAYS[todoDate.getDay()]})</Text>
                  </Text>
                  {labelForDate(todoDate)&&<Text style={s.navSub}>{labelForDate(todoDate)}</Text>}
                </View>
                <NavBtn onPress={()=>setTodoDate(d=>addDays(d,1))}>›</NavBtn>
              </View>

              {/* 할일 목록 */}
              {todosForDay.length > 0 && (
                <View style={s.listCard}>
                  {todosForDay.map((todo,i) => (
                    <View key={todo.id} style={[s.todoRow, i>0&&s.rowDivider]}>
                      <TouchableOpacity onPress={()=>toggleTodo(todo.id)}
                        style={[s.circle, todo.completed&&s.circleDone]}>
                        {todo.completed&&<Text style={s.check}>✓</Text>}
                      </TouchableOpacity>
                      <Text style={[s.todoText, todo.completed&&s.todoTextDone]}>{todo.text}</Text>
                      <TouchableOpacity onPress={()=>deleteTodo(todo.id)} style={s.deleteBtn}>
                        <Text style={s.deleteBtnText}>−</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {todosForDay.length === 0 && !showTodoInput && (
                <View style={s.emptyCard}>
                  <Text style={s.emptyText}>할 일이 없습니다</Text>
                </View>
              )}

              {/* 할일 입력 폼 */}
              {showTodoInput && (
                <View style={s.inputCard}>
                  <TextInput
                    autoFocus
                    value={todoInput}
                    onChangeText={setTodoInput}
                    onSubmitEditing={addTodo}
                    placeholder="할 일 입력..."
                    returnKeyType="done"
                    style={s.textInput}
                  />
                  <TouchableOpacity onPress={addTodo} style={s.addConfirmBtn}>
                    <Text style={s.addConfirmText}>추가</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 추가 버튼 */}
              <TouchableOpacity
                onPress={()=>setShowTodoInput(v=>!v)}
                style={[s.addRowBtn, showTodoInput&&s.addRowBtnActive]}>
                <Text style={[s.addRowBtnText, showTodoInput&&{color:'#ff3b30'}]}>
                  {showTodoInput ? '✕  닫기' : '+ 할일 추가하기'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ════ 운동 탭 ════ */}
          {tab==='workout' && !showTemplateForm && (
            <View style={{gap:12}}>

              {/* 날짜 네비게이터 */}
              <View style={s.navCard}>
                <NavBtn onPress={()=>setWorkoutDate(d=>addDays(d,-1))}>‹</NavBtn>
                <View style={{alignItems:'center'}}>
                  <Text style={s.navTitle}>
                    {workoutDate.getFullYear()}년 {MONTHS[workoutDate.getMonth()]} {workoutDate.getDate()}일
                    {'  '}<Text style={s.navDay}>({DAYS[workoutDate.getDay()]})</Text>
                  </Text>
                  {labelForDate(workoutDate)&&<Text style={s.navSub}>{labelForDate(workoutDate)}</Text>}
                </View>
                <NavBtn onPress={()=>setWorkoutDate(d=>addDays(d,1))}>›</NavBtn>
              </View>

              {/* 오늘 세션 목록 */}
              {sessionsForDay.length === 0 && !showTemplatePanel && (
                <View style={s.emptyCard}>
                  <Text style={s.emptyText}>{'오늘 운동 기록이 없습니다\n아래 버튼으로 루틴을 추가하세요'}</Text>
                </View>
              )}

              {sessionsForDay.map(session => {
                const totalSets = session.exercises.reduce((acc,e)=>acc+e.sets,0)
                const doneSets  = session.exercises.reduce((acc,e)=>acc+e.completedSets.filter(Boolean).length,0)
                const progress  = totalSets===0?0:doneSets/totalSets
                const expanded  = expandedSession[session.id] !== false
                return (
                  <View key={session.id} style={[s.sessionCard, {borderTopColor:session.color}]}>
                    <View style={s.sessionHeader}>
                      <TouchableOpacity
                        onPress={()=>setExpandedSession(prev=>({...prev,[session.id]:!expanded}))}
                        style={{flex:1,flexDirection:'row',alignItems:'center',gap:8}}>
                        <View style={[s.dot, {backgroundColor:session.color,width:10,height:10,borderRadius:5}]}/>
                        <View style={{flex:1}}>
                          <Text style={s.sessionName}>{session.name}</Text>
                          <Text style={{fontSize:11,color:'#8e8e93',marginTop:1}}>
                            {doneSets}/{totalSets} 세트
                          </Text>
                        </View>
                        <Text style={{color:doneSets===totalSets&&totalSets>0?'#34c759':'#8e8e93',fontSize:13,fontWeight:'600'}}>
                          {rate(doneSets,totalSets)}%
                        </Text>
                        <Text style={{color:'#8e8e93',fontSize:14}}>{expanded?'▲':'▼'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={()=>removeSession(session.id)} style={{paddingLeft:12,paddingVertical:4}}>
                        <Text style={{color:'#ff3b30',fontSize:13,fontWeight:'600'}}>제거</Text>
                      </TouchableOpacity>
                    </View>

                    {/* 진행 바 */}
                    <View style={s.progressBg}>
                      <View style={[s.progressFill,{width:`${progress*100}%`,backgroundColor:session.color}]}/>
                    </View>

                    {/* 운동 목록 */}
                    {expanded && session.exercises.map((ex,i) => {
                      const exDone = ex.completedSets.filter(Boolean).length
                      return (
                        <View key={ex.id} style={[s.exRow, i>0&&s.rowDivider]}>
                          <View style={{flex:1}}>
                            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                              <Text style={s.exName}>{ex.name}</Text>
                              <Text style={{fontSize:12,color:'#8e8e93'}}>
                                {exDone}/{ex.sets}세트 완료 · {ex.reps}{ex.unit}
                              </Text>
                            </View>
                            {/* 세트 체크박스 */}
                            <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
                              {ex.completedSets.map((done,si) => (
                                <TouchableOpacity
                                  key={si}
                                  onPress={()=>toggleSet(session.id, ex.id, si)}
                                  style={[s.setBox, done&&{backgroundColor:session.color,borderColor:session.color}]}>
                                  <Text style={[s.setBoxText, done&&{color:'#fff'}]}>
                                    {done ? '✓' : `${si+1}`}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )
              })}

              {/* 루틴 선택 패널 */}
              {showTemplatePanel && (
                <View style={s.templatePanel}>
                  <Text style={s.formTitle}>루틴 선택</Text>
                  {workoutTemplates.length === 0 ? (
                    <Text style={{color:'#8e8e93',fontSize:14,textAlign:'center',paddingVertical:8}}>
                      저장된 루틴이 없습니다
                    </Text>
                  ) : availableTemplates.length === 0 ? (
                    <Text style={{color:'#8e8e93',fontSize:14,textAlign:'center',paddingVertical:8}}>
                      모든 루틴이 추가되었습니다
                    </Text>
                  ) : (
                    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                      {availableTemplates.map(tpl => (
                        <TouchableOpacity key={tpl.id}
                          onPress={()=>applyTemplate(tpl)}
                          style={[s.chip,{borderColor:tpl.color}]}>
                          <View style={[s.dot,{backgroundColor:tpl.color}]}/>
                          <Text style={[s.chipText,{color:tpl.color,fontWeight:'600'}]}>{tpl.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {/* 루틴 목록 관리 */}
                  {workoutTemplates.length > 0 && (
                    <View style={{marginTop:12,gap:6}}>
                      <Text style={s.formTitle}>저장된 루틴</Text>
                      {workoutTemplates.map(tpl => (
                        <View key={tpl.id} style={[s.tplRow,{borderLeftColor:tpl.color}]}>
                          <View style={[s.dot,{backgroundColor:tpl.color}]}/>
                          <Text style={{flex:1,fontSize:14,fontWeight:'600',color:'#000'}}>{tpl.name}</Text>
                          <Text style={{fontSize:12,color:'#8e8e93'}}>{tpl.exercises.length}종목</Text>
                          <TouchableOpacity onPress={()=>openEditTemplate(tpl)} style={{paddingHorizontal:8}}>
                            <Text style={{color:'#007aff',fontSize:13,fontWeight:'600'}}>수정</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={()=>deleteTemplate(tpl.id)}>
                            <Text style={{color:'#ff3b30',fontSize:13,fontWeight:'600'}}>삭제</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity onPress={openAddTemplate} style={[s.addRowBtn,{marginTop:10,borderStyle:'solid',borderColor:tplColor||'#007aff'}]}>
                    <Text style={[s.addRowBtnText,{color:'#007aff'}]}>+ 새 루틴 만들기</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                onPress={()=>setShowTemplatePanel(v=>!v)}
                style={[s.addRowBtn, showTemplatePanel&&s.addRowBtnActive]}>
                <Text style={[s.addRowBtnText, showTemplatePanel&&{color:'#ff3b30'}]}>
                  {showTemplatePanel ? '✕  닫기' : '+ 운동 추가하기'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── 운동 루틴 폼 ── */}
          {tab==='workout' && showTemplateForm && (
            <View style={{gap:12}}>
              <View style={s.formCard}>
                <Text style={s.formCardTitle}>{editingTemplateId?'루틴 수정':'새 루틴 만들기'}</Text>

                {/* 루틴 이름 */}
                <TextInput
                  value={tplName} onChangeText={setTplName}
                  placeholder="루틴 이름 (예: 상체 A, 하체 루틴)"
                  style={[s.textInput,{marginBottom:12}]}
                />

                {/* 색상 선택 */}
                <Text style={s.formTitle}>색상</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{gap:8,marginBottom:16}}>
                  {PALETTE.map(c=>(
                    <TouchableOpacity key={c} onPress={()=>setTplColor(c)}
                      style={[s.colorDot,{backgroundColor:c},tplColor===c&&s.colorDotOn]}/>
                  ))}
                </ScrollView>

                {/* 추가된 종목 */}
                {tplExercises.length > 0 && (
                  <View style={{marginBottom:12}}>
                    <Text style={s.formTitle}>종목 ({tplExercises.length}개)</Text>
                    <View style={s.listCard}>
                      {tplExercises.map((ex,i)=>(
                        <View key={ex.id} style={[s.exPreviewRow, i>0&&s.rowDivider]}>
                          <View style={[s.dot,{backgroundColor:tplColor}]}/>
                          <Text style={{flex:1,fontSize:14,color:'#000'}}>{ex.name}</Text>
                          <Text style={{fontSize:12,color:'#8e8e93',marginRight:8}}>
                            {ex.sets}세트×{ex.reps}{ex.unit}
                          </Text>
                          <TouchableOpacity onPress={()=>removeExercise(ex.id)}>
                            <Text style={{color:'#ff3b30',fontSize:16}}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 종목 추가 입력 */}
                <Text style={s.formTitle}>종목 추가</Text>
                <TextInput
                  ref={exInputRef}
                  value={exInput} onChangeText={setExInput}
                  placeholder="종목명 (예: 스쿼트, 풀업)"
                  style={[s.textInput,{marginBottom:8}]}
                  returnKeyType="done"
                  onSubmitEditing={addExercise}
                />
                <View style={{flexDirection:'row',gap:8,marginBottom:8}}>
                  <View style={s.numInputWrap}>
                    <Text style={s.numLabel}>세트</Text>
                    <TextInput
                      value={exSets} onChangeText={setExSets}
                      keyboardType="number-pad" style={s.numInput}
                    />
                  </View>
                  <Text style={{fontSize:18,color:'#8e8e93',alignSelf:'flex-end',paddingBottom:8}}>×</Text>
                  <View style={s.numInputWrap}>
                    <Text style={s.numLabel}>횟수</Text>
                    <TextInput
                      value={exReps} onChangeText={setExReps}
                      keyboardType="number-pad" style={s.numInput}
                    />
                  </View>
                  {/* 단위 선택 */}
                  <View style={{flexDirection:'row',gap:4,alignSelf:'flex-end',marginBottom:4}}>
                    {UNITS.map(u=>(
                      <TouchableOpacity key={u} onPress={()=>setExUnit(u)}
                        style={[s.unitBtn,exUnit===u&&{backgroundColor:tplColor,borderColor:tplColor}]}>
                        <Text style={[s.unitBtnText,exUnit===u&&{color:'#fff'}]}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TouchableOpacity onPress={addExercise}
                  style={[s.addRowBtn,{borderStyle:'solid',borderColor:tplColor,marginBottom:16}]}>
                  <Text style={[s.addRowBtnText,{color:tplColor}]}>+ 종목 추가</Text>
                </TouchableOpacity>

                {/* 저장 */}
                <TouchableOpacity
                  onPress={saveTemplate}
                  style={[s.saveBtn,{backgroundColor:tplName.trim()&&tplExercises.length>0?tplColor:'#c6c6c8'}]}>
                  <Text style={s.saveBtnText}>{editingTemplateId?'수정 완료':'루틴 저장'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={()=>setShowTemplateForm(false)} style={s.addRowBtn}>
                <Text style={[s.addRowBtnText,{color:'#ff3b30'}]}>✕  취소</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ════ 통계 탭 ════ */}
          {tab==='stats' && (
            <View style={{gap:16}}>

              {/* 세부 작업 검색 */}
              <View style={s.searchBox}>
                <Text style={s.searchIcon}>🔍</Text>
                <TextInput
                  value={statsSearch} onChangeText={setStatsSearch}
                  placeholder="운동/할일 검색..."
                  style={s.searchInput}
                />
                {statsSearch.length>0&&(
                  <TouchableOpacity onPress={()=>setStatsSearch('')} style={{padding:4}}>
                    <Text style={{color:'#8e8e93',fontSize:16}}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 검색 결과 */}
              {statsSearch.trim().length>0 && (()=>{
                const q = statsSearch.trim().toLowerCase()
                // 할일 검색
                const matchedTodos = todos.filter(t=>t.text.toLowerCase().includes(q))
                const todoMap = {}
                matchedTodos.forEach(t=>{
                  if(!todoMap[t.text]) todoMap[t.text]={text:t.text,type:'todo',total:0,done:0,dates:[]}
                  todoMap[t.text].total++
                  if(t.completed) todoMap[t.text].done++
                  todoMap[t.text].dates.push({date:dateKey(t.createdAt),completed:t.completed})
                })
                // 운동 검색
                const exMap = {}
                workoutSessions.forEach(s=>{
                  s.exercises.forEach(e=>{
                    if(!e.name.toLowerCase().includes(q)) return
                    const key = e.name
                    if(!exMap[key]) exMap[key]={text:key,type:'workout',totalSets:0,doneSets:0,sessions:0,dates:[]}
                    exMap[key].totalSets += e.sets
                    exMap[key].doneSets  += e.completedSets.filter(Boolean).length
                    exMap[key].sessions++
                    exMap[key].dates.push({date:s.date,doneSets:e.completedSets.filter(Boolean).length,totalSets:e.sets})
                  })
                })
                const results = [...Object.values(todoMap), ...Object.values(exMap)].sort((a,b)=>(b.total||b.sessions)-(a.total||a.sessions))
                if(results.length===0) return(
                  <View style={s.emptyCard}><Text style={s.emptyText}>검색 결과가 없습니다</Text></View>
                )
                return(
                  <View>
                    <Text style={s.sectionLabel}>"{statsSearch}" 검색 결과</Text>
                    <View style={{gap:8}}>
                      {results.map((r,i)=>{
                        const isTodo = r.type==='todo'
                        const color  = isTodo?'#007aff':'#ff9500'
                        const done   = isTodo?r.done:r.doneSets
                        const total  = isTodo?r.total:r.totalSets
                        const progress = total===0?0:done/total
                        const recent = [...r.dates].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5)
                        return(
                          <View key={i} style={[s.statDetailCard,{borderLeftColor:color}]}>
                            <View style={s.statDetailHeader}>
                              <View style={{flex:1}}>
                                <Text style={s.statDetailName}>{r.text}</Text>
                                <Text style={{fontSize:11,color,marginTop:1}}>
                                  {isTodo?'할일':'운동'}
                                </Text>
                              </View>
                              <Text style={[s.statDetailRate,{color}]}>{rate(done,total)}%</Text>
                            </View>
                            <View style={s.progressBg}>
                              <View style={[s.progressFill,{width:`${progress*100}%`,backgroundColor:color}]}/>
                            </View>
                            <View style={s.statNums}>
                              {isTodo?(
                                <>
                                  <Text style={s.statNum}>총 <Text style={{color:'#007aff',fontWeight:'700'}}>{r.total}</Text>회</Text>
                                  <Text style={s.statNum}>완료 <Text style={{color:'#34c759',fontWeight:'700'}}>{r.done}</Text></Text>
                                  <Text style={s.statNum}>미완 <Text style={{color:'#ff3b30',fontWeight:'700'}}>{r.total-r.done}</Text></Text>
                                </>
                              ):(
                                <>
                                  <Text style={s.statNum}>총 <Text style={{color:'#ff9500',fontWeight:'700'}}>{r.sessions}</Text>회 수행</Text>
                                  <Text style={s.statNum}>세트 <Text style={{color:'#34c759',fontWeight:'700'}}>{r.doneSets}</Text>/{r.totalSets}</Text>
                                </>
                              )}
                            </View>
                            <View style={{flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:6}}>
                              {recent.map((d,j)=>{
                                const ok = isTodo?d.completed:(d.doneSets===d.totalSets)
                                return(
                                  <View key={j} style={[s.dateChip,{borderColor:ok?'#34c759':'#ff3b30',backgroundColor:ok?'#34c75918':'#ff3b3018'}]}>
                                    <Text style={{fontSize:10,color:ok?'#34c759':'#ff3b30'}}>{d.date}</Text>
                                  </View>
                                )
                              })}
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )
              })()}

              {/* 월 네비게이터 */}
              <View style={s.navCard}>
                <NavBtn onPress={prevMonth}>‹</NavBtn>
                <View style={{alignItems:'center'}}>
                  <Text style={s.navTitle}>{viewYear}년 {MONTHS[viewMonth]}</Text>
                  {isCurrentMonth&&<Text style={s.navSub}>이번 달</Text>}
                </View>
                <NavBtn onPress={nextMonth} disabled={isCurrentMonth}>›</NavBtn>
              </View>

              {/* 월간 할일 통계 */}
              <View>
                <Text style={s.sectionLabel}>📋 할일 월간 통계</Text>
                <View style={s.statRow}>
                  <StatCard label="추가"   value={todosVM.length}                        color="#007aff"/>
                  <StatCard label="완료"   value={todosVM.filter(t=>t.completed).length}  color="#34c759"/>
                  <StatCard label="달성률" value={`${rate(todosVM.filter(t=>t.completed).length,todosVM.length)}%`} color="#ff9500"/>
                </View>
              </View>

              {/* 월간 운동 통계 */}
              <View>
                <Text style={s.sectionLabel}>🏋️ 운동 월간 통계</Text>
                <View style={s.statRow}>
                  <StatCard label="운동일"  value={sessionsVM.length}     color="#ff9500"/>
                  <StatCard label="완료세트" value={doneSetsVM.length}    color="#34c759"/>
                  <StatCard label="달성률"  value={`${rate(doneSetsVM.length,allSetsVM.length)}%`} color="#007aff"/>
                </View>
              </View>

              {/* 운동별 월간 통계 */}
              {sessionsVM.length > 0 && (()=>{
                const exMap = {}
                sessionsVM.forEach(s=>{
                  s.exercises.forEach(e=>{
                    if(!exMap[e.name]) exMap[e.name]={name:e.name,color:s.color,totalSets:0,doneSets:0,count:0}
                    exMap[e.name].totalSets += e.sets
                    exMap[e.name].doneSets  += e.completedSets.filter(Boolean).length
                    exMap[e.name].count++
                  })
                })
                const list = Object.values(exMap).sort((a,b)=>b.count-a.count)
                return(
                  <View>
                    <Text style={s.sectionLabel}>종목별 월간 달성률</Text>
                    <View style={{gap:8}}>
                      {list.map((ex,i)=>(
                        <View key={i} style={[s.statDetailCard,{borderLeftColor:ex.color}]}>
                          <View style={s.statDetailHeader}>
                            <Text style={s.statDetailName}>{ex.name}</Text>
                            <Text style={[s.statDetailRate,{color:ex.color}]}>{rate(ex.doneSets,ex.totalSets)}%</Text>
                          </View>
                          <View style={s.progressBg}>
                            <View style={[s.progressFill,{width:`${(ex.doneSets/ex.totalSets)*100}%`,backgroundColor:ex.color}]}/>
                          </View>
                          <View style={s.statNums}>
                            <Text style={s.statNum}>{ex.count}회 수행</Text>
                            <Text style={s.statNum}>세트 <Text style={{color:'#34c759',fontWeight:'700'}}>{ex.doneSets}</Text>/{ex.totalSets}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )
              })()}

              {/* 연간 통계 */}
              <View>
                <View style={s.sectionLabelRow}>
                  <Text style={s.sectionLabel}>연간 통계 ({viewYear}년)</Text>
                  <View style={{flexDirection:'row',gap:4}}>
                    <NavBtn small onPress={()=>setViewYear(y=>y-1)}>‹</NavBtn>
                    <NavBtn small onPress={()=>setViewYear(y=>y+1)} disabled={viewYear>=thisYear}>›</NavBtn>
                  </View>
                </View>
                <View style={s.statRow}>
                  <StatCard label="할일추가" value={todosVY.length}                        color="#007aff"/>
                  <StatCard label="할일완료" value={todosVY.filter(t=>t.completed).length}  color="#34c759"/>
                  <StatCard label="운동일수" value={new Set(workoutSessions.filter(s=>new Date(s.date).getFullYear()===viewYear).map(s=>s.date)).size} color="#ff9500"/>
                </View>
              </View>

              {/* 월별 막대 그래프 */}
              <View>
                <Text style={s.sectionLabel}>월별 현황 ({viewYear}년)</Text>
                <View style={s.chartCard}>
                  <View style={s.chartBars}>
                    {monthlyData.map((m,i)=>{
                      const barH=Math.max((m.todoAdded/maxTodo)*60,m.todoAdded>0?4:0)
                      const doneH=m.todoDone>0?(m.todoDone/m.todoAdded)*barH:0
                      const wH=Math.max((m.totalSets/maxSets)*60,m.totalSets>0?4:0)
                      const wDoneH=m.doneSets>0?(m.doneSets/m.totalSets)*wH:0
                      return(
                        <TouchableOpacity key={i} onPress={()=>setViewMonth(i)} style={s.barCol}>
                          <View style={{height:60,justifyContent:'flex-end',flexDirection:'row',alignItems:'flex-end',gap:2,width:'100%'}}>
                            {/* 할일 바 */}
                            {m.todoAdded>0&&(
                              <View style={{flex:1,height:barH}}>
                                <View style={[StyleSheet.absoluteFill,{backgroundColor:i===viewMonth?'#a0c4ff':'#d1e4ff',borderRadius:3}]}/>
                                {m.todoDone>0&&<View style={{position:'absolute',bottom:0,left:0,right:0,height:doneH,backgroundColor:'#34c759',borderRadius:3}}/>}
                              </View>
                            )}
                            {/* 운동 바 */}
                            {m.totalSets>0&&(
                              <View style={{flex:1,height:wH}}>
                                <View style={[StyleSheet.absoluteFill,{backgroundColor:i===viewMonth?'#ffd080':'#ffe5b4',borderRadius:3}]}/>
                                {m.doneSets>0&&<View style={{position:'absolute',bottom:0,left:0,right:0,height:wDoneH,backgroundColor:'#ff9500',borderRadius:3}}/>}
                              </View>
                            )}
                          </View>
                          <Text style={[s.barLabel,i===viewMonth&&s.barLabelOn]}>{i+1}월</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                  <View style={s.legend}>
                    <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:'#d1e4ff'}]}/><Text style={s.legendText}>할일</Text></View>
                    <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:'#34c759'}]}/><Text style={s.legendText}>할일완료</Text></View>
                    <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:'#ffe5b4'}]}/><Text style={s.legendText}>운동세트</Text></View>
                    <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:'#ff9500'}]}/><Text style={s.legendText}>운동완료</Text></View>
                  </View>
                </View>
              </View>

            </View>
          )}

        </ScrollView>

        {/* Tab Bar */}
        <View style={s.tabBar}>
          {[
            {key:'todo',    label:'할 일', icon:'☰'},
            {key:'workout', label:'운동',  icon:'🏋️'},
            {key:'stats',   label:'통계',  icon:'📊'},
          ].map(t=>(
            <TouchableOpacity key={t.key} style={s.tabBtn} onPress={()=>{setTab(t.key);setShowTemplateForm(false)}}>
              <Text style={{fontSize:20,color:tab===t.key?'#007aff':'#8e8e93'}}>{t.icon}</Text>
              <Text style={[s.tabLabel,tab===t.key&&s.tabLabelOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── 컴포넌트 ─────────────────────────────────────────────────

function StatCard({label,value,color}) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statValue,{color}]}>{String(value)}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

function NavBtn({onPress,disabled,small,children}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}
      style={[s.navBtn,small&&s.navBtnSm,disabled&&s.navBtnOff]}>
      <Text style={[s.navBtnText,small&&s.navBtnTextSm,disabled&&s.navBtnTextOff]}>{children}</Text>
    </TouchableOpacity>
  )
}

// ── StyleSheet ────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   {flex:1,backgroundColor:'#f2f2f7'},
  scroll: {flex:1,paddingHorizontal:16},

  header:      {paddingHorizontal:20,paddingTop:8,paddingBottom:12},
  headerTitle: {fontSize:34,fontWeight:'700',color:'#000'},

  // 네비게이터
  navCard:      {backgroundColor:'#fff',borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:10,marginTop:12},
  navTitle:     {fontSize:17,fontWeight:'700',color:'#000'},
  navDay:       {fontSize:13,fontWeight:'500',color:'#8e8e93'},
  navSub:       {fontSize:11,color:'#007aff',marginTop:2},
  navBtn:       {width:32,height:32,borderRadius:16,backgroundColor:'#f2f2f7',alignItems:'center',justifyContent:'center'},
  navBtnSm:     {width:24,height:24,borderRadius:12},
  navBtnOff:    {backgroundColor:'transparent'},
  navBtnText:   {color:'#007aff',fontSize:20,fontWeight:'600',lineHeight:24},
  navBtnTextSm: {fontSize:16,lineHeight:20},
  navBtnTextOff:{color:'#c6c6c8'},

  emptyCard: {backgroundColor:'#fff',borderRadius:12,padding:24,alignItems:'center'},
  emptyText: {color:'#8e8e93',fontSize:15,textAlign:'center',lineHeight:22},
  dot:       {width:8,height:8,borderRadius:4},

  // 할일
  listCard:      {backgroundColor:'#fff',borderRadius:12,overflow:'hidden'},
  todoRow:       {flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:13,gap:12},
  rowDivider:    {borderTopWidth:0.5,borderTopColor:'#e5e5ea'},
  circle:        {width:22,height:22,borderRadius:11,borderWidth:2,borderColor:'#c6c6c8',alignItems:'center',justifyContent:'center'},
  circleDone:    {backgroundColor:'#34c759',borderWidth:0},
  check:         {color:'#fff',fontSize:12,fontWeight:'700'},
  todoText:      {flex:1,fontSize:15,color:'#000'},
  todoTextDone:  {color:'#8e8e93',textDecorationLine:'line-through'},
  deleteBtn:     {width:26,height:26,borderRadius:13,backgroundColor:'#ffe5e5',alignItems:'center',justifyContent:'center'},
  deleteBtnText: {color:'#ff3b30',fontSize:18,fontWeight:'300',lineHeight:22},

  // 입력
  inputCard:      {backgroundColor:'#fff',borderRadius:12,padding:12,flexDirection:'row',gap:8,alignItems:'center'},
  textInput:      {flex:1,height:44,backgroundColor:'#f2f2f7',borderRadius:10,paddingHorizontal:12,fontSize:15},
  addConfirmBtn:  {height:44,paddingHorizontal:16,backgroundColor:'#007aff',borderRadius:10,alignItems:'center',justifyContent:'center'},
  addConfirmText: {color:'#fff',fontSize:15,fontWeight:'600'},
  addRowBtn:      {backgroundColor:'#fff',borderRadius:12,padding:16,alignItems:'center',borderWidth:1,borderColor:'#e5e5ea',borderStyle:'dashed'},
  addRowBtnActive:{borderColor:'#ff3b30'},
  addRowBtnText:  {fontSize:15,fontWeight:'600',color:'#007aff'},

  // 운동 세션 카드
  sessionCard:   {backgroundColor:'#fff',borderRadius:12,overflow:'hidden',borderTopWidth:3},
  sessionHeader: {flexDirection:'row',alignItems:'center',padding:14,gap:8},
  sessionName:   {fontSize:15,fontWeight:'700',color:'#000'},
  progressBg:    {height:3,backgroundColor:'#e5e5ea',marginHorizontal:14,borderRadius:2,marginBottom:4},
  progressFill:  {height:3,borderRadius:2},

  // 운동 종목 행
  exRow:     {paddingHorizontal:14,paddingVertical:12},
  exName:    {fontSize:15,fontWeight:'600',color:'#000'},
  setBox:    {width:36,height:36,borderRadius:8,borderWidth:1.5,borderColor:'#c6c6c8',alignItems:'center',justifyContent:'center'},
  setBoxText:{fontSize:13,fontWeight:'600',color:'#8e8e93'},

  // 루틴 패널
  templatePanel: {backgroundColor:'#fff',borderRadius:12,padding:16,gap:4},
  tplRow:        {flexDirection:'row',alignItems:'center',gap:8,padding:10,backgroundColor:'#f2f2f7',borderRadius:8,borderLeftWidth:3},
  chip:          {flexDirection:'row',alignItems:'center',gap:4,borderRadius:14,borderWidth:1,paddingHorizontal:10,paddingVertical:5},
  chipText:      {fontSize:13},

  // 루틴 폼
  formCard:      {backgroundColor:'#fff',borderRadius:12,padding:16},
  formCardTitle: {fontSize:17,fontWeight:'700',color:'#000',marginBottom:16},
  formTitle:     {fontSize:13,fontWeight:'600',color:'#8e8e93',marginBottom:8},
  colorDot:      {width:28,height:28,borderRadius:14},
  colorDotOn:    {borderWidth:3,borderColor:'#000'},
  exPreviewRow:  {flexDirection:'row',alignItems:'center',gap:8,padding:12},
  numInputWrap:  {alignItems:'center',gap:4},
  numLabel:      {fontSize:11,color:'#8e8e93'},
  numInput:      {width:56,height:40,backgroundColor:'#f2f2f7',borderRadius:8,textAlign:'center',fontSize:16,fontWeight:'600'},
  unitBtn:       {paddingHorizontal:8,paddingVertical:6,borderRadius:8,borderWidth:1,borderColor:'#c6c6c8'},
  unitBtnText:   {fontSize:12,color:'#8e8e93'},
  saveBtn:       {height:44,borderRadius:10,alignItems:'center',justifyContent:'center'},
  saveBtnText:   {color:'#fff',fontSize:15,fontWeight:'600'},

  // 통계
  sectionLabel:    {fontSize:13,fontWeight:'600',color:'#8e8e93',marginBottom:8,paddingLeft:4},
  sectionLabelRow: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8,paddingLeft:4},
  statRow:         {backgroundColor:'#fff',borderRadius:12,padding:16,flexDirection:'row',gap:8},
  statCard:        {flex:1,backgroundColor:'#f2f2f7',borderRadius:10,padding:12,alignItems:'center'},
  statValue:       {fontSize:22,fontWeight:'700'},
  statLabel:       {fontSize:12,color:'#8e8e93',marginTop:2},
  statDetailCard:  {backgroundColor:'#fff',borderRadius:12,padding:14,borderLeftWidth:4},
  statDetailHeader:{flexDirection:'row',alignItems:'center',marginBottom:8},
  statDetailName:  {flex:1,fontSize:14,fontWeight:'700',color:'#000'},
  statDetailRate:  {fontSize:16,fontWeight:'800'},
  statNums:        {flexDirection:'row',gap:12,marginTop:8},
  statNum:         {fontSize:12,color:'#8e8e93'},
  searchBox:       {flexDirection:'row',alignItems:'center',backgroundColor:'#fff',borderRadius:12,paddingHorizontal:12,paddingVertical:8,gap:8,marginTop:12},
  searchIcon:      {fontSize:16},
  searchInput:     {flex:1,fontSize:15,color:'#000',paddingVertical:4},
  dateChip:        {borderRadius:6,borderWidth:1,paddingHorizontal:6,paddingVertical:2},
  chartCard:       {backgroundColor:'#fff',borderRadius:12,padding:16},
  chartBars:       {flexDirection:'row',alignItems:'flex-end',height:70,gap:3},
  barCol:          {flex:1,alignItems:'center',justifyContent:'flex-end'},
  barLabel:        {fontSize:9,color:'#8e8e93',marginTop:3},
  barLabelOn:      {color:'#007aff',fontWeight:'700'},
  legend:          {flexDirection:'row',justifyContent:'center',gap:8,marginTop:12,flexWrap:'wrap'},
  legendItem:      {flexDirection:'row',alignItems:'center',gap:4},
  legendDot:       {width:10,height:10,borderRadius:2},
  legendText:      {fontSize:11,color:'#8e8e93'},

  // 탭바
  tabBar:   {flexDirection:'row',backgroundColor:'rgba(242,242,247,0.95)',borderTopWidth:0.5,borderTopColor:'#c6c6c8',paddingTop:10,paddingBottom:Platform.OS==='ios'?16:8},
  tabBtn:   {flex:1,alignItems:'center',gap:2},
  tabLabel: {fontSize:10,fontWeight:'500',color:'#8e8e93'},
  tabLabelOn:{color:'#007aff'},
})
