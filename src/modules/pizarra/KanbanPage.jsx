import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Car, Clock, Wrench, CheckCircle, ArrowRight, Loader2, MapPin, CalendarClock, CalendarPlus, X, Save, Play, Pause } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const COLUMNS = [
  { id: 'Agendado', title: 'Agendados', icon: CalendarClock, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { id: 'Recibido', title: 'Recibidos', icon: Car, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'En Proceso', title: 'En Proceso', icon: Wrench, color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'Finalizado', title: 'Finalizados (Por retirar)', icon: CheckCircle, color: 'bg-green-50 border-green-200 text-green-700' }
]

export default function KanbanPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [draggedOrder, setDraggedOrder] = useState(null)

  // --- ESTADO PARA RELOJ EN VIVO ---
  const [now, setNow] = useState(new Date())

  // --- ESTADOS PARA AGENDAR CITA ---
  const [showAgendaModal, setShowAgendaModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agendaForm, setAgendaForm] = useState({
    nombre: '', telefono: '', marca: '', modelo: '', patente: '', fecha: '', hora: '10:00', motivo: ''
  })

  useEffect(() => {
    fetchActiveOrders()
    // Timer para refrescar la interfaz cada minuto y ver avanzar los relojes
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchActiveOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ordenes')
      .select(`
        id, estado, total, fecha_agendada, ubicacion_taller, 
        tiempo_invertido_minutos, trabajando_desde,
        clientes (nombre, telefono),
        orden_autos (observaciones_recepcion, autos (id, patente, marca, modelo))
      `)
      .neq('estado', 'Entregado')
      .order('created_at', { ascending: false })

    if (!error) setOrders(data || [])
    setLoading(false)
  }

  // --- LÓGICA DE DRAG & DROP ---
  const handleDragStart = (e, order) => {
    setDraggedOrder(order)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', order.id)
    setTimeout(() => { e.target.style.opacity = '0.5' }, 0)
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedOrder(null)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, newStatus) => {
    e.preventDefault()
    if (!draggedOrder || draggedOrder.estado === newStatus) return

    let updateData = { estado: newStatus }

    // PAUSA AUTOMÁTICA: Si lo sacan de "En Proceso" y estaba andando, lo pausamos y sumamos el tiempo
    if (draggedOrder.estado === 'En Proceso' && newStatus !== 'En Proceso' && draggedOrder.trabajando_desde) {
      const tiempoExtraMins = Math.floor((new Date() - new Date(draggedOrder.trabajando_desde)) / 60000)
      updateData.tiempo_invertido_minutos = (draggedOrder.tiempo_invertido_minutos || 0) + tiempoExtraMins
      updateData.trabajando_desde = null
    }

    setOrders(orders.map(o => o.id === draggedOrder.id ? { ...o, ...updateData } : o))
    
    const { error } = await supabase.from('ordenes').update(updateData).eq('id', draggedOrder.id)
    if (error) {
      alert('Error al mover la tarjeta')
      fetchActiveOrders()
    }
  }

  const handleEntregar = async (e, orderId) => {
    e.stopPropagation()
    if(!confirm('¿Confirmas que el cliente ya retiró el vehículo? Esta orden pasará al Historial.')) return
    setOrders(orders.filter(o => o.id !== orderId))
    await supabase.from('ordenes').update({ estado: 'Entregado' }).eq('id', orderId)
  }

  const handleUbicacion = async (e, orderId, newUbicacion) => {
    e.stopPropagation()
    setOrders(orders.map(o => o.id === orderId ? { ...o, ubicacion_taller: newUbicacion } : o))
    await supabase.from('ordenes').update({ ubicacion_taller: newUbicacion }).eq('id', orderId)
  }

  // --- NUEVO: LÓGICA DE PLAY / PAUSA ---
  const toggleWorkTimer = async (e, order) => {
    e.stopPropagation()
    
    const isWorkingNow = !!order.trabajando_desde
    let updateData = {}
    
    if (isWorkingNow) {
      // PAUSAR: Calculamos los minutos desde que le dio play y los sumamos al total
      const tiempoExtraMins = Math.floor((new Date() - new Date(order.trabajando_desde)) / 60000)
      updateData = {
        trabajando_desde: null,
        tiempo_invertido_minutos: (order.tiempo_invertido_minutos || 0) + tiempoExtraMins
      }
    } else {
      // INICIAR: Guardamos la hora actual
      updateData = {
        trabajando_desde: new Date().toISOString()
      }
    }

    setOrders(orders.map(o => o.id === order.id ? { ...o, ...updateData } : o))
    await supabase.from('ordenes').update(updateData).eq('id', order.id)
  }

  const formatTiempo = (minutosAcumulados, fechaInicio) => {
    let totalMins = minutosAcumulados || 0
    if (fechaInicio) {
      totalMins += Math.floor((now - new Date(fechaInicio)) / 60000)
    }
    
    const hrs = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    
    if (hrs === 0) return `${mins}m`
    return `${hrs}h ${mins}m`
  }


  // --- LÓGICA DE AGENDAR CITA RÁPIDA ---
  const handleAgendar = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let clienteId = null
      if (agendaForm.telefono) {
        const { data: exCliente } = await supabase.from('clientes').select('id').eq('telefono', agendaForm.telefono).single()
        if (exCliente) clienteId = exCliente.id
      }
      
      if (!clienteId) {
        const { data: newC, error: errC } = await supabase.from('clientes').insert([{ nombre: agendaForm.nombre, telefono: agendaForm.telefono }]).select().single()
        if (errC) throw new Error('Error al crear cliente')
        clienteId = newC.id
      }

      const patenteAUsar = agendaForm.patente ? agendaForm.patente.toUpperCase() : `S/P-${Math.floor(1000 + Math.random() * 9000)}`
      
      let autoId = null
      const { data: exAuto } = await supabase.from('autos').select('id').eq('patente', patenteAUsar).single()
      if (exAuto) {
        autoId = exAuto.id
      } else {
        const { data: newA, error: errA } = await supabase.from('autos').insert([{ patente: patenteAUsar, marca: agendaForm.marca, modelo: agendaForm.modelo, cliente_id: clienteId }]).select().single()
        if (errA) throw new Error('Error al registrar auto')
        autoId = newA.id
      }

      const fechaFull = `${agendaForm.fecha}T${agendaForm.hora}:00`
      const { data: newOrder, error: errO } = await supabase.from('ordenes').insert([{ cliente_id: clienteId, estado: 'Agendado', fecha_agendada: fechaFull }]).select().single()
      if (errO) throw new Error('Error al crear orden')

      const { error: errRel } = await supabase.from('orden_autos').insert([{ orden_id: newOrder.id, auto_id: autoId, observaciones_recepcion: agendaForm.motivo }])
      if (errRel) throw new Error('Error al vincular vehículo')

      setShowAgendaModal(false)
      setAgendaForm({ nombre: '', telefono: '', marca: '', modelo: '', patente: '', fecha: '', hora: '10:00', motivo: '' })
      fetchActiveOrders()

    } catch (error) {
      alert(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- CALCULADORA DEL TIMER ---
  const getTimeStatus = (dateString) => {
    if (!dateString) return null
    const targetDate = new Date(dateString)
    const diffMs = targetDate - now
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffMs < 0) return { text: `Atrasado ${Math.abs(diffHrs)}h ${Math.abs(diffMins)}m`, color: 'text-red-600 bg-red-100 border-red-200' }
    if (diffHrs === 0) return { text: `Llega en ${diffMins} min`, color: 'text-orange-600 bg-orange-100 border-orange-200' }
    return { text: `Llega en ${diffHrs}h ${diffMins}m`, color: 'text-green-600 bg-green-100 border-green-200' }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-12 h-12 text-brand-primary"/></div>

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col relative">
      
      {/* HEADER Y BOTÓN AGENDAR */}
      <div className="mb-4 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pizarra del Taller (Kanban)</h1>
          <p className="text-slate-500 text-sm">Arrastra las tarjetas para cambiar su estado.</p>
        </div>
        <button onClick={() => setShowAgendaModal(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
          <CalendarPlus className="w-5 h-5"/> Agendar Cita
        </button>
      </div>

      {/* CONTENEDOR DE COLUMNAS */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {COLUMNS.map(column => {
          const columnOrders = orders.filter(o => o.estado === column.id)
          
          return (
            <div 
              key={column.id} 
              className={`flex flex-col min-w-[300px] w-80 shrink-0 bg-slate-100/50 rounded-2xl border-2 border-dashed ${draggedOrder ? 'border-slate-300 bg-slate-100' : 'border-transparent'} transition-colors snap-center h-full`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* HEADER COLUMNA */}
              <div className={`p-3 m-2 rounded-xl border flex justify-between items-center ${column.color} shadow-sm shrink-0`}>
                <h3 className="font-bold flex items-center gap-2">
                  <column.icon className="w-5 h-5"/> {column.title}
                </h3>
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-black">{columnOrders.length}</span>
              </div>

              {/* LISTA DE TARJETAS */}
              <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
                {columnOrders.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-10 italic">Columna vacía</p>
                )}
                
                {columnOrders.map(order => {
                  const auto = order.orden_autos?.[0]?.autos || {}
                  const motivo = order.orden_autos?.[0]?.observaciones_recepcion || ''
                  const timer = order.estado === 'Agendado' ? getTimeStatus(order.fecha_agendada) : null
                  
                  const isWorkingNow = !!order.trabajando_desde
                  const tiempoMostrar = formatTiempo(order.tiempo_invertido_minutos, order.trabajando_desde)

                  return (
                    <div 
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order)}
                      onDragEnd={handleDragEnd}
                      onClick={() => navigate(`/ordenes/${order.id}`)}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all relative group"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${column.id==='Agendado'?'bg-indigo-400':column.id==='Recibido'?'bg-blue-400':column.id==='En Proceso'?'bg-amber-400':'bg-green-400'}`}></div>

                      <div className="pl-2">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`font-black font-mono text-lg px-2 py-0.5 rounded ${auto.patente?.startsWith('S/P') ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-800'}`}>
                            {auto.patente || 'SIN-PAT'}
                          </span>
                          <span className="text-xs font-bold text-slate-400">#{order.id.slice(0,5).toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 leading-tight">{auto.marca} {auto.modelo}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">{order.clientes?.nombre} {order.clientes?.telefono ? `(${order.clientes.telefono})` : ''}</p>

                        {/* Motivo de visita en agendados */}
                        {column.id === 'Agendado' && motivo && (
                          <p className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded mt-2 italic line-clamp-2 border border-slate-100">"{motivo}"</p>
                        )}

                        <div className="mt-3 flex flex-col gap-2">
                          
                          {timer && (
                            <div className={`text-[10px] font-bold px-2 py-1 rounded border inline-flex items-center gap-1 w-fit ${timer.color}`}>
                              <Clock className="w-3 h-3"/> {timer.text}
                            </div>
                          )}

                          {column.id === 'En Proceso' && (
                            <div className="space-y-2">
                              {/* 1. Selector de Ubicación */}
                              <div className="flex items-center gap-1 text-xs" onClick={e => e.stopPropagation()}>
                                <MapPin className="w-3 h-3 text-slate-400"/>
                                <select 
                                  className="bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-bold text-slate-600 outline-none w-full cursor-pointer hover:bg-slate-100"
                                  value={order.ubicacion_taller || 'Sin Asignar'}
                                  onChange={(e) => handleUbicacion(e, order.id, e.target.value)}
                                >
                                  <option value="Sin Asignar">Espacio sin asignar...</option>
                                  <option value="Elevador 1 (Principal)">Elevador 1 (Principal)</option>
                                  <option value="Elevador 2">Elevador 2</option>
                                  <option value="Foso">Foso</option>
                                  <option value="Patio">Patio Exterior</option>
                                </select>
                              </div>
                              
                              {/* 2. NUEVO: Control de Tiempo (Play/Pausa) */}
                              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-1.5 rounded-lg" onClick={e => e.stopPropagation()}>
                                <span className={`text-[11px] font-bold font-mono pl-1 ${isWorkingNow ? 'text-green-600' : 'text-slate-500'}`}>
                                  ⏱️ {tiempoMostrar}
                                </span>
                                <button 
                                  onClick={(e) => toggleWorkTimer(e, order)}
                                  className={`px-3 py-1 rounded shadow-sm text-[10px] font-bold uppercase flex items-center gap-1 transition-colors ${
                                    isWorkingNow 
                                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200' 
                                      : 'bg-green-500 hover:bg-green-600 text-white'
                                  }`}
                                >
                                  {isWorkingNow ? <><Pause className="w-3 h-3"/> Pausar</> : <><Play className="w-3 h-3"/> Iniciar</>}
                                </button>
                              </div>
                            </div>
                          )}

                          {column.id === 'Finalizado' && (
                            <div className="space-y-2">
                              {/* Mostramos el tiempo total al final */}
                              {order.tiempo_invertido_minutos > 0 && (
                                <p className="text-[10px] text-slate-500 font-bold bg-slate-50 p-1 rounded inline-block">
                                  ⏱️ Tiempo total: {formatTiempo(order.tiempo_invertido_minutos, null)}
                                </p>
                              )}
                              <button 
                                onClick={(e) => handleEntregar(e, order.id)}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                              >
                                <ArrowRight className="w-4 h-4"/> Entregar Vehículo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* --- MODAL PARA AGENDAR CITA --- */}
      {showAgendaModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2"><CalendarPlus className="w-5 h-5"/> Agendar Cita</h3>
                <p className="text-indigo-200 text-xs">Anota los datos que tengas, el resto se llena después.</p>
              </div>
              <button onClick={() => setShowAgendaModal(false)} className="hover:text-red-300 transition-colors"><X className="w-6 h-6"/></button>
            </div>

            <form onSubmit={handleAgendar} className="p-6 overflow-y-auto space-y-5">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Día de Llegada *</label>
                  <input type="date" required className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" value={agendaForm.fecha} onChange={e => setAgendaForm({...agendaForm, fecha: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Hora de Llegada *</label>
                  <input type="time" required className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" value={agendaForm.hora} onChange={e => setAgendaForm({...agendaForm, hora: e.target.value})} />
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Cliente *</label>
                  <input required placeholder="Ej: Juan Pérez" className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-indigo-500" value={agendaForm.nombre} onChange={e => setAgendaForm({...agendaForm, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Teléfono (Importante)</label>
                  <input placeholder="Ej: +569 1234 5678" className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-indigo-500" value={agendaForm.telefono} onChange={e => setAgendaForm({...agendaForm, telefono: e.target.value})} />
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Marca</label>
                    <input placeholder="Ej: Toyota" className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-indigo-500" value={agendaForm.marca} onChange={e => setAgendaForm({...agendaForm, marca: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Modelo</label>
                    <input placeholder="Ej: Yaris" className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-indigo-500" value={agendaForm.modelo} onChange={e => setAgendaForm({...agendaForm, modelo: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                    <span>Patente</span> <span className="text-[9px] text-orange-500">Déjalo en blanco si no la sabes</span>
                  </label>
                  <input placeholder="Ej: ABCD12" className="w-full p-2.5 border rounded-lg mt-1 font-mono uppercase outline-none focus:ring-2 focus:ring-indigo-500" value={agendaForm.patente} onChange={e => setAgendaForm({...agendaForm, patente: e.target.value.toUpperCase()})} />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="text-xs font-bold text-slate-500 uppercase">¿A qué viene el auto?</label>
                <textarea placeholder="Ej: Revisión de frenos delanteros porque suenan..." className="w-full p-2.5 border rounded-lg mt-1 h-20 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={agendaForm.motivo} onChange={e => setAgendaForm({...agendaForm, motivo: e.target.value})} />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAgendaModal(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />} Agendar Vehículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}