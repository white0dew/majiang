import type { Metadata } from "next";
import { Ma_Shan_Zheng, Noto_Sans_SC } from "next/font/google";
import { MainNav } from "@/components/main-nav";
import "./globals.css";

const bodyFont = Noto_Sans_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const titleFont = Ma_Shan_Zheng({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "麻局教练 | 四川麻将训练",
  description: "帮助四川麻将玩家提升大局观、听胡速度与弃牌决策能力。",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${bodyFont.variable} ${titleFont.variable}`}>
        <MainNav />
        {children}
      </body>
    </html>
  );
}
