import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase/client'
import { Search, Plus, Package, AlertTriangle, X, Loader2, Barcode, ArrowUpCircle, Edit, Trash2, Layers, Camera, Wand2 } from 'lucide-react'
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

  // MODAL INGRESO RÁPIDO DE STOCK
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

  // --- FUNCIONES DE GUARDADO ---
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

  return (
    <div className="space-y-6 pb-20">
      
      {/* HEADER Y ESCÁNER */}
      <div className="bg-slate-900 -mx-4 -mt-4 p-6 sm:px-8 sm:pt-8 sm:pb-12 rounded-b-3xl text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none">
          <Barcode className="w-64 h-64 -mt-10 -mr-10" />
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-2"><Package className="w-8 h-8"/> Bodega</h1>
            <p className="text-slate-300 text-sm mt-1">Control de inventario por código de barras</p>
          </div>
          <button onClick={() => openCreateModal()} className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-lg">
            <Plus className="w-5 h-5"/> Registro Manual
          </button>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-lg p-1 gap-1">
            <div className="flex items-center flex-1">
              <div className="bg-blue-100 p-3 rounded-lg text-blue-600 ml-1">
                <Barcode className="w-6 h-6" />
              </div>
              <input 
                ref={scanInputRef}
                type="text"
                placeholder="Escribe el SKU o usa una pistola y presiona Enter..."
                className="w-full bg-transparent border-none px-4 py-3 text-slate-900 font-mono text-base outline-none placeholder:text-slate-400 placeholder:font-sans placeholder:text-sm"
                onKeyDown={handleKeyboardScan}
              />
            </div>
            
            <button 
              onClick={() => setIsScanning(true)}
              className="bg-brand-primary text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-5 h-5" /> 
              <span className="sm:hidden lg:inline">Usar Cámara</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL CÁMARA */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2"><Camera className="w-5 h-5"/> Apunta al Código</h3>
              <button onClick={() => setIsScanning(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6"/></button>
            </div>
            <div id="reader" className="w-full"></div>
          </div>
        </div>
      )}

      {/* FILTROS Y BÚSQUEDA SECUNDARIA */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
          <button onClick={() => setActiveCategory('Todos')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeCategory === 'Todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            Todos
          </button>
          {categoriasUnicas.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-brand-primary text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            placeholder="Buscar por nombre o marca..." 
            className="w-full pl-9 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* LISTA DE INVENTARIO */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin w-8 h-8 text-brand-primary"/></div>
      ) : filteredInventory.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Inventario vacío o sin coincidencias.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredInventory.map((item) => {
            const isLowStock = item.stock_actual <= item.stock_minimo;
            return (
              <div key={item.id} className={`relative overflow-hidden bg-white p-5 rounded-xl border transition-all flex flex-col justify-between group ${isLowStock ? 'border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-slate-200 hover:shadow-md hover:border-blue-300'}`}>
                
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                      {item.sku}
                    </span>
                    <h3 className="font-bold text-lg text-slate-800 mt-2 leading-tight pr-4">{item.nombre}</h3>
                    <p className="text-xs font-bold text-brand-primary uppercase mt-1 tracking-wider">{item.marca || 'Sin Marca'} • {item.categoria}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 ${isLowStock ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'}`}>
                      <span className="text-2xl font-black leading-none">{item.stock_actual}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider">Unid.</span>
                    </div>
                    {isLowStock && <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-100 px-1.5 py-0.5 rounded"><AlertTriangle className="w-3 h-3"/> Bajo</span>}
                  </div>
                </div>

                {/* AQUÍ ESTÁ LA CORRECCIÓN: Le quité el 'relative z-10' para que se deje tapar */}
                <div className="pt-4 mt-auto border-t border-slate-100 flex justify-between items-center bg-white">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Costo Compra</p>
                    <p className="text-sm font-medium text-slate-700">{formatMoney(item.precio_compra)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold text-right">Precio Venta</p>
                    <p className="text-sm font-black text-slate-900 text-right">{formatMoney(item.precio_venta)}</p>
                  </div>
                </div>

                {/* OVERLAY CORREGIDO: Fondo blanco 100% opaco para ocultar los textos de atrás */}
                <div className="absolute left-0 right-0 bottom-0 bg-white border-t border-slate-200 p-4 flex items-center justify-center gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <button onClick={() => {setSelectedItem(item); setStockToAdd(1); setShowAddStock(true)}} className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-2 rounded-lg flex items-center justify-center gap-1 font-bold text-sm transition-colors">
                    <ArrowUpCircle className="w-5 h-5"/> + Stock
                  </button>
                  <button onClick={() => openEditModal(item)} className="bg-blue-50 text-blue-700 hover:bg-blue-100 p-2 rounded-lg font-bold transition-colors" title="Editar">
                    <Edit className="w-5 h-5"/>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="bg-red-50 text-red-700 hover:bg-red-100 p-2 rounded-lg font-bold transition-colors" title="Borrar">
                    <Trash2 className="w-5 h-5"/>
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: CREAR / EDITAR REPUESTO */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">{isEditing ? 'Editar Repuesto' : 'Ingresar Nuevo Repuesto'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="hover:text-red-400"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Barcode className="w-4 h-4"/> SKU / Código Barras</label>
                  <div className="flex gap-2 mt-1">
                    <input required placeholder="Ej: FIL-ACE-001" className="flex-1 p-2 border rounded font-mono uppercase" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} />
                    <button type="button" onClick={generateInternalSKU} className="bg-slate-100 border border-slate-200 text-slate-600 px-3 rounded hover:bg-slate-200 flex items-center gap-2 font-bold text-xs transition-colors">
                      <Wand2 className="w-4 h-4" /> Generar Interno
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre / Descripción</label>
                  <input required placeholder="Ej: Aceite a granel 10W40" className="w-full p-2 border rounded mt-1" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Layers className="w-4 h-4"/> Categoría</label>
                  <input list="cat-inv-list" placeholder="Filtros, Fluidos, Genéricos..." className="w-full p-2 border rounded mt-1" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} required/>
                  <datalist id="cat-inv-list">{categoriasUnicas.map(c => <option key={c} value={c}/>)}</datalist>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Marca</label>
                  <input placeholder="Genérico, Original..." className="w-full p-2 border rounded mt-1" value={formData.marca} onChange={e => setFormData({...formData, marca: e.target.value})} />
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 sm:col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase text-blue-600">Stock Inicial / Actual</label>
                    <input type="number" required className="w-full p-2 border rounded mt-1 font-bold text-lg text-center" value={formData.stock_actual} onChange={e => setFormData({...formData, stock_actual: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase text-orange-600">Alerta de Stock Mínimo</label>
                    <input type="number" required className="w-full p-2 border rounded mt-1 font-bold text-lg text-center" value={formData.stock_minimo} onChange={e => setFormData({...formData, stock_minimo: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Costo Compra (Neto)</label>
                  <div className="relative mt-1"><span className="absolute left-3 top-2.5 text-slate-400">$</span><input type="number" className="w-full pl-7 p-2 border rounded" value={formData.precio_compra} onChange={e => setFormData({...formData, precio_compra: e.target.value})} /></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Precio Venta</label>
                  <div className="relative mt-1"><span className="absolute left-3 top-2.5 text-slate-400">$</span><input type="number" className="w-full pl-7 p-2 border rounded" value={formData.precio_venta} onChange={e => setFormData({...formData, precio_venta: e.target.value})} /></div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-slate-900 text-white font-bold rounded hover:bg-slate-800">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUMAR STOCK RÁPIDO */}
      {showAddStock && selectedItem && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-bounce-in">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8"/>
              </div>
              <h3 className="font-black text-xl text-slate-800 leading-tight mb-1">¡Repuesto Detectado!</h3>
              <p className="text-slate-500 font-mono text-sm">{selectedItem.sku}</p>
              <p className="text-slate-700 mt-2 font-medium bg-slate-50 p-2 rounded">{selectedItem.nombre}</p>

              <div className="my-6">
                <label className="block text-sm font-bold text-slate-500 uppercase mb-2">¿Cuántas unidades ingresan a bodega?</label>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setStockToAdd(prev => Math.max(1, prev - 1))} className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 text-2xl font-bold hover:bg-slate-200 transition">-</button>
                  <input type="number" value={stockToAdd} onChange={(e) => setStockToAdd(e.target.value)} className="w-24 text-center text-4xl font-black text-slate-800 border-b-2 border-slate-300 outline-none p-2 focus:border-brand-primary" autoFocus />
                  <button onClick={() => setStockToAdd(prev => prev + 1)} className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold hover:bg-blue-200 transition">+</button>
                </div>
                <p className="text-xs text-slate-400 mt-3">Stock actual: {selectedItem.stock_actual} unid.</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowAddStock(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200">Cancelar</button>
                <button onClick={handleAddStock} className="flex-1 py-3 text-white font-bold bg-green-500 rounded-xl hover:bg-green-600 shadow-lg shadow-green-500/30 flex justify-center items-center gap-2">
                  <ArrowUpCircle className="w-5 h-5"/> Sumar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}