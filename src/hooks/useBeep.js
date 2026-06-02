import { useRef } from 'react'

export function useBeep() {
  const ctxRef = useRef(null)

  function init() {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    } else if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
  }

  function play() {
    try {
      const ctx = ctxRef.current
      if (!ctx) return
      const beep = (freq, start, dur) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq; osc.type = 'sine'
        gain.gain.setValueAtTime(0.7, ctx.currentTime + start)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
        osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur)
      }
      beep(880, 0, 0.15); beep(880, 0.2, 0.15); beep(1100, 0.4, 0.4)
    } catch {}
  }

  return { init, play }
}
