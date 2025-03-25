import OpenAI from 'openai';
import getConfig from '../config/environment';

let openaiClient: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
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
    
    openaiClient = new OpenAI(openaiConfig);
  }
  
  return openaiClient;
}

export default getOpenAIClient; 