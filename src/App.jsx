import { useEffect, useState } from 'react'
import { supabase } from './supabase/client'

function App() {
  const [status, setStatus] = useState('🔌 Conectando con Supabase...')

  useEffect(() => {
    async function checkConnection() {
      try {
        // Intentamos contar las filas de la tabla 'perfiles'
        // head: true significa "solo cuenta, no traigas datos"
        const { count, error } = await supabase
          .from('perfiles')
          .select('*', { count: 'exact', head: true })

        if (error) throw error
        
        setStatus('✅ CONEXIÓN EXITOSA: Supabase está listo.')
      } catch (error) {
        console.error(error)
        setStatus('❌ ERROR DE CONEXIÓN: ' + error.message)
      }
    }

    checkConnection()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white font-sans">
      <div className="p-8 bg-slate-800 rounded-lg shadow-xl border border-slate-700 text-center">
        <h1 className="text-2xl font-bold mb-4">Estado del Sistema</h1>
        <div className={`text-xl font-mono p-4 rounded ${status.includes('ERROR') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
          {status}
        </div>
        <p className="mt-4 text-slate-400 text-sm">Multifrenos V2 - Deploy Activo</p>
      </div>
    </div>
  )
}

export default App