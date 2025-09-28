import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { SessionProvider } from '@/contexts/SessionContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'College Schedule Maker',
  description: 'Manage college schedules and timetables',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </AuthProvider>
      </body>
    </html>
  )
}