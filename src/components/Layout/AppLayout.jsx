import Navbar from './Navbar'
import BottomNav from './BottomNav'

export default function AppLayout({ children, title, backTo, hideNav = false }) {
  return (
    <div className="min-h-screen bg-twilight">
      <Navbar title={title} backTo={backTo} />
      <main className="max-w-md mx-auto">
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}

