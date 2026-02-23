import { useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { Building2, Users, Palette, MessageSquare, Save, Loader2, Moon, Sun, Copy, Check, Plus, Trash2 } from 'lucide-react'

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
    if (!newReply.titulo || !newReply.texto) return alert('Llena ambos campos')
    
    const currentReplies = config.respuestas_rapidas || []
    const newReplyObj = { id: Date.now(), titulo: newReply.titulo, texto: newReply.texto }
    const updatedReplies = [...currentReplies, newReplyObj]
    
    setConfig({ ...config, respuestas_rapidas: updatedReplies })
    setNewReply({ titulo: '', texto: '' })
    setIsAddingReply(false)
    
    await supabase.from('configuracion').update({ respuestas_rapidas: updatedReplies }).eq('id', 1)
  }

  const deleteReply = async (idToRemove) => {
    if (!confirm('¿Borrar esta respuesta rápida?')) return
    const updatedReplies = (config.respuestas_rapidas || []).filter(r => r.id !== idToRemove)
    setConfig({ ...config, respuestas_rapidas: updatedReplies })
    await supabase.from('configuracion').update({ respuestas_rapidas: updatedReplies }).eq('id', 1)
  }


  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-brand-primary w-8 h-8"/></div>

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ajustes del Sistema</h1>
        <p className="text-slate-500 text-sm">Administra tu taller, equipo y preferencias</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* MENÚ LATERAL DE AJUSTES */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          <button onClick={() => setActiveTab('taller')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'taller' ? 'bg-white shadow-sm text-brand-primary border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
            <Building2 className="w-5 h-5"/> Perfil del Taller
          </button>
          <button onClick={() => setActiveTab('equipo')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'equipo' ? 'bg-white shadow-sm text-brand-primary border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
            <Users className="w-5 h-5"/> Mi Equipo y Roles
          </button>
          <button onClick={() => setActiveTab('whatsapp')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'whatsapp' ? 'bg-white shadow-sm text-brand-primary border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
            <MessageSquare className="w-5 h-5"/> Respuestas Rápidas
          </button>
          <button onClick={() => setActiveTab('apariencia')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'apariencia' ? 'bg-white shadow-sm text-brand-primary border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}>
            <Palette className="w-5 h-5"/> Apariencia
          </button>
        </div>

        {/* CONTENIDO DE LA PESTAÑA */}
        <div className="flex-1">
          
          {/* 1. TALLER */}
          {activeTab === 'taller' && config && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Información Legal y Comercial</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre Oficial</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-primary" value={config.nombre_taller} onChange={e => setConfig({...config, nombre_taller: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">RUT de la Empresa</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-primary" value={config.rut_taller} onChange={e => setConfig({...config, rut_taller: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Dirección Matriz</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-primary" value={config.direccion} onChange={e => setConfig({...config, direccion: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Teléfono de Contacto</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-primary" value={config.telefono} onChange={e => setConfig({...config, telefono: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">IVA por defecto (%)</label>
                  <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-primary font-mono font-bold" value={config.iva_porcentaje} onChange={e => setConfig({...config, iva_porcentaje: e.target.value})} />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button onClick={saveConfig} disabled={saving} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <Save className="w-5 h-5"/>} Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {/* 2. EQUIPO */}
          {activeTab === 'equipo' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
              <div className="p-6 sm:p-8 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Control de Accesos</h2>
                <p className="text-slate-500 text-sm mt-1">Limita qué puede ver y hacer cada trabajador en el sistema.</p>
              </div>
              
              <div className="divide-y divide-slate-100">
                {equipo.map(usuario => (
                  <div key={usuario.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-lg">{usuario.nombre || 'Usuario sin nombre'}</p>
                      <p className="text-xs text-slate-500 font-mono">{usuario.id}</p>
                    </div>
                    
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nivel de Acceso</label>
                      <select 
                        className={`p-2.5 rounded-lg border font-bold text-sm outline-none cursor-pointer ${
                          usuario.rol === 'admin' ? 'bg-red-50 border-red-200 text-red-700' :
                          usuario.rol === 'recepcion' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          'bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                        value={usuario.rol}
                        onChange={(e) => updateRol(usuario.id, e.target.value)}
                      >
                        <option value="admin">🔴 Administrador (Acceso Total)</option>
                        <option value="recepcion">🔵 Recepción / Ventas (Sin ver dinero global)</option>
                        <option value="mecanico">⚪ Mecánico Técnico (Solo Pizarra y Tareas)</option>
                      </select>
                    </div>
                  </div>
                ))}
                {equipo.length === 0 && <p className="p-8 text-center text-slate-500">No hay usuarios registrados en la tabla perfiles.</p>}
              </div>
            </div>
          )}

          {/* 3. RESPUESTAS RÁPIDAS WHATSAPP */}
          {activeTab === 'whatsapp' && config && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Respuestas Rápidas</h2>
                  <p className="text-slate-500 text-sm">Textos predefinidos para copiar y pegar fácilmente.</p>
                </div>
                <button onClick={() => setIsAddingReply(!isAddingReply)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                  <Plus className="w-4 h-4"/> Nuevo Mensaje
                </button>
              </div>

              {isAddingReply && (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-6 animate-fade-in">
                  <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">Crear Nueva Respuesta</h4>
                  <input placeholder="Título (Ej: Cliente Enojado)" className="w-full p-3 mb-3 border border-slate-200 rounded-lg outline-none focus:border-brand-primary" value={newReply.titulo} onChange={e => setNewReply({...newReply, titulo: e.target.value})} />
                  <textarea placeholder="Escribe el mensaje completo aquí..." className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-brand-primary min-h-[100px]" value={newReply.texto} onChange={e => setNewReply({...newReply, texto: e.target.value})} />
                  <div className="flex justify-end gap-2 mt-3">
                    <button onClick={() => setIsAddingReply(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                    <button onClick={addReply} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800">Guardar Respuesta</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(config.respuestas_rapidas || []).map((reply) => (
                  <div key={reply.id} className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow bg-white group">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-sm">{reply.titulo}</h4>
                        <button onClick={() => deleteReply(reply.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                      </div>
                      <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{reply.texto}</p>
                    </div>
                    <button 
                      onClick={() => handleCopy(reply.id, reply.texto)}
                      className={`mt-4 w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${copiedId === reply.id ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                    >
                      {copiedId === reply.id ? <><Check className="w-4 h-4"/> ¡Copiado!</> : <><Copy className="w-4 h-4"/> Copiar Mensaje</>}
                    </button>
                  </div>
                ))}
                {(!config.respuestas_rapidas || config.respuestas_rapidas.length === 0) && (
                  <p className="col-span-2 text-center text-slate-500 py-8">No tienes respuestas rápidas guardadas.</p>
                )}
              </div>
            </div>
          )}

          {/* 4. APARIENCIA */}
          {activeTab === 'apariencia' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-fade-in">
              <h2 className="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Personalización Visual</h2>
              
              <div className="flex items-center justify-between p-6 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Modo Oscuro (Beta)</h3>
                  <p className="text-slate-500 text-sm">Cambia entre modo claro y nocturno. Función en desarrollo.</p>
                </div>
                
                <button 
                  onClick={toggleDarkMode}
                  className={`relative w-20 h-10 rounded-full transition-colors flex items-center shadow-inner ${darkMode ? 'bg-slate-800' : 'bg-slate-300'}`}
                >
                  <div className={`absolute w-8 h-8 rounded-full bg-white flex items-center justify-center transition-all shadow-md ${darkMode ? 'left-11' : 'left-1'}`}>
                    {darkMode ? <Moon className="w-4 h-4 text-slate-800"/> : <Sun className="w-4 h-4 text-amber-500"/>}
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