import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabase/client'
import { Loader2, Car, Clock, Wrench, ShieldCheck, MapPin, Phone, Check, MessageCircle, ExternalLink, Receipt, ChevronRight } from 'lucide-react'

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
    const mensaje = `Hola equipo Multifrenos 🚗🔧.\nEstoy revisando el estado de mi orden #${order.id.slice(0,6).toUpperCase()} (Patente: *${patente}*). Quisiera hacerles una consulta...`
    window.open(`https://wa.me/${telefonoTaller}?text=${encodeURIComponent(mensaje)}`, '_blank')
  }

  const handleIrAlPortal = () => {
    if (!order?.clientes?.token_flota) return
    const ruta = order.clientes.tipo === 'Empresa' ? '/portal/' : '/mi-auto/'
    navigate(`${ruta}${order.clientes.token_flota}`)
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white selection:bg-blue-500">
      <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md mb-6 shadow-2xl border border-white/20">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400"/>
      </div>
      <p className="text-blue-100 font-bold tracking-widest uppercase text-sm animate-pulse">Conectando con el taller...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md border border-red-100">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-10 h-10"/>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Enlace Caducado</h2>
        <p className="text-slate-500 text-sm font-medium leading-relaxed">No pudimos encontrar esta orden de trabajo. Es posible que ya haya sido archivada. Solicita un nuevo enlace al taller.</p>
      </div>
    </div>
  )

  // --- CONFIGURACIÓN INTELIGENTE DEL STEPPER ---
  const stepConfig = [
    { status: 'Agendado', title: 'Cita Agendada', desc: 'Esperando ingreso del vehículo.', activeBg: 'bg-indigo-600', text: 'text-indigo-700' },
    { status: 'Recibido', title: 'Vehículo en Taller', desc: 'Ingresado y asignado a un técnico.', activeBg: 'bg-blue-600', text: 'text-blue-700' },
    { status: 'En Proceso', title: 'En Reparación', desc: 'Nuestros expertos están trabajando.', activeBg: 'bg-amber-500', text: 'text-amber-600' },
    { status: 'Finalizado', title: 'Listo para Retiro', desc: 'Trabajo terminado y verificado.', activeBg: 'bg-green-500', text: 'text-green-700' },
    { status: 'Entregado', title: 'Entregado', desc: '¡Gracias por tu preferencia!', activeBg: 'bg-slate-800', text: 'text-slate-900' }
  ]
  
  const currentStepIndex = stepConfig.findIndex(s => s.status === order.estado)
  const formatMoney = (amount) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)

  return (
    <div className="min-h-screen bg-[#f4f7f9] pb-10 font-sans selection:bg-blue-200 relative">
      
      {/* HEADER TIPO APP NATIVA */}
      <header className="bg-slate-900 text-white pt-12 pb-24 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Wrench className="w-56 h-56 rotate-12" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <img src={LOGO_URL} alt="Multifrenos" className="h-16 object-contain mb-6 bg-white/5 p-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg" />
          <h1 className="text-3xl font-black tracking-tight leading-tight text-white mb-1">Estado del Servicio</h1>
          <p className="text-blue-300 font-mono text-xs uppercase tracking-[0.2em] font-bold">Orden #{order.id.slice(0,6).toUpperCase()}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 -mt-16 relative z-20 space-y-6">
        
        {/* 1. TARJETA VEHÍCULO (ESTILO WALLET) */}
        {order.orden_autos.map((rel, i) => (
          <div key={i} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col group">
            <div className="bg-slate-800 p-5 flex items-center gap-4 relative overflow-hidden">
              <Car className="absolute -right-2 -bottom-4 w-24 h-24 text-white opacity-5" />
              <div className="bg-white px-4 py-2 rounded-xl font-mono font-black text-slate-900 shadow-inner tracking-[0.15em] text-xl border-2 border-slate-300 relative z-10">
                {rel.autos.patente}
              </div>
              <div className="relative z-10">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Vehículo</p>
                <p className="font-bold text-white text-lg leading-none">{rel.autos.marca} <span className="text-blue-400">{rel.autos.modelo}</span></p>
              </div>
            </div>
            <div className="p-4 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Phone className="w-4 h-4 text-slate-400"/></div>
                {order.clientes?.nombre}
              </div>
              <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-3 py-1 rounded-lg uppercase tracking-widest">{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
        
        {/* 2. TARJETA DE ESTADO (STEPPER INTELIGENTE) */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-7">
          <h2 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-lg border-b border-slate-100 pb-4">
            <Clock className="w-5 h-5 text-blue-500"/> Progreso en Tiempo Real
          </h2>
          
          <div className="relative pl-1">
            <div className="space-y-0 relative z-10">
              {stepConfig.map((step, index) => {
                const isCompleted = index <= currentStepIndex
                const isCurrent = index === currentStepIndex
                const isLast = index === stepConfig.length - 1
                
                return (
                  <div key={step.status} className="relative">
                    {/* Línea conectora (se oculta en el último paso) */}
                    {!isLast && (
                      <div className={`absolute left-[15px] top-8 bottom-[-8px] w-0.5 z-0 transition-colors duration-500 ${index < currentStepIndex ? 'bg-blue-500' : 'bg-slate-100'}`}></div>
                    )}
                    
                    <div className="flex items-start gap-5 pb-8 relative z-10">
                      {/* El Circulito */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all duration-500 ring-4 ${
                        isCurrent ? `${step.activeBg} text-white ring-blue-100 scale-110 shadow-blue-500/40` : 
                        isCompleted ? 'bg-blue-500 text-white ring-white' : 
                        'bg-slate-100 text-slate-400 ring-white'
                      }`}>
                        {isCompleted && !isCurrent ? <Check className="w-4 h-4"/> : (index + 1)}
                      </div>
                      
                      {/* El Texto */}
                      <div className={`pt-1 transition-all ${isCurrent ? '-mt-1' : ''}`}>
                        <p className={`font-black tracking-tight text-base ${isCurrent ? step.text : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                          {step.title}
                        </p>
                        <p className={`text-xs mt-1 font-medium ${isCurrent ? 'text-slate-600' : 'text-slate-400'}`}>
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 3. DETALLE FINANCIERO (VOUCHER DIGITAL) */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden relative">
          {/* Borde dentado estilo ticket */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[radial-gradient(circle,transparent_4px,#ffffff_5px)] bg-[length:12px_12px] -mt-1 z-20 drop-shadow-sm"></div>
          
          <div className="p-7 pt-8">
            <h2 className="font-black text-slate-800 mb-5 flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-blue-500"/> Presupuesto
            </h2>
            
            {details.length === 0 ? (
              <div className="bg-orange-50 border border-orange-100 text-orange-700 p-5 rounded-2xl text-sm font-bold text-center flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin shrink-0"/> Evaluando servicios... En breve actualizaremos tu presupuesto.
              </div>
            ) : (
              <div className="space-y-1">
                {details.map((det) => (
                  <div key={det.id} className="flex justify-between items-center py-3 border-b border-dashed border-slate-200 last:border-0">
                    <div className="pr-4 flex-1">
                      <p className="text-sm font-bold text-slate-700 leading-tight">{det.servicio_nombre}</p>
                    </div>
                    <p className="text-sm font-mono font-black text-slate-900">{formatMoney(det.total_linea)}</p>
                  </div>
                ))}
                
                <div className="mt-4 pt-5 border-t-[3px] border-slate-800 flex justify-between items-end">
                  <span className="font-black text-slate-500 text-xs uppercase tracking-widest">Total a Pagar</span>
                  <span className="text-3xl font-black font-mono text-green-600 tracking-tight">{formatMoney(order.total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTÓN: IR AL GARAJE VIRTUAL (CROSS-SELLING) */}
        {order.clientes?.token_flota && (
          <div className="pt-2">
            <button 
              onClick={handleIrAlPortal}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-5 rounded-2xl shadow-2xl flex items-center justify-between px-6 transition-transform active:scale-95 group"
            >
              <div className="text-left">
                <span className="block text-[10px] text-blue-300 uppercase tracking-widest mb-1">Tu perfil de cliente</span>
                <span className="text-lg">Ir a mi Garaje Virtual</span>
              </div>
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <ChevronRight className="w-5 h-5 text-white"/>
              </div>
            </button>
            <p className="text-center text-xs text-slate-500 mt-3 font-medium px-4">Revisa el historial y la salud a largo plazo de todos tus vehículos en un solo lugar.</p>
          </div>
        )}

        {/* INFO CONTACTO FOOTER */}
        <div className="text-center space-y-3 pt-6 pb-4 border-t border-slate-200 mt-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taller Automotriz Multifrenos</p>
          <div className="flex flex-col gap-2 items-center justify-center">
            <a href="#" className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-full flex items-center gap-2 hover:text-blue-600 transition-colors shadow-sm"><MapPin className="w-3.5 h-3.5"/> Frankfort 5030, San Miguel</a>
            <a href="tel:+56987763347" className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-full flex items-center gap-2 hover:text-blue-600 transition-colors shadow-sm"><Phone className="w-3.5 h-3.5"/> +56 9 8776 3347</a>
          </div>
        </div>

      </main>

      {/* BOTÓN FLOTANTE WHATSAPP (S.O.S / CONTACTO) */}
      <button 
        onClick={handleWhatsApp} 
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-[#25D366] hover:bg-[#1DA851] text-white p-4 rounded-full shadow-[0_8px_25px_rgba(37,211,102,0.4)] flex items-center justify-center transition-transform hover:scale-110 z-40 group"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute right-16 bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg">
          Consultar por WhatsApp
        </span>
        <span className="absolute top-0 right-0 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-[#1DA851] border-2 border-white"></span>
        </span>
      </button>

    </div>
  )
}