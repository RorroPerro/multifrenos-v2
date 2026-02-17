import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Search, Phone, Mail, FileText, X, Loader2 } from 'lucide-react'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', rut: '' })

  // 1. CARGAR CLIENTES DESDE SUPABASE
  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error cargando clientes:', error)
    else setClients(data)
    setLoading(false)
  }

  // 2. GUARDAR NUEVO CLIENTE
  async function handleSubmit(e) {
    e.preventDefault()
    const { error } = await supabase.from('clientes').insert([formData])

    if (error) {
      alert('Error al guardar: ' + error.message)
    } else {
      setShowForm(false)
      setFormData({ nombre: '', telefono: '', email: '', rut: '' }) // Limpiar formulario
      fetchClients() // Recargar lista
    }
  }

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm">Gestiona tu cartera de clientes</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-brand-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all w-full sm:w-auto justify-center"
        >
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* FORMULARIO (MODAL SIMPLE) */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Agregar Nuevo Cliente</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500">
              <X className="w-6 h-6" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              placeholder="Nombre Completo" 
              className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.nombre}
              onChange={e => setFormData({...formData, nombre: e.target.value})}
              required
            />
            <input 
              placeholder="RUT (Opcional)" 
              className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.rut}
              onChange={e => setFormData({...formData, rut: e.target.value})}
            />
            <input 
              placeholder="Teléfono (+569...)" 
              className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.telefono}
              onChange={e => setFormData({...formData, telefono: e.target.value})}
            />
            <input 
              placeholder="Email (Opcional)" 
              type="email"
              className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-brand-success text-white rounded hover:bg-green-600">Guardar Cliente</button>
            </div>
          </form>
        </div>
      )}

      {/* LISTA DE CLIENTES */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-blue-500"/></div>
      ) : clients.length === 0 ? (
        <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          No hay clientes registrados aún.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {/* VISTA MÓVIL Y PC UNIFICADA (TARJETAS INTELIGENTES) */}
          {clients.map((client) => (
            <div key={client.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              
              {/* Info Principal */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600">
                  {client.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{client.nombre}</h3>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
                    {client.rut && <span className="flex items-center gap-1"><FileText className="w-3 h-3"/> {client.rut}</span>}
                    {client.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {client.telefono}</span>}
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-2 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-600">
                  Ver Autos
                </button>
                <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium">
                  + Orden
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}