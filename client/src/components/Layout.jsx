import Header from './Header'
import Footer from './Footer'

export default function Layout({ children }) {
  return (
    <div className="gov-layout">
      <Header />
      <main className="gov-main">
        {children}
      </main>
      <Footer />
    </div>
  )
}
