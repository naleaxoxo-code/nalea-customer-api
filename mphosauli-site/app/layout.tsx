import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Mpho Sauli — Websites, Ads & Brands",
  description:
    "Mpho Sauli designs glossy, high-end websites, e-commerce ads and brand content for South African businesses — plus Shopify fixes when your store breaks.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
