import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
// AQUÍ ESTÁ LA CORRECCIÓN: Agregué Receipt y X a la lista de importaciones
import { DollarSign, Plus, Trash2, Loader2, Calendar, ShoppingCart, Coffee, Wrench, FileText, TrendingDown, Receipt, X } from 'lucide-react'

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
    { nombre: 'Insumos y Materiales', icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-100' },
    { nombre: 'Alimentación', icon: Coffee, color: 'text-orange-500', bg: 'bg-orange-100' },
    { nombre: 'Herramientas', icon: Wrench, color: 'text-indigo-500', bg: 'bg-indigo-100' },
    { nombre: 'Servicios Básicos (Luz/Agua)', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-100' },
    { nombre: 'Otros', icon: TrendingDown, color: 'text-slate-500', bg: 'bg-slate-100' }
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

  async function handleAddGasto() {
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
    if (!confirm('¿Estás seguro de eliminar este registro de gasto?')) return
    
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (!error) {
      setGastos(gastos.filter(g => g.id !== id))
    } else {
      alert('Error al eliminar')
    }
  }

  // Utilidades para cálculos y formato
  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
  
  const getCategoriaConfig = (catName) => {
    return categorias.find(c => c.nombre === catName) || categorias[4]
  }

  // Calcular total del mes actual
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const totalMes = gastos
    .filter(g => {
      const gDate = new Date(g.fecha + 'T00:00:00') // Truco para evitar problemas de zona horaria
      return gDate.getMonth() === currentMonth && gDate.getFullYear() === currentYear
    })
    .reduce((sum, g) => sum + Number(g.monto), 0)

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-brand-primary"/> Caja Chica y Gastos
          </h1>
          <p className="text-slate-500 text-sm">Control de salidas de dinero operativo del taller.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-brand-primary text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-transform active:scale-95 whitespace-nowrap w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" /> Registrar Gasto
        </button>
      </div>

      {/* TARJETA RESUMEN DEL MES */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
        <TrendingDown className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-700 opacity-30 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-slate-300 font-bold uppercase tracking-wider text-xs mb-1">Total Gastos en {new Date().toLocaleString('es-ES', { month: 'long' })}</p>
          <h2 className="text-4xl font-black text-red-400 drop-shadow-sm">{money(totalMes)}</h2>
          <p className="text-slate-400 text-xs mt-2">Este monto se restará de la utilidad neta en el balance mensual.</p>
        </div>
      </div>

      {/* LISTA DE GASTOS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-700">Historial de Salidas</h3>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-primary w-8 h-8"/></div>
        ) : gastos.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">Aún no hay gastos registrados.</p>
            <p className="text-slate-400 text-sm mt-1">Registra las compras de insumos menores o almuerzos aquí.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {gastos.map((gasto) => {
              const catConfig = getCategoriaConfig(gasto.categoria)
              const Icono = catConfig.icon

              return (
                <div key={gasto.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${catConfig.bg}`}>
                      <Icono className={`w-5 h-5 ${catConfig.color}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-tight">{gasto.descripcion}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-CL')}</span>
                        <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 rounded-md font-medium">{gasto.categoria}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pl-4 border-l border-slate-100 ml-4">
                    <span className="font-mono font-black text-red-500 text-base sm:text-lg">-{money(gasto.monto)}</span>
                    <button 
                      onClick={() => handleDelete(gasto.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL NUEVO GASTO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-bounce-in">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">Registrar Salida de Dinero</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descripción del gasto</label>
                <input 
                  autoFocus
                  placeholder="Ej: Colación día martes, Silicona gris, etc." 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                  value={newGasto.descripcion}
                  onChange={e => setNewGasto({...newGasto, descripcion: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Monto Total ($)</label>
                  <input 
                    type="number" 
                    placeholder="5000" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-mono font-bold text-red-600"
                    value={newGasto.monto}
                    onChange={e => setNewGasto({...newGasto, monto: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fecha</label>
                  <input 
                    type="date" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary text-sm font-medium"
                    value={newGasto.fecha}
                    onChange={e => setNewGasto({...newGasto, fecha: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Categoría</label>
                <div className="grid grid-cols-2 gap-2">
                  {categorias.map(cat => (
                    <button 
                      key={cat.nombre}
                      onClick={() => setNewGasto({...newGasto, categoria: cat.nombre})}
                      className={`p-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${newGasto.categoria === cat.nombre ? `bg-white border-slate-800 text-slate-800 shadow-sm` : `bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100`}`}
                    >
                      <cat.icon className="w-3 h-3"/> {cat.nombre.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button onClick={handleAddGasto} disabled={saving} className="flex-1 py-3 bg-brand-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Guardar Gasto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}