import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const MONTHS  = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DAYS    = ['일','월','화','수','목','금','토']
const PALETTE = ['#ff9500','#007aff','#34c759','#ff3b30','#af52de','#5ac8fa','#ff2d55','#a2845e']

// 구버전(string) / 신버전(object) 호환 헬퍼
const getTaskText = task => typeof task === 'string' ? task : task.text
const getTaskTags = task => typeof task === 'string' ? [] : (task.tags || [])

function dateKey(d) {
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d }
function getToday()       { const d = new Date(); d.setHours(0,0,0,0); return d }

export default function App() {
  const [todos,    setTodos]    = useState([])
  const [routines, setRoutines] = useState([])
  const [input,    setInput]    = useState('')
  const [showInput,setShowInput]= useState(false)
  const [tab,      setTab]      = useState('todo')
  const [todoDate, setTodoDate] = useState(getToday())

  // 루틴 추가/수정 폼
  const [showAddRoutine,   setShowAddRoutine]   = useState(false)
  const [editingRoutineId, setEditingRoutineId] = useState(null) // null이면 추가, id면 수정
  const [routineName,      setRoutineName]      = useState('')
  const [routineColor,     setRoutineColor]     = useState(PALETTE[0])
  const [routineTaskInput,       setRoutineTaskInput]       = useState('')
  const [routineTaskCurrentTags, setRoutineTaskCurrentTags] = useState([])
  const [routineTasks,           setRoutineTasks]           = useState([])

  // 태그 레지스트리
  const [tags,           setTags]           = useState([])   // [{id, name, color}]
  const [showTagManager, setShowTagManager] = useState(false)
  const [tagInput, setTagInput] = useState('')

  // 입력창 포커스 유지용 ref
  const routineTaskInputRef = useRef(null)
  const tagInputRef         = useRef(null)
  const [expandedRoutine,  setExpandedRoutine]  = useState(null)
  const [expandedGroup,    setExpandedGroup]    = useState({})


  // 통계
  const now = new Date()
  const thisYear = now.getFullYear(); const thisMonth = now.getMonth()
  const [viewYear,  setViewYear]  = useState(thisYear)
  const [viewMonth, setViewMonth] = useState(thisMonth)

  // ── 저장/불러오기 ──────────────────────────────────────
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('todos'),
      AsyncStorage.getItem('routines'),
      AsyncStorage.getItem('tags'),
    ]).then(([t, r, tg]) => {
      if (t)  try { setTodos(JSON.parse(t))    } catch {}
      if (r)  try { setRoutines(JSON.parse(r)) } catch {}
      if (tg) try { setTags(JSON.parse(tg))    } catch {}
      setLoaded(true)
    })
  }, [])

  // 최초 로드 전에는 저장하지 않음 (빈 배열로 덮어쓰기 방지)
  useEffect(() => { if (loaded) AsyncStorage.setItem('todos',    JSON.stringify(todos))    }, [todos,    loaded])
  useEffect(() => { if (loaded) AsyncStorage.setItem('routines', JSON.stringify(routines)) }, [routines, loaded])
  useEffect(() => { if (loaded) AsyncStorage.setItem('tags',     JSON.stringify(tags))     }, [tags,     loaded])

  // ── 날짜 helpers ───────────────────────────────────────
  const todayKey = dateKey(getToday())
  const todoKey  = dateKey(todoDate)
  const labelForDate = d => {
    const key = dateKey(d)
    if (key === todayKey)                         return '오늘'
    if (key === dateKey(addDays(getToday(), -1))) return '어제'
    if (key === dateKey(addDays(getToday(),  1))) return '내일'
    return null
  }

  // ── 할일 CRUD ──────────────────────────────────────────
  function toggleTodo(id) {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t
    ))
  }

  function deleteTodo(id) {
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  // ── 루틴 CRUD ──────────────────────────────────────────
  function addRoutineTask() {
    const t = routineTaskInput.trim(); if (!t) return
    setRoutineTasks(prev => [...prev, { text: t, tags: [...routineTaskCurrentTags] }])
    setRoutineTaskInput(''); setRoutineTaskCurrentTags([])
    setTimeout(() => routineTaskInputRef.current?.focus(), 50)
  }
  function toggleRoutineTaskTag(tagName) {
    setRoutineTaskCurrentTags(prev =>
      prev.includes(tagName) ? prev.filter(n => n !== tagName) : [...prev, tagName]
    )
  }
  function removeRoutineTask(i) { setRoutineTasks(prev => prev.filter((_,idx) => idx !== i)) }
  function openAddRoutine() {
    setEditingRoutineId(null)
    setRoutineName(''); setRoutineColor(PALETTE[0]); setRoutineTasks([])
    setRoutineTaskInput(''); setRoutineTaskCurrentTags([])
    setShowAddRoutine(true)
  }

  function openEditRoutine(routine) {
    setEditingRoutineId(routine.id)
    setRoutineName(routine.name)
    setRoutineColor(routine.color)
    setRoutineTasks([...routine.tasks])
    setRoutineTaskInput(''); setRoutineTaskCurrentTags([])
    setShowAddRoutine(true)
    setExpandedRoutine(null)
  }

  // ── 태그 CRUD ───────────────────────────────────────────
  function addTag() {
    const name = tagInput.trim().replace(/^#/, '')
    if (!name || tags.some(t => t.name === name)) return
    const color = PALETTE[tags.length % PALETTE.length]
    setTags(prev => [...prev, { id: Date.now(), name, color }])
    setTagInput('')
    setTimeout(() => tagInputRef.current?.focus(), 50)
  }
  function deleteTag(id) {
    setTags(prev => prev.filter(t => t.id !== id))
  }

  function saveRoutine() {
    if (!routineName.trim() || routineTasks.length === 0) return
    if (editingRoutineId) {
      // 수정
      setRoutines(prev => prev.map(r =>
        r.id === editingRoutineId
          ? { ...r, name: routineName.trim(), color: routineColor, tasks: [...routineTasks] }
          : r
      ))
      // 할일 탭에 이미 적용된 todos의 루틴 정보도 업데이트
      setTodos(prev => prev.map(t =>
        t.routineId === editingRoutineId
          ? { ...t, routineName: routineName.trim(), routineColor: routineColor }
          : t
      ))
    } else {
      // 추가
      const newRoutine = { id: Date.now(), name: routineName.trim(), color: routineColor, tasks: [...routineTasks] }
      setRoutines(prev => [...prev, newRoutine])
      setExpandedGroup(prev => ({ ...prev, [newRoutine.id]: true }))
    }
    setRoutineName(''); setRoutineColor(PALETTE[0]); setRoutineTasks([])
    setShowAddRoutine(false); setEditingRoutineId(null)
  }

  function deleteRoutine(id) { setRoutines(prev => prev.filter(r => r.id !== id)) }

  // 루틴 → 선택 날짜에 일괄 추가
  function applyRoutine(routine) {
    const createdAt = new Date(todoDate); createdAt.setHours(12,0,0,0)
    const groupKey = `${routine.id}-${todoKey}` // 같은 루틴도 날짜별로 구분
    setTodos(prev => [...prev, ...routine.tasks.map((task, i) => ({
      id: Date.now() + i,
      text: getTaskText(task),
      tags: getTaskTags(task),
      completed: false,
      createdAt: createdAt.toISOString(), completedAt: null,
      routineId: routine.id, routineName: routine.name, routineColor: routine.color,
    }))])
    setExpandedGroup(prev => ({ ...prev, [routine.id]: true }))
  }

  // ── 할일 그룹화 ────────────────────────────────────────
  const todosForDay = todos.filter(t => dateKey(t.createdAt) === todoKey)
  const grouped = (() => {
    const map = {}; const standalone = []
    todosForDay.forEach(t => {
      if (t.routineId) {
        if (!map[t.routineId]) map[t.routineId] = { id: t.routineId, name: t.routineName, color: t.routineColor, todos: [] }
        map[t.routineId].todos.push(t)
      } else { standalone.push(t) }
    })
    return { groups: Object.values(map), standalone }
  })()

  // ── 통계 ───────────────────────────────────────────────
  const isCurrentMonth = viewYear === thisYear && viewMonth === thisMonth
  function prevMonth() { if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1)}else setViewMonth(m=>m-1) }
  function nextMonth() { if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1)}else setViewMonth(m=>m+1) }
  const todosVM = todos.filter(t => { const d=new Date(t.createdAt); return d.getFullYear()===viewYear&&d.getMonth()===viewMonth })
  const todosVY = todos.filter(t => new Date(t.createdAt).getFullYear()===viewYear)
  const monthlyData = MONTHS.map((_,mi) => {
    const added = todos.filter(t=>{ const d=new Date(t.createdAt); return d.getFullYear()===viewYear&&d.getMonth()===mi })
    return { added: added.length, done: added.filter(t=>t.completed).length }
  })
  const maxVal = Math.max(...monthlyData.map(m=>m.added),1)
  const rate   = (done,total) => total===0?0:Math.round((done/total)*100)

  // ── Render ─────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f2f2f7" />
      <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{tab==='todo'?'할 일':tab==='routine'?'루틴':'통계'}</Text>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={{paddingBottom:16}}>

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

              {/* ── 루틴 그룹 카드 ── */}
              {grouped.groups.map(g => {
                const done     = g.todos.filter(t=>t.completed).length
                const total    = g.todos.length
                const progress = total===0?0:done/total
                const expanded = expandedGroup[g.id] !== false
                return (
                  <View key={g.id} style={[s.routineGroupCard, {borderTopColor: g.color}]}>
                    <TouchableOpacity
                      onPress={()=>setExpandedGroup(prev=>({...prev,[g.id]:!expanded}))}
                      style={s.routineGroupHeader}>
                      <View style={[s.routineGroupDot, {backgroundColor:g.color}]}/>
                      <Text style={s.routineGroupName}>{g.name}</Text>
                      <Text style={[s.routineGroupCount, {color:done===total&&total>0?'#34c759':'#8e8e93'}]}>
                        {done}/{total}
                      </Text>
                      <Text style={{color:'#8e8e93',fontSize:14,marginLeft:4}}>{expanded?'▲':'▼'}</Text>
                    </TouchableOpacity>
                    <View style={s.progressBg}>
                      <View style={[s.progressFill, {width:`${progress*100}%`, backgroundColor:g.color}]}/>
                    </View>
                    {expanded && g.todos.map((todo,i)=>(
                      <View key={todo.id} style={[s.subTodoRow, i>0&&s.todoDivider]}>
                        <TouchableOpacity onPress={()=>toggleTodo(todo.id)}
                          style={[s.circle, todo.completed&&s.circleDone]}>
                          {todo.completed&&<Text style={s.check}>✓</Text>}
                        </TouchableOpacity>
                        <View style={{flex:1}}>
                          <Text style={[s.todoText, todo.completed&&s.todoTextDone]}>{todo.text}</Text>
                          {(todo.tags||[]).length>0&&(
                            <View style={s.tagRow}>
                              {(todo.tags||[]).map(tag=>(
                                <View key={tag} style={[s.tagChip,{borderColor:g.color+'88',backgroundColor:g.color+'18'}]}>
                                  <Text style={[s.tagChipText,{color:g.color}]}>#{tag}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                        <TouchableOpacity onPress={()=>deleteTodo(todo.id)} style={s.deleteBtn}>
                          <Text style={s.deleteBtnText}>−</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )
              })}

              {/* ── 개별 할일 ── */}
              {grouped.standalone.length>0&&(
                <View>
                  {grouped.groups.length>0&&(
                    <View style={[s.groupHeader,{borderLeftColor:'#8e8e93'}]}>
                      <Text style={[s.groupName,{color:'#8e8e93'}]}>기타</Text>
                    </View>
                  )}
                  <View style={s.listCard}>
                    {grouped.standalone.map((todo,i)=>(
                      <View key={todo.id} style={[s.subTodoRow, i>0&&s.todoDivider]}>
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
                </View>
              )}

              {/* ── 할일 추가 폼 (목록 하단) ── */}
              {showInput && (
                <View style={s.bottomForm}>
                  {routines.length === 0 ? (
                    <Text style={[s.emptyText,{textAlign:'center'}]}>{'루틴 탭에서\n루틴을 먼저 추가해주세요'}</Text>
                  ) : (
                    <>
                      <Text style={s.formTitle}>루틴 선택</Text>
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                        {routines.map(r=>(
                          <TouchableOpacity key={r.id}
                            onPress={()=>{ applyRoutine(r); setShowInput(false) }}
                            style={[s.chip,{borderColor:r.color}]}>
                            <View style={[s.dot,{backgroundColor:r.color}]}/>
                            <Text style={[s.chipText,{color:r.color,fontWeight:'600'}]}>{r.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* ── 추가하기 버튼 ── */}
              <TouchableOpacity
                onPress={()=>setShowInput(v=>!v)}
                style={[s.bottomAddBtn, showInput&&s.bottomAddBtnActive]}>
                <Text style={[s.bottomAddBtnText, showInput&&{color:'#ff3b30'}]}>
                  {showInput ? '✕  닫기' : '+ 할일 추가하기'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ════ 루틴 탭 ════ */}
          {tab==='routine' && (
            <View style={{gap:12,marginTop:12}}>

              {/* ── 태그 관리 섹션 ── */}
              <View style={s.tagManagerCard}>
                <TouchableOpacity
                  onPress={()=>setShowTagManager(v=>!v)}
                  style={s.tagManagerHeader}>
                  <Text style={s.tagManagerTitle}>태그 관리</Text>
                  <Text style={{color:'#8e8e93',fontSize:14}}>{showTagManager?'▲':'▼'}</Text>
                </TouchableOpacity>
                {showTagManager && (
                  <View style={{gap:10,paddingTop:10}}>
                    {/* 기존 태그 목록 */}
                    {tags.length === 0 ? (
                      <Text style={{color:'#8e8e93',fontSize:13,textAlign:'center'}}>등록된 태그가 없습니다</Text>
                    ) : (
                      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                        {tags.map(tag=>(
                          <View key={tag.id} style={[s.tagChip,{borderColor:tag.color,backgroundColor:tag.color+'18',paddingVertical:4,paddingHorizontal:8}]}>
                            <Text style={[s.tagChipText,{color:tag.color,fontSize:13}]}>#{tag.name}</Text>
                            <TouchableOpacity onPress={()=>deleteTag(tag.id)} style={{marginLeft:4}}>
                              <Text style={{color:tag.color,fontSize:12,fontWeight:'700'}}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                    {/* 새 태그 추가 */}
                    <View style={{gap:6}}>
                      <View style={[s.inputRow,{paddingHorizontal:0}]}>
                        <TextInput ref={tagInputRef}
                          value={tagInput} onChangeText={setTagInput}
                          onSubmitEditing={addTag}
                          placeholder="태그 이름 입력"
                          returnKeyType="done"
                          style={s.textInput}/>
                        <TouchableOpacity onPress={addTag}
                          style={[s.submitBtn,{backgroundColor:PALETTE[tags.length % PALETTE.length]}]}>
                          <Text style={s.submitBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {routines.length===0 && (
                <View style={s.emptyCard}>
                  <Text style={s.emptyText}>{'루틴이 없습니다\n아래 버튼으로 추가하세요'}</Text>
                </View>
              )}
              {routines.map(routine=>(
                <View key={routine.id} style={[s.routineCard,{borderTopColor:routine.color}]}>
                  <View style={s.routineRow}>
                    <View style={[s.routineBar,{backgroundColor:routine.color}]}/>
                    <Text style={s.routineName}>{routine.name}</Text>
                    <Text style={s.routineCount}>{routine.tasks.length}개</Text>
                    <TouchableOpacity onPress={()=>applyRoutine(routine)}
                      style={[s.applyBtn,{backgroundColor:routine.color}]}>
                      <Text style={s.applyBtnText}>적용</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>openEditRoutine(routine)} style={{padding:4}}>
                      <Text style={{color:'#007aff',fontSize:13,fontWeight:'600'}}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>setExpandedRoutine(expandedRoutine===routine.id?null:routine.id)} style={{padding:4}}>
                      <Text style={{color:'#8e8e93',fontSize:16}}>{expandedRoutine===routine.id?'▲':'▼'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>deleteRoutine(routine.id)} style={{padding:4}}>
                      <Text style={{color:'#ff3b30',fontSize:13,fontWeight:'600'}}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                  {expandedRoutine===routine.id&&(
                    <View style={s.taskList}>
                      {routine.tasks.map((task,i)=>(
                        <View key={i} style={[s.taskRow, i>0&&{borderTopWidth:0.5,borderTopColor:'#e5e5ea'}]}>
                          <View style={[s.dot,{backgroundColor:routine.color}]}/>
                          <View style={{flex:1}}>
                            <Text style={s.taskText}>{getTaskText(task)}</Text>
                            {getTaskTags(task).length>0&&(
                              <View style={s.tagRow}>
                                {getTaskTags(task).map(tag=>(
                                  <View key={tag} style={[s.tagChip,{borderColor:routine.color+'88',backgroundColor:routine.color+'18'}]}>
                                    <Text style={[s.tagChipText,{color:routine.color}]}>#{tag}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              {/* ── 루틴 추가/수정 폼 (목록 하단) ── */}
              {showAddRoutine && (
                <View style={s.bottomForm}>
                  <Text style={s.formTitle}>{editingRoutineId ? '루틴 수정' : '새 루틴 추가'}</Text>
                  <TextInput value={routineName} onChangeText={setRoutineName}
                    placeholder="루틴 이름 (예: 운동 A, 일상 루틴)"
                    style={[s.textInput,{marginBottom:10}]}/>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{gap:8,marginBottom:10}}>
                    {PALETTE.map(c=>(
                      <TouchableOpacity key={c} onPress={()=>setRoutineColor(c)}
                        style={[s.colorDot,{backgroundColor:c},routineColor===c&&s.colorDotOn]}/>
                    ))}
                  </ScrollView>
                  {routineTasks.map((task,i)=>(
                    <View key={i} style={s.taskPreview}>
                      <View style={[s.dot,{backgroundColor:routineColor}]}/>
                      <View style={{flex:1}}>
                        <Text style={s.taskPreviewText}>{getTaskText(task)}</Text>
                        {getTaskTags(task).length>0&&(
                          <View style={s.tagRow}>
                            {getTaskTags(task).map(tag=>(
                              <View key={tag} style={[s.tagChip,{borderColor:routineColor+'88',backgroundColor:routineColor+'18'}]}>
                                <Text style={[s.tagChipText,{color:routineColor}]}>#{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      <TouchableOpacity onPress={()=>removeRoutineTask(i)}>
                        <Text style={{color:'#ff3b30',fontSize:16}}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={{gap:6,marginTop:4}}>
                    <View style={[s.inputRow,{paddingHorizontal:0}]}>
                      <TextInput ref={routineTaskInputRef}
                        value={routineTaskInput} onChangeText={setRoutineTaskInput}
                        onSubmitEditing={addRoutineTask} placeholder="할 일 항목 추가..."
                        returnKeyType="done" style={s.textInput}/>
                      <TouchableOpacity onPress={addRoutineTask}
                        style={[s.submitBtn,{backgroundColor:routineColor}]}>
                        <Text style={s.submitBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    {/* 태그 선택 */}
                    {tags.length > 0 && (
                      <View>
                        <Text style={[s.formTitle,{marginBottom:6}]}>태그 선택 (선택)</Text>
                        <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
                          {tags.map(tag => {
                            const selected = routineTaskCurrentTags.includes(tag.name)
                            return (
                              <TouchableOpacity key={tag.id}
                                onPress={()=>toggleRoutineTaskTag(tag.name)}
                                style={[s.tagChip, {
                                  borderColor: tag.color,
                                  backgroundColor: selected ? tag.color : tag.color+'18',
                                }]}>
                                <Text style={[s.tagChipText, {color: selected ? '#fff' : tag.color}]}>
                                  #{tag.name}
                                </Text>
                              </TouchableOpacity>
                            )
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={saveRoutine}
                    style={[s.saveBtn,{backgroundColor:routineName.trim()&&routineTasks.length>0?routineColor:'#c6c6c8',marginHorizontal:0,marginTop:10}]}>
                    <Text style={s.saveBtnText}>{editingRoutineId ? '수정 완료' : '루틴 저장'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── 루틴 추가하기 버튼 ── */}
              {!editingRoutineId && (
                <TouchableOpacity
                  onPress={()=>{ showAddRoutine?(setShowAddRoutine(false),setEditingRoutineId(null)):openAddRoutine() }}
                  style={[s.bottomAddBtn, showAddRoutine&&s.bottomAddBtnActive]}>
                  <Text style={[s.bottomAddBtnText, showAddRoutine&&{color:'#ff3b30'}]}>
                    {showAddRoutine ? '✕  닫기' : '+ 루틴 추가하기'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ════ 통계 탭 ════ */}
          {tab==='stats'&&(
            <View style={{gap:16}}>
              <View style={s.navCard}>
                <NavBtn onPress={prevMonth}>‹</NavBtn>
                <View style={{alignItems:'center'}}>
                  <Text style={s.navTitle}>{viewYear}년 {MONTHS[viewMonth]}</Text>
                  {isCurrentMonth&&<Text style={s.navSub}>이번 달</Text>}
                </View>
                <NavBtn onPress={nextMonth} disabled={isCurrentMonth}>›</NavBtn>
              </View>
              <View>
                <Text style={s.sectionLabel}>월간 통계</Text>
                <View style={s.statRow}>
                  <StatCard label="추가"   value={todosVM.length}                        color="#007aff"/>
                  <StatCard label="완료"   value={todosVM.filter(t=>t.completed).length}  color="#34c759"/>
                  <StatCard label="달성률" value={`${rate(todosVM.filter(t=>t.completed).length,todosVM.length)}%`} color="#ff9500"/>
                </View>
              </View>
              <View>
                <View style={s.sectionLabelRow}>
                  <Text style={s.sectionLabel}>연간 통계 ({viewYear}년)</Text>
                  <View style={{flexDirection:'row',gap:4}}>
                    <NavBtn small onPress={()=>setViewYear(y=>y-1)}>‹</NavBtn>
                    <NavBtn small onPress={()=>setViewYear(y=>y+1)} disabled={viewYear>=thisYear}>›</NavBtn>
                  </View>
                </View>
                <View style={s.statRow}>
                  <StatCard label="추가"   value={todosVY.length}                        color="#007aff"/>
                  <StatCard label="완료"   value={todosVY.filter(t=>t.completed).length}  color="#34c759"/>
                  <StatCard label="달성률" value={`${rate(todosVY.filter(t=>t.completed).length,todosVY.length)}%`} color="#ff9500"/>
                </View>
              </View>
              {/* ── 루틴별 월간 통계 ── */}
              {routines.length > 0 && (
                <View>
                  <Text style={s.sectionLabel}>루틴별 월간 통계</Text>
                  <View style={{gap:8}}>
                    {routines.map(routine => {
                      const rTodos = todosVM.filter(t => t.routineId === routine.id)
                      const rDone  = rTodos.filter(t => t.completed).length
                      const rRate  = rate(rDone, rTodos.length)
                      const progress = rTodos.length === 0 ? 0 : rDone / rTodos.length
                      return (
                        <View key={routine.id} style={[s.routineStatCard, {borderLeftColor: routine.color}]}>
                          <View style={s.routineStatHeader}>
                            <View style={[s.dot, {backgroundColor: routine.color, width:10, height:10, borderRadius:5}]}/>
                            <Text style={s.routineStatName}>{routine.name}</Text>
                            <Text style={[s.routineStatRate, {color: routine.color}]}>{rRate}%</Text>
                          </View>
                          {/* 진행 바 */}
                          <View style={s.progressBg}>
                            <View style={[s.progressFill, {width:`${progress*100}%`, backgroundColor: routine.color}]}/>
                          </View>
                          {/* 수치 */}
                          <View style={s.routineStatNums}>
                            <Text style={s.routineStatNum}>추가 <Text style={{color:'#007aff',fontWeight:'700'}}>{rTodos.length}</Text></Text>
                            <Text style={s.routineStatNum}>완료 <Text style={{color:'#34c759',fontWeight:'700'}}>{rDone}</Text></Text>
                            <Text style={s.routineStatNum}>미완료 <Text style={{color:'#ff3b30',fontWeight:'700'}}>{rTodos.length - rDone}</Text></Text>
                          </View>
                        </View>
                      )
                    })}
                    {/* 루틴 없는 기타 할일 */}
                    {(() => {
                      const etc      = todosVM.filter(t => !t.routineId)
                      const etcDone  = etc.filter(t => t.completed).length
                      if (etc.length === 0) return null
                      return (
                        <View style={[s.routineStatCard, {borderLeftColor:'#8e8e93'}]}>
                          <View style={s.routineStatHeader}>
                            <View style={[s.dot, {backgroundColor:'#8e8e93', width:10, height:10, borderRadius:5}]}/>
                            <Text style={s.routineStatName}>기타</Text>
                            <Text style={[s.routineStatRate, {color:'#8e8e93'}]}>{rate(etcDone, etc.length)}%</Text>
                          </View>
                          <View style={s.progressBg}>
                            <View style={[s.progressFill, {width:`${(etcDone/etc.length)*100}%`, backgroundColor:'#8e8e93'}]}/>
                          </View>
                          <View style={s.routineStatNums}>
                            <Text style={s.routineStatNum}>추가 <Text style={{color:'#007aff',fontWeight:'700'}}>{etc.length}</Text></Text>
                            <Text style={s.routineStatNum}>완료 <Text style={{color:'#34c759',fontWeight:'700'}}>{etcDone}</Text></Text>
                            <Text style={s.routineStatNum}>미완료 <Text style={{color:'#ff3b30',fontWeight:'700'}}>{etc.length - etcDone}</Text></Text>
                          </View>
                        </View>
                      )
                    })()}
                  </View>
                </View>
              )}

              {/* ── 태그별 월간 통계 ── */}
              {(() => {
                const allTags = [...new Set(todosVM.flatMap(t => t.tags || []))]
                if (allTags.length === 0) return null
                return (
                  <View>
                    <Text style={s.sectionLabel}>태그별 월간 통계</Text>
                    <View style={{gap:8}}>
                      {allTags.map(tag => {
                        const tagTodos = todosVM.filter(t => (t.tags||[]).includes(tag))
                        const tagDone  = tagTodos.filter(t => t.completed).length
                        const tagRate  = rate(tagDone, tagTodos.length)
                        const progress = tagTodos.length === 0 ? 0 : tagDone / tagTodos.length
                        const tagColor2 = (tags.find(tg=>tg.name===tag)||{}).color || '#af52de'
                        return (
                          <View key={tag} style={[s.routineStatCard, {borderLeftColor:tagColor2}]}>
                            <View style={s.routineStatHeader}>
                              <Text style={[s.tagStatBadge,{color:tagColor2}]}>#{tag}</Text>
                              <Text style={[s.routineStatRate, {color:tagColor2}]}>{tagRate}%</Text>
                            </View>
                            <View style={s.progressBg}>
                              <View style={[s.progressFill, {width:`${progress*100}%`, backgroundColor:tagColor2}]}/>
                            </View>
                            <View style={s.routineStatNums}>
                              <Text style={s.routineStatNum}>추가 <Text style={{color:'#007aff',fontWeight:'700'}}>{tagTodos.length}</Text></Text>
                              <Text style={s.routineStatNum}>완료 <Text style={{color:'#34c759',fontWeight:'700'}}>{tagDone}</Text></Text>
                              <Text style={s.routineStatNum}>미완료 <Text style={{color:'#ff3b30',fontWeight:'700'}}>{tagTodos.length - tagDone}</Text></Text>
                            </View>
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )
              })()}

              <View>
                <Text style={s.sectionLabel}>월별 현황 ({viewYear}년)</Text>
                <View style={s.chartCard}>
                  <View style={s.chartBars}>
                    {monthlyData.map((m,i)=>{
                      const barH=Math.max((m.added/maxVal)*70,m.added>0?4:0)
                      const doneH=m.done>0?(m.done/m.added)*barH:0
                      return(
                        <TouchableOpacity key={i} onPress={()=>setViewMonth(i)} style={s.barCol}>
                          <View style={{height:70,justifyContent:'flex-end',width:'100%'}}>
                            {m.added>0&&(
                              <View style={{height:barH,width:'100%'}}>
                                <View style={[StyleSheet.absoluteFill,{backgroundColor:i===viewMonth?'#a0c4ff':'#d1e4ff',borderRadius:3}]}/>
                                {m.done>0&&<View style={{position:'absolute',bottom:0,left:0,right:0,height:doneH,backgroundColor:i===viewMonth?'#2db84d':'#34c759',borderRadius:3}}/>}
                              </View>
                            )}
                          </View>
                          <Text style={[s.barLabel,i===viewMonth&&s.barLabelOn]}>{i+1}월</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                  <View style={s.legend}>
                    <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:'#d1e4ff'}]}/><Text style={s.legendText}>추가</Text></View>
                    <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:'#34c759'}]}/><Text style={s.legendText}>완료</Text></View>
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
            {key:'routine', label:'루틴',  icon:'🔁'},
            {key:'stats',   label:'통계',  icon:'📊'},
          ].map(t=>(
            <TouchableOpacity key={t.key} style={s.tabBtn} onPress={()=>setTab(t.key)}>
              <Text style={{fontSize:20,color:tab===t.key?'#007aff':'#8e8e93'}}>{t.icon}</Text>
              <Text style={[s.tabLabel,tab===t.key&&s.tabLabelOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── 컴포넌트 ────────────────────────────────────────────────

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

// ── StyleSheet ───────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   {flex:1,backgroundColor:'#f2f2f7'},
  scroll: {flex:1,paddingHorizontal:16},

  header:      {paddingHorizontal:20,paddingTop:8,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  headerTitle: {fontSize:34,fontWeight:'700',color:'#000'},
  addBtn:      {width:36,height:36,borderRadius:18,backgroundColor:'#007aff',alignItems:'center',justifyContent:'center'},
  addBtnX:     {backgroundColor:'#ff3b30'},
  addBtnText:  {color:'#fff',fontSize:22,fontWeight:'600',lineHeight:26},

  // 하단 추가 버튼 & 폼
  divider:           {height:0.5,backgroundColor:'#e5e5ea',marginBottom:12},
  bottomAddBtn:      {backgroundColor:'#fff',borderRadius:12,padding:16,alignItems:'center',borderWidth:1,borderColor:'#e5e5ea',borderStyle:'dashed'},
  bottomAddBtnActive:{borderColor:'#ff3b30'},
  bottomAddBtnText:  {fontSize:15,fontWeight:'600',color:'#007aff'},
  bottomForm:        {backgroundColor:'#fff',borderRadius:12,padding:16,gap:0},

  // 입력
  inputSection: {backgroundColor:'#fff',borderTopWidth:0.5,borderBottomWidth:0.5,borderColor:'#c6c6c8',paddingTop:10},
  chip:         {flexDirection:'row',alignItems:'center',gap:4,borderRadius:14,borderWidth:1,borderColor:'#c6c6c8',paddingHorizontal:10,paddingVertical:5},
  chipActive:   {backgroundColor:'#007aff',borderColor:'#007aff'},
  chipText:     {fontSize:13,color:'#333'},
  chipTextActive:{color:'#fff'},
  dot:          {width:8,height:8,borderRadius:4},
  inputRow:     {flexDirection:'row',gap:8,alignItems:'center',paddingHorizontal:16,paddingBottom:10},
  textInput:    {flex:1,height:44,backgroundColor:'#f2f2f7',borderRadius:10,paddingHorizontal:12,fontSize:15},
  submitBtn:    {height:44,paddingHorizontal:16,backgroundColor:'#007aff',borderRadius:10,alignItems:'center',justifyContent:'center'},
  submitBtnText:{color:'#fff',fontSize:15,fontWeight:'600'},

  // 루틴 추가 폼
  formSection:    {backgroundColor:'#fff',borderTopWidth:0.5,borderBottomWidth:0.5,borderColor:'#c6c6c8',paddingVertical:12},
  formTitle:      {fontSize:13,fontWeight:'600',color:'#8e8e93',marginBottom:8},
  colorDot:       {width:28,height:28,borderRadius:14},
  colorDotOn:     {borderWidth:3,borderColor:'#000'},
  taskPreview:    {flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:16,paddingVertical:6},
  taskPreviewText:{flex:1,fontSize:14,color:'#333'},
  saveBtn:        {marginHorizontal:16,marginTop:8,height:44,borderRadius:10,alignItems:'center',justifyContent:'center'},
  saveBtnText:    {color:'#fff',fontSize:15,fontWeight:'600'},

  // 네비게이터
  navCard:     {backgroundColor:'#fff',borderRadius:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:10,marginTop:12},
  navTitle:    {fontSize:17,fontWeight:'700',color:'#000'},
  navDay:      {fontSize:13,fontWeight:'500',color:'#8e8e93'},
  navSub:      {fontSize:11,color:'#007aff',marginTop:2},
  navBtn:      {width:32,height:32,borderRadius:16,backgroundColor:'#f2f2f7',alignItems:'center',justifyContent:'center'},
  navBtnSm:    {width:24,height:24,borderRadius:12},
  navBtnOff:   {backgroundColor:'transparent'},
  navBtnText:  {color:'#007aff',fontSize:20,fontWeight:'600',lineHeight:24},
  navBtnTextSm:{fontSize:16,lineHeight:20},
  navBtnTextOff:{color:'#c6c6c8'},

  emptyCard: {backgroundColor:'#fff',borderRadius:12,padding:20,alignItems:'center'},
  emptyText: {color:'#8e8e93',fontSize:15,textAlign:'center',lineHeight:22},

  // ── 루틴 그룹 카드 (할일 탭) ──
  routineGroupCard:   {backgroundColor:'#fff',borderRadius:12,overflow:'hidden',borderTopWidth:3},
  routineGroupHeader: {flexDirection:'row',alignItems:'center',padding:14,gap:8},
  routineGroupDot:    {width:10,height:10,borderRadius:5},
  routineGroupName:   {flex:1,fontSize:15,fontWeight:'700',color:'#000'},
  routineGroupCount:  {fontSize:13,fontWeight:'600'},
  progressBg:   {height:3,backgroundColor:'#e5e5ea',marginHorizontal:14,borderRadius:2,marginBottom:4},
  progressFill: {height:3,borderRadius:2},

  // 서브 할일 행
  subTodoRow: {flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingVertical:13,gap:12},
  todoDivider:{borderTopWidth:0.5,borderTopColor:'#e5e5ea'},
  circle:     {width:22,height:22,borderRadius:11,borderWidth:2,borderColor:'#c6c6c8',alignItems:'center',justifyContent:'center'},
  circleDone: {backgroundColor:'#34c759',borderWidth:0},
  check:      {color:'#fff',fontSize:12,fontWeight:'700'},
  todoText:   {fontSize:15,color:'#000',flex:1},
  todoTextDone:{color:'#8e8e93',textDecorationLine:'line-through'},
  deleteBtn:   {width:26,height:26,borderRadius:13,backgroundColor:'#ffe5e5',alignItems:'center',justifyContent:'center'},
  deleteBtnText:{color:'#ff3b30',fontSize:18,fontWeight:'300',lineHeight:22},

  // 기타(개별) 할일
  groupHeader: {flexDirection:'row',alignItems:'center',paddingLeft:8,paddingVertical:5,borderLeftWidth:3,marginBottom:4},
  groupName:   {flex:1,fontSize:13,fontWeight:'700',marginLeft:6},
  listCard:    {backgroundColor:'#fff',borderRadius:12,overflow:'hidden',marginBottom:8},

  // 루틴 탭 카드
  routineCard:  {backgroundColor:'#fff',borderRadius:12,overflow:'hidden',borderTopWidth:3},
  routineRow:   {flexDirection:'row',alignItems:'center',padding:14,gap:8},
  routineBar:   {width:4,height:36,borderRadius:2},
  routineName:  {flex:1,fontSize:16,fontWeight:'600',color:'#000'},
  routineCount: {fontSize:13,color:'#8e8e93'},
  applyBtn:     {paddingHorizontal:12,paddingVertical:6,borderRadius:8},
  applyBtnText: {color:'#fff',fontSize:13,fontWeight:'600'},
  taskList:     {borderTopWidth:0.5,borderTopColor:'#e5e5ea',paddingVertical:4,paddingHorizontal:14},
  taskRow:      {flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10},
  taskText:     {fontSize:14,color:'#333'},

  // 항목 선택 (할일 추가 폼)
  taskSelectHeader: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},
  taskSelectList:   {borderRadius:10,overflow:'hidden',backgroundColor:'#f2f2f7'},
  taskSelectRow:    {flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:13,gap:12,backgroundColor:'#f2f2f7'},

  // 태그 관리 카드
  tagManagerCard:   {backgroundColor:'#fff',borderRadius:12,padding:14},
  tagManagerHeader: {flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  tagManagerTitle:  {fontSize:15,fontWeight:'700',color:'#000'},

  // 태그 칩
  tagRow:       {flexDirection:'row',flexWrap:'wrap',gap:4,marginTop:4},
  tagChip:      {flexDirection:'row',alignItems:'center',borderRadius:8,borderWidth:1,paddingHorizontal:6,paddingVertical:2},
  tagChipText:  {fontSize:11,fontWeight:'600'},
  tagStatBadge: {flex:1,fontSize:14,fontWeight:'700'},

  // 루틴별 통계 카드
  routineStatCard:   {backgroundColor:'#fff', borderRadius:12, padding:14, borderLeftWidth:4},
  routineStatHeader: {flexDirection:'row', alignItems:'center', gap:6, marginBottom:8},
  routineStatName:   {flex:1, fontSize:14, fontWeight:'700', color:'#000'},
  routineStatRate:   {fontSize:16, fontWeight:'800'},
  routineStatNums:   {flexDirection:'row', gap:12, marginTop:8},
  routineStatNum:    {fontSize:12, color:'#8e8e93'},

  // 통계
  sectionLabel:    {fontSize:13,fontWeight:'600',color:'#8e8e93',marginBottom:8,paddingLeft:4},
  sectionLabelRow: {flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8,paddingLeft:4},
  statRow:         {backgroundColor:'#fff',borderRadius:12,padding:16,flexDirection:'row',gap:8},
  statCard:        {flex:1,backgroundColor:'#f2f2f7',borderRadius:10,padding:12,alignItems:'center'},
  statValue:       {fontSize:22,fontWeight:'700'},
  statLabel:       {fontSize:12,color:'#8e8e93',marginTop:2},
  chartCard:       {backgroundColor:'#fff',borderRadius:12,padding:16},
  chartBars:       {flexDirection:'row',alignItems:'flex-end',height:90,gap:3},
  barCol:          {flex:1,alignItems:'center',justifyContent:'flex-end'},
  barLabel:        {fontSize:9,color:'#8e8e93',marginTop:3},
  barLabelOn:      {color:'#007aff',fontWeight:'700'},
  legend:          {flexDirection:'row',justifyContent:'center',gap:12,marginTop:12},
  legendItem:      {flexDirection:'row',alignItems:'center',gap:4},
  legendDot:       {width:10,height:10,borderRadius:2},
  legendText:      {fontSize:11,color:'#8e8e93'},

  // 탭바
  tabBar:    {height:83,backgroundColor:'rgba(242,242,247,0.95)',borderTopWidth:0.5,borderTopColor:'#c6c6c8',flexDirection:'row',paddingTop:10},
  tabBtn:    {flex:1,alignItems:'center',gap:3},
  tabLabel:  {fontSize:10,fontWeight:'500',color:'#8e8e93'},
  tabLabelOn:{color:'#007aff'},
})
