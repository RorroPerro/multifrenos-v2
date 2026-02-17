import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase/client'
import LoginPage from './modules/auth/LoginPage'
import { Loader2 } from 'lucide-react'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Verificamos si ya hay una sesión guardada en el navegador
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Escuchamos cambios (Si se loguea o desloguea en tiempo real)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Muestra un círculo de carga mientras verifica la sesión (para que no parpadee)
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
        {/* LÓGICA DE RUTAS PROTEGIDAS */}
        
        {/* Si NO hay sesión, mándalo al Login */}
        <Route 
          path="/login" 
          element={!session ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
        />

        {/* Si SÍ hay sesión, muéstrale el Dashboard */}
        <Route 
          path="/dashboard" 
          element={session ? (
            <div className="p-10 text-center">
              <h1 className="text-4xl font-bold text-brand-primary">¡Bienvenido de nuevo! 👋</h1>
              <p className="mt-4 text-slate-600">Sesión activa: {session.user.email}</p>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="mt-8 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : <Navigate to="/login" replace />} 
        />

        {/* Cualquier otra ruta redirige según si estás logueado o no */}
        <Route 
          path="*" 
          element={<Navigate to={session ? "/dashboard" : "/login"} replace />} 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App