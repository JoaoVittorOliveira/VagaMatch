import { auth, signIn, signOut } from "@/auth"; 
import ClientPage from "./client-page"; 
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
      {/* NAVBAR */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="font-bold text-xl text-slate-900">VagaMatch</div>
        <div>
          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Olá, {session.user?.name}</span>
              <form action={async () => {
                "use server"
                await signOut()
              }}>
                <button className="text-sm font-medium text-red-600 hover:text-red-800">Sair</button>
              </form>
            </div>
          ) : (
            <form action={async () => {
              "use server"
              await signIn("google")
            }}>
              <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
                Entrar com Google
              </button>
            </form>
          )}
        </div>
      </nav>

      {/* Conteúdo Principal (Client Side) */}
      <ClientPage user={session?.user} />
    </div>
  );
}