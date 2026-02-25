import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Trash2, Edit, Save, X, ClipboardList, Loader2, GripVertical, CheckCircle, Zap, AlertCircle, FileCheck, Layers, LayoutList } from 'lucide-react'

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
  const [quickData, setQuickData] = useState(null)

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

  const openCreateModal = () => { setIsEditing(false); setEditId(null); setFormData({ nombre: '', descripcion: '', estructura: [{ id: Date.now().toString(), titulo: 'INSPECCIÓN GENERAL', items: ['Punto a revisar'] }] }); setShowModal(true) }
  const openEditModal = (plantilla) => { setIsEditing(true); setEditId(plantilla.id); setFormData({ nombre: plantilla.nombre, descripcion: plantilla.descripcion, estructura: plantilla.estructura }); setShowModal(true) }

  async function handleSave() {
    if (!formData.nombre) return alert('Ponle un nombre a la plantilla')
    const estructuraLimpia = formData.estructura.map(cat => ({ ...cat, items: cat.items.filter(item => item.trim() !== '') })).filter(cat => cat.titulo.trim() !== '' && cat.items.length > 0)
    
    if (estructuraLimpia.length === 0) return alert('La plantilla debe tener al menos una categoría con un ítem válido.')

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

  // Cálculos de Progreso para Modo Patio
  const totalItemsQuick = quickData ? quickData.reduce((acc, cat) => acc + cat.items.length, 0) : 0;
  const answeredItemsQuick = quickData ? quickData.reduce((acc, cat) => acc + cat.items.filter(i => i.estado !== null).length, 0) : 0;
  const progressPct = totalItemsQuick > 0 ? Math.round((answeredItemsQuick / totalItemsQuick) * 100) : 0;

  return (
    <div className="space-y-6 pb-20 selection:bg-brand-primary selection:text-white">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2 tracking-tight"><FileCheck className="w-8 h-8 text-brand-primary"/> Plantillas & Checklist</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Estandariza las revisiones y agiliza el diagnóstico en terreno.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* BOTÓN MÁGICO PARA HERRAMIENTA RÁPIDA */}
          <button onClick={() => setShowQuickCheck(true)} className="bg-yellow-400 text-yellow-950 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-500 transition-transform active:scale-95 shadow-lg shadow-yellow-400/30">
            <Zap className="w-5 h-5 fill-current"/> Modo Patio
          </button>
          <button onClick={openCreateModal} className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-transform active:scale-95 shadow-lg">
            <Plus className="w-5 h-5"/> Crear Plantilla
          </button>
        </div>
      </div>

      {/* LISTADO DE PLANTILLAS */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary w-12 h-12"/></div>
      ) : plantillas.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-300">
          <ClipboardList className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-lg">Aún no has creado plantillas de inspección.</p>
          <button onClick={openCreateModal} className="mt-4 text-brand-primary font-bold hover:underline">Crear mi primera plantilla</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plantillas.map(plantilla => {
            const numCategorias = plantilla.estructura.length;
            const numItems = plantilla.estructura.reduce((acc, cat) => acc + cat.items.length, 0);

            return (
              <div key={plantilla.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <LayoutList className="w-6 h-6"/>
                  </div>
                  <h3 className="font-black text-xl text-slate-800 leading-tight mb-2">{plantilla.nombre}</h3>
                  {plantilla.descripcion && <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{plantilla.descripcion}</p>}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <Layers className="w-3 h-3"/> {numCategorias} Bloques
                    </span>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3"/> {numItems} Puntos
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                  <button onClick={() => openEditModal(plantilla)} className="flex-1 py-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"><Edit className="w-4 h-4"/> Editar</button>
                  <button onClick={() => handleDelete(plantilla.id)} className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"><Trash2 className="w-5 h-5"/></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* --- MODAL DE REVISIÓN RÁPIDA (MODO PATIO OPTIMIZADO) --- */}
      {showQuickCheck && (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4 backdrop-blur-md">
          <div className="bg-slate-50 sm:rounded-3xl shadow-2xl w-full max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col animate-slide-up sm:animate-fade-in relative overflow-hidden">
            
            {/* HEADER MODO PATIO */}
            <div className="bg-yellow-400 p-5 md:p-6 shrink-0 flex justify-between items-center relative z-20 shadow-md">
              <div>
                <h2 className="font-black text-yellow-950 text-2xl flex items-center gap-2 tracking-tight"><Zap className="w-6 h-6 fill-current"/> Modo Patio</h2>
                <p className="text-yellow-900/80 text-[10px] font-black uppercase tracking-widest mt-1">Diagnóstico Rápido en Terreno</p>
              </div>
              <button onClick={cerrarChecklistRapido} className="bg-yellow-500/50 p-2.5 rounded-full text-yellow-950 hover:bg-yellow-500 transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar pb-24">
              {!quickData ? (
                <div className="text-center space-y-6 p-8">
                  <div className="w-24 h-24 bg-white text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100"><ClipboardList className="w-12 h-12"/></div>
                  <h3 className="text-2xl font-black text-slate-800">Selecciona el Formato</h3>
                  <p className="text-slate-500 max-w-sm mx-auto font-medium">Esta herramienta es para hacer una revisión visual rápida con el celular al recibir un auto. Los datos son volátiles.</p>
                  
                  <div className="pt-4">
                    <select className="w-full max-w-md p-4 rounded-2xl border-2 border-slate-200 outline-none font-bold text-slate-700 text-lg mx-auto block shadow-sm focus:border-yellow-400 bg-white" value={quickTemplateId} onChange={(e) => setQuickTemplateId(e.target.value)}>
                      <option value="">-- Elige la pauta a revisar --</option>
                      {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>

                  <button onClick={iniciarChecklistRapido} disabled={!quickTemplateId} className="w-full max-w-md bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-50 mx-auto block transition-transform active:scale-95 mt-4">
                    Comenzar Revisión
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* BARRA DE PROGRESO STICKY */}
                  <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md p-4 border-b border-slate-200 shadow-sm">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Progreso de Revisión</span>
                      <span className="font-mono font-black text-slate-800">{answeredItemsQuick} / {totalItemsQuick}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
                    </div>
                  </div>

                  <div className="px-4 md:px-6 space-y-8 pb-10">
                    {/* ALERTA DE NO GUARDADO */}
                    <div className="bg-blue-50 border-l-4 border-blue-400 text-blue-800 p-4 rounded-r-xl flex items-start gap-3 shadow-sm">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-500"/> 
                      <p className="text-sm font-medium leading-tight">Estás en un entorno temporal. Úsalo para cotizar visualmente. Si cierras, se pierde todo.</p>
                    </div>

                    {/* LISTA CONTINUA (SCROLL & TAP) */}
                    {quickData.map((cat, catIndex) => (
                      <div key={cat.id} className="space-y-3">
                        {/* Cabecera de Categoría */}
                        <div className="bg-slate-800 text-white p-3 rounded-xl sticky top-20 z-10 shadow-md">
                          <h4 className="font-black uppercase tracking-widest text-sm">{cat.titulo}</h4>
                        </div>
                        
                        {/* Items de la Categoría */}
                        <div className="space-y-2">
                          {cat.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-3">
                              <span className="font-bold text-slate-800 text-base leading-tight">{item.nombre}</span>
                              
                              <div className="flex gap-2 w-full">
                                <button onClick={() => updateQuickItem(catIndex, itemIndex, 'ok')} className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all border-2 ${item.estado === 'ok' ? 'bg-green-500 text-white border-green-600 shadow-inner' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-green-200'}`}>OK</button>
                                <button onClick={() => updateQuickItem(catIndex, itemIndex, 'atencion')} className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all border-2 ${item.estado === 'atencion' ? 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-inner' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-yellow-200'}`}>OBS</button>
                                <button onClick={() => updateQuickItem(catIndex, itemIndex, 'malo')} className={`flex-1 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all border-2 ${item.estado === 'malo' ? 'bg-red-500 text-white border-red-600 shadow-inner' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-red-200'}`}>FAIL</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* BOTÓN DESCARTAR FLOTANTE */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent pt-10">
                    <button onClick={cerrarChecklistRapido} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-transform active:scale-95">
                      Terminar y Limpiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DEL CONSTRUCTOR DE PLANTILLAS (REDISEÑADO) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] animate-bounce-in">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
              <h3 className="font-black text-xl flex items-center gap-2">{isEditing ? <><Edit className="w-6 h-6 text-blue-400"/> Editar Plantilla</> : <><Plus className="w-6 h-6 text-green-400"/> Crear Plantilla</>}</h3>
              <button onClick={() => setShowModal(false)} className="hover:text-red-400 bg-slate-800 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-slate-50 space-y-8 custom-scrollbar">
              
              {/* Bloque Datos Principales */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Título de la Plantilla</label>
                  <input autoFocus placeholder="Ej: Inspección Estándar 50.000 KM" className="w-full p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-xl text-slate-800 bg-slate-50" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Descripción (Opcional)</label>
                  <textarea placeholder="Propósito de este checklist..." className="w-full p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-medium text-slate-600 bg-slate-50 resize-none h-20" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                </div>
              </div>

              {/* Constructor de Bloques */}
              <div className="space-y-6">
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2 border-b-2 border-slate-200 pb-3">
                  <Layers className="w-5 h-5 text-brand-primary"/> Bloques de Revisión
                </h4>
                
                {formData.estructura.map((categoria) => (
                  <div key={categoria.id} className="bg-white rounded-3xl border border-slate-300 shadow-md overflow-hidden relative group/cat">
                    
                    {/* Header Categoría */}
                    <div className="bg-slate-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 border-b-4 border-blue-500">
                      <div className="flex-1 flex items-center gap-3 w-full">
                        <GripVertical className="w-5 h-5 text-slate-500 cursor-move hidden sm:block" />
                        <input 
                          className="flex-1 bg-slate-900 border border-slate-700 p-3 rounded-xl text-white font-black text-lg outline-none focus:border-blue-400 uppercase placeholder:text-slate-600 w-full" 
                          placeholder="NOMBRE DEL BLOQUE (EJ: MOTOR)" 
                          value={categoria.titulo} 
                          onChange={(e) => updateCategoria(categoria.id, e.target.value.toUpperCase())} 
                        />
                      </div>
                      <button onClick={() => removeCategoria(categoria.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white p-3 rounded-xl transition-colors font-bold text-xs flex items-center justify-center gap-2 sm:w-auto w-full">
                        <Trash2 className="w-4 h-4"/> <span className="sm:hidden">Borrar Bloque</span>
                      </button>
                    </div>
                    
                    {/* Items de Categoría */}
                    <div className="p-4 sm:p-6 bg-slate-50 space-y-3">
                      {categoria.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex gap-2 items-center group/item bg-white p-2 rounded-xl border border-slate-200 shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                          <CheckCircle className="w-5 h-5 text-slate-300 ml-2 group-focus-within/item:text-blue-500" />
                          <input 
                            className="flex-1 p-2 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400" 
                            placeholder="¿Qué punto exacto vas a revisar? (Ej: Nivel Líquido Frenos)" 
                            value={item} 
                            onChange={(e) => updateItem(categoria.id, itemIndex, e.target.value)} 
                          />
                          <button onClick={() => removeItem(categoria.id, itemIndex)} className="text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-2.5 rounded-lg transition-colors"><X className="w-4 h-4"/></button>
                        </div>
                      ))}
                      
                      <button onClick={() => addItem(categoria.id)} className="w-full mt-2 py-4 border-2 border-dashed border-blue-200 text-blue-600 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-colors flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4"/> Añadir Punto de Control
                      </button>
                    </div>
                  </div>
                ))}

                {/* Botón Nueva Categoría */}
                <button onClick={addCategoria} className="w-full py-6 border-4 border-dashed border-slate-300 text-slate-500 font-black text-lg uppercase tracking-widest rounded-3xl hover:bg-white hover:border-slate-400 hover:shadow-sm transition-all flex justify-center items-center gap-3">
                  <Plus className="w-6 h-6"/> Crear Nuevo Bloque
                </button>
              </div>
            </div>

            {/* Footer Formulario */}
            <div className="bg-white p-5 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-10">
              <button onClick={() => setShowModal(false)} className="w-full sm:w-auto px-6 py-4 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleSave} className="w-full sm:w-auto px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-green-500/30 transition-transform active:scale-95 flex justify-center items-center gap-2">
                <Save className="w-5 h-5" /> {isEditing ? 'Guardar Cambios' : 'Generar Plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}