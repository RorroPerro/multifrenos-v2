import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Car, Clock, Wrench, CheckCircle, ArrowRight, Loader2, MapPin, CalendarClock, CalendarPlus, X, Save, Play, Pause, AlertCircle, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const COLUMNS = [
  { id: 'Agendado', title: 'Agendados', icon: CalendarClock, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', badge: 'bg-indigo-100 text-indigo-700' },
  { id: 'Recibido', title: 'Recibidos', icon: Car, color: 'bg-blue-50 border-blue-200 text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  { id: 'En Proceso', title: 'En Taller / Reparando', icon: Wrench, color: 'bg-amber-50 border-amber-200 text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  { id: 'Finalizado', title: 'Listos para Entregar', icon: CheckCircle, color: 'bg-green-50 border-green-200 text-green-700', badge: 'bg-green-100 text-green-700' }
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
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchActiveOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ordenes')
      // CORRECCIÓN: Se agregó la petición de "folio"
      .select(`
        id, folio, estado, total, fecha_agendada, ubicacion_taller, 
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
    setTimeout(() => { e.target.style.opacity = '0.4' }, 0)
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

  // --- LÓGICA DE PLAY / PAUSA ---
  const toggleWorkTimer = async (e, order) => {
    e.stopPropagation()
    
    const isWorkingNow = !!order.trabajando_desde
    let updateData = {}
    
    if (isWorkingNow) {
      const tiempoExtraMins = Math.floor((new Date() - new Date(order.trabajando_desde)) / 60000)
      updateData = {
        trabajando_desde: null,
        tiempo_invertido_minutos: (order.tiempo_invertido_minutos || 0) + tiempoExtraMins
      }
    } else {
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

  const getTimeStatus = (dateString) => {
    if (!dateString) return null
    const targetDate = new Date(dateString)
    const diffMs = targetDate - now
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60))

    if (diffMs < 0) return { text: `Atrasado ${Math.abs(diffHrs)}h ${diffMins}m`, color: 'text-red-700 bg-red-100 border-red-200' }
    if (diffHrs === 0) return { text: `Llega en ${diffMins} min`, color: 'text-orange-700 bg-orange-100 border-orange-200' }
    return { text: `Llega en ${diffHrs}h ${diffMins}m`, color: 'text-green-700 bg-green-100 border-green-200' }
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-12 h-12 text-brand-primary"/></div>

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col relative pb-6 selection:bg-brand-primary selection:text-white">
      
      {/* HEADER Y BOTÓN AGENDAR (Diseño Limpio) */}
      <div className="mb-6 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-brand-primary"/> Pizarra de Control (Kanban)
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1 hidden sm:block">Arrastra las tarjetas o ábrelas para gestionar el vehículo.</p>
        </div>
        <button onClick={() => setShowAgendaModal(true)} className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-transform active:scale-95 shadow-lg">
          <CalendarPlus className="w-5 h-5"/> Agendar Cita
        </button>
      </div>

      {/* CONTENEDOR FLUIDO DE COLUMNAS (Optimizado para Scroll Horizontal en Móvil) */}
      <div className="flex-1 flex gap-5 overflow-x-auto pb-4 px-1 snap-x snap-mandatory hide-scrollbar">
        {COLUMNS.map(column => {
          const columnOrders = orders.filter(o => o.estado === column.id)
          
          return (
            <div 
              key={column.id} 
              className={`flex flex-col min-w-[320px] w-80 lg:w-[350px] shrink-0 bg-slate-100/60 rounded-3xl border-2 border-dashed ${draggedOrder ? 'border-slate-300 bg-slate-100' : 'border-transparent'} transition-colors snap-center h-full`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* HEADER COLUMNA */}
              <div className={`p-4 m-2 rounded-2xl border-2 flex justify-between items-center shadow-sm shrink-0 bg-white ${column.color.replace('bg-', 'border-').replace('border-', 'border-')}`}>
                <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <column.icon className="w-5 h-5"/> {column.title}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${column.badge}`}>{columnOrders.length}</span>
              </div>

              {/* LISTA DE TARJETAS (CORRECCIÓN: Se agregó pt-2 para dar aire a la animación de hover) */}
              <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2 space-y-4 custom-scrollbar">
                {columnOrders.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <column.icon className="w-12 h-12 mb-2"/>
                    <p className="text-sm font-bold uppercase tracking-widest">Columna Vacía</p>
                  </div>
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
                      className={`bg-white p-5 rounded-2xl border-2 shadow-sm cursor-grab active:cursor-grabbing transition-all relative group flex flex-col gap-3 hover:-translate-y-1 hover:shadow-lg ${isWorkingNow ? 'border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : 'border-slate-100 hover:border-blue-300'}`}
                    >
                      {/* Cabecera Tarjeta: Patente y Folio (CORRECCIÓN: Ya muestra el folio real) */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`font-mono font-black text-xl px-3 py-1 rounded-xl tracking-widest border-2 shadow-sm ${auto.patente?.startsWith('S/P') ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-white text-slate-900 border-slate-300'}`}>
                            {auto.patente || 'SIN-PAT'}
                          </span>
                          <p className="text-sm font-bold text-slate-700 uppercase tracking-wider mt-2 ml-1">{auto.marca} <span className="font-normal text-slate-500">{auto.modelo}</span></p>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">#{order.folio || order.id.slice(0,6).toUpperCase()}</span>
                      </div>

                      {/* Info Cliente */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 truncate"><User className="w-3.5 h-3.5 text-slate-400"/> {order.clientes?.nombre}</p>
                      </div>

                      {/* Motivo de visita (Solo en Agendados) */}
                      {column.id === 'Agendado' && (
                        <div className="space-y-2">
                          {motivo && (
                            <p className="text-[11px] text-slate-600 bg-blue-50/50 p-2.5 rounded-lg font-medium italic border border-blue-100 flex gap-2">
                              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0"/> <span className="line-clamp-2">{motivo}</span>
                            </p>
                          )}
                          {timer && (
                            <div className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border w-full text-center flex justify-center items-center gap-1.5 ${timer.color}`}>
                              <Clock className="w-3.5 h-3.5"/> {timer.text}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Controles de Taller (Solo En Proceso) */}
                      {column.id === 'En Proceso' && (
                        <div className="flex flex-col gap-2 mt-auto border-t border-slate-100 pt-3">
                          
                          {/* Selector de Ubicación Elegante */}
                          <div className="relative" onClick={e => e.stopPropagation()}>
                            <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400"/>
                            <select 
                              className="w-full pl-9 p-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors appearance-none"
                              value={order.ubicacion_taller || 'Sin Asignar'}
                              onChange={(e) => handleUbicacion(e, order.id, e.target.value)}
                            >
                              <option value="Sin Asignar">Sin Box Asignado</option>
                              <option value="Elevador 1 (Principal)">📍 Elevador 1 (Principal)</option>
                              <option value="Elevador 2">📍 Elevador 2</option>
                              <option value="Foso">📍 Foso de Inspección</option>
                              <option value="Patio">📍 Patio Exterior</option>
                            </select>
                          </div>
                          
                          {/* Botón Play/Pausa Gigante */}
                          <button 
                            onClick={(e) => toggleWorkTimer(e, order)}
                            className={`w-full py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm ${
                              isWorkingNow 
                                ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-2 border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]' 
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            {isWorkingNow ? (
                              <><Pause className="w-5 h-5"/> Pausar <span className="font-mono ml-1">[{tiempoMostrar}]</span></>
                            ) : (
                              <><Play className="w-5 h-5"/> Iniciar Trabajo</>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Botón Entregar (Solo Finalizados) */}
                      {column.id === 'Finalizado' && (
                        <div className="mt-auto border-t border-slate-100 pt-3 space-y-2">
                          {order.tiempo_invertido_minutos > 0 && (
                            <div className="text-[10px] text-slate-500 font-bold bg-slate-50 p-2 rounded-lg flex items-center justify-center gap-1.5 border border-slate-100">
                              <Clock className="w-3.5 h-3.5 text-slate-400"/> Tiempo invertido: <span className="font-black text-slate-700">{formatTiempo(order.tiempo_invertido_minutos, null)}</span>
                            </div>
                          )}
                          <button 
                            onClick={(e) => handleEntregar(e, order.id)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                          >
                            Entregar Llaves <ArrowRight className="w-4 h-4"/>
                          </button>
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* --- MODAL PARA AGENDAR CITA RÁPIDA --- */}
      {showAgendaModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-bounce-in flex flex-col max-h-[95vh]">
            <div className="bg-indigo-600 text-white p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-xl flex items-center gap-2 tracking-tight"><CalendarPlus className="w-6 h-6"/> Nueva Cita</h3>
                <p className="text-indigo-200 text-xs mt-1 uppercase tracking-widest font-bold">Ingreso rápido a la pizarra</p>
              </div>
              <button onClick={() => setShowAgendaModal(false)} className="hover:bg-indigo-500 p-2 rounded-full transition-colors"><X className="w-6 h-6"/></button>
            </div>

            <form onSubmit={handleAgendar} className="p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50">
              
              {/* Bloque 1: Cuándo */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5"/> ¿Cuándo llega?</h4>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" required className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50" value={agendaForm.fecha} onChange={e => setAgendaForm({...agendaForm, fecha: e.target.value})} />
                  <input type="time" required className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 text-center" value={agendaForm.hora} onChange={e => setAgendaForm({...agendaForm, hora: e.target.value})} />
                </div>
              </div>

              {/* Bloque 2: Quién */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> Datos del Cliente</h4>
                <div>
                  <input required placeholder="Nombre del Cliente *" className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-800 bg-slate-50" value={agendaForm.nombre} onChange={e => setAgendaForm({...agendaForm, nombre: e.target.value})} />
                </div>
                <div>
                  <input inputMode="numeric" placeholder="Teléfono / WhatsApp" className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50" value={agendaForm.telefono} onChange={e => setAgendaForm({...agendaForm, telefono: e.target.value})} />
                </div>
              </div>

              {/* Bloque 3: Vehículo */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1.5"><Car className="w-3.5 h-3.5"/> Datos del Vehículo</h4>
                <div>
                  <input placeholder="Patente (Ej: ABCD12)" className="w-full p-3 border-2 border-slate-200 rounded-xl font-mono uppercase font-black tracking-[0.2em] text-center outline-none focus:border-indigo-500 bg-slate-50 text-lg" value={agendaForm.patente} onChange={e => setAgendaForm({...agendaForm, patente: e.target.value.toUpperCase()})} maxLength={6}/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Marca (Ej: Toyota)" className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 uppercase" value={agendaForm.marca} onChange={e => setAgendaForm({...agendaForm, marca: e.target.value})} />
                  <input placeholder="Modelo (Ej: Yaris)" className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-slate-700 bg-slate-50 uppercase" value={agendaForm.modelo} onChange={e => setAgendaForm({...agendaForm, modelo: e.target.value})} />
                </div>
              </div>

              {/* Bloque 4: Motivo */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5"/> Motivo de Visita</h4>
                <textarea placeholder="Ej: Mantención de 50.000km, cliente reporta ruido extraño al girar a la derecha..." className="w-full p-3 border-2 border-slate-200 rounded-xl h-24 outline-none focus:border-indigo-500 text-sm font-medium text-slate-700 bg-slate-50 resize-none" value={agendaForm.motivo} onChange={e => setAgendaForm({...agendaForm, motivo: e.target.value})} />
              </div>

            </form>

            {/* Footer Modal */}
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowAgendaModal(false)} className="w-full sm:w-auto px-6 py-4 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button type="submit" onClick={handleAgendar} disabled={isSubmitting} className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5" />} Agendar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}