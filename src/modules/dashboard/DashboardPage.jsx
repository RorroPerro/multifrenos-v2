import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
// AQUÍ ESTÁ LA CORRECCIÓN: Agregué Wrench a la lista de íconos
import { TrendingUp, TrendingDown, DollarSign, Car, AlertCircle, Calendar, ArrowRight, Wallet, CheckCircle, Clock, Loader2, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Estados de datos
  const [finanzas, setFinanzas] = useState({ ingresos: 0, gastos: 0, utilidad: 0 })
  const [autosEnTaller, setAutosEnTaller] = useState([])
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([])
  const [metricas, setMetricas] = useState({ agendados: 0, enProceso: 0, finalizados: 0 })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)

    // 1. Obtener fecha del primer día del mes actual para los filtros
    const date = new Date()
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()

    // 2. Traer Órdenes del Mes (Para ingresos)
    const { data: ordenesMes } = await supabase
      .from('ordenes')
      .select('total')
      .gte('created_at', firstDayOfMonth)

    // 3. Traer Gastos del Mes
    const { data: gastosMes } = await supabase
      .from('gastos')
      .select('monto')
      .gte('fecha', firstDayOfMonth.split('T')[0])

    // Calcular Finanzas
    const totalIngresos = (ordenesMes || []).reduce((sum, ord) => sum + (Number(ord.total) || 0), 0)
    const totalGastos = (gastosMes || []).reduce((sum, gas) => sum + (Number(gastos.monto) || Number(gas.monto) || 0), 0)
    
    setFinanzas({
      ingresos: totalIngresos,
      gastos: totalGastos,
      utilidad: totalIngresos - totalGastos
    })

    // 4. Traer Autos Activos en Taller
    const { data: activas } = await supabase
      .from('ordenes')
      .select(`id, estado, clientes(nombre), orden_autos(autos(patente, marca, modelo))`)
      .neq('estado', 'Entregado')
      .order('created_at', { ascending: false })

    if (activas) {
      setAutosEnTaller(activas)
      setMetricas({
        agendados: activas.filter(o => o.estado === 'Agendado').length,
        enProceso: activas.filter(o => o.estado === 'En Proceso' || o.estado === 'Recibido').length,
        finalizados: activas.filter(o => o.estado === 'Finalizado').length
      })
    }

    // 5. Traer Cuentas por Cobrar (Entregados o Finalizados pero NO pagados)
    const { data: deudores } = await supabase
      .from('ordenes')
      .select(`id, folio, total, created_at, clientes(nombre, telefono)`)
      .eq('estado_pago', 'Pendiente')
      .in('estado', ['Finalizado', 'Entregado']) // Solo nos preocupan los que ya se terminaron
      .order('created_at', { ascending: true })

    if (deudores) setCuentasPorCobrar(deudores)

    setLoading(false)
  }

  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
  const currentMonthName = new Date().toLocaleString('es-ES', { month: 'long' }).toUpperCase()

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-brand-primary w-12 h-12"/></div>

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Resumen</h1>
        <p className="text-slate-500 mt-1">Este es el resumen de tu taller durante el mes de <strong>{currentMonthName}</strong>.</p>
      </div>

      {/* --- FILA 1: TARJETAS FINANCIERAS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ingresos Brutos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Ingresos Brutos</p>
            <h3 className="text-3xl font-black text-slate-800">{money(finanzas.ingresos)}</h3>
          </div>
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-green-600" />
          </div>
        </div>

        {/* Gastos / Caja Chica */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-red-300 transition-colors" onClick={() => navigate('/gastos')}>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Gastos Operativos</p>
            <h3 className="text-3xl font-black text-red-500">-{money(finanzas.gastos)}</h3>
          </div>
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
            <TrendingDown className="w-7 h-7 text-red-500" />
          </div>
        </div>

        {/* Utilidad Neta (El bolsillo) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-lg flex items-center justify-between text-white relative overflow-hidden">
          <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-700 opacity-30 pointer-events-none" />
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Utilidad Neta del Mes</p>
            <h3 className="text-3xl font-black text-emerald-400">{money(finanzas.utilidad)}</h3>
          </div>
        </div>
      </div>

      {/* --- FILA 2: OPERACIONES Y ALERTAS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: Autos en Taller */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Mini Resumen de Estados */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => navigate('/pizarra')}>
              <Calendar className="w-6 h-6 text-indigo-500 mb-2"/>
              <span className="text-3xl font-black text-indigo-700">{metricas.agendados}</span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase mt-1">Por Llegar</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => navigate('/pizarra')}>
              <Wrench className="w-6 h-6 text-amber-500 mb-2"/>
              <span className="text-3xl font-black text-amber-700">{metricas.enProceso}</span>
              <span className="text-[10px] font-bold text-amber-500 uppercase mt-1">En Reparación</span>
            </div>
            <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-green-100 transition-colors" onClick={() => navigate('/pizarra')}>
              <CheckCircle className="w-6 h-6 text-green-500 mb-2"/>
              <span className="text-3xl font-black text-green-700">{metricas.finalizados}</span>
              <span className="text-[10px] font-bold text-green-500 uppercase mt-1">Listos / Retiro</span>
            </div>
          </div>

          {/* Lista de Autos Activos */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Car className="w-5 h-5 text-brand-primary"/> Vehículos Activos</h3>
              <button onClick={() => navigate('/pizarra')} className="text-sm font-bold text-brand-primary hover:underline">Ver Pizarra Completa</button>
            </div>
            
            <div className="divide-y divide-slate-100">
              {autosEnTaller.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">No hay vehículos en el taller actualmente.</p>
              ) : (
                autosEnTaller.slice(0, 5).map(orden => {
                  const auto = orden.orden_autos?.[0]?.autos || {}
                  return (
                    <div key={orden.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/ordenes/${orden.id}`)}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 font-mono font-bold text-sm text-slate-700">
                          {auto.patente ? auto.patente.slice(0,4) : 'S/P'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{auto.marca} {auto.modelo}</p>
                          <p className="text-xs text-slate-500">{orden.clientes?.nombre}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        orden.estado === 'Agendado' ? 'bg-indigo-100 text-indigo-700' :
                        orden.estado === 'En Proceso' ? 'bg-amber-100 text-amber-700' :
                        orden.estado === 'Recibido' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {orden.estado}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Alertas de Cobro */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden sticky top-6">
            <div className="bg-red-50 p-5 border-b border-red-100">
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5"/> Cuentas por Cobrar
              </h3>
              <p className="text-xs text-red-600 mt-1">Autos terminados que aún no pagan.</p>
            </div>
            
            <div className="divide-y divide-red-50">
              {cuentasPorCobrar.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2"/>
                  <p className="text-sm font-bold text-slate-500">¡Todo al día!</p>
                  <p className="text-xs text-slate-400">No hay deudas pendientes.</p>
                </div>
              ) : (
                cuentasPorCobrar.map(orden => (
                  <div key={orden.id} className="p-4 hover:bg-red-50/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-slate-800 text-sm line-clamp-1">{orden.clientes?.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Folio: #{orden.folio || orden.id.slice(0,5).toUpperCase()}</p>
                      </div>
                      <span className="font-black text-red-600">{money(orden.total)}</span>
                    </div>
                    
                    <button 
                      onClick={() => navigate(`/ordenes/${orden.id}`)}
                      className="w-full mt-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
                    >
                      <DollarSign className="w-4 h-4"/> Gestionar Cobro
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}