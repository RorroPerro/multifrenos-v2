import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { Car, ShieldCheck, Loader2, TrendingUp, AlertTriangle, FileCheck, CheckCircle2, Edit2, Check, X, CalendarClock, ShieldAlert, FileText, Battery, CircleDashed, CloudFog, MessageCircle, ExternalLink } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function PortalFlota() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [empresa, setEmpresa] = useState(null)
  const [autos, setAutos] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [chartData, setChartData] = useState([])

  const [editingKmId, setEditingKmId] = useState(null)
  const [tempKm, setTempKm] = useState('')
  const [isSavingKm, setIsSavingKm] = useState(false)

  useEffect(() => {
    if (token) fetchPortalData()
  }, [token])

  async function fetchPortalData() {
    try {
      const { data: clienteData, error: clienteError } = await supabase.from('clientes').select('*').eq('token_flota', token).single()
      if (clienteError || !clienteData) throw new Error('Enlace inválido o expirado')
      setEmpresa(clienteData)

      const { data: autosData } = await supabase.from('autos').select('*').eq('cliente_id', clienteData.id).order('patente')
      
      // TRAEMOS TODAS LAS ÓRDENES (Sin filtrar por estado aún, para buscar las activas)
      const { data: ordenesData } = await supabase.from('ordenes').select('*, orden_autos(auto_id)').eq('cliente_id', clienteData.id).order('created_at', { ascending: false })
      
      const autosConVisita = autosData.map(auto => {
        // Todas las órdenes de este auto específico
        const ordenesDelAuto = ordenesData.filter(o => o.orden_autos.some(rel => rel.auto_id === auto.id))
        const ultimaOrden = ordenesDelAuto.length > 0 ? ordenesDelAuto[0] : null
        
        // Buscar si hay alguna orden que esté en el taller actualmente
        const ordenActiva = ordenesDelAuto.find(o => ['Agendado', 'Recibido', 'En Proceso', 'Finalizado'].includes(o.estado))

        return {
          ...auto,
          ultima_visita: ultimaOrden ? new Date(ultimaOrden.created_at).toLocaleDateString('es-CL') : null,
          orden_activa_id: ordenActiva ? ordenActiva.id : null,
          orden_activa_estado: ordenActiva ? ordenActiva.estado : null
        }
      })

      // Para el gráfico y total invertido, solo usamos las finalizadas/entregadas
      const ordenesHistoricas = ordenesData.filter(o => ['Finalizado', 'Entregado'].includes(o.estado))

      setAutos(autosConVisita || [])
      setOrdenes(ordenesHistoricas || [])
      procesarGrafico(ordenesHistoricas || [])
    } catch (error) {
      console.error(error)
      setEmpresa(null)
    } finally {
      setLoading(false)
    }
  }

  const procesarGrafico = (orders) => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const agrupado = {}
    const hoy = new Date()
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const key = `${meses[d.getMonth()]} ${d.getFullYear()}`
      agrupado[key] = 0
    }

    orders.forEach(o => {
      const d = new Date(o.created_at)
      const key = `${meses[d.getMonth()]} ${d.getFullYear()}`
      if (agrupado[key] !== undefined) agrupado[key] += o.total || 0
    })

    setChartData(Object.keys(agrupado).map(key => ({ mes: key, inversion: agrupado[key] })))
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

  const formatMoney = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)

  const calcularDesgaste = (kmActual, kmProximo, vidaUtil = 10000) => {
    if (!kmActual || !kmProximo) return { desgaste: 0, color: 'bg-slate-200', text: 'text-slate-400', label: 'Sin datos' }
    const kmFaltantes = kmProximo - kmActual
    if (kmFaltantes <= 0) return { desgaste: 100, color: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]', text: 'text-red-600 font-black animate-pulse', label: '¡URGENTE!' }
    let desgaste = ((vidaUtil - Math.min(kmFaltantes, vidaUtil)) / vidaUtil) * 100
    desgaste = Math.max(2, Math.min(desgaste, 100))
    if (kmFaltantes <= 1500) return { desgaste, color: 'bg-orange-500', text: 'text-orange-600 font-bold', label: `(${kmFaltantes} km rest.)` }
    return { desgaste, color: 'bg-green-500', text: 'text-green-600 font-medium', label: `(${kmFaltantes} km rest.)` }
  }

  const calcularDoc = (fechaStr, isOk) => {
    if (!fechaStr) return { estado: 'Sin Registro', color: 'text-slate-500 bg-slate-100 border-slate-200', icon: AlertTriangle, statusIcon: AlertTriangle, statusColor: 'text-slate-400', statusText: 'Sin datos' }
    
    const statusIcon = isOk ? CheckCircle2 : AlertTriangle;
    const statusColor = isOk ? 'text-green-500' : 'text-red-500';
    const statusText = isOk ? 'Pagado' : 'Impago';

    const [year, month, day] = fechaStr.split('-')
    const fechaVence = new Date(year, month - 1, day)
    const hoy = new Date()
    hoy.setHours(0,0,0,0) 
    const diffDays = Math.ceil((fechaVence - hoy) / (1000 * 60 * 60 * 24))

    let timeText = ''; let color = ''; let icon = CheckCircle2;

    if (diffDays < 0) { timeText = `Vencida (${Math.abs(diffDays)}d)`; color = 'text-red-700 bg-red-50 border-red-200'; icon = AlertTriangle; }
    else if (diffDays === 0) { timeText = 'Vence HOY'; color = 'text-red-700 bg-red-50 border-red-200 font-black'; icon = AlertTriangle; }
    else if (diffDays <= 30) { timeText = `Vence en ${diffDays}d`; color = 'text-orange-700 bg-orange-50 border-orange-200 font-bold'; icon = AlertTriangle; }
    else { const meses = Math.floor(diffDays / 30); timeText = `Faltan ~${meses}m`; color = 'text-slate-700 bg-white border-slate-200 font-medium'; }

    return { estado: timeText, color, icon, statusIcon, statusColor, statusText }
  }

  const calcularVidaBateria = (mes, anio) => {
    if (!mes || !anio) return { pct: 0, text: 'S/D', color: 'bg-slate-200', textColor: 'text-slate-500' }
    const fechaInstalacion = new Date(anio, mes - 1, 1)
    const hoy = new Date()
    const mesesUso = (hoy.getFullYear() - fechaInstalacion.getFullYear()) * 12 + (hoy.getMonth() - fechaInstalacion.getMonth())
    
    const VIDA_UTIL_MESES = 24
    if (mesesUso >= VIDA_UTIL_MESES) return { pct: 100, text: '¡Cambiar!', color: 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]', textColor: 'text-red-600' }
    
    let pct = (mesesUso / VIDA_UTIL_MESES) * 100
    pct = Math.max(5, Math.min(pct, 100))
    const mesesRestantes = VIDA_UTIL_MESES - mesesUso
    
    if (mesesRestantes <= 3) return { pct, text: `${mesesRestantes}m rest.`, color: 'bg-orange-500', textColor: 'text-orange-600' }
    return { pct, text: `${mesesRestantes}m rest.`, color: 'bg-green-500', textColor: 'text-green-600' }
  }

  const calcularVidaNeumatico = (dot) => {
    if (!dot || dot.length !== 4) return { pct: 0, color: 'text-slate-200' }
    const semana = parseInt(dot.substring(0, 2))
    const anioStr = dot.substring(2, 4)
    const anio = parseInt("20" + anioStr)
    
    const fechaFabricacion = new Date(anio, 0, 1 + (semana - 1) * 7)
    const hoy = new Date()
    const diasUso = Math.floor((hoy - fechaFabricacion) / (1000 * 60 * 60 * 24))
    
    const VIDA_UTIL_DIAS = 5 * 365 
    if (diasUso >= VIDA_UTIL_DIAS) return { pct: 100, color: 'text-red-500' }
    
    let pct = (diasUso / VIDA_UTIL_DIAS) * 100
    pct = Math.max(5, Math.min(pct, 100))
    if (pct > 85) return { pct, color: 'text-orange-500' }
    return { pct, color: 'text-slate-800' }
  }

  const contactarTaller = () => {
    const telefonoTaller = "56987763347" 
    const mensaje = `Hola Multifrenos! Soy ${empresa.nombre}. Necesito asistencia para mi flota.`
    window.open(`https://wa.me/${telefonoTaller}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const RuedaFreno = ({ label, pct }) => {
    const isCritical = pct !== null && pct < 30;
    const isWarning = pct !== null && pct >= 30 && pct < 50;
    let colorBar = 'bg-green-500';
    let colorText = 'text-green-700 bg-green-100';
    
    if (isCritical) { colorBar = 'bg-red-500'; colorText = 'text-red-700 bg-red-100 animate-pulse'; }
    else if (isWarning) { colorBar = 'bg-orange-400'; colorText = 'text-orange-700 bg-orange-100'; }
    else if (pct === null) { colorBar = 'bg-slate-200'; colorText = 'text-slate-500 bg-slate-100'; }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${colorText}`}>{pct !== null ? `${pct}%` : 'S/D'}</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex border border-slate-200">
          <div className={`${colorBar} h-full transition-all duration-1000 ease-out`} style={{ width: `${pct || 0}%` }}></div>
        </div>
      </div>
    );
  }

  const NeumaticoDot = ({ label, dot }) => {
    const vida = calcularVidaNeumatico(dot)
    return (
      <div className="flex flex-col items-center">
        <span className="text-[8px] text-slate-400 font-bold tracking-widest mb-1">{label}</span>
        <div className="relative w-10 h-10 flex items-center justify-center">
          <CircleDashed className="absolute w-10 h-10 text-slate-200"/>
          {dot && (
            <svg className="absolute w-10 h-10 transform -rotate-90">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="3" fill="none" className={vida.color} strokeDasharray="113" strokeDashoffset={113 - (113 * vida.pct) / 100} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
          )}
          <span className="text-[9px] font-mono font-black text-slate-700 z-10">{dot || '-'}</span>
        </div>
      </div>
    )
  }

  const DocRow = ({ icon: Icon, title, doc }) => (
    <div className={`p-3 rounded-xl border flex justify-between items-center ${doc.color}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 opacity-70"/>
        <div>
          <span className="text-xs font-bold opacity-90 block leading-none mb-1">{title}</span>
          <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
            <doc.icon className="w-3 h-3"/> {doc.estado}
          </span>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-md bg-white border border-slate-200 shadow-sm ${doc.statusColor}`}>
        <doc.statusIcon className="w-3.5 h-3.5"/> {doc.statusText}
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-4"><Loader2 className="w-12 h-12 animate-spin text-blue-600"/><p className="text-slate-500 font-bold">Cargando telemetría de flota...</p></div>
  if (!empresa) return <div className="min-h-screen bg-slate-50 flex justify-center items-center"><div className="bg-white p-10 rounded-2xl shadow-xl text-center"><ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4"/><h1 className="text-2xl font-black text-slate-800">Acceso Denegado</h1><p className="text-slate-500 mt-2">Este enlace corporativo es inválido o ha expirado.</p></div></div>

  const totalInvertido = ordenes.reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-20 relative">
      <div className="bg-slate-900 text-white p-6 md:p-10 shadow-lg border-b-4 border-blue-600">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-blue-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Portal Corporativo Autorizado</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{empresa.nombre}</h1>
            <p className="text-slate-400 mt-2 font-medium">Soporte y Mantenimiento Técnico por <span className="text-white font-bold">Multifrenos</span></p>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 min-w-[120px] backdrop-blur-md">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Unidades</p>
              <p className="text-3xl font-black mt-1">{autos.length}</p>
            </div>
            <div className="bg-blue-900/40 p-5 rounded-2xl border border-blue-800/50 min-w-[180px] backdrop-blur-md">
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest">Inversión (6 Meses)</p>
              <p className="text-3xl font-black text-blue-50 mt-1">{formatMoney(totalInvertido)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-500"/> Comportamiento de Inversión
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}} formatter={(value) => [formatMoney(value), 'Inversión']} />
                <Bar dataKey="inversion" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-6 ml-2">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Car className="w-6 h-6 text-slate-400"/> Telemetría de Unidades
            </h2>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">Actualiza el kilometraje para recalcular alertas.</p>
          </div>
          
          {autos.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border border-slate-200 shadow-sm"><p className="text-slate-500 font-medium">No hay vehículos registrados en la flota.</p></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {autos.map(auto => {
                const kmActual = auto.kilometraje_actual || 0
                const desgasteAceite = calcularDesgaste(kmActual, auto.prox_cambio_aceite, 10000)
                const desgasteMantencion = calcularDesgaste(kmActual, auto.prox_mantencion, 50000)
                
                const docRT = calcularDoc(auto.fecha_revision_tecnica, auto.rt_ok)
                const docGases = calcularDoc(auto.fecha_gases, auto.gases_ok)
                const docSOAP = calcularDoc(auto.fecha_soap, auto.soap_ok)
                const docPermiso = calcularDoc(auto.fecha_permiso, auto.permiso_ok)

                const vidaBat = calcularVidaBateria(auto.bateria_mes, auto.bateria_anio)

                return (
                  <div key={auto.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">
                    <div className="bg-slate-800 p-5 flex justify-between items-start text-white relative overflow-hidden">
                      <Car className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-700 opacity-30 rotate-12 pointer-events-none"/>
                      
                      <div className="relative z-10 w-full">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="bg-white text-slate-900 font-mono font-black px-3 py-1 rounded-lg text-lg tracking-widest shadow-sm block w-fit mb-2">{auto.patente}</span>
                            <p className="text-sm text-slate-300 font-bold">{auto.marca} {auto.modelo}</p>
                            <p className="text-[10px] text-blue-300 font-medium mt-1 flex items-center gap-1">
                              <CalendarClock className="w-3 h-3"/> Visita: {auto.ultima_visita || 'Sin historial'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Odómetro</p>
                            {editingKmId === auto.id ? (
                              <div className="flex items-center justify-end gap-1 bg-slate-700 p-1 rounded-lg">
                                <input type="number" value={tempKm} onChange={e => setTempKm(e.target.value)} className="w-20 bg-slate-900 text-white text-right p-1.5 text-sm font-mono font-bold rounded outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                                <button onClick={() => handleSaveKm(auto.id)} disabled={isSavingKm} className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded transition-colors disabled:opacity-50"><Check className="w-4 h-4"/></button>
                                <button onClick={() => setEditingKmId(null)} className="bg-slate-600 hover:bg-red-500 text-white p-1.5 rounded transition-colors"><X className="w-4 h-4"/></button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingKmId(auto.id); setTempKm(kmActual || ''); }} className="flex items-center gap-2 group/edit bg-slate-700/50 hover:bg-blue-600 transition-colors px-3 py-1.5 rounded-lg border border-slate-600 hover:border-blue-500" title="Actualizar kilometraje">
                                <span className="font-mono font-bold text-lg text-white">{kmActual.toLocaleString('es-CL')} <span className="text-xs text-slate-400 group-hover/edit:text-blue-200">KM</span></span>
                                <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover/edit:text-white" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* DATOS ADMINISTRATIVOS Y BOTÓN DE TRACKING */}
                        <div className="mt-4 pt-3 border-t border-slate-700/50">
                          {auto.orden_activa_id ? (
                            <button 
                              onClick={() => window.open(`/seguimiento/${auto.orden_activa_id}`, '_blank')}
                              className="w-full bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-black uppercase tracking-widest py-2 rounded-lg flex items-center justify-center gap-2 transition-colors animate-pulse shadow-lg shadow-blue-500/30"
                            >
                              <Loader2 className="w-3.5 h-3.5 animate-spin"/> Ver Seguimiento en Taller
                            </button>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/50 rounded-lg text-[10px] text-slate-300">
                              {auto.vin && <div><span className="font-bold text-slate-500">VIN:</span> {auto.vin.substring(auto.vin.length - 6)}</div>}
                              {auto.numero_motor && <div><span className="font-bold text-slate-500">Motor:</span> {auto.numero_motor}</div>}
                              {auto.ceco && <div><span className="font-bold text-slate-500">CECO:</span> {auto.ceco}</div>}
                              {auto.tasacion && <div><span className="font-bold text-slate-500">Tasación:</span> {formatMoney(auto.tasacion)}</div>}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6 flex-1 flex flex-col">
                      
                      {/* SERVICIOS PREVENTIVOS */}
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3">Servicios Preventivos</h4>
                        <div className="space-y-3">
                          <div className="group/bar relative">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-bold text-slate-700 flex items-center gap-1.5"><span className="text-base">🛢️</span> Cambio Aceite</span>
                              <span className={desgasteAceite.text}>{desgasteAceite.label}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200/50">
                              <div className={`${desgasteAceite.color} h-full transition-all duration-1000 ease-out relative`} style={{ width: `${desgasteAceite.desgaste}%` }}>
                                <div className="absolute inset-0 bg-white/20 w-full h-1/2"></div>
                              </div>
                            </div>
                          </div>
                          <div className="group/bar relative">
                            <div className="flex justify-between text-xs mb-1.5">
                              <span className="font-bold text-slate-700 flex items-center gap-1.5"><span className="text-base">⚙️</span> Mantención General</span>
                              <span className={desgasteMantencion.text}>{desgasteMantencion.label}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200/50">
                              <div className={`${desgasteMantencion.color} h-full transition-all duration-1000 ease-out relative`} style={{ width: `${desgasteMantencion.desgaste}%` }}>
                                <div className="absolute inset-0 bg-white/20 w-full h-1/2"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* FRENOS X 4 */}
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3">Salud de Frenos</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          <RuedaFreno label="Del. Izq" pct={auto.frenos_di_pct} />
                          <RuedaFreno label="Del. Der" pct={auto.frenos_dd_pct} />
                          <RuedaFreno label="Tras. Izq" pct={auto.frenos_ti_pct} />
                          <RuedaFreno label="Tras. Der" pct={auto.frenos_td_pct} />
                        </div>
                      </div>

                      {/* NEUMÁTICOS Y BATERÍA */}
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-3">Componentes de Desgaste (Años)</h4>
                        <div className="grid grid-cols-5 gap-3">
                          <div className="col-span-3 bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                            <NeumaticoDot label="D.I." dot={auto.dot_di} />
                            <NeumaticoDot label="D.D." dot={auto.dot_dd} />
                            <NeumaticoDot label="T.I." dot={auto.dot_ti} />
                            <NeumaticoDot label="T.D." dot={auto.dot_td} />
                          </div>
                          <div className="col-span-2 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center items-center">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Batería</span>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-1">
                              <div className={`${vidaBat.color} h-full`} style={{ width: `${vidaBat.pct}%` }}></div>
                            </div>
                            <span className={`text-[10px] font-black uppercase ${vidaBat.textColor}`}>{vidaBat.text}</span>
                          </div>
                        </div>
                      </div>

                      {/* DOCUMENTACIÓN LEGAL */}
                      <div className="mt-auto grid grid-cols-1 gap-2 pt-4 border-t border-slate-100">
                        <DocRow icon={FileCheck} title="Revisión Técnica" doc={docRT} />
                        <DocRow icon={CloudFog} title="Revisión de Gases" doc={docGases} />
                        <DocRow icon={ShieldCheck} title="Seguro (SOAP)" doc={docSOAP} />
                        <DocRow icon={FileText} title="Permiso de Circ." doc={docPermiso} />
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* BOTÓN FLOTANTE S.O.S DE WHATSAPP */}
      <button 
        onClick={contactarTaller} 
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50 group"
        title="Contactar al taller por WhatsApp"
      >
        <MessageCircle className="w-8 h-8" />
        <span className="absolute right-16 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Contactar Taller
        </span>
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      </button>

    </div>
  )
}