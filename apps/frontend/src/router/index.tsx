import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Layout from '../components/Layout/Layout'
import Login from '../pages/Login/Login'
import PainelDia from '../pages/PainelDia/PainelDia'
import ControleDiario from '../pages/ControleDiario/ControleDiario'
import Configuracoes from '../pages/Configuracoes/Configuracoes'
import Dashboard from '../pages/Dashboard/Dashboard'
import ProjecaoAnual from '../pages/ProjecaoAnual/ProjecaoAnual'
import DepositosSaques from '../pages/DepositosSaques/DepositosSaques'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/painel" replace />} />
          <Route path="painel" element={<PainelDia />} />
          <Route path="controle-diario" element={<ControleDiario />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projecao" element={<ProjecaoAnual />} />
          <Route path="movimentos" element={<DepositosSaques />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
