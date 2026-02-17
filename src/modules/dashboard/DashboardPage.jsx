import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'
import { Users, Car, Wrench, DollarSign, TrendingUp, Activity, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    clientes: 0,
    autos: 0,
    ordenesActivas: 0,
    ingresosTotales: 0
  })
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    async function loadStats() {
      setLoading(true)
      
      // 1. Consultas Paralelas (Para que sea rápido)
      const clientsPromise = supabase.from('clientes').select('*', { count: 'exact', head: true })
      const autosPromise = supabase.from('autos').select('*', { count: 'exact', head: true })
      const ordersPromise = supabase.from('ordenes').select('id, total, estado, created_at')

      const [clientsRes, autosRes, ordersRes] = await Promise.all([clientsPromise, autosPromise, ordersPromise])

      // 2. Procesar Datos de Órdenes
      const ordenes = ordersRes.data || []
      
      // Calcular Ingresos Totales
      const totalDinero = ordenes.reduce((sum, ord) => sum + (Number(ord.total) || 0), 0)
      
      // Contar Activas (No entregadas)
      const activas = ordenes.filter(o => o.estado !== 'Entregado').length

      // 3. Preparar Datos para el Gráfico (Órdenes por Estado)
      // Agrupamos cuántas hay de cada tipo
      const estados = ['Ingresado', 'En Proceso', 'Terminado', 'Entregado']
      const dataGrafico = estados.map(estado => ({
        name: estado,
        cantidad: ordenes.filter(o => o.estado === estado).length,
        color: estado === 'Entregado' ? '#10b981' : '#3b82f6' // Verde si entregado, Azul si no
      }))

      setStats({
        clientes: clientsRes.count || 0,
        autos: autosRes.count || 0,
        ordenesActivas: activas,
        ingresosTotales: totalDinero
      })
      setChartData(dataGrafico)
      setLoading(false)
    }

    loadStats()
  }, [])

  // Formatear Dinero
  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin w-10 h-10 text-brand-primary" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Resumen del Taller</h1>
      
      {/* 1. TARJETAS DE KPI (INDICADORES CLAVE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Tarjeta de Ingresos */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Ingresos Totales</p>
            <h3 className="text-2xl font-bold text-brand-primary">{money(stats.ingresosTotales)}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <DollarSign className="w-8 h-8" />
          </div>
        </div>

        {/* Tarjeta de Órdenes Activas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Autos en Taller</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.ordenesActivas}</h3>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg text-orange-600">
            <Wrench className="w-8 h-8" />
          </div>
        </div>

        {/* Tarjeta de Clientes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Clientes Totales</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.clientes}</h3>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
            <Users className="w-8 h-8" />
          </div>
        </div>

        {/* Tarjeta de Autos Registrados */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Parque Automotriz</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.autos}</h3>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <Car className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN GRÁFICA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Barras */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            Estado de las Órdenes
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel de Accesos Rápidos (Ideas para el futuro) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl text-white flex flex-col justify-center">
          <h3 className="text-xl font-bold mb-2">🚀 Multifrenos OS</h3>
          <p className="text-slate-300 mb-6">El sistema está funcionando al 100%. Recuerda mantener actualizados los estados de las órdenes para que los gráficos sean reales.</p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-lg">
              <TrendingUp className="text-green-400" />
              <div>
                <p className="font-bold text-sm">Meta del Mes</p>
                <div className="w-full bg-slate-700 h-2 rounded-full mt-1 overflow-hidden">
                  <div className="bg-green-400 h-full w-[20%]"></div> {/* Barra de progreso falsa por ahora */}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}