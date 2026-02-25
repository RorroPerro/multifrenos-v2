import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { Search, Plus, Package, AlertTriangle, X, Loader2, Barcode, ArrowUpCircle, Edit, Trash2, Layers, Camera, Wand2, Minus, TrendingUp, ArrowDownCircle } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function InventoryPage() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  
  // ESTADOS DE UI Y FILTROS
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const scanInputRef = useRef(null)

  // ESTADO DE LA CÁMARA
  const [isScanning, setIsScanning] = useState(false)

  // MODAL CREAR/EDITAR
  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({
    sku: '', nombre: '', categoria: '', marca: '', stock_actual: 0, stock_minimo: 2, precio_compra: 0, precio_venta: 0
  })

  // MODAL INGRESO RÁPIDO DE STOCK POR ESCÁNER
  const [showAddStock, setShowAddStock] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [stockToAdd, setStockToAdd] = useState(1)

  useEffect(() => {
    fetchInventory()
    if (scanInputRef.current && !isScanning) scanInputRef.current.focus()
  }, [])

  // --- EFECTO DE LA CÁMARA ---
  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner("reader", {
        qrbox: { width: 250, height: 100 },
        fps: 10,
      }, false)

      scanner.render((decodedText) => {
        scanner.clear()
        setIsScanning(false)
        processBarcode(decodedText.trim())
      }, (err) => {})

      return () => {
        scanner.clear().catch(error => console.error("Error limpiando cámara", error))
      }
    }
  }, [isScanning])

  async function fetchInventory() {
    setLoading(true)
    const { data, error } = await supabase.from('inventario').select('*').order('nombre')
    if (!error) setInventory(data)
    setLoading(false)
  }

  // --- MOTOR CENTRAL DE ESCANEO ---
  const processBarcode = (scannedSku) => {
    if (!scannedSku) return
    const existingItem = inventory.find(item => item.sku.toLowerCase() === scannedSku.toLowerCase())

    if (existingItem) {
      setSelectedItem(existingItem)
      setStockToAdd(1)
      setShowAddStock(true)
    } else {
      openCreateModal(scannedSku)
    }
  }

  const handleKeyboardScan = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      processBarcode(e.target.value.trim())
      e.target.value = '' 
    }
  }

  // --- FUNCIONES DE GUARDADO Y EDICIÓN RÁPIDA ---
  const openCreateModal = (scannedSku = '') => {
    setIsEditing(false); setEditId(null)
    setFormData({ sku: scannedSku, nombre: '', categoria: activeCategory !== 'Todos' ? activeCategory : '', marca: '', stock_actual: 0, stock_minimo: 2, precio_compra: 0, precio_venta: 0 })
    setShowForm(true)
  }

  const openEditModal = (item) => {
    setIsEditing(true); setEditId(item.id)
    setFormData({ ...item })
    setShowForm(true)
  }

  const generateInternalSKU = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    setFormData({ ...formData, sku: `INT-${randomNum}` })
  }

  async function handleSaveItem(e) {
    e.preventDefault()
    const datos = {
      ...formData,
      stock_actual: Number(formData.stock_actual),
      stock_minimo: Number(formData.stock_minimo),
      precio_compra: Number(formData.precio_compra),
      precio_venta: Number(formData.precio_venta)
    }

    if (isEditing) {
      const { error } = await supabase.from('inventario').update(datos).eq('id', editId)
      if (error) alert('Error: ' + error.message)
      else { setShowForm(false); fetchInventory() }
    } else {
      const { error } = await supabase.from('inventario').insert([datos])
      if (error) alert('Error (Quizás el SKU ya existe): ' + error.message)
      else { setShowForm(false); fetchInventory() }
    }
  }

  async function handleAddStock(e) {
    e.preventDefault()
    const newStock = Number(selectedItem.stock_actual) + Number(stockToAdd)
    const { error } = await supabase.from('inventario').update({ stock_actual: newStock }).eq('id', selectedItem.id)
    
    if (error) alert('Error actualizando stock')
    else {
      setShowAddStock(false)
      fetchInventory()
      setTimeout(() => scanInputRef.current?.focus(), 100) 
    }
  }

  // AJUSTE DE STOCK DE 1 CLIC EN LA LISTA
  async function handleQuickStockAdjust(item, delta, e) {
    if (e) e.stopPropagation()
    const newStock = Math.max(0, Number(item.stock_actual) + delta)
    
    // Actualización optimista en la UI para que se sienta instantáneo
    setInventory(inventory.map(i => i.id === item.id ? { ...i, stock_actual: newStock } : i))
    
    // Actualización silenciosa en DB
    await supabase.from('inventario').update({ stock_actual: newStock }).eq('id', item.id)
  }

  async function handleDelete(id) {
    if(!confirm('¿Eliminar repuesto del inventario?')) return
    await supabase.from('inventario').delete().eq('id', id)
    fetchInventory()
  }

  // --- AGRUPACIÓN Y FILTROS ---
  const categoriasUnicas = [...new Set(inventory.map(i => i.categoria))].filter(Boolean).sort()

  let filteredInventory = inventory.filter(i => 
    i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.marca && i.marca.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (activeCategory !== 'Todos') {
    filteredInventory = filteredInventory.filter(i => i.categoria === activeCategory)
  }

  const formatMoney = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
  
  // Cálculo inteligente de margen
  const calcularMargen = (compra, venta) => {
    const c = Number(compra) || 0;
    const v = Number(venta) || 0;
    if (v === 0) return 0;
    return Math.round(((v - c) / v) * 100);
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER Y ESCÁNER (Diseño POS Profesional) */}
      <div className="bg-slate-900 -mx-4 -mt-4 p-6 sm:px-8 sm:pt-8 sm:pb-12 rounded-b-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
          <Barcode className="w-80 h-80 -mt-16 -mr-16" />
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg border border-blue-500/30 mb-3 text-[10px] font-black uppercase tracking-widest">
              <Layers className="w-3.5 h-3.5"/> Control de Almacén
            </div>
            <h1 className="text-3xl md:text-4xl font-black flex items-center gap-2 tracking-tight"><Package className="w-8 h-8"/> Bodega e Inventario</h1>
          </div>
          <button onClick={() => openCreateModal()} className="w-full sm:w-auto bg-white text-slate-900 px-6 py-3.5 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-transform active:scale-95 shadow-lg">
            <Plus className="w-5 h-5"/> Ingreso Manual
          </button>
        </div>

        {/* BARRA DE ESCÁNER PRINCIPAL */}
        <div className="relative z-10 max-w-4xl mx-auto bg-white/10 p-2 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-xl p-1 gap-1">
            <div className="flex items-center flex-1 pl-2">
              <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
                <Barcode className="w-6 h-6" />
              </div>
              <input 
                ref={scanInputRef}
                type="text"
                placeholder="Pistolear código de barras o escribir SKU y presionar Enter..."
                className="w-full bg-transparent border-none px-4 py-4 text-slate-900 font-mono text-lg font-bold outline-none placeholder:text-slate-400 placeholder:font-sans placeholder:text-sm placeholder:font-medium"
                onKeyDown={handleKeyboardScan}
              />
            </div>
            <button 
              onClick={() => setIsScanning(true)}
              className="bg-slate-900 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors m-1"
            >
              <Camera className="w-5 h-5" /> 
              <span className="sm:hidden lg:inline uppercase tracking-wider text-xs">Cámara</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CÁMARA */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl animate-bounce-in border-4 border-slate-800">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black flex items-center gap-2 tracking-wide uppercase"><Camera className="w-5 h-5 text-blue-400"/> Escáner Activo</h3>
              <button onClick={() => setIsScanning(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <div id="reader" className="w-full bg-black"></div>
            <div className="p-4 bg-slate-900 text-center text-xs text-slate-400 font-medium">Apunta la cámara al código de barras del producto.</div>
          </div>
        </div>
      )}

      {/* FILTROS Y BÚSQUEDA SECUNDARIA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar w-full md:w-auto">
          <button onClick={() => setActiveCategory('Todos')} className={`px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider whitespace-nowrap transition-colors ${activeCategory === 'Todos' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
            Todos
          </button>
          {categoriasUnicas.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-brand-primary text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
          <input 
            placeholder="Buscar repuesto por texto..." 
            className="w-full pl-11 p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none text-sm font-medium bg-white shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LISTA DE INVENTARIO (TABLA EN DESKTOP, TARJETAS EN MÓVIL) */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin w-12 h-12 text-brand-primary"/></div>
      ) : filteredInventory.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium text-lg">Inventario vacío o sin coincidencias.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* MODO DESKTOP (TABLA INTELIGENTE) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="p-4 font-black">Código (SKU)</th>
                  <th className="p-4 font-black">Producto</th>
                  <th className="p-4 font-black text-center">Nivel de Stock</th>
                  <th className="p-4 font-black text-right">Finanzas (Valor / Margen)</th>
                  <th className="p-4 font-black text-center">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredInventory.map((item) => {
                  const isLowStock = item.stock_actual <= item.stock_minimo;
                  const margen = calcularMargen(item.precio_compra, item.precio_venta);

                  return (
                    <tr key={item.id} className={`transition-colors group ${isLowStock ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-slate-50'}`}>
                      
                      <td className="p-4 align-middle">
                        <span className="font-mono font-black text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg tracking-wider">
                          {item.sku}
                        </span>
                      </td>

                      <td className="p-4 align-middle">
                        <p className="font-bold text-slate-800 text-base leading-tight mb-1">{item.nombre}</p>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                          <span className="text-blue-600">{item.marca || 'GENÉRICO'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">{item.categoria}</span>
                        </div>
                      </td>

                      <td className="p-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={(e) => handleQuickStockAdjust(item, -1, e)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center font-black transition-colors">-</button>
                          <div className={`flex flex-col items-center justify-center min-w-[3.5rem] py-1 px-2 rounded-xl border-2 ${isLowStock ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-800 shadow-sm'}`}>
                            <span className="text-lg font-black leading-none">{item.stock_actual}</span>
                            {isLowStock && <span className="text-[8px] font-black uppercase tracking-widest text-red-500 mt-0.5">Bajo</span>}
                          </div>
                          <button onClick={(e) => handleQuickStockAdjust(item, 1, e)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-600 flex items-center justify-center font-black transition-colors">+</button>
                        </div>
                      </td>

                      <td className="p-4 align-middle text-right">
                        <div className="flex flex-col items-end justify-center">
                          <span className="font-black text-lg text-slate-900">{formatMoney(item.precio_venta)}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Costo: {formatMoney(item.precio_compra)}</span>
                            {margen > 0 && (
                              <span className="text-[9px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-green-200">
                                <TrendingUp className="w-2.5 h-2.5"/> {margen}%
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditModal(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"><Edit className="w-4 h-4"/></button>
                          <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* MODO MÓVIL (TARJETAS INTELIGENTES) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredInventory.map((item) => {
              const isLowStock = item.stock_actual <= item.stock_minimo;
              const margen = calcularMargen(item.precio_compra, item.precio_venta);

              return (
                <div key={item.id} className={`p-5 relative transition-colors ${isLowStock ? 'bg-red-50/20' : 'bg-white'}`}>
                  {isLowStock && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>}
                  
                  <div className="flex justify-between items-start mb-2 pl-2">
                    <span className="text-[10px] font-mono font-black bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 tracking-widest">
                      {item.sku}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg border border-slate-100"><Edit className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg border border-slate-100"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                  
                  <div className="pl-2 mb-4">
                    <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1">{item.nombre}</h3>
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-wider">{item.marca || 'GENÉRICO'} • {item.categoria}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pl-2">
                    {/* Tarjeta de Stock Móvil */}
                    <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 ${isLowStock ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Unidades</span>
                      <div className="flex items-center justify-between w-full">
                        <button onClick={() => handleQuickStockAdjust(item, -1)} className="w-8 h-8 rounded-full bg-white shadow-sm text-slate-600 flex items-center justify-center font-black active:scale-90">-</button>
                        <span className={`text-2xl font-black ${isLowStock ? 'text-red-600' : 'text-slate-800'}`}>{item.stock_actual}</span>
                        <button onClick={() => handleQuickStockAdjust(item, 1)} className="w-8 h-8 rounded-full bg-white shadow-sm text-slate-600 flex items-center justify-center font-black active:scale-90">+</button>
                      </div>
                    </div>

                    {/* Tarjeta de Finanzas Móvil */}
                    <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex flex-col justify-center text-right">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Precio Venta</span>
                      <span className="font-black text-xl text-slate-900">{formatMoney(item.precio_venta)}</span>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Costo: {formatMoney(item.precio_compra)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: CREAR / EDITAR REPUESTO */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-bounce-in flex flex-col max-h-[95vh]">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <h3 className="font-black text-lg flex items-center gap-2 uppercase tracking-wide">
                {isEditing ? <><Edit className="w-5 h-5 text-blue-400"/> Editar Repuesto</> : <><Package className="w-5 h-5 text-green-400"/> Nuevo Repuesto</>}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="hover:bg-red-500 hover:text-white text-slate-400 p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-black text-slate-800 mb-4 border-b border-slate-100 pb-2 uppercase tracking-widest text-sm flex items-center gap-2"><Barcode className="w-4 h-4 text-slate-400"/> Identificación</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">SKU / Código de Barras</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input required placeholder="Ej: FIL-ACE-001" className="flex-1 p-3 border-2 border-slate-200 rounded-xl font-mono uppercase font-black tracking-widest outline-none focus:border-blue-500 bg-slate-50" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} />
                      <button type="button" onClick={generateInternalSKU} className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-xl hover:bg-indigo-100 flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest transition-transform active:scale-95">
                        <Wand2 className="w-4 h-4" /> Generar Interno
                      </button>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Nombre / Descripción Comercial</label>
                    <input required placeholder="Ej: Aceite a granel 10W40" className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50 font-bold text-slate-800" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Categoría</label>
                    <input list="cat-inv-list" placeholder="Filtros, Fluidos..." className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50 font-bold text-slate-700" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} required/>
                    <datalist id="cat-inv-list">{categoriasUnicas.map(c => <option key={c} value={c}/>)}</datalist>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Marca</label>
                    <input placeholder="Genérico, Original..." className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 bg-slate-50 font-bold text-slate-700 uppercase" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* CAJA STOCK */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-black text-slate-800 mb-4 border-b border-slate-100 pb-2 uppercase tracking-widest text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-blue-500"/> Inventario</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1.5">Stock Inicial / Actual</label>
                      <input type="number" inputMode="numeric" pattern="[0-9]*" required className="w-full p-3 border-2 border-blue-200 rounded-xl font-black text-xl text-center outline-none focus:border-blue-500 bg-blue-50 text-blue-900" value={formData.stock_actual} onChange={e => setFormData({...formData, stock_actual: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest block mb-1.5">Alerta de Stock Mínimo</label>
                      <input type="number" inputMode="numeric" pattern="[0-9]*" required className="w-full p-3 border-2 border-orange-200 rounded-xl font-black text-xl text-center outline-none focus:border-orange-500 bg-orange-50 text-orange-900" value={formData.stock_minimo} onChange={e => setFormData({...formData, stock_minimo: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* CAJA FINANZAS */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-black text-slate-800 mb-4 border-b border-slate-100 pb-2 uppercase tracking-widest text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500"/> Precios</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Costo Compra Neto</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                        <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-full pl-8 p-3 border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-slate-500 bg-slate-50" value={formData.precio_compra} onChange={e => setFormData({...formData, precio_compra: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Precio Venta Público</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                        <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-full pl-8 p-3 border-2 border-green-300 rounded-xl font-black text-lg outline-none focus:border-green-500 bg-green-50 text-green-900" value={formData.precio_venta} onChange={e => setFormData({...formData, precio_venta: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </form>
            
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-6 py-3 text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleSaveItem} className="w-full sm:w-auto px-8 py-3 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 shadow-xl transition-transform active:scale-95">Guardar Ficha</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUMAR STOCK RÁPIDO VÍA ESCÁNER */}
      {showAddStock && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-in border-t-8 border-green-500">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Package className="w-10 h-10"/>
              </div>
              <h3 className="font-black text-2xl text-slate-800 leading-tight mb-1">¡Repuesto Encontrado!</h3>
              <p className="text-slate-500 font-mono text-sm tracking-widest mb-4">{selectedItem.sku}</p>
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-6 text-left">
                <p className="text-slate-800 font-bold leading-tight">{selectedItem.nombre}</p>
                <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{selectedItem.marca} • {selectedItem.categoria}</p>
              </div>

              <div className="mb-8">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">¿Cuántas unidades ingresan?</label>
                <div className="flex items-center justify-center gap-5">
                  <button onClick={() => setStockToAdd(prev => Math.max(1, prev - 1))} className="w-14 h-14 rounded-full bg-slate-100 text-slate-600 text-3xl font-black hover:bg-slate-200 transition-transform active:scale-90 shadow-sm">-</button>
                  <input type="number" inputMode="numeric" pattern="[0-9]*" value={stockToAdd} onChange={(e) => setStockToAdd(e.target.value)} className="w-24 text-center text-5xl font-black text-slate-900 border-b-4 border-slate-200 outline-none pb-2 focus:border-green-500 bg-transparent" autoFocus />
                  <button onClick={() => setStockToAdd(prev => prev + 1)} className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 text-3xl font-black hover:bg-blue-200 transition-transform active:scale-90 shadow-sm">+</button>
                </div>
                <p className="text-xs font-bold text-slate-400 mt-4">Stock actual en bodega: <span className="text-slate-700">{selectedItem.stock_actual}</span></p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowAddStock(false)} className="flex-1 py-4 text-slate-500 font-bold bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors">Cancelar</button>
                <button onClick={handleAddStock} className="flex-1 py-4 text-white font-black uppercase tracking-widest bg-green-500 rounded-2xl hover:bg-green-600 shadow-lg shadow-green-500/30 flex justify-center items-center gap-2 transition-transform active:scale-95">
                  <ArrowDownCircle className="w-5 h-5"/> Ingresar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}