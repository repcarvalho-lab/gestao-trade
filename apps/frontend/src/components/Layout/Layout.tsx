import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { ErrorBoundary } from '../ErrorBoundary'

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const sidebarWidth = isCollapsed ? 72 : 220

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} sidebarWidth={sidebarWidth} />
      <main
        style={{
          flex: 1,
          marginLeft: sidebarWidth,
          padding: '2rem',
          minHeight: '100vh',
          maxWidth: `calc(100vw - ${sidebarWidth}px)`,
          overflowX: 'hidden',
          transition: 'margin-left 0.3s ease, max-width 0.3s ease',
        }}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
