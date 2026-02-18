import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Trash2, Edit, Save, X, ListTodo, ShoppingCart, Bell, CheckCircle2, Circle, AlertCircle, Clock, Loader2, Wrench } from 'lucide-react'

export default function TareasPage() {
  const [tareas, setTareas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('Pendientes') // 'Todas', 'Pendientes', 'Completadas'
  
  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'Taller',
    prioridad: 'Media'
  })

  useEffect(() => { fetchTareas() }, [])

  async function fetchTareas() {
    setLoading(true)
    const { data, error } = await supabase.from('tareas').select('*').order('completada', { ascending: true }).order('created_at', { ascending: false })
    if (!error) setTareas(data)
    setLoading(false)
  }

  const openCreateModal = () => {
    setIsEditing(false); setEditId(null)
    setFormData({ titulo: '', descripcion: '', categoria: 'Taller', prioridad: 'Media' })
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
    fetchTareas() // Re-sincronizar por si acaso
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta nota permanentemente?')) return
    await supabase.from('tareas').delete().eq('id', id)
    fetchTareas()
  }

  const getCatIcon = (cat) => {
    if (cat === 'Compras') return <ShoppingCart className="w-4 h-4"/>
    if (cat === 'Recordatorio') return <Bell className="w-4 h-4"/>
    return <Wrench className="w-4 h-4"/>
  }

  const getPrioColor = (pri) => {
    if (pri === 'Alta') return 'text-red-600 bg-red-100 border-red-200'
    if (pri === 'Media') return 'text-yellow-600 bg-yellow-100 border-yellow-200'
    return 'text-green-600 bg-green-100 border-green-200'
  }

  const tareasFiltradas = tareas.filter(t => {
    if (filtro === 'Pendientes') return !t.completada
    if (filtro === 'Completadas') return t.completada
    return true
  })

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ListTodo className="w-6 h-6 text-brand-primary"/> Tareas y Notas</h1>
          <p className="text-slate-500 text-sm">Gestiona recordatorios, compras e ideas del taller.</p>
        </div>
        <button onClick={openCreateModal} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg">
          <Plus className="w-5 h-5"/> Nueva Tarea
        </button>
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 bg-white p-1.5 rounded-lg border border-slate-200 w-fit shadow-sm">
        {['Pendientes', 'Completadas', 'Todas'].map(f => (
          <button 
            key={f} 
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filtro === f ? 'bg-brand-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            {f} {f === 'Pendientes' && <span className="ml-1 bg-white/20 px-1.5 rounded-full text-xs">{tareas.filter(t=>!t.completada).length}</span>}
          </button>
        ))}
      </div>

      {/* LISTA DE TAREAS */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-primary w-8 h-8"/></div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No hay tareas {filtro.toLowerCase()} en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tareasFiltradas.map(tarea => (
            <div key={tarea.id} className={`bg-white p-5 rounded-xl border transition-all flex flex-col justify-between group ${tarea.completada ? 'border-slate-200 opacity-60 bg-slate-50' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
              
              <div className="flex justify-between items-start gap-3">
                <button onClick={() => toggleCompletada(tarea.id, tarea.completada)} className="mt-0.5 shrink-0 transition-transform active:scale-90">
                  {tarea.completada ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6 text-slate-300 hover:text-blue-500" />}
                </button>
                
                <div className="flex-1">
                  <h3 className={`font-bold text-lg leading-tight transition-all ${tarea.completada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {tarea.titulo}
                  </h3>
                  {tarea.descripcion && (
                    <p className={`text-sm mt-1 line-clamp-3 ${tarea.completada ? 'text-slate-400' : 'text-slate-600'}`}>{tarea.descripcion}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${tarea.completada ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {getCatIcon(tarea.categoria)} {tarea.categoria}
                    </span>
                    {!tarea.completada && (
                      <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getPrioColor(tarea.prioridad)}`}>
                        <AlertCircle className="w-3 h-3"/> {tarea.prioridad}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(tarea.created_at).toLocaleDateString()}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(tarea)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(tarea.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">{isEditing ? 'Editar Tarea' : 'Nueva Tarea / Nota'}</h3>
              <button onClick={() => setShowModal(false)} className="hover:text-red-400"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">¿Qué hay que hacer?</label>
                <input required autoFocus placeholder="Ej: Comprar líquido de frenos DOT4" className="w-full p-3 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Detalles / Lista (Opcional)</label>
                <textarea placeholder="Ej: 3 botellas marca Bosch..." className="w-full p-3 border rounded-lg mt-1 h-24 outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                  <select className="w-full p-3 border rounded-lg mt-1 bg-white outline-none font-bold text-slate-700" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                    <option value="Taller">🔧 Taller Interno</option>
                    <option value="Compras">🛒 Compras / Repuestos</option>
                    <option value="Recordatorio">🔔 Recordatorio</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Prioridad</label>
                  <select className="w-full p-3 border rounded-lg mt-1 bg-white outline-none font-bold text-slate-700" value={formData.prioridad} onChange={e => setFormData({...formData, prioridad: e.target.value})}>
                    <option value="Baja" className="text-green-600">🟢 Baja (Cuando se pueda)</option>
                    <option value="Media" className="text-yellow-600">🟡 Media (Pronto)</option>
                    <option value="Alta" className="text-red-600">🔴 Alta (Urgente)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 flex items-center gap-2">
                  <Save className="w-5 h-5" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}