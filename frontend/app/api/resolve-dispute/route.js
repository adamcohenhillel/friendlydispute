import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { disputeId, caseA, caseB, partyA, partyB } = await request.json();

    // Prepare the prompt for GPT
    const prompt = `
      You are an impartial arbitrator tasked with resolving a dispute between two parties.
      Please analyze both cases and determine the winner based on the merits of their arguments.
      
      Party A (${partyA}): ${caseA}
      
      Party B (${partyB}): ${caseB}
      
      Please provide your decision in the following format:
      1. Brief analysis of Party A's case
      2. Brief analysis of Party B's case
      3. Your reasoning for the decision
      4. Final decision: Choose either Party A (${partyA}) or Party B (${partyB}) as the winner
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an impartial arbitrator with expertise in dispute resolution. Your task is to analyze both sides of a dispute and make a fair decision based on the merits of each case."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const analysis = completion.choices[0].message.content;
    
    // Extract the winner from the AI's response
    const winner = analysis.toLowerCase().includes(`party a (${partyA.toLowerCase()})`) ? partyA : partyB;

    return NextResponse.json({
      success: true,
      winner,
      analysis,
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to resolve dispute',
    }, { status: 500 });
  }
} 