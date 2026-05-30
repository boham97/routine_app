import { useState, useRef, useEffect } from 'react'
import { getToday, dateKey, MONTHS, DAYS } from '../constants.js'
import { EmptyCard } from './ui.jsx'

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
function hasQty(q) { return q !== '' && q != null }

// 통(용기) 잔량을 25% 단위 4칸 막대로 표시
function QuarterBar({ pct }) {
  const filled = Math.round(pct / 25)
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[0, 1, 2, 3].map(i => (
        <span key={i} style={{ width: '6px', height: '10px', borderRadius: '1px', background: i < filled ? '#007aff' : '#e5e5ea' }} />
      ))}
    </span>
  )
}

export default function FoodTab({ foods, addFood, removeFood, confirm }) {
  const [name,   setName]   = useState('')
  const [expiry, setExpiry] = useState('')
  const [qty,    setQty]    = useState('')
  const [unit,   setUnit]   = useState('개')
  const [storage, setStorage] = useState('냉장고')
  const nameRef = useRef(null)

  const sorted = [...foods].sort((a, b) => {
    if (!a.expiry && !b.expiry) return 0
    if (!a.expiry) return 1
    if (!b.expiry) return -1
    return a.expiry < b.expiry ? -1 : a.expiry > b.expiry ? 1 : 0
  })

  // ── 슬라이드 패널 (식자재 추가) ───────────────────────────────
  const addPanel = useSlidePanel()
  function openSheet() {
    setName(''); setExpiry(''); setQty(''); setUnit('개'); setStorage('냉장고')
    addPanel.open()
    setTimeout(() => nameRef.current?.focus(), 320)
  }
  function closeSheet() { addPanel.close() }

  function switchUnit(u) {
    setUnit(u)
    setQty(u === '통' ? '100' : '')
  }

  const canAdd = name.trim().length > 0
  function handleAdd() {
    if (!canAdd) return
    addFood({ name: name.trim(), expiry: expiry || null, quantity: qty.trim(), unit, storage })
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
              <div key={item.id} style={{ background: '#fff', borderRadius: '12px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '52px', height: '40px', borderRadius: '10px', background: color, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1 }}>{expiryLabel(days)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {item.storage && <span style={{ background: '#f2f2f7', color: '#636366', borderRadius: '5px', padding: '1px 6px', fontWeight: '600', flexShrink: 0 }}>{item.storage}</span>}
                    <span>{fmtDate(item.expiry)}</span>
                    {hasQty(item.quantity) && (item.unit === '통' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>· <QuarterBar pct={Number(item.quantity)} /> {item.quantity}%</span>
                    ) : (
                      <span>· {item.quantity}{item.unit || '개'}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => confirm(`"${item.name}"을(를) 삭제할까요?`, () => removeFood(item.id))} style={{ background: 'none', border: 'none', color: '#c6c6c8', fontSize: '20px', cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
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
                <Calendar value={expiry} onChange={setExpiry} />
              </div>

              <div>
                <div style={fieldLabel}>수량</div>
                <div style={{ display: 'flex', background: '#fff', borderRadius: '10px', padding: '3px', marginBottom: '8px', width: 'fit-content' }}>
                  {['개', '통'].map(u => (
                    <button key={u} onClick={() => switchUnit(u)} style={{
                      height: '38px', minWidth: '52px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '14px', fontWeight: '600',
                      background: unit === u ? '#007aff' : 'transparent',
                      color: unit === u ? '#fff' : '#8e8e93',
                    }}>{u}</button>
                  ))}
                </div>
                {unit === '개' ? (
                  <input type="number" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" style={fieldInput} />
                ) : (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['0', '25', '50', '75', '100'].map(p => (
                      <button key={p} onClick={() => setQty(p)} style={{
                        flex: 1, height: '44px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                        fontSize: '14px', fontWeight: '600',
                        background: qty === p ? '#007aff' : '#fff',
                        color: qty === p ? '#fff' : '#8e8e93',
                      }}>{p}%</button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleAdd} disabled={!canAdd} style={{ width: '100%', height: '44px', borderRadius: '10px', border: 'none', background: canAdd ? '#007aff' : '#c6c6c8', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: canAdd ? 'pointer' : 'default' }}>추가</button>
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
