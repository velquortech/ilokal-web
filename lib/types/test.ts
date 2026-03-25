// Types intended for test code only

// Minimal shape for a Next-style request used in tests. Keep small and focused.
export type TestNextRequest = {
  url: string;
  nextUrl: URL;
  headers?: Record<string, string> | Headers;
};
