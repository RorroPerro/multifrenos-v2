import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabase/client'
// IMPORTACIÓN CORREGIDA: Se agregaron Droplets y Wrench
import { Car, ShieldCheck, Loader2, TrendingUp, AlertTriangle, FileCheck, CheckCircle2, Edit2, Check, X, CalendarClock, ShieldAlert, FileText, Battery, CircleDashed, CloudFog, MessageCircle, ExternalLink, Activity, ArrowRight, Droplets, Wrench } from 'lucide-react'
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
      
      const { data: ordenesData } = await supabase.from('ordenes').select('*, orden_autos(auto_id)').eq('cliente_id', clienteData.id).order('created_at', { ascending: false })
      
      const autosConVisita = autosData.map(auto => {
        const ordenesDelAuto = ordenesData.filter(o => o.orden_autos.some(rel => rel.auto_id === auto.id))
        const ultimaOrden = ordenesDelAuto.length > 0 ? ordenesDelAuto[0] : null
        const ordenActiva = ordenesDelAuto.find(o => ['Agendado', 'Recibido', 'En Proceso', 'Finalizado'].includes(o.estado))

        return {
          ...auto,
          ultima_visita: ultimaOrden ? new Date(ultimaOrden.created_at).toLocaleDateString('es-CL') : null,
          orden_activa_id: ordenActiva ? ordenActiva.id : null,
          orden_activa_estado: ordenActiva ? ordenActiva.estado : null
        }
      })

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
    const statusColor = isOk ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200';
    const statusText = isOk ? 'Pagado' : 'Impago';

    const [year, month, day] = fechaStr.split('-')
    const fechaVence = new Date(year, month - 1, day)
    const hoy = new Date()
    hoy.setHours(0,0,0,0) 
    const diffDays = Math.ceil((fechaVence - hoy) / (1000 * 60 * 60 * 24))

    let timeText = ''; let color = ''; let icon = CheckCircle2;

    if (diffDays < 0) { timeText = `Vencida (${Math.abs(diffDays)}d)`; color = 'text-red-700 bg-red-100 border-red-200'; icon = AlertTriangle; }
    else if (diffDays === 0) { timeText = 'Vence HOY'; color = 'text-red-700 bg-red-100 border-red-200 font-black'; icon = AlertTriangle; }
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
    const mensaje = `Hola Multifrenos! Soy ${empresa.nombre}. Necesito asistencia corporativa para mi flota.`
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
    <div className={`p-3.5 rounded-xl border flex justify-between items-center ${doc.color} shadow-sm`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 opacity-70"/>
        <div>
          <span className="text-xs font-bold opacity-90 block leading-none mb-1.5">{title}</span>
          <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
            <doc.icon className="w-3 h-3"/> {doc.estado}
          </span>
        </div>
      </div>
      <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm ${doc.statusColor}`}>
        <doc.statusIcon className="w-3.5 h-3.5"/> {doc.statusText}
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-4"><Loader2 className="w-12 h-12 animate-spin text-blue-600"/><p className="text-slate-500 font-bold">Cargando telemetría de flota...</p></div>
  if (!empresa) return <div className="min-h-screen bg-slate-50 flex justify-center items-center p-4"><div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-red-100"><ShieldCheck className="w-16 h-16 text-red-500 mx-auto mb-4"/><h1 className="text-2xl font-black text-slate-800">Acceso Denegado</h1><p className="text-slate-500 mt-2">Este enlace corporativo es inválido o ha expirado. Contacte a su ejecutivo de cuenta.</p></div></div>

  const totalInvertido = ordenes.reduce((sum, o) => sum + o.total, 0)

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 relative selection:bg-blue-600 selection:text-white">
      
      {/* HEADER CORPORATIVO */}
      <div className="bg-slate-900 text-white p-8 md:p-12 shadow-2xl border-b-4 border-blue-600 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
          <Activity className="w-96 h-96 -mt-20 -mr-20" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-500/30 px-3 py-1.5 rounded-lg mb-4">
              <ShieldCheck className="w-4 h-4 text-blue-400"/>
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest">Portal Corporativo Activo</p>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none mb-2">{empresa.nombre}</h1>
            <p className="text-slate-400 font-medium">Soporte y Mantenimiento Técnico gestionado por <span className="text-white font-bold">Multifrenos</span></p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 min-w-[120px] shadow-inner flex-1 md:flex-none">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Unidades</p>
              <p className="text-3xl font-black text-white">{autos.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-5 rounded-2xl border border-blue-700/50 min-w-[180px] shadow-inner flex-1 md:flex-none">
              <p className="text-blue-300 text-[10px] font-black uppercase tracking-widest mb-1">Inversión (6 Meses)</p>
              <p className="text-3xl font-black text-blue-50">{formatMoney(totalInvertido)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 -mt-6 relative z-20">
        
        {/* GRÁFICO DE INVERSIÓN */}
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <TrendingUp className="w-5 h-5 text-blue-600"/> Comportamiento de Inversión
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold'}} formatter={(value) => [formatMoney(value), 'Inversión']} />
                <Bar dataKey="inversion" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-6 ml-2">
            <div>
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Car className="w-6 h-6 text-blue-600"/> Telemetría de Flota
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Actualice el odómetro para recalcular las alertas de desgaste en tiempo real.</p>
            </div>
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
                  <div key={auto.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col">
                    
                    {/* CABECERA DEL VEHÍCULO (ESTILO TARJETA DE CRÉDITO/ASSET) */}
                    <div className="bg-slate-900 p-6 flex flex-col justify-between relative overflow-hidden h-36">
                      <Car className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-800 opacity-50 rotate-12 pointer-events-none"/>
                      
                      <div className="relative z-10 flex justify-between items-start">
                        <span className="bg-white text-slate-900 font-mono font-black px-4 py-1.5 rounded-xl text-xl tracking-[0.2em] shadow-lg">{auto.patente}</span>
                        <p className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 flex items-center gap-1">
                          <CalendarClock className="w-3 h-3"/> Visita: {auto.ultima_visita || 'Sin historial'}
                        </p>
                      </div>
                      
                      <div className="relative z-10 mt-auto flex justify-between items-end">
                        <p className="text-lg text-white font-bold leading-tight">{auto.marca} <span className="text-blue-400">{auto.modelo}</span></p>
                      </div>
                    </div>

                    {/* BANNER SEGUIMIENTO TALLER */}
                    {auto.orden_activa_id && (
                      <button 
                        onClick={() => window.open(`/seguimiento/${auto.orden_activa_id}`, '_blank')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-5 flex items-center justify-between transition-colors shadow-inner"
                      >
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-200"/>
                          <span className="text-xs font-black uppercase tracking-widest">Vehículo en Taller</span>
                        </div>
                        <span className="text-xs font-bold text-blue-200 flex items-center gap-1">Ver Reporte <ArrowRight className="w-3 h-3"/></span>
                      </button>
                    )}
                    
                    <div className="p-6 space-y-6 flex-1 flex flex-col">
                      
                      {/* INPUT ODOMETRO GIGANTE */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Odómetro Actual</span>
                        {editingKmId === auto.id ? (
                          <div className="flex items-center gap-1">
                            <input type="number" inputMode="numeric" pattern="[0-9]*" value={tempKm} onChange={e => setTempKm(e.target.value)} className="w-24 bg-white text-slate-900 text-right p-2 text-sm font-mono font-black rounded-lg outline-none border-2 border-blue-500 shadow-sm" autoFocus />
                            <button onClick={() => handleSaveKm(auto.id)} disabled={isSavingKm} className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors"><Check className="w-4 h-4"/></button>
                            <button onClick={() => setEditingKmId(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-2 rounded-lg transition-colors"><X className="w-4 h-4"/></button>
                          </div>
                        ) : (
                          <button onClick={() => { setEditingKmId(auto.id); setTempKm(kmActual || ''); }} className="flex items-center gap-2 group/edit hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-transparent hover:border-blue-200 transition-colors">
                            <span className="font-mono font-black text-2xl text-slate-800 tracking-tight">{kmActual.toLocaleString('es-CL')} <span className="text-sm text-slate-400 group-hover/edit:text-blue-400">KM</span></span>
                            <Edit2 className="w-4 h-4 text-blue-500 opacity-30 group-hover/edit:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </div>

                      {/* SERVICIOS PREVENTIVOS */}
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Salud Mecánica</h4>
                        <div className="space-y-4">
                          <div className="group/bar relative bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                            <div className="flex justify-between text-xs mb-2">
                              <span className="font-bold text-slate-700 flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-slate-400"/> Cambio Aceite</span>
                              <span className={desgasteAceite.text}>{desgasteAceite.label}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200/50">
                              <div className={`${desgasteAceite.color} h-full transition-all duration-1000 ease-out`} style={{ width: `${desgasteAceite.desgaste}%` }}></div>
                            </div>
                          </div>
                          <div className="group/bar relative bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                            <div className="flex justify-between text-xs mb-2">
                              <span className="font-bold text-slate-700 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-slate-400"/> Mantención General</span>
                              <span className={desgasteMantencion.text}>{desgasteMantencion.label}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex border border-slate-200/50">
                              <div className={`${desgasteMantencion.color} h-full transition-all duration-1000 ease-out`} style={{ width: `${desgasteMantencion.desgaste}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* FRENOS X 4 */}
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Desgaste de Frenos</h4>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <RuedaFreno label="Del. Izq" pct={auto.frenos_di_pct} />
                          <RuedaFreno label="Del. Der" pct={auto.frenos_dd_pct} />
                          <RuedaFreno label="Tras. Izq" pct={auto.frenos_ti_pct} />
                          <RuedaFreno label="Tras. Der" pct={auto.frenos_td_pct} />
                        </div>
                      </div>

                      {/* NEUMÁTICOS Y BATERÍA */}
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Vida Útil (Años)</h4>
                        <div className="grid grid-cols-5 gap-3">
                          <div className="col-span-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                            <NeumaticoDot label="D.I." dot={auto.dot_di} />
                            <NeumaticoDot label="D.D." dot={auto.dot_dd} />
                            <NeumaticoDot label="T.I." dot={auto.dot_ti} />
                            <NeumaticoDot label="T.D." dot={auto.dot_td} />
                          </div>
                          <div className="col-span-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center items-center">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1"><Battery className="w-3 h-3"/> Batería</span>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1.5 border border-slate-200/50">
                              <div className={`${vidaBat.color} h-full`} style={{ width: `${vidaBat.pct}%` }}></div>
                            </div>
                            <span className={`text-[10px] font-black uppercase ${vidaBat.textColor}`}>{vidaBat.text}</span>
                          </div>
                        </div>
                      </div>

                      {/* DOCUMENTACIÓN LEGAL */}
                      <div className="mt-auto pt-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Documentación Legal</h4>
                        <div className="grid grid-cols-1 gap-2.5">
                          <DocRow icon={FileCheck} title="Revisión Técnica" doc={docRT} />
                          <DocRow icon={CloudFog} title="Revisión de Gases" doc={docGases} />
                          <DocRow icon={ShieldCheck} title="Seguro (SOAP)" doc={docSOAP} />
                          <DocRow icon={FileText} title="Permiso de Circ." doc={docPermiso} />
                        </div>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* BOTÓN FLOTANTE S.O.S DE WHATSAPP CORPORATIVO */}
      <button 
        onClick={contactarTaller} 
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-50 group border-2 border-slate-700"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute right-16 bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-slate-700">
          Asistencia Ejecutiva
        </span>
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border-2 border-slate-900"></span>
        </span>
      </button>

    </div>
  )
}