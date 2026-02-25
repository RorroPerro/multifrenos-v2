import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { PDFDownloadLink } from '@react-pdf/renderer'
import OrdenPDF from '../../components/OrdenPDF'
import { Car, ArrowLeft, Fuel, Gauge, FileText, Plus, Trash2, Printer, Loader2, Clock, CheckCircle, Save, MessageCircle, Camera, Image as ImageIcon, X, ClipboardCheck, ChevronDown, ChevronUp, Receipt, Search, Box, Settings2, Wrench, AlertCircle } from 'lucide-react'
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
  const [nestingMode, setNestingMode] = useState('inventario')
  const [manualNestName, setManualNestName] = useState('')
  const [manualNestPrice, setManualNestPrice] = useState('')

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    const { data: orderData, error } = await supabase
      .from('ordenes')
      .select(`*, clientes ( nombre, tipo, telefono, email, rut, token_flota ), orden_autos ( id, kilometraje, nivel_combustible, observaciones_recepcion, autos ( id, patente, marca, modelo, anio, vin, numero_motor, color, bateria_mes, bateria_anio, dot_di, dot_dd, dot_ti, dot_td, fecha_revision_tecnica, prox_cambio_aceite, prox_cambio_frenos ) )`)
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
          anio: rel.autos.anio || '', 
          vin: rel.autos.vin || '', 
          numero_motor: rel.autos.numero_motor || '', 
          color: rel.autos.color || ''
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

  async function addItem() {
    let newItem = { orden_id: order.id, auto_id: activeTab, cantidad: 1, insumos_anidados: [] }

    if (addItemType === 'servicio') {
      if (!selectedService) return alert('Busca y selecciona un servicio de la lista primero.')
      const mo = Number(selectedService.precio_mano_obra) || 0; 
      const rep = Number(selectedService.precio_repuestos) || 0;
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
        if (anidado.inventario_id && anidado.inventario_id !== 'manual') {
          const invAnidado = inventory.find(i => i.id === anidado.inventario_id)
          if (invAnidado) {
            const restoredStockAnidado = (Number(invAnidado.stock_actual) || 0) + 1
            await supabase.from('inventario').update({ stock_actual: restoredStockAnidado }).eq('id', invAnidado.id)
            setInventory(prev => prev.map(i => i.id === invAnidado.id ? { ...i, stock_actual: restoredStockAnidado } : i))
          }
        }
      }
    }
    await supabase.from('orden_detalle').delete().eq('id', itemId)
    const newDetails = orderDetails.filter(d => d.id !== itemId)
    setOrderDetails(newDetails)
    updateOrderTotal(newDetails)
  }

  async function addNestedInsumo(parentDetailId) {
    const parentDetail = orderDetails.find(d => d.id === parentDetailId)
    const currentAnidados = parentDetail.insumos_anidados || []
    let newInsumo = {};

    if (nestingMode === 'inventario') {
      if (!selectedNestInv) return alert('Busca y selecciona un repuesto primero')
      const precioInsumo = Number(selectedNestInv.precio_venta) || 0
      newInsumo = { id: Date.now().toString(), inventario_id: selectedNestInv.id, nombre: selectedNestInv.nombre, categoria: selectedNestInv.categoria || 'Repuesto', precio: precioInsumo }
    } else {
      if (!manualNestName || !manualNestPrice) return alert('Llena el nombre y precio del insumo')
      const precioManual = Number(manualNestPrice) || 0;
      newInsumo = { id: Date.now().toString(), inventario_id: 'manual', nombre: manualNestName, categoria: 'Repuesto Libre', precio: precioManual }
    }

    const newAnidados = [...currentAnidados, newInsumo]
    const newTotalLinea = (Number(parentDetail.total_linea) || 0) + newInsumo.precio

    const { error } = await supabase.from('orden_detalle').update({ insumos_anidados: newAnidados, total_linea: newTotalLinea }).eq('id', parentDetailId)
    if (error) return alert('Error al guardar el insumo: ' + error.message)

    if (nestingMode === 'inventario') {
      const newStock = (Number(selectedNestInv.stock_actual) || 0) - 1
      await supabase.from('inventario').update({ stock_actual: newStock }).eq('id', selectedNestInv.id)
      setInventory(inventory.map(i => i.id === selectedNestInv.id ? { ...i, stock_actual: newStock } : i))
    }

    const newDetails = orderDetails.map(d => d.id === parentDetailId ? { ...d, insumos_anidados: newAnidados, total_linea: newTotalLinea } : d)
    setOrderDetails(newDetails)
    updateOrderTotal(newDetails)
    setSearchNestTerm(''); setSelectedNestInv(null); setManualNestName(''); setManualNestPrice(''); setNestingInItemId(null)
  }

  async function removeNestedInsumo(parentDetailId, insumoIdToRemove) {
    if (!confirm('¿Quitar este repuesto?')) return
    const parentDetail = orderDetails.find(d => d.id === parentDetailId)
    const insumoToRemove = parentDetail.insumos_anidados.find(i => i.id === insumoIdToRemove)
    const newAnidados = parentDetail.insumos_anidados.filter(i => i.id !== insumoIdToRemove)
    const newTotalLinea = (Number(parentDetail.total_linea) || 0) - (Number(insumoToRemove.precio) || 0)

    const { error } = await supabase.from('orden_detalle').update({ insumos_anidados: newAnidados, total_linea: newTotalLinea }).eq('id', parentDetailId)
    if (error) return alert('Error al quitar insumo: ' + error.message)

    if (insumoToRemove.inventario_id !== 'manual') {
      const invItem = inventory.find(i => i.id === insumoToRemove.inventario_id)
      if (invItem) {
        const restoredStock = (Number(invItem.stock_actual) || 0) + 1
        await supabase.from('inventario').update({ stock_actual: restoredStock }).eq('id', invItem.id)
        setInventory(inventory.map(i => i.id === invItem.id ? { ...i, stock_actual: restoredStock } : i))
      }
    }

    const newDetails = orderDetails.map(d => d.id === parentDetailId ? { ...d, insumos_anidados: newAnidados, total_linea: newTotalLinea } : d)
    setOrderDetails(newDetails)
    updateOrderTotal(newDetails)
  }

  const filteredServices = catalogServices.filter(s => searchServiceTerm === '' ? true : s.nombre.toLowerCase().includes(searchServiceTerm.toLowerCase())).slice(0, 10) 
  const filteredNestInventory = inventory.filter(i => searchNestTerm === '' ? true : (i.nombre.toLowerCase().includes(searchNestTerm.toLowerCase()) || (i.sku && i.sku.toLowerCase().includes(searchNestTerm.toLowerCase())))).slice(0, 10) 

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
      const reader = new FileReader(); reader.readAsDataURL(file);
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

  async function saveAllCarData() {
    const rel = order.orden_autos.find(r => r.autos.id === activeTab)
    const edits = carEdits[activeTab] || {}
    const { error: e1 } = await supabase.from('orden_autos').update(checklist).eq('id', rel.id)
    const updateData = {
      kilometraje_actual: checklist.kilometraje,
      anio: edits.anio ? Number(edits.anio) : null,
      color: edits.color || null,
      vin: edits.vin || null,
      numero_motor: edits.numero_motor || null
    }
    const { error: e2 } = await supabase.from('autos').update(updateData).eq('id', activeTab)
    if (!e1 && !e2) alert('✅ Datos guardados con éxito')
    else alert('Error al guardar datos. Verifica el año.')
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
    const mensaje = `Hola *${order.clientes.nombre}*, somos del taller Multifrenos.\nTu orden (Patente: *${patentes}*) está en estado: *${order.estado}*.\nPuedes ver el presupuesto aquí:\n${trackingUrl}`;
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
      
      {/* HEADER SUPERIOR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => navigate('/ordenes')} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 text-slate-500" /></button>
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">Orden #{order.folio || order.id.slice(0,6).toUpperCase()}</h1>
            <p className="text-sm font-medium text-slate-500">{order.clientes?.nombre}</p>
          </div>
        </div>
        <span className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-lg font-bold border border-blue-200 text-sm uppercase tracking-wider">{order.estado}</span>
      </div>

      {/* PESTAÑAS (TABS) OPTIMIZADAS */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 hide-scrollbar">
        {order.orden_autos.map((rel) => (
          <button 
            key={rel.id} 
            onClick={() => setupActiveCar(rel)} 
            className={`flex flex-col items-start px-5 py-2.5 rounded-t-xl border-b-4 transition-all whitespace-nowrap min-w-[140px] ${activeTab === rel.autos.id ? 'border-brand-primary bg-white shadow-sm' : 'border-transparent bg-slate-50 hover:bg-slate-100 text-slate-500'}`}
          >
            <span className={`font-black font-mono text-lg flex items-center gap-2 ${activeTab === rel.autos.id ? 'text-slate-900' : 'text-slate-600'}`}>
              <Car className="w-4 h-4" /> {rel.autos.patente}
            </span>
            <span className={`text-[10px] uppercase font-bold tracking-widest ${activeTab === rel.autos.id ? 'text-brand-primary' : 'text-slate-400'}`}>
              {rel.autos.marca} {rel.autos.modelo}
            </span>
          </button>
        ))}
        <button 
          onClick={() => setActiveTab('resumen')} 
          className={`flex items-center gap-2 px-6 py-4 rounded-t-xl border-b-4 font-black transition-all whitespace-nowrap ml-auto ${activeTab === 'resumen' ? 'border-green-500 text-green-700 bg-white shadow-sm' : 'border-transparent text-slate-500 bg-slate-50 hover:bg-slate-100'}`}
        >
          <CheckCircle className="w-5 h-5" /> CIERRE Y COBRO
        </button>
      </div>

      {/* CONTENIDO DEL VEHÍCULO ACTIVO */}
      {activeCar && activeTab !== 'resumen' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* CABECERA GIGANTE DEL VEHÍCULO */}
          <div className="bg-slate-900 rounded-xl p-5 shadow-lg flex flex-col md:flex-row justify-between md:items-center gap-4 border-l-4 border-brand-primary">
            <div>
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Vehículo en revisión</p>
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                {activeCar.marca} {activeCar.modelo}
                <span className="bg-white/10 text-white border border-white/20 px-3 py-1 rounded-lg font-mono text-lg">{activeCar.patente}</span>
              </h2>
            </div>
          </div>

          {/* FICHA TÉCNICA Y RECEPCIÓN REORGANIZADA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* MOTIVO DE INGRESO (Lo más importante para el mecánico) */}
            <div className="lg:col-span-2 bg-yellow-50 border border-yellow-200 rounded-xl p-5 shadow-sm flex flex-col">
              <label className="text-xs font-black text-yellow-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4"/> Motivo de Visita / Observaciones de Ingreso
              </label>
              <textarea 
                className="w-full p-4 border border-yellow-300 rounded-lg flex-1 text-sm bg-white font-medium text-slate-800 resize-none focus:ring-2 focus:ring-yellow-400 outline-none placeholder:text-slate-400" 
                placeholder="Ej: Cliente indica que suena al frenar. Daño en parachoques trasero..." 
                value={checklist.observaciones_recepcion} 
                onChange={e => setChecklist({...checklist, observaciones_recepcion: e.target.value})} 
              />
            </div>

            {/* DATOS RÁPIDOS Y BOTÓN GUARDAR */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kilometraje</label>
                  <div className="relative">
                    <Gauge className="w-4 h-4 absolute left-3 top-3 text-slate-400"/>
                    <input type="number" className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg font-mono font-bold text-slate-700 bg-slate-50 outline-none focus:border-blue-500" value={checklist.kilometraje} onChange={e => setChecklist({...checklist, kilometraje: e.target.value})} />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Combustible: {checklist.nivel_combustible}%</label>
                  <div className="h-10 flex items-center px-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <input type="range" className="w-full h-2 bg-blue-200 rounded-lg cursor-pointer" value={checklist.nivel_combustible} onChange={e => setChecklist({...checklist, nivel_combustible: e.target.value})} />
                  </div>
                </div>
              </div>
              
              {/* ACORDEÓN DE DATOS TÉCNICOS OCULTOS PARA AHORRAR ESPACIO */}
              <details className="group border border-slate-200 rounded-lg bg-slate-50">
                <summary className="text-xs font-bold text-slate-600 p-3 cursor-pointer list-none flex justify-between items-center">
                  Ver Datos Técnicos (VIN, Motor, Año)
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform"/>
                </summary>
                <div className="p-3 border-t border-slate-200 space-y-3 bg-white rounded-b-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[9px] font-bold text-slate-400 uppercase">Año</label><input type="number" className="w-full p-2 border rounded bg-slate-50 font-bold text-xs text-center outline-none focus:border-blue-500" value={carEdits[activeTab]?.anio} onChange={(e) => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], anio: e.target.value}})} /></div>
                    <div><label className="text-[9px] font-bold text-slate-400 uppercase">Color</label><input className="w-full p-2 border rounded bg-slate-50 font-bold text-xs text-center uppercase outline-none focus:border-blue-500" value={carEdits[activeTab]?.color} onChange={(e) => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], color: e.target.value}})} /></div>
                  </div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase">VIN / Chasis</label><input className="w-full p-2 border rounded uppercase font-mono bg-slate-50 text-xs font-bold outline-none focus:border-blue-500" value={carEdits[activeTab]?.vin} onChange={(e) => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], vin: e.target.value.toUpperCase()}})} /></div>
                  <div><label className="text-[9px] font-bold text-slate-400 uppercase">Motor</label><input className="w-full p-2 border rounded uppercase font-mono bg-slate-50 text-xs font-bold outline-none focus:border-blue-500" value={carEdits[activeTab]?.numero_motor} onChange={(e) => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], numero_motor: e.target.value.toUpperCase()}})} /></div>
                </div>
              </details>

              <button onClick={saveAllCarData} className="w-full py-3 bg-slate-900 text-white rounded-lg font-black tracking-wide flex items-center justify-center gap-2 hover:bg-slate-800 transition-transform active:scale-95 shadow-md">
                <Save className="w-4 h-4"/> GUARDAR FICHA
              </button>
            </div>
          </div>

          {/* --- CARGOS DESPLEGADOS --- */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center justify-between border-b pb-3">
              <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-slate-400" /> Presupuesto / Cargos</span>
              <span className="text-green-600 font-mono text-2xl">{money(activeCarItems.reduce((s, i) => s + i.total_linea, 0) * (order.incluye_iva ? 1.19 : 1))}</span>
            </h3>
            
            {/* Buscador de Cargos a todo lo ancho */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200 w-full md:w-auto">
                <button onClick={() => setAddItemType('servicio')} className={`flex-1 md:px-6 py-2 text-xs font-bold rounded-md transition-colors ${addItemType === 'servicio' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>Por Catálogo</button>
                <button onClick={() => setAddItemType('manual')} className={`flex-1 md:px-6 py-2 text-xs font-bold rounded-md transition-colors ${addItemType === 'manual' ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-100'}`}>Libre / Manual</button>
              </div>

              <div className="flex-1 w-full">
                {addItemType === 'servicio' && (
                  <div className="flex gap-2 relative z-20">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400"/>
                      <input placeholder="Buscar servicio base (ej: Afinamiento)..." className="w-full pl-10 p-2.5 border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={selectedService ? selectedService.nombre : searchServiceTerm} onChange={e => { setSearchServiceTerm(e.target.value); setSelectedService(null); }}/>
                      
                      {filteredServices.length > 0 && !selectedService && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg max-h-48 overflow-y-auto z-30">
                          {filteredServices.map(s => (
                            <div key={s.id} onClick={() => { setSelectedService(s); setSearchServiceTerm(s.nombre); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex justify-between items-center">
                              <div><p className="font-bold text-sm text-slate-800">{s.nombre}</p><p className="text-[10px] text-slate-500">{s.categoria}</p></div>
                              <span className="font-mono text-xs font-bold text-blue-700">{money((Number(s.precio_mano_obra)||0) + (Number(s.precio_repuestos)||0))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={addItem} disabled={!selectedService} className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Añadir</button>
                  </div>
                )}
                
                {addItemType === 'manual' && (
                  <div className="flex gap-2 animate-fade-in">
                    <input placeholder="Descripción del cargo..." className="flex-1 p-2.5 border border-orange-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white" value={manualItem.nombre} onChange={e => setManualItem({...manualItem, nombre: e.target.value})}/>
                    <input type="number" placeholder="$ Precio Total" className="w-32 p-2.5 border border-orange-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500 bg-white" value={manualItem.precio} onChange={e => setManualItem({...manualItem, precio: e.target.value})}/>
                    <button onClick={addItem} className="bg-orange-500 text-white px-6 rounded-lg hover:bg-orange-600 font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Añadir</button>
                  </div>
                )}
              </div>
            </div>

            {/* LISTA DE ÍTEMS */}
            <div className="space-y-4">
              {activeCarItems.length === 0 && <div className="text-center py-10 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200"><Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2"/><p className="text-slate-500 text-sm">Sin cargos registrados para este vehículo</p></div>}
              
              {activeCarItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 shadow-sm relative transition-all hover:border-slate-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50/50 rounded-t-xl">
                    <div className="flex-1 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-800">{item.servicio_nombre}</span>
                        {item.tipo_item === 'manual' && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Manual</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                      <button onClick={() => setNestingInItemId(nestingInItemId === item.id ? null : item.id)} className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                        <Plus className="w-3 h-3"/> + Insumo / Repuesto
                      </button>
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase">Subtotal</span>
                        <span className="font-mono font-black text-lg text-slate-900">{money(item.total_linea)}</span>
                      </div>
                      <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {/* BUSCADOR DE ANIDACIÓN CON OPCIÓN MANUAL */}
                  {nestingInItemId === item.id && (
                    <div className="p-4 bg-blue-50/50 border-y border-blue-100 relative">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-xs font-bold text-blue-800 uppercase">Vincular Repuesto a este Servicio</p>
                        <div className="flex gap-1 bg-white p-1 rounded border border-blue-100">
                          <button onClick={() => setNestingMode('inventario')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${nestingMode === 'inventario' ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}>De Bodega</button>
                          <button onClick={() => setNestingMode('manual')} className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${nestingMode === 'manual' ? 'bg-orange-100 text-orange-700' : 'text-slate-500'}`}>Ingreso Libre</button>
                        </div>
                      </div>

                      {nestingMode === 'inventario' ? (
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-blue-400"/>
                            <input autoFocus placeholder="Código o nombre del repuesto..." className="w-full pl-9 p-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={selectedNestInv ? selectedNestInv.nombre : searchNestTerm} onChange={e => { setSearchNestTerm(e.target.value); setSelectedNestInv(null); }} />
                            
                            {filteredNestInventory.length > 0 && !selectedNestInv && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-2xl rounded-lg max-h-48 overflow-y-auto z-50">
                                {filteredNestInventory.map(i => (
                                  <div key={i.id} onClick={() => { setSelectedNestInv(i); setSearchNestTerm(i.nombre); }} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 flex justify-between items-center">
                                    <div>
                                      <p className="font-bold text-sm text-slate-800">{i.nombre}</p>
                                      <p className="text-xs text-slate-500 font-mono">{i.sku || 'Sin código'}</p>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-mono text-sm font-bold text-blue-700 block">{money(Number(i.precio_venta) || 0)}</span>
                                      <span className={`text-[10px] font-bold ${(Number(i.stock_actual) || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>Stock: {Number(i.stock_actual) || 0}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => addNestedInsumo(item.id)} disabled={!selectedNestInv} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold text-sm">Vincular</button>
                        </div>
                      ) : (
                        <div className="flex gap-2 animate-fade-in">
                          <input autoFocus placeholder="Nombre del repuesto comprado..." className="flex-1 p-2 border border-orange-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500" value={manualNestName} onChange={e => setManualNestName(e.target.value)} />
                          <input type="number" placeholder="$ Precio" className="w-28 p-2 border border-orange-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500" value={manualNestPrice} onChange={e => setManualNestPrice(e.target.value)} />
                          <button onClick={() => addNestedInsumo(item.id)} className="bg-orange-500 text-white px-4 rounded-lg hover:bg-orange-600 font-bold text-sm">Añadir</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RENDER INSUMOS ANIDADOS CON PRECIOS CLAROS */}
                  {item.insumos_anidados && item.insumos_anidados.length > 0 && (
                    <div className="p-3 bg-white space-y-2 border-t border-slate-100 rounded-b-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase ml-2">Insumos vinculados a esta tarea</p>
                      {item.insumos_anidados.map(insumo => (
                        <div key={insumo.id} className="flex justify-between items-center bg-slate-50/80 px-3 py-2 rounded-lg border border-slate-100">
                          <span className="text-sm text-slate-700 flex items-center gap-2">
                            <Box className="w-4 h-4 text-indigo-400"/> {insumo.nombre}
                            {insumo.inventario_id === 'manual' && <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase">Libre</span>}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">+{money(insumo.precio)}</span>
                            <button onClick={() => removeNestedInsumo(item.id, insumo.id)} className="text-slate-300 hover:text-red-500" title="Quitar insumo"><X className="w-4 h-4"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* INSPECCIÓN TÉCNICA */}
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

          {/* FOTOS SUELTAS */}
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

      {/* CONTENIDO 2: PESTAÑA RESUMEN Y COBRO */}
      {activeTab === 'resumen' && (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <Receipt className="absolute -right-10 -top-10 w-48 h-48 text-slate-50 opacity-50 pointer-events-none" />
            
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-2 z-10">Total a Pagar</p>
            <h2 className="text-5xl font-black text-green-600 mb-6 tracking-tight z-10 drop-shadow-sm">{money(order.total)}</h2>
            
            {/* BOTÓN SECRETO DE IVA (Súper Camuflado) */}
            <div className="flex items-center justify-center mb-6 z-10 relative">
              <p className="text-slate-500 text-sm font-medium mr-2">Total de la Orden de Trabajo</p>
              <button 
                onClick={toggleIva} 
                className={`text-[10px] px-1.5 py-0.5 rounded outline-none transition-colors ${order.incluye_iva ? 'bg-slate-200 text-slate-600' : 'bg-transparent text-slate-200 hover:text-slate-300'}`}
              >
                IVA
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full relative z-10">
              <button onClick={handleSeguimiento} className="bg-[#25D366] hover:bg-[#1DA851] text-white px-8 py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg shadow-xl shadow-green-500/20 transition-transform active:scale-95 w-full sm:w-auto">
                <MessageCircle className="w-6 h-6" /> Enviar Cobro por WhatsApp
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="font-bold text-lg text-slate-800 border-b pb-3 mb-4 flex items-center gap-2">
               <FileText className="w-5 h-5 text-slate-400"/> Resumen Final y Documentos
             </h3>
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
                    orden: order.folio || order.id.slice(0,6).toUpperCase(), cliente: order.clientes?.nombre, rut: order.clientes?.rut,
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
                  <div key={carId} className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-3">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                        <Car className="w-5 h-5 text-slate-600" />
                      </div>
                      <span className="font-bold font-mono text-xl text-slate-800">{rel.autos.patente}</span>
                    </div>

                    <div className="space-y-3 mt-auto">
                      {/* BOTÓN SALUD Y PROYECCIONES */}
                      <button 
                        onClick={() => setCarForProjections({ id: carId, patente: rel.autos.patente, km: rel.kilometraje, rt: rel.autos.fecha_revision_tecnica })}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-transform active:scale-95"
                      >
                        <Settings2 className="w-4 h-4" /> Configurar Salud / Próxima Mantención
                      </button>

                      <PDFDownloadLink document={<OrdenPDF orden={datosPDF} modo="digital" />} fileName={`Informe_${rel.autos.patente}.pdf`} className="w-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2 shadow transition-transform active:scale-95">
                        {({ loading }) => loading ? 'Generando...' : <><FileText className="w-4 h-4"/> Descargar PDF Final (Color)</>}
                      </PDFDownloadLink>
                      
                      <PDFDownloadLink document={<OrdenPDF orden={datosPDF} modo="impresion" />} fileName={`OrdenFisica_${rel.autos.patente}.pdf`} className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-sm" title="Imprimir en B/N sin fotos para firmar">
                        {({ loading }) => loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Printer className="w-4 h-4"/> Imprimir B/N para Firma</>}
                      </PDFDownloadLink>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="pt-12 flex justify-center">
            <button onClick={deleteOrder} className="text-red-400 hover:text-red-600 hover:bg-red-50 px-6 py-3 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold border border-transparent hover:border-red-100"><Trash2 className="w-4 h-4" /> Anular y Eliminar esta orden</button>
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