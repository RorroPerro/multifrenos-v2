import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { PDFDownloadLink } from '@react-pdf/renderer'
import CotizacionPDF from '../../components/CotizacionPDF'
import { useNavigate } from 'react-router-dom'
// AQUÍ ESTÁ EL ÍCONO "Car" CORRECTAMENTE IMPORTADO
import { Calculator, Plus, Search, Trash2, ArrowLeft, Loader2, Save, FileText, CheckCircle2, MessageCircle, AlertTriangle, ArrowRight, Car, X, User, Phone, Box } from 'lucide-react'

export default function CotizacionesPage() {
    const [view, setView] = useState('list') // 'list' o 'form'
    const [cotizaciones, setCotizaciones] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const navigate = useNavigate()

    // Base de datos para los buscadores
    const [catalogoServicios, setCatalogoServicios] = useState([])
    const [inventario, setInventario] = useState([])
    const [clientesDB, setClientesDB] = useState([])

    // Buscadores
    const [searchTerm, setSearchTerm] = useState('')
    const [searchType, setSearchType] = useState('servicio') // 'servicio', 'repuesto', 'manual'
    const [showClientDropdown, setShowClientDropdown] = useState(false)

    // Formulario de Cotización Actual
    const [currentCoti, setCurrentCoti] = useState(null)
    const [manualItem, setManualItem] = useState({ nombre: '', precio: '' })

    // --- NUEVOS ESTADOS PARA ANIDACIÓN ---
    const [nestingInItemId, setNestingInItemId] = useState(null)
    const [searchNestTerm, setSearchNestTerm] = useState('')
    const [selectedNestInv, setSelectedNestInv] = useState(null)
    const [nestingMode, setNestingMode] = useState('inventario') // 'inventario' o 'manual'
    const [manualNestName, setManualNestName] = useState('')
    const [manualNestPrice, setManualNestPrice] = useState('')

    useEffect(() => {
        fetchCotizaciones()
        fetchBases()
    }, [])

    async function fetchCotizaciones() {
        setLoading(true)
        const { data } = await supabase.from('cotizaciones').select('*').order('created_at', { ascending: false })
        if (data) setCotizaciones(data)
        setLoading(false)
    }

    async function fetchBases() {
        const { data: serv } = await supabase.from('servicios').select('*')
        const { data: inv } = await supabase.from('inventario').select('*').gt('stock_actual', 0)
        const { data: cli } = await supabase.from('clientes').select('id, nombre, telefono').order('nombre')

        if (serv) setCatalogoServicios(serv)
        if (inv) setInventario(inv)
        if (cli) setClientesDB(cli)
    }

    const deleteCotizacion = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta cotización del historial?')) return
        await supabase.from('cotizaciones').delete().eq('id', id)
        setCotizaciones(cotizaciones.filter(c => c.id !== id))
    }

    const handleCreateNew = () => {
        setCurrentCoti({
            id: null,
            cliente_nombre: '',
            cliente_telefono: '',
            vehiculo_info: '',
            detalles: [],
            incluye_iva: true,
            total: 0,
            estado: 'Pendiente'
        })
        setView('form')
    }

    const handleEdit = (coti) => {
        setCurrentCoti(coti)
        setView('form')
    }

    // --- LÓGICA DE ITEMS EN MEMORIA (CORREGIDA) ---
    const addItem = (item) => {
        let precioItem = 0 // <-- CORREGIDO: Todo en español
        let nombre = ''
        let tipo = searchType
        let refId = item?.id || null

        if (searchType === 'servicio') {
            precioItem = (Number(item.precio_mano_obra) || 0) + (Number(item.precio_repuestos) || 0)
            nombre = item.nombre
        } else if (searchType === 'repuesto') {
            precioItem = Number(item.precio_venta) || 0
            nombre = item.nombre
        } else {
            if (!manualItem.nombre || !manualItem.precio) return alert('Completa nombre y precio manual')
            precioItem = Number(manualItem.precio)
            nombre = manualItem.nombre
            tipo = 'manual'
        }

        const newItem = { id_temp: Date.now(), tipo, referencia_id: refId, nombre, precio: precioItem, insumos_anidados: [] }
        const newDetalles = [...currentCoti.detalles, newItem]

        updateTotals(newDetalles, currentCoti.incluye_iva)
        setSearchTerm('');
        setManualItem({ nombre: '', precio: '' })
    }

    const removeItem = (id_temp) => {
        const newDetalles = currentCoti.detalles.filter(i => i.id_temp !== id_temp)
        updateTotals(newDetalles, currentCoti.incluye_iva)
    }

    const updateTotals = (detalles, ivaActivo) => {
        const subtotal = detalles.reduce((sum, i) => sum + i.precio, 0)
        const total = ivaActivo ? Math.round(subtotal * 1.19) : subtotal
        setCurrentCoti(prev => ({ ...prev, detalles, incluye_iva: ivaActivo, total }))
    }

    const addNestedInsumo = (parentTempId) => {
        const parentDetail = currentCoti.detalles.find(d => d.id_temp === parentTempId)
        let newInsumo = {}

        if (nestingMode === 'inventario') {
            if (!selectedNestInv) return alert('Busca y selecciona un repuesto primero')
            const precioInsumo = Number(selectedNestInv.precio_venta) || 0
            newInsumo = {
                id_temp: Date.now(),
                referencia_id: selectedNestInv.id,
                nombre: selectedNestInv.nombre,
                categoria: selectedNestInv.categoria || 'Repuesto',
                precio: precioInsumo
            }
        } else {
            if (!manualNestName || !manualNestPrice) return alert('Llena el nombre y precio del insumo')
            const precioManual = Number(manualNestPrice) || 0
            newInsumo = {
                id_temp: Date.now(),
                referencia_id: 'manual',
                nombre: manualNestName,
                categoria: 'Repuesto Libre',
                precio: precioManual
            }
        }

        const newDetalles = currentCoti.detalles.map(d => {
            if (d.id_temp === parentTempId) {
                return {
                    ...d,
                    insumos_anidados: [...(d.insumos_anidados || []), newInsumo],
                    precio: d.precio + newInsumo.precio
                }
            }
            return d
        })

        updateTotals(newDetalles, currentCoti.incluye_iva)
        setSearchNestTerm('')
        setSelectedNestInv(null)
        setManualNestName('')
        setManualNestPrice('')
        setNestingInItemId(null)
    }

    const removeNestedInsumo = (parentTempId, insumoTempId) => {
        const parentDetail = currentCoti.detalles.find(d => d.id_temp === parentTempId)
        const insumoToRemove = parentDetail.insumos_anidados.find(i => i.id_temp === insumoTempId)

        const newDetalles = currentCoti.detalles.map(d => {
            if (d.id_temp === parentTempId) {
                return {
                    ...d,
                    insumos_anidados: d.insumos_anidados.filter(i => i.id_temp !== insumoTempId),
                    precio: d.precio - (insumoToRemove?.precio || 0)
                }
            }
            return d
        })

        updateTotals(newDetalles, currentCoti.incluye_iva)
    }

    // --- GUARDADO ---
    const saveCotizacion = async () => {
        if (!currentCoti.cliente_nombre) return alert('Ponle al menos un nombre al cliente')
        setSaving(true)

        const payload = {
            cliente_nombre: currentCoti.cliente_nombre,
            cliente_telefono: currentCoti.cliente_telefono,
            vehiculo_info: currentCoti.vehiculo_info,
            detalles: currentCoti.detalles,
            incluye_iva: currentCoti.incluye_iva,
            total: currentCoti.total,
            estado: currentCoti.estado
        }

        if (currentCoti.id) {
            await supabase.from('cotizaciones').update(payload).eq('id', currentCoti.id)
        } else {
            await supabase.from('cotizaciones').insert([payload])
        }

        setSaving(false)
        setView('list')
        fetchCotizaciones()
    }

    // --- CONVERSIÓN MÁGICA A ORDEN REAL ---
    const convertirAOrden = async () => {
        if (!confirm('¿El cliente aprobó? Se creará una Orden de Trabajo real y se descontará el stock de la bodega.')) return
        setSaving(true)

        try {
            let clienteId = null;

            // 1. Búsqueda exhaustiva para evitar duplicados
            if (currentCoti.cliente_nombre && currentCoti.cliente_telefono) {
                const { data: exClienteFull } = await supabase.from('clientes')
                    .select('id').ilike('nombre', currentCoti.cliente_nombre.trim()).eq('telefono', currentCoti.cliente_telefono.trim()).limit(1).maybeSingle()
                if (exClienteFull) clienteId = exClienteFull.id
            }
            if (!clienteId && currentCoti.cliente_telefono) {
                const { data: exClienteTel } = await supabase.from('clientes')
                    .select('id').eq('telefono', currentCoti.cliente_telefono.trim()).limit(1).maybeSingle()
                if (exClienteTel) clienteId = exClienteTel.id
            }
            if (!clienteId && currentCoti.cliente_nombre) {
                const { data: exClienteNom } = await supabase.from('clientes')
                    .select('id').ilike('nombre', currentCoti.cliente_nombre.trim()).limit(1).maybeSingle()
                if (exClienteNom) clienteId = exClienteNom.id
            }

            // 2. Si definitivamente no existe, lo creamos
            if (!clienteId) {
                const { data: newC, error: errC } = await supabase.from('clientes')
                    .insert([{
                        nombre: currentCoti.cliente_nombre.trim() || 'Cliente de Cotización',
                        telefono: currentCoti.cliente_telefono?.trim() || null
                    }]).select().single()
                if (errC) throw new Error('Error al crear cliente: ' + errC.message)
                clienteId = newC.id
            }

            // 3. Creamos un Auto temporal referencial
            const patenteTmp = `COT-${Math.floor(100 + Math.random() * 900)}`
            const { data: newAuto, error: errA } = await supabase.from('autos')
                .insert([{ cliente_id: clienteId, patente: patenteTmp, marca: currentCoti.vehiculo_info || 'Auto a revisar' }])
                .select().single()
            if (errA) throw new Error('Error al crear auto: ' + errA.message)

            // 4. Creamos la Orden base
            const { data: newOrder, error: errO } = await supabase.from('ordenes')
                .insert([{ cliente_id: clienteId, estado: 'Agendado', incluye_iva: currentCoti.incluye_iva, total: currentCoti.total }])
                .select().single()
            if (errO) throw new Error('Error al crear orden: ' + errO.message)

            // 5. Vinculamos Auto y Orden
            await supabase.from('orden_autos').insert([{ orden_id: newOrder.id, auto_id: newAuto.id, observaciones_recepcion: 'Viene de Cotización aprobada.' }])

            // 6. Inyectamos Detalles y Descontamos Stock
            for (const item of currentCoti.detalles) {
                await supabase.from('orden_detalle').insert([{
                    orden_id: newOrder.id, auto_id: newAuto.id, tipo_item: item.tipo, servicio_nombre: item.nombre, precio_unitario: item.precio, total_linea: item.precio, cantidad: 1, insumos_anidados: item.insumos_anidados || []
                }])

                // Descuento de stock si era repuesto de bodega principal
                if (item.tipo === 'repuesto' && item.referencia_id) {
                    const { data: invData } = await supabase.from('inventario').select('stock_actual').eq('id', item.referencia_id).single()
                    if (invData) await supabase.from('inventario').update({ stock_actual: (invData.stock_actual || 0) - 1 }).eq('id', item.referencia_id)
                }

                // Descuento de stock para insumos anidados
                if (item.insumos_anidados && item.insumos_anidados.length > 0) {
                    for (const insumo of item.insumos_anidados) {
                        if (insumo.referencia_id !== 'manual') {
                            const { data: invDataAnidado } = await supabase.from('inventario').select('stock_actual').eq('id', insumo.referencia_id).single()
                            if (invDataAnidado) {
                                await supabase.from('inventario').update({ stock_actual: (invDataAnidado.stock_actual || 0) - 1 }).eq('id', insumo.referencia_id)
                            }
                        }
                    }
                }
            }

            // 7. Marcamos Cotización como Aprobada
            await supabase.from('cotizaciones').update({ estado: 'Aprobada' }).eq('id', currentCoti.id)

            alert('¡Aprobada exitosamente! Creada en sistema y stock descontado.')
            navigate(`/ordenes/${newOrder.id}`)

        } catch (error) {
            alert('Error en la conversión: ' + error.message)
            setSaving(false)
        }
    }

    // --- WHATSAPP MÁGICO ---
    const handleWhatsApp = (coti) => {
        let phone = coti.cliente_telefono.replace(/\D/g, '')
        if (phone.length === 9) phone = '56' + phone

        const itemsText = coti.detalles.map(item => ` *${item.nombre}:* ${money(item.precio)}`).join('%0A')
        const impuestoTexto = coti.incluye_iva ? `%0A *IVA (19%):* ${money(Math.round(coti.total - (coti.total / 1.19)))}` : ''

        const mensaje = `Hola *${coti.cliente_nombre}*! %0A%0ATe escribimos de *Taller Multifrenos* para enviarte la cotización de tu *${coti.vehiculo_info}*:%0A%0A${itemsText}${impuestoTexto}%0A%0A *TOTAL ESTIMADO:* ${money(coti.total)}%0A%0ATe adjunto el archivo PDF con el detalle formal. ¡Quedamos atentos a tu confirmación! `

        window.open(`https://wa.me/${phone}?text=${mensaje}`, '_blank')
    }

    const money = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0)

    // Filtros de Búsqueda
    const filteredSearch = searchType === 'servicio'
        ? catalogoServicios.filter(s => s.nombre.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5)
        : inventario.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5)

    // Filtro de Clientes Inteligente
    const filteredClients = currentCoti?.cliente_nombre
        ? clientesDB.filter(c => c.nombre.toLowerCase().includes(currentCoti.cliente_nombre.toLowerCase())).slice(0, 4)
        : []

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-brand-primary animate-spin" /></div>

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in selection:bg-fuchsia-200">

            {/* VISTA 1: LISTADO HISTÓRICO */}
            {view === 'list' && (
                <>
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                                <Calculator className="w-8 h-8 text-fuchsia-500 bg-fuchsia-50 p-1.5 rounded-xl" /> Cotizador Ágil
                            </h1>
                            <p className="text-slate-500 font-medium mt-1">Arma presupuestos sin afectar tu inventario hasta que aprueben.</p>
                        </div>
                        <button onClick={handleCreateNew} className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-slate-800 transition-transform active:scale-95 w-full sm:w-auto justify-center">
                            <Plus className="w-5 h-5" /> Nueva Cotización
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {cotizaciones.map(coti => (
                            <div key={coti.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-fuchsia-300 transition-all group flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${coti.estado === 'Aprobada' ? 'bg-green-50 text-green-700 border-green-200' :
                                            coti.estado === 'Rechazada' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
                                            }`}>
                                            {coti.estado}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400">{new Date(coti.created_at).toLocaleDateString('es-CL')}</span>
                                    </div>

                                    <h3 className="font-black text-xl text-slate-800 leading-tight truncate">{coti.cliente_nombre || 'Cliente Anónimo'}</h3>
                                    <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mt-1"><Car className="w-3.5 h-3.5" /> {coti.vehiculo_info || 'Auto no especificado'}</p>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-100 flex items-end justify-between">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                                        <span className="font-mono font-black text-xl text-slate-800">{money(coti.total)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(coti)} className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                                            Ver / Editar
                                        </button>
                                        <button onClick={() => deleteCotizacion(coti.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {cotizaciones.length === 0 && (
                            <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                <Calculator className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <p className="text-xl font-black text-slate-800">El historial está vacío.</p>
                                <p className="text-slate-500 font-medium mt-1">Aquí aparecerán todos los presupuestos que armes.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* VISTA 2: FORMULARIO (PUNTO DE VENTA POS) */}
            {view === 'form' && currentCoti && (
                <div className="space-y-6 animate-fade-in">

                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                        <button onClick={() => setView('list')} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5 text-slate-700" /></button>
                        <div className="flex-1 w-full flex flex-col sm:flex-row gap-3 justify-end">
                            <button onClick={saveCotizacion} disabled={saving} className="bg-slate-100 text-slate-700 hover:bg-slate-200 px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                                <Save className="w-4 h-4" /> Guardar Borrador
                            </button>

                            {currentCoti.id && (
                                <div onClick={() => handleWhatsApp(currentCoti)} className="cursor-pointer">
                                    <PDFDownloadLink document={<CotizacionPDF cotizacion={currentCoti} />} fileName={`Cotizacion_${currentCoti.cliente_nombre}.pdf`} className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 shadow-lg shadow-[#25D366]/30 transition-transform active:scale-95">
                                        {({ loading }) => loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageCircle className="w-4 h-4" /> PDF + WhatsApp</>}
                                    </PDFDownloadLink>
                                </div>
                            )}

                            {currentCoti.id && currentCoti.estado !== 'Aprobada' && (
                                <button onClick={convertirAOrden} disabled={saving} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20">
                                    <CheckCircle2 className="w-5 h-5" /> Aprobar / Crear Orden <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* PANEL IZQUIERDO: DATOS CLIENTE (LISTA INTELIGENTE) */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                                <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-2"><User className="w-4 h-4 text-fuchsia-500" /> Cliente</h3>

                                {/* Autocompletado de Cliente */}
                                <div className="relative">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nombre (Busca o escribe nuevo)</label>
                                    <input
                                        autoFocus
                                        placeholder="Ej: Juan Pérez"
                                        className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-fuchsia-400 font-bold text-slate-800"
                                        value={currentCoti.cliente_nombre}
                                        onChange={e => {
                                            setCurrentCoti({ ...currentCoti, cliente_nombre: e.target.value });
                                            setShowClientDropdown(true);
                                        }}
                                        onFocus={() => setShowClientDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowClientDropdown(false), 250)}
                                    />
                                    {showClientDropdown && filteredClients.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-30">
                                            {filteredClients.map(c => (
                                                <div
                                                    key={c.id}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setCurrentCoti({ ...currentCoti, cliente_nombre: c.nombre, cliente_telefono: c.telefono || '' });
                                                        setShowClientDropdown(false);
                                                    }}
                                                    className="p-3 hover:bg-fuchsia-50 cursor-pointer border-b border-slate-50 group"
                                                >
                                                    <p className="font-bold text-sm text-slate-800 group-hover:text-fuchsia-600 transition-colors">{c.nombre}</p>
                                                    {c.telefono && <p className="text-[10px] text-slate-500 font-mono">{c.telefono}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Teléfono (Para WhatsApp)</label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                                        <input placeholder="+56 9..." className="w-full pl-9 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-fuchsia-400 font-bold text-slate-800 font-mono" value={currentCoti.cliente_telefono} onChange={e => setCurrentCoti({ ...currentCoti, cliente_telefono: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vehículo</label>
                                    <input placeholder="Ej: Chevrolet Sail 2019" className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-fuchsia-400 font-bold text-slate-800" value={currentCoti.vehiculo_info} onChange={e => setCurrentCoti({ ...currentCoti, vehiculo_info: e.target.value })} />
                                </div>
                            </div>

                            <div className="bg-fuchsia-50 border-l-4 border-fuchsia-400 p-5 rounded-r-2xl">
                                <AlertTriangle className="w-5 h-5 text-fuchsia-500 mb-2" />
                                <p className="text-sm font-medium text-fuchsia-800 leading-tight">Entorno de cotización. Nada de lo que agregues restará stock físico hasta que pulses "Aprobar".</p>
                            </div>
                        </div>

                        {/* PANEL DERECHO: ITEMS Y TOTALES */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Buscador POS */}
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
                                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl w-full sm:w-fit">
                                    <button onClick={() => setSearchType('servicio')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${searchType === 'servicio' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Catálogo Taller</button>
                                    <button onClick={() => setSearchType('repuesto')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${searchType === 'repuesto' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Insumo Bodega</button>
                                    <button onClick={() => setSearchType('manual')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${searchType === 'manual' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Escritura Libre</button>
                                </div>

                                {searchType !== 'manual' ? (
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                                        <input
                                            placeholder={searchType === 'servicio' ? "Buscar servicio (Ej: Alineación)..." : "Buscar repuesto en bodega..."}
                                            className="w-full pl-10 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-fuchsia-400 font-bold text-slate-700"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                        {searchTerm && filteredSearch.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden z-20">
                                                {filteredSearch.map(item => (
                                                    <div
                                                        key={item.id}
                                                        onMouseDown={(e) => { e.preventDefault(); addItem(item); }}
                                                        className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 flex justify-between items-center group"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-sm text-slate-800 group-hover:text-brand-primary transition-colors">{item.nombre}</p>
                                                            {searchType === 'repuesto' && <p className="text-[10px] text-slate-500">Stock actual: {item.stock_actual}</p>}
                                                        </div>
                                                        <span className="font-mono font-black text-slate-700">{money(searchType === 'servicio' ? (Number(item.precio_mano_obra) + Number(item.precio_repuestos)) : item.precio_venta)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input placeholder="Nombre del concepto..." className="flex-1 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-orange-400 font-bold" value={manualItem.nombre} onChange={e => setManualItem({ ...manualItem, nombre: e.target.value })} />
                                        <input type="number" placeholder="$ Valor" className="w-32 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-orange-400 font-mono font-bold" value={manualItem.precio} onChange={e => setManualItem({ ...manualItem, precio: e.target.value })} />
                                        <button onClick={() => addItem()} className="bg-orange-500 text-white px-5 rounded-xl font-bold hover:bg-orange-600 transition-colors">OK</button>
                                    </div>
                                )}
                            </div>

                            {/* Lista Cotizada */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-black text-slate-600 uppercase tracking-widest text-xs">Cargos Cotizados</h3>
                                </div>
                                <div className="p-0">
                                    {currentCoti.detalles.length === 0 ? (
                                        <p className="text-center py-10 text-slate-400 font-medium">No has agregado conceptos a la cotización.</p>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {currentCoti.detalles.map((item) => (
                                                <div key={item.id_temp} className="flex flex-col">
                                                    <div className="p-4 flex justify-between items-center hover:bg-slate-50 group">
                                                        <div>
                                                            <p className="font-bold text-slate-800 leading-tight">{item.nombre}</p>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.tipo}</span>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <button onClick={() => setNestingInItemId(nestingInItemId === item.id_temp ? null : item.id_temp)} className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5">
                                                                <Plus className="w-3 h-3" /> + Insumo / Repuesto
                                                            </button>
                                                            <span className="font-mono font-black text-lg text-slate-700">{money(item.precio)}</span>
                                                            <button onClick={() => removeItem(item.id_temp)} className="text-slate-300 hover:text-red-500 p-1"><X className="w-5 h-5" /></button>
                                                        </div>
                                                    </div>

                                                    {/* INSUMOS ANIDADOS */}
                                                    {nestingInItemId === item.id_temp && (
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
                                                                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-blue-400" />
                                                                        <input autoFocus placeholder="Código o nombre del repuesto..." className="w-full pl-9 p-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500" value={selectedNestInv ? selectedNestInv.nombre : searchNestTerm} onChange={e => { setSearchNestTerm(e.target.value); setSelectedNestInv(null); }} />

                                                                        {inventario.filter(i => searchNestTerm === '' ? true : (i.nombre.toLowerCase().includes(searchNestTerm.toLowerCase()) || (i.sku && i.sku.toLowerCase().includes(searchNestTerm.toLowerCase())))).slice(0, 10).length > 0 && !selectedNestInv && (
                                                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-2xl rounded-lg max-h-48 overflow-y-auto z-50">
                                                                                {inventario.filter(i => searchNestTerm === '' ? true : (i.nombre.toLowerCase().includes(searchNestTerm.toLowerCase()) || (i.sku && i.sku.toLowerCase().includes(searchNestTerm.toLowerCase())))).slice(0, 10).map(i => (
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
                                                                    <button onClick={() => addNestedInsumo(item.id_temp)} disabled={!selectedNestInv} className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold text-sm">Vincular</button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-2 animate-fade-in">
                                                                    <input autoFocus placeholder="Nombre del repuesto comprado..." className="flex-1 p-2 border border-orange-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500" value={manualNestName} onChange={e => setManualNestName(e.target.value)} />
                                                                    <input type="number" placeholder="$ Precio" className="w-28 p-2 border border-orange-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500" value={manualNestPrice} onChange={e => setManualNestPrice(e.target.value)} />
                                                                    <button onClick={() => addNestedInsumo(item.id_temp)} className="bg-orange-500 text-white px-4 rounded-lg hover:bg-orange-600 font-bold text-sm">Añadir</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {item.insumos_anidados && item.insumos_anidados.length > 0 && (
                                                        <div className="p-3 bg-white space-y-2 border-t border-slate-100 rounded-b-xl">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase ml-2">Insumos vinculados a esta tarea</p>
                                                            {item.insumos_anidados.map(insumo => (
                                                                <div key={insumo.id_temp} className="flex justify-between items-center bg-slate-50/80 px-3 py-2 rounded-lg border border-slate-100">
                                                                    <span className="text-sm text-slate-700 flex items-center gap-2">
                                                                        <Box className="w-4 h-4 text-indigo-400" /> {insumo.nombre}
                                                                        {insumo.referencia_id === 'manual' && <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase">Libre</span>}
                                                                    </span>
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">+{money(insumo.precio)}</span>
                                                                        <button onClick={() => removeNestedInsumo(item.id_temp, insumo.id_temp)} className="text-slate-300 hover:text-red-500" title="Quitar insumo"><X className="w-4 h-4" /></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer Financiero */}
                                <div className="bg-slate-900 p-6 flex flex-wrap items-end justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => updateTotals(currentCoti.detalles, !currentCoti.incluye_iva)}
                                            className={`w-12 h-6 rounded-full relative transition-colors ${currentCoti.incluye_iva ? 'bg-fuchsia-500' : 'bg-slate-600'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${currentCoti.incluye_iva ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">Sumar IVA 19%</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Total Cotización</p>
                                        <p className="font-mono font-black text-4xl text-green-400 tracking-tight">{money(currentCoti.total)}</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}