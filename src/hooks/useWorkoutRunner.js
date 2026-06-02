import { useState, useRef, useEffect } from 'react'
import { useBeep } from './useBeep.js'

// 운동 세션 실행 흐름(세트 토글, 실제 횟수 입력, 휴식/운동 타이머, 비프음)을 한곳에 모음.
// 반환: { exTimer, restSec, pendingSet, pendingReps, setPendingReps,
//         toggleSet, confirmSet, cancelPending, addExerciseSet, removeSession }
export function useWorkoutRunner({ workoutSessions, setWorkoutSessions }) {
  const beep = useBeep()

  const [pendingSet,  setPendingSet]  = useState(null)
  const [pendingReps, setPendingReps] = useState(0)

  const [restSec, setRestSec] = useState(null)
  const restRef = useRef(null)

  // { sessionId, exerciseId, setIdx, elapsed, total }
  const [exTimer, setExTimer] = useState(null)
  const exRef = useRef(null)

  // 운동 타이머가 목표시간 도달하면 알림음
  useEffect(() => {
    if (exTimer && exTimer.elapsed === exTimer.total) beep.play()
  }, [exTimer]) // eslint-disable-line react-hooks/exhaustive-deps

  function startRestTimer() {
    beep.init()
    if (restRef.current) clearInterval(restRef.current)
    setRestSec(60)
    restRef.current = setInterval(() => {
      setRestSec(prev => {
        if (prev <= 1) {
          clearInterval(restRef.current); restRef.current = null
          beep.play()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  function setExerciseSet(sessionId, exerciseId, setIdx, mapValue) {
    setWorkoutSessions(p => p.map(s => s.id !== sessionId ? s : {
      ...s, exercises: s.exercises.map(e => e.id !== exerciseId ? e : {
        ...e, completedSets: Array.from({ length: e.sets }, (_, i) =>
          i === setIdx ? mapValue : (e.completedSets?.[i] ?? false)
        )
      })
    }))
  }

  function toggleSet(sessionId, exerciseId, setIdx) {
    const session = workoutSessions.find(s => s.id === sessionId)
    const ex = session?.exercises.find(e => e.id === exerciseId)
    const cur = ex?.completedSets?.[setIdx] ?? false

    // 진행중인 타이머가 있으면 실제 경과시간으로 기록 후 휴식 타이머 시작
    if (exTimer && exTimer.sessionId === sessionId && exTimer.exerciseId === exerciseId && exTimer.setIdx === setIdx) {
      clearInterval(exRef.current)
      const actual = exTimer.elapsed
      setExTimer(null)
      setExerciseSet(sessionId, exerciseId, setIdx, actual)
      startRestTimer()
      return
    }

    if (cur !== false) {
      setExerciseSet(sessionId, exerciseId, setIdx, false)
      return
    }

    if (ex?.unit === '초') {
      beep.init()
      clearInterval(exRef.current)
      setExTimer({ sessionId, exerciseId, setIdx, elapsed: 0, total: ex.reps })
      exRef.current = setInterval(() => {
        setExTimer(prev => {
          if (!prev) { clearInterval(exRef.current); return null }
          return { ...prev, elapsed: prev.elapsed + 1 }
        })
      }, 1000)
      return
    }

    setPendingSet({ sessionId, exerciseId, setIdx, plannedReps: ex?.reps ?? 0, unit: ex?.unit ?? '회' })
    setPendingReps(ex?.reps ?? 0)
  }

  function confirmSet() {
    if (!pendingSet) return
    const reps = pendingReps > 0 ? pendingReps : pendingSet.plannedReps
    setExerciseSet(pendingSet.sessionId, pendingSet.exerciseId, pendingSet.setIdx, reps)
    setPendingSet(null)
    startRestTimer()
  }

  function cancelPending() { setPendingSet(null) }

  function addExerciseSet(sessionId, exerciseId) {
    setWorkoutSessions(p => p.map(s => s.id !== sessionId ? s : {
      ...s, exercises: s.exercises.map(e => e.id !== exerciseId ? e : {
        ...e, sets: (e.sets || 0) + 1, completedSets: [...(e.completedSets || []), false],
      })
    }))
  }

  function removeSession(id) {
    if (exTimer?.sessionId === id) { clearInterval(exRef.current); setExTimer(null) }
    setWorkoutSessions(p => p.filter(s => s.id !== id))
  }

  return {
    exTimer, restSec,
    pendingSet, pendingReps, setPendingReps,
    toggleSet, confirmSet, cancelPending,
    addExerciseSet, removeSession,
  }
}
