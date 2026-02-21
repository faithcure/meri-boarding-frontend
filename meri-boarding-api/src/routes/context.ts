import type { FastifyInstance } from 'fastify';

export type RouteContext = {
  server: FastifyInstance;
  [key: string]: any;
};
