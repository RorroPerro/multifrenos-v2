import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Car, User, Search, X, Loader2, Edit, Calendar, Gauge, Trash2, Wand2 } from 'lucide-react'
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
    color: '', vin: '', cliente_id: '', kilometraje_actual: 0, vencimiento_revision: ''
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

    // Si el mes de la revisión ya pasó este año, corresponde al próximo año
    if (mesRT < (hoy.getMonth() + 1)) {
      anioRT += 1
    }

    // Calcular el último día exacto de ese mes (ej: 28, 30 o 31)
    const ultimoDia = new Date(anioRT, mesRT, 0).getDate()
    
    // Formato YYYY-MM-DD para el input type="date"
    const mesStr = mesRT.toString().padStart(2, '0')
    const diaStr = ultimoDia.toString().padStart(2, '0')
    const fechaCalculada = `${anioRT}-${mesStr}-${diaStr}`

    setFormData(prev => ({...prev, vencimiento_revision: fechaCalculada}))
  }

  // --- ABRIR MODALES ---
  const openCreateModal = () => {
    setIsEditing(false); setEditId(null)
    setFormData({ patente: '', marca: '', modelo: '', anio: new Date().getFullYear(), color: '', vin: '', cliente_id: '', kilometraje_actual: 0, vencimiento_revision: '' })
    setShowForm(true)
  }

  const openEditModal = (auto) => {
    setIsEditing(true); setEditId(auto.id)
    setFormData({
      patente: auto.patente || '', marca: auto.marca || '', modelo: auto.modelo || '', anio: auto.anio || '', color: auto.color || '', vin: auto.vin || '',
      cliente_id: auto.cliente_id || '', kilometraje_actual: auto.kilometraje_actual || 0, vencimiento_revision: auto.vencimiento_revision || ''
    })
    setShowForm(true)
  }

  // --- GUARDAR Y BORRAR ---
  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.cliente_id) return alert('Debes asignar un dueño al vehículo')

    const datosLimpios = { ...formData, patente: formData.patente.toUpperCase(), vin: formData.vin.toUpperCase() }
    if (!datosLimpios.vencimiento_revision) datosLimpios.vencimiento_revision = null

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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
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
                <h4 className="font-bold text-slate-700 mb-3 border-b pb-2">Datos Técnicos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Patente</label>
                    <input required placeholder="ABCD12" className="w-full p-2 border rounded font-mono uppercase" value={formData.patente} onChange={e => setFormData({...formData, patente: e.target.value.toUpperCase()})} maxLength={6}/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">VIN / Chasis</label>
                    <input placeholder="17 Caracteres" className="w-full p-2 border rounded font-mono uppercase" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value.toUpperCase()})}/>
                  </div>
                  {/* --- CÓDIGO ACTUALIZADO DE MARCA Y MODELO --- */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Marca</label>
                    <input 
                      list="marcas-list"
                      placeholder="Ej: Toyota" 
                      className="w-full p-2 border rounded" 
                      value={formData.marca} 
                      onChange={e => setFormData({...formData, marca: e.target.value})}
                    />
                    <datalist id="marcas-list">
                      {carBrands.map(brand => <option key={brand} value={brand} />)}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Modelo</label>
                    <input 
                      list="modelos-list"
                      placeholder="Ej: Yaris" 
                      className="w-full p-2 border rounded" 
                      value={formData.modelo} 
                      onChange={e => setFormData({...formData, modelo: e.target.value})}
                    />
                    <datalist id="modelos-list">
                      {/* Si la marca existe en nuestro diccionario, mostramos sus modelos */}
                      {carModels[formData.marca]?.map(model => (
                        <option key={model} value={model} />
                      ))}
                    </datalist>
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Año</label><input type="number" className="w-full p-2 border rounded" value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})}/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Color</label><input placeholder="Rojo" className="w-full p-2 border rounded" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})}/></div>
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
                      
                      {/* --- EL BOTÓN MAGICO --- */}
                      <button 
                        type="button" 
                        onClick={calcularVencimientoRT}
                        className="text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors border border-indigo-200"
                      >
                        <Wand2 className="w-3 h-3"/> Auto-Calcular
                      </button>

                    </div>
                    <input type="date" className="w-full p-2 border rounded bg-slate-50" value={formData.vencimiento_revision} onChange={e => setFormData({...formData, vencimiento_revision: e.target.value})}/>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex justify-between items-center">
                {isEditing ? <button type="button" onClick={() => handleDelete(editId)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded flex items-center gap-2 text-sm"><Trash2 className="w-4 h-4"/> Borrar</button> : <div></div>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium">Cancelar</button>
                  <button type="submit" className="px-6 py-2 bg-brand-primary text-white font-bold rounded shadow-md hover:bg-blue-700">
                    {isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LISTA DE AUTOS */}
      {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-slate-400"/></div> : filteredAutos.length === 0 ? <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200"><Car className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No hay vehículos registrados o no coinciden</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAutos.map((auto) => (
            <div key={auto.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-all group relative">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-slate-900 text-white font-mono font-bold text-lg px-3 py-1 rounded shadow-inner">{auto.patente}</div>
                <button onClick={() => openEditModal(auto)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit className="w-5 h-5" /></button>
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-1">{auto.marca} <span className="font-normal text-slate-600">{auto.modelo}</span></h3>
              <div className="space-y-2 mt-4">
                <div className="flex items-center text-sm text-slate-600 bg-slate-50 p-2 rounded"><User className="w-4 h-4 mr-2 text-slate-400" /><span className="font-medium truncate">Dueño: {auto.clientes?.nombre || 'No asignado'}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100"><Gauge className="w-3 h-3 mr-1.5 text-blue-500" />{auto.kilometraje_actual?.toLocaleString('es-CL')} km</div>
                  <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100"><Calendar className="w-3 h-3 mr-1.5 text-orange-500" />{auto.vencimiento_revision ? new Date(auto.vencimiento_revision).toLocaleDateString('es-CL') : 'Sin RT'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}