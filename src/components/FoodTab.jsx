import { useState, useRef } from 'react'
import { getToday, dateKey, MONTHS, DAYS } from '../constants.js'
import { EmptyCard } from './ui.jsx'

// 시트 안에 바로 표시되는 인라인 달력
function Calendar({ value, onChange }) {
  const base = value ? new Date(value + 'T00:00:00') : getToday()
  const [view, setView] = useState(new Date(base.getFullYear(), base.getMonth(), 1))
  const year = view.getFullYear(), month = view.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const numDays = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: numDays }, (_, i) => i + 1)]
  const todayK = dateKey(getToday())
  const navBtn = { width: '32px', height: '32px', borderRadius: '50%', background: '#f2f2f7', border: 'none', color: '#007aff', fontSize: '20px', fontWeight: '600', cursor: 'pointer' }
  return (
    <div style={{ background: '#fff', borderRadius: '10px', padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <button onClick={() => setView(new Date(year, month - 1, 1))} style={navBtn}>‹</button>
        <span style={{ fontSize: '15px', fontWeight: '700' }}>{year}년 {MONTHS[month]}</span>
        <button onClick={() => setView(new Date(year, month + 1, 1))} style={navBtn}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', marginBottom: '4px' }}>
        {DAYS.map((w, i) => <span key={w} style={{ fontSize: '11px', fontWeight: '600', color: i === 0 ? '#ff3b30' : i === 6 ? '#007aff' : '#8e8e93' }}>{w}</span>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
        {cells.map((d, idx) => {
          if (d === null) return <div key={idx} />
          const key = dateKey(new Date(year, month, d))
          const selected = key === value
          const isToday = key === todayK
          return (
            <button key={idx} onClick={() => onChange(selected ? '' : key)} style={{
              height: '34px', border: 'none', borderRadius: '8px', cursor: 'pointer', position: 'relative',
              background: selected ? '#007aff' : 'transparent',
              color: selected ? '#fff' : '#000',
              fontSize: '14px', fontWeight: selected || isToday ? '700' : '400',
            }}>
              {d}
              {isToday && !selected && <span style={{ position: 'absolute', bottom: '3px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: '#007aff' }} />}
            </button>
          )
        })}
      </div>
    </div>
  )
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

export default function FoodTab({ foods, addFood, removeFood }) {
  const [name,   setName]   = useState('')
  const [expiry, setExpiry] = useState('')
  const [qty,    setQty]    = useState('')
  const [unit,   setUnit]   = useState('개')
  const nameRef = useRef(null)

  const sorted = [...foods].sort((a, b) => {
    if (!a.expiry && !b.expiry) return 0
    if (!a.expiry) return 1
    if (!b.expiry) return -1
    return a.expiry < b.expiry ? -1 : a.expiry > b.expiry ? 1 : 0
  })

  // ── 바텀 시트 (식자재 추가) ───────────────────────────────
  const [showAdd, setShowAdd] = useState(false)
  const [entered, setEntered] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchStart = useRef(null)
  function openSheet() {
    setName(''); setExpiry(''); setQty(''); setUnit('개')
    setShowAdd(true); setLeaving(false); setDragY(0)
    requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    setTimeout(() => nameRef.current?.focus(), 320)
  }
  function closeSheet() {
    setLeaving(true); setDragY(0)
    setTimeout(() => { setShowAdd(false); setEntered(false); setLeaving(false) }, 280)
  }
  function onTouchStart(e) { e.stopPropagation(); touchStart.current = e.touches[0].clientY; setDragging(false) }
  function onTouchMove(e) {
    e.stopPropagation()
    if (touchStart.current === null) return
    const dy = e.touches[0].clientY - touchStart.current
    if (dy > 5) { setDragging(true); setDragY(dy) }
  }
  function onTouchEnd(e) {
    e.stopPropagation()
    if (touchStart.current === null) return
    const dy = e.changedTouches[0].clientY - touchStart.current
    touchStart.current = null
    setDragging(false); setDragY(0)
    if (dy > 80) closeSheet()
  }
  const sheetTransform = leaving ? 'translateY(100%)'
    : entered ? `translateY(${dragging ? Math.max(0, dragY) : 0}px)`
    : 'translateY(100%)'
  const sheetTransition = dragging ? 'none' : 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

  const canAdd = name.trim().length > 0
  function handleAdd() {
    if (!canAdd) return
    addFood({ name: name.trim(), expiry: expiry || null, quantity: qty.trim(), unit })
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
                  <div style={{ fontSize: '12px', color: '#8e8e93', marginTop: '2px' }}>
                    {fmtDate(item.expiry)}
                    {item.quantity ? ` · ${item.quantity}${item.unit || '개'}` : ''}
                  </div>
                </div>
                <button onClick={() => removeFood(item.id)} style={{ background: 'none', border: 'none', color: '#c6c6c8', fontSize: '20px', cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* 바텀 시트 */}
      {showAdd && (
        <>
          <div onClick={closeSheet} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: leaving ? 0 : entered ? 1 : 0, transition: 'opacity 0.28s', zIndex: 20 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80vh', background: '#f2f2f7', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', transform: sheetTransform, transition: sheetTransition, zIndex: 21, boxShadow: '0 -2px 12px rgba(0,0,0,0.15)' }}>
            <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} style={{ flexShrink: 0, padding: '10px 0 6px', touchAction: 'none' }}>
              <div style={{ width: '40px', height: '5px', borderRadius: '3px', background: '#c6c6c8', margin: '0 auto' }} />
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 16px 8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div>
                <div style={fieldLabel}>이름</div>
                <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="식자재 이름" style={fieldInput} />
              </div>

              <div>
                <div style={fieldLabel}>유통기한</div>
                <Calendar value={expiry} onChange={setExpiry} />
              </div>

              <div>
                <div style={fieldLabel}>수량</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="number" inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" style={{ ...fieldInput, flex: 1 }} />
                  <div style={{ display: 'flex', background: '#fff', borderRadius: '10px', padding: '3px', flexShrink: 0 }}>
                    {['개', 'g'].map(u => (
                      <button key={u} onClick={() => setUnit(u)} style={{
                        height: '38px', minWidth: '46px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '14px', fontWeight: '600',
                        background: unit === u ? '#007aff' : 'transparent',
                        color: unit === u ? '#fff' : '#8e8e93',
                      }}>{u}</button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={handleAdd} disabled={!canAdd} style={{ width: '100%', height: '44px', borderRadius: '10px', border: 'none', background: canAdd ? '#007aff' : '#c6c6c8', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: canAdd ? 'pointer' : 'default' }}>추가</button>
            </div>
          </div>
        </>
      )}

      {/* 추가 버튼 */}
      <div style={{ flexShrink: 0, padding: '8px 16px 12px' }}>
        <button onClick={openSheet} style={{ width: '100%', height: '40px', borderRadius: '10px', border: 'none', background: '#fff', color: '#007aff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>+ 식자재 추가</button>
      </div>
    </div>
  )
}
