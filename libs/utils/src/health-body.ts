export interface HealthBody {
  readonly status: 'ok';
  readonly service: string;
}

export function healthBody(service: string): HealthBody {
  const trimmed = service.trim();
  if (trimmed.length === 0) {
    throw new Error('Service name is required.');
  }

  return { status: 'ok', service: trimmed };
}
