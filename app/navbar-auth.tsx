// app/navbar-auth.tsx
'use client';

import { signIn, signOut } from "next-auth/react";

export default function NavbarAuth({ user }: { user: any }) {
  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-600 hidden sm:inline">
          Olá, {user.name?.split(' ')[0]}
        </span>
        <button 
          onClick={() => signOut()}
          className="text-sm font-medium text-red-600 hover:text-red-800 border border-red-200 px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => signIn("google")}
      className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
    >
      Entrar com Google
    </button>
  );
}