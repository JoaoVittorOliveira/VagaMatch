import { auth, signIn, signOut } from "@/auth"; // Importa funções do servidor
import ClientPage from "./client-page"; // Vamos separar o cliente do servidor

export default async function Page() {
  const session = await auth(); // Verifica se está logado no servidor

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