import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client' 
import { X, Save, Settings2, AlertTriangle, Calendar, Activity, CheckCircle2, ShieldAlert, Loader2, FileCheck, CloudFog, ShieldCheck, Wand2, Car } from 'lucide-react'

export default function ProyeccionesFlota({ carId, patente, currentKm, currentRT, onClose }) {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basico') 
  const [carInfo, setCarInfo] = useState({ marca: '', modelo: '' }) // NUEVO: Para el contexto visual

  const kmActual = Number(currentKm) || 0

  const [salud, setSalud] = useState({
    prox_cambio_aceite: 0,
    prox_cambio_frenos: 0,
    prox_mantencion: 0,
    fecha_revision_tecnica: currentRT || '',
    fecha_gases: '',
    fecha_soap: '',
    fecha_permiso: '',
    rt_ok: false,
    gases_ok: false,
    soap_ok: false,
    permiso_ok: false,
    frenos_di_pct: 100, frenos_dd_pct: 100, 
    frenos_ti_pct: 100, frenos_td_pct: 100,
    bateria_mes: '', bateria_anio: '',
    dot_di: '', dot_dd: '', dot_ti: '', dot_td: ''
  })

  useEffect(() => {
    async function fetchSaludAuto() {
      const { data, error } = await supabase.from('autos').select('*').eq('id', carId).single()
      if (data && !error) {
        setCarInfo({ marca: data.marca, modelo: data.modelo }) // Guardamos el nombre del auto
        setSalud(prev => ({
          ...prev,
          prox_cambio_aceite: data.prox_cambio_aceite || (kmActual + 10000),
          prox_cambio_frenos: data.prox_cambio_frenos || (kmActual + 20000),
          prox_mantencion: data.prox_mantencion || (kmActual + 50000),
          fecha_revision_tecnica: data.fecha_revision_tecnica || prev.fecha_revision_tecnica,
          fecha_gases: data.fecha_gases || '',
          fecha_soap: data.fecha_soap || '',
          fecha_permiso: data.fecha_permiso || '',
          rt_ok: data.rt_ok || false,
          gases_ok: data.gases_ok || false,
          soap_ok: data.soap_ok || false,
          permiso_ok: data.permiso_ok || false,
          frenos_di_pct: data.frenos_di_pct !== null ? data.frenos_di_pct : 100,
          frenos_dd_pct: data.frenos_dd_pct !== null ? data.frenos_dd_pct : 100,
          frenos_ti_pct: data.frenos_ti_pct !== null ? data.frenos_ti_pct : 100,
          frenos_td_pct: data.frenos_td_pct !== null ? data.frenos_td_pct : 100,
          bateria_mes: data.bateria_mes || '',
          bateria_anio: data.bateria_anio || '',
          dot_di: data.dot_di || '', dot_dd: data.dot_dd || '', 
          dot_ti: data.dot_ti || '', dot_td: data.dot_td || ''
        }))
      }
      setLoading(false)
    }
    fetchSaludAuto()
  }, [carId, kmActual])

  async function handleSave() {
    setIsSaving(true)
    const datosLimpios = { ...salud }
    if (!datosLimpios.fecha_revision_tecnica) datosLimpios.fecha_revision_tecnica = null
    if (!datosLimpios.fecha_gases) datosLimpios.fecha_gases = null
    if (!datosLimpios.fecha_soap) datosLimpios.fecha_soap = null
    if (!datosLimpios.fecha_permiso) datosLimpios.fecha_permiso = null

    const { error } = await supabase.from('autos').update(datosLimpios).eq('id', carId)

    setIsSaving(false)
    if (error) alert('Error al guardar: ' + error.message)
    else {
      onClose()
    }
  }

  // --- MOTOR DE CÁLCULO DE REVISIÓN TÉCNICA (CHILE) ---
  const calcularVencimientoRT = () => {
    if (!patente || patente.length < 5) return alert('No hay una patente válida para calcular.')
    const ultimoChar = patente.slice(-1)
    if (isNaN(ultimoChar)) return alert('La patente debe terminar en un número para calcular el mes (autos particulares).')

    const digito = parseInt(ultimoChar)
    const mapaMeses = { 0: 2, 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 1 }
    const mesRT = mapaMeses[digito]
    const hoy = new Date()
    let anioRT = hoy.getFullYear()

    if (mesRT < (hoy.getMonth() + 1)) anioRT += 1

    const ultimoDia = new Date(anioRT, mesRT, 0).getDate()
    const mesStr = mesRT.toString().padStart(2, '0')
    const diaStr = ultimoDia.toString().padStart(2, '0')
    const fechaCalculada = `${anioRT}-${mesStr}-${diaStr}`

    setSalud(prev => ({...prev, fecha_revision_tecnica: fechaCalculada}))
  }

  const sumarAceite = (km) => setSalud(prev => ({ ...prev, prox_cambio_aceite: kmActual + km }))
  const sumarFrenos = (km) => setSalud(prev => ({ ...prev, prox_cambio_frenos: kmActual + km }))
  const sumarMantencion = (km) => setSalud(prev => ({ ...prev, prox_mantencion: kmActual + km }))

  if (loading) return <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm"><Loader2 className="w-10 h-10 animate-spin text-white"/></div>

  const DocRowForm = ({ title, dateField, okField, icon: Icon }) => (
    <div className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-colors ${salud[okField] ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <Icon className={`w-5 h-5 shrink-0 ${salud[okField] ? 'text-slate-400' : 'text-red-500'}`}/>
        <div className="flex-1">
          <span className={`text-xs font-black uppercase tracking-wider block ${salud[okField] ? 'text-slate-700' : 'text-red-700'}`}>{title}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-slate-500">Vence:</span>
            <input type="date" className="p-1.5 bg-white border border-slate-200 rounded-md text-xs outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto" value={salud[dateField] || ''} onChange={e => setSalud({...salud, [dateField]: e.target.value})} />
          </div>
        </div>
      </div>
      <button 
        onClick={() => setSalud({...salud, [okField]: !salud[okField]})} 
        className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-transform active:scale-95 flex items-center justify-center gap-1.5 ${salud[okField] ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-500 text-white shadow-md hover:bg-red-600'}`}
      >
        {salud[okField] ? <><CheckCircle2 className="w-4 h-4"/> Al Día</> : <><AlertTriangle className="w-4 h-4"/> Pendiente</>}
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] animate-bounce-in">
        
        {/* HEADER GIGANTE Y CLARO */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-start shrink-0 border-b-4 border-indigo-500">
          <div>
            <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mb-1">
              <Activity className="w-3 h-3"/> Monitor de Signos Vitales
            </p>
            <h3 className="font-black text-2xl uppercase tracking-tight leading-none text-white">
              {carInfo.marca || 'Vehículo'} {carInfo.modelo}
            </h3>
            <div className="mt-2 inline-flex items-center gap-2 bg-white/10 px-2 py-1 rounded-lg border border-white/20">
              <Car className="w-4 h-4 text-indigo-200"/>
              <span className="font-mono font-bold text-lg tracking-widest text-indigo-100">{patente}</span>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-red-500 hover:text-white text-slate-400 p-2 rounded-full transition-colors"><X className="w-6 h-6"/></button>
        </div>

        {/* PESTAÑAS MEJORADAS */}
        <div className="flex bg-slate-100 shrink-0">
          <button onClick={() => setActiveTab('basico')} className={`flex-1 py-4 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'basico' ? 'bg-white text-indigo-700 shadow-[0_-4px_0_inset_#4f46e5]' : 'text-slate-500 hover:bg-slate-200'}`}>
            <CheckCircle2 className="w-4 h-4"/> Preventivo
          </button>
          <button onClick={() => setActiveTab('avanzado')} className={`flex-1 py-4 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${activeTab === 'avanzado' ? 'bg-white text-indigo-700 shadow-[0_-4px_0_inset_#4f46e5]' : 'text-slate-500 hover:bg-slate-200'}`}>
            <ShieldAlert className="w-4 h-4"/> Desgaste Físico
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
          
          {kmActual === 0 && (
            <div className="bg-orange-100 text-orange-800 p-3 rounded-xl border border-orange-300 flex gap-3 text-xs font-bold items-center shadow-sm">
              <AlertTriangle className="w-6 h-6 shrink-0 text-orange-600"/>
              <p>El odómetro de esta orden está en 0. Asegúrate de guardar el KM en la ficha principal para que las proyecciones sean exactas.</p>
            </div>
          )}

          {/* === PESTAÑA 1: BÁSICO === */}
          {activeTab === 'basico' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-sm">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Base de Cálculo: KM Actual</span>
                <p className="text-3xl font-black text-slate-800 font-mono mt-1">{kmActual.toLocaleString('es-CL')} <span className="text-lg text-slate-400">KM</span></p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                {/* ACEITE */}
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase mb-2 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1">
                    <span className="flex items-center gap-1.5"><span className="text-base">🛢️</span> Próximo Aceite</span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-1 rounded font-bold border border-indigo-100">Alarma a los: {salud.prox_cambio_aceite.toLocaleString('es-CL')} KM</span>
                  </label>
                  <div className="flex gap-2">
                    {[5000, 10000, 15000].map(km => (
                      <button key={km} onClick={() => sumarAceite(km)} type="button" className={`flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all ${salud.prox_cambio_aceite === (kmActual + km) ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>+{km/1000}k</button>
                    ))}
                    <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-24 text-center border-2 border-slate-200 rounded-xl text-sm font-black outline-none focus:border-indigo-500 bg-slate-50" value={salud.prox_cambio_aceite} onChange={e => setSalud({...salud, prox_cambio_aceite: Number(e.target.value)})} placeholder="Manual" />
                  </div>
                </div>

                {/* FRENOS */}
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase mb-2 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1">
                    <span className="flex items-center gap-1.5"><span className="text-base">🛑</span> Próx. Mant. Frenos</span>
                    <span className="text-[10px] text-orange-700 bg-orange-50 px-2 py-1 rounded font-bold border border-orange-100">Alarma a los: {salud.prox_cambio_frenos.toLocaleString('es-CL')} KM</span>
                  </label>
                  <div className="flex gap-2">
                    {[10000, 20000, 30000].map(km => (
                      <button key={km} onClick={() => sumarFrenos(km)} type="button" className={`flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all ${salud.prox_cambio_frenos === (kmActual + km) ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>+{km/1000}k</button>
                    ))}
                    <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-24 text-center border-2 border-slate-200 rounded-xl text-sm font-black outline-none focus:border-orange-500 bg-slate-50" value={salud.prox_cambio_frenos} onChange={e => setSalud({...salud, prox_cambio_frenos: Number(e.target.value)})} placeholder="Manual" />
                  </div>
                </div>

                {/* MANTENCIÓN GENERAL */}
                <div>
                  <label className="text-xs font-black text-slate-700 uppercase mb-2 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1">
                    <span className="flex items-center gap-1.5"><span className="text-base">⚙️</span> Próxima Mant. General</span>
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-1 rounded font-bold border border-blue-100">Alarma a los: {salud.prox_mantencion.toLocaleString('es-CL')} KM</span>
                  </label>
                  <div className="flex gap-2">
                    {[20000, 50000, 100000].map(km => (
                      <button key={km} onClick={() => sumarMantencion(km)} type="button" className={`flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all ${salud.prox_mantencion === (kmActual + km) ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>+{km/1000}k</button>
                    ))}
                    <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-24 text-center border-2 border-slate-200 rounded-xl text-sm font-black outline-none focus:border-blue-500 bg-slate-50" value={salud.prox_mantencion} onChange={e => setSalud({...salud, prox_mantencion: Number(e.target.value)})} placeholder="Manual" />
                  </div>
                </div>

                {/* REVISIÓN TÉCNICA */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5"><Calendar className="w-4 h-4 text-indigo-500"/> Vencimiento Revisión Técnica</label>
                    <button type="button" onClick={calcularVencimientoRT} className="text-[10px] bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors shadow-sm">
                      <Wand2 className="w-3 h-3"/> Magia RT
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input type="date" className="w-full sm:flex-1 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-black text-slate-700 outline-none focus:border-indigo-500" value={salud.fecha_revision_tecnica} onChange={e => setSalud({...salud, fecha_revision_tecnica: e.target.value})} />
                    <button 
                      onClick={() => setSalud({...salud, rt_ok: !salud.rt_ok})} 
                      className={`w-full sm:w-auto px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-transform active:scale-95 flex items-center justify-center gap-2 ${salud.rt_ok ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-red-500 text-white shadow-md hover:bg-red-600 border-2 border-red-500'}`}
                    >
                      {salud.rt_ok ? <CheckCircle2 className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                      {salud.rt_ok ? 'Pagado' : 'Pendiente'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === PESTAÑA 2: AVANZADO === */}
          {activeTab === 'avanzado' && (
            <div className="space-y-4 animate-fade-in">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500"/> Vida Útil de Pastillas / Balatas</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase text-center tracking-widest border-b pb-2">Eje Delantero</p>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Rueda Izquierda</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${salud.frenos_di_pct < 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{salud.frenos_di_pct}%</span>
                      </div>
                      {/* Slider engrosado (h-3) para mejor toque en móvil */}
                      <input type="range" min="0" max="100" step="5" className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={salud.frenos_di_pct} onChange={e => setSalud({...salud, frenos_di_pct: Number(e.target.value)})} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Rueda Derecha</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${salud.frenos_dd_pct < 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{salud.frenos_dd_pct}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="5" className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={salud.frenos_dd_pct} onChange={e => setSalud({...salud, frenos_dd_pct: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="space-y-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase text-center tracking-widest border-b pb-2">Eje Trasero</p>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Rueda Izquierda</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${salud.frenos_ti_pct < 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{salud.frenos_ti_pct}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="5" className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={salud.frenos_ti_pct} onChange={e => setSalud({...salud, frenos_ti_pct: Number(e.target.value)})} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Rueda Derecha</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${salud.frenos_td_pct < 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{salud.frenos_td_pct}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="5" className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={salud.frenos_td_pct} onChange={e => setSalud({...salud, frenos_td_pct: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center justify-between">
                    Neumáticos (DOT)
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold border border-slate-200">Vida: 5 Años</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mb-4 leading-tight">Ingresa Semana y Año (Ej: 4223).</p>
                  <div className="grid grid-cols-2 gap-3">
                    {/* inputMode numeric clave aquí */}
                    <div><label className="text-[9px] font-bold text-slate-500 uppercase">Del. Izq</label><input inputMode="numeric" pattern="[0-9]*" maxLength="4" placeholder="4223" className="w-full p-2.5 border-2 border-slate-200 rounded-lg font-mono font-bold text-center text-sm outline-none focus:border-indigo-500 bg-slate-50" value={salud.dot_di} onChange={e => setSalud({...salud, dot_di: e.target.value})}/></div>
                    <div><label className="text-[9px] font-bold text-slate-500 uppercase">Del. Der</label><input inputMode="numeric" pattern="[0-9]*" maxLength="4" placeholder="4223" className="w-full p-2.5 border-2 border-slate-200 rounded-lg font-mono font-bold text-center text-sm outline-none focus:border-indigo-500 bg-slate-50" value={salud.dot_dd} onChange={e => setSalud({...salud, dot_dd: e.target.value})}/></div>
                    <div><label className="text-[9px] font-bold text-slate-500 uppercase">Tras. Izq</label><input inputMode="numeric" pattern="[0-9]*" maxLength="4" placeholder="1521" className="w-full p-2.5 border-2 border-slate-200 rounded-lg font-mono font-bold text-center text-sm outline-none focus:border-indigo-500 bg-slate-50" value={salud.dot_ti} onChange={e => setSalud({...salud, dot_ti: e.target.value})}/></div>
                    <div><label className="text-[9px] font-bold text-slate-500 uppercase">Tras. Der</label><input inputMode="numeric" pattern="[0-9]*" maxLength="4" placeholder="1521" className="w-full p-2.5 border-2 border-slate-200 rounded-lg font-mono font-bold text-center text-sm outline-none focus:border-indigo-500 bg-slate-50" value={salud.dot_td} onChange={e => setSalud({...salud, dot_td: e.target.value})}/></div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center justify-between">
                      Batería
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold border border-slate-200">Vida: 2 Años</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mb-4 leading-tight">Fecha de instalación o fabricación.</p>
                    <div className="flex gap-3">
                      <div className="w-1/2"><label className="text-[9px] font-bold text-slate-500 uppercase">Mes</label><input inputMode="numeric" pattern="[0-9]*" placeholder="Ej: 05" className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-center font-bold text-sm outline-none focus:border-indigo-500 bg-slate-50" value={salud.bateria_mes} onChange={e => setSalud({...salud, bateria_mes: e.target.value})}/></div>
                      <div className="w-1/2"><label className="text-[9px] font-bold text-slate-500 uppercase">Año</label><input inputMode="numeric" pattern="[0-9]*" placeholder="Ej: 2024" className="w-full p-2.5 border-2 border-slate-200 rounded-lg text-center font-bold text-sm outline-none focus:border-indigo-500 bg-slate-50" value={salud.bateria_anio} onChange={e => setSalud({...salud, bateria_anio: e.target.value})}/></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DOCUMENTOS LEGALES */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4">Documentación Legal (Flota)</h4>
                <div className="grid grid-cols-1 gap-4">
                  <DocRowForm title="Rev. Gases (Semestral)" dateField="fecha_gases" okField="gases_ok" icon={CloudFog} />
                  <DocRowForm title="Seguro Automotriz (SOAP)" dateField="fecha_soap" okField="soap_ok" icon={ShieldCheck} />
                  <DocRowForm title="Permiso de Circulación" dateField="fecha_permiso" okField="permiso_ok" icon={FileCheck} />
                </div>
              </div>

            </div>
          )}
        </div>

        {/* FOOTER ACCIONES */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
          <button onClick={onClose} className="w-full sm:w-auto px-5 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cerrar</button>
          <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Save className="w-5 h-5"/> Guardar Cambios</>}
          </button>
        </div>

      </div>
    </div>
  )
}