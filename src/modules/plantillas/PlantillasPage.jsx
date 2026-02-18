import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Plus, Trash2, Edit, Save, X, ClipboardList, Loader2, GripVertical, CheckCircle } from 'lucide-react'

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  
  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    estructura: []
  })

  useEffect(() => {
    fetchPlantillas()
  }, [])

  async function fetchPlantillas() {
    setLoading(true)
    const { data, error } = await supabase.from('plantillas_inspeccion').select('*').order('created_at', { ascending: false })
    if (!error) setPlantillas(data)
    setLoading(false)
  }

  // --- FUNCIONES DEL CONSTRUCTOR DE PLANTILLAS ---
  const addCategoria = () => {
    setFormData({
      ...formData,
      estructura: [...formData.estructura, { id: Date.now().toString(), titulo: '', items: [''] }]
    })
  }

  const updateCategoria = (catId, newTitulo) => {
    setFormData({
      ...formData,
      estructura: formData.estructura.map(cat => cat.id === catId ? { ...cat, titulo: newTitulo } : cat)
    })
  }

  const removeCategoria = (catId) => {
    setFormData({
      ...formData,
      estructura: formData.estructura.filter(cat => cat.id !== catId)
    })
  }

  const addItem = (catId) => {
    setFormData({
      ...formData,
      estructura: formData.estructura.map(cat => cat.id === catId ? { ...cat, items: [...cat.items, ''] } : cat)
    })
  }

  const updateItem = (catId, itemIndex, newValue) => {
    setFormData({
      ...formData,
      estructura: formData.estructura.map(cat => {
        if (cat.id === catId) {
          const newItems = [...cat.items]
          newItems[itemIndex] = newValue
          return { ...cat, items: newItems }
        }
        return cat
      })
    })
  }

  const removeItem = (catId, itemIndex) => {
    setFormData({
      ...formData,
      estructura: formData.estructura.map(cat => {
        if (cat.id === catId) {
          const newItems = cat.items.filter((_, index) => index !== itemIndex)
          return { ...cat, items: newItems }
        }
        return cat
      })
    })
  }

  // --- FUNCIONES DE GUARDADO ---
  const openCreateModal = () => {
    setIsEditing(false)
    setEditId(null)
    setFormData({ nombre: '', descripcion: '', estructura: [{ id: Date.now().toString(), titulo: 'CATEGORÍA 1', items: ['Nuevo Ítem'] }] })
    setShowModal(true)
  }

  const openEditModal = (plantilla) => {
    setIsEditing(true)
    setEditId(plantilla.id)
    setFormData({ nombre: plantilla.nombre, descripcion: plantilla.descripcion, estructura: plantilla.estructura })
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.nombre) return alert('Ponle un nombre a la plantilla')
    
    // Limpiamos ítems vacíos antes de guardar
    const estructuraLimpia = formData.estructura.map(cat => ({
      ...cat,
      items: cat.items.filter(item => item.trim() !== '')
    })).filter(cat => cat.titulo.trim() !== '' && cat.items.length > 0)

    const dataToSave = {
      nombre: formData.nombre,
      descripcion: formData.descripcion,
      estructura: estructuraLimpia
    }

    if (isEditing) {
      await supabase.from('plantillas_inspeccion').update(dataToSave).eq('id', editId)
    } else {
      await supabase.from('plantillas_inspeccion').insert([dataToSave])
    }

    setShowModal(false)
    fetchPlantillas()
  }

  async function handleDelete(id) {
    if (!confirm('¿Borrar esta plantilla? Ya no se podrá usar en nuevas órdenes.')) return
    await supabase.from('plantillas_inspeccion').delete().eq('id', id)
    fetchPlantillas()
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="w-6 h-6 text-brand-primary"/> Plantillas de Inspección</h1>
          <p className="text-slate-500 text-sm">Crea y edita los checklists que usarán los mecánicos.</p>
        </div>
        <button onClick={openCreateModal} className="bg-brand-primary text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg">
          <Plus className="w-5 h-5"/> Crear Plantilla
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-primary w-8 h-8"/></div>
      ) : plantillas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Aún no has creado ninguna plantilla de inspección.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.map(plantilla => (
            <div key={plantilla.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{plantilla.nombre}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mt-1">{plantilla.descripcion}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">{plantilla.estructura.length} Categorías</span>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">{plantilla.estructura.reduce((acc, cat) => acc + cat.items.length, 0)} Puntos a revisar</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => openEditModal(plantilla)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-5 h-5"/></button>
                <button onClick={() => handleDelete(plantilla.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DEL CONSTRUCTOR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg">{isEditing ? 'Editar Plantilla' : 'Nueva Plantilla de Inspección'}</h3>
              <button onClick={() => setShowModal(false)} className="hover:text-red-400 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
              {/* Datos Básicos */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre de la Plantilla</label>
                    <input autoFocus placeholder="Ej: Inspección de Frenos General" className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Descripción (Opcional)</label>
                    <input placeholder="Breve descripción del propósito de esta revisión..." className="w-full p-2.5 border rounded-lg mt-1 outline-none focus:border-blue-500 text-sm" value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Constructor Dinámico */}
              <div className="space-y-4">
                <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2 border-b pb-2">
                  Estructura del Checklist
                </h4>

                {formData.estructura.map((categoria) => (
                  <div key={categoria.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header Categoría */}
                    <div className="bg-slate-800 p-3 flex gap-3 items-center">
                      <GripVertical className="w-5 h-5 text-slate-500 cursor-move" />
                      <input 
                        className="flex-1 bg-transparent border-b border-slate-600 text-white font-bold outline-none focus:border-blue-400 uppercase placeholder:text-slate-500" 
                        placeholder="NOMBRE CATEGORÍA (Ej: FRENOS DELANTEROS)" 
                        value={categoria.titulo} 
                        onChange={(e) => updateCategoria(categoria.id, e.target.value.toUpperCase())} 
                      />
                      <button onClick={() => removeCategoria(categoria.id)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 className="w-4 h-4"/></button>
                    </div>

                    {/* Items Categoría */}
                    <div className="p-4 space-y-2">
                      {categoria.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex gap-2 items-center group">
                          <CheckCircle className="w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                          <input 
                            className="flex-1 p-2 border border-slate-200 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                            placeholder="Punto a revisar (Ej: Estado de pastillas)" 
                            value={item} 
                            onChange={(e) => updateItem(categoria.id, itemIndex, e.target.value)} 
                          />
                          <button onClick={() => removeItem(categoria.id, itemIndex)} className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                        </div>
                      ))}
                      <button onClick={() => addItem(categoria.id)} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-3 ml-6">
                        <Plus className="w-4 h-4"/> Añadir punto de revisión
                      </button>
                    </div>
                  </div>
                ))}

                <button onClick={addCategoria} className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-xl hover:bg-slate-100 hover:border-slate-400 transition-all flex justify-center items-center gap-2">
                  <Plus className="w-5 h-5"/> AGREGAR NUEVA CATEGORÍA
                </button>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="bg-white p-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} className="px-6 py-2.5 bg-green-500 text-white font-bold rounded-lg shadow-lg hover:bg-green-600 transition-colors flex items-center gap-2">
                <Save className="w-5 h-5" /> Guardar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}