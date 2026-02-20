import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client' 
import { X, Save, Settings2, AlertTriangle, Calendar, Activity, CheckCircle2, ShieldAlert, Loader2, FileCheck, CloudFog, ShieldCheck, Wand2 } from 'lucide-react'

export default function ProyeccionesFlota({ carId, patente, currentKm, currentRT, onClose }) {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basico') 

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
      alert('✅ Semáforos y Salud del Vehículo actualizados correctamente')
      onClose()
    }
  }

  // --- MOTOR DE CÁLCULO DE REVISIÓN TÉCNICA (CHILE) ---
  const calcularVencimientoRT = () => {
    if (!patente || patente.length < 5) return alert('No hay una patente válida para calcular.')
    
    const ultimoChar = patente.slice(-1)
    if (isNaN(ultimoChar)) return alert('La patente debe terminar en un número para calcular el mes (autos particulares).')

    const digito = parseInt(ultimoChar)
    
    const mapaMeses = {
      0: 2,  // Febrero
      1: 4,  // Abril
      2: 5,  // Mayo
      3: 6,  // Junio
      4: 7,  // Julio
      5: 8,  // Agosto
      6: 9,  // Septiembre
      7: 10, // Octubre
      8: 11, // Noviembre
      9: 1   // Enero
    }

    const mesRT = mapaMeses[digito]
    const hoy = new Date()
    let anioRT = hoy.getFullYear()

    if (mesRT < (hoy.getMonth() + 1)) {
      anioRT += 1
    }

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

  const DocRowForm = ({ title, dateField, okField, icon: Icon, colorClass }) => (
    <div className={`p-3 rounded-lg border flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${salud[okField] ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${salud[okField] ? 'text-slate-400' : 'text-red-500'}`}/>
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider block ${salud[okField] ? 'text-slate-700' : 'text-red-700'}`}>{title}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-slate-500">Vencimiento:</span>
            <input type="date" className="p-1 bg-white border border-slate-200 rounded text-xs outline-none" value={salud[dateField] || ''} onChange={e => setSalud({...salud, [dateField]: e.target.value})} />
          </div>
        </div>
      </div>
      <button 
        onClick={() => setSalud({...salud, [okField]: !salud[okField]})} 
        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 ${salud[okField] ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-500 text-white shadow-sm'}`}
      >
        {salud[okField] ? <><CheckCircle2 className="w-3 h-3"/> Al Día</> : <><AlertTriangle className="w-3 h-3"/> Pendiente</>}
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] animate-bounce-in">
        
        <div className="bg-indigo-900 text-white p-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2"><Settings2 className="w-5 h-5"/> Centro de Salud del Vehículo</h3>
            <p className="text-indigo-200 text-xs mt-0.5">Unidad: <span className="font-mono bg-indigo-800 px-1 rounded text-white">{patente}</span></p>
          </div>
          <button onClick={onClose} className="hover:text-red-400 transition-colors bg-indigo-800 p-1.5 rounded-full"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex bg-slate-100 border-b border-slate-200 shrink-0">
          <button onClick={() => setActiveTab('basico')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'basico' ? 'bg-white text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>
            <CheckCircle2 className="w-4 h-4"/> Preventivo Básico
          </button>
          <button onClick={() => setActiveTab('avanzado')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'avanzado' ? 'bg-white text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}>
            <Activity className="w-4 h-4"/> Salud Avanzada (Flotas)
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
          
          {kmActual === 0 && (
            <div className="bg-orange-50 text-orange-700 p-3 rounded-xl border border-orange-200 flex gap-2 text-xs font-bold items-center shadow-sm">
              <AlertTriangle className="w-5 h-5 shrink-0"/>
              <p>El odómetro está en 0. Asegúrate de ingresar el KM real en la recepción de la orden.</p>
            </div>
          )}

          {/* === PESTAÑA 1: BÁSICO === */}
          {activeTab === 'basico' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kilometraje de Ingreso</span>
                <p className="text-3xl font-black text-slate-800 font-mono mt-1">{kmActual.toLocaleString('es-CL')} <span className="text-lg text-slate-400">KM</span></p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-2 flex justify-between">
                    <span>🛢️ Próximo Aceite</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Alarma a los: {salud.prox_cambio_aceite.toLocaleString('es-CL')} KM</span>
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    {[5000, 10000, 15000].map(km => (
                      <button key={km} onClick={() => sumarAceite(km)} type="button" className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${salud.prox_cambio_aceite === (kmActual + km) ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>+{km/1000}k</button>
                    ))}
                    <input type="number" className="w-24 text-center border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500" value={salud.prox_cambio_aceite} onChange={e => setSalud({...salud, prox_cambio_aceite: Number(e.target.value)})} placeholder="Manual" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-2 flex justify-between">
                    <span>🛑 Próximo Mant. Frenos</span>
                    <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Alarma a los: {salud.prox_cambio_frenos.toLocaleString('es-CL')} KM</span>
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    {[10000, 20000, 30000].map(km => (
                      <button key={km} onClick={() => sumarFrenos(km)} type="button" className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${salud.prox_cambio_frenos === (kmActual + km) ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>+{km/1000}k</button>
                    ))}
                    <input type="number" className="w-24 text-center border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-orange-500" value={salud.prox_cambio_frenos} onChange={e => setSalud({...salud, prox_cambio_frenos: Number(e.target.value)})} placeholder="Manual" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase mb-2 flex justify-between">
                    <span>⚙️ Próxima Mantención General</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Alarma a los: {salud.prox_mantencion.toLocaleString('es-CL')} KM</span>
                  </label>
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    {[20000, 50000, 100000].map(km => (
                      <button key={km} onClick={() => sumarMantencion(km)} type="button" className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${salud.prox_mantencion === (kmActual + km) ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>+{km/1000}k</button>
                    ))}
                    <input type="number" className="w-24 text-center border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-blue-500" value={salud.prox_mantencion} onChange={e => setSalud({...salud, prox_mantencion: Number(e.target.value)})} placeholder="Manual" />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1"><Calendar className="w-4 h-4 text-slate-400"/> Vencimiento Revisión Técnica</label>
                    <button type="button" onClick={calcularVencimientoRT} className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors border border-indigo-200">
                      <Wand2 className="w-3 h-3"/> Auto-Calcular
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="date" className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500" value={salud.fecha_revision_tecnica} onChange={e => setSalud({...salud, fecha_revision_tecnica: e.target.value})} />
                    <button 
                      onClick={() => setSalud({...salud, rt_ok: !salud.rt_ok})} 
                      className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-1 ${salud.rt_ok ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-50 text-red-500 border border-red-200'}`}
                      title="Marcar si el documento está pagado o no"
                    >
                      {salud.rt_ok ? <CheckCircle2 className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === PESTAÑA 2: AVANZADO === */}
          {activeTab === 'avanzado' && (
            <div className="space-y-6 animate-fade-in">
              
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500"/> Vida Útil de Pastillas / Balatas</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest border-b pb-1">Eje Delantero</p>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">Rueda Izquierda</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${salud.frenos_di_pct < 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{salud.frenos_di_pct}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="5" className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={salud.frenos_di_pct} onChange={e => setSalud({...salud, frenos_di_pct: Number(e.target.value)})} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">Rueda Derecha</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${salud.frenos_dd_pct < 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{salud.frenos_dd_pct}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="5" className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={salud.frenos_dd_pct} onChange={e => setSalud({...salud, frenos_dd_pct: Number(e.target.value)})} />
                    </div>
                  </div>

                  <div className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase text-center tracking-widest border-b pb-1">Eje Trasero</p>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">Rueda Izquierda</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${salud.frenos_ti_pct < 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{salud.frenos_ti_pct}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="5" className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={salud.frenos_ti_pct} onChange={e => setSalud({...salud, frenos_ti_pct: Number(e.target.value)})} />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-slate-700">Rueda Derecha</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${salud.frenos_td_pct < 30 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{salud.frenos_td_pct}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="5" className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" value={salud.frenos_td_pct} onChange={e => setSalud({...salud, frenos_td_pct: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center justify-between">
                    Neumáticos (DOT)
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Vida: 5 Años</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mb-3 leading-tight">Ingresa Semana y Año (Ej: 4223).</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[9px] font-bold text-slate-500 uppercase">Del. Izq</label><input maxLength="4" placeholder="4223" className="w-full p-2 border rounded font-mono text-center text-sm outline-none focus:border-indigo-400" value={salud.dot_di} onChange={e => setSalud({...salud, dot_di: e.target.value})}/></div>
                    <div><label className="text-[9px] font-bold text-slate-500 uppercase">Del. Der</label><input maxLength="4" placeholder="4223" className="w-full p-2 border rounded font-mono text-center text-sm outline-none focus:border-indigo-400" value={salud.dot_dd} onChange={e => setSalud({...salud, dot_dd: e.target.value})}/></div>
                    <div><label className="text-[9px] font-bold text-slate-500 uppercase">Tras. Izq</label><input maxLength="4" placeholder="1521" className="w-full p-2 border rounded font-mono text-center text-sm outline-none focus:border-indigo-400" value={salud.dot_ti} onChange={e => setSalud({...salud, dot_ti: e.target.value})}/></div>
                    <div><label className="text-[9px] font-bold text-slate-500 uppercase">Tras. Der</label><input maxLength="4" placeholder="1521" className="w-full p-2 border rounded font-mono text-center text-sm outline-none focus:border-indigo-400" value={salud.dot_td} onChange={e => setSalud({...salud, dot_td: e.target.value})}/></div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center justify-between">
                      Batería
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Vida: 2 Años</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mb-3 leading-tight">Fecha de instalación o fabricación.</p>
                    <div className="flex gap-2">
                      <div className="w-1/2"><label className="text-[9px] font-bold text-slate-500 uppercase">Mes</label><input type="number" placeholder="Ej: 05" className="w-full p-2 border rounded text-center text-sm outline-none focus:border-indigo-400" value={salud.bateria_mes} onChange={e => setSalud({...salud, bateria_mes: e.target.value})}/></div>
                      <div className="w-1/2"><label className="text-[9px] font-bold text-slate-500 uppercase">Año</label><input type="number" placeholder="Ej: 2024" className="w-full p-2 border rounded text-center text-sm outline-none focus:border-indigo-400" value={salud.bateria_anio} onChange={e => setSalud({...salud, bateria_anio: e.target.value})}/></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* DOCUMENTOS LEGALES (AHORA CON GASES Y SWITCHES) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Documentación Legal (Flota)</h4>
                <div className="grid grid-cols-1 gap-3">
                  <DocRowForm title="Rev. Gases (Semestral)" dateField="fecha_gases" okField="gases_ok" icon={CloudFog} />
                  <DocRowForm title="Seguro Automotriz (SOAP)" dateField="fecha_soap" okField="soap_ok" icon={ShieldCheck} />
                  <DocRowForm title="Permiso de Circulación" dateField="fecha_permiso" okField="permiso_ok" icon={FileCheck} />
                </div>
              </div>

            </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
            {isSaving ? 'Guardando...' : <><Save className="w-4 h-4"/> Guardar Perfil de Salud</>}
          </button>
        </div>

      </div>
    </div>
  )
}