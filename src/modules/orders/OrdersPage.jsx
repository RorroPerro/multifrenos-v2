import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Car, FileText, X, Trash2, Loader2, Save, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [autos, setAutos] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  
  // MODALES
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null) // Para ver detalles

  // ESTADO DEL FORMULARIO DE CREACIÓN
  const [formAuto, setFormAuto] = useState('')
  const [cart, setCart] = useState([]) 
  const [formServiceId, setFormServiceId] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    // 1. Cargar Órdenes (Cabecera)
    const { data: ordersData, error } = await supabase
      .from('ordenes')
      .select(`*, autos ( patente, marca, modelo, clientes ( nombre ) )`)
      .order('created_at', { ascending: false })

    if (error) console.error('Error ordenes:', error)
    else setOrders(ordersData)

    // 2. Cargar Autos y Servicios (Para los selectores)
    const { data: a } = await supabase.from('autos').select('id, patente, marca, modelo').order('patente')
    const { data: s } = await supabase.from('servicios').select('*').order('nombre')
    
    if (a) setAutos(a)
    if (s) setServices(s)
    
    setLoading(false)
  }

  // --- LÓGICA DE CREACIÓN (CARRITO) ---
  const addToCart = () => {
    if (!formServiceId) return
    const service = services.find(s => s.id === formServiceId)
    setCart([...cart, { ...service, tempId: Date.now() }])
    setFormServiceId('')
  }

  const removeFromCart = (tempId) => {
    setCart(cart.filter(item => item.tempId !== tempId))
  }

  const calculateTotal = (items) => items.reduce((sum, item) => sum + (item.precio_mano_obra + item.precio_repuestos), 0)

  async function handleCreateOrder() {
    if (!formAuto) return alert('Selecciona un auto')
    if (cart.length === 0) return alert('Agrega servicios')

    try {
      const total = calculateTotal(cart)
      const user = (await supabase.auth.getUser()).data.user

      // 1. Crear Orden
      const { data: order, error: orderError } = await supabase
        .from('ordenes')
        .insert([{ auto_id: formAuto, estado: 'Ingresado', total: total, usuario_id: user.id }])
        .select().single()

      if (orderError) throw orderError

      // 2. Crear Detalles
      const detalles = cart.map(item => ({
        orden_id: order.id,
        servicio_nombre: item.nombre,
        precio_unitario: item.precio_mano_obra + item.precio_repuestos,
        total_linea: item.precio_mano_obra + item.precio_repuestos
      }))

      await supabase.from('orden_detalle').insert(detalles)

      setShowCreateModal(false)
      setCart([])
      setFormAuto('')
      fetchData()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  // --- LÓGICA DE GESTIÓN (DETALLES Y ESTADO) ---
  
  // 1. Abrir Modal de Detalles (Carga los servicios de esa orden)
  async function openOrderDetails(order) {
    const { data: detalles } = await supabase
      .from('orden_detalle')
      .select('*')
      .eq('orden_id', order.id)
    
    // Guardamos la orden completa + sus detalles en el estado
    setSelectedOrder({ ...order, detalles: detalles || [] })
  }

  // 2. Actualizar Estado (Ingresado -> Terminado -> Entregado)
  async function updateStatus(newStatus) {
    if (!selectedOrder) return

    const { error } = await supabase
      .from('ordenes')
      .update({ estado: newStatus })
      .eq('id', selectedOrder.id)

    if (error) {
      alert('Error al actualizar')
    } else {
      // Actualizamos la vista localmente para que se vea rápido
      setSelectedOrder({ ...selectedOrder, estado: newStatus })
      fetchData() 
    }
  }

  // 3. Eliminar Orden
  async function deleteOrder() {
    if (!selectedOrder) return
    if (!confirm('¿Estás seguro de eliminar esta orden? Esto no se puede deshacer.')) return

    const { error } = await supabase.from('ordenes').delete().eq('id', selectedOrder.id)

    if (error) alert('Error: ' + error.message)
    else {
      setSelectedOrder(null)
      fetchData()
    }
  }


  // --- HELPERS VISUALES ---
  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
  
  const statusColor = (status) => {
    switch(status) {
      case 'Ingresado': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'En Proceso': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Terminado': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Entregado': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-slate-100 text-slate-800'
    }
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Órdenes de Trabajo</h1>
          <p className="text-slate-500 text-sm">Gestiona el flujo del taller</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="bg-brand-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
          <Plus className="w-5 h-5" /> Nueva Orden
        </button>
      </div>

      {/* LISTA DE ÓRDENES */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay órdenes activas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((orden) => (
            <div key={orden.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-lg text-slate-800 bg-slate-100 px-2 rounded">
                      {orden.autos?.patente}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(orden.estado)}`}>
                      {orden.estado}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Car className="w-3 h-3" /> {orden.autos?.marca} {orden.autos?.modelo}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-lg text-brand-primary">{money(orden.total)}</span>
                  <span className="text-xs text-slate-400">{new Date(orden.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="bg-slate-50 p-3 flex justify-end">
                <button 
                  onClick={() => openOrderDetails(orden)}
                  className="w-full text-sm font-medium text-blue-600 hover:bg-blue-100 py-2 rounded border border-blue-200 bg-white transition-colors"
                >
                  Ver Detalles / Gestionar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL 1: CREAR NUEVA ORDEN --- */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">Nueva Orden</h3>
              <button onClick={() => setShowCreateModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Vehículo</label>
                <select className="w-full p-2 border rounded" value={formAuto} onChange={e => setFormAuto(e.target.value)}>
                  <option value="">-- Seleccionar --</option>
                  {autos.map(a => <option key={a.id} value={a.id}>{a.patente} - {a.marca}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Servicios</label>
                <div className="flex gap-2 mb-2">
                  <select className="flex-1 p-2 border rounded" value={formServiceId} onChange={e => setFormServiceId(e.target.value)}>
                    <option value="">-- Seleccionar --</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.nombre} ({money(s.precio_mano_obra + s.precio_repuestos)})</option>)}
                  </select>
                  <button onClick={addToCart} className="bg-blue-600 text-white px-3 rounded">Agregar</button>
                </div>
                {cart.map(item => (
                  <div key={item.tempId} className="flex justify-between p-2 bg-slate-50 border rounded mb-1 text-sm">
                    <span>{item.nombre}</span>
                    <div className="flex gap-2">
                      <span className="font-bold">{money(item.precio_mano_obra + item.precio_repuestos)}</span>
                      <button onClick={() => removeFromCart(item.tempId)} className="text-red-500"><X className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-100 border-t flex justify-between items-center">
              <span className="font-bold text-xl text-slate-800">Total: {money(calculateTotal(cart))}</span>
              <button onClick={handleCreateOrder} className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: GESTIONAR ORDEN EXISTENTE --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            {/* Cabecera del Detalle */}
            <div className="bg-slate-50 p-4 border-b flex justify-between items-start">
              <div>
                <h3 className="font-bold text-xl text-slate-800">Orden #{selectedOrder.id.slice(0,4)}</h3>
                <p className="text-slate-500 text-sm">
                  {selectedOrder.autos?.patente} • {selectedOrder.autos?.clientes?.nombre}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 hover:bg-slate-200 rounded-full"><X className="w-6 h-6 text-slate-500" /></button>
            </div>

            {/* Cuerpo */}
            <div className="p-6 space-y-6">
              
              {/* Selector de Estado (EL CONTROL DE MANDO) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Estado Actual</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Ingresado', 'En Proceso', 'Terminado', 'Entregado'].map((estado) => (
                    <button
                      key={estado}
                      onClick={() => updateStatus(estado)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                        selectedOrder.estado === estado
                          ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {estado}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Servicios */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Detalle de Servicios</label>
                <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-100">
                  {selectedOrder.detalles?.map((d) => (
                    <div key={d.id} className="flex justify-between text-sm text-slate-700">
                      <span>{d.servicio_nombre}</span>
                      <span className="font-mono">{money(d.total_linea)}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-bold text-slate-900">
                    <span>TOTAL</span>
                    <span>{money(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Botón de Borrar (Zona de Peligro) */}
              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={deleteOrder}
                  className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 py-3 rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar Orden del Sistema
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}