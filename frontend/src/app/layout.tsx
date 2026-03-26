import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const geistSans = localFont({
  src:      './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight:   '100 900',
})
const geistMono = localFont({
  src:      './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight:   '100 900',
})

export const metadata: Metadata = {
  title:       'Reparaelec',
  description: 'Sistema de asistencia técnica para reparación de electrodomésticos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema antes de que React hidrate para evitar parpadeo */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
