import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Car, User, Search, X, Loader2, Edit, Calendar, Gauge, Trash2, Wand2, ShieldCheck, DollarSign, MapPin, Hash, Building2, ArrowRight } from 'lucide-react'
import { carBrands, carModels } from '../../utils/carData'

export default function AutosPage() {
  const [autos, setAutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  
  // MODAL Y FORMULARIO
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    patente: '', marca: '', modelo: '', anio: new Date().getFullYear(),
    color: '', vin: '', cliente_id: '', kilometraje_actual: 0, 
    fecha_revision_tecnica: '',
    numero_motor: '', ceco: '', tasacion: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: autosData } = await supabase.from('autos').select('*, clientes(nombre, tipo)').order('created_at', { ascending: false })
    const { data: clientesData } = await supabase.from('clientes').select('id, nombre').order('nombre')

    if (autosData) setAutos(autosData)
    if (clientesData) setClientes(clientesData)
    setLoading(false)
  }

  // --- MOTOR DE CÁLCULO DE REVISIÓN TÉCNICA (CHILE) ---
  const calcularVencimientoRT = () => {
    const patente = formData.patente.trim()
    if (patente.length < 5) return alert('Por favor, ingresa una patente válida primero.')
    
    const ultimoChar = patente.slice(-1)
    if (isNaN(ultimoChar)) return alert('La patente debe terminar en un número para calcular el mes (autos particulares).')

    const digito = parseInt(ultimoChar)
    
    // Calendario Oficial PRT Chile
    const mapaMeses = { 0: 2, 1: 4, 2: 5, 3: 6, 4: 7, 5: 8, 6: 9, 7: 10, 8: 11, 9: 1 }

    const mesRT = mapaMeses[digito]
    const hoy = new Date()
    let anioRT = hoy.getFullYear()

    if (mesRT < (hoy.getMonth() + 1)) {
      anioRT += 1
    }

    const ultimoDia = new Date(anioRT, mesRT, 0).getDate()
    const mesStr = mesRT.toString().padStart(2, '0')
    const diaStr = ultimoDia.toString().padStart(2, '0')
    const fechaCalculada = `${anioRT}-${mesStr}-${diaStr}`

    setFormData(prev => ({...prev, fecha_revision_tecnica: fechaCalculada}))
  }

  // --- ABRIR MODALES ---
  const openCreateModal = () => {
    setIsEditing(false); setEditId(null)
    setFormData({ 
      patente: '', marca: '', modelo: '', anio: new Date().getFullYear(), color: '', vin: '', 
      cliente_id: '', kilometraje_actual: 0, fecha_revision_tecnica: '',
      numero_motor: '', ceco: '', tasacion: '' 
    })
    setShowForm(true)
  }

  const openEditModal = (auto) => {
    setIsEditing(true); setEditId(auto.id)
    setFormData({
      patente: auto.patente || '', marca: auto.marca || '', modelo: auto.modelo || '', 
      anio: auto.anio || '', color: auto.color || '', vin: auto.vin || '',
      cliente_id: auto.cliente_id || '', kilometraje_actual: auto.kilometraje_actual || 0, 
      fecha_revision_tecnica: auto.fecha_revision_tecnica || auto.vencimiento_revision || '',
      numero_motor: auto.numero_motor || '', ceco: auto.ceco || '', tasacion: auto.tasacion || ''
    })
    setShowForm(true)
  }

  // --- GUARDAR Y BORRAR ---
  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.cliente_id) return alert('Debes asignar un dueño al vehículo')

    const datosLimpios = { ...formData, patente: formData.patente.toUpperCase(), vin: formData.vin.toUpperCase() }
    
    if (!datosLimpios.fecha_revision_tecnica) datosLimpios.fecha_revision_tecnica = null
    if (datosLimpios.tasacion === '') datosLimpios.tasacion = null

    if (isEditing) {
      const { error } = await supabase.from('autos').update(datosLimpios).eq('id', editId)
      if (error) alert('Error al actualizar: ' + error.message); else { setShowForm(false); fetchData() }
    } else {
      const { error } = await supabase.from('autos').insert([datosLimpios])
      if (error) alert('Error al crear: ' + error.message); else { setShowForm(false); fetchData() }
    }
  }

  async function handleDelete(id) {
    if(!confirm('¿Estás seguro de eliminar este vehículo? Se borrará de los registros.')) return
    const { error } = await supabase.from('autos').delete().eq('id', id)
    if (error) alert('No se puede borrar porque tiene órdenes de trabajo asociadas.')
    else fetchData()
  }

  const filteredAutos = autos.filter(a => a.patente.toLowerCase().includes(searchTerm.toLowerCase()) || (a.clientes?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()))
  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER Y BUSCADOR INTELIGENTE */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2"><Car className="w-6 h-6 text-brand-primary"/> Parque Automotriz</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Control de flota y estado técnico de vehículos.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar patente o cliente..." 
              className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium transition-shadow uppercase font-mono"
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          <button onClick={openCreateModal} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 whitespace-nowrap transition-transform active:scale-95">
            <Plus className="w-5 h-5" /> Registrar Vehículo
          </button>
        </div>
      </div>

      {/* LISTA DE AUTOS (TABLA EN DESKTOP, TARJETAS EN MÓVIL) */}
      {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary w-10 h-10"/></div> : 
      filteredAutos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <Car className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-lg">No hay vehículos registrados o no coinciden.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* MODO DESKTOP (TABLA) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-widest text-slate-500">
                  <th className="p-4 font-black">Patente / Vehículo</th>
                  <th className="p-4 font-black">Propietario / Flota</th>
                  <th className="p-4 font-black">Telemetría Básica</th>
                  <th className="p-4 font-black text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAutos.map((auto) => {
                  const isEmpresa = auto.clientes?.tipo === 'Empresa';

                  return (
                    <tr key={auto.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* COLUMNA: Patente y Auto */}
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-900 text-white font-mono font-black text-lg px-3 py-1.5 rounded-xl shadow-inner tracking-[0.1em] border border-slate-800">
                            {auto.patente}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 uppercase tracking-wider">{auto.marca} {auto.modelo}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {auto.anio && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">AÑO {auto.anio}</span>}
                              {auto.vin && <span className="text-[10px] text-slate-400 font-mono">VIN: {auto.vin.substring(auto.vin.length - 6)}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* COLUMNA: Propietario */}
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          {isEmpresa ? <Building2 className="w-4 h-4 text-indigo-500"/> : <User className="w-4 h-4 text-slate-400"/>}
                          <span className="font-bold text-slate-700">{auto.clientes?.nombre || 'Sin asignar'}</span>
                        </div>
                        {auto.ceco && <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> CECO: {auto.ceco}</p>}
                      </td>

                      {/* COLUMNA: Telemetría */}
                      <td className="p-4 align-middle">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100">
                            <Gauge className="w-3.5 h-3.5 text-blue-500" /> {auto.kilometraje_actual?.toLocaleString('es-CL')} KM
                          </div>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded w-fit border border-slate-100">
                            <Calendar className="w-3.5 h-3.5 text-orange-500" /> RT: {auto.fecha_revision_tecnica ? new Date(auto.fecha_revision_tecnica).toLocaleDateString('es-CL') : 'Sin Registro'}
                          </div>
                        </div>
                      </td>

                      {/* COLUMNA: Acciones */}
                      <td className="p-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditModal(auto)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"><Edit className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete(auto.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* MODO MÓVIL (TARJETAS) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredAutos.map((auto) => {
              const isEmpresa = auto.clientes?.tipo === 'Empresa';

              return (
                <div key={auto.id} className="p-5 hover:bg-slate-50 transition-colors relative overflow-hidden">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isEmpresa ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                  
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div className="bg-slate-900 text-white font-mono font-black text-lg px-3 py-1 rounded-xl shadow-sm tracking-widest">{auto.patente}</div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(auto)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg"><Edit className="w-4 h-4"/></button>
                    </div>
                  </div>
                  
                  <div className="pl-2">
                    <h3 className="font-bold text-lg text-slate-800 uppercase leading-tight mb-1">{auto.marca} <span className="font-normal text-slate-600">{auto.modelo}</span></h3>
                    <div className="flex items-center text-xs font-bold text-slate-500 mb-4 gap-1">
                      {isEmpresa ? <Building2 className="w-3.5 h-3.5"/> : <User className="w-3.5 h-3.5"/>}
                      {auto.clientes?.nombre || 'Sin dueño asignado'}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <div className="flex items-center justify-center text-xs font-bold text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100"><Gauge className="w-3.5 h-3.5 mr-1.5 text-blue-500" />{auto.kilometraje_actual?.toLocaleString('es-CL')}</div>
                      <div className="flex items-center justify-center text-[10px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100"><Calendar className="w-3.5 h-3.5 mr-1 text-orange-500" />{auto.fecha_revision_tecnica ? new Date(auto.fecha_revision_tecnica).toLocaleDateString('es-CL') : 'Sin RT'}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FORMULARIO MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-bounce-in flex flex-col max-h-[95vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg flex items-center gap-2">{isEditing ? <><Edit className="w-5 h-5"/> Editar Vehículo</> : <><Car className="w-5 h-5"/> Nuevo Vehículo</>}</h3>
              <button onClick={() => setShowForm(false)} className="hover:text-red-400 bg-slate-800 p-1 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="text-xs font-black text-slate-500 uppercase block mb-2 flex items-center gap-2 tracking-widest"><User className="w-4 h-4 text-brand-primary" /> Propietario o Flota asignada</label>
                <select className="w-full p-3.5 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none focus:border-blue-500" value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})} required>
                  <option value="">-- Seleccionar Cliente --</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 mb-4 border-b border-slate-100 pb-2 uppercase tracking-widest text-sm flex items-center gap-2"><Car className="w-4 h-4 text-slate-400"/> Datos Técnicos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Patente / Matrícula</label>
                    <input required placeholder="ABCD12" className="w-full p-4 border-2 border-slate-200 rounded-xl mt-1 font-mono uppercase font-black text-2xl tracking-[0.2em] text-slate-900 outline-none focus:border-blue-500 text-center bg-slate-50" value={formData.patente} onChange={e => setFormData({...formData, patente: e.target.value.toUpperCase()})} maxLength={6}/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">VIN / Chasis</label>
                    <input placeholder="17 Caracteres" className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1 font-mono uppercase font-bold outline-none focus:border-blue-500 bg-slate-50" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value.toUpperCase()})}/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Año</label>
                    <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1 font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50" value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Marca</label>
                    <input list="marcas-list" placeholder="Ej: Toyota" className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1 uppercase font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})}/>
                    <datalist id="marcas-list">{carBrands.map(brand => <option key={brand} value={brand} />)}</datalist>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Modelo</label>
                    <input list="modelos-list" placeholder="Ej: Yaris" className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1 uppercase font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})}/>
                    <datalist id="modelos-list">{carModels[formData.marca]?.map(model => <option key={model} value={model} />)}</datalist>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Color</label>
                    <input placeholder="Rojo" className="w-full p-3 border-2 border-slate-200 rounded-xl mt-1 uppercase font-bold text-slate-700 outline-none focus:border-blue-500 bg-slate-50" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}/>
                  </div>
                </div>
              </div>

              {/* DATOS ADMINISTRATIVOS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 mb-4 border-b border-slate-100 pb-2 uppercase tracking-widest text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" /> Administración y Flota
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">N° de Motor</label>
                    <input placeholder="Código del motor" className="w-full p-3 border-2 border-slate-200 rounded-xl font-mono uppercase bg-slate-50 outline-none focus:border-indigo-500 font-bold" value={formData.numero_motor} onChange={e => setFormData({...formData, numero_motor: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Centro de Costo (CECO)</label>
                    <input placeholder="Ej: Sucursal Norte / Reparto" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-500 font-bold text-slate-700" value={formData.ceco} onChange={e => setFormData({...formData, ceco: e.target.value})} />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tasación Comercial (CLP)</label>
                    <div className="relative">
                      <DollarSign className="w-5 h-5 absolute left-4 top-3.5 text-slate-400"/>
                      <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="Sin puntos ni comas" className="w-full pl-12 p-3 border-2 border-slate-200 rounded-xl text-green-700 font-black text-lg outline-none focus:border-green-500 bg-slate-50" value={formData.tasacion} onChange={e => setFormData({...formData, tasacion: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* MANTENIMIENTO PREDICTIVO */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 mb-4 border-b border-slate-100 pb-2 uppercase tracking-widest text-sm flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-orange-500" /> Control y Mantenimiento
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Odómetro Actual</label>
                    <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 font-mono font-bold text-lg outline-none focus:border-orange-500" value={formData.kilometraje_actual} onChange={e => setFormData({...formData, kilometraje_actual: e.target.value})}/>
                    <p className="text-[9px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest">Auto-actualizable con órdenes.</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Venc. Rev. Técnica</label>
                      <button type="button" onClick={calcularVencimientoRT} className="text-[9px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest flex items-center gap-1 transition-colors border border-indigo-200 shadow-sm active:scale-95">
                        <Wand2 className="w-3 h-3"/> Magia RT
                      </button>
                    </div>
                    <input type="date" className="w-full p-3 border-2 border-slate-200 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none focus:border-orange-500 mt-1" value={formData.fecha_revision_tecnica} onChange={e => setFormData({...formData, fecha_revision_tecnica: e.target.value})}/>
                  </div>
                </div>
              </div>

            </form>
            
            {/* FOOTER ACCIONES */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
              {isEditing ? <button type="button" onClick={() => handleDelete(editId)} className="text-red-500 hover:bg-red-50 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 text-sm transition-colors"><Trash2 className="w-4 h-4"/> Borrar</button> : <div></div>}
              <div className="flex gap-3 w-full sm:w-auto">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 sm:flex-none px-5 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-bold transition-colors">Cancelar</button>
                <button onClick={handleSubmit} className="flex-1 sm:flex-none px-8 py-3 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl shadow-xl hover:bg-slate-800 transition-transform active:scale-95">
                  {isEditing ? 'Guardar Auto' : 'Registrar Auto'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}