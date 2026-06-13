import { dateKey, addDays, getToday } from '../constants.js'
import { getMondayOfWeek } from '../utils/date.js'
import { useLocalState } from './useLocalState.js'

export function useTodoGroupData() {
  const [todoTemplates, setTodoTemplates] = useLocalState('todoTemplates', [])
  const [todoGroups,    setTodoGroups]    = useLocalState('todoGroups',    [])

  const addGeneralGroup    = (name, items)  => setTodoTemplates(p => [...p, { id: Date.now(), name: name.trim(), items }])
  function updateGeneralGroup(id, changes) {
    setTodoTemplates(p => p.map(t => t.id === id ? { ...t, ...changes } : t))
    const today = dateKey(getToday())
    setTodoGroups(p => p.map(g => {
      if (g.templateId !== id || g.date < today) return g
      const next = { ...g }
      if (changes.name !== undefined) next.name = changes.name
      if (changes.items !== undefined) {
        next.items = changes.items.map(item => {
          const prev = g.items.find(x => x.id === item.id)
          const completedCounts = Array(item.count).fill(false)
          if (prev) {
            const n = Math.min(prev.completedCounts.length, item.count)
            for (let i = 0; i < n; i++) completedCounts[i] = prev.completedCounts[i]
          }
          return { ...item, completedCounts }
        })
      }
      return next
    }))
  }

  function deleteTodoTpl(id) {
    setTodoTemplates(p => p.filter(t => t.id !== id))
    setTodoGroups(p => p.filter(g => g.templateId !== id))
  }

  const removeTodoGroup = id => setTodoGroups(p => p.filter(g => g.id !== id))

  function toggleGroupItemCount(groupId, itemId, idx) {
    setTodoGroups(p => p.map(g => g.id !== groupId ? g : {
      ...g, items: g.items.map(item => item.id !== itemId ? item : {
        ...item, completedCounts: item.completedCounts.map((v, i) => i === idx ? !v : v)
      })
    }))
  }

  function makeGroup(tpl, date, id) {
    return {
      id, templateId: tpl.id, name: tpl.name, date,
      items: tpl.items.map(item => ({ ...item, completedCounts: Array(item.count).fill(false) })),
    }
  }

  function applyTodoTemplate(tpl, scope, selKey) {
    if (scope === 'today') {
      if (todoGroups.find(x => x.templateId === tpl.id && x.date === selKey)) return
      setTodoGroups(p => [...p, makeGroup(tpl, selKey, Date.now())])
      return
    }
    const base = Date.now()
    const monday = new Date(getMondayOfWeek(selKey) + 'T00:00:00')
    const toAdd = []
    for (let i = 0; i < 7; i++) {
      const dKey = dateKey(addDays(monday, i))
      if (!todoGroups.find(x => x.templateId === tpl.id && x.date === dKey)) {
        const inst = makeGroup(tpl, dKey, base + i)
        inst.isWeekly = true
        toAdd.push(inst)
      }
    }
    if (toAdd.length > 0) setTodoGroups(p => [...p, ...toAdd])
  }

  return {
    todoTemplates, todoGroups,
    addGeneralGroup, updateGeneralGroup, deleteTodoTpl,
    removeTodoGroup, toggleGroupItemCount,
    applyTodoTemplate,
  }
}
