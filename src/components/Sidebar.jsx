import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Car, FileText, Tag, LogOut } from 'lucide-react'
import { supabase } from '../supabase/client'

export default function Sidebar() {
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path

  const menuItems = [
    { icon: LayoutDashboard, label: 'Panel Principal', path: '/dashboard' },
    { icon: FileText, label: 'Órdenes de Trabajo', path: '/ordenes' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    { icon: Car, label: 'Vehículos', path: '/autos' },
    { icon: Tag, label: 'Catálogo Servicios', path: '/servicios' },
  ]

  return (
    <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col h-full shadow-xl">
      {/* Logo / Marca */}
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center font-bold text-lg text-white">M</div>
        <h1 className="text-xl font-bold tracking-wide">Multifrenos</h1>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
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

      {/* Footer del Menú */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}