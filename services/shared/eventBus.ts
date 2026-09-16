import { EventEmitter } from "events";

export interface DomainEvent<T = any> {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: string;
  correlationId: string;
  payload: T;
}

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

export class MicroserviceEventBus {
  private static instance: MicroserviceEventBus;
  private emitter: EventEmitter;
  private eventStore: DomainEvent[] = [];

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
  }

  public static getInstance(): MicroserviceEventBus {
    if (!MicroserviceEventBus.instance) {
      MicroserviceEventBus.instance = new MicroserviceEventBus();
    }
    return MicroserviceEventBus.instance;
  }

  public publish<T = any>(
    type: string,
    aggregateId: string,
    aggregateType: string,
    payload: T,
    correlationId: string = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  ): DomainEvent<T> {
    const event: DomainEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      aggregateId,
      aggregateType,
      timestamp: new Date().toISOString(),
      correlationId,
      payload,
    };

    this.eventStore.push(event);
    // Cap event store in memory
    if (this.eventStore.length > 2000) {
      this.eventStore.shift();
    }

    // Asynchronous dispatch so publishers don't block
    setImmediate(() => {
      this.emitter.emit(type, event);
      this.emitter.emit("*", event);
    });

    return event;
  }

  public subscribe<T = any>(type: string, handler: EventHandler<T>): void {
    this.emitter.on(type, handler);
  }

  public getRecentEvents(): DomainEvent[] {
    return [...this.eventStore];
  }
}

export const eventBus = MicroserviceEventBus.getInstance();
