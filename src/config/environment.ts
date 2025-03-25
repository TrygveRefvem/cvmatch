/**
 * Environment configuration
 * This file provides environment-specific configuration for the application
 */

export type Environment = 'development' | 'test' | 'production';

interface EnvironmentConfig {
  openai: {
    apiKey: string;
    baseUrl?: string;
    apiVersion?: string;
  };
  appUrl: string;
}

export const getEnvironment = (): Environment => {
  return (process.env.NODE_ENV as Environment) || 'development';
};

export const getConfig = (): EnvironmentConfig => {
  const env = getEnvironment();
  const isAzure = !!process.env.OPENAI_API_BASE_URL;
  
  const config: EnvironmentConfig = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_API_BASE_URL,
      apiVersion: isAzure ? '2023-05-15' : undefined,
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };
  
  return config;
};

export default getConfig; 