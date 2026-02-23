import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Wrench, Settings, LogOut, Car, Tag, Package, FileText, ClipboardList, ListTodo, Columns, DollarSign } from 'lucide-react'
import { supabase } from '../supabase/client'

export default function Sidebar() {
  const location = useLocation()
  const [userRole, setUserRole] = useState('admin') // Por defecto admin mientras carga
  const [userName, setUserName] = useState('Cargando...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUserProfile()
  }, [])

  async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Buscamos el rol del usuario en la tabla perfiles
      const { data, error } = await supabase.from('perfiles').select('nombre, rol').eq('id', user.id).single()
      
      if (data) {
        setUserRole(data.rol)
        setUserName(data.nombre || user.email.split('@')[0])
      } else {
        // Si no existe en la tabla perfiles aún, asumimos admin y mostramos su email
        setUserRole('admin')
        setUserName(user.email.split('@')[0])
      }
    }
    setLoading(false)
  }

  const isActive = (path) => location.pathname === path

  // --- CONFIGURACIÓN DE ROLES POR SECCIÓN ---
  // admin: Ve todo (El dueño)
  // recepcion: Crea órdenes, ve clientes, inventario, Kanban, pero NO ve dinero ni reportes.
  // mecanico: Solo ve el Kanban, tareas, y las órdenes (para el checklist).
  const menuItems = [
    { icon: LayoutDashboard, label: 'Panel Principal', path: '/dashboard', roles: ['admin'] },
    { icon: FileText, label: 'Órdenes de Trabajo', path: '/ordenes', roles: ['admin', 'recepcion', 'mecanico'] },
    { icon: Columns, label: 'Pizarra (Kanban)', path: '/pizarra', roles: ['admin', 'recepcion', 'mecanico'] },
    { icon: Wrench, label: 'Pañol y Herramientas', path: '/herramientas', roles: ['admin', 'recepcion', 'mecanico'] },
    { icon: DollarSign, label: 'Caja Chica', path: '/gastos', roles: ['admin'] }, // PRÓXIMO MÓDULO
    { icon: Users, label: 'Clientes', path: '/clientes', roles: ['admin', 'recepcion'] },
    { icon: Car, label: 'Vehículos', path: '/autos', roles: ['admin', 'recepcion'] },
    { icon: Tag, label: 'Catálogo Servicios', path: '/servicios', roles: ['admin'] },
    { icon: Package, label: 'Bodega / Inventario', path: '/inventario', roles: ['admin', 'recepcion'] },
    { icon: ListTodo, label: 'Tareas y Notas', path: '/tareas', roles: ['admin', 'recepcion', 'mecanico'] },
    { icon: ClipboardList, label: 'Plantillas Checklist', path: '/plantillas', roles: ['admin'] },
    { icon: Settings, label: 'Ajustes Generales', path: '/ajustes', roles: ['admin'] }, // PRÓXIMO MÓDULO
  ]

  // Filtramos el menú para mostrar solo lo que el rol actual permite ver
  const filteredMenu = menuItems.filter(item => item.roles.includes(userRole))

  if (loading) return <aside className="w-full md:w-64 bg-slate-900 h-full"></aside>

  return (
    <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col h-full shadow-xl">
      {/* Logo / Marca */}
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center font-bold text-lg text-white">M</div>
        <h1 className="text-xl font-bold tracking-wide">Multifrenos</h1>
      </div>

      {/* Navegación (Filtrada por Rol) */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {filteredMenu.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path) 
                ? 'bg-brand-primary text-white shadow-lg shadow-blue-900/50' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer del Menú (Muestra quién está conectado) */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="mb-4 px-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <span className="font-bold text-slate-300">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-200 truncate">{userName}</p>
            <p className="text-[10px] text-brand-primary uppercase tracking-widest font-black">{userRole}</p>
          </div>
        </div>
        
        <button 
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-bold text-sm">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}