import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Car, User, Search, X, Loader2, Edit, Calendar, Gauge, Trash2, Wand2, ShieldCheck, DollarSign, MapPin, Hash } from 'lucide-react'
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
    const { data: autosData } = await supabase.from('autos').select('*, clientes(nombre)').order('created_at', { ascending: false })
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
    const mapaMeses = {
      0: 2,  // Febrero
      1: 4,  // Abril
      2: 5,  // Mayo
      3: 6,  // Junio
      4: 7,  // Julio
      5: 8,  // Agosto
      6: 9,  // Septiembre
      7: 10, // Octubre
      8: 11, // Noviembre
      9: 1   // Enero
    }

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
      fecha_revision_tecnica: auto.fecha_revision_tecnica || auto.vencimiento_revision || '', // Compatibilidad
      numero_motor: auto.numero_motor || '', ceco: auto.ceco || '', tasacion: auto.tasacion || ''
    })
    setShowForm(true)
  }

  // --- GUARDAR Y BORRAR ---
  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.cliente_id) return alert('Debes asignar un dueño al vehículo')

    const datosLimpios = { ...formData, patente: formData.patente.toUpperCase(), vin: formData.vin.toUpperCase() }
    
    // Limpieza de campos numéricos y fechas vacías
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
      
      {/* HEADER Y BUSCADOR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Parque Automotriz</h1>
          <p className="text-slate-500 text-sm">Gestiona la flota de tus clientes</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input placeholder="Buscar patente o cliente..." className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={openCreateModal} className="bg-brand-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-blue-700 whitespace-nowrap">
            <Plus className="w-5 h-5" /> Registrar
          </button>
        </div>
      </div>

      {/* FORMULARIO MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in flex flex-col max-h-[95vh]">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg">{isEditing ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="text-xs font-bold text-blue-800 uppercase block mb-2 flex items-center gap-2"><User className="w-4 h-4" /> Propietario del Vehículo</label>
                <select className="w-full p-3 border rounded bg-white font-medium" value={formData.cliente_id} onChange={e => setFormData({...formData, cliente_id: e.target.value})} required>
                  <option value="">-- Seleccionar Cliente --</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-3 border-b pb-2">Datos Técnicos Principales</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Patente</label>
                    <input required placeholder="ABCD12" className="w-full p-2 border rounded font-mono uppercase font-bold text-lg tracking-widest text-slate-900" value={formData.patente} onChange={e => setFormData({...formData, patente: e.target.value.toUpperCase()})} maxLength={6}/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">VIN / Chasis</label>
                    <input placeholder="17 Caracteres" className="w-full p-2 border rounded font-mono uppercase" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value.toUpperCase()})}/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Marca</label>
                    <input list="marcas-list" placeholder="Ej: Toyota" className="w-full p-2 border rounded uppercase" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})}/>
                    <datalist id="marcas-list">{carBrands.map(brand => <option key={brand} value={brand} />)}</datalist>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Modelo</label>
                    <input list="modelos-list" placeholder="Ej: Yaris" className="w-full p-2 border rounded uppercase" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})}/>
                    <datalist id="modelos-list">{carModels[formData.marca]?.map(model => <option key={model} value={model} />)}</datalist>
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Año</label><input type="number" className="w-full p-2 border rounded" value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Color</label><input placeholder="Rojo" className="w-full p-2 border rounded" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}/></div>
                </div>
              </div>

              {/* NUEVA SECCIÓN: DATOS ADMINISTRATIVOS */}
              <div>
                <h4 className="font-bold text-slate-700 mb-3 border-b pb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-500" /> Datos Administrativos y Flota
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">N° de Motor</label>
                    <input placeholder="Código del motor" className="w-full p-2 border rounded font-mono uppercase" value={formData.numero_motor} onChange={e => setFormData({...formData, numero_motor: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Centro de Costo (CECO)</label>
                    <input placeholder="Ej: Sucursal Norte / Reparto" className="w-full p-2 border rounded" value={formData.ceco} onChange={e => setFormData({...formData, ceco: e.target.value})} />
                  </div>
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Tasación Comercial (CLP)</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-400"/>
                      <input type="number" placeholder="Sin puntos ni comas" className="w-full pl-9 p-2 border rounded text-green-700 font-bold outline-none focus:border-green-500" value={formData.tasacion} onChange={e => setFormData({...formData, tasacion: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* MANTENIMIENTO PREDICTIVO CON BOTON MÁGICO */}
              <div>
                <h4 className="font-bold text-slate-700 mb-3 border-b pb-2 flex items-center gap-2">
                  <Gauge className="w-4 h-4" /> Mantenimiento & Control
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Kilometraje Actual</label>
                    <input type="number" className="w-full p-2 border rounded bg-slate-50 font-mono" value={formData.kilometraje_actual} onChange={e => setFormData({...formData, kilometraje_actual: e.target.value})}/>
                    <p className="text-[10px] text-slate-400 mt-1">Se actualiza automático con las órdenes.</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Vencimiento Rev. Técnica</label>
                      <button type="button" onClick={calcularVencimientoRT} className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors border border-indigo-200">
                        <Wand2 className="w-3 h-3"/> Auto-Calcular
                      </button>
                    </div>
                    <input type="date" className="w-full p-2 border rounded bg-slate-50" value={formData.fecha_revision_tecnica} onChange={e => setFormData({...formData, fecha_revision_tecnica: e.target.value})}/>
                  </div>
                </div>
              </div>

            </form>
            
            <div className="p-4 border-t bg-slate-50 flex justify-between items-center shrink-0">
              {isEditing ? <button type="button" onClick={() => handleDelete(editId)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded flex items-center gap-2 text-sm"><Trash2 className="w-4 h-4"/> Borrar</button> : <div></div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium">Cancelar</button>
                <button onClick={handleSubmit} className="px-6 py-2 bg-brand-primary text-white font-bold rounded shadow-md hover:bg-blue-700">
                  {isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LISTA DE AUTOS */}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div> : filteredAutos.length === 0 ? <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200"><Car className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No hay vehículos registrados o no coinciden</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAutos.map((auto) => (
            <div key={auto.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group relative flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-slate-900 text-white font-mono font-bold text-lg px-3 py-1 rounded shadow-inner tracking-widest">{auto.patente}</div>
                <button onClick={() => openEditModal(auto)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit className="w-5 h-5" /></button>
              </div>
              
              <h3 className="font-bold text-xl text-slate-800 mb-1 uppercase">{auto.marca} <span className="font-normal text-slate-600">{auto.modelo}</span></h3>
              
              <div className="flex items-center text-sm text-slate-600 bg-slate-50 p-2 rounded mb-3"><User className="w-4 h-4 mr-2 text-slate-400" /><span className="font-medium truncate">Dueño: {auto.clientes?.nombre || 'No asignado'}</span></div>
              
              {/* Info Administrativa si existe */}
              {(auto.vin || auto.numero_motor || auto.ceco || auto.tasacion) && (
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mb-3 border-y border-slate-100 py-3">
                  {auto.vin && <div className="flex items-center gap-1"><Hash className="w-3 h-3 text-slate-400"/> VIN: {auto.vin.substring(auto.vin.length - 6)}</div>}
                  {auto.ceco && <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400"/> {auto.ceco}</div>}
                  {auto.tasacion && <div className="flex items-center gap-1 col-span-2 font-bold text-green-700"><DollarSign className="w-3 h-3"/> Tasación: {money(auto.tasacion)}</div>}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="flex items-center text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded border border-slate-100"><Gauge className="w-3.5 h-3.5 mr-1.5 text-blue-500" />{auto.kilometraje_actual?.toLocaleString('es-CL')} km</div>
                <div className="flex items-center text-xs font-bold text-slate-600 bg-slate-50 p-2 rounded border border-slate-100"><Calendar className="w-3.5 h-3.5 mr-1.5 text-orange-500" />{auto.fecha_revision_tecnica ? new Date(auto.fecha_revision_tecnica).toLocaleDateString('es-CL') : 'Sin RT'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}