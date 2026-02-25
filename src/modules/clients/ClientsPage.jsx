import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Search, Phone, FileText, X, Loader2, Edit, Trash2, Car, DollarSign, TrendingUp, Printer, Globe, Copy, CheckCircle, MapPin, Hash, Building2, User, Mail, MessageCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PDFDownloadLink } from '@react-pdf/renderer'
import ReporteGastosPDF from '../../components/ReporteGastosPDF'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({ nombre: '', telefono: '', email: '', rut: '', tipo: 'Particular' })

  const [selectedProfile, setSelectedProfile] = useState(null)
  const [profileCars, setProfileCars] = useState([])
  const [profileOrders, setProfileOrders] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false) 

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (!error) setClients(data)
    setLoading(false)
  }

  const filteredClients = clients.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.rut && c.rut.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const openCreate = () => {
    setIsEditing(false); setEditId(null)
    setFormData({ nombre: '', telefono: '', email: '', rut: '', tipo: 'Particular' })
    setShowForm(true)
  }

  const openEdit = (client, e) => {
    if(e) e.stopPropagation()
    setIsEditing(true); setEditId(client.id)
    setFormData({ nombre: client.nombre, telefono: client.telefono || '', email: client.email || '', rut: client.rut || '', tipo: client.tipo || 'Particular' })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (isEditing) {
      const { error } = await supabase.from('clientes').update(formData).eq('id', editId)
      if (!error) { setShowForm(false); fetchClients(); updateProfileIfOpen(editId) }
    } else {
      const { error } = await supabase.from('clientes').insert([formData])
      if (!error) { setShowForm(false); fetchClients() }
    }
  }

  async function handleDeleteClient(id, e) {
    if(e) e.stopPropagation()
    if(!confirm('¿Borrar cliente? Se perderán sus datos. (Asegúrate de no tener autos ni órdenes asociadas)')) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) alert('No puedes borrar un cliente que tiene autos u órdenes registradas.')
    else { fetchClients(); setSelectedProfile(null) }
  }

  async function openProfile(client) {
    setSelectedProfile(client)
    setLoadingProfile(true)
    setCopiedLink(false) 
    
    const { data: cars } = await supabase.from('autos').select('*').eq('cliente_id', client.id)
    setProfileCars(cars || [])

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

  const handleCopyPortalLink = () => {
    if (!selectedProfile?.token_flota) return alert('Genera un token primero editando y guardando al cliente.');
    const ruta = selectedProfile.tipo === 'Empresa' ? '/portal/' : '/mi-auto/';
    const link = `${window.location.origin}${ruta}${selectedProfile.token_flota}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  }

  async function handleDeleteCar(carId) {
    if(!confirm('¿Borrar este vehículo del cliente?')) return
    const { error } = await supabase.from('autos').delete().eq('id', carId)
    if (error) alert('No puedes borrarlo si tiene órdenes activas.')
    else setProfileCars(profileCars.filter(c => c.id !== carId))
  }

  // Utilidad inteligente para formatear número a WhatsApp
  const getWaLink = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9) cleaned = '56' + cleaned;
    if (cleaned.length === 8) cleaned = '569' + cleaned;
    return `https://wa.me/${cleaned}`;
  }

  // FUNCIÓN RESTAURADA PARA REDIRIGIR AL PARQUE AUTOMOTRIZ
  const handleEditCarRedirect = () => {
    navigate('/autos')
  }

  const totalGastado = profileOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER Y BUSCADOR INTELIGENTE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"><User className="w-6 h-6 text-brand-primary"/> Directorio de Clientes</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Gestión de CRM, flotas y estados de cuenta.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar nombre o RUT..." 
              className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-shadow"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={openCreate} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 whitespace-nowrap transition-transform active:scale-95">
            <Plus className="w-5 h-5" /> Nuevo Cliente
          </button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary w-10 h-10"/></div> : 
      filteredClients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-lg">No hay clientes registrados en la base de datos.</p>
        </div>
      ) : (
        /* VISTA HÍBRIDA: TABLA EN DESKTOP, TARJETAS EN MÓVIL */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* MODO DESKTOP (TABLA) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500">
                  <th className="p-4 font-black">Cliente / Razón Social</th>
                  <th className="p-4 font-black">Identificación</th>
                  <th className="p-4 font-black">Contacto Directo</th>
                  <th className="p-4 font-black text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredClients.map((client) => {
                  const isEmpresa = client.tipo === 'Empresa';
                  const waLink = getWaLink(client.telefono);

                  return (
                    <tr key={client.id} onClick={() => openProfile(client)} className="hover:bg-blue-50/50 transition-colors group cursor-pointer">
                      
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm border ${isEmpresa ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {isEmpresa ? <Building2 className="w-5 h-5"/> : <User className="w-5 h-5"/>}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-base leading-tight group-hover:text-blue-700 transition-colors">{client.nombre}</p>
                            <span className={`text-[10px] font-bold uppercase tracking-wider mt-1 block w-fit ${isEmpresa ? 'text-indigo-600' : 'text-slate-500'}`}>
                              {client.tipo}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-sm">
                          <FileText className="w-4 h-4 text-slate-400"/> {client.rut || 'Sin RUT'}
                        </div>
                      </td>

                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-3">
                          {client.telefono ? (
                            <a href={waLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#1DA851] rounded-lg font-bold text-xs hover:bg-[#25D366]/20 transition-colors border border-[#25D366]/20">
                              <MessageCircle className="w-3.5 h-3.5"/> {client.telefono}
                            </a>
                          ) : <span className="text-xs text-slate-400 italic">Sin teléfono</span>}
                          
                          {client.email && (
                            <a href={`mailto:${client.email}`} onClick={e => e.stopPropagation()} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200" title={client.email}>
                              <Mail className="w-4 h-4"/>
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="p-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={(e) => openEdit(client, e)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"><Edit className="w-4 h-4"/></button>
                          <button onClick={(e) => handleDeleteClient(client.id, e)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"><Trash2 className="w-4 h-4"/></button>
                          <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand-primary transition-colors ml-2"/>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* MODO MÓVIL (TARJETAS COMPACTAS) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredClients.map((client) => {
              const isEmpresa = client.tipo === 'Empresa';
              const waLink = getWaLink(client.telefono);

              return (
                <div key={client.id} onClick={() => openProfile(client)} className="p-5 hover:bg-slate-50 transition-colors cursor-pointer relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isEmpresa ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                  
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{client.nombre}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${isEmpresa ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{client.tipo}</span>
                        {client.rut && <span className="text-[10px] text-slate-500 font-mono">{client.rut}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => openEdit(client, e)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg"><Edit className="w-4 h-4"/></button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-2">
                    {client.telefono && (
                      <a href={waLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 px-3 py-1.5 bg-[#25D366] text-white rounded-lg font-bold text-xs shadow-sm shadow-[#25D366]/30 active:scale-95 transition-transform">
                        <MessageCircle className="w-3.5 h-3.5"/> Contactar
                      </a>
                    )}
                    <div className="ml-auto flex items-center text-[10px] font-bold text-brand-primary">
                      VER FICHA <ArrowRight className="w-3 h-3 ml-1"/>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FORMULARIO CREAR/EDITAR */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-bounce-in">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="font-black text-lg flex items-center gap-2">{isEditing ? <><Edit className="w-5 h-5"/> Editar Ficha</> : <><User className="w-5 h-5"/> Nuevo Cliente</>}</h3>
              <button onClick={() => setShowForm(false)} className="hover:text-red-400 bg-slate-800 p-1 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Clasificación Comercial</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-slate-700" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                    <option value="Particular">Cliente Particular</option>
                    <option value="Empresa">Empresa / Flota</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Nombre / Razón Social</label>
                  <input required placeholder="Ej: Juan Pérez" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">RUT / DNI</label>
                  <input placeholder="Ej: 11.111.111-1" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono text-sm" value={formData.rut} onChange={e => setFormData({...formData, rut: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">WhatsApp / Tel</label>
                  <input inputMode="numeric" placeholder="Ej: 987763347" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1.5">Correo Electrónico</label>
                  <input type="email" placeholder="correo@ejemplo.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors w-full sm:w-auto">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 transition-transform active:scale-95 w-full sm:w-auto">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PANEL LATERAL DE PERFIL CRM (SLIDE-OVER) */}
      {selectedProfile && (
        <div className="fixed inset-0 z-[50] flex justify-end">
          {/* Overlay oscuro */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedProfile(null)}></div>
          
          {/* Panel Lateral */}
          <div className="relative w-full max-w-2xl h-full bg-slate-50 shadow-2xl flex flex-col animate-slide-left border-l border-slate-200">
            
            <div className="bg-white p-6 md:p-8 flex justify-between items-start shrink-0 border-b border-slate-200 shadow-sm z-10">
              <div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 ${selectedProfile.tipo === 'Empresa' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                  {selectedProfile.tipo === 'Empresa' ? <Building2 className="w-3 h-3"/> : <User className="w-3 h-3"/>} {selectedProfile.tipo}
                </div>
                <h2 className="font-black text-3xl text-slate-900 tracking-tight leading-none mb-2">{selectedProfile.nombre}</h2>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                  {selectedProfile.rut && <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5"/> {selectedProfile.rut}</span>}
                  {selectedProfile.telefono && <span className="flex items-center gap-1 text-[#1DA851]"><MessageCircle className="w-3.5 h-3.5"/> {selectedProfile.telefono}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedProfile(null)} className="bg-slate-100 text-slate-500 p-2.5 rounded-full hover:bg-red-100 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {loadingProfile ? <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500 w-10 h-10"/></div> : (
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                
                {/* RESUMEN FINANCIERO */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Resumen Financiero</h3>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Invertido en Taller</p>
                      <h3 className="text-4xl font-black text-slate-900 tracking-tight mt-1">{money(totalGastado)}</h3>
                      <p className="text-xs font-bold text-blue-600 mt-2 bg-blue-50 w-fit px-2 py-1 rounded-lg">En {profileOrders.length} visitas</p>
                    </div>
                    <PDFDownloadLink
                      document={<ReporteGastosPDF cliente={selectedProfile} ordenes={profileOrders} totalGastado={totalGastado} />}
                      fileName={`Estado_Cuenta_${selectedProfile.nombre.replace(/\s+/g, '_')}.pdf`}
                      className="w-full sm:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-xl transition-transform active:scale-95"
                    >
                      {({ loading }) => loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Printer className="w-5 h-5"/> Generar Estado de Cuenta</>}
                    </PDFDownloadLink>
                  </div>
                </div>

                {/* ACCESO PORTAL CLIENTE */}
                {selectedProfile.token_flota && (
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Globe className="w-4 h-4"/> Acceso Remoto</h3>
                    <div className={`rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border ${selectedProfile.tipo === 'Empresa' ? 'bg-indigo-900 border-indigo-800 text-white shadow-xl shadow-indigo-900/20' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div>
                        <h3 className="font-black flex items-center gap-2 text-lg mb-1">
                          {selectedProfile.tipo === 'Empresa' ? 'Portal Corporativo Activo' : 'App Digital Activada'}
                        </h3>
                        <p className={`text-sm ${selectedProfile.tipo === 'Empresa' ? 'text-indigo-300' : 'text-slate-500'}`}>
                          {selectedProfile.tipo === 'Empresa' ? 'Dashboard completo de flota y finanzas.' : 'Monitoreo de desgaste en celular.'}
                        </p>
                      </div>
                      
                      <button onClick={handleCopyPortalLink} className={`w-full sm:w-auto px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md ${copiedLink ? 'bg-[#25D366] text-white shadow-[#25D366]/30' : (selectedProfile.tipo === 'Empresa' ? 'bg-indigo-500 hover:bg-indigo-400 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100')}`}>
                        {copiedLink ? <><CheckCircle className="w-5 h-5"/> ¡Link Copiado!</> : <><Copy className="w-5 h-5"/> Copiar Link</>}
                      </button>
                    </div>
                  </div>
                )}

                {/* FLOTA / VEHÍCULOS */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Car className="w-4 h-4"/> Flota Registrada ({profileCars.length})</h3>
                    <button onClick={handleEditCarRedirect} className="text-xs font-bold text-blue-600 hover:underline">Ir a Parque Automotriz</button>
                  </div>
                  
                  {profileCars.length === 0 ? (
                    <p className="bg-white text-center text-slate-500 text-sm p-8 rounded-2xl border border-dashed border-slate-300">Este cliente aún no ingresa vehículos.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profileCars.map(car => (
                        <div key={car.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${selectedProfile.tipo === 'Empresa' ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                          
                          <div className="flex justify-between items-start pl-2">
                            <div>
                              <span className="font-mono font-black text-lg text-slate-900 tracking-widest block mb-1">{car.patente}</span>
                              <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">{car.marca} {car.modelo}</span>
                            </div>
                            <button onClick={() => handleDeleteCar(car.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                          </div>
                          
                          {(car.vin || car.ceco) && (
                            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 gap-2 text-[10px] pl-2">
                              {car.ceco && <div className="flex items-center gap-1.5 text-slate-600"><MapPin className="w-3.5 h-3.5 text-indigo-400"/> CECO: <strong className="text-slate-800">{car.ceco}</strong></div>}
                              {car.vin && <div className="flex items-center gap-1.5 text-slate-600"><Hash className="w-3.5 h-3.5 text-slate-400"/> VIN: <strong className="font-mono text-slate-800">{car.vin.substring(car.vin.length - 6)}</strong></div>}
                            </div>
                          )}
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