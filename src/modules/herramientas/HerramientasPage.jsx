import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { Wrench, Plus, ArrowLeft, Image as ImageIcon, Camera, Loader2, CheckCircle, User, Trash2, X, ShoppingCart, Tag, Ruler, AlertTriangle, LayoutGrid, CheckCircle2 } from 'lucide-react'

export default function HerramientasPage() {
  const [activeMainTab, setActiveMainTab] = useState('zonas') // 'zonas' o 'compras'
  
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeZona, setActiveZona] = useState(null)
  const [herramientas, setHerramientas] = useState([])
  const [listaCompras, setListaCompras] = useState([])
  
  const [showZonaModal, setShowZonaModal] = useState(false)
  const [newZona, setNewZona] = useState({ nombre: '', descripcion: '' })
  
  // Nuevo estado para el "Ingreso Rápido" (Sin Modal)
  const [newTool, setNewTool] = useState({ nombre: '', tipo: '', medida: '', notas: '' })
  const [isAddingTool, setIsAddingTool] = useState(false)
  
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchZonas()
    fetchCompras()
  }, [])

  async function fetchZonas() {
    setLoading(true)
    const { data: zonasData } = await supabase.from('tool_categorias').select('*').order('created_at', { ascending: true })
    if (zonasData) setZonas(zonasData)
    setLoading(false)
  }

  async function fetchCompras() {
    const { data } = await supabase.from('herramientas').select('*, tool_categorias(nombre)').eq('estado', 'Por Comprar').order('categoria_id')
    if (data) setListaCompras(data)
  }

  async function fetchHerramientas(zonaId) {
    const { data } = await supabase.from('herramientas').select('*').eq('categoria_id', zonaId).order('nombre')
    if (data) setHerramientas(data)
  }

  const openZona = (zona) => {
    setActiveZona(zona)
    fetchHerramientas(zona.id)
  }

  async function handleAddZona(e) {
    e.preventDefault()
    if (!newZona.nombre) return alert('Ponle un nombre a la zona')
    const { data, error } = await supabase.from('tool_categorias').insert([newZona]).select().single()
    if (!error && data) {
      setZonas([...zonas, data])
      setShowZonaModal(false)
      setNewZona({ nombre: '', descripcion: '' })
    }
  }

  async function deleteZona() {
    if (!confirm('PELIGRO: ¿Estás seguro de eliminar esta zona y TODAS las herramientas que contiene?')) return
    const { error } = await supabase.from('tool_categorias').delete().eq('id', activeZona.id)
    if (!error) {
      setZonas(zonas.filter(z => z.id !== activeZona.id))
      setActiveZona(null)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !activeZona) return
    
    setUploadingPhoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `zona_${activeZona.id}_${Date.now()}.${fileExt}`
      
      await supabase.storage.from('fotos-herramientas').upload(fileName, file)
      const { data: { publicUrl } } = supabase.storage.from('fotos-herramientas').getPublicUrl(fileName)
      
      await supabase.from('tool_categorias').update({ foto_url: publicUrl }).eq('id', activeZona.id)
      
      const updatedZona = { ...activeZona, foto_url: publicUrl }
      setActiveZona(updatedZona)
      setZonas(zonas.map(z => z.id === activeZona.id ? updatedZona : z))
    } catch (error) {
      alert('Error al subir foto.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Ingreso Rápido (Inline)
  async function handleAddTool(e) {
    e.preventDefault()
    if (!newTool.nombre.trim()) return
    setIsAddingTool(true)
    
    const toolToSave = {
      nombre: newTool.nombre.trim(),
      tipo: newTool.tipo.trim(),
      medida: newTool.medida.trim(),
      categoria_id: activeZona.id,
      estado: 'Disponible'
    }

    const { data, error } = await supabase.from('herramientas').insert([toolToSave]).select().single()
    if (!error && data) {
      setHerramientas([data, ...herramientas]) // Añade al principio para verlo de inmediato
      setNewTool({ nombre: '', tipo: '', medida: '', notas: '' }) // Limpia el form
    }
    setIsAddingTool(false)
  }

  async function changeToolStatus(tool, newState) {
    let nuevasNotas = tool.notas || '';

    if (newState === 'Por Comprar') {
      const detalle = prompt('¿Por qué se marca como faltante/dañada? (Ej: Se rodó la punta, se perdió)');
      if (detalle === null) return; 
      if (detalle.trim() !== '') nuevasNotas = detalle;
    } 
    else if (newState === 'Disponible' && tool.estado === 'Por Comprar') {
      nuevasNotas = ''; 
    }

    // UI Optimista (Cambio instantáneo en pantalla)
    if (activeZona) {
      setHerramientas(herramientas.map(h => h.id === tool.id ? { ...h, estado: newState, notas: nuevasNotas } : h))
    }
    setListaCompras(listaCompras.filter(h => h.id !== tool.id))

    const { error } = await supabase.from('herramientas').update({ estado: newState, asignado_a: null, notas: nuevasNotas }).eq('id', tool.id)
    if (!error) fetchCompras() // Resincroniza silenciosamente
  }

  async function deleteTool(id) {
    if (!confirm('¿Eliminar esta herramienta del registro?')) return
    setHerramientas(herramientas.filter(h => h.id !== id))
    await supabase.from('herramientas').delete().eq('id', id)
    fetchCompras()
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-brand-primary w-12 h-12"/></div>

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20 selection:bg-brand-primary selection:text-white">
      
      {/* HEADER PRINCIPAL Y PESTAÑAS (Visible solo si no estamos dentro de una zona) */}
      {!activeZona && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
              <Wrench className="w-8 h-8 text-brand-primary"/> Gestión de Pañol
            </h1>
            <p className="text-slate-500 font-medium mt-1">Organiza el inventario físico y repón herramientas perdidas.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto">
            <button 
              onClick={() => setActiveMainTab('zonas')} 
              className={`flex-1 md:px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeMainTab === 'zonas' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LayoutGrid className="w-4 h-4"/> Zonas
            </button>
            <button 
              onClick={() => setActiveMainTab('compras')} 
              className={`flex-1 md:px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeMainTab === 'compras' ? 'bg-red-500 text-white shadow-md shadow-red-500/30' : 'text-slate-500 hover:text-red-500'}`}
            >
              <ShoppingCart className="w-4 h-4"/> Faltantes
              {listaCompras.length > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-lg ${activeMainTab === 'compras' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>{listaCompras.length}</span>}
            </button>
          </div>
        </div>
      )}

      {/* --- PESTAÑA 1: ZONAS Y PAÑOL --- */}
      {activeMainTab === 'zonas' && !activeZona && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-end">
            <button onClick={() => setShowZonaModal(true)} className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-slate-800 transition-transform active:scale-95 w-full sm:w-auto">
              <Plus className="w-5 h-5" /> Nueva Zona / Carro
            </button>
          </div>

          {zonas.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
              <LayoutGrid className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-bold text-lg">No has creado áreas de almacenamiento.</p>
              <p className="text-slate-400 text-sm mt-1">Crea zonas como "Carro 1", "Muro Principal" o "Caja Eléctrica".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {zonas.map(zona => (
                <div key={zona.id} onClick={() => openZona(zona)} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all group flex flex-col">
                  <div className="h-56 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {zona.foto_url ? (
                      <img src={zona.foto_url} alt={zona.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-slate-300" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                    <div className="absolute bottom-5 left-5 right-5">
                      <h3 className="font-black text-2xl text-white drop-shadow-md tracking-tight leading-tight">{zona.nombre}</h3>
                    </div>
                  </div>
                  <div className="p-5 bg-white flex justify-between items-center mt-auto">
                    <p className="text-sm font-medium text-slate-500 line-clamp-2 pr-4">{zona.descripcion || 'Sin descripción'}</p>
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors shrink-0">
                      <ArrowLeft className="w-5 h-5 text-blue-600 group-hover:text-white rotate-180" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- INTERIOR DE UNA ZONA (SMART VIEW) --- */}
      {activeZona && (
        <div className="animate-fade-in space-y-6">
          
          {/* HEADER ZONA ACTIVA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <button onClick={() => setActiveZona(null)} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors shrink-0"><ArrowLeft className="w-6 h-6 text-slate-700" /></button>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary mb-1">Zona Abierta</p>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none">{activeZona.nombre}</h2>
              </div>
            </div>
            <button onClick={deleteZona} className="flex items-center justify-center w-full sm:w-auto gap-2 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-colors">
              <Trash2 className="w-4 h-4"/> Eliminar Zona
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMNA IZQUIERDA: FOTO DE ORDEN IDEAL */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Orden Ideal</h3>
                </div>
                <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden relative flex items-center justify-center border-2 border-dashed border-slate-300 mb-4 group">
                  {activeZona.foto_url ? (
                    <img src={activeZona.foto_url} alt="Referencia" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
                      <p className="text-sm text-slate-500 font-bold">Sube una foto de cómo debe verse este estante.</p>
                    </div>
                  )}
                  {uploadingPhoto && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-primary"/></div>}
                </div>
                
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-xl text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg">
                  <Camera className="w-4 h-4"/> {activeZona.foto_url ? 'Actualizar Foto' : 'Tomar Foto'}
                </button>
              </div>
            </div>

            {/* COLUMNA DERECHA: GESTIÓN DE HERRAMIENTAS */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* BARRA DE INGRESO RÁPIDO (Cero Fricción) */}
              <div className="bg-white p-2 sm:pl-5 rounded-2xl shadow-sm border border-slate-200 focus-within:border-blue-400 focus-within:shadow-md transition-all">
                <form onSubmit={handleAddTool} className="flex flex-col sm:flex-row items-center gap-2 w-full">
                  <div className="flex-1 flex items-center w-full min-w-0">
                    <Plus className="w-5 h-5 text-blue-500 mr-2 shrink-0 hidden sm:block"/>
                    <input 
                      required 
                      placeholder="Nombre (Ej: Llave Punta)..." 
                      className="w-full bg-transparent border-none outline-none py-3 text-slate-800 font-bold placeholder:text-slate-400 placeholder:font-medium"
                      value={newTool.nombre}
                      onChange={e => setNewTool({...newTool, nombre: e.target.value})}
                      disabled={isAddingTool}
                    />
                  </div>
                  <div className="flex w-full sm:w-auto gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-2 sm:pt-0 sm:pl-2 shrink-0">
                    <input 
                      placeholder="Tipo" 
                      className="w-full sm:w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-400"
                      value={newTool.tipo}
                      onChange={e => setNewTool({...newTool, tipo: e.target.value})}
                    />
                    <input 
                      placeholder="Medida" 
                      className="w-full sm:w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-400"
                      value={newTool.medida}
                      onChange={e => setNewTool({...newTool, medida: e.target.value})}
                    />
                    <button type="submit" disabled={isAddingTool} className="bg-blue-600 text-white p-2 md:px-4 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center shrink-0">
                      {isAddingTool ? <Loader2 className="w-5 h-5 animate-spin"/> : <span className="hidden md:inline">Añadir</span>}
                      {!isAddingTool && <Plus className="w-5 h-5 md:hidden"/>}
                    </button>
                  </div>
                </form>
              </div>

              {/* LISTA DE HERRAMIENTAS (Switch States) */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Inventario de Zona</h3>
                  <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-500 shadow-sm">{herramientas.length} Items</span>
                </div>
                
                <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {herramientas.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <p className="text-slate-400 font-medium">Usa la barra de arriba para registrar rápidamente las herramientas de este estante.</p>
                    </div>
                  ) : (
                    herramientas.map(tool => (
                      <div key={tool.id} className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors group">
                        
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center justify-between sm:justify-start gap-4">
                            <h4 className="font-black text-slate-800 text-lg leading-tight truncate">
                              {tool.nombre}
                            </h4>
                            <button onClick={() => deleteTool(tool.id)} className="text-slate-300 hover:text-red-500 transition-colors sm:opacity-0 group-hover:opacity-100 shrink-0"><Trash2 className="w-4 h-4"/></button>
                          </div>
                          
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {tool.tipo && <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-slate-200"><Tag className="w-3 h-3 inline mr-1"/>{tool.tipo}</span>}
                            {tool.medida && <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border border-blue-200"><Ruler className="w-3 h-3 inline mr-1"/>{tool.medida}</span>}
                          </div>
                          
                          {tool.estado === 'Por Comprar' && tool.notas && (
                            <p className="text-xs mt-2 font-bold text-red-600 bg-red-50 w-fit px-2 py-1 rounded-md border border-red-100 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3"/> {tool.notas}
                            </p>
                          )}
                        </div>
                        
                        {/* SWITCH DE ESTADO ESTILO iOS */}
                        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto shrink-0 shadow-inner">
                          <button 
                            onClick={() => changeToolStatus(tool, 'Disponible')}
                            className={`flex-1 sm:w-24 py-1.5 px-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${tool.estado === 'Disponible' ? 'bg-white text-green-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            Libre
                          </button>
                          <button 
                            onClick={() => changeToolStatus(tool, 'En Uso')}
                            className={`flex-1 sm:w-24 py-1.5 px-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${tool.estado === 'En Uso' ? 'bg-white text-orange-500 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            En Uso
                          </button>
                          <button 
                            onClick={() => changeToolStatus(tool, 'Por Comprar')}
                            className={`flex-1 sm:w-24 py-1.5 px-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${tool.estado === 'Por Comprar' ? 'bg-red-500 text-white shadow-sm shadow-red-500/30' : 'text-slate-400 hover:text-red-500'}`}
                          >
                            Falta
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PESTAÑA 2: LISTA DE COMPRAS (CHECKLIST) --- */}
      {activeMainTab === 'compras' && (
        <div className="bg-white rounded-3xl shadow-sm border border-red-200 overflow-hidden animate-fade-in max-w-4xl mx-auto">
          <div className="bg-red-50 p-6 md:p-8 border-b border-red-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-red-800 flex items-center gap-2 tracking-tight"><ShoppingCart className="w-7 h-7"/> Reposición Urgente</h2>
              <p className="text-red-600/80 font-medium mt-1">Herramientas marcadas como perdidas o dañadas por los técnicos.</p>
            </div>
          </div>
          
          <div className="p-4 md:p-8">
            {listaCompras.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4"/>
                <p className="text-slate-800 font-black text-2xl tracking-tight">¡Taller Completo!</p>
                <p className="text-slate-500 font-medium mt-2">No hay herramientas reportadas como faltantes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {listaCompras.map(item => (
                  <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-2 border-red-100 bg-white rounded-2xl hover:border-red-300 transition-colors shadow-sm group">
                    <div className="mb-4 sm:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-800 text-xl">{item.nombre}</span>
                        {item.medida && <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-slate-200">{item.medida}</span>}
                      </div>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><LayoutGrid className="w-3.5 h-3.5"/> Zona original: <strong className="text-slate-800">{item.tool_categorias?.nombre}</strong></p>
                      
                      {item.notas && (
                        <div className="mt-3 bg-red-50 text-red-700 text-sm font-medium p-3 rounded-xl border border-red-100 inline-flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0"/> {item.notas}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => changeToolStatus(item, 'Disponible')}
                      className="w-full sm:w-auto px-6 py-4 bg-white border-2 border-green-500 text-green-600 font-black uppercase tracking-widest rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 shrink-0"
                    >
                      <CheckCircle2 className="w-5 h-5"/> Repuesto
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CREAR ZONA */}
      {showZonaModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-bounce-in">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black text-xl tracking-tight">Nuevo Estante / Zona</h3>
              <button onClick={() => setShowZonaModal(false)} className="bg-slate-800 p-2 rounded-full hover:bg-red-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddZona} className="p-6 space-y-5 bg-slate-50">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Nombre de la Zona</label>
                <input autoFocus required placeholder="Ej: Carro Mecánico Principal" className="w-full p-4 border-2 border-slate-200 bg-white rounded-xl outline-none focus:border-blue-500 font-black text-slate-800 text-lg" value={newZona.nombre} onChange={e => setNewZona({...newZona, nombre: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Descripción (Opcional)</label>
                <textarea placeholder="Ej: Herramientas de uso diario para frenos..." className="w-full p-4 border-2 border-slate-200 bg-white rounded-xl outline-none focus:border-blue-500 font-medium text-slate-600 text-sm resize-none h-24" value={newZona.descripcion} onChange={e => setNewZona({...newZona, descripcion: e.target.value})}/>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowZonaModal(false)} className="px-6 py-3.5 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3.5 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-slate-800 transition-transform active:scale-95">Guardar Zona</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}