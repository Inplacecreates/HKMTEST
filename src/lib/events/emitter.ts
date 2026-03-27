import type { ActivityEvent } from "./types";

type EventHandler = (event: ActivityEvent) => Promise<void>;

/**
 * Simple event emitter for activity events.
 * Handlers run asynchronously and don't block the caller.
 */
class EventEmitter {
  private handlers: EventHandler[] = [];

  on(handler: EventHandler) {
    this.handlers.push(handler);
  }

  off(handler: EventHandler) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  async emit(event: ActivityEvent) {
    // Fire all handlers concurrently, don't await (fire-and-forget)
    // Errors in handlers should not affect the main flow
    for (const handler of this.handlers) {
      handler(event).catch((err) => {
        console.error("[EventEmitter] Handler error:", err);
      });
    }
  }
}

// Singleton event emitter
export const eventEmitter = new EventEmitter();
