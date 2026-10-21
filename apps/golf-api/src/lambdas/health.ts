import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { health } from '../functions/health.js';

export function handler(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(health()),
  };
}
