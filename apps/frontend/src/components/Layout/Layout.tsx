import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: 220,
          padding: '2rem',
          minHeight: '100vh',
          maxWidth: 'calc(100vw - 220px)',
          overflowX: 'hidden',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
