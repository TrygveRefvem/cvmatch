import { NextResponse } from 'next/server';

export async function GET() {
  // Return basic information about the environment
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    hasAzureConfig: !!process.env.OPENAI_API_BASE_URL,
    nodeVersion: process.version,
    message: 'Debug endpoint is working'
  });
} 