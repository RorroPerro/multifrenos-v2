import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { Car, Loader2, Calendar, Droplets, Wrench, Edit2, Check, X, MessageCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

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

  if (loading) return <div className="min-h-screen bg-slate-900 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-white"/></div>
  if (!cliente) return <div className="min-h-screen bg-slate-900 flex justify-center items-center text-white font-bold">Enlace expirado o incorrecto.</div>

  return (
    <div className="min-h-screen bg-slate-100 font-sans sm:py-8 flex justify-center relative">
      <div className="w-full max-w-md bg-white sm:rounded-3xl sm:shadow-2xl overflow-hidden flex flex-col relative">
        
        <div className="bg-slate-900 text-white p-6 rounded-b-3xl shadow-md z-10 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="font-black text-2xl tracking-tight">Multifrenos</h1>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Mi Garaje Virtual</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm">Hola,</p>
          <p className="text-xl font-bold truncate">{cliente.nombre}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 -mt-4 pt-10 bg-slate-100 pb-24">
          {autos.length === 0 ? (
            <p className="text-center text-slate-500 mt-10">No tienes vehículos registrados.</p>
          ) : (
            autos.map(auto => {
              const kmActual = auto.kilometraje_actual || 0
              const aceite = calcularEstado(kmActual, auto.prox_cambio_aceite, 10000)
              const frenos = calcularEstado(kmActual, auto.prox_cambio_frenos, 20000)
              const mantencion = calcularEstado(kmActual, auto.prox_mantencion, 50000)
              const revTecnica = calcularDoc(auto.fecha_revision_tecnica, auto.rt_ok)

              return (
                <div key={auto.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 relative">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="bg-slate-100 text-slate-800 font-mono font-black px-3 py-1 rounded-lg text-lg tracking-widest border border-slate-200">{auto.patente}</span>
                      <p className="text-xs text-slate-500 font-bold uppercase mt-2 ml-1">{auto.marca} {auto.modelo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Kilometraje</p>
                      {editingKmId === auto.id ? (
                        <div className="flex items-center justify-end gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                          <input type="number" value={tempKm} onChange={e => setTempKm(e.target.value)} className="w-20 bg-white text-slate-800 text-right p-1 text-sm font-mono font-bold rounded outline-none border border-slate-200" autoFocus />
                          <button onClick={() => handleSaveKm(auto.id)} disabled={isSavingKm} className="bg-green-500 text-white p-1 rounded"><Check className="w-4 h-4"/></button>
                          <button onClick={() => setEditingKmId(null)} className="bg-slate-300 text-slate-600 p-1 rounded"><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingKmId(auto.id); setTempKm(kmActual || ''); }} className="flex items-center gap-1.5 group bg-slate-50 hover:bg-blue-50 px-2 py-1 rounded-lg border border-slate-200 transition-colors">
                          <span className="font-mono font-black text-slate-700">{kmActual.toLocaleString('es-CL')}</span>
                          <Edit2 className="w-3 h-3 text-blue-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* NUEVO: BOTÓN DE TRACKING DINÁMICO */}
                  {auto.orden_activa_id && (
                    <div className="mb-4">
                      <button 
                        onClick={() => window.open(`/seguimiento/${auto.orden_activa_id}`, '_blank')}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-colors animate-pulse shadow-lg shadow-blue-500/30"
                      >
                        <Loader2 className="w-4 h-4 animate-spin"/> Ver Seguimiento en Taller
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    
                    {/* ACEITE */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                      <div className={`p-3 rounded-full shrink-0 ${aceite.faltan === 0 ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-white text-slate-700 shadow-sm border border-slate-200'}`}>
                        <Droplets className="w-6 h-6"/>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-xs font-black uppercase text-slate-700">Cambio de Aceite</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border ${aceite.colorTexto}`}>{aceite.estado}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1">
                          <div className={`${aceite.colorBarra} h-full transition-all duration-1000`} style={{ width: `${aceite.porcentaje}%` }}></div>
                        </div>
                        {aceite.faltan !== null && aceite.faltan > 0 && (
                          <p className="text-[11px] text-slate-500 font-medium">Te quedan <span className="font-bold text-slate-700">{aceite.faltan.toLocaleString('es-CL')} KM</span> de viaje.</p>
                        )}
                      </div>
                    </div>

                    {/* FRENOS */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                      <div className={`p-3 rounded-full shrink-0 ${frenos.faltan === 0 ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-white text-slate-700 shadow-sm border border-slate-200'}`}>
                        <ShieldAlert className="w-6 h-6"/>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-xs font-black uppercase text-slate-700">Mantención Frenos</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border ${frenos.colorTexto}`}>{frenos.estado}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1">
                          <div className={`${frenos.colorBarra} h-full transition-all duration-1000`} style={{ width: `${frenos.porcentaje}%` }}></div>
                        </div>
                        {frenos.faltan !== null && frenos.faltan > 0 && (
                          <p className="text-[11px] text-slate-500 font-medium">Revisión en <span className="font-bold text-slate-700">{frenos.faltan.toLocaleString('es-CL')} KM</span>.</p>
                        )}
                      </div>
                    </div>

                    {/* MANTENCIÓN GENERAL */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                      <div className={`p-3 rounded-full shrink-0 ${mantencion.faltan === 0 ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-white text-slate-700 shadow-sm border border-slate-200'}`}>
                        <Wrench className="w-6 h-6"/>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-1">
                          <p className="text-xs font-black uppercase text-slate-700">Mantención General</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border ${mantencion.colorTexto}`}>{mantencion.estado}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1">
                          <div className={`${mantencion.colorBarra} h-full transition-all duration-1000`} style={{ width: `${mantencion.porcentaje}%` }}></div>
                        </div>
                        {mantencion.faltan !== null && mantencion.faltan > 0 && (
                          <p className="text-[11px] text-slate-500 font-medium">Próxima en <span className="font-bold text-slate-700">{mantencion.faltan.toLocaleString('es-CL')} KM</span>.</p>
                        )}
                      </div>
                    </div>

                    {/* REVISIÓN TÉCNICA (CON STATUS DE PAGO) */}
                    <div className="flex flex-col gap-2 p-3 bg-white border border-slate-200 rounded-xl">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-slate-400"/>
                          <span className="text-xs font-bold text-slate-600">Revisión Técnica</span>
                        </div>
                        <span className={`text-[11px] ${revTecnica.color}`}>{revTecnica.estado}</span>
                      </div>
                      
                      <div className="flex justify-end border-t border-slate-50 pt-2 mt-1">
                        <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${revTecnica.statusColor}`}>
                          <revTecnica.statusIcon className="w-3 h-3"/> {revTecnica.statusText}
                        </span>
                      </div>
                    </div>

                  </div>

                  <button onClick={() => agendarWhatsApp(auto)} className="mt-5 w-full bg-green-500 hover:bg-green-600 text-white py-3.5 rounded-xl font-black text-sm flex justify-center items-center gap-2 shadow-lg shadow-green-500/30 transition-transform active:scale-95">
                    <MessageCircle className="w-5 h-5"/> Agendar Mantención
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* BOTÓN FLOTANTE S.O.S (ROJO) */}
      <button 
        onClick={() => setShowSosModal(true)} 
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-red-600 hover:bg-red-700 text-white p-4 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center justify-center transition-transform hover:scale-110 z-40 group"
      >
        <AlertTriangle className="w-7 h-7" />
        <span className="absolute right-16 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Reportar Falla / S.O.S
        </span>
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
      </button>

      {/* MODAL S.O.S WHATSAPP */}
      {showSosModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-in">
            <div className="bg-red-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-black text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Asistencia en Terreno</h3>
              <button onClick={() => setShowSosModal(false)} className="hover:bg-red-700 p-1 rounded-full transition-colors"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={enviarSOSWhatsApp} className="p-6 space-y-4">
              <p className="text-sm text-slate-600 mb-4">¿Tienes una emergencia o detectaste una falla? Enviaremos un reporte inmediato al taller vía WhatsApp.</p>
              
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">¿Qué vehículo presenta el problema?</label>
                <select required className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-red-500 font-bold text-slate-800" value={sosData.auto_id} onChange={e => setSosData({...sosData, auto_id: e.target.value})}>
                  <option value="">Selecciona tu vehículo...</option>
                  {autos.map(a => <option key={a.id} value={a.id}>{a.patente} - {a.marca} {a.modelo}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Describe la falla o emergencia</label>
                <textarea required placeholder="Ej: Se prendió la luz del motor, perdí frenos, etc." className="w-full p-3 border border-slate-300 rounded-lg text-sm h-24 outline-none focus:border-red-500" value={sosData.mensaje} onChange={e => setSosData({...sosData, mensaje: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl shadow-lg transition-transform active:scale-95 mt-2 flex items-center justify-center gap-2">
                <MessageCircle className="w-5 h-5"/> Enviar S.O.S por WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}