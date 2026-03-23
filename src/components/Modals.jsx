const ITEM_H = 52

export function DrumWheelModal({ pendingSet, setPendingSet, pendingReps, setPendingReps, wheelOffset, setWheelOffset, dragStartY, dragStartVal, confirmSet }) {
  if (!pendingSet) return null
  const HALF = 2
  const onMove = (clientY) => {
    if (dragStartY.current === null) return
    const rawDelta = dragStartY.current - clientY
    const floatVal = Math.max(0, dragStartVal.current + rawDelta / 12)
    const intVal   = Math.round(floatVal)
    setPendingReps(intVal)
    setWheelOffset((floatVal - intVal) * ITEM_H)
  }
  const onEnd = () => { dragStartY.current = null; setWheelOffset(0) }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
      onMouseMove={e=>onMove(e.clientY)} onMouseUp={onEnd}
      onTouchMove={e=>{ e.preventDefault(); onMove(e.touches[0].clientY) }} onTouchEnd={onEnd}
    >
      <div style={{ background:'#fff', borderRadius:'14px', width:'260px', overflow:'hidden' }}>
        <div style={{ padding:'16px 16px 8px', textAlign:'center' }}>
          <div style={{ fontSize:'13px', color:'#8e8e93', marginBottom:'8px' }}>{pendingSet.setIdx+1}세트 실제 수행 횟수</div>
          {/* 드럼 휠 */}
          <div
            onMouseDown={e=>{ dragStartY.current=e.clientY; dragStartVal.current=pendingReps }}
            onTouchStart={e=>{ dragStartY.current=e.touches[0].clientY; dragStartVal.current=pendingReps }}
            style={{ cursor:'ns-resize', userSelect:'none', touchAction:'none', position:'relative', height: ITEM_H*(HALF*2+1), overflow:'hidden' }}
          >
            {/* 선택 강조 바 */}
            <div style={{ position:'absolute', top: HALF*ITEM_H, left:16, right:16, height:ITEM_H, background:'#f2f2f7', borderRadius:'10px', pointerEvents:'none' }}/>
            {/* 숫자 목록 */}
            <div style={{ transform:`translateY(${-wheelOffset - 2*ITEM_H}px)`, transition: dragStartY.current ? 'none' : 'transform 0.15s ease' }}>
              {Array.from({length: HALF*2+1+4}, (_, i) => {
                const val = pendingReps - HALF - 2 + i
                const dist = Math.abs(i - (HALF+2) - wheelOffset/ITEM_H)
                const opacity = Math.max(0, 1 - dist * 0.35)
                const fontSize = Math.max(18, 42 - dist * 10)
                return (
                  <div key={i} style={{ height:ITEM_H, display:'flex', alignItems:'center', justifyContent:'center', opacity }}>
                    <span style={{ fontSize, fontWeight:'700', color: val===pendingReps?'#000':'#8e8e93', transition:'font-size 0.1s' }}>
                      {Math.max(0, val)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ fontSize:'13px', color:'#8e8e93', marginTop:'6px' }}>
            {pendingSet.unit} &nbsp;·&nbsp; 계획: {pendingSet.plannedReps}{pendingSet.unit}
          </div>
        </div>
        <div style={{ borderTop:'0.5px solid #e5e5ea', display:'flex', marginTop:'8px' }}>
          <button onClick={()=>{ setPendingSet(null); setWheelOffset(0) }} style={{ flex:1, padding:'14px', background:'none', border:'none', fontSize:'15px', color:'#8e8e93', cursor:'pointer', borderRight:'0.5px solid #e5e5ea' }}>취소</button>
          <button onClick={confirmSet} style={{ flex:1, padding:'14px', background:'none', border:'none', fontSize:'15px', fontWeight:'700', color:'#007aff', cursor:'pointer' }}>완료</button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmModal({ modal, closeModal }) {
  if (!modal.show) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', borderRadius:'14px', width:'270px', overflow:'hidden' }}>
        <div style={{ padding:'20px 16px 16px', textAlign:'center' }}>
          <div style={{ fontSize:'15px', fontWeight:'600', marginBottom:'6px', lineHeight:'1.4', whiteSpace:'pre-line' }}>{modal.message}</div>
        </div>
        <div style={{ borderTop:'0.5px solid #e5e5ea', display:'flex' }}>
          <button onClick={closeModal} style={{ flex:1, padding:'14px', background:'none', border:'none', fontSize:'15px', fontWeight:'500', color:'#007aff', cursor:'pointer', borderRight:'0.5px solid #e5e5ea' }}>
            취소
          </button>
          <button onClick={()=>{ modal.onConfirm(); closeModal() }} style={{ flex:1, padding:'14px', background:'none', border:'none', fontSize:'15px', fontWeight:'700', color:'#ff3b30', cursor:'pointer' }}>
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
