/// <reference types="jest" />

import '@testing-library/jest-dom';
import React from 'react';

// Mock process.env
process.env.OPENAI_API_KEY = 'test-api-key';

// Mock fetch
global.fetch = jest.fn();

// Mock Headers, Request, and Response
const mockHeaders = {
  append: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  entries: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  forEach: jest.fn(),
  [Symbol.iterator]: jest.fn(),
  getSetCookie: jest.fn()
};

const mockRequest = {
  cache: 'default',
  credentials: 'same-origin',
  destination: '',
  headers: mockHeaders,
  integrity: '',
  method: 'GET',
  mode: 'cors',
  redirect: 'follow',
  referrer: '',
  referrerPolicy: '',
  url: 'http://localhost:3000',
  clone: jest.fn(),
  body: null as string | null,
  bodyUsed: false,
  arrayBuffer: jest.fn(),
  blob: jest.fn(),
  formData: jest.fn(),
  json: jest.fn(),
  text: jest.fn()
};

const mockResponse = {
  headers: mockHeaders,
  ok: true,
  redirected: false,
  status: 200,
  statusText: 'OK',
  type: 'default',
  url: '',
  clone: jest.fn(),
  body: null as string | null,
  bodyUsed: false,
  arrayBuffer: jest.fn(),
  blob: jest.fn(),
  formData: jest.fn(),
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn()
};

global.Headers = jest.fn(() => mockHeaders) as unknown as typeof Headers;
global.Request = jest.fn(() => mockRequest) as unknown as typeof Request;
global.Response = jest.fn(() => mockResponse) as unknown as typeof Response;

// Mock sessionStorage
const mockStorage: { [key: string]: string } = {};
global.sessionStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); },
  key: (index: number) => Object.keys(mockStorage)[index] || null,
  length: Object.keys(mockStorage).length
};

// Mock NextRequest and NextResponse
jest.mock('next/server', () => {
  const createNextRequest = (input: string | Request) => {
    const request = {
      ...mockRequest,
      cookies: {
        get: jest.fn(),
        getAll: jest.fn(),
        set: jest.fn(),
        delete: jest.fn()
      },
      nextUrl: new URL(typeof input === 'string' ? input : input.url)
    };

    // Parse the body if it exists
    if (request.body) {
      request.json = jest.fn().mockImplementation(async () => {
        return JSON.parse(request.body || '{}');
      });
    }

    return request;
  };

  const mockNextRequest = jest.fn((input: string | Request, init?: RequestInit) => {
    const request = createNextRequest(input);
    if (init?.body) {
      request.body = init.body as string;
      request.json = jest.fn().mockImplementation(async () => {
        return JSON.parse(request.body || '{}');
      });
    }
    return request;
  });

  const mockNextResponse = jest.fn(() => ({
    ...mockResponse,
    cookies: {
      get: jest.fn(),
      getAll: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    }
  }));

  return {
    NextRequest: mockNextRequest,
    NextResponse: Object.assign(mockNextResponse, {
      json: jest.fn((body: unknown, init?: ResponseInit) => ({
        ...mockResponse,
        ...init,
        json: jest.fn().mockResolvedValue(body)
      }))
    })
  };
});

// Mock React components and hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useSelectedLayoutSegment: () => null
}));

// Mock React components
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt = '', ...props }: { src: string; alt?: string; [key: string]: any }) {
    return { type: 'img', props: { src, alt, ...props } };
  }
}));

// Mock React hooks
jest.mock('react', () => {
  const originalReact = jest.requireActual('react');
  return {
    ...originalReact,
    useState: jest.fn(originalReact.useState),
    useEffect: jest.fn(originalReact.useEffect),
    useCallback: jest.fn(originalReact.useCallback),
    useMemo: jest.fn(originalReact.useMemo),
    useRef: jest.fn(originalReact.useRef),
    useContext: jest.fn(originalReact.useContext)
  };
}); 