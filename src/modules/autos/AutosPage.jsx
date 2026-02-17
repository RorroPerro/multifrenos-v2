import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Car, User, Calendar, Search, X, Loader2 } from 'lucide-react'

export default function AutosPage() {
  const [autos, setAutos] = useState([])
  const [clientes, setClientes] = useState([]) // Para el dropdown
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    patente: '',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    cliente_id: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    // 1. Cargar Autos (Y traer el nombre del dueño con SQL Join)
    const { data: autosData } = await supabase
      .from('autos')
      .select('*, clientes(nombre)') // <--- MAGIA: Trae el nombre del cliente
      .order('created_at', { ascending: false })

    // 2. Cargar Clientes (Para el formulario de crear auto)
    const { data: clientesData } = await supabase
      .from('clientes')
      .select('id, nombre')
      .order('nombre')

    if (autosData) setAutos(autosData)
    if (clientesData) setClientes(clientesData)
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.cliente_id) return alert('Debes seleccionar un dueño')

    // Convertir patente a Mayúsculas siempre
    const datosLimpios = { ...formData, patente: formData.patente.toUpperCase() }

    const { error } = await supabase.from('autos').insert([datosLimpios])

    if (error) {
      alert('Error: ' + error.message)
    } else {
      setShowForm(false)
      setFormData({ patente: '', marca: '', modelo: '', anio: '', cliente_id: '' })
      fetchData() // Recargar lista
    }
  }

  return (
    <div className="space-y-6 pb-20"> {/* pb-20 para que no se corte en celular */}
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parque Automotriz</h1>
          <p className="text-slate-500 text-sm">Vehículos registrados en el taller</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-brand-dark hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Registrar Auto
        </button>
      </div>

      {/* FORMULARIO MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-slate-100 p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Nuevo Vehículo</h3>
              <button onClick={() => setShowForm(false)}><X className="w-6 h-6 text-slate-500" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* PATENTE (LO MÁS IMPORTANTE) */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Patente</label>
                <input 
                  placeholder="ABCD-12" 
                  className="w-full p-3 text-2xl font-mono font-bold border-2 border-slate-300 rounded-lg text-center uppercase focus:border-brand-primary outline-none"
                  value={formData.patente}
                  onChange={e => setFormData({...formData, patente: e.target.value.toUpperCase()})}
                  maxLength={6}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input 
                  placeholder="Marca (Toyota)" 
                  className="p-2 border rounded"
                  value={formData.marca}
                  onChange={e => setFormData({...formData, marca: e.target.value})}
                />
                <input 
                  placeholder="Modelo (Yaris)" 
                  className="p-2 border rounded"
                  value={formData.modelo}
                  onChange={e => setFormData({...formData, modelo: e.target.value})}
                />
              </div>

              <input 
                type="number"
                placeholder="Año (2015)" 
                className="w-full p-2 border rounded"
                value={formData.anio}
                onChange={e => setFormData({...formData, anio: e.target.value})}
              />

              {/* SELECTOR DE DUEÑO */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Dueño</label>
                <select 
                  className="w-full p-3 border rounded bg-white"
                  value={formData.cliente_id}
                  onChange={e => setFormData({...formData, cliente_id: e.target.value})}
                  required
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                {clientes.length === 0 && <p className="text-xs text-red-500 mt-1">¡Crea clientes primero!</p>}
              </div>

              <button type="submit" className="w-full py-3 bg-brand-primary text-white font-bold rounded-lg hover:bg-blue-700 transition">
                Guardar Vehículo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LISTA DE AUTOS */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div>
      ) : autos.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay vehículos registrados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {autos.map((auto) => (
            <div key={auto.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all relative overflow-hidden group">
              
              {/* Decoración lateral */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent"></div>

              <div className="flex justify-between items-start mb-2">
                <div className="bg-slate-100 text-slate-800 font-mono font-bold text-lg px-3 py-1 rounded border border-slate-300">
                  {auto.patente}
                </div>
                <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-100">
                  {auto.anio}
                </span>
              </div>

              <h3 className="font-bold text-xl text-slate-800">
                {auto.marca} <span className="text-slate-500 font-normal">{auto.modelo}</span>
              </h3>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-slate-500 text-sm">
                <User className="w-4 h-4 mr-2" />
                <span className="truncate">
                  {auto.clientes?.nombre || 'Sin dueño asignado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}