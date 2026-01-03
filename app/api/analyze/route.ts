import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from "zod";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";

// @ts-ignore
import PDFParser from 'pdf2json';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const AnalysisSchema = z.object({
  resumeText: z.string()
    .min(50, "O currículo parece vazio ou muito curto (mínimo 50 caracteres).")
    .max(15000, "O currículo é muito extenso para processar (máximo 15k caracteres)."),
  jobDescription: z.string()
    .min(20, "A descrição da vaga é muito curta.")
    .max(10000, "A descrição da vaga é muito longa (máximo 10000 caracteres).")
});

export async function POST(req: NextRequest) {
  try {
    
    // Verifica se está logado
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Você precisa estar logado.' }, { status: 401 });
    }

    // Verifica se tem créditos no Banco
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.credits <= -1) {
      return NextResponse.json({ 
        error: 'Saldo insuficiente. Recarregue seus créditos para continuar.' 
      }, { status: 403 });
    }
    
    const formData = await req.formData();
    const file = formData.get('resume') as File;
    const jobDescription = formData.get('jobDescription') as string;

    if (!file || !jobDescription) {
      return NextResponse.json({ error: 'Arquivo ou descrição faltando' }, { status: 400 });
    }

    // 2. Converter o arquivo para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Extrair texto usando pdf2json (Lógica "Promisificada")
    // O pdf2json funciona com eventos, então criamos uma Promise para esperar ele terminar
    const parsedText = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser(null, true); // true para modo texto

      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
      
      pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        // O método getRawTextContent() extrai o texto puro
        const rawText = pdfParser.getRawTextContent();
        resolve(rawText);
      });

      pdfParser.parseBuffer(buffer);
    });

    // Limpeza básica do texto (remove caracteres estranhos de PDF)
    const cleanText = String(parsedText).replace(/----------------Page \(\d+\) Break----------------/g, "");

    const validation = AnalysisSchema.safeParse({
      resumeText: cleanText,
      jobDescription: jobDescription
    });

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Dados inválidos detectados.', 
        details: validation.error.format() 
      }, { status: 400 });
    }

    console.log("--- TEXTO LIDO (Início) ---");
    console.log(cleanText.substring(0, 150) + "...");

    // 4. Montar o Prompt
    const prompt = `
      VOCÊ É: Um Consultor de Carreira Experiente e Especialista em Recrutamento.
      
      TAREFA: Analisar o alinhamento entre um currículo e uma descrição de vaga, fornecendo um parecer crítico e recomendações acionáveis.
      
      CURRÍCULO:
      ${cleanText}
      
      DESCRIÇÃO DA VAGA:
      ${jobDescription}
      
      PRINCÍPIOS DE ANÁLISE:
      
      1. ANÁLISE CONTEXTUAL E JUSTA:
         - Analise o match entre o currículo e a vaga com base nos requisitos realmente solicitados.
         - Identifique tanto hard skills (tecnologias, ferramentas, metodologias) quanto soft skills (liderança, comunicação, resolução de problemas) relevantes para a posição.
         - Reconheça experiências transferíveis mesmo que em contextos diferentes.
      
      2. RECOMENDAÇÕES PRÁTICAS E ACIONÁVEIS:
         - Cada sugestão deve indicar uma ação específica: O QUE modificar, ONDE no currículo, e COMO melhorar a apresentação.
         - Priorize adicionar evidências concretas: números, resultados, projetos específicos, métricas de impacto.
         - Evite recomendações genéricas ou vagas ("melhore sua comunicação"). Seja específico.
      
      3. RIGOR NA PONTUAÇÃO:
         - O match_score deve refletir o alinhamento real entre as competências do candidato e os requisitos da vaga (0-100).
         - Candidatos que têm a skill mas não a demonstram com resultados/contexto recebem pontuação mais baixa naquele aspecto.
         - Currículos muito genéricos (sem detalhes, métricas, ou contexto) resultam em scores mais baixos.
         - Currículos bem estruturados com evidências claras recebem scores mais altos.
      
      4. SAÍDA OBRIGATÓRIA (JSON VÁLIDO):
      {
        "match_score": <número inteiro de 0 a 100>,
        "missing_keywords": [<lista de 3 a 5 competências, tecnologias ou experiências-chave que faltam no currículo para atender melhor aos requisitos da vaga>],
        "brief_analysis": "<análise de 2 a 3 parágrafos. Resuma: (1) o principal ponto forte do candidato para esta vaga, (2) o principal gap ou desafio, (3) o potencial geral de fit>",
        "suggestions": [
          "<Sugestão 1: específica, indicando qual experiência reescrever e como incluir métricas/resultados>",
          "<Sugestão 2: específica, indicando qual skill ou ferramenta adicionar e como evidenciar>",
          "<Sugestão 3: específica sobre estrutura, clareza ou apresentação do currículo>",
          "<Sugestão 4: dica estratégica para aumentar o destaque no ATS ou na avaliação inicial>"
        ]
      }
    `;

    // 5. Chamar a OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Você é um avaliador de currículos crítico e direto. Responda sempre em JSON válido (pt-BR)." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const aiResponse = completion.choices[0].message.content;
    
    if (!aiResponse) {
        throw new Error("A IA não retornou resposta");
    }

    const result = JSON.parse(aiResponse);

    await prisma.user.update({
      where: { email: session.user.email },
      data: { credits: { decrement: 1 } }
    });

    return NextResponse.json({ ...result, extracted_text: cleanText });

  } catch (error) {
    console.error('Erro no processamento:', error);
    return NextResponse.json({ error: 'Erro interno ao processar currículo' }, { status: 500 });
  }
}