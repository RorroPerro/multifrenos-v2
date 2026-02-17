import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Sidebar from '../components/Sidebar'

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      
      {/* 1. Sidebar para PC (Siempre visible en pantallas grandes 'md') */}
      <div className="hidden md:flex md:w-64 md:flex-col fixed inset-y-0 z-50">
        <Sidebar />
      </div>

      {/* 2. Sidebar para MÓVIL (Slide-over) */}
      {/* Fondo oscuro transparente */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* El menú móvil en sí */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-white p-2">
            <X className="w-6 h-6" />
          </button>
        </div>
        <Sidebar />
      </div>


      {/* 3. Área Principal */}
      <div className="flex flex-col flex-1 md:pl-64 w-full">
        
        {/* Barra Superior MÓVIL (Solo visible en celular) */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 py-3 shadow-sm md:hidden">
          <button 
            type="button" 
            className="text-slate-500 hover:text-slate-700"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg text-slate-800">Multifrenos</span>
          <div className="w-6" /> {/* Espaciador invisible para centrar el título */}
        </div>

        {/* Contenido Real de la Página */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}