import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Search, Car, FileText, X, Check, Loader2, ArrowRight, DollarSign, CreditCard, Landmark, Banknote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { carBrands, carModels } from '../../utils/carData'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  // BUSCADOR PRINCIPAL
  const [orderSearch, setOrderSearch] = useState('')

  // WIZARD CREACIÓN
  const [step, setStep] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [clientsResult, setClientsResult] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [newClientData, setNewClientData] = useState({ nombre: '', telefono: '', tipo: 'Particular' })

  const [searchCarTerm, setSearchCarTerm] = useState('')
  const [carsResult, setCarsResult] = useState([])
  const [selectedCars, setSelectedCars] = useState([])
  const [isCreatingCar, setIsCreatingCar] = useState(false)
  const [newCarData, setNewCarData] = useState({ patente: '', marca: '', modelo: '', anio: '', vin: '', color: '' })

  // ESTADO PARA EL MODAL DE PAGO
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null)
  const [paymentData, setPaymentData] = useState({ estado_pago: 'Pendiente', metodo_pago: '' })

  useEffect(() => { fetchOrders() }, [])

  async function fetchOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ordenes')
      .select(`*, clientes ( nombre, tipo ), orden_autos ( count )`)
      .order('created_at', { ascending: false })
    if (!error) setOrders(data)
    setLoading(false)
  }

  const filteredOrders = orders.filter(orden => {
    const term = orderSearch.toLowerCase()
    const matchFolio = orden.id.toLowerCase().includes(term)
    const matchClient = orden.clientes?.nombre?.toLowerCase().includes(term)
    return matchFolio || matchClient
  })

  // --- ACTUALIZAR ESTADO DE TRABAJO ---
  async function updateStatusFromList(orderId, newStatus) {
    await supabase.from('ordenes').update({ estado: newStatus }).eq('id', orderId)
    setOrders(orders.map(o => o.id === orderId ? { ...o, estado: newStatus } : o))
  }

  // --- ACTUALIZAR ESTADO DE PAGO ---
  const openPaymentModal = (orden) => {
    setSelectedOrderForPayment(orden)
    setPaymentData({ 
      estado_pago: orden.estado_pago || 'Pendiente', 
      metodo_pago: orden.metodo_pago || '' 
    })
    setPaymentModalOpen(true)
  }

  async function handleSavePayment() {
    const { error } = await supabase
      .from('ordenes')
      .update({ estado_pago: paymentData.estado_pago, metodo_pago: paymentData.estado_pago === 'Pagado' ? paymentData.metodo_pago : null })
      .eq('id', selectedOrderForPayment.id)

    if (error) alert('Error al actualizar pago')
    else {
      setPaymentModalOpen(false)
      fetchOrders()
    }
  }

  const getStatusConfig = (status) => {
    switch(status) {
      case 'Ingresado': return { color: 'bg-yellow-400', glow: 'shadow-yellow-400/50' }
      case 'En Proceso': return { color: 'bg-blue-500', glow: 'shadow-blue-500/50' }
      case 'Terminado': return { color: 'bg-purple-500', glow: 'shadow-purple-500/50' }
      case 'Entregado': return { color: 'bg-green-500', glow: 'shadow-green-500/50' }
      default: return { color: 'bg-slate-400', glow: 'shadow-slate-400/50' }
    }
  }

  const getPaymentIcon = (metodo) => {
    if (metodo === 'Efectivo') return <Banknote className="w-3 h-3"/>
    if (metodo === 'Transferencia') return <Landmark className="w-3 h-3"/>
    if (metodo === 'Tarjeta') return <CreditCard className="w-3 h-3"/>
    return <DollarSign className="w-3 h-3"/>
  }

  // --- FUNCIONES DEL WIZARD CORREGIDAS (CON MANEJO DE ERRORES) ---
  async function searchClients(term) { 
    setSearchTerm(term); 
    if (term.length < 2) { setClientsResult([]); return }; 
    const { data } = await supabase.from('clientes').select('*').ilike('nombre', `%${term}%`).limit(5); 
    setClientsResult(data || []) 
  }
  
  async function createClient() { 
    // CORRECCIÓN: Atrapamos el error aquí
    const { data, error } = await supabase.from('clientes').insert([newClientData]).select().single(); 
    if (error) {
      alert('Error al crear cliente. Revisa los datos: ' + error.message)
      return
    }
    if (data) {
      setSelectedClient(data); 
      setIsCreatingClient(false); 
      setStep(2) 
    }
  }

  async function searchCars(term) { 
    setSearchCarTerm(term); 
    if (term.length < 2) { setCarsResult([]); return }; 
    const { data } = await supabase.from('autos').select('*').ilike('patente', `%${term}%`).limit(5); 
    setCarsResult(data || []) 
  }

  async function createCar() { 
    // CORRECCIÓN: Limpiamos los datos para no enviar textos vacíos a columnas numéricas
    const carToSave = { 
      patente: newCarData.patente.toUpperCase(), 
      marca: newCarData.marca,
      modelo: newCarData.modelo,
      cliente_id: selectedClient.id,
      vin: newCarData.vin || null,
      color: newCarData.color || null,
      anio: newCarData.anio ? Number(newCarData.anio) : null // <-- ¡EL FIX ESTÁ AQUÍ!
    }; 
    
    const { data, error } = await supabase.from('autos').insert([carToSave]).select().single(); 
    
    if (error) {
      alert('Error al crear auto: ' + error.message)
      return
    }
    
    if (data) {
      setSelectedCars([...selectedCars, data]); 
      setIsCreatingCar(false); 
      setNewCarData({ patente: '', marca: '', modelo: '', anio: '', vin: '', color: '' }) 
    }
  }

  function toggleCarSelection(car) { 
    if (!car) return; // Protección
    if (selectedCars.find(c => c && c.id === car.id)) {
      setSelectedCars(selectedCars.filter(c => c && c.id !== car.id)); 
    } else {
      setSelectedCars([...selectedCars, car]); 
    }
    setSearchCarTerm(''); 
    setCarsResult([]) 
  }

  async function handleFinalizeOrder() { 
    const user = (await supabase.auth.getUser()).data.user; 
    const { data: orden, error } = await supabase.from('ordenes').insert([{ cliente_id: selectedClient.id, estado: 'Ingresado', estado_pago: 'Pendiente', usuario_id: user.id, total: 0 }]).select().single(); 
    
    if (error) { alert('Error creando orden: ' + error.message); return; }

    const relaciones = selectedCars.filter(c => c !== null).map(car => ({ orden_id: orden.id, auto_id: car.id })); 
    await supabase.from('orden_autos').insert(relaciones); 
    
    setShowModal(false); 
    fetchOrders(); 
    setStep(1); 
    setSelectedClient(null); 
    setSelectedCars([]); 
    navigate(`/ordenes/${orden.id}`) 
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER Y BUSCADOR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Órdenes de Trabajo</h1>
          <p className="text-slate-500 text-sm">Gestión de Taller</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input placeholder="Buscar folio o cliente..." className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowModal(true)} className="bg-brand-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-blue-700 whitespace-nowrap">
            <Plus className="w-5 h-5" /> Nueva Orden
          </button>
        </div>
      </div>

      {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand-primary"/></div> : 
      filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No hay órdenes.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((orden) => {
            const status = getStatusConfig(orden.estado)
            const isPagado = orden.estado_pago === 'Pagado'

            return (
              <div key={orden.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between">
                
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${status.color}`}></div>

                {/* ENCABEZADO DE LA TARJETA */}
                <div className="flex justify-between items-start mb-3 pl-2">
                  <div className="cursor-pointer" onClick={() => navigate(`/ordenes/${orden.id}`)}>
                    <h3 className="font-bold text-slate-800 text-lg hover:text-blue-600 transition-colors line-clamp-1">{orden.clientes?.nombre}</h3>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Folio: #{orden.id.slice(0,6).toUpperCase()}</span>
                  </div>
                  
                  {/* SELECTOR DE ESTADO DE TRABAJO */}
                  <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    <div className={`w-3 h-3 rounded-full ${status.color} ${status.glow} shadow-sm`}></div>
                    <select 
                      className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                      value={orden.estado}
                      onChange={(e) => updateStatusFromList(orden.id, e.target.value)}
                    >
                      <option value="Ingresado">Ingresado</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Terminado">Terminado</option>
                      <option value="Entregado">Entregado</option>
                    </select>
                  </div>
                </div>

                {/* INFO DEL MEDIO (AUTOS Y ESTADO DE PAGO) */}
                <div className="flex items-center justify-between gap-2 mb-4 pl-2">
                  <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-2 rounded-lg w-fit">
                    <Car className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{orden.orden_autos[0]?.count} Auto(s)</span>
                  </div>
                  
                  {/* BOTÓN / ETIQUETA DE PAGO */}
                  <button 
                    onClick={() => openPaymentModal(orden)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                      isPagado ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {isPagado ? getPaymentIcon(orden.metodo_pago) : <DollarSign className="w-3 h-3"/>}
                    {isPagado ? `Pagado • ${orden.metodo_pago}` : 'Pendiente Pago'}
                  </button>
                </div>

                {/* FOOTER DE LA TARJETA */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 pl-2">
                  <span className="text-xs text-slate-400">{new Date(orden.created_at).toLocaleDateString()}</span>
                  <button onClick={() => navigate(`/ordenes/${orden.id}`)} className="text-sm font-bold text-brand-primary flex items-center gap-1 hover:translate-x-1 transition-transform">
                    Gestionar <ArrowRight className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* --- MODAL PARA REGISTRAR PAGO --- */}
      {paymentModalOpen && selectedOrderForPayment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-in">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><DollarSign className="w-5 h-5"/> Registro de Pago</h3>
              <button onClick={() => setPaymentModalOpen(false)}><X className="w-5 h-5 hover:text-red-400" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="text-xs text-slate-500 uppercase font-bold">Cliente</p>
                <p className="font-bold text-lg text-slate-800">{selectedOrderForPayment.clientes?.nombre}</p>
                <p className="text-sm font-mono text-slate-400">Folio: #{selectedOrderForPayment.id.slice(0,6).toUpperCase()}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Estado del Pago</label>
                <div className="flex gap-2">
                  <button onClick={() => setPaymentData({...paymentData, estado_pago: 'Pendiente'})} className={`flex-1 py-2 rounded-lg font-bold text-sm border transition-colors ${paymentData.estado_pago === 'Pendiente' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                    Pendiente
                  </button>
                  <button onClick={() => setPaymentData({...paymentData, estado_pago: 'Pagado', metodo_pago: paymentData.metodo_pago || 'Transferencia'})} className={`flex-1 py-2 rounded-lg font-bold text-sm border transition-colors ${paymentData.estado_pago === 'Pagado' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                    Pagado
                  </button>
                </div>
              </div>

              {paymentData.estado_pago === 'Pagado' && (
                <div className="animate-fade-in">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Método de Pago</label>
                  <select 
                    className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-slate-50 text-slate-700 font-bold"
                    value={paymentData.metodo_pago}
                    onChange={(e) => setPaymentData({...paymentData, metodo_pago: e.target.value})}
                  >
                    <option value="Transferencia">🏦 Transferencia Bancaria</option>
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="Tarjeta">💳 Tarjeta (Débito/Crédito)</option>
                  </select>
                </div>
              )}

              <button onClick={handleSavePayment} className="w-full mt-4 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-lg">
                Guardar Estado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL WIZARD DE CREACIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">
                {step === 1 && 'Paso 1: ¿Quién es el Cliente?'}
                {step === 2 && 'Paso 2: ¿Qué Vehículos trae?'}
              </h3>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {step === 1 && (
                <div className="space-y-4">
                  {!isCreatingClient ? (
                    <>
                      <div className="relative"><Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" /><input autoFocus placeholder="Buscar por nombre..." className="w-full pl-10 p-3 border rounded-lg text-lg outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={e => searchClients(e.target.value)}/></div>
                      <div className="space-y-2">{clientsResult.map(client => (<div key={client.id} onClick={() => { setSelectedClient(client); setStep(2); }} className="p-3 border rounded hover:bg-blue-50 cursor-pointer flex justify-between items-center"><span className="font-bold">{client.nombre}</span><span className="text-xs text-slate-400">Seleccionar &rarr;</span></div>))}
                      {searchTerm.length > 2 && clientsResult.length === 0 && (<button onClick={() => setIsCreatingClient(true)} className="text-blue-600 font-bold hover:underline">+ Crear Nuevo Cliente</button>)}</div>
                    </>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-lg border"><h4 className="font-bold mb-3">Nuevo Cliente</h4><div className="grid grid-cols-1 gap-3"><select className="p-2 border rounded" value={newClientData.tipo} onChange={e => setNewClientData({...newClientData, tipo: e.target.value})}><option value="Particular">Particular</option><option value="Empresa">Empresa</option></select><input placeholder="Nombre" className="p-2 border rounded" value={newClientData.nombre} onChange={e => setNewClientData({...newClientData, nombre: e.target.value})}/><input placeholder="Teléfono" className="p-2 border rounded" value={newClientData.telefono} onChange={e => setNewClientData({...newClientData, telefono: e.target.value})}/><div className="flex gap-2 pt-2"><button onClick={() => setIsCreatingClient(false)}>Cancelar</button><button onClick={createClient} className="bg-blue-600 text-white px-4 rounded">Guardar</button></div></div></div>
                  )}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-blue-50 p-3 rounded text-blue-800 text-sm"><span>Cliente: <strong>{selectedClient.nombre}</strong></span><button onClick={() => { setStep(1); setSelectedClient(null); }} className="underline">Cambiar</button></div>
                  
                  {/* PROTECCIÓN EN EL RENDER DE LA PATENTE */}
                  {selectedCars.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {selectedCars.map(car => car && (
                        <div key={car.id} className="bg-slate-800 text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm">
                          <Car className="w-3 h-3" />{car.patente}
                          <button onClick={() => toggleCarSelection(car)} className="hover:text-red-400"><X className="w-3 h-3"/></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isCreatingCar ? (
                    <>
                      <div className="relative"><Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" /><input autoFocus placeholder="Buscar Patente..." className="w-full pl-10 p-3 border rounded-lg uppercase font-mono" value={searchCarTerm} onChange={e => searchCars(e.target.value)}/></div>
                      <div className="space-y-2">{carsResult.map(car => car && (<div key={car.id} onClick={() => toggleCarSelection(car)} className={`p-3 border rounded cursor-pointer flex justify-between items-center ${selectedCars.find(c=> c && c.id===car.id) ? 'bg-blue-100 border-blue-500' : 'hover:bg-slate-50'}`}><div><span className="font-bold font-mono mr-2">{car.patente}</span><span className="text-sm text-slate-500">{car.marca}</span></div>{selectedCars.find(c=>c && c.id===car.id) && <Check className="w-5 h-5 text-blue-600"/>}</div>))}
                      {searchCarTerm.length > 2 && carsResult.length === 0 && (<button onClick={() => setIsCreatingCar(true)} className="text-blue-600 font-bold hover:underline">+ Registrar Nuevo</button>)}</div>
                    </>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-lg border">
                      <h4 className="font-bold mb-3">Nuevo Vehículo</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Patente" className="p-2 border rounded uppercase col-span-2" value={newCarData.patente} onChange={e => setNewCarData({...newCarData, patente: e.target.value.toUpperCase()})}/>
                        <div>
                          <input list="marcas-list-order" placeholder="Marca (Ej: Toyota)" className="w-full p-2 border rounded" value={newCarData.marca} onChange={e => setNewCarData({...newCarData, marca: e.target.value})}/>
                          <datalist id="marcas-list-order">{carBrands.map(brand => <option key={brand} value={brand} />)}</datalist>
                        </div>
                        <div>
                          <input list="modelos-list-order" placeholder="Modelo" className="w-full p-2 border rounded" value={newCarData.modelo} onChange={e => setNewCarData({...newCarData, modelo: e.target.value})}/>
                          <datalist id="modelos-list-order">{carModels[newCarData.marca]?.map(model => <option key={model} value={model} />)}</datalist>
                        </div>
                        <div className="col-span-2 flex gap-2 pt-2 justify-end">
                          <button onClick={() => setIsCreatingCar(false)}>Cancelar</button>
                          <button onClick={createCar} className="bg-blue-600 text-white px-4 rounded">Guardar</button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="pt-4 border-t flex justify-end"><button onClick={handleFinalizeOrder} disabled={selectedCars.length === 0} className="bg-brand-success text-white px-6 py-3 rounded-lg font-bold shadow-lg disabled:opacity-50 flex items-center gap-2"><FileText className="w-5 h-5" />Crear Orden</button></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}