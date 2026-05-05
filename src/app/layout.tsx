import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UPI Ingestor',
  description: 'Parse UPI transactions from Gmail and publish to Monarch',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-950">{children}</body>
    </html>
  )
}
