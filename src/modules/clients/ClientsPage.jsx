import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Search, Phone, Mail, FileText, X, Loader2, Edit, Trash2, Car, DollarSign, TrendingUp, Printer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PDFDownloadLink } from '@react-pdf/renderer'
import ReporteGastosPDF from '../../components/ReporteGastosPDF'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // BUSCADOR
  const [searchTerm, setSearchTerm] = useState('')

  // MODAL CREAR/EDITAR CLIENTE
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', rut: '', tipo: 'Particular' })

  // MODAL PERFIL DEL CLIENTE (Ficha Técnica)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [profileCars, setProfileCars] = useState([])
  const [profileOrders, setProfileOrders] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (!error) setClients(data)
    setLoading(false)
  }

  // --- 1. BUSCADOR ---
  const filteredClients = clients.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.rut && c.rut.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // --- 2. CREAR Y EDITAR CLIENTES ---
  const openCreate = () => {
    setIsEditing(false); setEditId(null)
    setFormData({ nombre: '', telefono: '', email: '', rut: '', tipo: 'Particular' })
    setShowForm(true)
  }

  const openEdit = (client) => {
    setIsEditing(true); setEditId(client.id)
    setFormData({ nombre: client.nombre, telefono: client.telefono || '', email: client.email || '', rut: client.rut || '', tipo: client.tipo || 'Particular' })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isEditing) {
      const { error } = await supabase.from('clientes').update(formData).eq('id', editId)
      if (error) alert('Error: ' + error.message); else { setShowForm(false); fetchClients(); updateProfileIfOpen(editId) }
    } else {
      const { error } = await supabase.from('clientes').insert([formData])
      if (error) alert('Error: ' + error.message); else { setShowForm(false); fetchClients() }
    }
  }

  async function handleDeleteClient(id) {
    if(!confirm('¿Borrar cliente? Se perderán sus datos. (Asegúrate de no tener autos ni órdenes asociadas o dará error)')) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) alert('No puedes borrar un cliente que tiene autos u órdenes registradas. Bórralos primero.')
    else { fetchClients(); setSelectedProfile(null) }
  }

  // --- 3. PERFIL DEL CLIENTE Y FINANZAS ---
  async function openProfile(client) {
    setSelectedProfile(client)
    setLoadingProfile(true)
    
    // Traer sus autos
    const { data: cars } = await supabase.from('autos').select('*').eq('cliente_id', client.id)
    setProfileCars(cars || [])

    // Traer sus órdenes (Para calcular gastos) - Mejorada para incluir patentes
    const { data: orders } = await supabase
      .from('ordenes')
      .select('*, orden_autos(autos(patente))')
      .eq('cliente_id', client.id)
      .order('created_at', { ascending: false })
    setProfileOrders(orders || [])
    
    setLoadingProfile(false)
  }

  async function updateProfileIfOpen(id) {
    if (selectedProfile && selectedProfile.id === id) {
      const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
      if (data) setSelectedProfile(data)
    }
  }

  // --- 4. GESTIÓN DE AUTOS DESDE EL PERFIL ---
  async function handleDeleteCar(carId) {
    if(!confirm('¿Borrar este vehículo del cliente?')) return
    const { error } = await supabase.from('autos').delete().eq('id', carId)
    if (error) alert('No puedes borrarlo si tiene órdenes activas.')
    else setProfileCars(profileCars.filter(c => c.id !== carId))
  }

  const handleEditCarRedirect = () => {
    // Te lleva al módulo de autos (en el futuro podemos pasarle el ID por URL para que abra el modal solo)
    alert('Redirigiendo al módulo de Parque Automotriz para edición avanzada...')
    navigate('/autos')
  }

  // CALCULOS FINANCIEROS
  const totalGastado = profileOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER Y BUSCADOR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500 text-sm">Directorio y finanzas</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar por nombre o RUT..." 
              className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={openCreate} className="bg-brand-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-blue-700 whitespace-nowrap">
            <Plus className="w-5 h-5" /> Nuevo
          </button>
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-primary w-8 h-8"/></div> : 
      filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay clientes con ese nombre.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                    {client.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 line-clamp-1">{client.nombre}</h3>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{client.tipo}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(client)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => handleDeleteClient(client.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>

              <div className="space-y-1 mb-4 text-sm text-slate-600">
                {client.rut && <p className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400"/> {client.rut}</p>}
                {client.telefono && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400"/> {client.telefono}</p>}
              </div>

              <button 
                onClick={() => openProfile(client)}
                className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
              >
                Ver Ficha y Vehículos
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL DE CREACIÓN/EDICIÓN DE CLIENTE --- */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                  <select className="w-full p-2 border rounded mt-1" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                    <option value="Particular">Particular</option><option value="Empresa">Empresa</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre / Razón Social</label>
                  <input required className="w-full p-2 border rounded mt-1" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">RUT</label>
                  <input className="w-full p-2 border rounded mt-1" value={formData.rut} onChange={e => setFormData({...formData, rut: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                  <input className="w-full p-2 border rounded mt-1" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                  <input type="email" className="w-full p-2 border rounded mt-1" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL FICHA DEL CLIENTE (PERFIL Y VEHÍCULOS) --- */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-fade-in flex flex-col max-h-[95vh]">
            
            <div className="bg-slate-900 text-white p-4 flex justify-between items-start sm:items-center">
              <div>
                <h2 className="font-bold text-xl">{selectedProfile.nombre}</h2>
                <p className="text-slate-400 text-sm">{selectedProfile.tipo} • {selectedProfile.rut}</p>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="bg-slate-800 p-2 rounded-full hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>

            {loadingProfile ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
                
                {/* TARJETA FINANCIERA */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-green-50 text-green-600 rounded-full"><TrendingUp className="w-8 h-8"/></div>
                    <div>
                      <p className="text-sm font-bold text-slate-500 uppercase">Historial de Gastos</p>
                      <h3 className="text-3xl font-black text-slate-800">{money(totalGastado)}</h3>
                      <p className="text-xs text-slate-400">En {profileOrders.length} órdenes de trabajo</p>
                    </div>
                  </div>
                  <PDFDownloadLink
                    document={<ReporteGastosPDF cliente={selectedProfile} ordenes={profileOrders} totalGastado={totalGastado} />}
                    fileName={`Reporte_Gastos_${selectedProfile.nombre.replace(/\s+/g, '_')}.pdf`}
                    className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg transition-transform active:scale-95"
                  >
                    {({ loading }) => loading ? 'Generando Reporte...' : <><Printer className="w-5 h-5"/> Descargar Reporte PDF</>}
                  </PDFDownloadLink>
                </div>

                {/* LISTA DE VEHÍCULOS DEL CLIENTE */}
                <div>
                  <h3 className="font-bold text-lg text-slate-800 mb-3 flex items-center gap-2 border-b pb-2">
                    <Car className="w-5 h-5 text-slate-400"/> Vehículos Asociados ({profileCars.length})
                  </h3>
                  
                  {profileCars.length === 0 ? (
                    <p className="text-slate-500 text-sm italic py-4">Este cliente no tiene vehículos registrados.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {profileCars.map(car => (
                        <div key={car.id} className="bg-white p-4 rounded-lg border border-slate-200 flex justify-between items-center group">
                          <div>
                            <span className="font-mono font-bold text-lg text-slate-900 block">{car.patente}</span>
                            <span className="text-sm text-slate-500">{car.marca} {car.modelo} • {car.anio}</span>
                          </div>
                          <div className="flex flex-col gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={handleEditCarRedirect} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                              <Edit className="w-3 h-3"/> Editar
                            </button>
                            <button onClick={() => handleDeleteCar(car.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded hover:bg-red-100 flex items-center gap-1">
                              <Trash2 className="w-3 h-3"/> Borrar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}