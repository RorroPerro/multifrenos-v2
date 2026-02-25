import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Trash2, Edit, Save, X, ListTodo, ShoppingCart, Bell, CheckCircle2, Circle, AlertCircle, Clock, Loader2, Wrench, CornerDownLeft, Check } from 'lucide-react'

export default function TareasPage() {
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('Pendientes') // 'Todas', 'Pendientes', 'Completadas'
  
  // INGRESO RÁPIDO
  const [quickTitle, setQuickTitle] = useState('')
  const [isQuickSaving, setIsQuickSaving] = useState(false)

  // MODAL STATE
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  
  const [formData, setFormData] = useState({
    titulo: '', descripcion: '', categoria: 'Taller', prioridad: 'Media'
  })

  useEffect(() => { fetchTareas() }, [])

  async function fetchTareas() {
    setLoading(true)
    const { data, error } = await supabase.from('tareas').select('*').order('completada', { ascending: true }).order('created_at', { ascending: false })
    if (!error) setTareas(data)
    setLoading(false)
  }

  // --- LÓGICA INGRESO RÁPIDO ---
  async function handleQuickAdd(e) {
    e.preventDefault()
    if (!quickTitle.trim()) return
    setIsQuickSaving(true)
    
    const newTask = {
      titulo: quickTitle.trim(),
      descripcion: '',
      categoria: 'Taller',
      prioridad: 'Media',
      completada: false
    }

    const { data, error } = await supabase.from('tareas').insert([newTask]).select().single()
    if (!error && data) {
      setTareas([data, ...tareas]) // Optimistic UI
      setQuickTitle('')
    }
    setIsQuickSaving(false)
  }

  // --- LÓGICA MODAL DETALLADO ---
  const openCreateModal = () => {
    setIsEditing(false); setEditId(null)
    setFormData({ titulo: quickTitle || '', descripcion: '', categoria: 'Taller', prioridad: 'Media' })
    setQuickTitle('')
    setShowModal(true)
  }

  const openEditModal = (tarea) => {
    setIsEditing(true); setEditId(tarea.id)
    setFormData({ titulo: tarea.titulo, descripcion: tarea.descripcion || '', categoria: tarea.categoria, prioridad: tarea.prioridad })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (isEditing) {
      await supabase.from('tareas').update(formData).eq('id', editId)
    } else {
      await supabase.from('tareas').insert([formData])
    }
    setShowModal(false)
    fetchTareas()
  }

  async function toggleCompletada(id, estadoActual) {
    // Actualización optimista (rápida en pantalla)
    setTareas(tareas.map(t => t.id === id ? { ...t, completada: !estadoActual } : t))
    await supabase.from('tareas').update({ completada: !estadoActual }).eq('id', id)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta nota permanentemente?')) return
    setTareas(tareas.filter(t => t.id !== id)) // Optimistic UI
    await supabase.from('tareas').delete().eq('id', id)
  }

  const getCatIcon = (cat) => {
    if (cat === 'Compras') return <ShoppingCart className="w-3.5 h-3.5"/>
    if (cat === 'Recordatorio') return <Bell className="w-3.5 h-3.5"/>
    return <Wrench className="w-3.5 h-3.5"/>
  }

  const getPrioColor = (pri, completada) => {
    if (completada) return 'text-slate-400 bg-slate-100 border-slate-200'
    if (pri === 'Alta') return 'text-red-700 bg-red-50 border-red-200'
    if (pri === 'Media') return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    return 'text-green-700 bg-green-50 border-green-200'
  }

  const tareasFiltradas = tareas.filter(t => {
    if (filtro === 'Pendientes') return !t.completada
    if (filtro === 'Completadas') return t.completada
    return true
  })

  const pendientesCount = tareas.filter(t => !t.completada).length

  return (
    <div className="space-y-6 pb-20 selection:bg-brand-primary selection:text-white max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <ListTodo className="w-8 h-8 text-brand-primary"/> Tareas y Notas
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Recordatorios, listas de compras e ideas del taller.</p>
        </div>
      </div>

      {/* BARRA DE INGRESO RÁPIDO (La magia de la eficiencia) */}
      <div className="bg-white p-2 pl-4 rounded-2xl shadow-md border border-slate-200 flex flex-col sm:flex-row items-center gap-2 transition-shadow focus-within:shadow-lg focus-within:border-blue-300">
        <form onSubmit={handleQuickAdd} className="flex-1 flex items-center w-full">
          <Plus className="w-5 h-5 text-slate-400 mr-2 shrink-0"/>
          <input 
            type="text" 
            placeholder="Añadir una tarea rápida y presionar Enter..." 
            className="w-full bg-transparent border-none outline-none py-3 text-slate-700 font-medium placeholder:text-slate-400"
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            disabled={isQuickSaving}
          />
          {quickTitle && (
            <button type="submit" disabled={isQuickSaving} className="hidden sm:flex bg-slate-900 text-white p-2 rounded-xl hover:bg-slate-800 transition-transform active:scale-95 ml-2">
              {isQuickSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <CornerDownLeft className="w-5 h-5"/>}
            </button>
          )}
        </form>
        <div className="w-full sm:w-auto flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-2">
          {quickTitle && (
            <button onClick={handleQuickAdd} disabled={isQuickSaving} className="sm:hidden flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">
               {isQuickSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>} Guardar
            </button>
          )}
          <button onClick={openCreateModal} className="flex-1 sm:flex-none bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap">
            <Edit className="w-4 h-4"/> Avanzado
          </button>
        </div>
      </div>

      {/* FILTROS TIPO "SEGMENTED CONTROL" */}
      <div className="flex justify-center sm:justify-start">
        <div className="flex bg-slate-200/60 p-1.5 rounded-xl w-full sm:w-fit">
          {['Pendientes', 'Completadas', 'Todas'].map(f => (
            <button 
              key={f} 
              onClick={() => setFiltro(f)}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${filtro === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f} 
              {f === 'Pendientes' && pendientesCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${filtro === f ? 'bg-brand-primary text-white' : 'bg-slate-300 text-slate-600'}`}>
                  {pendientesCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE TAREAS */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary w-12 h-12"/></div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <p className="text-slate-600 font-bold text-lg">¡Todo al día!</p>
          <p className="text-slate-400 text-sm mt-1">No hay tareas {filtro.toLowerCase()} en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {tareasFiltradas.map(tarea => (
            <div 
              key={tarea.id} 
              className={`bg-white p-5 rounded-2xl border transition-all flex flex-col h-full group relative overflow-hidden ${tarea.completada ? 'border-slate-200 bg-slate-50/50 opacity-70' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300'}`}
            >
              {/* Etiqueta de Prioridad Lateral (Visual Hint) */}
              {!tarea.completada && <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${tarea.prioridad === 'Alta' ? 'bg-red-500' : tarea.prioridad === 'Media' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>}

              {/* Categoría y Prioridad */}
              <div className="flex justify-between items-start mb-3 pl-2">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${tarea.completada ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {getCatIcon(tarea.categoria)} {tarea.categoria}
                </span>
                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getPrioColor(tarea.prioridad, tarea.completada)}`}>
                  {tarea.prioridad}
                </span>
              </div>

              {/* Título y Descripción */}
              <div className="flex-1 pl-2">
                <h3 className={`font-bold text-lg leading-tight transition-all mb-2 ${tarea.completada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                  {tarea.titulo}
                </h3>
                {tarea.descripcion && (
                  <p className={`text-sm line-clamp-4 leading-relaxed ${tarea.completada ? 'text-slate-400' : 'text-slate-600'}`}>
                    {tarea.descripcion}
                  </p>
                )}
              </div>

              {/* Footer: Acción y Fecha */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center pl-2">
                <button 
                  onClick={() => toggleCompletada(tarea.id, tarea.completada)} 
                  className="flex items-center gap-2 group/check"
                >
                  {tarea.completada ? (
                    <><CheckCircle2 className="w-7 h-7 text-green-500 transition-transform active:scale-90" /> <span className="text-xs font-bold text-slate-400">Hecho</span></>
                  ) : (
                    <><Circle className="w-7 h-7 text-slate-300 group-hover/check:text-green-500 transition-all active:scale-90" /> <span className="text-xs font-bold text-slate-400 group-hover/check:text-green-600">Completar</span></>
                  )}
                </button>
                
                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(tarea)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(tarea.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR (Modo Avanzado) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-bounce-in flex flex-col max-h-[95vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg flex items-center gap-2">
                {isEditing ? <><Edit className="w-5 h-5 text-blue-400"/> Editar Tarea</> : <><ListTodo className="w-5 h-5 text-brand-primary"/> Tarea Detallada</>}
              </h3>
              <button onClick={() => setShowModal(false)} className="hover:bg-red-500 hover:text-white p-2 rounded-full transition-colors bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6 overflow-y-auto bg-slate-50 flex-1">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Título de la Tarea</label>
                  <input required autoFocus placeholder="Ej: Comprar líquido de frenos DOT4" className="w-full p-3.5 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 bg-slate-50" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Detalles o Lista (Opcional)</label>
                  <textarea placeholder="Ej: 3 botellas marca Bosch, revisar si hay stock de pastillas..." className="w-full p-3.5 border-2 border-slate-200 rounded-xl h-28 outline-none focus:border-blue-500 text-sm font-medium text-slate-600 resize-none bg-slate-50" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Clasificación</label>
                  <select className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none font-bold text-slate-700 focus:border-blue-500" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                    <option value="Taller">🔧 Taller Interno</option>
                    <option value="Compras">🛒 Compras / Insumos</option>
                    <option value="Recordatorio">🔔 Recordatorio</option>
                  </select>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Prioridad</label>
                  <select className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none font-bold focus:border-blue-500" value={formData.prioridad} onChange={e => setFormData({...formData, prioridad: e.target.value})}>
                    <option value="Baja" className="text-green-600">🟢 Baja (Cuando se pueda)</option>
                    <option value="Media" className="text-yellow-600">🟡 Media (Pronto)</option>
                    <option value="Alta" className="text-red-600">🔴 Alta (Urgente)</option>
                  </select>
                </div>
              </div>
            </form>

            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-6 py-4 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button type="submit" onClick={handleSave} className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-slate-800 transition-transform active:scale-95 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> {isEditing ? 'Guardar' : 'Crear Tarea'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}