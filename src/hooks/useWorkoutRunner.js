import { useState, useRef } from 'react'
import { useBeep } from './useBeep.js'

// 운동 세션 실행 흐름(세트 토글, 실제 횟수 입력, 휴식/운동 타이머, 비프음)을 한곳에 모음.
// 반환: { exTimer, restSec, pendingSet, pendingReps, setPendingReps,
//         toggleSet, confirmSet, cancelPending, addExerciseSet, removeSession }
//
// 모든 타이머는 tick 횟수가 아니라 실제 시각(deadline) 기준으로 계산한다.
// iOS Safari는 백그라운드/화면잠금에서 setInterval을 멈추기 때문에,
// 감소 카운트 방식이면 앱을 다시 열 때까지 타이머가 얼어붙는다.
const TICK = 250

export function useWorkoutRunner({ workoutSessions, setWorkoutSessions }) {
  const beep = useBeep()

  const [pendingSet,  setPendingSet]  = useState(null)
  const [pendingReps, setPendingReps] = useState(0)

  const [restSec, setRestSec] = useState(null)
  const restRef = useRef(null)
  const restEndRef = useRef(0)

  // { sessionId, exerciseId, setIdx, elapsed, total }
  const [exTimer, setExTimer] = useState(null)
  const exRef = useRef(null)

  // 타바타: 자동으로 진행 중인 운동. { sessionId, exerciseId }
  const [tabataRun, setTabataRun] = useState(null)
  const tabataStopRef = useRef(false)

  function clearRest() {
    if (restRef.current) { clearInterval(restRef.current); restRef.current = null }
    restEndRef.current = 0
    beep.cancelScheduled()
  }

  // 휴식 타이머. 종료음은 미리 예약해두므로 백그라운드에서도 제시간에 울린다.
  function startRestTimer(sec = 60, onDone) {
    beep.init()
    clearRest()
    restEndRef.current = Date.now() + sec * 1000
    setRestSec(sec)
    beep.scheduleLong(sec)
    restRef.current = setInterval(() => {
      const left = Math.ceil((restEndRef.current - Date.now()) / 1000)
      if (left > 0) { setRestSec(left); return }
      clearInterval(restRef.current); restRef.current = null
      restEndRef.current = 0
      setRestSec(null)
      beep.endScheduled()
      onDone?.()
    }, TICK)
  }

  function getEx(sessionId, exerciseId) {
    const session = workoutSessions.find(s => s.id === sessionId)
    return session?.exercises.find(e => e.id === exerciseId)
  }

  function stopTabata() {
    tabataStopRef.current = true
    if (exRef.current) { clearInterval(exRef.current); exRef.current = null }
    clearRest()
    setExTimer(null); setRestSec(null); setTabataRun(null)
  }

  function startTabata(sessionId, exerciseId) {
    const ex = getEx(sessionId, exerciseId)
    if (!ex) return
    const startIdx = (ex.completedSets || []).findIndex(v => v === false)
    if (startIdx === -1) return
    beep.init()
    tabataStopRef.current = false
    setTabataRun({ sessionId, exerciseId })
    runTabataWork(sessionId, exerciseId, startIdx)
  }

  function runTabataWork(sessionId, exerciseId, setIdx) {
    if (tabataStopRef.current) return
    const ex = getEx(sessionId, exerciseId)
    if (!ex) { setTabataRun(null); return }
    clearInterval(exRef.current)
    const total = ex.reps
    const startAt = Date.now()
    setExTimer({ sessionId, exerciseId, setIdx, elapsed: 0, total })
    exRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startAt) / 1000)
      if (elapsed < total) {
        setExTimer(prev => (!prev || prev.elapsed === elapsed) ? prev : { ...prev, elapsed })
        return
      }
      clearInterval(exRef.current); exRef.current = null
      beep.play()
      setExTimer(null)
      setExerciseSet(sessionId, exerciseId, setIdx, total)
      const nextIdx = setIdx + 1
      if (tabataStopRef.current || nextIdx >= ex.sets) {
        setTabataRun(null)
      } else {
        startRestTimer(ex.restSec || 20, () => {
          if (!tabataStopRef.current) runTabataWork(sessionId, exerciseId, nextIdx)
        })
      }
    }, TICK)
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
    if (tabataRun && tabataRun.sessionId === sessionId && tabataRun.exerciseId === exerciseId) return
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
      const total = ex.reps
      const startAt = Date.now()
      let notified = false
      setExTimer({ sessionId, exerciseId, setIdx, elapsed: 0, total })
      exRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startAt) / 1000)
        // 목표 도달 알림 (백그라운드에 있다 돌아와 초가 건너뛰어도 한 번은 울린다)
        if (!notified && elapsed >= total) { notified = true; beep.play() }
        setExTimer(prev => (!prev || prev.elapsed === elapsed) ? prev : { ...prev, elapsed })
      }, TICK)
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
    if (tabataRun?.sessionId === id) stopTabata()
    if (exTimer?.sessionId === id) { clearInterval(exRef.current); setExTimer(null) }
    setWorkoutSessions(p => p.filter(s => s.id !== id))
  }

  return {
    exTimer, restSec,
    pendingSet, pendingReps, setPendingReps,
    toggleSet, confirmSet, cancelPending,
    addExerciseSet, removeSession,
    tabataRun, startTabata, stopTabata,
  }
}
