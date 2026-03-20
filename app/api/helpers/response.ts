import { NextResponse } from 'next/server';

export function generalErrorResponse<T>(data?: T): Response {
  return new NextResponse(
    JSON.stringify(data || { message: 'General Error' }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function conflictRequestResponse<T>(data?: T): NextResponse {
  return new NextResponse(
    JSON.stringify(data || { message: 'entry conflict' }),
    {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export function successResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Successfuly' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function notFoundResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function badRequestResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Bad request' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function unauthorizedResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function forbiddenResponse<T>(data?: T): NextResponse {
  return new NextResponse(JSON.stringify(data || { message: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function validationErrorNextResponse<T>(data?: T): NextResponse {
  return new NextResponse(
    JSON.stringify(data || { message: 'Validation Error' }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
