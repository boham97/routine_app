import { dateKey, addDays } from '../constants.js'
import { getMondayOfWeek } from '../utils/date.js'
import { useLocalState } from './useLocalState.js'

export function useWorkoutData() {
  const [workoutTemplates, setWorkoutTemplates] = useLocalState('workoutTemplates', [])
  const [workoutSessions,  setWorkoutSessions]  = useLocalState('workoutSessions',  [])

  const addWorkoutGroup    = (name, exercises) => setWorkoutTemplates(p => [...p, { id: Date.now(), name: name.trim(), exercises }])
  const updateWorkoutGroup = (id, changes)     => setWorkoutTemplates(p => p.map(t => t.id === id ? { ...t, ...changes } : t))

  function deleteWorkoutTpl(id) {
    setWorkoutTemplates(p => p.filter(t => t.id !== id))
    setWorkoutSessions(p => p.filter(s => s.templateId !== id))
  }

  function makeSession(tpl, date, id) {
    return {
      id, templateId: tpl.id, name: tpl.name, date,
      exercises: tpl.exercises.map(e => ({ ...e, completedSets: Array(e.sets).fill(false) })),
    }
  }

  function applyWorkoutTemplate(tpl, scope, selKey) {
    if (scope === 'today') {
      if (workoutSessions.find(x => x.templateId === tpl.id && x.date === selKey)) return
      setWorkoutSessions(p => [...p, makeSession(tpl, selKey, Date.now())])
      return
    }
    const base = Date.now()
    const monday = new Date(getMondayOfWeek(selKey) + 'T00:00:00')
    const toAdd = []
    for (let i = 0; i < 7; i++) {
      const dKey = dateKey(addDays(monday, i))
      if (!workoutSessions.find(x => x.templateId === tpl.id && x.date === dKey)) {
        const inst = makeSession(tpl, dKey, base + i)
        inst.isWeekly = true
        toAdd.push(inst)
      }
    }
    if (toAdd.length > 0) setWorkoutSessions(p => [...p, ...toAdd])
  }

  return {
    workoutTemplates, workoutSessions, setWorkoutSessions,
    addWorkoutGroup, updateWorkoutGroup, deleteWorkoutTpl,
    applyWorkoutTemplate,
  }
}
