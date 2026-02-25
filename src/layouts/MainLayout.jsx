import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, X, Zap } from 'lucide-react'
import Sidebar from '../components/Sidebar'

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  // INTELIGENCIA: Cierra el menú móvil automáticamente cuando el usuario cambia de página
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-[#f4f7f9] overflow-hidden selection:bg-brand-primary selection:text-white">
      
      {/* 1. SIDEBAR PARA PC (Flujo Flexbox Dinámico) */}
      {/* Al quitar el "fixed", el menú empuja naturalmente el contenido. Si el menú se contrae, el contenido se expande. */}
      <div className="hidden md:flex h-full z-50">
        <Sidebar />
      </div>

      {/* 2. SIDEBAR PARA MÓVIL (Slide-over) */}
      {/* Fondo oscuro transparente con efecto Blur */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* El menú móvil deslizante */}
      <div className={`fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-in-out md:hidden shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-5 right-4 z-50">
          <button onClick={() => setIsMobileMenuOpen(false)} className="bg-slate-800 text-slate-400 hover:text-white p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <Sidebar />
      </div>


      {/* 3. ÁREA PRINCIPAL (Lienzo de Contenido) */}
      <div className="flex flex-col flex-1 w-full min-w-0 relative">
        
        {/* BARRA SUPERIOR MÓVIL PREMIUM (Glassmorphism) */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white/80 backdrop-blur-md px-5 py-4 border-b border-slate-200/50 shadow-sm">
          <button 
            type="button" 
            className="text-slate-600 hover:text-slate-900 bg-slate-100 p-2 rounded-xl transition-colors active:scale-95"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 text-white fill-white"/>
            </div>
            <span className="font-black text-xl text-slate-800 tracking-tight">Multifrenos</span>
          </div>
          
          <div className="w-10" /> {/* Espaciador para equilibrar el título al centro */}
        </div>

        {/* CONTENIDO REAL DE LAS PÁGINAS */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="w-full h-full">
            {/* El Outlet inyecta aquí Dashboard, Pizarra, Inventario, etc. */}
            <Outlet />
          </div>
        </main>
        
      </div>
    </div>
  )
}