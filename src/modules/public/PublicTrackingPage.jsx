import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { Loader2, Car, Clock, Wrench, ShieldCheck, MapPin, Phone, Check, MessageCircle, ExternalLink } from 'lucide-react'

// El logo de tu taller
const LOGO_URL = "https://qyngfwrjnposqwqrfohi.supabase.co/storage/v1/object/public/fotos-taller/Multifrenos%20(1024%20x%201024%20px)%20(1024%20x%20500%20px)%20(2).png"

export default function PublicTrackingPage() {
  const { id } = useParams() 
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchOrderData()
  }, [id])

  async function fetchOrderData() {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('ordenes')
        .select(`
          *,
          clientes ( nombre, token_flota, tipo ),
          orden_autos ( autos ( patente, marca, modelo ) )
        `)
        .eq('id', id)
        .single()

      if (orderError || !orderData) throw new Error('Orden no encontrada')
      setOrder(orderData)

      const { data: detailsData } = await supabase
        .from('orden_detalle')
        .select('*')
        .eq('orden_id', id)

      setDetails(detailsData || [])
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  // --- BOTÓN INTELIGENTE WHATSAPP ---
  const handleWhatsApp = () => {
    const telefonoTaller = "56987763347" 
    const patente = order.orden_autos[0]?.autos?.patente || 'Vehículo'
    const mensaje = `Hola Multifrenos 🚗🔧! Estoy revisando el estado de mi orden #${order.id.slice(0,6).toUpperCase()} (Patente: *${patente}*). Tengo una consulta...`
    window.open(`https://wa.me/${telefonoTaller}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const handleIrAlPortal = () => {
    if (!order?.clientes?.token_flota) return
    const ruta = order.clientes.tipo === 'Empresa' ? '/portal/' : '/mi-auto/'
    navigate(`${ruta}${order.clientes.token_flota}`)
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4"/>
      <p className="text-slate-500 font-medium animate-pulse">Buscando información de tu vehículo...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-sm border border-red-100">
        <ShieldCheck className="w-16 h-16 text-slate-300 mx-auto mb-4"/>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Enlace Inválido</h2>
        <p className="text-slate-500 text-sm">No pudimos encontrar esta orden de trabajo. Por favor, solicita un nuevo enlace actualizado a nuestro taller.</p>
      </div>
    </div>
  )

  // --- SINCRONIZACIÓN EXACTA CON KANBAN Y ÓRDENES ---
  const stepConfig = [
    { status: 'Agendado', title: 'Cita Agendada', activeBg: 'bg-indigo-600', ring: 'ring-indigo-100', text: 'text-indigo-600' },
    { status: 'Recibido', title: 'Vehículo en Taller', activeBg: 'bg-blue-600', ring: 'ring-blue-100', text: 'text-blue-600' },
    { status: 'En Proceso', title: 'En Reparación', activeBg: 'bg-amber-500', ring: 'ring-amber-100', text: 'text-amber-600' },
    { status: 'Finalizado', title: 'Listo para Retiro', activeBg: 'bg-green-500', ring: 'ring-green-100', text: 'text-green-600' },
    { status: 'Entregado', title: 'Vehículo Entregado', activeBg: 'bg-slate-600', ring: 'ring-slate-100', text: 'text-slate-600' }
  ]
  
  const currentStepIndex = stepConfig.findIndex(s => s.status === order.estado)

  const formatMoney = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-sans selection:bg-blue-200 relative">
      
      {/* HEADER TIPO APP MOVIL */}
      <header className="bg-slate-900 text-white pt-10 pb-8 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none">
          <Wrench className="w-48 h-48" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <img src={LOGO_URL} alt="Multifrenos" className="h-14 object-contain mb-5 bg-white/10 p-2 rounded-xl backdrop-blur-sm shadow-inner" />
          <h1 className="text-2xl font-black tracking-tight leading-tight">Estado de tu Vehículo</h1>
          <p className="text-slate-300 text-xs mt-2 uppercase tracking-widest font-bold opacity-80">Folio: #{order.id.slice(0,6).toUpperCase()}</p>
          <div className="mt-3 bg-blue-500/20 border border-blue-500/30 px-4 py-1.5 rounded-full backdrop-blur-md">
            <p className="text-blue-100 font-medium text-sm">Cliente: <span className="font-bold text-white">{order.clientes?.nombre}</span></p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 -mt-6 relative z-20 space-y-5">
        
        {/* 1. TARJETA DE ESTADO (STEPPER VERTICAL SINCRONIZADO) */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6">
          <h2 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-blue-500"/> Progreso del Servicio
          </h2>
          
          <div className="relative pl-2">
            <div className="absolute left-[23px] top-2 bottom-4 w-0.5 bg-slate-100 z-0"></div>
            
            <div className="space-y-6 relative z-10">
              {stepConfig.map((step, index) => {
                const isCompleted = index <= currentStepIndex
                const isCurrent = index === currentStepIndex
                
                return (
                  <div key={step.status} className="flex items-start gap-4">
                    {/* El Circulito */}
                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-500 ${
                      isCurrent ? `${step.activeBg} text-white ring-4 ${step.ring} scale-110` : 
                      isCompleted ? 'bg-slate-800 text-white ring-4 ring-slate-100' : 
                      'bg-slate-100 text-slate-400 ring-4 ring-white'
                    }`}>
                      {isCompleted && !isCurrent ? <Check className="w-4 h-4"/> : (index + 1)}
                    </div>
                    
                    {/* El Texto */}
                    <div className="pt-1">
                      <p className={`font-black tracking-tight transition-colors ${
                        isCurrent ? `${step.text} text-lg` : 
                        isCompleted ? 'text-slate-800' : 
                        'text-slate-400'
                      }`}>{step.title}</p>
                      {isCurrent && <p className="text-xs text-slate-500 font-medium mt-0.5 animate-pulse">Etapa actual de tu orden</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 2. VEHÍCULOS ASOCIADOS */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6">
           <h2 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-lg">
            <Car className="w-5 h-5 text-blue-500"/> Vehículo en Taller
          </h2>
          <div className="space-y-3">
            {order.orden_autos.map((rel, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-4">
                <div className="bg-white px-3 py-2 border border-slate-200 rounded-xl font-mono font-black text-slate-800 shadow-sm tracking-wider text-lg">
                  {rel.autos.patente}
                </div>
                <div>
                  <p className="font-bold text-slate-700 leading-tight">{rel.autos.marca}</p>
                  <p className="text-sm text-slate-500">{rel.autos.modelo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. DETALLE FINANCIERO / SERVICIOS */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-6 overflow-hidden">
          <h2 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-lg">
            <Wrench className="w-5 h-5 text-blue-500"/> Detalle Presupuesto
          </h2>
          
          {details.length === 0 ? (
            <div className="bg-orange-50 border border-orange-100 text-orange-700 p-4 rounded-xl text-sm font-medium text-center">
              Evaluando servicios necesarios... En breve actualizaremos tu presupuesto.
            </div>
          ) : (
            <div className="space-y-4">
              {details.map((det) => (
                <div key={det.id} className="flex justify-between items-start border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-slate-700 leading-tight">{det.servicio_nombre}</p>
                    {det.tipo === 'repuesto' && <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase font-black tracking-widest mt-1 inline-block">Repuesto</span>}
                  </div>
                  <p className="text-sm font-black text-slate-600 whitespace-nowrap bg-slate-50 px-2 py-1 rounded-lg">{formatMoney(det.total_linea)}</p>
                </div>
              ))}
              
              <div className="mt-2 pt-4 border-t-2 border-dashed border-slate-200 flex justify-between items-end bg-blue-50/50 -mx-6 -mb-6 p-6">
                <span className="font-black text-slate-500 text-sm">TOTAL ESTIMADO</span>
                <span className="text-3xl font-black text-blue-600 tracking-tight">{formatMoney(order.total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* NUEVO BOTÓN: IR AL GARAJE VIRTUAL (Si el cliente tiene Token) */}
        {order.clientes?.token_flota && (
          <div className="pt-2">
            <button 
              onClick={handleIrAlPortal}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              Ir a mi Garaje Virtual <ExternalLink className="w-5 h-5"/>
            </button>
            <p className="text-center text-xs text-slate-500 mt-2 font-medium">Revisa el estado de salud a largo plazo de tus vehículos.</p>
          </div>
        )}

        {/* 4. INFO CONTACTO FOOTER */}
        <div className="text-center space-y-2 pt-6 pb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Taller Multifrenos</p>
          <a href="#" className="text-sm text-slate-500 flex items-center justify-center gap-2 hover:text-blue-600 transition-colors"><MapPin className="w-4 h-4"/> Frankfort 5030, San Miguel</a>
          <a href="tel:+56987763347" className="text-sm text-slate-500 flex items-center justify-center gap-2 hover:text-blue-600 transition-colors"><Phone className="w-4 h-4"/> +56 9 8776 3347</a>
        </div>

      </main>

      {/* BOTÓN FLOTANTE WHATSAPP (S.O.S / CONTACTO) */}
      <button 
        onClick={handleWhatsApp} 
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)] flex items-center justify-center transition-transform hover:scale-110 z-40 group"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute right-16 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Contactar Taller
        </span>
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-200"></span>
        </span>
      </button>

    </div>
  )
}