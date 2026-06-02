import { useState, useRef, useEffect } from 'react'
import { getToday, dateKey, MONTHS, DAYS } from '../constants.js'
import { EmptyCard, useHold } from './ui.jsx'
import { useLocalState } from '../hooks/useLocalState.js'

// 한 달치 날짜 그리드 (항상 6줄 = 42칸, 앞뒤로 인접 달 날짜를 이어서 채우되 연하게)
function MonthGrid({ y, m, value, onChange }) {
  const monthFirst = new Date(y, m, 1)
  const canonMonth = monthFirst.getMonth()
  const firstWeekday = monthFirst.getDay()
  const start = new Date(y, m, 1 - firstWeekday)   // 첫 칸(이전 달일 수 있음)
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const todayK = dateKey(getToday())
  return (
    <div style={{ width: '100%', flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
      {cells.map((date, idx) => {
        const key = dateKey(date)
        const inMonth = date.getMonth() === canonMonth
        const selected = key === value
        const isToday = key === todayK
        return (
          <button key={idx} onClick={() => onChange(selected ? '' : key)} style={{
            height: '34px', border: 'none', borderRadius: '8px', cursor: 'pointer', position: 'relative',
            background: selected ? '#007aff' : 'transparent',
            color: selected ? '#fff' : inMonth ? '#000' : '#c6c6c8',
            fontSize: '14px', fontWeight: selected || isToday ? '700' : '400',
          }}>
            {date.getDate()}
            {isToday && !selected && <span style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#007aff' }} />}
          </button>
        )
      })}
    </div>
  )
}

// 시트 안에 바로 표시되는 인라인 달력 (위아래 스와이프로 월 이동, 위로=다음달, 3패널 세로 캐러셀)
function Calendar({ value, onChange }) {
  const base = value ? new Date(value + 'T00:00:00') : getToday()
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1))
  const year = view.getFullYear(), month = view.getMonth()
  const navBtn = { width: '32px', height: '32px', borderRadius: '50%', background: '#f2f2f7', border: 'none', color: '#007aff', fontSize: '18px', fontWeight: '600', cursor: 'pointer' }

  const CENTER = -100 / 3
  const GRID_H = 214                          // 6줄 그리드 한 달치 높이
  const [dy, setDy] = useState(0)             // 드래그 중 세로 이동(px)
  const [dragging, setDragging] = useState(false)
  const [commit, setCommit] = useState(0)     // 0 없음 / +1 다음달(위로) / -1 이전달(아래로)
  const [noTrans, setNoTrans] = useState(false)
  const startX = useRef(null), startY = useRef(null), isV = useRef(false)
  const viewportRef = useRef(null)

  function commitMonth(dir) {
    if (commit !== 0) return
    setDy(0); setCommit(dir)
    setTimeout(() => {
      setNoTrans(true)
      setView(v => new Date(v.getFullYear(), v.getMonth() + dir, 1))
      setCommit(0)
      requestAnimationFrame(() => requestAnimationFrame(() => setNoTrans(false)))
    }, 290)
  }

  function onTS(e) { e.stopPropagation(); startX.current = e.touches[0].clientX; startY.current = e.touches[0].clientY; isV.current = false; setDragging(true) }
  function onTM(e) {
    e.stopPropagation()
    if (startY.current === null) return
    const ddx = e.touches[0].clientX - startX.current
    const ddy = e.touches[0].clientY - startY.current
    if (!isV.current && (Math.abs(ddx) > 5 || Math.abs(ddy) > 5)) isV.current = Math.abs(ddy) > Math.abs(ddx)
    if (isV.current) setDy(ddy)
  }
  function onTE(e) {
    e.stopPropagation()
    if (startY.current === null) return
    const ddy = e.changedTouches[0].clientY - startY.current
    const vertical = isV.current
    startY.current = null; isV.current = false
    setDragging(false)
    if (vertical && Math.abs(ddy) > 40) commitMonth(ddy < 0 ? 1 : -1)
    else setDy(0)
  }

  // 세로 스와이프 중 패널 스크롤 간섭 차단
  useEffect(() => {
    const el = viewportRef.current; if (!el) return
    const handler = e => { if (isV.current) e.preventDefault() }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }, [])

  const translate = commit !== 0
    ? `translateY(${CENTER - commit * (100 / 3)}%)`
    : `translateY(calc(${CENTER}% + ${dy}px))`
  const transition = (dragging || noTrans) ? 'none' : 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

  return (
    <div style={{ background: '#fff', borderRadius: '10px', padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button onClick={() => commitMonth(1)} style={navBtn}>↑</button>
        <span style={{ fontSize: '15px', fontWeight: '700' }}>{year}년 {MONTHS[month]}</span>
        <button onClick={() => commitMonth(-1)} style={navBtn}>↓</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', marginBottom: '4px' }}>
        {DAYS.map((w, i) => <span key={w} style={{ fontSize: '11px', fontWeight: '600', color: i === 0 ? '#ff3b30' : i === 6 ? '#007aff' : '#8e8e93' }}>{w}</span>)}
      </div>
      <div ref={viewportRef} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} style={{ height: GRID_H + 'px', overflow: 'hidden', touchAction: 'none' }}>
        <div style={{ transform: translate, transition, willChange: 'transform' }}>
          <MonthGrid y={year} m={month - 1} value={value} onChange={onChange} />
          <MonthGrid y={year} m={month} value={value} onChange={onChange} />
          <MonthGrid y={year} m={month + 1} value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  )
}

// iOS push 내비게이션 슬라이드 패널 (오른쪽에서 들어오고, 오른쪽 스와이프로 닫힘)
function useSlidePanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [entered, setEntered] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const panelRef = useRef(null)
  const txStart = useRef(null)
  const tyStart = useRef(null)
  const isHSwipe = useRef(false)

  function open() {
    setIsOpen(true); setLeaving(false); setDragX(0)
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
  }
  function close(onDone) {
    setLeaving(true); setDragX(0)
    setTimeout(() => { setIsOpen(false); setEntered(false); setLeaving(false); onDone?.() }, 280)
  }
  function onTouchStart(e) {
    e.stopPropagation()
    txStart.current = e.touches[0].clientX; tyStart.current = e.touches[0].clientY
    isHSwipe.current = false; setDragging(false)
  }
  function onTouchMove(e) {
    e.stopPropagation()
    if (txStart.current === null) return
    const dx = e.touches[0].clientX - txStart.current
    const dy = e.touches[0].clientY - tyStart.current
    if (!isHSwipe.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
    if (!isHSwipe.current) isHSwipe.current = Math.abs(dx) > Math.abs(dy)
    if (isHSwipe.current && dx > 0) { setDragging(true); setDragX(dx) }
  }
  function onTouchEnd(e, onSwipeClose) {
    e.stopPropagation()
    if (!isHSwipe.current) { setDragX(0); return }
    const dx = e.changedTouches[0].clientX - (txStart.current ?? 0)
    setDragging(false); setDragX(0)
    if (dx > 60) onSwipeClose()
    txStart.current = null
  }

  useEffect(() => {
    const el = panelRef.current; if (!el) return
    const handler = e => { if (isHSwipe.current) e.preventDefault() }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }, [isOpen])

  const transform = leaving ? 'translateX(100%)' : entered ? `translateX(${dragging ? dragX : 0}px)` : 'translateX(100%)'
  const transition = dragging ? 'none' : 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

  return { isOpen, open, close, panelRef, onTouchStart, onTouchMove, onTouchEnd, transform, transition }
}

// 유통기한이 가까울수록 빨간색 (통계 탭 rateColor와 동일 팔레트, 방향만 반대)
function expiryColor(days) {
  if (days === null) return '#c6c6c8'
  if (days <= 1) return '#ff3b30'
  if (days <= 3) return '#ff9500'
  if (days <= 7) return '#00c7be'
  return '#34c759'
}
function expiryLabel(days) {
  if (days === null) return '–'
  if (days < 0) return '지남'
  if (days === 0) return '오늘'
  return `D-${days}`
}
function daysUntil(expiry) {
  if (!expiry) return null
  const today = getToday()
  const exp = new Date(expiry + 'T00:00:00')
  return Math.round((exp - today) / 86400000)
}
function fmtDate(expiry) {
  if (!expiry) return '유통기한 없음'
  const [y, m, d] = expiry.split('-')
  return `${y}.${m}.${d}`
}

// 드래그형 숫자 휠 (키보드 없이 위아래 드래그로 값 선택, 플릭 시 관성 스크롤)
function NumberWheel({ value, max, min = 0, onChange, width = '100%' }) {
  const ITEM_H = 46
  const HALF = 2
  const BUF = HALF
  const PX_PER_UNIT = 30          // 작을수록 더 빨리 굴러감
  const [, force] = useState(0)
  const rerender = () => force(n => n + 1)
  const pos = useRef(value)        // 실수 위치 (현재 값 + 소수 오프셋)
  const dragging = useRef(false)
  const lastY = useRef(0)
  const lastT = useRef(0)
  const vel = useRef(0)            // 단위/ms
  const raf = useRef(0)

  // 드래그/관성 중이 아닐 때만 외부 value와 동기화
  useEffect(() => {
    if (!dragging.current && raf.current === 0) { pos.current = value; rerender() }
  }, [value])

  const apply = () => {
    pos.current = Math.min(max, Math.max(min, pos.current))
    const intVal = Math.round(pos.current)
    if (intVal !== value) onChange(intVal)
    rerender()
  }
  const onStart = clientY => {
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0 }
    dragging.current = true
    lastY.current = clientY; lastT.current = performance.now(); vel.current = 0
  }
  const onMove = clientY => {
    if (!dragging.current) return
    const now = performance.now()
    const dPos = (lastY.current - clientY) / PX_PER_UNIT
    pos.current += dPos
    const dt = now - lastT.current
    if (dt > 0) vel.current = dPos / dt
    lastY.current = clientY; lastT.current = now
    apply()
  }
  const onEnd = () => {
    if (!dragging.current) return
    dragging.current = false
    let last = performance.now()
    const step = () => {
      const now = performance.now(); const dt = Math.min(40, now - last); last = now
      pos.current += vel.current * dt
      vel.current *= Math.pow(0.95, dt / 16)
      if (pos.current <= min) { pos.current = min; vel.current = 0 }
      if (pos.current >= max) { pos.current = max; vel.current = 0 }
      apply()
      if (Math.abs(vel.current) > 0.0012) { raf.current = requestAnimationFrame(step) }
      else { raf.current = 0; pos.current = Math.round(pos.current); apply() }
    }
    if (Math.abs(vel.current) > 0.0012) raf.current = requestAnimationFrame(step)
    else { pos.current = Math.round(pos.current); apply() }
  }
  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current) }, [])

  const offset = (pos.current - value) * ITEM_H
  const moving = dragging.current || raf.current !== 0
  return (
    <div
      onMouseDown={e => onStart(e.clientY)}
      onMouseMove={e => onMove(e.clientY)}
      onMouseUp={onEnd} onMouseLeave={onEnd}
      onTouchStart={e => { e.stopPropagation(); onStart(e.touches[0].clientY) }}
      onTouchMove={e => { e.preventDefault(); e.stopPropagation(); onMove(e.touches[0].clientY) }}
      onTouchEnd={onEnd}
      style={{ cursor: 'ns-resize', userSelect: 'none', touchAction: 'none', position: 'relative', width, height: ITEM_H * (HALF * 2 + 1), overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: HALF * ITEM_H, left: 0, right: 0, height: ITEM_H, background: '#f2f2f7', borderRadius: '8px', pointerEvents: 'none' }} />
      <div style={{ transform: `translateY(${-offset - BUF * ITEM_H}px)`, transition: moving ? 'none' : 'transform 0.12s ease' }}>
        {Array.from({ length: HALF * 2 + 1 + BUF * 2 }, (_, i) => {
          const val = value - HALF - BUF + i
          const dist = Math.abs(i - (HALF + BUF) - offset / ITEM_H)
          const opacity = Math.max(0, 1 - dist * 0.45)
          const fontSize = Math.max(16, 30 - dist * 9)
          return (
            <div key={i} style={{ height: ITEM_H, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity }}>
              {val >= min && val <= max && <span style={{ fontSize, fontWeight: '700', color: val === value ? '#000' : '#8e8e93' }}>{val}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function FoodTab({ confirm }) {
  const [foods, setFoods] = useLocalState('foods', [])
  const addFood    = food         => setFoods(p => [...p, { id: Date.now(), ...food }])
  const removeFood = id           => setFoods(p => p.filter(f => f.id !== id))
  const updateFood = (id, patch)  => setFoods(p => p.map(f => f.id === id ? { ...f, ...patch } : f))

  const [name,   setName]   = useState('')
  const [expRaw, setExpRaw] = useState('')   // 숫자만 최대 8자리 (YYYYMMDD)
  const [qty,    setQty]    = useState('')
  const [decimal, setDecimal] = useState(false)
  const [storage, setStorage] = useState('냉장고')
  const nameRef = useRef(null)
  const expiryStr = expRaw.length === 8 ? `${expRaw.slice(0, 4)}-${expRaw.slice(4, 6)}-${expRaw.slice(6, 8)}` : ''
  function fmtExpInput(d) {
    if (!d) return ''
    let s = d.slice(0, 4)
    if (d.length > 4) s += '.' + d.slice(4, 6)
    if (d.length > 6) s += '.' + d.slice(6, 8)
    return s
  }

  const sorted = [...foods].sort((a, b) => {
    if (!a.expiry && !b.expiry) return 0
    if (!a.expiry) return 1
    if (!b.expiry) return -1
    return a.expiry < b.expiry ? -1 : a.expiry > b.expiry ? 1 : 0
  })

  // ── 슬라이드 패널 (식자재 추가) ───────────────────────────────
  const addPanel = useSlidePanel()
  const [calOpen, setCalOpen] = useState(false)
  const [qtyOpen, setQtyOpen] = useState(false)
  function openSheet() {
    setName(''); setExpRaw(''); setQty('1'); setDecimal(false); setStorage('냉장고')
    addPanel.open()
    setTimeout(() => nameRef.current?.focus(), 320)
  }
  function closeSheet() { addPanel.close() }

  // ── 슬라이드 패널 (식자재 사용/수정) ──────────────────────────
  const usePanel = useSlidePanel()
  const [detailId, setDetailId] = useState(null)
  const [dName, setDName] = useState('')
  const [dStorage, setDStorage] = useState('냉장고')
  const [dExpRaw, setDExpRaw] = useState('')
  const [dDecimal, setDDecimal] = useState(false)
  const [dQty, setDQty] = useState(0)
  const detail = foods.find(f => f.id === detailId) || null
  const dExpiryStr = dExpRaw.length === 8 ? `${dExpRaw.slice(0, 4)}-${dExpRaw.slice(4, 6)}-${dExpRaw.slice(6, 8)}` : ''
  const detailStep = dDecimal ? 0.2 : 1
  const round1 = v => Math.round(v * 10) / 10
  const fmtQ = v => (dDecimal ? round1(v).toFixed(1) : String(Math.round(v)))
  const qtyHold = useHold()
  const decQ = () => setDQty(v => Math.max(0, round1(v - detailStep)))
  const incQ = () => setDQty(v => round1(v + detailStep))
  const qtyHoldProps = fn => ({
    onPointerDown: e => { e.preventDefault(); qtyHold.start(fn) },
    onPointerUp: qtyHold.stop, onPointerLeave: qtyHold.stop, onPointerCancel: qtyHold.stop,
  })
  const dCanSave = dName.trim().length > 0
  function openDetail(item) {
    setDetailId(item.id)
    setDName(item.name)
    setDStorage(item.storage || '냉장고')
    setDExpRaw(item.expiry ? item.expiry.replace(/-/g, '') : '')
    setDDecimal(!!item.decimal)
    setDQty(Number(item.quantity) || 0)
    usePanel.open()
  }
  function closeDetail() { usePanel.close() }
  const willDelete = Number(fmtQ(dQty)) === 0
  function saveDetail() {
    if (!detail || !dCanSave) return
    if (willDelete) { removeFood(detail.id); closeDetail(); return }
    updateFood(detail.id, { name: dName.trim(), storage: dStorage, expiry: dExpiryStr || null, decimal: dDecimal, quantity: fmtQ(dQty) })
    closeDetail()
  }

  const intPart = Math.trunc(Number(qty) || 0)
  function setIntPart(n) { setQty(String(n)) }

  // 달력 모달: 'add'(추가폼) 또는 'edit'(상세폼) 대상에 따라 값/콜백 분기
  const [calFor, setCalFor] = useState('add')
  function openCal(target) { setCalFor(target); setCalOpen(true) }
  function pickDate(key) {
    const set = calFor === 'edit' ? setDExpRaw : setExpRaw
    if (key) { const [y, m, d] = key.split('-'); set(y + m + d) }
    else set('')
    setCalOpen(false)
  }

  const canAdd = name.trim().length > 0
  function handleAdd() {
    if (!canAdd) return
    const q = qty.trim() === '' ? '0' : String(Math.trunc(Number(qty) || 0))
    addFood({ name: name.trim(), expiry: expiryStr || null, quantity: q, storage, decimal })
    closeSheet()
  }

  const fieldLabel = { fontSize: '12px', fontWeight: '600', color: '#8e8e93', padding: '0 2px 6px', letterSpacing: '0.3px' }
  const fieldInput = { width: '100%', height: '44px', background: '#fff', border: 'none', borderRadius: '10px', padding: '0 12px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* 목록 */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '8px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sorted.length === 0 ? (
            <EmptyCard>등록된 식자재가 없습니다{'\n'}아래 버튼으로 추가해보세요</EmptyCard>
          ) : sorted.map(item => {
            const days = daysUntil(item.expiry)
            const color = expiryColor(days)
            return (
              <div key={item.id} onClick={() => openDetail(item)} style={{ background: '#fff', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <div style={{ width: '52px', height: '40px', borderRadius: '10px', background: color, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1 }}>{expiryLabel(days)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {item.storage && <span style={{ background: '#f2f2f7', color: '#636366', borderRadius: '5px', padding: '1px 6px', fontWeight: '600', flexShrink: 0 }}>{item.storage}</span>}
                    <span>{fmtDate(item.expiry)}</span>
                    {item.quantity != null && item.quantity !== '' && <span>· {item.quantity}개</span>}
                  </div>
                </div>
                <span style={{ color: '#c6c6c8', fontSize: '16px', flexShrink: 0 }}>›</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 슬라이드 패널 */}
      {addPanel.isOpen && (
        <div
          ref={addPanel.panelRef}
          onTouchStart={addPanel.onTouchStart}
          onTouchMove={addPanel.onTouchMove}
          onTouchEnd={e => addPanel.onTouchEnd(e, closeSheet)}
          style={{ position: 'absolute', inset: 0, background: '#f2f2f7', transform: addPanel.transform, transition: addPanel.transition, display: 'flex', flexDirection: 'column', zIndex: 20, touchAction: 'pan-y' }}
        >
          <div style={{ height: '52px', flexShrink: 0, background: 'rgba(242,242,247,0.96)', borderBottom: '0.5px solid #c6c6c8', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
            <button onClick={closeSheet} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'none', border: 'none', color: '#007aff', fontSize: '16px', cursor: 'pointer', padding: '8px 10px' }}>
              <span style={{ fontSize: '22px', lineHeight: 1, marginTop: '-1px' }}>‹</span> 식자재
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: '600', color: '#000' }}>새 식자재</span>
            <div style={{ width: '60px' }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div>
                <div style={fieldLabel}>이름</div>
                <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="식자재 이름" style={fieldInput} />
              </div>

              <div>
                <div style={fieldLabel}>보관</div>
                <div style={{ display: 'flex', background: '#fff', borderRadius: '10px', padding: '3px', gap: '3px' }}>
                  {['상온', '냉장고', '냉동실'].map(s => (
                    <button key={s} onClick={() => setStorage(s)} style={{
                      flex: 1, height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '14px', fontWeight: '600',
                      background: storage === s ? '#007aff' : 'transparent',
                      color: storage === s ? '#fff' : '#8e8e93',
                    }}>{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={fieldLabel}>유통기한</div>
                <div style={{ position: 'relative' }}>
                  <input readOnly value={fmtExpInput(expRaw)} onClick={() => openCal('add')} placeholder="YYYY.MM.DD" style={{ ...fieldInput, paddingRight: '46px', cursor: 'pointer' }} />
                  <button onClick={() => openCal('add')} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <div style={fieldLabel}>수량</div>
                <button onClick={() => setQtyOpen(true)} style={{ ...fieldInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ color: qty.trim() === '' ? '#c6c6c8' : '#000' }}>{intPart}개</span>
                  <span style={{ color: '#c6c6c8', fontSize: '20px', lineHeight: 1 }}>›</span>
                </button>
                <button onClick={() => setDecimal(d => !d)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', height: '40px', marginTop: '4px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: decimal ? '#007aff' : '#fff', border: decimal ? 'none' : '1.5px solid #c6c6c8', color: '#fff', fontSize: '13px', fontWeight: '700' }}>{decimal ? '✓' : ''}</span>
                  <span style={{ fontSize: '14px', color: '#3c3c43' }}>소수 단위 사용</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button onClick={closeSheet} style={{ flex: 1, height: '48px', borderRadius: '10px', border: 'none', background: '#fff', color: '#8e8e93', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>취소</button>
                <button onClick={handleAdd} disabled={!canAdd} style={{ flex: 1, height: '48px', borderRadius: '10px', border: 'none', background: canAdd ? '#007aff' : '#c6c6c8', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: canAdd ? 'pointer' : 'default' }}>추가</button>
              </div>
          </div>
        </div>
      )}

      {/* 식자재 사용/수정 패널 */}
      {usePanel.isOpen && detail && (
        <div
          ref={usePanel.panelRef}
          onTouchStart={usePanel.onTouchStart}
          onTouchMove={usePanel.onTouchMove}
          onTouchEnd={e => usePanel.onTouchEnd(e, closeDetail)}
          style={{ position: 'absolute', inset: 0, background: '#f2f2f7', transform: usePanel.transform, transition: usePanel.transition, display: 'flex', flexDirection: 'column', zIndex: 20, touchAction: 'pan-y' }}
        >
          <div style={{ height: '52px', flexShrink: 0, background: 'rgba(242,242,247,0.96)', borderBottom: '0.5px solid #c6c6c8', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
            <button onClick={closeDetail} style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'none', border: 'none', color: '#007aff', fontSize: '16px', cursor: 'pointer', padding: '8px 10px' }}>
              <span style={{ fontSize: '22px', lineHeight: 1, marginTop: '-1px' }}>‹</span> 식자재
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: '600', color: '#000' }}>{detail.name}</span>
            <div style={{ width: '60px' }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'scroll', WebkitOverflowScrolling: 'touch', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div>
                <div style={fieldLabel}>이름</div>
                <input value={dName} onChange={e => setDName(e.target.value)} placeholder="식자재 이름" style={fieldInput} />
              </div>

              <div>
                <div style={fieldLabel}>보관</div>
                <div style={{ display: 'flex', background: '#fff', borderRadius: '10px', padding: '3px', gap: '3px' }}>
                  {['상온', '냉장고', '냉동실'].map(s => (
                    <button key={s} onClick={() => setDStorage(s)} style={{
                      flex: 1, height: '38px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '14px', fontWeight: '600',
                      background: dStorage === s ? '#007aff' : 'transparent',
                      color: dStorage === s ? '#fff' : '#8e8e93',
                    }}>{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <div style={fieldLabel}>유통기한</div>
                <div style={{ position: 'relative' }}>
                  <input readOnly value={fmtExpInput(dExpRaw)} onClick={() => openCal('edit')} placeholder="YYYY.MM.DD" style={{ ...fieldInput, paddingRight: '46px', cursor: 'pointer' }} />
                  <button onClick={() => openCal('edit')} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '38px', height: '38px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <div style={fieldLabel}>남은 수량 · {dDecimal ? '0.2개' : '1개'} 단위</div>
                <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button {...qtyHoldProps(decQ)} style={{ width: '48px', height: '48px', border: 'none', background: '#ebebeb', borderRadius: '10px 0 0 10px', fontSize: '24px', cursor: 'pointer', color: '#007aff', fontWeight: '700', lineHeight: 1, touchAction: 'none' }}>−</button>
                    <div style={{ minWidth: '96px', height: '48px', background: '#ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', borderLeft: '0.5px solid #d1d1d6', borderRight: '0.5px solid #d1d1d6' }}>
                      <span style={{ fontSize: '22px', fontWeight: '700', color: '#000', lineHeight: 1 }}>{fmtQ(dQty)}</span>
                      <span style={{ fontSize: '14px', color: '#8e8e93', lineHeight: 1 }}>개</span>
                    </div>
                    <button {...qtyHoldProps(incQ)} style={{ width: '48px', height: '48px', border: 'none', background: '#ebebeb', borderRadius: '0 10px 10px 0', fontSize: '24px', cursor: 'pointer', color: '#007aff', fontWeight: '700', lineHeight: 1, touchAction: 'none' }}>+</button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
                  <button onClick={() => setDDecimal(d => !d)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', height: '40px' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: dDecimal ? '#007aff' : '#fff', border: dDecimal ? 'none' : '1.5px solid #c6c6c8', color: '#fff', fontSize: '13px', fontWeight: '700' }}>{dDecimal ? '✓' : ''}</span>
                    <span style={{ fontSize: '14px', color: '#3c3c43' }}>소수 단위 사용</span>
                  </button>
                  {willDelete && <span style={{ fontSize: '13px', fontWeight: '600', color: '#ff3b30', flexShrink: 0 }}>0개 되면 삭제됩니다</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => confirm(`"${detail.name}"을(를) 삭제할까요?`, () => { removeFood(detail.id); closeDetail() })} style={{ flex: 1, height: '50px', border: 'none', borderRadius: '14px', background: '#fff', color: '#ff3b30', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>삭제</button>
                <button onClick={saveDetail} disabled={!dCanSave} style={{ flex: 1, height: '50px', border: 'none', borderRadius: '14px', background: dCanSave ? '#007aff' : '#c6c6c8', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: dCanSave ? 'pointer' : 'default' }}>완료</button>
              </div>
          </div>
        </div>
      )}

      {/* 유통기한 달력 모달 */}
      {calOpen && (
        <div onClick={() => setCalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '320px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e5e5ea', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#000' }}>유통기한</span>
              <button onClick={() => pickDate('')} style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: '14px', cursor: 'pointer', padding: '2px 4px' }}>없음</button>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <Calendar value={calFor === 'edit' ? dExpiryStr : expiryStr} onChange={pickDate} />
            </div>
          </div>
        </div>
      )}

      {/* 수량 선택 모달 */}
      {qtyOpen && (
        <div onClick={() => setQtyOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40, padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '280px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 8px', textAlign: 'center', fontSize: '16px', fontWeight: '700', color: '#000' }}>수량</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '0 24px' }}>
              <div style={{ flex: 1 }}><NumberWheel value={intPart} min={1} max={999} onChange={setIntPart} /></div>
              <span style={{ fontSize: '17px', color: '#3c3c43', flexShrink: 0 }}>개</span>
            </div>
            <button onClick={() => setQtyOpen(false)} style={{ width: '100%', padding: '14px', background: 'none', border: 'none', borderTop: '0.5px solid #e5e5ea', fontSize: '15px', fontWeight: '700', color: '#007aff', cursor: 'pointer', marginTop: '8px' }}>완료</button>
          </div>
        </div>
      )}

      {/* 추가 버튼 */}
      <div style={{ flexShrink: 0, padding: '8px 16px 12px' }}>
        <button onClick={openSheet} style={{ width: '100%', height: '40px', borderRadius: '10px', border: 'none', background: '#fff', color: '#007aff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ 식자재 추가</button>
      </div>
    </div>
  )
}
