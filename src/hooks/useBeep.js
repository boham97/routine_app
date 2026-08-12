import { useRef } from 'react'

// iOS Safari는 화면을 끄거나 앱을 나가면 setInterval을 멈추고 AudioContext를 suspend 시킨다.
// 그래서 WebAudio로 "타이머가 0이 되는 순간 톤 생성"하는 방식은 백그라운드에서 소리가 나지 않는다.
// 대신 [앞부분 무음 + 마지막 비프음] WAV를 미리 만들어 <audio>로 재생해 둔다.
// 미디어 재생은 백그라운드/잠금화면에서도 이어지고 무음 스위치의 영향도 받지 않으므로
// 정확한 시각에 알람이 울린다. (대신 재생 동안 다른 앱의 음악은 일시정지된다)

const SR = 8000 // 880/1100Hz 톤에 충분한 샘플레이트 (60초 무음이 약 1MB)

const TONES = {
  short:  [{ f: 880, s: 0,    d: 0.15 }, { f: 880, s: 0.2,  d: 0.15 }, { f: 1100, s: 0.4, d: 0.4 }],
  long:   [{ f: 880, s: 0,    d: 0.18 }, { f: 880, s: 0.22, d: 0.18 },
           { f: 880, s: 0.44, d: 0.18 }, { f: 1100, s: 0.7, d: 1.2 }],
  silent: [],
}

function buildWav(tones, padSec) {
  const tail = tones.reduce((m, t) => Math.max(m, t.s + t.d), 0)
  const n = Math.ceil((padSec + tail + 0.05) * SR)
  const bytes = new ArrayBuffer(44 + n * 2)
  const v = new DataView(bytes)
  const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }

  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, n * 2, true)

  for (const t of tones) {
    const from = Math.floor((padSec + t.s) * SR)
    const len  = Math.floor(t.d * SR)
    const k = Math.log(700) / t.d // 0.7 → 0.001 지수 감쇠 (WebAudio 램프와 동일한 느낌)
    for (let i = 0; i < len; i++) {
      const sec = i / SR
      const atk = Math.min(1, sec / 0.005) // 시작 클릭음 방지
      const amp = 0.7 * Math.exp(-k * sec) * atk
      v.setInt16(44 + (from + i) * 2, amp * Math.sin(2 * Math.PI * t.f * sec) * 32767, true)
    }
  }
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
}

// 같은 (종류, 무음길이) 조합은 재사용 — 휴식 60초 WAV를 매 세트 다시 만들지 않는다
const cache = new Map()
function wavUrl(kind, padSec = 0) {
  const key = `${kind}:${padSec}`
  let url = cache.get(key)
  if (!url) {
    url = buildWav(TONES[kind], padSec)
    cache.set(key, url)
    if (cache.size > 8) {
      const oldest = cache.keys().next().value
      URL.revokeObjectURL(cache.get(oldest)); cache.delete(oldest)
    }
  }
  return url
}

export function useBeep() {
  const cueRef   = useRef(null) // 즉시 재생용
  const alarmRef = useRef(null) // 예약 알람용 (무음 + 비프)
  const armedRef = useRef(false) // 예약 알람이 실제로 재생 중인지
  const unlockedRef = useRef(false)

  function el(ref) {
    if (!ref.current) {
      const a = new Audio()
      a.playsInline = true
      a.preload = 'auto'
      ref.current = a
    }
    return ref.current
  }

  // 사용자 터치 시점에 호출 — iOS 자동재생 정책을 여기서 풀어둬야
  // 나중에 타이머 콜백에서 play()가 차단되지 않는다.
  function init() {
    if (unlockedRef.current) return
    unlockedRef.current = true
    try { navigator.audioSession.type = 'playback' } catch {} // 백그라운드 재생 허용 (Safari 16.4+)
    for (const ref of [cueRef, alarmRef]) {
      const a = el(ref)
      a.src = wavUrl('silent')
      const p = a.play()
      if (p) p.catch(() => {})
    }
  }

  function cue(kind) {
    const a = el(cueRef)
    a.src = wavUrl(kind)
    const p = a.play()
    if (p) p.catch(() => {})
  }

  const play     = () => cue('short')
  const playLong = () => cue('long')

  // delaySec 뒤에 울릴 알람을 "지금" 재생 시작한다 (앞부분이 무음이라 그 시각에 소리가 남).
  // 백그라운드에서 JS가 멈춰도 오디오는 계속 흐르므로 제시간에 울린다.
  function scheduleLong(delaySec) {
    const a = el(alarmRef)
    a.pause()
    a.src = wavUrl('long', Math.max(0, Math.round(delaySec)))
    a.currentTime = 0
    armedRef.current = false
    const p = a.play()
    if (p) p.then(() => { armedRef.current = true }).catch(() => { armedRef.current = false })
    else armedRef.current = true
  }

  // 예약 시각 도달 — 예약 재생이 살아있으면 그대로 두고(이미 울리는 중),
  // 자동재생이 막혀 실패했으면 지금 바로 울린다.
  function endScheduled() {
    if (!armedRef.current) playLong()
    armedRef.current = false
  }

  // 휴식 취소/중단 — 예약된 알람을 없앤다
  function cancelScheduled() {
    if (alarmRef.current) alarmRef.current.pause()
    armedRef.current = false
  }

  return { init, play, playLong, scheduleLong, endScheduled, cancelScheduled }
}
