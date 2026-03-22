import { useState, useEffect } from 'react'

const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DAYS = ['일','월','화','수','목','금','토']

function dateKey(d) {
  const date = d instanceof Date ? d : new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function today() {
  const d = new Date()
  d.setHours(0,0,0,0)
  return d
}

export default function App() {
  // 일반 할일
  const [todos, setTodos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('todos') || '[]') } catch { return [] }
  })
  // 루틴 템플릿
  const [routineTemplates, setRoutineTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('routineTemplates') || '[]') } catch { return [] }
  })
  // 날짜별 루틴 인스턴스
  const [routineInstances, setRoutineInstances] = useState(() => {
    try { return JSON.parse(localStorage.getItem('routineInstances') || '[]') } catch { return [] }
  })

  const [input, setInput] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [tab, setTab] = useState('todo')
  const [todoDate, setTodoDate] = useState(today())

  // 루틴 관리
  const [routineInput, setRoutineInput] = useState('')
  const [routineTaskInput, setRoutineTaskInput] = useState('')
  const [editingRoutine, setEditingRoutine] = useState(null) // templateId being edited
  const [showRoutineForm, setShowRoutineForm] = useState(false)

  // 통계
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  const [viewYear, setViewYear] = useState(thisYear)
  const [viewMonth, setViewMonth] = useState(thisMonth)

  useEffect(() => { localStorage.setItem('todos', JSON.stringify(todos)) }, [todos])
  useEffect(() => { localStorage.setItem('routineTemplates', JSON.stringify(routineTemplates)) }, [routineTemplates])
  useEffect(() => { localStorage.setItem('routineInstances', JSON.stringify(routineInstances)) }, [routineInstances])

  const todayKey = dateKey(today())
  const todoKey = dateKey(todoDate)
  const isToday = todoKey === todayKey

  const labelForDate = (d) => {
    const key = dateKey(d)
    if (key === todayKey) return '오늘'
    if (key === dateKey(addDays(today(), -1))) return '어제'
    if (key === dateKey(addDays(today(), 1))) return '내일'
    return null
  }

  // 일반 할일
  function addTodo() {
    const text = input.trim()
    if (!text) return
    const createdAt = new Date(todoDate)
    createdAt.setHours(12, 0, 0, 0)
    setTodos([...todos, { id: Date.now(), text, completed: false, createdAt: createdAt.toISOString(), completedAt: null }])
    setInput('')
    setShowInput(false)
  }

  function toggleTodo(id) {
    setTodos(todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t
    ))
  }

  function deleteTodo(id) {
    setTodos(todos.filter(t => t.id !== id))
  }

  // 루틴 템플릿 관리
  function createRoutineTemplate() {
    const name = routineInput.trim()
    if (!name) return
    const newTemplate = { id: Date.now(), name, tasks: [] }
    setRoutineTemplates([...routineTemplates, newTemplate])
    setRoutineInput('')
    setEditingRoutine(newTemplate.id)
    setShowRoutineForm(false)
  }

  function addTaskToTemplate(templateId) {
    const text = routineTaskInput.trim()
    if (!text) return
    setRoutineTemplates(routineTemplates.map(r =>
      r.id === templateId
        ? { ...r, tasks: [...r.tasks, { id: Date.now(), text }] }
        : r
    ))
    setRoutineTaskInput('')
  }

  function deleteRoutineTemplate(templateId) {
    setRoutineTemplates(routineTemplates.filter(r => r.id !== templateId))
    setRoutineInstances(routineInstances.filter(ri => ri.templateId !== templateId))
    if (editingRoutine === templateId) setEditingRoutine(null)
  }

  function removeTaskFromTemplate(templateId, taskId) {
    setRoutineTemplates(routineTemplates.map(r =>
      r.id === templateId
        ? { ...r, tasks: r.tasks.filter(t => t.id !== taskId) }
        : r
    ))
  }

  // 루틴 인스턴스 (날짜별)
  function addRoutineToDay(templateId) {
    const template = routineTemplates.find(r => r.id === templateId)
    if (!template) return
    const dateStr = todoKey
    // 이미 추가된 경우 스킵
    if (routineInstances.find(ri => ri.templateId === templateId && ri.date === dateStr)) return
    const instance = {
      id: Date.now(),
      templateId,
      name: template.name,
      date: dateStr,
      tasks: template.tasks.map(t => ({ id: t.id, text: t.text, completed: false })),
    }
    setRoutineInstances([...routineInstances, instance])
  }

  function removeRoutineFromDay(instanceId) {
    setRoutineInstances(routineInstances.filter(ri => ri.id !== instanceId))
  }

  // 루틴 인스턴스 내 할일 토글 (삭제 불가)
  function toggleRoutineTask(instanceId, taskId) {
    setRoutineInstances(routineInstances.map(ri =>
      ri.id === instanceId
        ? { ...ri, tasks: ri.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }
        : ri
    ))
  }

  const todosForDay = todos.filter(t => dateKey(t.createdAt) === todoKey)
  const instancesForDay = routineInstances.filter(ri => ri.date === todoKey)

  // 오늘 날짜에 추가 안 된 루틴 템플릿
  const addedTemplateIds = instancesForDay.map(ri => ri.templateId)
  const availableTemplates = routineTemplates.filter(r => !addedTemplateIds.includes(r.id))

  // 통계
  const isCurrentMonth = viewYear === thisYear && viewMonth === thisMonth
  function prevMonth() { viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y-1)) : setViewMonth(m => m-1) }
  function nextMonth() { viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y+1)) : setViewMonth(m => m+1) }

  // 통계에서 루틴 포함한 전체 완료율
  const allTodosMonth = todos.filter(t => {
    const d = new Date(t.createdAt)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth
  })
  const completedTodosMonth = allTodosMonth.filter(t => t.completed)
  const allInstancesMonth = routineInstances.filter(ri => {
    const d = new Date(ri.date)
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth
  })
  const allRoutineTasksMonth = allInstancesMonth.flatMap(ri => ri.tasks)
  const completedRoutineTasksMonth = allRoutineTasksMonth.filter(t => t.completed)
  const totalMonth = allTodosMonth.length + allRoutineTasksMonth.length
  const completedMonth = completedTodosMonth.length + completedRoutineTasksMonth.length

  const allTodosYear = todos.filter(t => new Date(t.createdAt).getFullYear() === viewYear)
  const allInstancesYear = routineInstances.filter(ri => new Date(ri.date).getFullYear() === viewYear)
  const allRoutineTasksYear = allInstancesYear.flatMap(ri => ri.tasks)
  const totalYear = allTodosYear.length + allRoutineTasksYear.length
  const completedYear = allTodosYear.filter(t => t.completed).length + allRoutineTasksYear.filter(t => t.completed).length

  const monthlyData = MONTHS.map((_, mi) => {
    const t = todos.filter(t => { const d = new Date(t.createdAt); return d.getFullYear() === viewYear && d.getMonth() === mi })
    const ri = routineInstances.filter(r => { const d = new Date(r.date); return d.getFullYear() === viewYear && d.getMonth() === mi })
    const rt = ri.flatMap(r => r.tasks)
    const added = t.length + rt.length
    const done = t.filter(x => x.completed).length + rt.filter(x => x.completed).length
    return { added, done }
  })
  const maxVal = Math.max(...monthlyData.map(m => m.added), 1)
  const rate = (done, total) => total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '812px', background: '#f2f2f7' }}>

      {/* Status Bar */}
      <div style={{
        height: '44px', background: '#f2f2f7',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', fontSize: '15px', fontWeight: '600',
      }}>
        <span>9:41</span>
        <span>●●●</span>
      </div>

      {/* Header */}
      <div style={{
        padding: '8px 20px 12px', background: '#f2f2f7',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: '34px', fontWeight: '700', color: '#000' }}>
          {tab === 'todo' ? '할 일' : tab === 'routine' ? '루틴' : '통계'}
        </h1>
        {tab === 'todo' && (
          <button
            onClick={() => setShowInput(!showInput)}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#007aff', border: 'none', color: '#fff',
              fontSize: '24px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: showInput ? 'rotate(45deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          >+</button>
        )}
        {tab === 'routine' && (
          <button
            onClick={() => { setShowRoutineForm(!showRoutineForm); setEditingRoutine(null) }}
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#007aff', border: 'none', color: '#fff',
              fontSize: '24px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: showRoutineForm ? 'rotate(45deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          >+</button>
        )}
      </div>

      {/* 일반 할일 입력 */}
      {tab === 'todo' && showInput && (
        <div style={{
          background: '#fff',
          borderTop: '0.5px solid #c6c6c8', borderBottom: '0.5px solid #c6c6c8',
          padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTodo(); if (e.key === 'Escape') setShowInput(false) }}
            placeholder="할 일 입력..."
            style={{
              flex: 1, height: '44px', border: 'none',
              background: '#f2f2f7', borderRadius: '10px',
              padding: '0 12px', fontSize: '15px', outline: 'none',
            }}
          />
          <button onClick={addTodo} style={{
            height: '44px', padding: '0 16px',
            background: '#007aff', border: 'none', borderRadius: '10px',
            color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
          }}>추가</button>
        </div>
      )}

      {/* 루틴 생성 폼 */}
      {tab === 'routine' && showRoutineForm && (
        <div style={{
          background: '#fff',
          borderTop: '0.5px solid #c6c6c8', borderBottom: '0.5px solid #c6c6c8',
          padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center',
        }}>
          <input
            autoFocus
            value={routineInput}
            onChange={e => setRoutineInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createRoutineTemplate(); if (e.key === 'Escape') setShowRoutineForm(false) }}
            placeholder="루틴 이름 입력..."
            style={{
              flex: 1, height: '44px', border: 'none',
              background: '#f2f2f7', borderRadius: '10px',
              padding: '0 12px', fontSize: '15px', outline: 'none',
            }}
          />
          <button onClick={createRoutineTemplate} style={{
            height: '44px', padding: '0 16px',
            background: '#007aff', border: 'none', borderRadius: '10px',
            color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
          }}>추가</button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>

        {/* ── 할일 탭 ── */}
        {tab === 'todo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* 날짜 네비게이터 */}
            <div style={{
              background: '#fff', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 8px',
            }}>
              <NavBtn onClick={() => setTodoDate(d => addDays(d, -1))}>‹</NavBtn>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#000' }}>
                  {todoDate.getFullYear()}년 {MONTHS[todoDate.getMonth()]} {todoDate.getDate()}일
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#8e8e93', marginLeft: '4px' }}>
                    ({DAYS[todoDate.getDay()]})
                  </span>
                </div>
                {labelForDate(todoDate) && (
                  <div style={{ fontSize: '11px', color: '#007aff', marginTop: '1px' }}>
                    {labelForDate(todoDate)}
                  </div>
                )}
              </div>
              <NavBtn onClick={() => setTodoDate(d => addDays(d, 1))}>›</NavBtn>
            </div>

            {/* 루틴 추가 버튼 */}
            {availableTemplates.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#8e8e93', marginBottom: '6px', paddingLeft: '4px' }}>
                  루틴 추가
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {availableTemplates.map(r => (
                    <button
                      key={r.id}
                      onClick={() => addRoutineToDay(r.id)}
                      style={{
                        padding: '6px 14px', background: '#fff', border: '1.5px solid #007aff',
                        borderRadius: '20px', color: '#007aff', fontSize: '14px',
                        fontWeight: '600', cursor: 'pointer',
                      }}
                    >+ {r.name}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 루틴 인스턴스 목록 */}
            {instancesForDay.map(instance => {
              const completedCount = instance.tasks.filter(t => t.completed).length
              const total = instance.tasks.length
              return (
                <div key={instance.id}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '6px', paddingLeft: '4px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: '700', color: '#fff',
                        background: '#ff9500', borderRadius: '6px', padding: '2px 7px',
                      }}>루틴</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#000' }}>{instance.name}</span>
                      <span style={{ fontSize: '12px', color: '#8e8e93' }}>{completedCount}/{total}</span>
                    </div>
                    <button
                      onClick={() => removeRoutineFromDay(instance.id)}
                      style={{
                        background: 'none', border: 'none', color: '#ff3b30',
                        fontSize: '13px', cursor: 'pointer', padding: '2px 4px',
                      }}
                    >제거</button>
                  </div>
                  <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
                    {instance.tasks.length === 0 ? (
                      <div style={{ padding: '14px 16px', color: '#8e8e93', fontSize: '14px' }}>
                        할 일이 없는 루틴입니다
                      </div>
                    ) : (
                      instance.tasks.map((task, i) => (
                        <div
                          key={task.id}
                          onClick={() => toggleRoutineTask(instance.id, task.id)}
                          style={{
                            padding: '14px 16px', fontSize: '15px',
                            color: task.completed ? '#8e8e93' : '#000',
                            borderTop: i === 0 ? 'none' : '0.5px solid #e5e5ea',
                            display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                          }}
                        >
                          <div style={{
                            width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                            border: task.completed ? 'none' : '2px solid #c6c6c8',
                            background: task.completed ? '#ff9500' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}>
                            {task.completed && (
                              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                                <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none' }}>
                            {task.text}
                          </span>
                          {/* 루틴 내 할일은 삭제 버튼 없음 - 루틴이 최소 단위 */}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}

            {/* 일반 할일 목록 */}
            {todosForDay.length > 0 && (
              <div>
                {instancesForDay.length > 0 && (
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#8e8e93', marginBottom: '6px', paddingLeft: '4px' }}>
                    개인 할 일
                  </div>
                )}
                <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
                  {todosForDay.map((todo, i) => (
                    <div
                      key={todo.id}
                      style={{
                        padding: '14px 16px', fontSize: '15px',
                        color: todo.completed ? '#8e8e93' : '#000',
                        borderTop: i === 0 ? 'none' : '0.5px solid #e5e5ea',
                        display: 'flex', alignItems: 'center', gap: '12px',
                      }}
                    >
                      <div
                        onClick={() => toggleTodo(todo.id)}
                        style={{
                          width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                          border: todo.completed ? 'none' : '2px solid #c6c6c8',
                          background: todo.completed ? '#34c759' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.2s', cursor: 'pointer',
                        }}
                      >
                        {todo.completed && (
                          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                            <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span
                        onClick={() => toggleTodo(todo.id)}
                        style={{ flex: 1, textDecoration: todo.completed ? 'line-through' : 'none', cursor: 'pointer' }}
                      >
                        {todo.text}
                      </span>
                      {/* 일반 할일은 삭제 가능 */}
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        style={{
                          background: 'none', border: 'none', color: '#c6c6c8',
                          fontSize: '18px', cursor: 'pointer', padding: '0 4px',
                          lineHeight: 1,
                        }}
                      >×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {todosForDay.length === 0 && instancesForDay.length === 0 && (
              <div style={{
                background: '#fff', borderRadius: '12px', padding: '16px',
                color: '#8e8e93', textAlign: 'center', fontSize: '15px',
              }}>
                할 일이 없습니다
              </div>
            )}
          </div>
        )}

        {/* ── 루틴 탭 ── */}
        {tab === 'routine' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {routineTemplates.length === 0 && !showRoutineForm && (
              <div style={{
                background: '#fff', borderRadius: '12px', padding: '16px',
                color: '#8e8e93', textAlign: 'center', fontSize: '15px',
              }}>
                루틴이 없습니다. + 버튼으로 추가하세요.
              </div>
            )}
            {routineTemplates.map(r => (
              <div key={r.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '6px', paddingLeft: '4px',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#000' }}>{r.name}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setEditingRoutine(editingRoutine === r.id ? null : r.id)}
                      style={{
                        background: 'none', border: 'none', color: '#007aff',
                        fontSize: '13px', cursor: 'pointer', padding: '2px 4px',
                      }}
                    >{editingRoutine === r.id ? '완료' : '편집'}</button>
                    <button
                      onClick={() => deleteRoutineTemplate(r.id)}
                      style={{
                        background: 'none', border: 'none', color: '#ff3b30',
                        fontSize: '13px', cursor: 'pointer', padding: '2px 4px',
                      }}
                    >삭제</button>
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
                  {r.tasks.length === 0 && editingRoutine !== r.id && (
                    <div style={{ padding: '14px 16px', color: '#8e8e93', fontSize: '14px' }}>
                      할 일을 추가하세요
                    </div>
                  )}
                  {r.tasks.map((task, i) => (
                    <div
                      key={task.id}
                      style={{
                        padding: '14px 16px', fontSize: '15px', color: '#000',
                        borderTop: i === 0 ? 'none' : '0.5px solid #e5e5ea',
                        display: 'flex', alignItems: 'center', gap: '12px',
                      }}
                    >
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                        border: '2px solid #c6c6c8', background: 'transparent',
                      }} />
                      <span style={{ flex: 1 }}>{task.text}</span>
                      {editingRoutine === r.id && (
                        <button
                          onClick={() => removeTaskFromTemplate(r.id, task.id)}
                          style={{
                            background: 'none', border: 'none', color: '#c6c6c8',
                            fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
                          }}
                        >×</button>
                      )}
                    </div>
                  ))}
                  {editingRoutine === r.id && (
                    <div style={{
                      borderTop: r.tasks.length > 0 ? '0.5px solid #e5e5ea' : 'none',
                      padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center',
                    }}>
                      <input
                        autoFocus
                        value={routineTaskInput}
                        onChange={e => setRoutineTaskInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addTaskToTemplate(r.id) }}
                        placeholder="할 일 추가..."
                        style={{
                          flex: 1, height: '36px', border: 'none',
                          background: '#f2f2f7', borderRadius: '8px',
                          padding: '0 10px', fontSize: '14px', outline: 'none',
                        }}
                      />
                      <button onClick={() => addTaskToTemplate(r.id)} style={{
                        height: '36px', padding: '0 12px',
                        background: '#007aff', border: 'none', borderRadius: '8px',
                        color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                      }}>추가</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 통계 탭 ── */}
        {tab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: '#fff', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 8px',
            }}>
              <NavBtn onClick={prevMonth}>‹</NavBtn>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#000' }}>
                  {viewYear}년 {MONTHS[viewMonth]}
                </div>
                {isCurrentMonth && (
                  <div style={{ fontSize: '11px', color: '#007aff', marginTop: '1px' }}>이번 달</div>
                )}
              </div>
              <NavBtn onClick={nextMonth} disabled={isCurrentMonth}>›</NavBtn>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#8e8e93', marginBottom: '8px', paddingLeft: '4px' }}>월간 통계</div>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', display: 'flex', gap: '8px' }}>
                <StatCard label="추가" value={totalMonth} color="#007aff" />
                <StatCard label="완료" value={completedMonth} color="#34c759" />
                <StatCard label="달성률" value={`${rate(completedMonth, totalMonth)}%`} color="#ff9500" />
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '13px', fontWeight: '600', color: '#8e8e93',
                marginBottom: '8px', paddingLeft: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>연간 통계 ({viewYear}년)</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <NavBtn small onClick={() => setViewYear(y => y-1)}>‹</NavBtn>
                  <NavBtn small onClick={() => setViewYear(y => y+1)} disabled={viewYear >= thisYear}>›</NavBtn>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', display: 'flex', gap: '8px' }}>
                <StatCard label="추가" value={totalYear} color="#007aff" />
                <StatCard label="완료" value={completedYear} color="#34c759" />
                <StatCard label="달성률" value={`${rate(completedYear, totalYear)}%`} color="#ff9500" />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#8e8e93', marginBottom: '8px', paddingLeft: '4px' }}>
                월별 현황 ({viewYear}년)
              </div>
              <div style={{ background: '#fff', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '100px', gap: '4px' }}>
                  {monthlyData.map((m, i) => (
                    <div
                      key={i}
                      onClick={() => setViewMonth(i)}
                      style={{
                        flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '2px', height: '100%',
                        justifyContent: 'flex-end', cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: '100%', position: 'relative',
                        height: `${(m.added / maxVal) * 80}px`,
                        minHeight: m.added > 0 ? '4px' : '0',
                      }}>
                        <div style={{
                          width: '100%', height: '100%',
                          background: i === viewMonth ? '#a0c4ff' : '#d1e4ff',
                          borderRadius: '3px 3px 0 0',
                        }} />
                        {m.done > 0 && (
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            height: `${(m.done / m.added) * 100}%`,
                            background: i === viewMonth ? '#2db84d' : '#34c759',
                            borderRadius: '3px 3px 0 0',
                          }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: '9px',
                        color: i === viewMonth ? '#007aff' : '#8e8e93',
                        fontWeight: i === viewMonth ? '700' : '400',
                      }}>{i+1}월</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '10px', height: '10px', background: '#d1e4ff', borderRadius: '2px' }} />
                    <span style={{ fontSize: '11px', color: '#8e8e93' }}>추가</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '10px', height: '10px', background: '#34c759', borderRadius: '2px' }} />
                    <span style={{ fontSize: '11px', color: '#8e8e93' }}>완료</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{
        height: '83px', background: 'rgba(242,242,247,0.95)',
        borderTop: '0.5px solid #c6c6c8',
        display: 'flex', alignItems: 'flex-start', paddingTop: '10px',
      }}>
        {[
          { key: 'todo', label: '할 일', icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="5" width="16" height="2.5" rx="1.25" fill="currentColor"/>
              <rect x="4" y="11" width="16" height="2.5" rx="1.25" fill="currentColor"/>
              <rect x="4" y="17" width="10" height="2.5" rx="1.25" fill="currentColor"/>
            </svg>
          )},
          { key: 'routine', label: '루틴', icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 10h16M4 14h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="17" cy="17" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M15.5 17l1 1 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )},
          { key: 'stats', label: '통계', icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="13" width="4" height="7" rx="1" fill="currentColor"/>
              <rect x="10" y="9" width="4" height="11" rx="1" fill="currentColor"/>
              <rect x="16" y="5" width="4" height="15" rx="1" fill="currentColor"/>
            </svg>
          )},
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px', background: 'none',
              border: 'none', cursor: 'pointer',
              color: tab === t.key ? '#007aff' : '#8e8e93',
            }}
          >
            {t.icon}
            <span style={{ fontSize: '10px', fontWeight: '500' }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: '#f2f2f7', borderRadius: '10px',
      padding: '12px 8px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '22px', fontWeight: '700', color }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function NavBtn({ onClick, disabled, small, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: small ? '24px' : '32px',
        height: small ? '24px' : '32px',
        borderRadius: '50%',
        background: disabled ? 'transparent' : '#f2f2f7',
        border: 'none',
        color: disabled ? '#c6c6c8' : '#007aff',
        fontSize: small ? '16px' : '20px',
        fontWeight: '600',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}
    >{children}</button>
  )
}
