import { auth } from "@/auth"; 
import ClientPage from "./client-page"; 
import NavbarAuth from "./navbar-auth"; // <--- Importe o novo componente
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'VagaMatch AI | Otimizador de Currículo com Inteligência Artificial',
    template: '%s | VagaMatch AI'
  },
  description: 'Passe pelos robôs de recrutamento (ATS). Nossa IA analisa e reescreve seu currículo para garantir compatibilidade máxima com a vaga desejada.',
  keywords: ['currículo', 'ia', 'ats', 'emprego', 'análise de currículo', 'inteligência artificial', 'recrutamento'],
  openGraph: {
    title: 'VagaMatch AI - Seu Currículo Turbinado',
    description: 'Não seja ignorado pelo robô do RH. Otimize seu CV agora.',
    url: 'https://vagamatch.vercel.app',
    siteName: 'VagaMatch AI',
    /* 
    images: [
      {
        url: 'https://vagamatch.vercel.app/og-image.jpg', // Você precisará criar essa imagem
        width: 1200,
        height: 630,
      },
    ],
    */
    locale: 'pt_BR',
    type: 'website',
  },
}

export default async function Page() {
  const session = await auth(); 

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="font-bold text-xl text-slate-900 tracking-tight">
          VagaMatch<span className="text-blue-600">AI</span>
        </div>
        
        <NavbarAuth user={session?.user} />
      </nav>

      <ClientPage user={session?.user} />
    </div>
  );
}