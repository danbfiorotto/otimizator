import type { Metadata } from "next"
import { Quicksand } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const quicksand = Quicksand({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Otimizator - Planejador Inteligente de Parques Temáticos",
  description: "Otimize sua viagem aos parques temáticos com planejamento inteligente baseado em dados reais",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={quicksand.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
