import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase/client'
import LoginPage from './modules/auth/LoginPage'
import MainLayout from './layouts/MainLayout' // <--- IMPORTANTE
import { Loader2 } from 'lucide-react'
import ClientsPage from './modules/clients/ClientsPage'
import AutosPage from './modules/autos/AutosPage'
import ServicesPage from './modules/services/ServicesPage'
import OrdersPage from './modules/orders/OrdersPage'
import DashboardPage from './modules/dashboard/DashboardPage'
import OrderDetailPage from './modules/orders/OrderDetailPage'
import InventoryPage from './modules/inventory/InventoryPage'
import PublicTrackingPage from './modules/public/PublicTrackingPage'
import PlantillasPage from './modules/plantillas/PlantillasPage'
import TareasPage from './modules/tareas/TareasPage'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* RUTA PÚBLICA PARA EL CLIENTE (va suelta, sin el Sidebar) */}
        <Route path="/seguimiento/:id" element={<PublicTrackingPage />} />

        {/* Ruta de login pública */}
        <Route 
          path="/login" 
          element={!session ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
        />

        {/* Rutas Privadas (El sistema del taller) */}
        {session && (
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ordenes" element={<OrdersPage />} />
            <Route path="/ordenes/:id" element={<OrderDetailPage />} />
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/autos" element={<AutosPage />} />
            <Route path="/servicios" element={<ServicesPage />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="/plantillas" element={<PlantillasPage />} />
            <Route path="/tareas" element={<TareasPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        )}

        {/* Redirección por defecto si no hay sesión */}
        {!session && <Route path="*" element={<Navigate to="/login" replace />} />}
      </Routes>
    </BrowserRouter>
  )
}

export default App