import { useEffect, useState, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase/client'
import { Loader2, Zap } from 'lucide-react'
import MainLayout from './layouts/MainLayout'

// ==========================================
// OPTIMIZACIÓN INTELIGENTE: LAZY LOADING
// ==========================================
// En lugar de cargar todo el sistema de golpe, React solo descargará 
// el código de la página que el usuario necesita ver en ese momento.
// Esto hace que la carga inicial sea ultrarrápida (Especialmente para los clientes).

const LoginPage = lazy(() => import('./modules/auth/LoginPage'))
const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage'))
const OrdersPage = lazy(() => import('./modules/orders/OrdersPage'))
const OrderDetailPage = lazy(() => import('./modules/orders/OrderDetailPage'))
const ClientsPage = lazy(() => import('./modules/clients/ClientsPage'))
const AutosPage = lazy(() => import('./modules/autos/AutosPage'))
const ServicesPage = lazy(() => import('./modules/services/ServicesPage'))
const InventoryPage = lazy(() => import('./modules/inventory/InventoryPage'))
const PlantillasPage = lazy(() => import('./modules/plantillas/PlantillasPage'))
const TareasPage = lazy(() => import('./modules/tareas/TareasPage'))
const KanbanPage = lazy(() => import('./modules/pizarra/KanbanPage'))
const HerramientasPage = lazy(() => import('./modules/herramientas/HerramientasPage'))
const GastosPage = lazy(() => import('./modules/gastos/GastosPage'))
const AjustesPage = lazy(() => import('./modules/settings/AjustesPage'))

// Rutas Públicas (Clientes)
const PublicTrackingPage = lazy(() => import('./modules/public/PublicTrackingPage'))
const PortalFlota = lazy(() => import('./modules/portal/PortalFlota'))
const PortalCliente = lazy(() => import('./modules/portal/PortalCliente'))

// ==========================================
// PANTALLA DE CARGA GLOBAL (SPLASH SCREEN)
// ==========================================
const GlobalLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 selection:bg-blue-500">
    <div className="relative flex flex-col items-center animate-pulse-slow">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 mb-6">
        <Zap className="w-8 h-8 text-white fill-white"/>
      </div>
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin absolute -bottom-12" />
    </div>
  </div>
)

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
    return <GlobalLoader />
  }

  return (
    <BrowserRouter>
      {/* El Suspense envuelve las rutas para mostrar el Loader mientras se descarga el código de esa página */}
      <Suspense fallback={<GlobalLoader />}>
        <Routes>
          
          {/* ============================== */}
          {/* RUTAS PÚBLICAS (CLIENTES)      */}
          {/* ============================== */}
          <Route path="/seguimiento/:id" element={<PublicTrackingPage />} />
          <Route path="/portal/:token" element={<PortalFlota />} />
          <Route path="/mi-auto/:token" element={<PortalCliente />} />

          {/* RUTA DE LOGIN */}
          <Route 
            path="/login" 
            element={!session ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
          />

          {/* ============================== */}
          {/* RUTAS PRIVADAS (TALLER)        */}
          {/* ============================== */}
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
              <Route path="/pizarra" element={<KanbanPage />} />
              <Route path="/ajustes" element={<AjustesPage />} />
              <Route path="/herramientas" element={<HerramientasPage />} />
              <Route path="/gastos" element={<GastosPage />} />
              
              {/* Fallback interno a Dashboard si la ruta no existe */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          )}

          {/* Redirección de seguridad total si alguien intenta forzar una URL sin sesión */}
          {!session && <Route path="*" element={<Navigate to="/login" replace />} />}
          
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App