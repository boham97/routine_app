export function NavCard({ children }) {
  return <div style={{ background:'#fff', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 8px' }}>{children}</div>
}

export function NavBtn({ onClick, disabled, small, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:small?'24px':'32px', height:small?'24px':'32px', borderRadius:'50%', background:disabled?'transparent':'#f2f2f7', border:'none', color:disabled?'#c6c6c8':'#007aff', fontSize:small?'16px':'20px', fontWeight:'600', cursor:disabled?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {children}
    </button>
  )
}

export function EmptyCard({ children }) {
  return <div style={{ background:'#fff', borderRadius:'12px', padding:'24px', color:'#8e8e93', textAlign:'center', fontSize:'15px', whiteSpace:'pre-line' }}>{children}</div>
}

export function AddRowBtn({ children, onClick, active, style: extraStyle }) {
  return (
    <button onClick={onClick} style={{ background:'#fff', borderRadius:'12px', padding:'16px', textAlign:'center', border:`1px ${active?'solid':'dashed'} ${active?'#ff3b30':'#e5e5ea'}`, fontSize:'15px', fontWeight:'600', color:active?'#ff3b30':'#007aff', cursor:'pointer', width:'100%', ...extraStyle }}>
      {children}
    </button>
  )
}

export function StatCard({ label, value, color }) {
  return (
    <div style={{ flex:1, background:'#f2f2f7', borderRadius:'10px', padding:'12px 8px', textAlign:'center' }}>
      <div style={{ fontSize:'22px', fontWeight:'700', color }}>{value}</div>
      <div style={{ fontSize:'12px', color:'#8e8e93', marginTop:'2px' }}>{label}</div>
    </div>
  )
}
