import './globals.css'

export const metadata = {
  title: '롤플레이 게임',
  description: '실시간 채팅 기반 롤플레이 게임',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}

