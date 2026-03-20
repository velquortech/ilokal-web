import { MiddlewareFactory } from '@/lib/types/middleware';
import { NextProxy, NextResponse } from 'next/server';

export function stackMiddlewares(
  functions: MiddlewareFactory[] = [],
  index = 0,
): NextProxy {
  const current = functions[index];
  if (current) {
    const next = stackMiddlewares(functions, index + 1);
    return current(next);
  }
  return () => NextResponse.next();
}
