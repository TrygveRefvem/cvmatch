import { createContext, useContext, ReactNode } from 'react';
import OpenAI from 'openai';
import getConfig from '../config/environment';

interface OpenAIContextType {
  client: OpenAI;
}

const OpenAIContext = createContext<OpenAIContextType | undefined>(undefined);

export function useOpenAI() {
  const context = useContext(OpenAIContext);
  if (!context) {
    throw new Error('useOpenAI must be used within an OpenAIProvider');
  }
  return context;
}

export function createOpenAIClient(): OpenAI {
  const config = getConfig();
  
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }
  
  const openaiConfig: any = {
    apiKey: config.openai.apiKey,
  };
  
  // Azure OpenAI specific configuration
  if (config.openai.baseUrl) {
    openaiConfig.baseURL = config.openai.baseUrl;
    
    if (config.openai.apiVersion) {
      openaiConfig.defaultQuery = { "api-version": config.openai.apiVersion };
    }
  }
  
  return new OpenAI(openaiConfig);
}

export function OpenAIProvider({ children }: { children: ReactNode }) {
  const client = createOpenAIClient();
  
  return (
    <OpenAIContext.Provider value={{ client }}>
      {children}
    </OpenAIContext.Provider>
  );
} 