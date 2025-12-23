'use client';

import { useState } from 'react';

interface AnalysisResult {
  match_score: number;
  missing_keywords: string[];
  brief_analysis: string;
  suggestions: string[];
  extracted_text?: string; // Novo campo opcional
}

interface RewrittenCV {
  fullName: string;
  title: string;
  summary: string;
  skills: string[];
  experiences: {
    role: string;
    company: string;
    period: string;
    achievements: string[];
  }[];
  education: string[];
}

export default function ClientPage({ user }: { user: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  
  // Novos estados para o Premium
  const [rewriting, setRewriting] = useState(false);
  const [rewrittenCV, setRewrittenCV] = useState<RewrittenCV | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !jobDescription) return alert('Preencha tudo!');

    setLoading(true);
    setResult(null);
    setRewrittenCV(null); // Reseta o premium se fizer nova análise

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await fetch('/api/analyze', { method: 'POST', body: formData });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      alert('Erro ao analisar.');
    } finally {
      setLoading(false);
    }
  };

  // Função para chamar o endpoint Premium
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

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 font-sans">
      <div className="max-w-3xl mx-auto">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2">VagaMatch <span className="text-blue-600">AI</span></h1>
          <p className="text-slate-600">Passe pelo robô do RH com inteligência artificial.</p>
        </div>

        {/* INPUTS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Seu Currículo (PDF)</label>
              <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Descrição da Vaga</label>
              <textarea rows={4} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Cole a vaga aqui..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50">
              {loading ? 'Analisando...' : 'Analisar Compatibilidade'}
            </button>
          </form>
        </div>

        {/* ANÁLISE INICIAL */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center mx-auto mb-4 ${getScoreColor(result.match_score)}`}>
                <span className="text-4xl font-bold">{result.match_score}%</span>
              </div>
              <p className="text-slate-700 max-w-xl mx-auto">{result.brief_analysis}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                <h3 className="font-bold text-red-800 mb-3">⚠️ O que falta</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.map((k, i) => (
                    <span key={i} className="bg-white text-red-700 px-3 py-1 rounded-md text-sm border border-red-200">{k}</span>
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-800 mb-3">💡 Como melhorar</h3>
                <ul className="space-y-2 text-sm text-blue-900">
                  {result.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            </div>

            {/* BOTÃO PREMIUM */}
            {!rewrittenCV && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white text-center shadow-lg mt-8">
                <h2 className="text-2xl font-bold mb-2">Quer o currículo perfeito?</h2>
                <p className="mb-6 text-blue-100">Reescrita completa com IA focada na vaga.</p>
                
                {user ? (
                   // SE ESTIVER LOGADO: Botão funciona
                   <button 
                    onClick={handleRewrite} 
                    disabled={rewriting}
                    className="bg-white text-blue-600 px-8 py-3 rounded-full font-bold shadow-md hover:bg-blue-50 transition-all"
                  >
                    {rewriting ? 'Gerando...' : '✨ Gerar Currículo Premium'}
                  </button>
                ) : (
                  // SE NÃO ESTIVER LOGADO: Botão pede login
                  <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/20">
                    <p className="mb-2 font-medium">Faça login para usar a IA Premium</p>
                    <p className="text-sm opacity-80 mb-0">Role para o topo e clique em "Entrar com Google"</p>
                  </div>
                )}
              </div>
            )}

            {/* ÁREA DO CURRÍCULO REESCRITO */}
            {rewrittenCV && (
              <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden mt-8">
                <div className="bg-slate-900 p-6 text-white">
                  <h2 className="text-2xl font-bold">{rewrittenCV.fullName}</h2>
                  <p className="text-blue-400 font-medium uppercase tracking-wider text-sm">{rewrittenCV.title}</p>
                </div>
                <div className="p-8 space-y-6">
                  
                  <section>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Resumo Profissional</h3>
                    <p className="text-slate-700 leading-relaxed">{rewrittenCV.summary}</p>
                  </section>

                  <section>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Principais Competências</h3>
                    <div className="flex flex-wrap gap-2">
                      {rewrittenCV.skills.map((skill, i) => (
                        <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-medium">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Experiência Profissional</h3>
                    <div className="space-y-6">
                      {rewrittenCV.experiences.map((exp, i) => (
                        <div key={i} className="border-l-2 border-blue-200 pl-4">
                          <h4 className="font-bold text-slate-900">{exp.role}</h4>
                          <p className="text-sm text-slate-500 mb-2">{exp.company} • {exp.period}</p>
                          <ul className="space-y-1">
                            {exp.achievements.map((ach, j) => (
                              <li key={j} className="text-slate-700 text-sm flex items-start">
                                <span className="mr-2 text-blue-500">›</span> {ach}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>

                   <section>
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Formação</h3>
                    <ul className="list-disc list-inside text-slate-700 text-sm">
                      {rewrittenCV.education.map((edu, i) => (
                        <li key={i}>{edu}</li>
                      ))}
                    </ul>
                  </section>

                </div>
                <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                  <button onClick={() => window.print()} className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center justify-center gap-2 mx-auto">
                    🖨️ Salvar como PDF (Ctrl + P)
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}