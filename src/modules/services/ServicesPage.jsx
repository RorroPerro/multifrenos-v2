import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Wrench, Search, X, Loader2, Tag, Hammer, Cog } from 'lucide-react'

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio_mano_obra: '',
    precio_repuestos: ''
  })

  useEffect(() => {
    fetchServices()
  }, [])

  async function fetchServices() {
    setLoading(true)
    const { data, error } = await supabase
      .from('servicios')
      .select('*')
      .order('nombre')

    if (error) console.error(error)
    else setServices(data)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Convertir precios a números o 0 si están vacíos
    const datosLimpios = {
      ...formData,
      precio_mano_obra: Number(formData.precio_mano_obra) || 0,
      precio_repuestos: Number(formData.precio_repuestos) || 0
    }

    const { error } = await supabase.from('servicios').insert([datosLimpios])

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowForm(false)
      setFormData({ nombre: '', descripcion: '', precio_mano_obra: '', precio_repuestos: '' })
      fetchServices()
    }
  }

  // Función para formatear dinero en Peso Chileno
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Servicios</h1>
          <p className="text-slate-500 text-sm">Define tus precios y servicios estándar</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-brand-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Nuevo Servicio
        </button>
      </div>

      {/* FORMULARIO MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="bg-slate-100 p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Crear Servicio</h3>
              <button onClick={() => setShowForm(false)}><X className="w-6 h-6 text-slate-500" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Nombre del Servicio</label>
                <input 
                  placeholder="Ej: Cambio de Pastillas Delanteras" 
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Descripción (Opcional)</label>
                <textarea 
                  placeholder="Detalles técnicos..." 
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none h-20"
                  value={formData.descripcion}
                  onChange={e => setFormData({...formData, descripcion: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Precio Mano de Obra</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input 
                      type="number"
                      placeholder="0" 
                      className="w-full pl-6 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.precio_mano_obra}
                      onChange={e => setFormData({...formData, precio_mano_obra: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Precio Insumos/Rep.</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input 
                      type="number"
                      placeholder="0" 
                      className="w-full pl-6 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.precio_repuestos}
                      onChange={e => setFormData({...formData, precio_repuestos: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center text-blue-800 font-bold text-sm">
                <span>Total Estimado:</span>
                <span>{formatMoney((Number(formData.precio_mano_obra) || 0) + (Number(formData.precio_repuestos) || 0))}</span>
              </div>

              <button type="submit" className="w-full py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-blue-700 transition">
                Guardar Servicio
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LISTA DE SERVICIOS */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div>
      ) : services.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay servicios en el catálogo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((servicio) => (
            <div key={servicio.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-slate-800">{servicio.nombre}</h3>
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <Wrench className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
                <p className="text-slate-500 text-sm mt-2 line-clamp-2">{servicio.descripcion || 'Sin descripción'}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-500"><Hammer className="w-3 h-3"/> Mano de Obra</span>
                  <span className="font-medium">{formatMoney(servicio.precio_mano_obra)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-500"><Cog className="w-3 h-3"/> Repuestos</span>
                  <span className="font-medium">{formatMoney(servicio.precio_repuestos)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 bg-slate-50 -mx-5 px-5 -mb-5 py-3 rounded-b-xl border-t border-slate-100">
                  <span className="font-bold text-slate-600 text-sm">TOTAL</span>
                  <span className="font-bold text-xl text-brand-primary">
                    {formatMoney(servicio.precio_mano_obra + servicio.precio_repuestos)}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}