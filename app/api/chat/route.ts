import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const response = await openai.chat.completions.create({
      model: "deepseek-reasoner", // To aktywuje model R1
      messages: [
        { role: "system", content: "Jesteś pomocnym asystentem AI." },
        { role: "user", content: prompt }
      ],
    });

    // Model Reasoner zwraca dodatkowe pole 'reasoning_content' (proces myślowy)
    // oraz 'content' (ostateczna odpowiedź)
    return NextResponse.json({
      answer: response.choices[0].message.content,
      thinking: (response.choices[0].message as any).reasoning_content // Proces myślowy R1
    });

  } catch (error) {
    console.error("Błąd DeepSeek:", error);
    return NextResponse.json({ error: "Błąd podczas generowania odpowiedzi" }, { status: 500 });
  }
}