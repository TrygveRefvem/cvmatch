import { NextResponse } from 'next/server';
import getOpenAIClient from '@/lib/openai-client';

export async function GET() {
  try {
    const openai = getOpenAIClient();
    
    // Test the connection to OpenAI
    const models = await openai.models.list();
    
    return NextResponse.json({
      success: true,
      message: 'Successfully connected to OpenAI API',
      models: models.data.slice(0, 5).map(model => model.id),
      config: {
        baseUrl: process.env.OPENAI_API_BASE_URL ? 'Azure OpenAI' : 'Standard OpenAI',
        apiKeySet: !!process.env.OPENAI_API_KEY
      }
    });
  } catch (error) {
    console.error('Error testing OpenAI connection:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      config: {
        baseUrl: process.env.OPENAI_API_BASE_URL ? 'Azure OpenAI' : 'Standard OpenAI',
        apiKeySet: !!process.env.OPENAI_API_KEY
      }
    }, { status: 500 });
  }
} 