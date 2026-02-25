import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Search, X, Loader2, Tag, Layers, Trash2, Edit, Wrench, Calculator, ShoppingCart, Receipt, CheckCircle2, PackageOpen } from 'lucide-react'

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  
  // MODAL Y FORMULARIO
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({
    categoria: '', nombre: '', descripcion: '', precio_mano_obra: '', precio_repuestos: ''
  })

  // BUSCADOR Y FILTROS
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')

  // --- ESTADOS DEL SIMULADOR DE PRESUPUESTO ---
  const [showSimulator, setShowSimulator] = useState(false)
  const [simulatedCart, setSimulatedCart] = useState([])
  const [simulaIva, setSimulaIva] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    setLoading(true)
    const { data, error } = await supabase.from('servicios').select('*').order('nombre')
    if (error) console.error(error)
    else setServices(data)
    setLoading(false)
  }

  // --- ABRIR MODALES ---
  const openCreateModal = () => {
    setIsEditing(false); setEditId(null)
    setFormData({ categoria: activeCategory !== 'Todos' ? activeCategory : '', nombre: '', descripcion: '', precio_mano_obra: '', precio_repuestos: '' })
    setShowForm(true)
  }

  const openEditModal = (servicio, e) => {
    if(e) e.stopPropagation()
    setIsEditing(true); setEditId(servicio.id)
    setFormData({
      categoria: servicio.categoria || 'General', nombre: servicio.nombre, descripcion: servicio.descripcion || '',
      precio_mano_obra: servicio.precio_mano_obra || '', precio_repuestos: servicio.precio_repuestos || ''
    })
    setShowForm(true)
  }

  // --- GUARDAR Y BORRAR ---
  async function handleSubmit(e) {
    e.preventDefault()
    const datosLimpios = {
      ...formData,
      categoria: formData.categoria.trim() || 'General',
      precio_mano_obra: Number(formData.precio_mano_obra) || 0,
      precio_repuestos: Number(formData.precio_repuestos) || 0
    }

    if (isEditing) {
      const { error } = await supabase.from('servicios').update(datosLimpios).eq('id', editId)
      if (error) alert('Error al actualizar: ' + error.message)
      else { setShowForm(false); fetchServices() }
    } else {
      const { error } = await supabase.from('servicios').insert([datosLimpios])
      if (error) alert('Error al crear: ' + error.message)
      else { setShowForm(false); fetchServices() }
    }
  }

  async function handleDelete(id, e) {
    if(e) e.stopPropagation()
    if(!confirm('¿Estás seguro de eliminar este servicio del catálogo?')) return
    const { error } = await supabase.from('servicios').delete().eq('id', id)
    if (error) alert('Error al borrar. Puede estar asociado a una orden existente.')
    else fetchServices()
  }

  // --- FUNCIONES DEL SIMULADOR ---
  const addToSimulator = (servicio) => {
    const mo = Number(servicio.precio_mano_obra) || 0
    const rep = Number(servicio.precio_repuestos) || 0
    const newItem = { ...servicio, cartId: Date.now() + Math.random(), total_linea: mo + rep }
    setSimulatedCart([...simulatedCart, newItem])
    if (!showSimulator) setShowSimulator(true)
  }

  const removeFromSimulator = (cartId) => {
    setSimulatedCart(simulatedCart.filter(item => item.cartId !== cartId))
  }

  // Cálculos del simulador
  const simSubtotal = simulatedCart.reduce((sum, item) => sum + item.total_linea, 0)
  const simImpuestos = simulaIva ? Math.round(simSubtotal * 0.19) : 0
  const simTotal = simSubtotal + simImpuestos

  // --- LÓGICA DE AGRUPACIÓN Y FILTRADO ---
  const categoriasUnicas = [...new Set(services.map(s => s.categoria))].filter(Boolean).sort()

  let filteredServices = services.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.descripcion && s.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (activeCategory !== 'Todos') {
    filteredServices = filteredServices.filter(s => s.categoria === activeCategory)
  }

  const groupedServices = filteredServices.reduce((acc, servicio) => {
    const cat = servicio.categoria || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(servicio)
    return acc
  }, {})

  const formatMoney = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)

  return (
    <div className="flex h-full relative selection:bg-purple-500 selection:text-white">
      
      {/* COLUMNA IZQUIERDA: LISTADO DE SERVICIOS */}
      <div className={`flex-1 transition-all duration-500 space-y-6 pb-20 ${showSimulator ? 'pr-0 lg:pr-[400px]' : ''}`}>
        
        {/* HEADER Y BUSCADOR (Diseño Moderno) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"><Tag className="w-6 h-6 text-brand-primary"/> Catálogo de Servicios</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Estandarización de precios y armado de presupuestos.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input 
                placeholder="Buscar servicio..." 
                className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 transition-shadow"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSimulator(!showSimulator)}
                className={`flex-1 sm:flex-none px-5 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-transform active:scale-95 shadow-sm ${showSimulator ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' : 'bg-slate-900 text-white hover:bg-slate-800 border-2 border-transparent'}`}
              >
                <Calculator className="w-5 h-5"/> Cotizador 
                {simulatedCart.length > 0 && <span className={`text-[10px] px-2 py-0.5 rounded-full ${showSimulator ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'}`}>{simulatedCart.length}</span>}
              </button>

              <button onClick={openCreateModal} className="flex-1 sm:flex-none bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-4 py-3 rounded-xl flex items-center justify-center gap-2 font-black transition-transform active:scale-95">
                <Plus className="w-5 h-5" /> Nuevo
              </button>
            </div>
          </div>
        </div>

        {/* PESTAÑAS DE CATEGORÍAS */}
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          <button onClick={() => setActiveCategory('Todos')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors flex items-center gap-2 ${activeCategory === 'Todos' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
            <Layers className="w-4 h-4"/> Todos <span className="bg-slate-500/20 px-1.5 rounded">{services.length}</span>
          </button>
          {categoriasUnicas.map(cat => {
            const count = services.filter(s => s.categoria === cat).length
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors flex items-center gap-2 ${activeCategory === cat ? 'bg-brand-primary text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                {cat} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* LISTA DE SERVICIOS */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin w-12 h-12 text-brand-primary"/></div>
        ) : Object.keys(groupedServices).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium">No se encontraron servicios.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedServices).sort().map(categoria => (
              <div key={categoria} className="space-y-3">
                {activeCategory === 'Todos' && (
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 mt-6 mb-2 pl-2">
                    {categoria}
                  </h2>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {groupedServices[categoria].map((servicio) => {
                    const mo = Number(servicio.precio_mano_obra) || 0
                    const rep = Number(servicio.precio_repuestos) || 0
                    const total = mo + rep

                    return (
                      <div key={servicio.id} className={`bg-white p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group ${showSimulator ? 'border-purple-200 hover:border-purple-500 shadow-sm' : 'border-slate-200 hover:shadow-md hover:border-blue-400'}`}>
                        
                        <div className="flex-1 w-full">
                          <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{servicio.nombre}</h3>
                          {servicio.descripcion && <p className="text-slate-500 text-xs font-medium line-clamp-2 pr-4">{servicio.descripcion}</p>}
                        </div>

                        <div className="flex flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
                          
                          {/* Desglose Inteligente */}
                          <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 flex-1 md:flex-none">
                            <div className="px-3 py-1 text-center border-r border-slate-200">
                              <span className="block text-[8px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Mano Obra</span>
                              <span className="font-bold text-sm text-slate-700">{formatMoney(mo)}</span>
                            </div>
                            <div className="px-3 py-1 text-center">
                              <span className="block text-[8px] font-black uppercase tracking-widest text-orange-500 mb-0.5">Repuestos</span>
                              <span className="font-bold text-sm text-slate-700">{formatMoney(rep)}</span>
                            </div>
                          </div>
                          
                          {/* Total Gigante */}
                          <div className={`min-w-[100px] text-right px-4 py-2 rounded-xl border ${showSimulator ? 'bg-purple-50 border-purple-100' : 'bg-white border-transparent'}`}>
                            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 md:hidden">Valor Total</span>
                            <span className={`font-black text-xl tracking-tight ${showSimulator ? 'text-purple-700' : 'text-slate-900'}`}>{formatMoney(total)}</span>
                          </div>

                          {/* ACCIONES (Cambian si el simulador está abierto) */}
                          {showSimulator ? (
                            <button onClick={() => addToSimulator(servicio)} className="w-full md:w-auto px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black uppercase tracking-widest rounded-xl shadow-lg shadow-purple-600/30 transition-transform active:scale-95 flex justify-center items-center gap-2">
                              <Plus className="w-5 h-5"/> Cotizar
                            </button>
                          ) : (
                            <div className="flex gap-2 w-full md:w-auto justify-end mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => openEditModal(servicio, e)} className="p-3 bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-700 rounded-xl transition-colors font-bold flex items-center justify-center flex-1 md:flex-none"><Edit className="w-5 h-5"/></button>
                              <button onClick={(e) => handleDelete(servicio.id, e)} className="p-3 bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors font-bold flex items-center justify-center flex-1 md:flex-none"><Trash2 className="w-5 h-5"/></button>
                            </div>
                          )}

                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- COLUMNA DERECHA: PANEL DEL SIMULADOR (ESTILO BOLETA/TICKET) --- */}
      {showSimulator && (
        <div className="fixed inset-y-0 right-0 w-full md:w-96 lg:w-[400px] bg-slate-50 shadow-[auto_0_40px_rgba(0,0,0,0.2)] border-l border-slate-200 z-40 flex flex-col animate-slide-left pt-16 md:pt-0">
          
          {/* Header Ticket */}
          <div className="bg-purple-900 text-white p-6 flex justify-between items-center shrink-0 shadow-md z-10">
            <div>
              <h2 className="font-black text-xl flex items-center gap-2 tracking-tight"><Receipt className="w-6 h-6 text-purple-300"/> Cotizador Rápido</h2>
              <p className="text-purple-300 text-[10px] font-black uppercase tracking-widest mt-1">Presupuesto Referencial</p>
            </div>
            <button onClick={() => setShowSimulator(false)} className="hover:bg-red-500 p-2 rounded-full transition-colors bg-purple-800"><X className="w-6 h-6"/></button>
          </div>

          {/* Cuerpo del Ticket (Scroll) */}
          <div className="flex-1 overflow-y-auto p-5 bg-[#fcfcfc] relative">
            {/* Efecto borde dentado superior ticket */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[radial-gradient(circle,transparent_4px,#fcfcfc_5px)] bg-[length:12px_12px] -mt-1"></div>

            {simulatedCart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4">
                <ShoppingCart className="w-16 h-16"/>
                <p className="text-sm font-bold text-center uppercase tracking-widest">Ticket Vacío<br/><span className="text-xs font-medium normal-case text-slate-400">Agrega servicios de la lista.</span></p>
              </div>
            ) : (
              <div className="space-y-4">
                {simulatedCart.map((item) => (
                  <div key={item.cartId} className="flex justify-between items-start gap-3 animate-fade-in group">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 leading-tight">{item.nombre}</p>
                      <button onClick={() => removeFromSimulator(item.cartId)} className="text-[10px] font-black uppercase text-red-400 hover:text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <X className="w-3 h-3"/> Quitar
                      </button>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-black text-slate-900">{formatMoney(item.total_linea)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Totales (Estilo Recibo) */}
          <div className="bg-[#fcfcfc] p-6 shrink-0 relative">
            <div className="border-t-2 border-dashed border-slate-300 mb-4 pt-4">
              <div className="flex justify-between text-sm font-bold text-slate-500 mb-2">
                <span>Subtotal (Neto)</span>
                <span className="font-mono">{formatMoney(simSubtotal)}</span>
              </div>
              
              {/* Switch de IVA Premium */}
              <div className="flex justify-between items-center py-3">
                <span className="text-xs font-black uppercase tracking-widest text-slate-800">Facturar con I.V.A (19%)</span>
                <button onClick={() => setSimulaIva(!simulaIva)} className={`w-14 h-7 rounded-full relative transition-colors shadow-inner ${simulaIva ? 'bg-purple-600' : 'bg-slate-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${simulaIva ? 'left-8' : 'left-1'}`}></div>
                </button>
              </div>

              {simulaIva && (
                <div className="flex justify-between text-sm font-bold text-purple-600 mb-2 animate-fade-in">
                  <span>Impuestos (19%)</span>
                  <span className="font-mono">+ {formatMoney(simImpuestos)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-end mb-6 bg-slate-900 text-white p-4 rounded-2xl shadow-lg">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total a Pagar</span>
              <span className="text-3xl font-black font-mono tracking-tight text-green-400">{formatMoney(simTotal)}</span>
            </div>

            <button onClick={() => { setSimulatedCart([]); setSimulaIva(false); }} disabled={simulatedCart.length === 0} className="w-full py-4 bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 font-black uppercase tracking-widest text-sm rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
              <Trash2 className="w-4 h-4"/> Limpiar Cotización
            </button>
          </div>
        </div>
      )}

      {/* FORMULARIO MODAL (Diseño Moderno) */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-bounce-in flex flex-col max-h-[95vh]">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
              <h3 className="font-black text-xl flex items-center gap-2 tracking-tight">
                {isEditing ? <><Edit className="w-6 h-6 text-blue-400"/> Editar Servicio</> : <><PackageOpen className="w-6 h-6 text-green-400"/> Nuevo Servicio</>}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="hover:bg-red-500 hover:text-white bg-slate-800 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5"/> Familia / Categoría</label>
                  <input list="categorias-list" placeholder="Ej: Frenos, Mantención, Motor..." className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-bold text-slate-700" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} required />
                  <datalist id="categorias-list">{categoriasUnicas.map(cat => <option key={cat} value={cat} />)}</datalist>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Nombre del Servicio (Visible al cliente)</label>
                  <input placeholder="Ej: Cambio de Pastillas Delanteras" className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-black text-slate-900 text-lg" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">Detalle / Descripción Interna</label>
                  <textarea placeholder="Incluye revisión de discos, limpieza de calipers..." className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none h-24 resize-none font-medium text-sm text-slate-600" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                </div>
              </div>

              {/* Mini Calculadora Integrada */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><Calculator className="w-4 h-4 text-green-500"/> Costos Base (Netos)</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 block mb-1.5">Mano de Obra</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                      <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-full pl-8 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl font-bold text-blue-900 outline-none focus:border-blue-500" value={formData.precio_mano_obra} onChange={e => setFormData({...formData, precio_mano_obra: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-600 block mb-1.5">Repuestos Base</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                      <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-full pl-8 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl font-bold text-orange-900 outline-none focus:border-orange-500" value={formData.precio_repuestos} onChange={e => setFormData({...formData, precio_repuestos: e.target.value})} />
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-900 p-4 rounded-xl flex justify-between items-center text-white shadow-inner">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Configurado</span>
                  <span className="text-2xl font-black font-mono text-green-400 tracking-tight">{formatMoney((Number(formData.precio_mano_obra) || 0) + (Number(formData.precio_repuestos) || 0))}</span>
                </div>
              </div>

            </form>
            
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-6 py-4 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button type="submit" className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-transform active:scale-95 flex justify-center items-center gap-2">
                <CheckCircle2 className="w-5 h-5"/> {isEditing ? 'Guardar Cambios' : 'Añadir al Catálogo'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}