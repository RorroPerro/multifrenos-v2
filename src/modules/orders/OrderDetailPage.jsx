import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { PDFDownloadLink } from '@react-pdf/renderer'
import OrdenPDF from '../../components/OrdenPDF'
import { Car, ArrowLeft, Fuel, Gauge, FileText, Plus, Trash2, Printer, Loader2, Clock, CheckCircle, Save, MessageCircle, Camera, Image as ImageIcon, X, ClipboardCheck, ChevronDown, ChevronUp, Receipt, Search, Box, Settings2 } from 'lucide-react'
import ProyeccionesFlota from '../../components/ProyeccionesFlota' 

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [catalogServices, setCatalogServices] = useState([])
  const [orderDetails, setOrderDetails] = useState([])
  const [orderPhotos, setOrderPhotos] = useState([]) 
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  
  const [plantillas, setPlantillas] = useState([])
  const [inspecciones, setInspecciones] = useState([])
  const [selectedPlantillaId, setSelectedPlantillaId] = useState('')
  const [activeInspeccionData, setActiveInspeccionData] = useState(null)
  const [catAbierta, setCatAbierta] = useState(null)

  const [activeTab, setActiveTab] = useState(null) 
  const [checklist, setChecklist] = useState({ kilometraje: 0, nivel_combustible: 50, observaciones_recepcion: '' })
  const [carEdits, setCarEdits] = useState({})
  const fileInputRef = useRef(null) 
  const [carForProjections, setCarForProjections] = useState(null)

  // --- ESTADOS AGREGAR ÍTEMS PRINCIPALES ---
  const [inventory, setInventory] = useState([])
  const [addItemType, setAddItemType] = useState('servicio')
  const [searchServiceTerm, setSearchServiceTerm] = useState('')
  const [selectedService, setSelectedService] = useState(null)
  const [manualItem, setManualItem] = useState({ nombre: '', precio: '' })

  // --- ESTADOS PARA ANIDAR INSUMOS ---
  const [nestingInItemId, setNestingInItemId] = useState(null)
  const [searchNestTerm, setSearchNestTerm] = useState('')
  const [selectedNestInv, setSelectedNestInv] = useState(null)
  

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    const { data: orderData, error } = await supabase
      .from('ordenes')
      .select(`*, clientes ( nombre, tipo, telefono, email, rut, token_flota ), orden_autos ( id, kilometraje, nivel_combustible, observaciones_recepcion, autos ( id, patente, marca, modelo, anio, vin, color, bateria_mes, bateria_anio, dot_di, dot_dd, dot_ti, dot_td, fecha_revision_tecnica, prox_cambio_aceite, prox_cambio_frenos ) )`)
      .eq('id', id)
      .single()

    if (error) { navigate('/ordenes'); return }

    const { data: detailsData } = await supabase.from('orden_detalle').select('*').eq('orden_id', id)
    const { data: servicesData } = await supabase.from('servicios').select('*').order('nombre')
    const { data: photosData } = await supabase.from('orden_fotos').select('*').eq('orden_id', id)
    const { data: plantillasData } = await supabase.from('plantillas_inspeccion').select('*')
    const { data: inspeccionesData } = await supabase.from('orden_inspecciones').select('*').eq('orden_id', id)
    const { data: invData } = await supabase.from('inventario').select('*').order('nombre')

    setOrder(orderData)
    setOrderDetails(detailsData || [])
    setCatalogServices(servicesData || [])
    setOrderPhotos(photosData || [])
    setPlantillas(plantillasData || [])
    setInspecciones(inspeccionesData || [])
    setInventory(invData || [])

    const initialEdits = {}
    if (orderData.orden_autos) {
      orderData.orden_autos.forEach(rel => {
        initialEdits[rel.autos.id] = {
          anio: rel.autos.anio || '', vin: rel.autos.vin || '', color: rel.autos.color || ''
        }
      })
    }
    setCarEdits(initialEdits)

    if (orderData.orden_autos?.length > 0) {
      setupActiveCar(orderData.orden_autos[0], inspeccionesData || [])
    }
    setLoading(false)
  }

  const setupActiveCar = (rel, allInspections = inspecciones) => {
    setActiveTab(rel.autos.id)
    setChecklist({ kilometraje: rel.kilometraje || 0, nivel_combustible: rel.nivel_combustible || 50, observaciones_recepcion: rel.observaciones_recepcion || '' })
    const inspeccionDelAuto = allInspections.find(i => i.auto_id === rel.autos.id)
    setActiveInspeccionData(inspeccionDelAuto || null)
  }

  // --- LÓGICA DE ITEMS PRINCIPALES ---
  async function addItem() {
    let newItem = { orden_id: order.id, auto_id: activeTab, cantidad: 1, insumos_anidados: [] }

    if (addItemType === 'servicio') {
      if (!selectedService) return alert('Busca y selecciona un servicio de la lista primero.')
      const mo = Number(selectedService.precio_mano_obra) || 0; const rep = Number(selectedService.precio_repuestos) || 0;
      newItem = { ...newItem, tipo_item: 'servicio', servicio_nombre: selectedService.nombre, precio_unitario: mo + rep, total_linea: mo + rep }
    
    } else if (addItemType === 'manual') {
      if (!manualItem.nombre || !manualItem.precio) return alert('Completa nombre y precio')
      const precioManual = Number(manualItem.precio) || 0;
      newItem = { ...newItem, tipo_item: 'manual', servicio_nombre: manualItem.nombre, precio_unitario: precioManual, total_linea: precioManual }
    }

    const { data, error } = await supabase.from('orden_detalle').insert([newItem]).select().single()
    if (error) return alert('Error en la base de datos: ' + error.message)

    if (data) {
      const newDetails = [...orderDetails, data]
      setOrderDetails(newDetails)
      updateOrderTotal(newDetails)
    }
    
    setSearchServiceTerm(''); setSelectedService(null); setManualItem({nombre: '', precio: ''})
  }

  async function deleteItem(itemId) {
    if(!confirm('¿Borrar este ítem de la orden? (Se devolverán los insumos anidados a bodega)')) return
    const itemToDelete = orderDetails.find(d => d.id === itemId)

    if (itemToDelete?.insumos_anidados?.length > 0) {
      for (const anidado of itemToDelete.insumos_anidados) {
        const invAnidado = inventory.find(i => i.id === anidado.inventario_id)
        if (invAnidado) {
          const restoredStockAnidado = (Number(invAnidado.stock_actual) || 0) + 1
          await supabase.from('inventario').update({ stock_actual: restoredStockAnidado }).eq('id', invAnidado.id)
          setInventory(prev => prev.map(i => i.id === invAnidado.id ? { ...i, stock_actual: restoredStockAnidado } : i))
        }
      }
    }

    await supabase.from('orden_detalle').delete().eq('id', itemId)
    const newDetails = orderDetails.filter(d => d.id !== itemId)
    setOrderDetails(newDetails)
    updateOrderTotal(newDetails)
  }

  // --- LÓGICA DE INSUMOS ANIDADOS (LA MAGIA) ---
  async function addNestedInsumo(parentDetailId) {
    if (!selectedNestInv) return alert('Busca y selecciona un repuesto primero')
    
    const parentDetail = orderDetails.find(d => d.id === parentDetailId)
    const currentAnidados = parentDetail.insumos_anidados || []
    const precioInsumo = Number(selectedNestInv.precio_venta) || 0

    const newInsumo = {
      id: Date.now().toString(),
      inventario_id: selectedNestInv.id,
      nombre: selectedNestInv.nombre,
      categoria: selectedNestInv.categoria || 'Repuesto',
      precio: precioInsumo
    }

    const newAnidados = [...currentAnidados, newInsumo]
    const newTotalLinea = (Number(parentDetail.total_linea) || 0) + precioInsumo

    const { error } = await supabase.from('orden_detalle').update({ 
      insumos_anidados: newAnidados, 
      total_linea: newTotalLinea 
    }).eq('id', parentDetailId)

    if (error) return alert('Error al guardar el insumo: ' + error.message)

    const newStock = (Number(selectedNestInv.stock_actual) || 0) - 1
    await supabase.from('inventario').update({ stock_actual: newStock }).eq('id', selectedNestInv.id)
    setInventory(inventory.map(i => i.id === selectedNestInv.id ? { ...i, stock_actual: newStock } : i))

    const newDetails = orderDetails.map(d => d.id === parentDetailId ? { ...d, insumos_anidados: newAnidados, total_linea: newTotalLinea } : d)
    setOrderDetails(newDetails)
    updateOrderTotal(newDetails)
    
    setSearchNestTerm('')
    setSelectedNestInv(null)
    setNestingInItemId(null)
  }

  async function removeNestedInsumo(parentDetailId, insumoIdToRemove) {
    if (!confirm('¿Quitar este repuesto y devolverlo a bodega?')) return
    
    const parentDetail = orderDetails.find(d => d.id === parentDetailId)
    const insumoToRemove = parentDetail.insumos_anidados.find(i => i.id === insumoIdToRemove)
    const newAnidados = parentDetail.insumos_anidados.filter(i => i.id !== insumoIdToRemove)
    const newTotalLinea = (Number(parentDetail.total_linea) || 0) - (Number(insumoToRemove.precio) || 0)

    const { error } = await supabase.from('orden_detalle').update({ 
      insumos_anidados: newAnidados, 
      total_linea: newTotalLinea 
    }).eq('id', parentDetailId)

    if (error) return alert('Error al quitar insumo: ' + error.message)

    const invItem = inventory.find(i => i.id === insumoToRemove.inventario_id)
    if (invItem) {
      const restoredStock = (Number(invItem.stock_actual) || 0) + 1
      await supabase.from('inventario').update({ stock_actual: restoredStock }).eq('id', invItem.id)
      setInventory(inventory.map(i => i.id === invItem.id ? { ...i, stock_actual: restoredStock } : i))
    }

    const newDetails = orderDetails.map(d => d.id === parentDetailId ? { ...d, insumos_anidados: newAnidados, total_linea: newTotalLinea } : d)
    setOrderDetails(newDetails)
    updateOrderTotal(newDetails)
  }

  const filteredServices = searchServiceTerm.length > 1 && !selectedService ? catalogServices.filter(s => s.nombre.toLowerCase().includes(searchServiceTerm.toLowerCase())) : []
  const filteredNestInventory = searchNestTerm.length > 1 && !selectedNestInv ? inventory.filter(i => i.nombre.toLowerCase().includes(searchNestTerm.toLowerCase()) || (i.sku && i.sku.toLowerCase().includes(searchNestTerm.toLowerCase()))) : []

  async function toggleIva() {
    const newValue = !order.incluye_iva
    const sumItems = orderDetails.reduce((sum, d) => sum + d.total_linea, 0)
    const newTotal = newValue ? Math.round(sumItems * 1.19) : sumItems
    const { error } = await supabase.from('ordenes').update({ incluye_iva: newValue, total: newTotal }).eq('id', order.id)
    if (!error) setOrder({ ...order, incluye_iva: newValue, total: newTotal })
  }

  async function updateOrderTotal(details, applyIva = order.incluye_iva) {
    const sumItems = details.reduce((sum, d) => sum + d.total_linea, 0)
    const newTotal = applyIva ? Math.round(sumItems * 1.19) : sumItems
    await supabase.from('ordenes').update({ total: newTotal }).eq('id', order.id)
    setOrder(prev => ({ ...prev, total: newTotal }))
  }

  const iniciarInspeccion = async () => {
    if (!selectedPlantillaId) return alert('Selecciona una plantilla primero')
    const template = plantillas.find(p => p.id === selectedPlantillaId)
    const nuevosResultados = template.estructura.map(cat => ({ id: cat.id, titulo: cat.titulo, items: cat.items.map(item => ({ nombre: item, estado: null, observacion: '', foto: null })) }))
    const newInspeccion = { orden_id: order.id, auto_id: activeTab, plantilla_id: template.id, resultados: nuevosResultados }
    const { data, error } = await supabase.from('orden_inspecciones').insert([newInspeccion]).select().single()
    if (!error) { setInspecciones([...inspecciones, data]); setActiveInspeccionData(data) }
  }

  const updateInspeccionItem = (catIndex, itemIndex, field, value) => {
    const newData = [...activeInspeccionData.resultados]
    newData[catIndex].items[itemIndex][field] = value
    setActiveInspeccionData({ ...activeInspeccionData, resultados: newData })
  }

  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleFotoChecklist = async (catIndex, itemIndex, e) => {
    const file = e.target.files[0]; if (!file) return
    const compressedBase64 = await resizeImage(file)
    updateInspeccionItem(catIndex, itemIndex, 'foto', compressedBase64)
  }

  const guardarInspeccion = async () => {
    const { error } = await supabase.from('orden_inspecciones').update({ resultados: activeInspeccionData.resultados }).eq('id', activeInspeccionData.id)
    if (!error) alert('✅ Informe de Inspección guardado correctamente')
  }

  const borrarInspeccion = async () => {
    if (!confirm('¿Estás seguro de borrar este informe?')) return
    await supabase.from('orden_inspecciones').delete().eq('id', activeInspeccionData.id)
    setInspecciones(inspecciones.filter(i => i.id !== activeInspeccionData.id)); setActiveInspeccionData(null)
  }

  async function deleteOrder() {
    if (!confirm('PELIGRO: ¿Estás seguro de eliminar esta orden completa?')) return
    await supabase.from('orden_fotos').delete().eq('orden_id', order.id)
    await supabase.from('orden_inspecciones').delete().eq('orden_id', order.id)
    await supabase.from('orden_detalle').delete().eq('orden_id', order.id)
    await supabase.from('orden_autos').delete().eq('orden_id', order.id)
    const { error } = await supabase.from('ordenes').delete().eq('id', order.id)
    if (!error) navigate('/ordenes')
  }

  async function saveChecklist() {
    const rel = order.orden_autos.find(r => r.autos.id === activeTab)
    const { error: e1 } = await supabase.from('orden_autos').update(checklist).eq('id', rel.id)
    const { error: e2 } = await supabase.from('autos').update({ kilometraje_actual: checklist.kilometraje }).eq('id', activeTab)
    if (!e1 && !e2) alert('✅ Recepción guardada')
  }

  async function updateCarDetails(carId) {
    const { error } = await supabase.from('autos').update(carEdits[carId]).eq('id', carId)
    if (!error) alert('✅ Perfil del Vehículo actualizado')
    else alert('Error: ' + error.message)
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    setUploadingPhoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `reparaciones/${order.id}_${activeTab}_${Math.random()}.${fileExt}`
      await supabase.storage.from('fotos-taller').upload(filePath, file)
      const { data: { publicUrl } } = supabase.storage.from('fotos-taller').getPublicUrl(filePath)
      const newPhoto = { orden_id: order.id, auto_id: activeTab, url: publicUrl, descripcion: 'Evidencia general' }
      const { data } = await supabase.from('orden_fotos').insert([newPhoto]).select().single()
      setOrderPhotos([...orderPhotos, data])
    } catch (error) { alert('Error: ' + error.message) } 
    finally { setUploadingPhoto(false); if (fileInputRef.current) fileInputRef.current.value = '' }
  }

  async function deletePhoto(photoId) {
    if(!confirm('¿Borrar esta foto de la orden?')) return
    await supabase.from('orden_fotos').delete().eq('id', photoId)
    setOrderPhotos(orderPhotos.filter(p => p.id !== photoId))
  }

  const handleSeguimiento = () => {
    if (!order.clientes?.telefono) return alert('⚠️ El cliente no tiene teléfono.')
    let phone = order.clientes.telefono.replace(/\D/g, ''); if (phone.length === 9) phone = '56' + phone;
    const patentes = order.orden_autos.map(rel => rel.autos.patente).join(', ');
    const trackingUrl = `${window.location.origin}/seguimiento/${order.id}`;
    const mensaje = `Hola *${order.clientes.nombre}*, somos del taller Multifrenos 🚗🔧.\nTu orden (Patente: *${patentes}*) está en estado: *${order.estado}*.\nPuedes ver el presupuesto aquí:\n${trackingUrl}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
  const activeCarItems = orderDetails.filter(d => d.auto_id === activeTab)
  const activeCarPhotos = orderPhotos.filter(p => p.auto_id === activeTab)
  
  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin w-10 h-10 text-brand-primary"/></div>
  if (!order) return null

  const activeCar = activeTab !== 'resumen' ? order.orden_autos.find(r => r.autos.id === activeTab)?.autos : null

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER Y TABS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => navigate('/ordenes')} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-500" /></button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">Orden #{order.id.slice(0,6).toUpperCase()}</h1>
            <p className="text-sm text-slate-500">{order.clientes?.nombre}</p>
          </div>
        </div>
        <span className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg font-bold border border-slate-200">Estado: {order.estado}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {order.orden_autos.map((rel) => (
          <button key={rel.id} onClick={() => setupActiveCar(rel)} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === rel.autos.id ? 'border-brand-primary text-brand-primary bg-white shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><Car className="w-4 h-4" /> {rel.autos.patente}</button>
        ))}
        <button onClick={() => setActiveTab('resumen')} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-b-2 font-bold transition-all whitespace-nowrap ml-auto ${activeTab === 'resumen' ? 'border-green-500 text-green-600 bg-white shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}><CheckCircle className="w-4 h-4" /> Resumen y Entrega</button>
      </div>

      {activeCar && activeTab !== 'resumen' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* RECEPCIÓN BÁSICA */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2 border-b pb-2"><FileText className="w-5 h-5 text-slate-400" /> Recepción Básica</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Kilometraje</label><div className="relative"><Gauge className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/><input type="number" className="w-full pl-9 p-2 border rounded font-mono bg-slate-50" value={checklist.kilometraje} onChange={e => setChecklist({...checklist, kilometraje: e.target.value})} /></div></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Combustible</label><div className="flex items-center gap-2 h-10"><Fuel className="w-4 h-4 text-slate-400"/><input type="range" className="w-full h-2 bg-blue-200 rounded-lg cursor-pointer" value={checklist.nivel_combustible} onChange={e => setChecklist({...checklist, nivel_combustible: e.target.value})} /><span className="text-sm font-bold w-8">{checklist.nivel_combustible}%</span></div></div>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase">Daños / Notas</label><textarea className="w-full p-2 border rounded h-24 text-sm bg-slate-50" value={checklist.observaciones_recepcion} onChange={e => setChecklist({...checklist, observaciones_recepcion: e.target.value})} /></div>
                <button onClick={saveChecklist} className="w-full py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded font-bold text-sm">Guardar Recepción</button>
              </div>
            </div>

            {/* --- CAJA DE CARGOS --- */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center justify-between border-b pb-2">
                <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-slate-400" /> Cargos</span>
                <span className="text-green-600 font-mono text-xl">{money(activeCarItems.reduce((s, i) => s + i.total_linea, 0) * (order.incluye_iva ? 1.19 : 1))}</span>
              </h3>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                <div className="flex gap-1 mb-3 bg-slate-200/50 p-1 rounded-lg">
                  <button onClick={() => setAddItemType('servicio')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${addItemType === 'servicio' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Servicio Libre</button>
                  <button onClick={() => setAddItemType('manual')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${addItemType === 'manual' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Cargo Manual</button>
                </div>

                {addItemType === 'servicio' && (
                  <div className="relative animate-fade-in">
                    <div className="flex gap-2 relative z-20">
                      <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400"/><input placeholder="Buscar servicio base (ej: Afinamiento)..." className="w-full pl-9 p-2 border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" value={selectedService ? selectedService.nombre : searchServiceTerm} onChange={e => { setSearchServiceTerm(e.target.value); setSelectedService(null); }}/></div>
                      <button onClick={addItem} disabled={!selectedService} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
                    </div>
                    {filteredServices.length > 0 && (
                      <div className="absolute top-full left-0 right-16 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg max-h-48 overflow-y-auto z-30">
                        {filteredServices.map(s => (
                          <div key={s.id} onClick={() => { setSelectedService(s); setSearchServiceTerm(s.nombre); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex justify-between items-center">
                            <div><p className="font-bold text-sm text-slate-800">{s.nombre}</p><p className="text-[10px] text-slate-500">{s.categoria}</p></div>
                            <span className="font-mono text-xs font-bold text-blue-700">{money((Number(s.precio_mano_obra)||0) + (Number(s.precio_repuestos)||0))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {addItemType === 'manual' && (
                  <div className="flex gap-2 animate-fade-in"><input placeholder="Ej: Amarras..." className="flex-1 p-2 border border-orange-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" value={manualItem.nombre} onChange={e => setManualItem({...manualItem, nombre: e.target.value})}/><input type="number" placeholder="$ Precio" className="w-28 p-2 border border-orange-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" value={manualItem.precio} onChange={e => setManualItem({...manualItem, precio: e.target.value})}/><button onClick={addItem} className="bg-orange-500 text-white px-3 rounded-lg hover:bg-orange-600 font-bold flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button></div>
                )}
              </div>

              {/* LISTA DE ÍTEMS COBRADOS (CON ANIDACIÓN) */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] border-t border-slate-100 pt-4 pb-24">
                {activeCarItems.length === 0 && <p className="text-slate-400 text-center italic mt-4 text-sm">Sin cargos registrados</p>}
                
                {activeCarItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg border border-slate-200 shadow-sm relative">
                    <div className="flex justify-between items-start p-3 bg-slate-50 rounded-t-lg">
                      <div className="flex-1">
                        <span className="font-bold text-sm text-slate-800 block leading-tight">{item.servicio_nombre}</span>
                        <div className="flex gap-2 mt-1">
                          {item.tipo_item === 'manual' && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Manual</span>}
                          <button onClick={() => setNestingInItemId(nestingInItemId === item.id ? null : item.id)} className="text-[10px] text-blue-600 font-bold uppercase flex items-center gap-1 hover:text-blue-800 transition-colors">
                            <Box className="w-3 h-3"/> + Añadir Insumo
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="block text-[9px] text-slate-400 font-bold uppercase">Subtotal</span>
                          <span className="font-mono font-black text-slate-900">{money(item.total_linea)}</span>
                        </div>
                        <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* BUSCADOR DE ANIDACIÓN */}
                    {nestingInItemId === item.id && (
                      <div className="p-3 bg-blue-50 border-t border-blue-100 rounded-b-lg">
                        <p className="text-[10px] font-bold text-blue-800 uppercase mb-2">Buscando Insumo para: {item.servicio_nombre}</p>
                        <div className="flex gap-2 relative">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-blue-400"/>
                            <input autoFocus placeholder="Buscar repuesto..." className="w-full pl-9 p-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={selectedNestInv ? selectedNestInv.nombre : searchNestTerm} onChange={e => { setSearchNestTerm(e.target.value); setSelectedNestInv(null); }} />
                          </div>
                          <button onClick={() => addNestedInsumo(item.id)} disabled={!selectedNestInv} className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold text-sm">Vincular</button>
                        </div>
                        
                        {filteredNestInventory.length > 0 && (
                          <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-slate-200 shadow-2xl rounded-lg max-h-40 overflow-y-auto z-50">
                            {filteredNestInventory.map(i => (
                              <div key={i.id} onClick={() => { setSelectedNestInv(i); setSearchNestTerm(i.nombre); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-sm text-slate-800">{i.nombre}</p>
                                  <p className="text-[10px] text-slate-500">{i.sku || 'Sin código'}</p>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono text-[10px] font-bold text-blue-700 block">{money(Number(i.precio_venta) || 0)}</span>
                                  <span className={`text-[9px] font-bold ${(Number(i.stock_actual) || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>Stock: {Number(i.stock_actual) || 0}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* RENDER INSUMOS ANIDADOS */}
                    {item.insumos_anidados && item.insumos_anidados.length > 0 && (
                      <div className="p-2 bg-white border-t border-slate-100 space-y-1 rounded-b-lg">
                        {item.insumos_anidados.map(insumo => (
                          <div key={insumo.id} className="flex justify-between items-center bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                            <span className="text-xs text-slate-600 flex items-center gap-1.5"><Box className="w-3 h-3 text-slate-400"/> {insumo.nombre}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono font-bold text-slate-500">+{money(insumo.precio)}</span>
                              <button onClick={() => removeNestedInsumo(item.id, insumo.id)} className="text-slate-300 hover:text-red-500"><X className="w-3 h-3"/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardCheck className="w-5 h-5"/> Informe Técnico de Inspección</h3>
            </div>
            
            <div className="p-6">
              <h4 className="font-black text-slate-400 text-xs tracking-widest mb-4 flex justify-between items-center">
                <span>REVISIÓN POR PUNTOS</span>
                {activeInspeccionData && <button onClick={borrarInspeccion} className="text-red-500 hover:underline">Borrar y Cambiar Plantilla</button>}
              </h4>

              {!activeInspeccionData ? (
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl flex flex-col sm:flex-row gap-4 items-center">
                  <div className="flex-1">
                    <h5 className="font-bold text-blue-900 mb-1">Iniciar Checklist</h5>
                    <p className="text-sm text-blue-700 mb-3">Selecciona una plantilla para comenzar a evaluar los componentes del vehículo.</p>
                    <select className="w-full p-3 rounded-lg border-blue-200 outline-none font-bold text-slate-700" value={selectedPlantillaId} onChange={(e) => setSelectedPlantillaId(e.target.value)}>
                      <option value="">-- Elige una Plantilla --</option>
                      {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <button onClick={iniciarInspeccion} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 whitespace-nowrap h-fit">Comenzar</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeInspeccionData.resultados.map((cat, catIndex) => (
                    <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button onClick={() => setCatAbierta(catAbierta === cat.id ? null : cat.id)} className="w-full p-4 bg-slate-50 font-bold flex justify-between items-center hover:bg-slate-100 transition-colors">
                        <span>{cat.titulo}</span>
                        {catAbierta === cat.id ? <ChevronUp className="w-5 h-5 text-slate-400"/> : <ChevronDown className="w-5 h-5 text-slate-400"/>}
                      </button>
                      
                      {catAbierta === cat.id && (
                        <div className="p-4 bg-white space-y-4">
                          {cat.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="p-4 rounded-lg border border-slate-100 bg-slate-50/50">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
                                <span className="font-bold text-slate-700 text-sm">{item.nombre}</span>
                                <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 w-fit">
                                  <button onClick={() => updateInspeccionItem(catIndex, itemIndex, 'estado', 'ok')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${item.estado === 'ok' ? 'bg-green-500 text-white' : 'hover:bg-green-50 text-slate-400'}`}>OK</button>
                                  <button onClick={() => updateInspeccionItem(catIndex, itemIndex, 'estado', 'atencion')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${item.estado === 'atencion' ? 'bg-yellow-500 text-white' : 'hover:bg-yellow-50 text-slate-400'}`}>OBS</button>
                                  <button onClick={() => updateInspeccionItem(catIndex, itemIndex, 'estado', 'malo')} className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-colors ${item.estado === 'malo' ? 'bg-red-500 text-white' : 'hover:bg-red-50 text-slate-400'}`}>FAIL</button>
                                </div>
                              </div>

                              {(item.estado === 'atencion' || item.estado === 'malo') && (
                                <div className="animate-fade-in mt-3 space-y-3">
                                  <textarea placeholder="Detalla el problema encontrado..." className="w-full p-3 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400" value={item.observacion} onChange={(e) => updateInspeccionItem(catIndex, itemIndex, 'observacion', e.target.value)} />
                                  <div className="flex items-center gap-4">
                                    <input type="file" accept="image/*" capture="environment" id={`foto-${catIndex}-${itemIndex}`} className="hidden" onChange={(e) => handleFotoChecklist(catIndex, itemIndex, e)} />
                                    <label htmlFor={`foto-${catIndex}-${itemIndex}`} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase cursor-pointer hover:bg-slate-700 transition-colors flex items-center gap-2">
                                      <Camera className="w-4 h-4"/> Añadir Foto Evidencia
                                    </label>
                                    {item.foto && (
                                      <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 text-xs font-bold">
                                        <CheckCircle className="w-4 h-4"/> Foto Adjunta
                                        <button onClick={() => updateInspeccionItem(catIndex, itemIndex, 'foto', null)} className="ml-2 text-red-500 hover:text-red-700"><X className="w-4 h-4"/></button>
                                      </div>
                                    )}
                                  </div>
                                  {item.foto && <img src={item.foto} alt="Evidencia" className="h-32 rounded-lg border border-slate-200 object-cover mt-2" />}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-4 flex justify-end">
                    <button onClick={guardarInspeccion} className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-green-600 shadow-lg">
                      <Save className="w-5 h-5"/> Guardar Informe
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-slate-400" /> Galería General (Opcional)</h3>
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handlePhotoUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin"/> : <Camera className="w-4 h-4"/>} Subir Foto Suelta
              </button>
            </div>
            {activeCarPhotos.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No hay fotos sueltas registradas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {activeCarPhotos.map(photo => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square">
                    <img src={photo.url} alt="Evidencia" className="w-full h-full object-cover" />
                    <button onClick={() => deletePhoto(photo.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO 2: PESTAÑA RESUMEN */}
      {activeTab === 'resumen' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <Receipt className="absolute -right-6 -top-6 w-32 h-32 text-slate-50 opacity-50 pointer-events-none" />
            <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">{money(order.total)}</h2>
            <p className="text-slate-500 text-sm mb-6 font-medium">Total de la Orden de Trabajo</p>
            <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 mb-6">
              <span className="text-sm font-bold text-slate-700">Factura (Incluir 19% IVA)</span>
              <button onClick={toggleIva} className={`w-14 h-7 rounded-full relative transition-colors shadow-inner ${order.incluye_iva ? 'bg-blue-600' : 'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${order.incluye_iva ? 'left-8' : 'left-1'}`}></div>
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full relative z-10">
              <button onClick={handleSeguimiento} className="bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg shadow-xl shadow-green-500/30 transition-transform active:scale-95 w-full sm:w-auto">
                <MessageCircle className="w-6 h-6" /> Enviar Seguimiento
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {order.orden_autos.map((rel) => {
              const carId = rel.autos.id;
              const repuestosDelAuto = orderDetails.filter(d => d.auto_id === carId);
              const sumItemsAuto = repuestosDelAuto.reduce((s, d) => s + d.total_linea, 0);
              const impuestosAuto = order.incluye_iva ? Math.round(sumItemsAuto * 0.19) : 0;
              const totalAuto = sumItemsAuto + impuestosAuto;
              const fotosDelAuto = orderPhotos.filter(p => p.auto_id === carId);
              const informeDelAuto = inspecciones.find(i => i.auto_id === carId);

              const reparacionesProcesadas = repuestosDelAuto.map(rep => {
                let textoFinal = rep.servicio_nombre;
                if (rep.insumos_anidados && rep.insumos_anidados.length > 0) {
                  const categoriasUnicas = [...new Set(rep.insumos_anidados.map(i => i.categoria))].join(', ');
                  textoFinal = `${rep.servicio_nombre} (Incluye: ${categoriasUnicas})`;
                }
                return { texto: textoFinal, precio: rep.total_linea }
              });

              const datosPDF = {
                vehiculo: {
                  orden: order.id.slice(0,6).toUpperCase(), cliente: order.clientes?.nombre, rut: order.clientes?.rut,
                  telefono: order.clientes?.telefono, patente: rel.autos.patente, marca: rel.autos.marca, modelo: rel.autos.modelo,
                  anio: carEdits[carId]?.anio || rel.autos.anio || '', vin: carEdits[carId]?.vin || rel.autos.vin || '',
                  km: rel.kilometraje || '0', combustible: rel.nivel_combustible || '50', observaciones: rel.observaciones_recepcion || '', 
                  fecha: new Date(order.created_at).toLocaleDateString('es-CL'), tecnico: 'Taller Multifrenos'
                },
                reparaciones: reparacionesProcesadas,
                fotos: fotosDelAuto, inspeccion: informeDelAuto ? informeDelAuto.resultados : null,
                total: totalAuto, impuestos: impuestosAuto 
              };

              return (
                <div key={carId} className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2"><Car className="w-5 h-5 text-slate-500" /><span className="font-bold font-mono text-lg">{rel.autos.patente}</span></div>
                    <div className="flex items-center gap-2">
                      <PDFDownloadLink document={<OrdenPDF orden={datosPDF} modo="impresion" />} fileName={`OrdenFisica_${rel.autos.patente}.pdf`} className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 px-3 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95" title="Imprimir en B/N sin fotos para firmar">
                        {({ loading }) => loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Printer className="w-4 h-4"/> Imprimir</>}
                      </PDFDownloadLink>
                      <PDFDownloadLink document={<OrdenPDF orden={datosPDF} modo="digital" />} fileName={`Informe_${rel.autos.patente}.pdf`} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2 shadow transition-transform active:scale-95">
                        {({ loading }) => loading ? 'Generando...' : <><FileText className="w-4 h-4"/> PDF Digital</>}
                      </PDFDownloadLink>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Año</label><input type="number" className="w-full p-2 border rounded mt-1 bg-white font-bold text-center" value={carEdits[carId]?.anio} onChange={(e) => setCarEdits({...carEdits, [carId]: {...carEdits[carId], anio: e.target.value}})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Color</label><input className="w-full p-2 border rounded mt-1 bg-white font-bold text-center uppercase" value={carEdits[carId]?.color} onChange={(e) => setCarEdits({...carEdits, [carId]: {...carEdits[carId], color: e.target.value}})} /></div>
                    <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Número VIN / Chasis</label><input className="w-full p-2 border rounded mt-1 uppercase font-mono bg-white font-bold text-center tracking-widest" value={carEdits[carId]?.vin} onChange={(e) => setCarEdits({...carEdits, [carId]: {...carEdits[carId], vin: e.target.value.toUpperCase()}})} /></div>
                  </div>

                  {/* BOTÓN PARA ABRIR EL COMPONENTE DE PROYECCIONES */}
                  <div className="col-span-2 mt-4 pt-4 border-t border-slate-200">
                    <button 
                      onClick={() => setCarForProjections({ id: carId, patente: rel.autos.patente, km: rel.kilometraje, rt: rel.autos.fecha_revision_tecnica })}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-sm shadow-sm transition-transform active:scale-95"
                    >
                      <Settings2 className="w-5 h-5" /> Configurar Semáforos y Salud del Vehículo
                    </button>
                  </div>

                  <button onClick={() => updateCarDetails(carId)} className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-sm shadow-md transition-transform active:scale-95">
                    <Save className="w-4 h-4" /> Guardar Perfil Básico
                  </button>
                </div>
              )
            })}
          </div>

          <div className="pt-8 flex justify-center">
            <button onClick={deleteOrder} className="text-red-400 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded transition-colors flex items-center gap-2 text-sm"><Trash2 className="w-4 h-4" /> Eliminar esta orden permanentemente</button>
          </div>
        </div>
      )}
      
      {/* RENDEREADO DEL COMPONENTE POP-UP DE SALUD */}
      {carForProjections && (
        <ProyeccionesFlota
          carId={carForProjections.id}
          patente={carForProjections.patente}
          currentKm={carForProjections.km}
          currentRT={carForProjections.rt}
          onClose={() => setCarForProjections(null)}
        />
      )}

    </div>
  )
}