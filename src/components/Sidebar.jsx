import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Wrench, Settings, LogOut, Car, Tag, Package, FileText, ClipboardList, ListTodo, Columns, DollarSign, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { supabase } from '../supabase/client'

export default function Sidebar() {
  const location = useLocation()
  const [userRole, setUserRole] = useState('admin') 
  const [userName, setUserName] = useState('Cargando...')
  const [loading, setLoading] = useState(true)
  
  // Estado para contraer/expandir el menú en PC (Ahorra espacio en pantalla)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    getUserProfile()
  }, [])

  async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from('perfiles').select('nombre, rol').eq('id', user.id).single()
      if (data) {
        setUserRole(data.rol)
        setUserName(data.nombre || user.email.split('@')[0])
      } else {
        setUserRole('admin')
        setUserName(user.email.split('@')[0])
      }
    }
    setLoading(false)
  }

  const isActive = (path) => location.pathname === path

  // --- AGRUPACIÓN INTELIGENTE Y ROLES ---
  const menuGroups = [
    {
      titulo: 'Operativa Diaria',
      items: [
        { icon: Columns, label: 'Pizarra (Kanban)', path: '/pizarra', roles: ['admin', 'recepcion', 'mecanico'] },
        { icon: FileText, label: 'Órdenes de Trabajo', path: '/ordenes', roles: ['admin', 'recepcion', 'mecanico'] },
        { icon: ListTodo, label: 'Tareas y Notas', path: '/tareas', roles: ['admin', 'recepcion', 'mecanico'] },
      ]
    },
    {
      titulo: 'Taller y Logística',
      items: [
        { icon: Wrench, label: 'Pañol y Herramientas', path: '/herramientas', roles: ['admin', 'recepcion', 'mecanico'] },
        { icon: Package, label: 'Bodega / Inventario', path: '/inventario', roles: ['admin', 'recepcion'] },
        { icon: Car, label: 'Parque Automotriz', path: '/autos', roles: ['admin', 'recepcion'] },
      ]
    },
    {
      titulo: 'Administración',
      items: [
        { icon: LayoutDashboard, label: 'Panel Principal', path: '/dashboard', roles: ['admin'] },
        { icon: Users, label: 'Directorio Clientes', path: '/clientes', roles: ['admin', 'recepcion'] },
        { icon: Tag, label: 'Catálogo Servicios', path: '/servicios', roles: ['admin'] },
        { icon: ClipboardList, label: 'Plantillas Checklist', path: '/plantillas', roles: ['admin'] },
        { icon: DollarSign, label: 'Caja Chica', path: '/gastos', roles: ['admin'] },
      ]
    },
    {
      titulo: 'Sistema',
      items: [
        { icon: Settings, label: 'Ajustes Generales', path: '/ajustes', roles: ['admin'] },
      ]
    }
  ]

  if (loading) return <aside className={`bg-slate-950 h-full transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-full md:w-72'}`}></aside>

  return (
    <aside className={`bg-slate-950 text-slate-300 flex flex-col h-full shadow-2xl border-r border-slate-800 transition-all duration-300 relative ${isCollapsed ? 'w-20' : 'w-full md:w-72 shrink-0'}`}>
      
      {/* BOTÓN PARA CONTRAER/EXPANDIR (Solo visible en Desktop) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3.5 top-8 bg-slate-800 border-2 border-slate-950 text-slate-400 hover:text-white p-1 rounded-full z-10 transition-colors shadow-lg"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4"/> : <ChevronLeft className="w-4 h-4"/>}
      </button>

      {/* HEADER / LOGO */}
      <div className={`p-6 border-b border-slate-800/50 flex items-center transition-all ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
          <Zap className="w-5 h-5 text-white fill-white"/>
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden animate-fade-in">
            <h1 className="text-xl font-black text-white tracking-wide leading-none">Multifrenos</h1>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mt-1">Gestión Integral</p>
          </div>
        )}
      </div>

      {/* NAVEGACIÓN AGRUPADA */}
      <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto custom-scrollbar">
        {menuGroups.map((group, groupIndex) => {
          // Filtramos los items de este grupo según el rol
          const allowedItems = group.items.filter(item => item.roles.includes(userRole))
          
          // Si el usuario no tiene acceso a nada de este grupo, no lo mostramos
          if (allowedItems.length === 0) return null;

          return (
            <div key={groupIndex} className="space-y-1">
              {/* Título del Grupo */}
              {!isCollapsed ? (
                <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  {group.titulo}
                </h3>
              ) : (
                <div className="w-8 border-t-2 border-slate-800 mx-auto my-4 rounded-full"></div>
              )}

              {/* Enlaces */}
              {allowedItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : ''} // Tooltip nativo cuando está contraído
                    className={`flex items-center rounded-xl transition-all group relative ${
                      isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3'
                    } ${
                      active 
                        ? 'bg-blue-600/10 text-blue-400' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    {/* Indicador visual activo (Barra lateral) */}
                    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>}
                    
                    <item.icon className={`shrink-0 transition-transform ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} ${active ? 'text-blue-500' : 'group-hover:scale-110 text-slate-500 group-hover:text-slate-300'}`} />
                    
                    {!isCollapsed && (
                      <span className={`font-bold text-sm tracking-wide ${active ? 'text-white' : ''}`}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* FOOTER: PERFIL DEL USUARIO */}
      <div className={`p-4 border-t border-slate-800 bg-slate-900/50 transition-all ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        <div className={`mb-4 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2'}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-slate-600 shadow-inner shrink-0">
            <span className="font-black text-white">{userName.charAt(0).toUpperCase()}</span>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{userName}</p>
              <p className="text-[10px] text-brand-primary uppercase tracking-widest font-black flex items-center gap-1">
                {userRole}
              </p>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => supabase.auth.signOut()}
          title={isCollapsed ? 'Cerrar Sesión' : ''}
          className={`flex items-center text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors w-full border border-transparent hover:border-red-500/20 ${
            isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
          }`}
        >
          <LogOut className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
          {!isCollapsed && <span className="font-bold text-sm">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  )
}