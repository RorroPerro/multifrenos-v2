import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Building2, Users, Palette, MessageSquare, Save, Loader2, Moon, Sun, Copy, Check, Plus, Trash2, Phone, MapPin, FileText, Percent, ShieldAlert, Smartphone } from 'lucide-react'

export default function AjustesPage() {
  const [activeTab, setActiveTab] = useState('taller')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Estados de datos
  const [config, setConfig] = useState(null)
  const [equipo, setEquipo] = useState([])
  const [darkMode, setDarkMode] = useState(false)
  
  // Estados para respuestas rápidas
  const [copiedId, setCopiedId] = useState(null)
  const [newReply, setNewReply] = useState({ titulo: '', texto: '' })
  const [isAddingReply, setIsAddingReply] = useState(false)

  useEffect(() => {
    fetchData()
    if (localStorage.getItem('theme') === 'dark') {
      setDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: confData } = await supabase.from('configuracion').select('*').eq('id', 1).single()
    if (confData) setConfig(confData)

    const { data: perfilesData } = await supabase.from('perfiles').select('*').order('rol')
    if (perfilesData) setEquipo(perfilesData)

    setLoading(false)
  }

  // --- GUARDAR CONFIGURACIÓN DEL TALLER ---
  async function saveConfig() {
    setSaving(true)
    const { error } = await supabase.from('configuracion').update(config).eq('id', 1)
    setSaving(false)
    if (error) alert('Error al guardar: ' + error.message)
    else alert('✅ Configuración guardada exitosamente')
  }

  // --- CAMBIAR ROL DE UN USUARIO ---
  async function updateRol(userId, newRol) {
    const { error } = await supabase.from('perfiles').update({ rol: newRol }).eq('id', userId)
    if (!error) {
      setEquipo(equipo.map(u => u.id === userId ? { ...u, rol: newRol } : u))
    }
  }

  // --- TOGGLE MODO OSCURO ---
  const toggleDarkMode = () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // --- FUNCIONES DE RESPUESTAS RÁPIDAS ---
  const handleCopy = (id, texto) => {
    navigator.clipboard.writeText(texto)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const addReply = async () => {
    if (!newReply.titulo || !newReply.texto) return alert('Por favor, llena el título y el mensaje.')
    
    const currentReplies = config.respuestas_rapidas || []
    const newReplyObj = { id: Date.now(), titulo: newReply.titulo, texto: newReply.texto }
    const updatedReplies = [...currentReplies, newReplyObj]
    
    setConfig({ ...config, respuestas_rapidas: updatedReplies })
    setNewReply({ titulo: '', texto: '' })
    setIsAddingReply(false)
    
    await supabase.from('configuracion').update({ respuestas_rapidas: updatedReplies }).eq('id', 1)
  }

  const deleteReply = async (idToRemove) => {
    if (!confirm('¿Borrar esta plantilla de mensaje?')) return
    const updatedReplies = (config.respuestas_rapidas || []).filter(r => r.id !== idToRemove)
    setConfig({ ...config, respuestas_rapidas: updatedReplies })
    await supabase.from('configuracion').update({ respuestas_rapidas: updatedReplies }).eq('id', 1)
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-primary w-12 h-12"/></div>

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20 selection:bg-brand-primary selection:text-white">
      
      {/* HEADER DE LA PÁGINA */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          Ajustes del Sistema
        </h1>
        <p className="text-slate-500 font-medium mt-1">Configuración global, permisos de equipo y herramientas rápidas.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:items-start">
        
        {/* NAVEGACIÓN LATERAL / HORIZONTAL (Inteligente según pantalla) */}
        <div className="w-full md:w-72 flex overflow-x-auto md:flex-col gap-2 pb-2 md:pb-0 hide-scrollbar shrink-0 sticky top-4 z-10 bg-slate-50/90 md:bg-transparent backdrop-blur-md md:backdrop-blur-none">
          <button onClick={() => setActiveTab('taller')} className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black transition-all text-sm whitespace-nowrap md:whitespace-normal ${activeTab === 'taller' ? 'bg-slate-900 shadow-xl text-white shadow-slate-900/20' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
            <Building2 className="w-5 h-5"/> Datos del Taller
          </button>
          <button onClick={() => setActiveTab('equipo')} className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black transition-all text-sm whitespace-nowrap md:whitespace-normal ${activeTab === 'equipo' ? 'bg-slate-900 shadow-xl text-white shadow-slate-900/20' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
            <Users className="w-5 h-5"/> Mi Equipo y Roles
          </button>
          <button onClick={() => setActiveTab('whatsapp')} className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black transition-all text-sm whitespace-nowrap md:whitespace-normal ${activeTab === 'whatsapp' ? 'bg-[#25D366] shadow-xl text-white shadow-[#25D366]/30 border-transparent' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
            <MessageSquare className="w-5 h-5"/> Plantillas de Chat
          </button>
          <button onClick={() => setActiveTab('apariencia')} className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl font-black transition-all text-sm whitespace-nowrap md:whitespace-normal ${activeTab === 'apariencia' ? 'bg-indigo-600 shadow-xl text-white shadow-indigo-600/30 border-transparent' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
            <Palette className="w-5 h-5"/> Tema Visual
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 w-full max-w-full">
          
          {/* 1. TALLER */}
          {activeTab === 'taller' && config && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <h2 className="text-xl font-black text-slate-800 mb-6 border-b-2 border-slate-100 pb-3 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-brand-primary"/> Identidad Legal y Comercial
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nombre Oficial o Fantasía</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-800 text-lg transition-colors" value={config.nombre_taller} onChange={e => setConfig({...config, nombre_taller: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">RUT de la Empresa</label>
                    <div className="relative">
                      <FileText className="w-4 h-4 absolute left-4 top-4 text-slate-400"/>
                      <input className="w-full pl-11 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono font-bold text-slate-700 transition-colors" placeholder="Ej: 76.123.456-7" value={config.rut_taller} onChange={e => setConfig({...config, rut_taller: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Teléfono / WhatsApp de Contacto</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-4 top-4 text-slate-400"/>
                      <input inputMode="numeric" className="w-full pl-11 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 transition-colors" placeholder="Ej: +56987763347" value={config.telefono} onChange={e => setConfig({...config, telefono: e.target.value})} />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Dirección Matriz</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-4 top-4 text-slate-400"/>
                      <input className="w-full pl-11 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 transition-colors" placeholder="Ej: Calle 123, Comuna" value={config.direccion} onChange={e => setConfig({...config, direccion: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
                <h2 className="text-xl font-black text-slate-800 mb-6 border-b-2 border-slate-100 pb-3 flex items-center gap-2">
                  <Percent className="w-6 h-6 text-brand-primary"/> Configuración Operativa
                </h2>
                <div className="w-full md:w-1/2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">I.V.A Automático en Presupuestos (%)</label>
                  <div className="relative">
                    <Percent className="w-4 h-4 absolute left-4 top-4 text-slate-400"/>
                    <input type="number" inputMode="numeric" className="w-full pl-11 p-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-black text-2xl text-slate-900 transition-colors" value={config.iva_porcentaje} onChange={e => setConfig({...config, iva_porcentaje: e.target.value})} />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-2">Este valor se usará para calcular el impuesto en las órdenes de trabajo.</p>
                </div>
              </div>

              {/* Botón Guardar Flotante en Móvil */}
              <div className="sticky bottom-4 z-20 flex justify-end">
                <button onClick={saveConfig} disabled={saving} className="w-full sm:w-auto bg-green-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-transform active:scale-95 shadow-xl shadow-green-500/30 disabled:opacity-50">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </div>
          )}

          {/* 2. EQUIPO */}
          {activeTab === 'equipo' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
              <div className="p-6 sm:p-8 border-b-2 border-slate-100 bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-800">Control de Privilegios</h2>
                <p className="text-slate-500 font-medium text-sm mt-1">Limita qué secciones de la plataforma puede ver cada miembro del equipo.</p>
              </div>
              
              <div className="divide-y divide-slate-100">
                {equipo.map(usuario => (
                  <div key={usuario.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border ${
                        usuario.rol === 'admin' ? 'bg-red-50 text-red-500 border-red-200' :
                        usuario.rol === 'recepcion' ? 'bg-blue-50 text-blue-500 border-blue-200' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {usuario.nombre ? usuario.nombre.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-lg leading-tight">{usuario.nombre || 'Usuario Registrado'}</p>
                        <p className="text-[10px] text-slate-400 font-mono tracking-widest mt-1">ID: {usuario.id.slice(0,8)}...</p>
                      </div>
                    </div>
                    
                    <div className="w-full sm:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-1 shadow-sm group-hover:border-blue-300 transition-colors relative">
                      <ShieldAlert className={`w-4 h-4 absolute right-3 top-3.5 pointer-events-none ${
                        usuario.rol === 'admin' ? 'text-red-400' :
                        usuario.rol === 'recepcion' ? 'text-blue-400' :
                        'text-slate-400'
                      }`}/>
                      <select 
                        className="w-full p-2.5 rounded-lg font-bold text-xs outline-none cursor-pointer bg-transparent appearance-none text-slate-700"
                        value={usuario.rol}
                        onChange={(e) => updateRol(usuario.id, e.target.value)}
                      >
                        <option value="admin">🔴 Administrador Total</option>
                        <option value="recepcion">🔵 Recepción / Ventas</option>
                        <option value="mecanico">⚪ Perfil Mecánico</option>
                      </select>
                    </div>
                  </div>
                ))}
                {equipo.length === 0 && <div className="p-10 text-center text-slate-500 font-bold">No hay usuarios en la base de datos.</div>}
              </div>
            </div>
          )}

          {/* 3. RESPUESTAS RÁPIDAS WHATSAPP */}
          {activeTab === 'whatsapp' && config && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-[#25D366]/10 rounded-3xl shadow-sm border border-[#25D366]/20 p-6 sm:p-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-[#1DA851] flex items-center gap-2">
                    <MessageSquare className="w-6 h-6"/> Plantillas de Mensajes
                  </h2>
                  <p className="text-slate-600 font-medium text-sm mt-1">Textos listos para copiar y pegar en WhatsApp con tus clientes.</p>
                </div>
                <button onClick={() => setIsAddingReply(!isAddingReply)} className="bg-[#25D366] text-white hover:bg-[#1DA851] px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-[#25D366]/30 w-full md:w-auto">
                  <Plus className="w-5 h-5"/> Crear Mensaje
                </button>
              </div>

              {isAddingReply && (
                <div className="bg-white border-2 border-[#25D366]/40 p-6 rounded-3xl shadow-lg animate-bounce-in">
                  <h4 className="font-black text-slate-800 mb-4 text-sm uppercase tracking-widest flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#25D366]"/> Redactar Plantilla
                  </h4>
                  <div className="space-y-4">
                    <input placeholder="Título interno (Ej: Presupuesto Listo, Recordatorio...)" className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-[#25D366] font-bold text-slate-800" value={newReply.titulo} onChange={e => setNewReply({...newReply, titulo: e.target.value})} />
                    <textarea placeholder="Hola, te escribimos de Multifrenos para avisarte que..." className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-[#25D366] min-h-[120px] resize-none font-medium text-slate-600 leading-relaxed" value={newReply.texto} onChange={e => setNewReply({...newReply, texto: e.target.value})} />
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end gap-3 mt-5 pt-5 border-t border-slate-100">
                    <button onClick={() => setIsAddingReply(false)} className="px-6 py-3.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                    <button onClick={addReply} className="px-8 py-3.5 bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 shadow-xl transition-transform active:scale-95">Guardar Plantilla</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {(config.respuestas_rapidas || []).map((reply) => (
                  <div key={reply.id} className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between hover:shadow-xl hover:border-[#25D366]/50 transition-all group">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-black text-slate-800 text-base leading-tight pr-4">{reply.titulo}</h4>
                        <button onClick={() => deleteReply(reply.id)} className="text-slate-300 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-2 rounded-xl transition-colors"><Trash2 className="w-4 h-4"/></button>
                      </div>
                      {/* Simulación visual de burbuja de WhatsApp */}
                      <div className="bg-[#E7F6EC] text-[#0C381E] p-4 rounded-2xl rounded-tr-sm text-sm whitespace-pre-wrap leading-relaxed shadow-sm font-medium">
                        {reply.texto}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleCopy(reply.id, reply.texto)}
                      className={`mt-5 w-full py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 ${copiedId === reply.id ? 'bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'}`}
                    >
                      {copiedId === reply.id ? <><Check className="w-4 h-4"/> Copiado al Portapapeles</> : <><Copy className="w-4 h-4"/> Copiar Texto</>}
                    </button>
                  </div>
                ))}
                {(!config.respuestas_rapidas || config.respuestas_rapidas.length === 0) && (
                  <div className="col-span-full text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3"/>
                    <p className="text-slate-500 font-bold text-lg">No hay plantillas creadas.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. APARIENCIA */}
          {activeTab === 'apariencia' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
              <h2 className="text-xl font-black text-slate-800 mb-6 border-b-2 border-slate-100 pb-3 flex items-center gap-2">
                <Palette className="w-6 h-6 text-indigo-500"/> Personalización del Sistema
              </h2>
              
              <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50 border border-slate-200 rounded-2xl gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="font-black text-lg text-slate-800">Modo Oscuro (Fase Beta)</h3>
                  <p className="text-slate-500 font-medium text-sm mt-1">Oscurece la interfaz para proteger tus ojos en ambientes con poca luz.</p>
                </div>
                
                <button 
                  onClick={toggleDarkMode}
                  className={`relative w-24 h-12 rounded-full transition-colors flex items-center shadow-inner shrink-0 ${darkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <div className={`absolute w-10 h-10 rounded-full bg-white flex items-center justify-center transition-all shadow-md ${darkMode ? 'left-13 translate-x-12' : 'left-1'}`}>
                    {darkMode ? <Moon className="w-5 h-5 text-indigo-600"/> : <Sun className="w-5 h-5 text-amber-500"/>}
                  </div>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}