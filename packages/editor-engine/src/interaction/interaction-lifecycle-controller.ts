export type InteractionLifecycleReason =
  | 'escape'
  | 'pointer-cancel'
  | 'lost-pointer-capture'
  | 'tool-switch'
  | 'dispose';

export type InteractionLifecycleCancel = (reason: InteractionLifecycleReason) => void;

export interface InteractionLifecycleRegistration {
  readonly id: string;
  cancel: InteractionLifecycleCancel;
}

/**
 * Owns cancellation routing for transient editor interactions.
 *
 * The controller deliberately does not mutate the document, history or
 * selection. Participants own their local preview/session cleanup and register
 * it here while the interaction is active. This keeps lifecycle events from
 * growing independent cleanup paths in the viewport.
 */
export class InteractionLifecycleController {
  private readonly active = new Map<string, InteractionLifecycleCancel>();

  register(registration: InteractionLifecycleRegistration): () => void {
    if (!registration.id) throw new Error('Interaction lifecycle registration requires a non-empty id');
    if (this.active.has(registration.id)) throw new Error(`Interaction lifecycle id already registered: ${registration.id}`);

    this.active.set(registration.id, registration.cancel);
    return () => this.complete(registration.id);
  }

  complete(id: string): boolean {
    return this.active.delete(id);
  }

  cancel(id: string, reason: InteractionLifecycleReason): boolean {
    const cancel = this.active.get(id);
    if (!cancel) return false;

    // Remove first so callbacks may safely re-enter the controller.
    this.active.delete(id);
    cancel(reason);
    return true;
  }

  cancelAll(reason: InteractionLifecycleReason): readonly string[] {
    const registrations = [...this.active.entries()];
    this.active.clear();

    const cancelled: string[] = [];
    let firstError: unknown;
    for (const [id, cancel] of registrations) {
      try {
        cancel(reason);
        cancelled.push(id);
      } catch (error) {
        firstError ??= error;
      }
    }

    if (firstError !== undefined) throw firstError;
    return cancelled;
  }

  has(id: string): boolean {
    return this.active.has(id);
  }

  get activeIds(): readonly string[] {
    return [...this.active.keys()];
  }
}
