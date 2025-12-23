import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobDescription } = await req.json();

    if (!resumeText || !jobDescription) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const prompt = `
      ATUE COMO: O melhor Redator de Currículos do mundo (CV Writer Expert).
      
      TAREFA: Reescrever totalmente o currículo do candidato para que ele seja PERFEITO para a vaga descrita.
      
      ENTRADA:
      --- CURRÍCULO ORIGINAL: ---
      ${resumeText}
      
      --- VAGA ALVO: ---
      ${jobDescription}
      
      REGRAS DE REESCRITA (PREMIUM):
      1. RESUMO PROFISSIONAL: Crie um resumo de impacto, focado em valor e alinhado com a vaga.
      2. EXPERIÊNCIA: 
         - Use verbos de ação fortes (Liderou, Otimizou, Desenvolveu).
         - Reescreva as tarefas chatas transformando-as em CONQUISTAS.
         - Se houver números no original, destaque-os. Se não houver, escreva de forma que sugira impacto.
         - Priorize as experiências que têm a ver com a vaga.
      3. SKILLS: Selecione apenas as competências relevantes para a vaga.
      
      SAÍDA (JSON ESTRUTURADO):
      {
        "fullName": "Nome do Candidato",
        "title": "Título Profissional Sugerido (Ex: Vendedor Sênior | Especialista em Varejo)",
        "summary": "Texto do resumo profissional (3-4 linhas).",
        "skills": ["Lista de 6-8 skills estratégicas"],
        "experiences": [
          {
            "role": "Cargo",
            "company": "Empresa",
            "period": "Período",
            "achievements": [
              "Bullet point 1: Ação + Contexto + Resultado (Reescrito)",
              "Bullet point 2: Ação + Contexto + Resultado (Reescrito)",
              "Bullet point 3: Focado na palavra-chave da vaga X"
            ]
          }
        ],
        "education": ["Formação 1", "Formação 2"]
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Se tiver acesso ao gpt-4, use-o aqui para melhor redação
      messages: [
        { role: "system", content: "Você é um redator de currículos de elite. Responda APENAS em JSON válido (pt-BR)." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7, // Um pouco mais criativo para escrever bem
    });

    const aiResponse = completion.choices[0].message.content;
    if (!aiResponse) throw new Error("Falha ao gerar currículo");

    return NextResponse.json(JSON.parse(aiResponse));

  } catch (error) {
    console.error('Erro no rewrite:', error);
    return NextResponse.json({ error: 'Erro ao reescrever currículo' }, { status: 500 });
  }
}