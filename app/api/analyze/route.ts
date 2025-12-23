import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// @ts-ignore
import PDFParser from 'pdf2json';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // 1. Receber os dados
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

    console.log("--- TEXTO LIDO (Início) ---");
    console.log(cleanText.substring(0, 150) + "...");

    // 4. Montar o Prompt
    const prompt = `
      ATUE COMO: Um Consultor de Carreira de Elite e Especialista em ATS.
      
      CONTEXTO: Você deve cruzar os dados de um currículo com uma vaga.
      
      DADOS:
      --- CURRÍCULO: ---
      ${cleanText}
      
      --- DESCRIÇÃO DA VAGA: ---
      ${jobDescription}
      
      REGRAS CRÍTICAS DE ANÁLISE (LEIA COM ATENÇÃO):
      
      1. FILTRO DE PALAVRAS-CHAVE (O MAIS IMPORTANTE):
         - IGNORE: Eventos sazonais ("Natal", "Black Friday"), Locais ("Palmas", "Centro"), Benefícios ("Vale Transporte"), Adjetivos genéricos ("Legal", "Bacana").
         - FOQUE EM: Hard Skills (Tecnologias, Ferramentas ex: "Excel Avançado", "SAP"), Soft Skills Técnicas (ex: "Venda Consultiva", "Gestão de Conflitos") e Certificações.
         - SE A VAGA PEDE "ORGANIZAÇÃO": Não sugira a palavra "Organização" solta. Sugira "Metodologia 5S" ou "Gestão de Processos".
      
      2. SUGESTÕES PRÁTICAS E DIRETAS:
         - Nada de "Melhore sua comunicação".
         - Use o formato: "Ação + Contexto". Ex: "Em vez de listar tarefas, descreva: 'Gerenciei estoque de R$ 50k durante a alta temporada'".
         - Se faltar uma skill, diga como evidenciá-la, não apenas "Adicione tal coisa".
      
      3. RIGOR NA NOTA:
         - Se o candidato tem a skill mas não prova com resultados, a nota cai.
         - Se o currículo for genérico demais, a nota deve ser baixa (20-40).
      
      SAÍDA OBRIGATÓRIA (JSON PURO):
      {
        "match_score": (Inteiro 0-100),
        "missing_keywords": ["Lista de 3 a 5 termos TÉCNICOS ou DE CARREIRA que realmente faltam. Sem datas ou locais."],
        "brief_analysis": "Análise direta em 2 parágrafos. Aponte o erro fatal do currículo e o ponto forte.",
        "suggestions": [
           "Dica 1: Focada em reescrever uma experiência específica para incluir métricas.",
           "Dica 2: Focada em adicionar uma ferramenta/skill técnica que a vaga pede.",
           "Dica 3: Focada em formatação ou clareza do objetivo profissional.",
           "Dica 4: Uma dica de ouro para passar no ATS."
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

    return NextResponse.json({ ...result, extracted_text: cleanText });

  } catch (error) {
    console.error('Erro no processamento:', error);
    return NextResponse.json({ error: 'Erro interno ao processar currículo' }, { status: 500 });
  }
}