import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { PDFDownloadLink } from '@react-pdf/renderer'
import OrdenPDF from '../../components/OrdenPDF'
import { Car, ArrowLeft, Fuel, Gauge, FileText, Plus, Trash2, Printer, Loader2, Clock, CheckCircle, Save, MessageCircle, Camera, Image as ImageIcon, X, ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react'

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
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [carEdits, setCarEdits] = useState({})
  const fileInputRef = useRef(null) 

  useEffect(() => {
    fetchData()
  }, [id])

  async function fetchData() {
    setLoading(true)
    const { data: orderData, error } = await supabase
      .from('ordenes')
      .select(`*, clientes ( nombre, tipo, telefono, email, rut ), orden_autos ( id, kilometraje, nivel_combustible, observaciones_recepcion, autos ( id, patente, marca, modelo, anio, vin, color, bateria_mes, bateria_anio, dot_di, dot_dd, dot_ti, dot_td ) )`)
      .eq('id', id)
      .single()

    if (error) { navigate('/ordenes'); return }

    const { data: detailsData } = await supabase.from('orden_detalle').select('*').eq('orden_id', id)
    const { data: servicesData } = await supabase.from('servicios').select('*').order('nombre')
    const { data: photosData } = await supabase.from('orden_fotos').select('*').eq('orden_id', id)
    
    const { data: plantillasData } = await supabase.from('plantillas_inspeccion').select('*')
    const { data: inspeccionesData } = await supabase.from('orden_inspecciones').select('*').eq('orden_id', id)

    setOrder(orderData)
    setOrderDetails(detailsData || [])
    setCatalogServices(servicesData || [])
    setOrderPhotos(photosData || [])
    setPlantillas(plantillasData || [])
    setInspecciones(inspeccionesData || [])

    const initialEdits = {}
    if (orderData.orden_autos) {
      orderData.orden_autos.forEach(rel => {
        initialEdits[rel.autos.id] = {
          anio: rel.autos.anio || '',
          vin: rel.autos.vin || '',
          color: rel.autos.color || '',
          bateria_mes: rel.autos.bateria_mes || '',
          bateria_anio: rel.autos.bateria_anio || '',
          dot_di: rel.autos.dot_di || '',
          dot_dd: rel.autos.dot_dd || '',
          dot_ti: rel.autos.dot_ti || '',
          dot_td: rel.autos.dot_td || ''
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
    setChecklist({
      kilometraje: rel.kilometraje || 0,
      nivel_combustible: rel.nivel_combustible || 50,
      observaciones_recepcion: rel.observaciones_recepcion || ''
    })
    const inspeccionDelAuto = allInspections.find(i => i.auto_id === rel.autos.id)
    setActiveInspeccionData(inspeccionDelAuto || null)
  }

  const iniciarInspeccion = async () => {
    if (!selectedPlantillaId) return alert('Selecciona una plantilla primero')
    const template = plantillas.find(p => p.id === selectedPlantillaId)
    
    const nuevosResultados = template.estructura.map(cat => ({
      id: cat.id,
      titulo: cat.titulo,
      items: cat.items.map(item => ({ nombre: item, estado: null, observacion: '', foto: null }))
    }))

    const newInspeccion = { orden_id: order.id, auto_id: activeTab, plantilla_id: template.id, resultados: nuevosResultados }
    const { data, error } = await supabase.from('orden_inspecciones').insert([newInspeccion]).select().single()
    if (error) return alert('Error al iniciar inspección: ' + error.message)
    
    setInspecciones([...inspecciones, data])
    setActiveInspeccionData(data)
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
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleFotoChecklist = async (catIndex, itemIndex, e) => {
    const file = e.target.files[0]
    if (!file) return
    const compressedBase64 = await resizeImage(file)
    updateInspeccionItem(catIndex, itemIndex, 'foto', compressedBase64)
  }

  const guardarInspeccion = async () => {
    const { error } = await supabase.from('orden_inspecciones').update({ resultados: activeInspeccionData.resultados }).eq('id', activeInspeccionData.id)
    if (error) alert('Error guardando inspección')
    else alert('✅ Informe de Inspección guardado correctamente')
  }

  const borrarInspeccion = async () => {
    if (!confirm('¿Estás seguro de borrar este informe?')) return
    await supabase.from('orden_inspecciones').delete().eq('id', activeInspeccionData.id)
    setInspecciones(inspecciones.filter(i => i.id !== activeInspeccionData.id))
    setActiveInspeccionData(null)
  }

  async function deleteOrder() {
    if (!confirm('PELIGRO: ¿Estás seguro de eliminar esta orden completa?')) return
    await supabase.from('orden_fotos').delete().eq('orden_id', order.id)
    await supabase.from('orden_inspecciones').delete().eq('orden_id', order.id)
    await supabase.from('orden_detalle').delete().eq('orden_id', order.id)
    await supabase.from('orden_autos').delete().eq('orden_id', order.id)
    const { error } = await supabase.from('ordenes').delete().eq('id', order.id)
    if (error) alert('Error: ' + error.message)
    else navigate('/ordenes')
  }

  async function saveChecklist() {
    const rel = order.orden_autos.find(r => r.autos.id === activeTab)
    const { error: errorOrden } = await supabase.from('orden_autos').update(checklist).eq('id', rel.id)
    const { error: errorAuto } = await supabase.from('autos').update({ kilometraje_actual: checklist.kilometraje }).eq('id', activeTab)

    if (errorOrden || errorAuto) alert('Error al guardar el checklist')
    else alert('✅ Recepción guardada y Kilometraje actualizado')
  }

  async function updateCarDetails(carId) {
    const dataToSave = carEdits[carId]
    const { error } = await supabase.from('autos').update(dataToSave).eq('id', carId)
    if (error) alert('Error guardando datos del auto')
    else alert('✅ Datos del vehículo actualizados')
  }

  async function addItem() {
    if (!selectedServiceId) return
    const service = catalogServices.find(s => s.id === selectedServiceId)
    const newItem = { orden_id: order.id, auto_id: activeTab, servicio_nombre: service.nombre, precio_unitario: service.precio_mano_obra + service.precio_repuestos, total_linea: service.precio_mano_obra + service.precio_repuestos, cantidad: 1 }
    const { data } = await supabase.from('orden_detalle').insert([newItem]).select().single()
    const newDetails = [...orderDetails, data]
    setOrderDetails(newDetails)
    updateOrderTotal(newDetails)
    setSelectedServiceId('')
  }

  async function deleteItem(itemId) {
    if(!confirm('¿Borrar servicio?')) return
    await supabase.from('orden_detalle').delete().eq('id', itemId)
    const newDetails = orderDetails.filter(d => d.id !== itemId)
    setOrderDetails(newDetails)
    updateOrderTotal(newDetails)
  }

  async function updateOrderTotal(details) {
    const newTotal = details.reduce((sum, d) => sum + d.total_linea, 0)
    await supabase.from('ordenes').update({ total: newTotal }).eq('id', order.id)
    setOrder({ ...order, total: newTotal })
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${order.id}_${activeTab}_${Math.random()}.${fileExt}`
      const filePath = `reparaciones/${fileName}`
      const { error: uploadError } = await supabase.storage.from('fotos-taller').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('fotos-taller').getPublicUrl(filePath)
      const newPhoto = { orden_id: order.id, auto_id: activeTab, url: publicUrl, descripcion: 'Evidencia general' }
      const { data, error: dbError } = await supabase.from('orden_fotos').insert([newPhoto]).select().single()
      if (dbError) throw dbError
      setOrderPhotos([...orderPhotos, data])
    } catch (error) {
      alert('Error al subir la foto: ' + error.message)
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function deletePhoto(photoId) {
    if(!confirm('¿Borrar esta foto de la orden?')) return
    await supabase.from('orden_fotos').delete().eq('id', photoId)
    setOrderPhotos(orderPhotos.filter(p => p.id !== photoId))
  }

  const handleSeguimiento = () => {
    if (!order.clientes?.telefono) { alert('⚠️ El cliente no tiene un teléfono registrado.'); return; }
    let phone = order.clientes.telefono.replace(/\D/g, ''); 
    if (phone.length === 9) phone = '56' + phone;
    const patentes = order.orden_autos.map(rel => rel.autos.patente).join(', ');
    const trackingUrl = `${window.location.origin}/seguimiento/${order.id}`;
    const mensaje = `Hola *${order.clientes.nombre}*, somos del taller Multifrenos 🚗🔧.\n\nTe informamos que tu orden de trabajo para el vehículo patente *${patentes}* se encuentra en estado: *${order.estado}*.\n\nPuedes ver el detalle de tu presupuesto y hacer seguimiento en tiempo real haciendo clic en este enlace seguro:\n${trackingUrl}\n\n¡Gracias por confiar en nosotros!`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
    window.open(whatsappUrl, '_blank');
  }

  const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val)
  const activeCarItems = orderDetails.filter(d => d.auto_id === activeTab)
  const activeCarPhotos = orderPhotos.filter(p => p.auto_id === activeTab)
  
  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin w-10 h-10 text-brand-primary"/></div>
  if (!order) return null

  const activeCar = activeTab !== 'resumen' ? order.orden_autos.find(r => r.autos.id === activeTab)?.autos : null

  return (
    <div className="space-y-6 pb-20">
      
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
          <button
            key={rel.id}
            onClick={() => setupActiveCar(rel)}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-b-2 font-bold transition-all whitespace-nowrap ${activeTab === rel.autos.id ? 'border-brand-primary text-brand-primary bg-white shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
          >
            <Car className="w-4 h-4" /> {rel.autos.patente}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex items-center gap-2 px-6 py-3 rounded-t-xl border-b-2 font-bold transition-all whitespace-nowrap ml-auto ${activeTab === 'resumen' ? 'border-green-500 text-green-600 bg-white shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-100'}`}
        >
          <CheckCircle className="w-4 h-4" /> Resumen y Entrega
        </button>
      </div>

      {activeCar && activeTab !== 'resumen' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center justify-between border-b pb-2"><span className="flex items-center gap-2"><Clock className="w-5 h-5 text-slate-400" /> Servicios</span><span className="text-green-600 font-mono text-xl">{money(orderDetails.filter(d => d.auto_id === activeTab).reduce((s, i) => s + i.total_linea, 0))}</span></h3>
              <div className="flex gap-2 mb-4"><select className="flex-1 p-2 border rounded text-sm bg-white" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)}><option value="">+ Agregar Servicio...</option>{catalogServices.map(s => <option key={s.id} value={s.id}>{s.nombre} ({money(s.precio_mano_obra + s.precio_repuestos)})</option>)}</select><button onClick={addItem} className="bg-brand-primary text-white px-3 rounded hover:bg-blue-700"><Plus className="w-5 h-5" /></button></div>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px]">
                {activeCarItems.length === 0 && <p className="text-slate-400 text-center italic mt-4">Sin items</p>}
                {activeCarItems.map((item) => (<div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100 group hover:border-blue-200 transition-colors"><span className="font-medium text-sm text-slate-700">{item.servicio_nombre}</span><div className="flex items-center gap-3"><span className="font-mono font-bold text-slate-900">{money(item.total_linea)}</span><button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div></div>))}
              </div>
            </div>
          </div>

          {/* INSPECCIÓN TÉCNICA Y VITALES */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardCheck className="w-5 h-5"/> Informe Técnico de Inspección</h3>
            </div>
            
            <div className="p-6">
              <div className="mb-8 border-b border-slate-100 pb-6">
                <h4 className="font-black text-slate-400 text-xs tracking-widest mb-4">1. SIGNOS VITALES DEL VEHÍCULO</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-600 block mb-2">BATERÍA (MES / AÑO)</label>
                    <div className="flex gap-2">
                      <input type="number" placeholder="Mes" className="w-1/2 p-2 text-center rounded border outline-none font-bold" value={carEdits[activeTab]?.bateria_mes} onChange={e => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], bateria_mes: e.target.value}})} />
                      <input type="number" placeholder="Año" className="w-1/2 p-2 text-center rounded border outline-none font-bold" value={carEdits[activeTab]?.bateria_anio} onChange={e => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], bateria_anio: e.target.value}})} />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-600 block mb-2 text-center">NEUMÁTICOS DELANTEROS (DOT)</label>
                    <div className="flex gap-2">
                      <div className="w-1/2"><span className="text-[10px] text-slate-400 block text-center">Izq</span><input maxLength="4" placeholder="Ej: 4223" className="w-full p-2 text-center rounded border font-mono tracking-widest outline-none" value={carEdits[activeTab]?.dot_di} onChange={e => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], dot_di: e.target.value}})} /></div>
                      <div className="w-1/2"><span className="text-[10px] text-slate-400 block text-center">Der</span><input maxLength="4" placeholder="Ej: 4223" className="w-full p-2 text-center rounded border font-mono tracking-widest outline-none" value={carEdits[activeTab]?.dot_dd} onChange={e => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], dot_dd: e.target.value}})} /></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-600 block mb-2 text-center">NEUMÁTICOS TRASEROS (DOT)</label>
                    <div className="flex gap-2">
                      <div className="w-1/2"><span className="text-[10px] text-slate-400 block text-center">Izq</span><input maxLength="4" placeholder="Ej: 1521" className="w-full p-2 text-center rounded border font-mono tracking-widest outline-none" value={carEdits[activeTab]?.dot_ti} onChange={e => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], dot_ti: e.target.value}})} /></div>
                      <div className="w-1/2"><span className="text-[10px] text-slate-400 block text-center">Der</span><input maxLength="4" placeholder="Ej: 1521" className="w-full p-2 text-center rounded border font-mono tracking-widest outline-none" value={carEdits[activeTab]?.dot_td} onChange={e => setCarEdits({...carEdits, [activeTab]: {...carEdits[activeTab], dot_td: e.target.value}})} /></div>
                    </div>
                  </div>
                </div>
              </div>

              <h4 className="font-black text-slate-400 text-xs tracking-widest mb-4 flex justify-between items-center">
                <span>2. REVISIÓN POR PUNTOS</span>
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
                  <button onClick={iniciarInspeccion} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-blue-700 whitespace-nowrap h-fit">
                    Comenzar
                  </button>
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
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Total Orden: {money(order.total)}</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full mt-4">
              <button onClick={handleSeguimiento} className="bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg shadow-xl shadow-green-500/30 transition-transform active:scale-95 w-full sm:w-auto">
                <MessageCircle className="w-6 h-6" /> Enviar Seguimiento
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {order.orden_autos.map((rel) => {
              const carId = rel.autos.id;
              const repuestosDelAuto = orderDetails.filter(d => d.auto_id === carId);
              const totalAuto = repuestosDelAuto.reduce((s, d) => s + d.total_linea, 0);
              const fotosDelAuto = orderPhotos.filter(p => p.auto_id === carId);
              const informeDelAuto = inspecciones.find(i => i.auto_id === carId);

              const datosPDF = {
                vehiculo: {
                  orden: order.id.slice(0,6).toUpperCase(),
                  cliente: order.clientes?.nombre,
                  rut: order.clientes?.rut,
                  telefono: order.clientes?.telefono,
                  patente: rel.autos.patente,
                  marca: rel.autos.marca,
                  modelo: rel.autos.modelo,
                  anio: carEdits[carId]?.anio || rel.autos.anio || '',
                  vin: carEdits[carId]?.vin || rel.autos.vin || '',
                  km: rel.kilometraje || '0', 
                  combustible: rel.nivel_combustible || '50', 
                  observaciones: rel.observaciones_recepcion || '', 
                  fecha: new Date(order.created_at).toLocaleDateString('es-CL'),
                  tecnico: 'Taller Multifrenos',
                  bateria: (carEdits[carId]?.bateria_mes && carEdits[carId]?.bateria_anio) ? `${carEdits[carId]?.bateria_mes} / ${carEdits[carId]?.bateria_anio}` : 'Sin Reg.',
                  dot_del: `Izq: ${carEdits[carId]?.dot_di || '-'} | Der: ${carEdits[carId]?.dot_dd || '-'}`,
                  dot_tras: `Izq: ${carEdits[carId]?.dot_ti || '-'} | Der: ${carEdits[carId]?.dot_td || '-'}`
                },
                reparaciones: repuestosDelAuto.map(rep => ({ texto: rep.servicio_nombre, precio: rep.total_linea })),
                fotos: fotosDelAuto,
                inspeccion: informeDelAuto ? informeDelAuto.resultados : null,
                total: totalAuto,
                impuestos: 0 
              };

              return (
                <div key={carId} className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-slate-500" />
                      <span className="font-bold font-mono text-lg">{rel.autos.patente}</span>
                    </div>
                    
                    {/* --- AQUÍ ESTÁ EL NUEVO BOTONCITO DOBLE --- */}
                    <div className="flex items-center gap-2">
                      <PDFDownloadLink 
                        document={<OrdenPDF orden={datosPDF} modo="impresion" />} 
                        fileName={`OrdenFisica_${rel.autos.patente}.pdf`} 
                        className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 px-3 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                        title="Imprimir en B/N sin fotos para firmar"
                      >
                        {({ loading }) => loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Printer className="w-4 h-4"/> Imprimir</>}
                      </PDFDownloadLink>

                      <PDFDownloadLink 
                        document={<OrdenPDF orden={datosPDF} modo="digital" />} 
                        fileName={`Informe_${rel.autos.patente}.pdf`} 
                        className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2 shadow transition-transform active:scale-95"
                      >
                        {({ loading }) => loading ? 'Generando...' : <><FileText className="w-4 h-4"/> PDF Digital</>}
                      </PDFDownloadLink>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Año</label><input type="number" className="w-full p-2 border rounded mt-1 bg-white font-bold text-center" value={carEdits[carId]?.anio} onChange={(e) => setCarEdits({...carEdits, [carId]: {...carEdits[carId], anio: e.target.value}})} /></div>
                    <div><label className="text-xs font-bold text-slate-500 uppercase">Color</label><input className="w-full p-2 border rounded mt-1 bg-white font-bold text-center uppercase" value={carEdits[carId]?.color} onChange={(e) => setCarEdits({...carEdits, [carId]: {...carEdits[carId], color: e.target.value}})} /></div>
                    <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Número VIN / Chasis</label><input className="w-full p-2 border rounded mt-1 uppercase font-mono bg-white font-bold text-center" value={carEdits[carId]?.vin} onChange={(e) => setCarEdits({...carEdits, [carId]: {...carEdits[carId], vin: e.target.value.toUpperCase()}})} /></div>
                  </div>
                  <button onClick={() => updateCarDetails(carId)} className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-bold text-sm">
                    <Save className="w-4 h-4" /> Guardar Perfil del Vehículo
                  </button>
                </div>
              )
            })}
          </div>

          <div className="pt-8 flex justify-center">
            <button onClick={deleteOrder} className="text-red-400 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded transition-colors flex items-center gap-2 text-sm">
              <Trash2 className="w-4 h-4" /> Eliminar esta orden permanentemente
            </button>
          </div>
        </div>
      )}

    </div>
  )
}