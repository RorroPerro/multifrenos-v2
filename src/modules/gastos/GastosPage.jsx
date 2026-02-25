import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { DollarSign, Plus, Trash2, Loader2, Calendar, ShoppingCart, Coffee, Wrench, FileText, TrendingDown, Receipt, X, ArrowDownRight, PieChart } from 'lucide-react'

export default function GastosPage() {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Estado para el formulario de nuevo gasto
  const [newGasto, setNewGasto] = useState({
    descripcion: '',
    monto: '',
    categoria: 'Insumos',
    fecha: new Date().toISOString().split('T')[0] // Fecha de hoy por defecto
  })

  // Categorías predefinidas
  const categorias = [
    { nombre: 'Insumos', icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-100', border: 'border-blue-200' },
    { nombre: 'Alimentación', icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-100', border: 'border-orange-200' },
    { nombre: 'Herramientas', icon: Wrench, color: 'text-indigo-500', bg: 'bg-indigo-100', border: 'border-indigo-200' },
    { nombre: 'Servicios', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-100', border: 'border-amber-200' },
    { nombre: 'Otros', icon: TrendingDown, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' }
  ]

  useEffect(() => {
    fetchGastos()
  }, [])

  async function fetchGastos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setGastos(data)
    }
    setLoading(false)
  }

  async function handleAddGasto(e) {
    e.preventDefault()
    if (!newGasto.descripcion || !newGasto.monto || !newGasto.fecha) {
      return alert('Por favor completa todos los campos requeridos.')
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const gastoToSave = {
      ...newGasto,
      monto: Number(newGasto.monto),
      usuario_id: user.id
    }

    const { error } = await supabase.from('gastos').insert([gastoToSave])
    setSaving(false)

    if (error) {
      alert('Error al guardar el gasto: ' + error.message)
    } else {
      setShowModal(false)
      setNewGasto({ descripcion: '', monto: '', categoria: 'Insumos', fecha: new Date().toISOString().split('T')[0] })
      fetchGastos()
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Estás seguro de eliminar este registro de gasto? Esta acción impactará los balances.')) return
    
    // UI Optimista
    const prevGastos = [...gastos];
    setGastos(gastos.filter(g => g.id !== id))
    
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (error) {
      setGastos(prevGastos);
      alert('Error al eliminar el gasto.')
    }
  }

  // --- UTILIDADES FINANCIERAS ---
  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
  
  const getCategoriaConfig = (catName) => {
    // Manejo inteligente por si la categoría guardada tiene un nombre ligeramente distinto
    return categorias.find(c => c.nombre.includes(catName) || catName.includes(c.nombre)) || categorias[4]
  }

  // --- LÓGICA DE AGRUPACIÓN POR MES (BI) ---
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const gastosMesActual = gastos.filter(g => {
    const gDate = new Date(g.fecha + 'T00:00:00')
    return gDate.getMonth() === currentMonth && gDate.getFullYear() === currentYear
  })

  const totalMes = gastosMesActual.reduce((sum, g) => sum + Number(g.monto), 0)

  // Encontrar la categoría donde más se ha gastado este mes
  const gastosPorCategoria = gastosMesActual.reduce((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + Number(g.monto);
    return acc;
  }, {})
  const topCategoria = Object.entries(gastosPorCategoria).sort((a,b) => b[1] - a[1])[0]

  // Agrupar historial completo para renderizado inteligente
  const groupedGastos = gastos.reduce((acc, g) => {
    const date = new Date(g.fecha + 'T00:00:00');
    const mesAnio = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    if (!acc[mesAnio]) acc[mesAnio] = [];
    acc[mesAnio].push(g);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-24 animate-fade-in max-w-6xl mx-auto selection:bg-red-200">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <DollarSign className="w-8 h-8 text-red-500 bg-red-50 p-1.5 rounded-xl"/> Caja Chica
          </h1>
          <p className="text-slate-500 font-medium mt-1">Control de salidas de dinero operativo del taller.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-slate-800 transition-transform active:scale-95 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" /> Registrar Gasto
        </button>
      </div>

      {/* DASHBOARD FINANCIERO SUPERIOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gradient-to-br from-red-500 to-red-700 rounded-3xl p-6 sm:p-8 shadow-lg shadow-red-500/20 text-white relative overflow-hidden flex flex-col justify-center">
          <TrendingDown className="absolute -right-4 -bottom-4 w-40 h-40 text-red-900 opacity-20 pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-red-900/30 px-3 py-1 rounded-lg border border-red-400/30 text-[10px] font-black uppercase tracking-widest mb-3">
              <Calendar className="w-3.5 h-3.5"/> Gastos en {new Date().toLocaleString('es-ES', { month: 'long' })}
            </div>
            <h2 className="text-5xl font-black tracking-tight drop-shadow-md">{money(totalMes)}</h2>
            <p className="text-red-100 text-sm font-medium mt-2 max-w-sm">Monto que impactará directamente la utilidad líquida del mes actual.</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <PieChart className="absolute -right-6 -top-6 w-32 h-32 text-slate-50 pointer-events-none"/>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 relative z-10">Mayor Fuga del Mes</h3>
          {topCategoria ? (
            <div className="relative z-10">
              <span className="text-2xl font-black text-slate-800 block mb-1">{topCategoria[0]}</span>
              <span className="text-lg font-bold text-red-500">{money(topCategoria[1])}</span>
            </div>
          ) : (
            <p className="text-slate-500 font-medium relative z-10">No hay datos suficientes este mes.</p>
          )}
        </div>
      </div>

      {/* HISTORIAL AGRUPADO (HÍBRIDO: TABLA / TARJETAS) */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-500 w-12 h-12"/></div>
        ) : gastos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-100">
              <Receipt className="w-10 h-10 text-red-300" />
            </div>
            <p className="text-slate-800 font-black text-xl">Sin gastos registrados.</p>
            <p className="text-slate-500 font-medium mt-1">Registra aquí el almuerzo, siliconas, paños, etc.</p>
          </div>
        ) : (
          Object.keys(groupedGastos).map(mes => (
            <div key={mes} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100">
                <h3 className="font-black text-slate-600 uppercase tracking-widest text-sm capitalize">{mes}</h3>
              </div>

              {/* VISTA DESKTOP (TABLA) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400">
                      <th className="p-4 font-black">Fecha</th>
                      <th className="p-4 font-black">Descripción</th>
                      <th className="p-4 font-black">Categoría</th>
                      <th className="p-4 font-black text-right">Monto</th>
                      <th className="p-4 font-black text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {groupedGastos[mes].map((gasto) => {
                      const catConfig = getCategoriaConfig(gasto.categoria)
                      const Icono = catConfig.icon
                      
                      return (
                        <tr key={gasto.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4 align-middle font-medium text-slate-600">
                            {new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-CL')}
                          </td>
                          <td className="p-4 align-middle">
                            <span className="font-bold text-slate-800 text-base">{gasto.descripcion}</span>
                          </td>
                          <td className="p-4 align-middle">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                              <Icono className="w-3.5 h-3.5"/> {gasto.categoria}
                            </span>
                          </td>
                          <td className="p-4 align-middle text-right">
                            <span className="font-mono font-black text-red-500 text-lg flex justify-end items-center gap-1">
                              <ArrowDownRight className="w-4 h-4"/> {money(gasto.monto)}
                            </span>
                          </td>
                          <td className="p-4 align-middle text-center">
                            <button 
                              onClick={() => handleDelete(gasto.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* VISTA MÓVIL (TARJETAS) */}
              <div className="md:hidden divide-y divide-slate-100">
                {groupedGastos[mes].map((gasto) => {
                  const catConfig = getCategoriaConfig(gasto.categoria)
                  const Icono = catConfig.icon

                  return (
                    <div key={gasto.id} className="p-5 flex flex-col gap-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${catConfig.bg} ${catConfig.border}`}>
                            <Icono className={`w-6 h-6 ${catConfig.color}`} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base leading-tight mb-1">{gasto.descripcion}</h4>
                            <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">{gasto.categoria}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDelete(gasto.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 shrink-0"><Trash2 className="w-5 h-5"/></button>
                      </div>
                      
                      <div className="flex justify-between items-end border-t border-slate-100 pt-3 mt-1">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> {new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-CL')}</span>
                        <span className="font-mono font-black text-red-500 text-xl tracking-tight">-{money(gasto.monto)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL NUEVO GASTO (OPTIMIZADO PARA MÓVILES) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-bounce-in flex flex-col max-h-[95vh]">
            <div className="p-5 md:p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <h3 className="font-black text-xl flex items-center gap-2 tracking-tight"><Receipt className="w-6 h-6 text-red-400"/> Salida de Caja</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:bg-red-500 hover:text-white p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleAddGasto} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 bg-slate-50">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">¿En qué se gastó?</label>
                  <input 
                    required
                    autoFocus
                    placeholder="Ej: Colación técnicos, Silicona gris..." 
                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-red-400 font-bold text-slate-800 text-lg transition-colors"
                    value={newGasto.descripcion}
                    onChange={e => setNewGasto({...newGasto, descripcion: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Monto Total</label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-red-400 font-black">$</span>
                      <input 
                        required
                        type="number" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="5000" 
                        className="w-full pl-8 p-3.5 bg-red-50 border-2 border-red-200 rounded-xl outline-none focus:border-red-500 font-mono font-black text-red-700 text-xl transition-colors"
                        value={newGasto.monto}
                        onChange={e => setNewGasto({...newGasto, monto: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Fecha de Compra</label>
                    <input 
                      required
                      type="date" 
                      className="w-full p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-red-400 font-bold text-slate-700 text-sm transition-colors"
                      value={newGasto.fecha}
                      onChange={e => setNewGasto({...newGasto, fecha: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Selector de Categorías Inteligente */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Clasificación del Gasto</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categorias.map(cat => (
                    <button 
                      type="button"
                      key={cat.nombre}
                      onClick={() => setNewGasto({...newGasto, categoria: cat.nombre})}
                      className={`p-3 rounded-xl text-xs font-black uppercase tracking-wider flex flex-col items-center justify-center gap-2 border-2 transition-all active:scale-95 ${
                        newGasto.categoria === cat.nombre 
                          ? `${cat.bg} ${cat.border} ${cat.color} shadow-sm ring-2 ring-offset-1 ring-${cat.color.split('-')[1]}-300` 
                          : `bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300`
                      }`}
                    >
                      <cat.icon className="w-5 h-5"/> {cat.nombre.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

            </form>

            <div className="p-4 md:p-5 bg-white border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-6 py-4 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleAddGasto} disabled={saving} className="w-full sm:w-auto px-8 py-4 bg-red-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-600 transition-transform active:scale-95 shadow-xl shadow-red-500/30 flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Receipt className="w-5 h-5"/>} {saving ? 'Guardando...' : 'Confirmar Gasto'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}