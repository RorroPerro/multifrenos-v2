import { useState } from 'react'
import { supabase } from '../../supabase/client'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Loader2, Zap, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Si todo sale bien, vamos al panel principal
      navigate('/dashboard')
    } catch (error) {
      setError('Credenciales incorrectas o error de conexión.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      
      {/* EFECTOS DE LUCES DE FONDO (Premium UI) */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 relative z-10 animate-fade-in">
        
        {/* Encabezado */}
        <div className="pt-10 pb-6 px-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-5">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Multifrenos OS</h2>
          <p className="text-slate-500 mt-2 font-medium">Plataforma Inteligente de Gestión</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="px-8 pb-10 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm font-bold rounded-xl flex items-center gap-3 border border-red-100 animate-bounce-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">Correo Electrónico</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                  placeholder="admin@multifrenos.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block pl-1">Contraseña Segura</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800 font-mono tracking-wider"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* Botón Inteligente: Ver Contraseña */}
                <button
                  type="button"
                  tabIndex="-1"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Autorizando...
              </>
            ) : (
              'Ingresar al Taller'
            )}
          </button>
        </form>
      </div>
      
      {/* Footer corporativo sutil */}
      <div className="absolute bottom-6 w-full text-center pointer-events-none">
        <p className="text-slate-500 text-xs font-medium tracking-wide">© {new Date().getFullYear()} Taller Multifrenos</p>
      </div>
    </div>
  )
}