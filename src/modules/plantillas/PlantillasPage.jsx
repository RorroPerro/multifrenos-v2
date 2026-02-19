import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Trash2, Edit, Save, X, ClipboardList, Loader2, GripVertical, CheckCircle, Zap, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading] = useState(true)
  
  // States Modal Creador
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  
  // State Formulario Creador
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', estructura: [] })

  // --- NUEVOS STATES PARA CHECKLIST RÁPIDO ---
  const [showQuickCheck, setShowQuickCheck] = useState(false)
  const [quickTemplateId, setQuickTemplateId] = useState('')
  const [quickData, setQuickData] = useState(null) // Aquí guardaremos la sesión temporal
  const [catAbierta, setCatAbierta] = useState(null)

  useEffect(() => {
    fetchPlantillas()
  }, [])

  async function fetchPlantillas() {
    setLoading(true)
    const { data, error } = await supabase.from('plantillas_inspeccion').select('*').order('created_at', { ascending: false })
    if (!error) setPlantillas(data)
    setLoading(false)
  }

  // --- FUNCIONES DEL CONSTRUCTOR DE PLANTILLAS ---
  const addCategoria = () => { setFormData({ ...formData, estructura: [...formData.estructura, { id: Date.now().toString(), titulo: '', items: [''] }] }) }
  const updateCategoria = (catId, newTitulo) => { setFormData({ ...formData, estructura: formData.estructura.map(cat => cat.id === catId ? { ...cat, titulo: newTitulo } : cat) }) }
  const removeCategoria = (catId) => { setFormData({ ...formData, estructura: formData.estructura.filter(cat => cat.id !== catId) }) }
  const addItem = (catId) => { setFormData({ ...formData, estructura: formData.estructura.map(cat => cat.id === catId ? { ...cat, items: [...cat.items, ''] } : cat) }) }
  const updateItem = (catId, itemIndex, newValue) => { setFormData({ ...formData, estructura: formData.estructura.map(cat => { if (cat.id === catId) { const newItems = [...cat.items]; newItems[itemIndex] = newValue; return { ...cat, items: newItems } } return cat }) }) }
  const removeItem = (catId, itemIndex) => { setFormData({ ...formData, estructura: formData.estructura.map(cat => { if (cat.id === catId) { const newItems = cat.items.filter((_, index) => index !== itemIndex); return { ...cat, items: newItems } } return cat }) }) }

  const openCreateModal = () => { setIsEditing(false); setEditId(null); setFormData({ nombre: '', descripcion: '', estructura: [{ id: Date.now().toString(), titulo: 'CATEGORÍA 1', items: ['Nuevo Ítem'] }] }); setShowModal(true) }
  const openEditModal = (plantilla) => { setIsEditing(true); setEditId(plantilla.id); setFormData({ nombre: plantilla.nombre, descripcion: plantilla.descripcion, estructura: plantilla.estructura }); setShowModal(true) }

  async function handleSave() {
    if (!formData.nombre) return alert('Ponle un nombre a la plantilla')
    const estructuraLimpia = formData.estructura.map(cat => ({ ...cat, items: cat.items.filter(item => item.trim() !== '') })).filter(cat => cat.titulo.trim() !== '' && cat.items.length > 0)
    const dataToSave = { nombre: formData.nombre, descripcion: formData.descripcion, estructura: estructuraLimpia }
    if (isEditing) await supabase.from('plantillas_inspeccion').update(dataToSave).eq('id', editId)
    else await supabase.from('plantillas_inspeccion').insert([dataToSave])
    setShowModal(false)
    fetchPlantillas()
  }

  async function handleDelete(id) {
    if (!confirm('¿Borrar esta plantilla? Ya no se podrá usar en nuevas órdenes.')) return
    await supabase.from('plantillas_inspeccion').delete().eq('id', id)
    fetchPlantillas()
  }

  // --- FUNCIONES DEL CHECKLIST RÁPIDO (HERRAMIENTA PATIO) ---
  const iniciarChecklistRapido = () => {
    if (!quickTemplateId) return alert('Selecciona una plantilla para revisar.')
    const template = plantillas.find(p => p.id === quickTemplateId)
    
    // Armamos un estado temporal igual al de las órdenes
    const estructuraTemporal = template.estructura.map(cat => ({
      id: cat.id,
      titulo: cat.titulo,
      items: cat.items.map(item => ({ nombre: item, estado: null }))
    }))
    
    setQuickData(estructuraTemporal)
  }

  const updateQuickItem = (catIndex, itemIndex, estadoStr) => {
    const newData = [...quickData]
    newData[catIndex].items[itemIndex].estado = estadoStr
    setQuickData(newData)
  }

  const cerrarChecklistRapido = () => {
    if(confirm('¿Cerrar revisión? Los datos no se guardarán.')){
      setShowQuickCheck(false)
      setQuickData(null)
      setQuickTemplateId('')
    }
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight"><ClipboardList className="w-7 h-7 text-brand-primary"/> Plantillas & Checklist</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Administra formatos o inicia una revisión en terreno.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* BOTÓN MÁGICO PARA HERRAMIENTA RÁPIDA */}
          <button onClick={() => setShowQuickCheck(true)} className="bg-yellow-400 text-yellow-950 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-yellow-500 transition-colors shadow-lg shadow-yellow-200 flex-1 justify-center md:flex-none">
            <Zap className="w-5 h-5 fill-current"/> Revisión Rápida
          </button>
          <button onClick={openCreateModal} className="bg-brand-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg flex-1 justify-center md:flex-none">
            <Plus className="w-5 h-5"/> Crear Plantilla
          </button>
        </div>
      </div>

      {/* LISTADO DE PLANTILLAS */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-primary w-8 h-8"/></div>
      ) : plantillas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aún no has creado ninguna plantilla de inspección.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plantillas.map(plantilla => (
            <div key={plantilla.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group">
              <div>
                <h3 className="font-bold text-lg text-slate-800 leading-tight">{plantilla.nombre}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mt-2">{plantilla.descripcion}</p>
                <div className="mt-4 flex gap-2">
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg">{plantilla.estructura.length} Categorías</span>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg">{plantilla.estructura.reduce((acc, cat) => acc + cat.items.length, 0)} Puntos</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(plantilla)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit className="w-5 h-5"/></button>
                <button onClick={() => handleDelete(plantilla.id)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL DE REVISIÓN RÁPIDA (HERRAMIENTA PATIO) --- */}
      {showQuickCheck && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-start sm:items-center justify-center sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white sm:rounded-3xl shadow-2xl w-full max-w-2xl min-h-screen sm:min-h-0 sm:max-h-[90vh] flex flex-col animate-fade-in relative">
            
            <div className="bg-yellow-400 p-5 shrink-0 flex justify-between items-center rounded-t-none sm:rounded-t-3xl">
              <div>
                <h2 className="font-black text-yellow-950 text-xl flex items-center gap-2"><Zap className="w-6 h-6 fill-current"/> Modo Patio</h2>
                <p className="text-yellow-900/80 text-xs font-bold uppercase tracking-widest mt-1">Checklist sin registro</p>
              </div>
              <button onClick={cerrarChecklistRapido} className="bg-yellow-500/50 p-2 rounded-full text-yellow-950 hover:bg-yellow-500 transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {!quickData ? (
                <div className="text-center space-y-6 py-10">
                  <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4"><ClipboardList className="w-10 h-10"/></div>
                  <h3 className="text-xl font-bold text-slate-800">Selecciona una Plantilla</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">Esta herramienta es para hacer revisiones visuales rápidas con el celular. No se guardará ni se vinculará a ningún cliente.</p>
                  
                  <select className="w-full max-w-md p-4 rounded-xl border-2 border-slate-200 outline-none font-bold text-slate-700 text-lg mx-auto block shadow-sm focus:border-yellow-400" value={quickTemplateId} onChange={(e) => setQuickTemplateId(e.target.value)}>
                    <option value="">-- Elige qué vas a revisar --</option>
                    {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>

                  <button onClick={iniciarChecklistRapido} disabled={!quickTemplateId} className="w-full max-w-md bg-slate-900 text-white px-6 py-4 rounded-xl font-black text-lg shadow-xl hover:bg-slate-800 disabled:opacity-50 mx-auto block transition-all active:scale-95">
                    INICIAR AHORA
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ALERTA DE NO GUARDADO */}
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0"/> <span>Estos datos son temporales. Si cierras esta ventana, se perderán.</span>
                  </div>

                  {quickData.map((cat, catIndex) => (
                    <div key={cat.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                      <button onClick={() => setCatAbierta(catAbierta === cat.id ? null : cat.id)} className="w-full p-4 bg-slate-50 font-bold flex justify-between items-center hover:bg-slate-100 transition-colors text-lg">
                        <span>{cat.titulo}</span>
                        {catAbierta === cat.id ? <ChevronUp className="w-6 h-6 text-slate-400"/> : <ChevronDown className="w-6 h-6 text-slate-400"/>}
                      </button>
                      
                      {catAbierta === cat.id && (
                        <div className="p-2 space-y-2 bg-slate-50/50">
                          {cat.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="p-3 rounded-xl bg-white border border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                              <span className="font-bold text-slate-700">{item.nombre}</span>
                              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-full sm:w-fit shrink-0">
                                <button onClick={() => updateQuickItem(catIndex, itemIndex, 'ok')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-colors ${item.estado === 'ok' ? 'bg-green-500 text-white shadow-md' : 'hover:bg-green-100 text-slate-400'}`}>OK</button>
                                <button onClick={() => updateQuickItem(catIndex, itemIndex, 'atencion')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-colors ${item.estado === 'atencion' ? 'bg-yellow-500 text-white shadow-md' : 'hover:bg-yellow-100 text-slate-400'}`}>OBS</button>
                                <button onClick={() => updateQuickItem(catIndex, itemIndex, 'malo')} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-black uppercase tracking-wider transition-colors ${item.estado === 'malo' ? 'bg-red-500 text-white shadow-md' : 'hover:bg-red-100 text-slate-400'}`}>FAIL</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="pt-6">
                    <button onClick={cerrarChecklistRapido} className="w-full bg-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-300 transition-colors">
                      Terminar y Descartar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DEL CONSTRUCTOR (SE MANTIENE INTACTO) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg">{isEditing ? 'Editar Plantilla' : 'Nueva Plantilla de Inspección'}</h3>
              <button onClick={() => setShowModal(false)} className="hover:text-red-400 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 gap-4">
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Nombre de la Plantilla</label><input autoFocus placeholder="Ej: Inspección de Frenos General" className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Descripción (Opcional)</label><input placeholder="Breve descripción del propósito de esta revisión..." className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:border-blue-500 text-sm" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} /></div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-2">Estructura del Checklist</h4>
                {formData.estructura.map((categoria) => (
                  <div key={categoria.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-800 p-3 flex gap-3 items-center">
                      <GripVertical className="w-5 h-5 text-slate-500 cursor-move" />
                      <input className="flex-1 bg-transparent border-b border-slate-600 text-white font-bold outline-none focus:border-blue-400 uppercase placeholder:text-slate-500" placeholder="NOMBRE CATEGORÍA (Ej: FRENOS DELANTEROS)" value={categoria.titulo} onChange={(e) => updateCategoria(categoria.id, e.target.value.toUpperCase())} />
                      <button onClick={() => removeCategoria(categoria.id)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
                    </div>
                    <div className="p-4 space-y-2">
                      {categoria.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex gap-2 items-center group">
                          <CheckCircle className="w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                          <input className="flex-1 p-2 border border-slate-200 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Punto a revisar (Ej: Estado de pastillas)" value={item} onChange={(e) => updateItem(categoria.id, itemIndex, e.target.value)} />
                          <button onClick={() => removeItem(categoria.id, itemIndex)} className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                        </div>
                      ))}
                      <button onClick={() => addItem(categoria.id)} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-3 ml-6"><Plus className="w-4 h-4"/> Añadir punto de revisión</button>
                    </div>
                  </div>
                ))}
                <button onClick={addCategoria} className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-xl hover:bg-slate-100 hover:border-slate-400 transition-all flex justify-center items-center gap-2"><Plus className="w-5 h-5"/> AGREGAR NUEVA CATEGORÍA</button>
              </div>
            </div>

            <div className="bg-white p-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-6 py-2.5 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-colors flex items-center gap-2"><Save className="w-5 h-5" /> Guardar Plantilla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}