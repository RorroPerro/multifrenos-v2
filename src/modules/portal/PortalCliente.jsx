import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { Car, Loader2, Calendar, Droplets, Wrench, Edit2, Check, X, MessageCircle, AlertTriangle, CheckCircle2, ShieldAlert, Activity, ArrowRight } from 'lucide-react'

export default function PortalCliente() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState(null)
  const [autos, setAutos] = useState([])
  
  const [editingKmId, setEditingKmId] = useState(null)
  const [tempKm, setTempKm] = useState('')
  const [isSavingKm, setIsSavingKm] = useState(false)

  // ESTADO DEL MODAL S.O.S
  const [showSosModal, setShowSosModal] = useState(false)
  const [sosData, setSosData] = useState({ auto_id: '', mensaje: '' })

  useEffect(() => {
    if (token) fetchDatos()
  }, [token])

  async function fetchDatos() {
    try {
      const { data: clienteData, error } = await supabase.from('clientes').select('*').eq('token_flota', token).single()
      if (error || !clienteData) throw new Error('Enlace inválido')
      setCliente(clienteData)

      // 1. Traemos los autos del cliente
      const { data: autosData } = await supabase.from('autos').select('*').eq('cliente_id', clienteData.id).order('patente')
      
      // 2. Traemos TODAS las órdenes del cliente para buscar si hay alguna en el taller
      const { data: ordenesData } = await supabase.from('ordenes').select('*, orden_autos(auto_id)').eq('cliente_id', clienteData.id).order('created_at', { ascending: false })

      // 3. Mapeamos para ver si tienen una orden activa
      const autosConOrdenActiva = autosData.map(auto => {
        const ordenesDelAuto = ordenesData.filter(o => o.orden_autos.some(rel => rel.auto_id === auto.id))
        const ordenActiva = ordenesDelAuto.find(o => ['Agendado', 'Recibido', 'En Proceso', 'Finalizado'].includes(o.estado))

        return {
          ...auto,
          orden_activa_id: ordenActiva ? ordenActiva.id : null
        }
      })

      setAutos(autosConOrdenActiva || [])
    } catch (error) {
      console.error(error)
      setCliente(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveKm = async (autoId) => {
    if (!tempKm || isNaN(tempKm)) return alert('Ingresa un kilometraje válido')
    setIsSavingKm(true)
    const nuevoKm = Number(tempKm)
    const { error } = await supabase.from('autos').update({ kilometraje_actual: nuevoKm }).eq('id', autoId)
    if (!error) {
      setAutos(autos.map(a => a.id === autoId ? { ...a, kilometraje_actual: nuevoKm } : a))
      setEditingKmId(null)
    }
    setIsSavingKm(false)
  }

  const calcularEstado = (kmActual, kmProximo, vidaUtil = 10000) => {
    if (!kmActual || !kmProximo) return { porcentaje: 0, faltan: null, colorBarra: 'bg-slate-200', colorTexto: 'text-slate-500', estado: 'Falta registro' }
    const kmFaltantes = kmProximo - kmActual
    if (kmFaltantes <= 0) return { porcentaje: 100, faltan: 0, colorBarra: 'bg-red-500', colorTexto: 'text-red-600', estado: '¡Agendar Cambio!' }
    let porcentaje = ((vidaUtil - Math.min(kmFaltantes, vidaUtil)) / vidaUtil) * 100
    porcentaje = Math.max(5, Math.min(porcentaje, 100))
    if (kmFaltantes <= 1500) return { porcentaje, faltan: kmFaltantes, colorBarra: 'bg-orange-500', colorTexto: 'text-orange-600', estado: 'Cambio Próximo' }
    return { porcentaje, faltan: kmFaltantes, colorBarra: 'bg-green-500', colorTexto: 'text-green-600', estado: 'Nivel Óptimo' }
  }

  const calcularDoc = (fechaStr, isOk) => {
    if (!fechaStr) return { estado: 'Falta registrar', color: 'text-slate-500', statusIcon: AlertTriangle, statusColor: 'text-slate-400', statusText: 'Sin datos' }
    
    const statusIcon = isOk ? CheckCircle2 : AlertTriangle;
    const statusColor = isOk ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-500 bg-red-50 border-red-200';
    const statusText = isOk ? 'Al Día' : 'Pendiente';

    const [year, month, day] = fechaStr.split('-')
    const fechaVence = new Date(year, month - 1, day)
    const hoy = new Date()
    hoy.setHours(0,0,0,0)
    
    const diffDays = Math.ceil((fechaVence - hoy) / (1000 * 60 * 60 * 24))

    let timeText = ''; let color = '';
    if (diffDays < 0) { timeText = `Vencida hace ${Math.abs(diffDays)} días`; color = 'text-red-600 font-bold'; }
    else if (diffDays === 0) { timeText = 'Vence HOY'; color = 'text-red-600 font-bold'; }
    else if (diffDays <= 30) { timeText = `Faltan ${diffDays} días`; color = 'text-orange-600 font-bold'; }
    else { const meses = Math.floor(diffDays / 30); timeText = `Faltan ~${meses} mes${meses > 1 ? 'es' : ''}`; color = 'text-green-600 font-bold'; }

    return { estado: timeText, color, statusIcon, statusColor, statusText }
  }

  const agendarWhatsApp = (auto) => {
    const telefonoTaller = "56987763347" 
    const mensaje = `Hola Multifrenos 🚗🔧! Soy ${cliente.nombre}. Quisiera agendar una mantención para mi auto patente *${auto.patente}*.`
    window.open(`https://wa.me/${telefonoTaller}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const enviarSOSWhatsApp = (e) => {
    e.preventDefault()
    if (!sosData.auto_id || !sosData.mensaje) return alert('Por favor, selecciona un vehículo y describe la falla.')
    
    const autoAfectado = autos.find(a => a.id === sosData.auto_id)
    const telefonoTaller = "56987763347"
    
    const mensaje = `🚨 *ALERTA S.O.S. - MULTIFRENOS* 🚨\n\n*Cliente:* ${cliente.nombre}\n*Vehículo:* ${autoAfectado.marca} ${autoAfectado.modelo} (*${autoAfectado.patente}*)\n\n*Reporte de falla:*\n"${sosData.mensaje}"\n\n_Requiere asistencia en terreno/taller._`
    
    window.open(`https://wa.me/${telefonoTaller}?text=${encodeURIComponent(mensaje)}`, '_blank')
    setShowSosModal(false)
    setSosData({ auto_id: '', mensaje: '' })
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex justify-center items-center"><Loader2 className="w-12 h-12 animate-spin text-brand-primary"/></div>
  if (!cliente) return <div className="min-h-screen bg-slate-900 flex justify-center items-center p-6 text-center text-white font-bold text-xl">Enlace expirado o incorrecto.<br/><span className="text-sm font-normal text-slate-400 mt-2 block">Solicita un nuevo link a tu taller.</span></div>

  return (
    <div className="min-h-screen bg-slate-100 font-sans sm:py-10 flex justify-center relative selection:bg-brand-primary selection:text-white">
      <div className="w-full max-w-lg bg-slate-100 sm:bg-white sm:rounded-[2.5rem] sm:shadow-2xl overflow-hidden flex flex-col relative pb-24 sm:pb-0">
        
        {/* HEADER PREMIUM */}
        <div className="bg-slate-900 text-white p-8 sm:rounded-t-[2.5rem] rounded-b-[2rem] shadow-xl z-10 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-10">
            <Car className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="font-black text-2xl tracking-tight text-white">Multifrenos</h1>
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-1 bg-blue-900/30 w-fit px-2 py-0.5 rounded border border-blue-400/20">Mi Garaje Virtual</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium">Bienvenido/a de vuelta,</p>
            <p className="text-2xl font-black truncate text-white">{cliente.nombre}</p>
          </div>
        </div>

        {/* LISTA DE VEHÍCULOS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 -mt-6 pt-12">
          {autos.length === 0 ? (
            <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mt-4">
              <Car className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
              <p className="text-slate-500 font-medium">No tienes vehículos registrados.</p>
            </div>
          ) : (
            autos.map(auto => {
              const kmActual = auto.kilometraje_actual || 0
              const aceite = calcularEstado(kmActual, auto.prox_cambio_aceite, 10000)
              const frenos = calcularEstado(kmActual, auto.prox_cambio_frenos, 20000)
              const mantencion = calcularEstado(kmActual, auto.prox_mantencion, 50000)
              const revTecnica = calcularDoc(auto.fecha_revision_tecnica, auto.rt_ok)

              return (
                <div key={auto.id} className="bg-white rounded-[2rem] p-5 shadow-lg shadow-slate-200/50 border border-slate-100 relative group transition-all hover:shadow-xl">
                  
                  {/* CABECERA DEL AUTO */}
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                    <div>
                      <span className="bg-slate-900 text-white font-mono font-black px-3 py-1.5 rounded-xl text-xl tracking-[0.15em] shadow-sm">{auto.patente}</span>
                      <p className="text-xs text-slate-500 font-black uppercase mt-2.5 ml-1 tracking-wider">{auto.marca} {auto.modelo}</p>
                    </div>
                    
                    <div className="text-right bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1.5">Odómetro</p>
                      {editingKmId === auto.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input type="number" inputMode="numeric" pattern="[0-9]*" value={tempKm} onChange={e => setTempKm(e.target.value)} className="w-20 bg-white text-slate-900 text-right p-1.5 text-sm font-mono font-black rounded-lg outline-none border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" autoFocus />
                          <button onClick={() => handleSaveKm(auto.id)} disabled={isSavingKm} className="bg-green-500 text-white p-1.5 rounded-lg shadow-sm"><Check className="w-4 h-4"/></button>
                          <button onClick={() => setEditingKmId(null)} className="bg-slate-200 text-slate-600 p-1.5 rounded-lg"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingKmId(auto.id); setTempKm(kmActual || ''); }} className="flex items-center gap-1.5 group/edit hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                          <span className="font-mono font-black text-slate-800 text-lg">{kmActual.toLocaleString('es-CL')}</span>
                          <span className="text-[10px] text-slate-400 font-bold">KM</span>
                          <Edit2 className="w-3.5 h-3.5 text-blue-500 opacity-50 group-hover/edit:opacity-100 transition-opacity" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* BANNER DE ORDEN ACTIVA (SEGUIMIENTO EN VIVO) */}
                  {auto.orden_activa_id && (
                    <div className="mb-5">
                      <button 
                        onClick={() => window.open(`/seguimiento/${auto.orden_activa_id}`, '_blank')}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-2xl flex items-center justify-between px-5 transition-transform active:scale-95 shadow-lg shadow-blue-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2 rounded-full animate-pulse">
                            <Activity className="w-5 h-5"/>
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Vehículo en Taller</p>
                            <p className="font-bold text-sm">Ver estado en vivo</p>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-blue-100"/>
                      </button>
                    </div>
                  )}

                  {/* SECCIÓN DE SALUD */}
                  <div className="space-y-3">
                    
                    {/* ACEITE */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`p-3.5 rounded-2xl shrink-0 shadow-sm ${aceite.faltan === 0 ? 'bg-red-100 text-red-500 animate-pulse border border-red-200' : 'bg-white text-slate-600 border border-slate-200'}`}>
                        <Droplets className="w-6 h-6"/>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-1.5">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">Aceite de Motor</p>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white border shadow-sm ${aceite.colorTexto}`}>{aceite.estado}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-1">
                          <div className={`${aceite.colorBarra} h-full transition-all duration-1000 ease-out`} style={{ width: `${aceite.porcentaje}%` }}></div>
                        </div>
                        {aceite.faltan !== null && aceite.faltan > 0 && (
                          <p className="text-[10px] text-slate-500 font-medium mt-1.5">Próximo cambio en <span className="font-black text-slate-700">{aceite.faltan.toLocaleString('es-CL')} KM</span>.</p>
                        )}
                      </div>
                    </div>

                    {/* FRENOS */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`p-3.5 rounded-2xl shrink-0 shadow-sm ${frenos.faltan === 0 ? 'bg-red-100 text-red-500 animate-pulse border border-red-200' : 'bg-white text-slate-600 border border-slate-200'}`}>
                        <ShieldAlert className="w-6 h-6"/>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-1.5">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">Sistema de Frenos</p>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white border shadow-sm ${frenos.colorTexto}`}>{frenos.estado}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-1">
                          <div className={`${frenos.colorBarra} h-full transition-all duration-1000 ease-out`} style={{ width: `${frenos.porcentaje}%` }}></div>
                        </div>
                        {frenos.faltan !== null && frenos.faltan > 0 && (
                          <p className="text-[10px] text-slate-500 font-medium mt-1.5">Revisión sugerida en <span className="font-black text-slate-700">{frenos.faltan.toLocaleString('es-CL')} KM</span>.</p>
                        )}
                      </div>
                    </div>

                    {/* MANTENCIÓN GENERAL */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`p-3.5 rounded-2xl shrink-0 shadow-sm ${mantencion.faltan === 0 ? 'bg-red-100 text-red-500 animate-pulse border border-red-200' : 'bg-white text-slate-600 border border-slate-200'}`}>
                        <Wrench className="w-6 h-6"/>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-1.5">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">Mantención General</p>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white border shadow-sm ${mantencion.colorTexto}`}>{mantencion.estado}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-1">
                          <div className={`${mantencion.colorBarra} h-full transition-all duration-1000 ease-out`} style={{ width: `${mantencion.porcentaje}%` }}></div>
                        </div>
                        {mantencion.faltan !== null && mantencion.faltan > 0 && (
                          <p className="text-[10px] text-slate-500 font-medium mt-1.5">Próxima mantención en <span className="font-black text-slate-700">{mantencion.faltan.toLocaleString('es-CL')} KM</span>.</p>
                        )}
                      </div>
                    </div>

                    {/* REVISIÓN TÉCNICA */}
                    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mt-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-500">
                          <Calendar className="w-5 h-5"/>
                        </div>
                        <div>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-0.5">Revisión Técnica</span>
                          <span className={`text-[10px] font-bold ${revTecnica.color}`}>{revTecnica.estado}</span>
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${revTecnica.statusColor}`}>
                        <revTecnica.statusIcon className="w-3.5 h-3.5"/> {revTecnica.statusText}
                      </div>
                    </div>

                  </div>

                  <button onClick={() => agendarWhatsApp(auto)} className="mt-6 w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 shadow-xl shadow-slate-900/20 transition-transform active:scale-95">
                    <MessageCircle className="w-5 h-5"/> Agendar Cita
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* BOTÓN FLOTANTE S.O.S (ROJO Y PREMIUM) */}
      <button 
        onClick={() => setShowSosModal(true)} 
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-red-600 hover:bg-red-700 text-white p-4 rounded-2xl shadow-[0_8px_30px_rgba(220,38,38,0.4)] flex items-center justify-center transition-transform hover:scale-110 z-40 group border border-red-500"
      >
        <AlertTriangle className="w-7 h-7" />
        <span className="absolute right-20 bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
          S.O.S / Asistencia
        </span>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-white border-2 border-red-600"></span>
        </span>
      </button>

      {/* MODAL S.O.S WHATSAPP */}
      {showSosModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up sm:animate-bounce-in">
            <div className="bg-red-600 p-5 text-white flex justify-between items-center">
              <h3 className="font-black text-lg flex items-center gap-2 tracking-wide"><AlertTriangle className="w-6 h-6"/> Asistencia de Emergencia</h3>
              <button onClick={() => setShowSosModal(false)} className="hover:bg-red-700 p-1.5 rounded-full transition-colors"><X className="w-6 h-6"/></button>
            </div>
            
            <form onSubmit={enviarSOSWhatsApp} className="p-6 space-y-5">
              <p className="text-sm text-slate-600 font-medium">¿El vehículo presenta una falla? Enviaremos una alerta inmediata al equipo de taller vía WhatsApp.</p>
              
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Vehículo Afectado</label>
                <select required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 font-bold text-slate-800" value={sosData.auto_id} onChange={e => setSosData({...sosData, auto_id: e.target.value})}>
                  <option value="">Selecciona tu vehículo...</option>
                  {autos.map(a => <option key={a.id} value={a.id}>{a.patente} - {a.marca} {a.modelo}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Describe la situación</label>
                <textarea required placeholder="Ej: Se encendió la luz del motor, freno largo, no arranca..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-32 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 resize-none font-medium text-slate-700" value={sosData.mensaje} onChange={e => setSosData({...sosData, mensaje: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg shadow-red-600/30 transition-transform active:scale-95 flex items-center justify-center gap-2 text-lg">
                <MessageCircle className="w-6 h-6"/> Enviar Alerta S.O.S
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}