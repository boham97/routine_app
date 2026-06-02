import { getToday } from '../constants.js'
import { useLocalState } from './useLocalState.js'

export function useTodos() {
  const [todos, setTodos] = useLocalState('todos', [])

  function addTask({ name, taskType, goalMode, sets, reps, seconds, desc }) {
    const createdAt = getToday(); createdAt.setHours(12, 0, 0, 0)
    const base = { id: Date.now(), text: name, completed: false, createdAt: createdAt.toISOString(), taskType, ...(desc ? { desc } : {}) }
    if (taskType === 'workout') {
      const s = Math.max(1, parseInt(sets) || 4)
      base.goalMode = goalMode; base.sets = s
      if (goalMode === 'reps') base.reps    = parseInt(reps)    || 10
      else                     base.seconds = parseInt(seconds) || 60
      base.completedSets = Array(s).fill(false)
    }
    setTodos(p => [...p, base])
  }

  const toggleTodo = id => setTodos(p => p.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  const deleteTodo = id => setTodos(p => p.filter(t => t.id !== id))

  function toggleTaskSet(taskId, setIdx) {
    setTodos(p => p.map(t => {
      if (t.id !== taskId) return t
      const newSets = (t.completedSets || []).map((v, i) => i === setIdx ? !v : v)
      return { ...t, completedSets: newSets, completed: newSets.every(Boolean) }
    }))
  }

  function updateTask(id, changes) {
    setTodos(p => p.map(t => {
      if (t.id !== id) return t
      const updated = { ...t, ...changes }
      if ('sets' in changes && t.taskType === 'workout') {
        const n = Math.max(1, parseInt(changes.sets) || 1)
        updated.sets = n
        const old = t.completedSets || []
        updated.completedSets = Array(n).fill(false).map((_, i) => old[i] ?? false)
      }
      return updated
    }))
  }

  return { todos, addTask, toggleTodo, deleteTodo, toggleTaskSet, updateTask }
}
