import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Search, X, Loader2, Tag, Layers, Trash2, Edit, Wrench } from 'lucide-react'

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
  const [activeCategory, setActiveCategory] = useState('Todos') // <--- NUEVO FILTRO VISUAL

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

  // --- LÓGICA DE AGRUPACIÓN Y FILTRADO ---
  const categoriasUnicas = [...new Set(services.map(s => s.categoria))].filter(Boolean).sort()

  // 1. Filtrar por búsqueda de texto
  let filteredServices = services.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.descripcion && s.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 2. Filtrar por pestaña (Categoría) activa
  if (activeCategory !== 'Todos') {
    filteredServices = filteredServices.filter(s => s.categoria === activeCategory)
  }

  // 3. Agrupar
  const groupedServices = filteredServices.reduce((acc, servicio) => {
    const cat = servicio.categoria || 'General'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(servicio)
    return acc
  }, {})

  const formatMoney = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER Y BUSCADOR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Servicios</h1>
          <p className="text-slate-500 text-sm">Gestiona tus precios de manera eficiente</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar servicio..." 
              className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={openCreateModal}
            className="bg-brand-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg whitespace-nowrap"
          >
            <Plus className="w-5 h-5" /> Nuevo
          </button>
        </div>
      </div>

      {/* --- NUEVO: PESTAÑAS DE CATEGORÍAS (CHIPS) --- */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200">
        <button
          onClick={() => setActiveCategory('Todos')}
          className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
            activeCategory === 'Todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todos ({services.length})
        </button>
        {categoriasUnicas.map(cat => {
          const count = services.filter(s => s.categoria === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeCategory === cat ? 'bg-brand-primary text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat ? 'bg-white/20' : 'bg-slate-100'}`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* FORMULARIO MODAL (Se mantiene igual) */}
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

      {/* --- NUEVO: LISTA COMPACTA (TIPO TABLA/FILAS) --- */}
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
              
              {/* Solo mostramos el título de la categoría si estamos en la vista "Todos" */}
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
                    <div key={servicio.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                      
                      {/* Lado Izquierdo: Info del Servicio */}
                      <div className="flex-1 flex items-start gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg text-slate-400 hidden sm:block">
                          <Wrench className="w-5 h-5"/>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 leading-tight">{servicio.nombre}</h3>
                          <p className="text-slate-500 text-sm mt-0.5 line-clamp-1">{servicio.descripcion || 'Sin descripción'}</p>
                        </div>
                      </div>

                      {/* Lado Derecho: Precios y Acciones */}
                      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 w-full md:w-auto bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-lg border md:border-none border-slate-100">
                        
                        <div className="text-slate-500 min-w-[80px]">
                          <span className="block text-[9px] uppercase font-bold tracking-wider">Mano Obra</span>
                          <span className="font-medium text-sm">{formatMoney(mo)}</span>
                        </div>
                        
                        <div className="text-slate-500 min-w-[80px]">
                          <span className="block text-[9px] uppercase font-bold tracking-wider">Repuestos</span>
                          <span className="font-medium text-sm">{formatMoney(rep)}</span>
                        </div>
                        
                        <div className="min-w-[100px] text-right ml-auto md:ml-4">
                          <span className="block text-[9px] uppercase font-bold tracking-wider text-brand-primary md:hidden">Total</span>
                          <span className="font-black text-lg text-brand-primary">{formatMoney(total)}</span>
                        </div>

                        {/* Botones de acción (Aparecen en móvil siempre, en PC al hacer hover) */}
                        <div className="flex gap-1 md:ml-4 md:pl-4 md:border-l border-slate-200 w-full md:w-auto justify-end mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(servicio)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                            <Edit className="w-4 h-4"/>
                          </button>
                          <button onClick={() => handleDelete(servicio.id)} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
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
  )
}