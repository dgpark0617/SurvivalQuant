import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: '롤플레이 게임',
  description: '실시간 채팅 기반 롤플레이 게임',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

