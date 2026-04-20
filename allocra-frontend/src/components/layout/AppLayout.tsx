import { Outlet, useOutletContext } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useState, createContext, useContext } from 'react'

interface LayoutCtx { setAction: (node: React.ReactNode) => void }
const LayoutContext = createContext<LayoutCtx>({ setAction: () => {} })
export const useLayout = () => useContext(LayoutContext)

export default function AppLayout() {
  const [action, setAction] = useState<React.ReactNode>(null)
  return (
    <LayoutContext.Provider value={{ setAction }}>
      <div className="flex h-screen overflow-hidden bg-void">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar action={action} />
          <main className="flex-1 overflow-y-auto bg-stone">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutContext.Provider>
  )
}
