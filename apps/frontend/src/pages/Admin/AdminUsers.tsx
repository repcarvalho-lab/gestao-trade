import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { AlertCircle, Trash2, CheckCircle2, XCircle } from 'lucide-react'

interface User {
  id: string
  nome: string | null
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users')
      setUsers(res.data)
    } catch (error) {
      console.error('Erro ao buscar usuários', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    if (!window.confirm(`Tem certeza que deseja ${currentStatus ? 'INATIVAR' : 'ATIVAR'} este usuário?`)) return
    
    try {
      await api.patch(`/admin/users/${id}/status`, { isActive: !currentStatus })
      setUsers(users.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u))
    } catch (error) {
      console.error('Erro ao alterar status', error)
      alert('Erro ao alterar status do usuário')
    }
  }

  const deleteUser = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja EXCLUIR DEFINITIVAMENTE este usuário? Esta ação não pode ser desfeita.')) return
    
    try {
      await api.delete(`/admin/users/${id}`)
      setUsers(users.filter(u => u.id !== id))
    } catch (error) {
      console.error('Erro ao excluir usuário', error)
      alert('Erro ao excluir usuário')
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center text-red-500 flex flex-col items-center justify-center">
        <AlertCircle size={48} className="mb-4" />
        <h2 className="text-xl font-bold">Acesso Restrito</h2>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="animate-slide-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Painel Administrativo</h1>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-6 backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Gerenciar Usuários</h2>
        <div>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Carregando usuários...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-700/50 text-gray-100">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Permissão</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Data de Cadastro</th>
                    <th className="px-4 py-3 text-right rounded-tr-lg">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-200">{u.nome || 'N/A'}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-600/50 text-gray-400'}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center text-emerald-400 text-xs font-medium">
                            <CheckCircle2 size={14} className="mr-1" /> Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-red-400 text-xs font-medium">
                            <XCircle size={14} className="mr-1" /> Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-right space-x-3">
                        {u.id !== user.id && (
                          <>
                            <button
                              onClick={() => toggleStatus(u.id, u.isActive)}
                              className={`text-sm hover:underline transition-colors ${u.isActive ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                            >
                              {u.isActive ? 'Inativar' : 'Ativar'}
                            </button>
                            <button
                              onClick={() => deleteUser(u.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Excluir Usuário"
                            >
                              <Trash2 size={16} className="inline" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
