import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { Wrench, Plus, ArrowLeft, Image as ImageIcon, Camera, Loader2, CheckCircle, User, Trash2, X, ShoppingCart, Tag, Ruler } from 'lucide-react'

export default function HerramientasPage() {
  const [activeMainTab, setActiveMainTab] = useState('zonas') // 'zonas' o 'compras'
  
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeZona, setActiveZona] = useState(null)
  const [herramientas, setHerramientas] = useState([])
  const [listaCompras, setListaCompras] = useState([])
  
  const [showZonaModal, setShowZonaModal] = useState(false)
  const [newZona, setNewZona] = useState({ nombre: '', descripcion: '' })
  
  const [showToolModal, setShowToolModal] = useState(false)
  const [newTool, setNewTool] = useState({ nombre: '', tipo: '', medida: '', notas: '' })
  
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
    // Traemos todo lo que esté marcado como "Por Comprar"
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

  async function handleAddZona() {
    if (!newZona.nombre) return alert('Ponle un nombre a la zona')
    const { data, error } = await supabase.from('tool_categorias').insert([newZona]).select().single()
    if (!error && data) {
      setZonas([...zonas, data])
      setShowZonaModal(false)
      setNewZona({ nombre: '', descripcion: '' })
    }
  }

  async function deleteZona() {
    if (!confirm('PELIGRO: ¿Estás seguro de eliminar toda esta zona y todo lo que contiene?')) return
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

  async function handleAddTool() {
    if (!newTool.nombre) return alert('Escribe el nombre del equipo o herramienta')
    
    const toolToSave = {
      nombre: newTool.nombre,
      tipo: newTool.tipo,
      medida: newTool.medida,
      notas: newTool.notas,
      categoria_id: activeZona.id,
      estado: 'Disponible'
    }

    const { data, error } = await supabase.from('herramientas').insert([toolToSave]).select().single()
    if (!error && data) {
      setHerramientas([...herramientas, data])
      setShowToolModal(false)
      setNewTool({ nombre: '', tipo: '', medida: '', notas: '' })
    }
  }

  async function changeToolStatus(tool, newState) {
    let nuevasNotas = tool.notas || '';

    // Si la mandamos a compras, pedimos un detalle opcional
    if (newState === 'Por Comprar') {
      const detalle = prompt('¿Por qué se necesita comprar? (Ej: Se perdió, Se rodó, Falta pieza)');
      if (detalle === null) return; 
      if (detalle.trim() !== '') nuevasNotas = detalle;
    } 
    // Si la compramos y vuelve a estar disponible, limpiamos la nota
    else if (newState === 'Disponible' && tool.estado === 'Por Comprar') {
      nuevasNotas = ''; 
    }

    const { error } = await supabase.from('herramientas').update({ estado: newState, asignado_a: null, notas: nuevasNotas }).eq('id', tool.id)
    if (!error) {
      // Actualizamos la lista de la zona activa si estamos ahí
      if (activeZona) {
        setHerramientas(herramientas.map(h => h.id === tool.id ? { ...h, estado: newState, notas: nuevasNotas } : h))
      }
      // Refrescamos la lista global de compras
      fetchCompras()
    }
  }

  async function deleteTool(id) {
    if (!confirm('¿Eliminar este registro del inventario?')) return
    await supabase.from('herramientas').delete().eq('id', id)
    setHerramientas(herramientas.filter(h => h.id !== id))
    fetchCompras()
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-primary w-8 h-8"/></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      
      {/* HEADER PRINCIPAL Y PESTAÑAS */}
      {!activeZona && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-6 h-6 text-brand-primary"/> Inventario de Taller
            </h1>
            <p className="text-slate-500 text-sm">Control de pañol y lista de reposición.</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button 
              onClick={() => setActiveMainTab('zonas')} 
              className={`flex-1 sm:px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeMainTab === 'zonas' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <Wrench className="w-4 h-4"/> Zonas
            </button>
            <button 
              onClick={() => setActiveMainTab('compras')} 
              className={`flex-1 sm:px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeMainTab === 'compras' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <ShoppingCart className="w-4 h-4"/> Por Comprar
              {listaCompras.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{listaCompras.length}</span>}
            </button>
          </div>
        </div>
      )}

      {/* --- PESTAÑA 1: ZONAS Y PAÑOL --- */}
      {activeMainTab === 'zonas' && !activeZona && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowZonaModal(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-transform active:scale-95 w-full sm:w-auto justify-center">
              <Plus className="w-5 h-5" /> Crear Nueva Zona
            </button>
          </div>

          {zonas.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-lg">No has creado ninguna zona.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {zonas.map(zona => (
                <div key={zona.id} onClick={() => openZona(zona)} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-brand-primary transition-all group">
                  <div className="h-48 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                    {zona.foto_url ? (
                      <img src={zona.foto_url} alt={zona.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <ImageIcon className="w-12 h-12 text-slate-300" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                    <h3 className="absolute bottom-4 left-4 right-4 font-black text-xl text-white drop-shadow-md truncate">{zona.nombre}</h3>
                  </div>
                  <div className="p-4 bg-white flex justify-between items-center">
                    <p className="text-sm text-slate-500 line-clamp-2">{zona.descripcion || 'Entrar a la zona'}</p>
                    <span className="text-xs font-bold text-brand-primary bg-blue-50 px-3 py-1 rounded-full">&rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* --- INTERIOR DE UNA ZONA --- */}
      {activeZona && (
        <div className="animate-fade-in space-y-6">
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <button onClick={() => setActiveZona(null)} className="p-2 bg-slate-50 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
            <h2 className="text-2xl font-bold text-slate-800 flex-1">{activeZona.nombre}</h2>
            <button onClick={deleteZona} className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-transparent hover:border-red-100">
              <Trash2 className="w-4 h-4"/> <span className="hidden sm:inline">Eliminar Zona</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wider">Foto Referencia</h3>
                <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden relative flex items-center justify-center border-2 border-dashed border-slate-300 mb-4 group">
                  {activeZona.foto_url ? (
                    <img src={activeZona.foto_url} alt="Referencia" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2"/>
                      <p className="text-xs text-slate-500 font-medium">Sube una foto del orden ideal.</p>
                    </div>
                  )}
                  {uploadingPhoto && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-primary"/></div>}
                </div>
                
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                  <Camera className="w-4 h-4"/> {activeZona.foto_url ? 'Actualizar Foto' : 'Tomar Foto'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Herramientas y Kits</h3>
                  <p className="text-slate-500 text-xs mt-1">Añade con tipo y medida para mayor control.</p>
                </div>
                <button onClick={() => setShowToolModal(true)} className="bg-brand-primary text-white p-2 rounded-lg hover:bg-blue-700 shadow-md">
                  <Plus className="w-5 h-5"/>
                </button>
              </div>

              <div className="space-y-4">
                {herramientas.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 italic text-sm">Agrega las herramientas importantes de esta zona.</p>
                ) : (
                  herramientas.map(tool => (
                    <div key={tool.id} className={`p-4 rounded-xl border transition-colors relative ${
                      tool.estado === 'Disponible' ? 'bg-white border-slate-200' : 
                      tool.estado === 'En Uso' ? 'bg-orange-50 border-orange-200' : 
                      'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            {tool.nombre}
                          </h4>
                          {/* BADGES TIPO Y MEDIDA */}
                          <div className="flex gap-2 mt-1.5 flex-wrap">
                            {tool.tipo && <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 border border-slate-200"><Tag className="w-3 h-3"/> {tool.tipo}</span>}
                            {tool.medida && <span className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 border border-blue-200"><Ruler className="w-3 h-3"/> {tool.medida}</span>}
                          </div>
                          
                          {tool.notas && (
                            <p className={`text-xs mt-2 font-medium ${tool.estado === 'Por Comprar' ? 'text-red-600 bg-red-100 w-fit px-2 py-0.5 rounded' : 'text-slate-500'}`}>
                              {tool.estado === 'Por Comprar' ? `MOTIVO: ${tool.notas}` : tool.notas}
                            </p>
                          )}
                        </div>
                        <button onClick={() => deleteTool(tool.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-5 h-5"/></button>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <button 
                          onClick={() => changeToolStatus(tool, 'Disponible')}
                          className={`py-2 px-1 sm:px-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${tool.estado === 'Disponible' ? 'bg-green-500 text-white border-green-600 shadow-inner' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                          <CheckCircle className="w-4 h-4" /> Disponible
                        </button>
                        
                        <button 
                          onClick={() => changeToolStatus(tool, 'En Uso')}
                          className={`py-2 px-1 sm:px-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${tool.estado === 'En Uso' ? 'bg-orange-500 text-white border-orange-600 shadow-inner' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                          <User className="w-4 h-4" /> En Uso
                        </button>
                        
                        <button 
                          onClick={() => changeToolStatus(tool, 'Por Comprar')}
                          className={`py-2 px-1 sm:px-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center justify-center gap-1 text-center ${tool.estado === 'Por Comprar' ? 'bg-red-500 text-white border-red-600 shadow-inner' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                        >
                          <ShoppingCart className="w-4 h-4" /> Faltante
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PESTAÑA 2: LISTA DE COMPRAS --- */}
      {activeMainTab === 'compras' && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden animate-fade-in">
          <div className="bg-red-50 p-6 border-b border-red-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-red-800 flex items-center gap-2"><ShoppingCart className="w-6 h-6"/> Para Comprar o Reponer</h2>
              <p className="text-red-600 text-sm mt-1">Todo lo que marques como "Faltante" en el taller aparecerá aquí.</p>
            </div>
          </div>
          
          <div className="p-6">
            {listaCompras.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3"/>
                <p className="text-slate-600 font-bold text-lg">¡Taller Completo!</p>
                <p className="text-slate-400 text-sm">No hay herramientas reportadas como perdidas o faltantes.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listaCompras.map(item => (
                  <div key={item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 text-lg">{item.nombre}</span>
                        {item.medida && <span className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-blue-200">{item.medida}</span>}
                      </div>
                      <p className="text-xs text-slate-500">Pertenece a la zona: <strong className="text-slate-700">{item.tool_categorias?.nombre}</strong></p>
                      {item.notas && <p className="text-sm font-medium text-red-600 mt-2 bg-red-50 p-2 rounded-lg inline-block border border-red-100">Motivo: {item.notas}</p>}
                    </div>
                    
                    <button 
                      onClick={() => changeToolStatus(item, 'Disponible')}
                      className="mt-4 sm:mt-0 w-full sm:w-auto px-6 py-2.5 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4"/> Marcar como Comprado
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALES */}
      {showZonaModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-in">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold">Nueva Zona / Estante</h3>
              <button onClick={() => setShowZonaModal(false)}><X className="w-5 h-5 hover:text-slate-300" /></button>
            </div>
            <div className="p-6 space-y-4">
              <input autoFocus placeholder="Nombre (Ej: Carro Mecánico #1)" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary" value={newZona.nombre} onChange={e => setNewZona({...newZona, nombre: e.target.value})}/>
              <input placeholder="Descripción (Opcional)" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary" value={newZona.descripcion} onChange={e => setNewZona({...newZona, descripcion: e.target.value})}/>
              <button onClick={handleAddZona} className="w-full py-3 bg-brand-primary text-white font-bold rounded-xl shadow-md hover:bg-blue-700 mt-2">Guardar Zona</button>
            </div>
          </div>
        </div>
      )}

      {showToolModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-in">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold">Añadir Herramienta</h3>
              <button onClick={() => setShowToolModal(false)}><X className="w-5 h-5 hover:text-slate-300" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Nombre</label>
                <input autoFocus placeholder="Ej: Llave Punta Corona" className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-primary" value={newTool.nombre} onChange={e => setNewTool({...newTool, nombre: e.target.value})}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo (Opcional)</label>
                  <input placeholder="Ej: Dado, Llave" className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-primary" value={newTool.tipo} onChange={e => setNewTool({...newTool, tipo: e.target.value})}/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Medida (Opcional)</label>
                  <input placeholder="Ej: 10mm, 1/2 pulgada" className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-brand-primary" value={newTool.medida} onChange={e => setNewTool({...newTool, medida: e.target.value})}/>
                </div>
              </div>
              <button onClick={handleAddTool} className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-md hover:bg-slate-800 mt-4">Añadir a esta Zona</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}