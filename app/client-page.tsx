'use client';

import { useState } from 'react';
import { signIn } from "next-auth/react";

// --- Interfaces ---
interface AnalysisResult {
  match_score: number;
  missing_keywords: string[];
  brief_analysis: string;
  suggestions: string[];
  extracted_text?: string;
}

interface RewrittenCV {
  fullName: string;
  title: string;
  summary: string;
  skills: string[];
  experiences: { role: string; company: string; period: string; achievements: string[] }[];
  education: string[];
}

export default function ClientPage({ user }: { user: any }) {
  // Estados do Formulário
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  
  // Estados de Controle
  const [loading, setLoading] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false); // <--- Novo Estado para o Modal
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados de Resultado
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [rewrittenCV, setRewrittenCV] = useState<RewrittenCV | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. PRIMEIRO: Valida se o usuário preencheu tudo
    if (!file || !jobDescription) {
      setErrorMessage("Por favor, anexe seu currículo e a descrição da vaga antes de continuar.");
      return;
    }

    // 2. SEGUNDO: Verifica Login. Se não tiver logado, abre o modal e PARA aqui.
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }

    // 3. TERCEIRO: Se passou pelos dois acima, envia para a API
    setLoading(true);
    setResult(null);
    setRewrittenCV(null);

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'LOGIN_REQUIRED') setIsLoginModalOpen(true);
        else if (data.error === 'LIMIT_REACHED') setErrorMessage("🛑 Você atingiu seu limite diário de 5 currículos! Volte amanhã.");
        else if (data.message) setErrorMessage(`⚠️ ${data.message}`);
        else setErrorMessage("Ocorreu um erro inesperado.");
        return;
      }

      setResult(data);
    } catch (error) {
      console.error(error);
      setErrorMessage("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRewrite = async () => {
    if (!result?.extracted_text || !jobDescription) return;

    setRewriting(true);
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: result.extracted_text,
          jobDescription: jobDescription
        })
      });
      const data = await response.json();
      setRewrittenCV(data);
    } catch (error) {
      console.error(error);
      alert('Erro ao reescrever.');
    } finally {
      setRewriting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 border-green-500';
    if (score >= 50) return 'text-yellow-600 border-yellow-500';
    return 'text-red-600 border-red-500';
  };

  const handleLoginClick = async () => {
  await signIn("google", { callbackUrl: window.location.href }); // Garante que volta pra cá
};

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 font-sans relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-4 tracking-tight">
            VagaMatch <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Descubra se seu currículo passa nos filtros dos recrutadores.
          </p>
        </div>

        {/* Mensagens de Erro (Topo) */}
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r shadow-sm animate-pulse">
            <p className="text-red-700 font-bold">{errorMessage}</p>
          </div>
        )}

        {/* FORMULÁRIO (Sempre visível e liberado para digitar) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-slate-700 mb-2">Seu Currículo (PDF)</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer mx-auto" />
              </div>
            </div>
            <div>
              <label className="block text-lg font-medium text-slate-700 mb-2">Descrição da Vaga</label>
              <textarea rows={8} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 text-lg resize-none" 
                placeholder="Cole a descrição da vaga aqui..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50 text-xl shadow-lg flex justify-center items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Analisando...
                </>
              ) : 'Analisar Compatibilidade'}
            </button>
          </form>
        </div>

        {/* ANÁLISE INICIAL */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center animate-in zoom-in-95 duration-500">
              <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center mx-auto mb-4 ${getScoreColor(result.match_score)} border-current`}>
                <span className="text-4xl font-bold">{result.match_score}%</span>
              </div>
              <p className="text-xl text-slate-700 max-w-xl mx-auto">{result.brief_analysis}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 animate-in fade-in duration-500" style={{ animationDelay: '100ms' }}>
              <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                <h3 className="font-bold text-xl text-red-800 mb-3">⚠️ O que falta</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.map((k, i) => (
                    <span key={i} className="bg-white text-red-700 px-3 py-1 rounded-md text-lg border border-red-200">{k}</span>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-bold text-xl text-blue-800 mb-3">💡 Como melhorar</h3>
                <ul className="space-y-2 text-lg text-blue-900">
                  {result.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            </div>

            <button 
              onClick={handleRewrite}
              disabled={rewriting || !!rewrittenCV} // Desabilita se estiver carregando ou JÁ tiver reescrito
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-4 px-6 rounded-xl hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2 animate-in fade-in duration-500 shadow-md"
              style={{ animationDelay: '200ms' }}
            >
              {rewriting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Reescrevendo Currículo com IA...
                </>
              ) : rewrittenCV ? 'Currículo Gerado Abaixo 👇' : '✨ Reescrever Currículo Otimizado'}
            </button>
          </div>
        )}

        {/* --- EXIBIÇÃO DO CURRÍCULO REESCRITO (NOVO) --- */}
        {rewrittenCV && (
          <div id="rewritten-section" className="mt-6 animate-in slide-in-from-bottom-10 fade-in duration-700">
            <div className="bg-white p-8 md:p-12 rounded-xl shadow-2xl border border-slate-200 relative overflow-hidden">
              
              {/* Faixa decorativa */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

              {/* Cabeçalho do CV */}
              <div className="border-b border-slate-200 pb-8 mb-8 text-center md:text-left">
                <h2 className="text-4xl font-black text-slate-900 mb-2">{rewrittenCV.fullName || 'Seu Nome'}</h2>
                <p className="text-2xl text-blue-600 font-medium">{rewrittenCV.title}</p>
              </div>

              {/* Conteúdo */}
              <div className="space-y-8">
                
                {/* Resumo */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Resumo Profissional</h3>
                  <p className="text-slate-700 leading-relaxed text-lg bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {rewrittenCV.summary}
                  </p>
                </section>

                {/* Skills */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Competências & Tecnologias</h3>
                  <div className="flex flex-wrap gap-2">
                    {rewrittenCV.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-blue-50 text-blue-800 rounded text-sm font-medium border border-blue-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Experiência */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Experiência Profissional</h3>
                  <div className="space-y-6">
                    {rewrittenCV.experiences.map((exp, i) => (
                      <div key={i} className="relative pl-4 border-l-2 border-slate-200">
                        <div className="mb-2">
                          <h4 className="text-xl font-bold text-slate-900">{exp.role}</h4>
                          <div className="flex flex-col md:flex-row md:justify-between text-slate-500 text-sm">
                            <span className="font-semibold text-blue-600">{exp.company}</span>
                            <span>{exp.period}</span>
                          </div>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                          {exp.achievements.map((ach, j) => (
                            <li key={j} className="pl-1">{ach}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Educação */}
                <section>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Formação Acadêmica</h3>
                  <ul className="space-y-2">
                    {rewrittenCV.education.map((edu, i) => (
                      <li key={i} className="text-slate-700 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                        {edu}
                      </li>
                    ))}
                  </ul>
                </section>

              </div>

              {/* Botão de Ação Final */}
              <div className="mt-10 pt-6 border-t border-slate-100 text-center">
                <button 
                  onClick={() => window.print()}
                  className="bg-slate-900 text-white px-6 py-3 rounded-full hover:bg-slate-700 transition font-bold shadow inline-flex items-center gap-2"
                >
                  🖨️ Salvar como PDF
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* === MODAL DE LOGIN (Só aparece se tentar enviar sem logar) === */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative animate-in zoom-in-95 duration-200">
            
            {/* Botão Fechar */}
            <button 
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                🚀
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Quase lá!</h3>
              <p className="text-slate-600 mb-6">
                Para processar sua análise com nossa Inteligência Artificial, precisamos que você se identifique.
              </p>
              
              <button 
                type="button"
                onClick={handleLoginClick}
                className="w-full bg-slate-900 text-white font-bold py-3 px-6 rounded-full hover:bg-blue-600 hover:shadow-lg transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Entrar com Google (Grátis)
              </button>
              <p className="text-xs text-slate-400 mt-4">
                Você tem 5 créditos gratuitos hoje.
              </p>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}