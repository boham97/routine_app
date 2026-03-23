import { PALETTE, UNITS } from '../constants.js'
import { card, row, inputStyle } from '../styles.js'
import { EmptyCard, AddRowBtn } from './ui.jsx'

export default function RoutineTab({
  routineTab, setRoutineTab,
  workoutTemplates,
  showWorkoutForm, setShowWorkoutForm,
  editingWorkoutId,
  wName, setWName, wColor, setWColor, wExercises,
  exInput, setExInput, exSets, setExSets, exReps, setExReps, exUnit, setExUnit,
  exInputRef, addExercise, removeExercise, saveWorkoutTpl, deleteWorkoutTpl,
  openAddWorkout, openEditWorkout,
  todoTemplates,
  showTodoTplForm, setShowTodoTplForm,
  editingTodoTplId,
  ttName, setTtName, ttColor, setTtColor, ttItems,
  ttInput, setTtInput, ttCount, setTtCount,
  ttInputRef, addTtItem, removeTtItem, saveTodoTpl, deleteTodoTpl,
  openAddTodoTpl, openEditTodoTpl,
  confirm,
}) {
  return (
    <div style={{ flex:1, minHeight:0, overflowY:'scroll', WebkitOverflowScrolling:'touch', padding:'0 16px 16px' }}>
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

        {/* Sub-tab */}
        {!showWorkoutForm && !showTodoTplForm && (
          <div style={{ display:'flex', background:'#e5e5ea', borderRadius:'10px', padding:'2px' }}>
            {[['workout','🏋️ 운동 루틴'],['todo','📋 할일 그룹']].map(([key,label])=>(
              <button key={key} onClick={()=>setRoutineTab(key)} style={{ flex:1, padding:'8px', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', background: routineTab===key?'#fff':'transparent', color: routineTab===key?'#000':'#8e8e93', transition:'all 0.2s' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 운동 루틴 목록 */}
        {routineTab==='workout' && !showWorkoutForm && <>
          {workoutTemplates.length === 0 && <EmptyCard>저장된 운동 루틴이 없습니다</EmptyCard>}
          {workoutTemplates.map(tpl => (
            <div key={tpl.id} style={{ background:'#fff', borderRadius:'12px', overflow:'hidden', borderLeft:`4px solid ${tpl.color}` }}>
              <div style={{ display:'flex', alignItems:'center', padding:'14px', gap:'8px' }}>
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:tpl.color, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'15px', fontWeight:'700' }}>{tpl.name}</div>
                  <div style={{ fontSize:'12px', color:'#8e8e93', marginTop:'2px' }}>{tpl.exercises.length}종목</div>
                </div>
                <button onClick={()=>openEditWorkout(tpl)} style={{ background:'none', border:'none', color:'#007aff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>수정</button>
                <button onClick={()=>confirm(`"${tpl.name}" 루틴을 삭제할까요?\n관련된 모든 기록도 삭제됩니다.`, ()=>deleteWorkoutTpl(tpl.id))} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>삭제</button>
              </div>
              <div style={{ padding:'0 14px 12px', display:'flex', flexDirection:'column', gap:'4px' }}>
                {tpl.exercises.map(ex => (
                  <div key={ex.id} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'#8e8e93' }}>
                    <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:tpl.color }}/>
                    <span>{ex.name}</span>
                    <span style={{ marginLeft:'auto' }}>{ex.sets}세트×{ex.reps}{ex.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <AddRowBtn onClick={openAddWorkout}>+ 새 운동 루틴 만들기</AddRowBtn>
        </>}

        {/* 운동 루틴 폼 */}
        {routineTab==='workout' && showWorkoutForm && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ ...card, padding:'16px', display:'flex', flexDirection:'column', gap:'0' }}>
              <div style={{ fontSize:'17px', fontWeight:'700', marginBottom:'16px' }}>{editingWorkoutId?'루틴 수정':'새 운동 루틴'}</div>
              <input value={wName} onChange={e=>setWName(e.target.value)} placeholder="루틴 이름 (예: 상체 A)" style={{ ...inputStyle, flex:'none', width:'100%', boxSizing:'border-box', marginBottom:'12px' }} />
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>색상</div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={()=>setWColor(c)} style={{ width:'28px', height:'28px', borderRadius:'50%', background:c, border: wColor===c?'3px solid #000':'none', cursor:'pointer' }}/>
                ))}
              </div>
              {wExercises.length > 0 && (
                <div style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>종목 ({wExercises.length}개)</div>
                  <div style={card}>
                    {wExercises.map((ex, i) => (
                      <div key={ex.id} style={{ ...row, borderTop: i===0?'none':'0.5px solid #e5e5ea' }}>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:wColor, flexShrink:0 }}/>
                        <span style={{ flex:1, fontSize:'14px' }}>{ex.name}</span>
                        <span style={{ fontSize:'12px', color:'#8e8e93', marginRight:'8px' }}>{ex.sets}×{ex.reps}{ex.unit}</span>
                        <button onClick={()=>removeExercise(ex.id)} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'16px', cursor:'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>종목 추가</div>
              <input ref={exInputRef} value={exInput} onChange={e=>setExInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addExercise()}
                placeholder="종목명 (예: 스쿼트)" style={{ ...inputStyle, flex:'none', width:'100%', boxSizing:'border-box', marginBottom:'8px' }} />
              <div style={{ display:'flex', gap:'8px', alignItems:'flex-end', marginBottom:'8px' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                  <span style={{ fontSize:'11px', color:'#8e8e93' }}>세트</span>
                  <input value={exSets} onChange={e=>setExSets(e.target.value)} type="number" style={{ width:'56px', height:'40px', background:'#f2f2f7', border:'none', borderRadius:'8px', textAlign:'center', fontSize:'16px', fontWeight:'600' }} />
                </div>
                <span style={{ fontSize:'18px', color:'#8e8e93', paddingBottom:'8px' }}>×</span>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                  <span style={{ fontSize:'11px', color:'#8e8e93' }}>횟수</span>
                  <input value={exReps} onChange={e=>setExReps(e.target.value)} type="number" style={{ width:'56px', height:'40px', background:'#f2f2f7', border:'none', borderRadius:'8px', textAlign:'center', fontSize:'16px', fontWeight:'600' }} />
                </div>
                <div style={{ display:'flex', gap:'4px', paddingBottom:'4px' }}>
                  {UNITS.map(u => (
                    <button key={u} onClick={()=>setExUnit(u)} style={{ padding:'6px 8px', borderRadius:'8px', border:`1px solid ${exUnit===u?wColor:'#c6c6c8'}`, background: exUnit===u?wColor:'transparent', color: exUnit===u?'#fff':'#8e8e93', fontSize:'12px', cursor:'pointer' }}>{u}</button>
                  ))}
                </div>
              </div>
              <button onClick={addExercise} style={{ width:'100%', padding:'10px', background:'none', border:`1px solid ${wColor}`, borderRadius:'10px', color:wColor, fontWeight:'600', fontSize:'14px', cursor:'pointer', marginBottom:'16px' }}>
                + 종목 추가
              </button>
              <button onClick={saveWorkoutTpl} disabled={!wName.trim()||wExercises.length===0} style={{ height:'44px', background: wName.trim()&&wExercises.length>0?wColor:'#c6c6c8', border:'none', borderRadius:'10px', color:'#fff', fontSize:'15px', fontWeight:'600', cursor:'pointer' }}>
                {editingWorkoutId?'수정 완료':'루틴 저장'}
              </button>
            </div>
            <AddRowBtn active onClick={()=>setShowWorkoutForm(false)}>✕ 취소</AddRowBtn>
          </div>
        )}

        {/* 할일 그룹 목록 */}
        {routineTab==='todo' && !showTodoTplForm && <>
          {todoTemplates.length === 0 && <EmptyCard>저장된 할일 그룹이 없습니다</EmptyCard>}
          {todoTemplates.map(tpl => (
            <div key={tpl.id} style={{ background:'#fff', borderRadius:'12px', overflow:'hidden', borderLeft:`4px solid ${tpl.color}` }}>
              <div style={{ display:'flex', alignItems:'center', padding:'14px', gap:'8px' }}>
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:tpl.color, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'15px', fontWeight:'700' }}>{tpl.name}</div>
                  <div style={{ fontSize:'12px', color:'#8e8e93', marginTop:'2px' }}>{tpl.items.length}항목</div>
                </div>
                <button onClick={()=>openEditTodoTpl(tpl)} style={{ background:'none', border:'none', color:'#007aff', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>수정</button>
                <button onClick={()=>confirm(`"${tpl.name}" 그룹을 삭제할까요?\n관련된 모든 기록도 삭제됩니다.`, ()=>deleteTodoTpl(tpl.id))} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'13px', fontWeight:'600', cursor:'pointer' }}>삭제</button>
              </div>
              <div style={{ padding:'0 14px 12px', display:'flex', flexDirection:'column', gap:'4px' }}>
                {tpl.items.map(item => (
                  <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'#8e8e93' }}>
                    <div style={{ width:'4px', height:'4px', borderRadius:'50%', background:tpl.color }}/>
                    <span>{item.text}</span>
                    {item.count > 1 && <span style={{ marginLeft:'auto' }}>{item.count}회</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <AddRowBtn onClick={openAddTodoTpl}>+ 새 할일 그룹 만들기</AddRowBtn>
        </>}

        {/* 할일 그룹 폼 */}
        {routineTab==='todo' && showTodoTplForm && (
          <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
            <div style={{ ...card, padding:'16px', display:'flex', flexDirection:'column', gap:'0' }}>
              <div style={{ fontSize:'17px', fontWeight:'700', marginBottom:'16px' }}>{editingTodoTplId?'그룹 수정':'새 할일 그룹'}</div>
              <input value={ttName} onChange={e=>setTtName(e.target.value)} placeholder="그룹 이름 (예: 아침 루틴)" style={{ ...inputStyle, flex:'none', width:'100%', boxSizing:'border-box', marginBottom:'12px' }} />
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>색상</div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap' }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={()=>setTtColor(c)} style={{ width:'28px', height:'28px', borderRadius:'50%', background:c, border: ttColor===c?'3px solid #000':'none', cursor:'pointer' }}/>
                ))}
              </div>
              {ttItems.length > 0 && (
                <div style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>항목 ({ttItems.length}개)</div>
                  <div style={card}>
                    {ttItems.map((item, i) => (
                      <div key={item.id} style={{ ...row, borderTop: i===0?'none':'0.5px solid #e5e5ea' }}>
                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:ttColor, flexShrink:0 }}/>
                        <span style={{ flex:1, fontSize:'14px' }}>{item.text}</span>
                        {item.count > 1 && <span style={{ fontSize:'12px', color:'#8e8e93', marginRight:'8px' }}>{item.count}회</span>}
                        <button onClick={()=>removeTtItem(item.id)} style={{ background:'none', border:'none', color:'#ff3b30', fontSize:'16px', cursor:'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#8e8e93', marginBottom:'8px' }}>항목 추가</div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                <input ref={ttInputRef} value={ttInput} onChange={e=>setTtInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addTtItem()}
                  placeholder="항목 (예: 물 마시기)" style={inputStyle} />
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'2px' }}>
                  <span style={{ fontSize:'10px', color:'#8e8e93' }}>반복</span>
                  <input value={ttCount} onChange={e=>setTtCount(e.target.value)} type="number" min="1" style={{ width:'52px', height:'44px', background:'#f2f2f7', border:'none', borderRadius:'10px', textAlign:'center', fontSize:'16px', fontWeight:'600' }} />
                </div>
              </div>
              <button onClick={addTtItem} style={{ width:'100%', padding:'10px', background:'none', border:`1px solid ${ttColor}`, borderRadius:'10px', color:ttColor, fontWeight:'600', fontSize:'14px', cursor:'pointer', marginBottom:'16px' }}>
                + 항목 추가
              </button>
              <button onClick={saveTodoTpl} disabled={!ttName.trim()||ttItems.length===0} style={{ height:'44px', background: ttName.trim()&&ttItems.length>0?ttColor:'#c6c6c8', border:'none', borderRadius:'10px', color:'#fff', fontSize:'15px', fontWeight:'600', cursor:'pointer' }}>
                {editingTodoTplId?'수정 완료':'그룹 저장'}
              </button>
            </div>
            <AddRowBtn active onClick={()=>setShowTodoTplForm(false)}>✕ 취소</AddRowBtn>
          </div>
        )}

      </div>
    </div>
  )
}
