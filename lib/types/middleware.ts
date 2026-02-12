import { NextProxy } from 'next/server';

export type MiddlewareFactory = (middleware: NextProxy) => NextProxy;
