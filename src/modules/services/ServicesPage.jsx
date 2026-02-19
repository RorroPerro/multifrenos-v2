import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Search, X, Loader2, Tag, Layers, Trash2, Edit, Wrench, Calculator, ShoppingCart, Receipt } from 'lucide-react'

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

  // --- NUEVO: ESTADOS DEL SIMULADOR DE PRESUPUESTO ---
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

  const openEditModal = (servicio) => {
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

  async function handleDelete(id) {
    if(!confirm('¿Estás seguro de eliminar este servicio?')) return
    const { error } = await supabase.from('servicios').delete().eq('id', id)
    if (error) alert('Error al borrar. Puede estar en una orden.')
    else fetchServices()
  }

  // --- FUNCIONES DEL SIMULADOR ---
  const addToSimulator = (servicio) => {
    const mo = Number(servicio.precio_mano_obra) || 0
    const rep = Number(servicio.precio_repuestos) || 0
    const newItem = { ...servicio, cartId: Date.now() + Math.random(), total_linea: mo + rep }
    setSimulatedCart([...simulatedCart, newItem])
    // Si no está abierto el panel, lo abrimos al agregar el primero
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
    <div className="flex h-full relative">
      
      {/* COLUMNA IZQUIERDA: LISTADO DE SERVICIOS */}
      <div className={`flex-1 transition-all duration-300 space-y-6 pb-20 ${showSimulator ? 'pr-0 lg:pr-80' : ''}`}>
        
        {/* HEADER Y BUSCADOR */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Catálogo de Servicios</h1>
            <p className="text-slate-500 text-sm">Gestiona precios y simula presupuestos rápidos.</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                placeholder="Buscar servicio..." 
                className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* BOTÓN MODO SIMULADOR */}
            <button 
              onClick={() => setShowSimulator(!showSimulator)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-bold transition-colors ${showSimulator ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Calculator className="w-5 h-5"/> Simulador {simulatedCart.length > 0 && <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{simulatedCart.length}</span>}
            </button>

            <button onClick={openCreateModal} className="bg-brand-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md whitespace-nowrap">
              <Plus className="w-5 h-5" /> Nuevo
            </button>
          </div>
        </div>

        {/* PESTAÑAS DE CATEGORÍAS */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200">
          <button onClick={() => setActiveCategory('Todos')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeCategory === 'Todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Todos ({services.length})
          </button>
          {categoriasUnicas.map(cat => {
            const count = services.filter(s => s.categoria === cat).length
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${activeCategory === cat ? 'bg-brand-primary text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {cat} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* LISTA COMPACTA */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-brand-primary"/></div>
        ) : Object.keys(groupedServices).length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
            <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay servicios en esta categoría o búsqueda.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(groupedServices).sort().map(categoria => (
              <div key={categoria} className="space-y-3">
                {activeCategory === 'Todos' && (
                  <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2 mt-4 pl-1 border-l-4 border-brand-primary">
                    {categoria}
                  </h2>
                )}

                <div className="space-y-2">
                  {groupedServices[categoria].map((servicio) => {
                    const mo = Number(servicio.precio_mano_obra) || 0
                    const rep = Number(servicio.precio_repuestos) || 0
                    const total = mo + rep

                    return (
                      <div key={servicio.id} className={`bg-white p-4 rounded-xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group ${showSimulator ? 'border-purple-200 shadow-sm hover:border-purple-400' : 'border-slate-200 hover:shadow-md hover:border-blue-300'}`}>
                        
                        <div className="flex-1 flex items-start gap-3">
                          <div className={`p-2 rounded-lg hidden sm:block ${showSimulator ? 'bg-purple-50 text-purple-400' : 'bg-slate-100 text-slate-400'}`}>
                            {showSimulator ? <ShoppingCart className="w-5 h-5"/> : <Wrench className="w-5 h-5"/>}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 leading-tight">{servicio.nombre}</h3>
                            <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{servicio.descripcion || 'Sin descripción'}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap md:flex-nowrap items-center gap-4 w-full md:w-auto bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-lg border md:border-none border-slate-100">
                          <div className="text-slate-500 min-w-[80px]">
                            <span className="block text-[9px] uppercase font-bold tracking-wider">Mano Obra</span>
                            <span className="font-medium text-sm">{formatMoney(mo)}</span>
                          </div>
                          <div className="text-slate-500 min-w-[80px]">
                            <span className="block text-[9px] uppercase font-bold tracking-wider">Repuestos</span>
                            <span className="font-medium text-sm">{formatMoney(rep)}</span>
                          </div>
                          <div className="min-w-[90px] text-right ml-auto md:ml-4">
                            <span className="block text-[9px] uppercase font-bold tracking-wider text-brand-primary md:hidden">Total</span>
                            <span className={`font-black text-lg ${showSimulator ? 'text-purple-600' : 'text-brand-primary'}`}>{formatMoney(total)}</span>
                          </div>

                          {/* ACCIONES: CAMBIAN SEGÚN EL MODO */}
                          {showSimulator ? (
                            <div className="ml-2 w-full md:w-auto">
                              <button onClick={() => addToSimulator(servicio)} className="w-full md:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex justify-center items-center gap-2">
                                <Plus className="w-4 h-4"/> Añadir
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 md:ml-4 md:pl-4 md:border-l border-slate-200 w-full md:w-auto justify-end mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEditModal(servicio)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button>
                              <button onClick={() => handleDelete(servicio.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
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

      {/* --- COLUMNA DERECHA: PANEL DEL SIMULADOR --- */}
      {showSimulator && (
        <div className="fixed inset-y-0 right-0 w-full md:w-80 lg:w-96 bg-white shadow-[auto_0_30px_rgba(0,0,0,0.15)] border-l border-slate-200 z-40 flex flex-col animate-fade-in pt-16 md:pt-0">
          
          {/* Header Panel */}
          <div className="bg-purple-900 text-white p-5 flex justify-between items-center shrink-0">
            <div>
              <h2 className="font-bold flex items-center gap-2"><Calculator className="w-5 h-5"/> Simulador Rápido</h2>
              <p className="text-purple-200 text-xs mt-1 uppercase tracking-widest">Presupuesto sin registro</p>
            </div>
            <button onClick={() => setShowSimulator(false)} className="hover:text-red-400 p-1"><X className="w-6 h-6"/></button>
          </div>

          {/* Items en el carrito */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
            {simulatedCart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60">
                <ShoppingCart className="w-12 h-12"/>
                <p className="text-sm font-medium text-center">Agrega servicios desde<br/>el catálogo para simular.</p>
              </div>
            ) : (
              simulatedCart.map((item) => (
                <div key={item.cartId} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center gap-3 animate-fade-in">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">{item.nombre}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{item.categoria}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-700 text-sm">{formatMoney(item.total_linea)}</p>
                  </div>
                  <button onClick={() => removeFromSimulator(item.cartId)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Totales */}
          <div className="p-5 bg-white border-t border-slate-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] shrink-0">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal (Neto)</span>
                <span>{formatMoney(simSubtotal)}</span>
              </div>
              
              {/* Switch de IVA en Simulador */}
              <div className="flex justify-between items-center py-2 border-y border-slate-100">
                <span className="text-sm font-bold flex items-center gap-1 text-slate-700"><Receipt className="w-4 h-4"/> Agregar IVA (19%)</span>
                <button onClick={() => setSimulaIva(!simulaIva)} className={`w-12 h-6 rounded-full relative transition-colors shadow-inner ${simulaIva ? 'bg-purple-600' : 'bg-slate-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-md ${simulaIva ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              {simulaIva && (
                <div className="flex justify-between text-sm text-purple-600 font-medium">
                  <span>Impuestos</span>
                  <span>+ {formatMoney(simImpuestos)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-end mb-4">
              <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Total Estimado</span>
              <span className="text-3xl font-black text-purple-700 tracking-tight">{formatMoney(simTotal)}</span>
            </div>

            <button onClick={() => { setSimulatedCart([]); setSimulaIva(false); }} disabled={simulatedCart.length === 0} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors disabled:opacity-50">
              Limpiar Simulador
            </button>
          </div>
        </div>
      )}

      {/* FORMULARIO MODAL (El creador se mantiene igual) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">{isEditing ? 'Editar Servicio' : 'Crear Nuevo Servicio'}</h3>
              <button onClick={() => setShowForm(false)} className="hover:text-red-400 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="text-sm font-bold text-slate-700 block mb-1 flex items-center gap-2"><Layers className="w-4 h-4"/> Categoría</label>
                <input list="categorias-list" placeholder="Ej: Frenos, Mantención..." className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} required />
                <datalist id="categorias-list">{categoriasUnicas.map(cat => <option key={cat} value={cat} />)}</datalist>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Nombre del Servicio</label>
                <input placeholder="Ej: Cambio de Pastillas" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Descripción</label>
                <textarea className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none h-20" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mano de Obra</label><div className="relative"><span className="absolute left-3 top-2 text-slate-400">$</span><input type="number" className="w-full pl-6 p-2 border rounded" value={formData.precio_mano_obra} onChange={e => setFormData({...formData, precio_mano_obra: e.target.value})} /></div></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Insumos/Rep.</label><div className="relative"><span className="absolute left-3 top-2 text-slate-400">$</span><input type="number" className="w-full pl-6 p-2 border rounded" value={formData.precio_repuestos} onChange={e => setFormData({...formData, precio_repuestos: e.target.value})} /></div></div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center text-blue-800 font-bold border border-blue-100">
                <span>Total Estimado:</span><span className="text-lg">{formatMoney((Number(formData.precio_mano_obra) || 0) + (Number(formData.precio_repuestos) || 0))}</span>
              </div>
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 font-medium">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-brand-primary text-white font-bold rounded shadow-md hover:bg-blue-700">{isEditing ? 'Guardar Cambios' : 'Guardar Servicio'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}