import { EventEmitter } from 'node:events';
import { auditEvents } from '../db/repositories.js';
import { newId } from './ids.js';

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  actorId?: string;
  actorRole?: string;
  ownerId?: string;
  correlationId?: string;
  payload: T;
  createdAt: string;
}

export interface EventContext {
  actorId?: string;
  actorRole?: string;
  ownerId?: string;
  correlationId?: string;
}

class DomainEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(200);
  }

  /**
   * Persists the event to the audit trail synchronously, then dispatches to subscribers on the next tick
   * so publishers never block on side effects (notifications, etc.).
   */
  publish<T extends Record<string, unknown>>(
    type: string,
    aggregateType: string,
    aggregateId: string,
    payload: T,
    ctx: EventContext = {}
  ): DomainEvent<T> {
    const event: DomainEvent<T> = {
      id: newId('evt'),
      type,
      aggregateType,
      aggregateId,
      actorId: ctx.actorId,
      actorRole: ctx.actorRole,
      ownerId: ctx.ownerId,
      correlationId: ctx.correlationId,
      payload,
      createdAt: new Date().toISOString(),
    };
    auditEvents.insert({ ...event, payload: redact(payload) });
    setImmediate(() => {
      this.emitter.emit(type, event);
      this.emitter.emit('*', event);
    });
    return event;
  }

  subscribe<T = Record<string, unknown>>(type: string, handler: (event: DomainEvent<T>) => void | Promise<void>): void {
    this.emitter.on(type, (event: DomainEvent<T>) => {
      Promise.resolve(handler(event)).catch((err) => console.error(`[events] handler for ${type} failed:`, err));
    });
  }
}

const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'token', 'accessCode', 'secret', 'otp']);

function redact<T extends Record<string, unknown>>(payload: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    out[k] = SENSITIVE_KEYS.has(k) ? '[redacted]' : v;
  }
  return out;
}

export const events = new DomainEventBus();
