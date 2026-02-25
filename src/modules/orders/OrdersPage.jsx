import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Search, Car, FileText, X, Check, Loader2, ArrowRight, DollarSign, CreditCard, Landmark, Banknote, UserCog, Calendar } from 'lucide-react'
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

  // ESTADOS PARA EL TÉCNICO
  const [tecnicosDisponibles, setTecnicosDisponibles] = useState([])
  const [selectedTecnico, setSelectedTecnico] = useState('')

  // ESTADO PARA EL MODAL DE PAGO
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null)
  const [paymentData, setPaymentData] = useState({ estado_pago: 'Pendiente', metodo_pago: '' })

  useEffect(() => { 
    fetchOrders() 
    fetchTecnicos() 
  }, [])

  useEffect(() => {
    if (showModal && step === 1) searchClients(searchTerm)
  }, [showModal, step])

  useEffect(() => {
    if (step === 2) searchCars(searchCarTerm)
  }, [step, selectedClient])

  async function fetchOrders() {
    setLoading(true)
    const { data, error } = await supabase
      .from('ordenes')
      .select(`*, clientes ( nombre, tipo, telefono ), orden_autos ( autos ( patente, marca, modelo ) )`)
      .order('created_at', { ascending: false })
    if (!error) setOrders(data)
    setLoading(false)
  }

  async function fetchTecnicos() {
    const { data, error } = await supabase
      .from('perfiles')
      .select('nombre, rol')
      .in('rol', ['mecanico', 'admin']) 
    if (!error && data) {
      setTecnicosDisponibles(data.filter(t => t.nombre)) 
    }
  }

  const filteredOrders = orders.filter(orden => {
    const term = orderSearch.toLowerCase()
    const matchId = orden.id ? orden.id.toLowerCase().includes(term) : false
    const matchClient = orden.clientes?.nombre ? orden.clientes.nombre.toLowerCase().includes(term) : false
    const matchFolioNumber = orden.folio ? String(orden.folio).includes(term) : false
    const matchTecnico = orden.tecnico ? orden.tecnico.toLowerCase().includes(term) : false
    const matchPatente = orden.orden_autos?.some(rel => 
      rel.autos?.patente?.toLowerCase().includes(term)
    )
    return matchId || matchClient || matchFolioNumber || matchPatente || matchTecnico
  })

  async function updateStatusFromList(orderId, newStatus) {
    await supabase.from('ordenes').update({ estado: newStatus }).eq('id', orderId)
    setOrders(orders.map(o => o.id === orderId ? { ...o, estado: newStatus } : o))
  }

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
      case 'Agendado': return { color: 'text-indigo-700 bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500' }
      case 'Recibido': return { color: 'text-blue-700 bg-blue-50 border-blue-200', dot: 'bg-blue-500' }
      case 'En Proceso': return { color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' }
      case 'Finalizado': return { color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500' }
      case 'Entregado': return { color: 'text-slate-600 bg-slate-100 border-slate-200', dot: 'bg-slate-400' } 
      default: return { color: 'text-slate-700 bg-slate-50 border-slate-200', dot: 'bg-slate-500' }
    }
  }

  const getPaymentIcon = (metodo) => {
    if (metodo === 'Efectivo') return <Banknote className="w-3 h-3"/>
    if (metodo === 'Transferencia') return <Landmark className="w-3 h-3"/>
    if (metodo === 'Tarjeta') return <CreditCard className="w-3 h-3"/>
    return <DollarSign className="w-3 h-3"/>
  }

  async function searchClients(term) { 
    setSearchTerm(term); 
    let query = supabase.from('clientes').select('*').limit(10);
    if (term.length > 0) query = query.ilike('nombre', `%${term}%`);
    const { data } = await query;
    setClientsResult(data || []) 
  }
  
  async function createClient() { 
    const { data, error } = await supabase.from('clientes').insert([newClientData]).select().single(); 
    if (error) return alert('Error al crear cliente. Revisa los datos: ' + error.message)
    if (data) { setSelectedClient(data); setIsCreatingClient(false); setStep(2) }
  }

  async function searchCars(term) { 
    setSearchCarTerm(term); 
    let query = supabase.from('autos').select('*').limit(10);
    if (term.length > 0) query = query.ilike('patente', `%${term}%`);
    else if (selectedClient) query = query.eq('cliente_id', selectedClient.id);
    const { data } = await query;
    setCarsResult(data || []) 
  }

  async function createCar() { 
    const carToSave = { 
      patente: newCarData.patente.toUpperCase(), marca: newCarData.marca, modelo: newCarData.modelo,
      cliente_id: selectedClient.id, vin: newCarData.vin || null, color: newCarData.color || null,
      anio: newCarData.anio ? Number(newCarData.anio) : null 
    }; 
    const { data, error } = await supabase.from('autos').insert([carToSave]).select().single(); 
    if (error) return alert('Error al crear auto: ' + error.message)
    if (data) { setSelectedCars([...selectedCars, data]); setIsCreatingCar(false); setNewCarData({ patente: '', marca: '', modelo: '', anio: '', vin: '', color: '' }) }
  }

  function toggleCarSelection(car) { 
    if (!car) return; 
    if (selectedCars.find(c => c && c.id === car.id)) setSelectedCars(selectedCars.filter(c => c && c.id !== car.id)); 
    else setSelectedCars([...selectedCars, car]); 
    setSearchCarTerm(''); searchCars(''); 
  }

  async function handleFinalizeOrder() { 
    if (!selectedTecnico) {
      if (!confirm("No has seleccionado un técnico asignado. ¿Deseas crear la orden de todos modos como 'Sin Asignar'?")) return;
    }
    const user = (await supabase.auth.getUser()).data.user; 
    const { data: orden, error } = await supabase.from('ordenes').insert([{ 
      cliente_id: selectedClient.id, estado: 'Recibido', estado_pago: 'Pendiente', 
      usuario_id: user.id, tecnico: selectedTecnico || 'Sin Asignar', total: 0 
    }]).select().single(); 
    
    if (error) return alert('Error creando orden: ' + error.message);

    const relaciones = selectedCars.filter(c => c !== null).map(car => ({ orden_id: orden.id, auto_id: car.id })); 
    await supabase.from('orden_autos').insert(relaciones); 
    
    setShowModal(false); fetchOrders(); setStep(1); setSelectedClient(null); setSelectedCars([]); setSelectedTecnico(''); 
    navigate(`/ordenes/${orden.id}`) 
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER Y BUSCADOR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"><FileText className="w-6 h-6 text-brand-primary"/> Historial de Órdenes</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Gestión administrativa y estado de pagos de todos los ingresos.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input placeholder="Buscar cliente, folio, patente o técnico..." className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-shadow" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowModal(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 whitespace-nowrap transition-transform active:scale-95">
            <Plus className="w-5 h-5" /> Nueva Orden
          </button>
        </div>
      </div>

      {loading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-brand-primary w-10 h-10"/></div> : 
      filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200"><FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium text-lg">No se encontraron órdenes en el historial.</p></div>
      ) : (
        /* VISTA DE TABLA OPTIMIZADA */
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500">
                  <th className="p-4 font-black">Folio / Fecha</th>
                  <th className="p-4 font-black">Cliente</th>
                  <th className="p-4 font-black">Vehículo(s)</th>
                  <th className="p-4 font-black text-center">Estado del Trabajo</th>
                  <th className="p-4 font-black text-center">Estado de Pago</th>
                  <th className="p-4 font-black text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredOrders.map((orden) => {
                  const status = getStatusConfig(orden.estado)
                  const isPagado = orden.estado_pago === 'Pagado'
                  const isEntregado = orden.estado === 'Entregado'
                  
                  // Agrupar autos de esta orden
                  const autosAsignados = orden.orden_autos?.map(rel => rel.autos).filter(Boolean) || []

                  return (
                    <tr key={orden.id} className={`hover:bg-slate-50/80 transition-colors group ${isEntregado ? 'opacity-75 bg-slate-50/50' : ''}`}>
                      
                      {/* COLUMNA: Folio y Fecha */}
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">#{orden.folio || orden.id.slice(0,6).toUpperCase()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <Calendar className="w-3 h-3" /> {new Date(orden.created_at).toLocaleDateString('es-CL')}
                        </div>
                      </td>

                      {/* COLUMNA: Cliente y Técnico */}
                      <td className="p-4 align-middle">
                        <p className="font-bold text-slate-800 text-base leading-tight mb-1">{orden.clientes?.nombre}</p>
                        {orden.tecnico && orden.tecnico !== 'Sin Asignar' ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full w-fit uppercase border border-indigo-100">
                            <UserCog className="w-3 h-3"/> {orden.tecnico}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Sin técnico asignado</span>
                        )}
                      </td>

                      {/* COLUMNA: Vehículos */}
                      <td className="p-4 align-middle">
                        <div className="flex flex-col gap-1.5">
                          {autosAsignados.length > 0 ? autosAsignados.map((auto, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="bg-slate-800 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded shadow-sm tracking-wider">{auto.patente}</span>
                              <span className="text-xs text-slate-500 truncate max-w-[120px]" title={`${auto.marca} ${auto.modelo}`}>{auto.marca} {auto.modelo}</span>
                            </div>
                          )) : (
                            <span className="text-xs text-slate-400 italic">Sin vehículos</span>
                          )}
                        </div>
                      </td>

                      {/* COLUMNA: Estado de Trabajo (Desplegable) */}
                      <td className="p-4 align-middle text-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-xs ${status.color}`}>
                          <div className={`w-2 h-2 rounded-full ${status.dot}`}></div>
                          <select 
                            className="bg-transparent outline-none cursor-pointer appearance-none"
                            value={orden.estado}
                            onChange={(e) => updateStatusFromList(orden.id, e.target.value)}
                          >
                            <option value="Agendado">Agendado</option>
                            <option value="Recibido">Recibido</option>
                            <option value="En Proceso">En Proceso</option>
                            <option value="Finalizado">Finalizado</option>
                            <option value="Entregado">Entregado</option>
                          </select>
                        </div>
                      </td>

                      {/* COLUMNA: Estado de Pago */}
                      <td className="p-4 align-middle text-center">
                        <button 
                          onClick={() => openPaymentModal(orden)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border shadow-sm hover:shadow-md ${
                            isPagado ? 'bg-green-500 text-white border-green-600' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {isPagado ? getPaymentIcon(orden.metodo_pago) : <DollarSign className="w-3.5 h-3.5"/>}
                          {isPagado ? `Pagado` : 'Pendiente'}
                        </button>
                      </td>

                      {/* COLUMNA: Acciones */}
                      <td className="p-4 align-middle text-center">
                        <button 
                          onClick={() => navigate(`/ordenes/${orden.id}`)} 
                          className="p-2 bg-slate-100 text-slate-600 hover:bg-brand-primary hover:text-white rounded-lg transition-colors border border-slate-200 shadow-sm font-medium text-xs flex items-center justify-center gap-1 mx-auto"
                        >
                          Abrir <ArrowRight className="w-3 h-3"/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL PARA REGISTRAR PAGO --- */}
      {paymentModalOpen && selectedOrderForPayment && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-in">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><DollarSign className="w-5 h-5"/> Tesorería: Registro de Pago</h3>
              <button onClick={() => setPaymentModalOpen(false)}><X className="w-5 h-5 hover:text-red-400" /></button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Titular de la cuenta</p>
                <p className="font-black text-xl text-slate-800 leading-tight mt-1">{selectedOrderForPayment.clientes?.nombre}</p>
                <p className="text-xs font-mono text-slate-400 mt-1">Folio Asociado: #{selectedOrderForPayment.folio || selectedOrderForPayment.id.slice(0,6).toUpperCase()}</p>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Estado Actual</label>
                <div className="flex gap-2">
                  <button onClick={() => setPaymentData({...paymentData, estado_pago: 'Pendiente'})} className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${paymentData.estado_pago === 'Pendiente' ? 'bg-red-50 text-red-600 border-red-500 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                    Deuda Pendiente
                  </button>
                  <button onClick={() => setPaymentData({...paymentData, estado_pago: 'Pagado', metodo_pago: paymentData.metodo_pago || 'Transferencia'})} className={`flex-1 py-3 rounded-xl font-black text-sm border-2 transition-all ${paymentData.estado_pago === 'Pagado' ? 'bg-green-500 text-white border-green-600 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>
                    Pagado / Al Día
                  </button>
                </div>
              </div>

              {paymentData.estado_pago === 'Pagado' && (
                <div className="animate-fade-in bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2 block">Método de Ingreso</label>
                  <select 
                    className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-green-500 bg-white text-slate-700 font-bold"
                    value={paymentData.metodo_pago}
                    onChange={(e) => setPaymentData({...paymentData, metodo_pago: e.target.value})}
                  >
                    <option value="Transferencia">🏦 Transferencia Bancaria</option>
                    <option value="Efectivo">💵 Efectivo Físico</option>
                    <option value="Tarjeta">💳 Tarjeta (Transbank/POS)</option>
                  </select>
                </div>
              )}

              <button onClick={handleSavePayment} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-lg hover:bg-slate-800 transition-transform active:scale-95 shadow-xl flex justify-center items-center gap-2 mt-2">
                Guardar Actualización
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL WIZARD DE CREACIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="font-black text-lg flex items-center gap-2">
                {step === 1 && <><UserCog className="w-5 h-5"/> Paso 1: Selección de Cliente</>}
                {step === 2 && <><Car className="w-5 h-5"/> Paso 2: Vehículos y Asignación</>}
              </h3>
              <button onClick={() => setShowModal(false)} className="hover:text-red-400 transition-colors bg-slate-800 p-1 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {step === 1 && (
                <div className="space-y-5">
                  {!isCreatingClient ? (
                    <>
                      <div className="relative">
                        <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                        <input autoFocus placeholder="Buscar cliente por nombre o teléfono..." className="w-full pl-12 p-4 border-2 border-slate-200 rounded-xl text-lg font-medium outline-none focus:border-blue-500 shadow-sm bg-white" value={searchTerm} onChange={e => searchClients(e.target.value)}/>
                      </div>
                      
                      <div className="space-y-3 mt-4">
                        <button onClick={() => setIsCreatingClient(true)} className="w-full py-4 border-2 border-dashed border-blue-300 bg-blue-50 text-blue-700 rounded-xl font-black hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                          <Plus className="w-5 h-5"/> Crear Nuevo Cliente
                        </button>

                        {clientsResult.map(client => (
                          <div key={client.id} onClick={() => { setSelectedClient(client); setStep(2); }} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer flex justify-between items-center transition-all group">
                            <div>
                              <span className="font-black text-lg text-slate-800 group-hover:text-blue-700 transition-colors">{client.nombre}</span>
                              <p className="text-xs font-bold text-slate-400 mt-1 uppercase">{client.tipo} • {client.telefono || 'Sin teléfono'}</p>
                            </div>
                            <span className="text-sm font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">Seleccionar &rarr;</span>
                          </div>
                        ))}

                        {clientsResult.length === 0 && searchTerm !== '' && (
                          <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
                            <p className="text-slate-500 font-medium">No se encontró a nadie llamado "{searchTerm}"</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                      <h4 className="font-black text-lg mb-5 text-slate-800">Formulario de Registro</h4>
                      <div className="grid grid-cols-1 gap-5">
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Clasificación</label>
                          <select className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1.5 bg-slate-50 font-bold text-slate-700 outline-none focus:border-blue-500" value={newClientData.tipo} onChange={e => setNewClientData({...newClientData, tipo: e.target.value})}>
                            <option value="Particular">Cliente Particular</option>
                            <option value="Empresa">Empresa / Flota</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nombre Completo o Razón Social</label>
                          <input placeholder="Ej: Juan Pérez" className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1.5 bg-slate-50 font-bold text-slate-700 outline-none focus:border-blue-500" value={newClientData.nombre} onChange={e => setNewClientData({...newClientData, nombre: e.target.value})}/>
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Teléfono / WhatsApp</label>
                          <input placeholder="Ej: +569..." className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1.5 bg-slate-50 font-bold text-slate-700 outline-none focus:border-blue-500" value={newClientData.telefono} onChange={e => setNewClientData({...newClientData, telefono: e.target.value})}/>
                        </div>
                        <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                          <button onClick={() => setIsCreatingClient(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black hover:bg-slate-200 rounded-xl transition-colors">Volver</button>
                          <button onClick={createClient} className="flex-1 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 shadow-lg transition-transform active:scale-95">Guardar Cliente</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-blue-50 p-5 rounded-2xl border border-blue-200 shadow-sm">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Cliente Vinculado</p>
                      <span className="text-blue-900 font-black text-xl">{selectedClient.nombre}</span>
                    </div>
                    <button onClick={() => { setStep(1); setSelectedClient(null); setSelectedCars([]); }} className="text-xs font-black text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm">Cambiar</button>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl shadow-sm">
                    <label className="text-xs font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                      <UserCog className="w-4 h-4"/> Asignar Técnico Responsable (Opcional)
                    </label>
                    <select 
                      className="w-full p-3 rounded-xl border border-indigo-200 outline-none font-bold text-indigo-900 bg-white shadow-sm"
                      value={selectedTecnico}
                      onChange={(e) => setSelectedTecnico(e.target.value)}
                    >
                      <option value="">-- Dejar sin asignar por ahora --</option>
                      {tecnicosDisponibles.map(t => (
                        <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedCars.length > 0 && (
                    <div className="bg-slate-800 p-4 rounded-2xl shadow-md border border-slate-700">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-full mb-3 block">Vehículos en esta orden:</span>
                      <div className="flex gap-2 flex-wrap">
                        {selectedCars.map(car => car && (
                          <div key={car.id} className="bg-white text-slate-900 px-4 py-2 rounded-xl flex items-center gap-3 text-sm font-bold shadow-sm">
                            <Car className="w-4 h-4 text-slate-400" /> <span className="font-mono tracking-wider">{car.patente}</span>
                            <button onClick={() => toggleCarSelection(car)} className="hover:text-red-500 bg-slate-100 p-1 rounded-lg transition-colors ml-1"><X className="w-4 h-4"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isCreatingCar ? (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="relative">
                        <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
                        <input autoFocus placeholder="Buscar patente guardada..." className="w-full pl-12 p-3.5 border-2 border-slate-200 rounded-xl uppercase font-mono text-lg outline-none focus:border-blue-500 bg-slate-50 transition-colors" value={searchCarTerm} onChange={e => searchCars(e.target.value)}/>
                      </div>

                      <div className="space-y-3 mt-4">
                        <button onClick={() => setIsCreatingCar(true)} className="w-full py-4 border-2 border-dashed border-blue-300 text-blue-600 bg-blue-50 rounded-xl font-black hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                          <Plus className="w-5 h-5"/> Ingresar Nueva Patente
                        </button>

                        {carsResult.map(car => car && (
                          <div key={car.id} onClick={() => toggleCarSelection(car)} className={`p-4 border-2 rounded-xl cursor-pointer flex justify-between items-center transition-all ${selectedCars.find(c=> c && c.id===car.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'hover:bg-slate-50 border-slate-200 bg-white'}`}>
                            <div>
                              <span className="font-black font-mono text-xl text-slate-800 block mb-1">{car.patente}</span>
                              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase tracking-wider">{car.marca} {car.modelo}</span>
                            </div>
                            {selectedCars.find(c=>c && c.id===car.id) ? (
                              <div className="bg-blue-500 p-2 rounded-full text-white"><Check className="w-5 h-5"/></div>
                            ) : (
                              <span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">Añadir</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
                      <h4 className="font-black text-lg mb-5 text-slate-800">Ficha del Vehículo</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Patente / Matrícula</label>
                          <input placeholder="Ej: ABCD12" className="w-full p-4 border-2 border-slate-200 rounded-xl mt-1.5 uppercase font-mono text-2xl tracking-[0.2em] text-center bg-slate-50 outline-none focus:border-blue-500 font-black" value={newCarData.patente} onChange={e => setNewCarData({...newCarData, patente: e.target.value.toUpperCase()})}/>
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Marca</label>
                          <input list="marcas-list-order" placeholder="Ej: Toyota" className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1.5 bg-slate-50 font-bold text-slate-700 outline-none focus:border-blue-500" value={newCarData.marca} onChange={e => setNewCarData({...newCarData, marca: e.target.value})}/>
                          <datalist id="marcas-list-order">{carBrands.map(brand => <option key={brand} value={brand} />)}</datalist>
                        </div>
                        <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Modelo</label>
                          <input list="modelos-list-order" placeholder="Ej: Yaris" className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1.5 bg-slate-50 font-bold text-slate-700 outline-none focus:border-blue-500" value={newCarData.modelo} onChange={e => setNewCarData({...newCarData, modelo: e.target.value})}/>
                          <datalist id="modelos-list-order">{carModels[newCarData.marca]?.map(model => <option key={model} value={model} />)}</datalist>
                        </div>
                        <div className="col-span-2 flex gap-3 pt-4 mt-2 border-t border-slate-100">
                          <button onClick={() => setIsCreatingCar(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 font-black hover:bg-slate-200 rounded-xl transition-colors">Volver</button>
                          <button onClick={createCar} className="flex-1 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 shadow-lg transition-transform active:scale-95">Guardar Auto</button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-6 mt-4 flex justify-end sticky bottom-0 bg-slate-50 pb-4">
                    <button onClick={handleFinalizeOrder} disabled={selectedCars.length === 0} className="w-full bg-green-500 text-white px-8 py-4 rounded-xl font-black text-lg shadow-xl shadow-green-500/30 disabled:opacity-50 disabled:shadow-none hover:bg-green-600 flex justify-center items-center gap-3 transition-transform active:scale-95">
                      <FileText className="w-6 h-6" /> GENERAR ORDEN AHORA
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}