// Tiny event bus so game logic and UI stay decoupled.
type Fn = (data?: any) => void;
const handlers = new Map<string, Fn[]>();

export const bus = {
  on(evt: string, fn: Fn) {
    const list = handlers.get(evt) ?? [];
    list.push(fn);
    handlers.set(evt, list);
  },
  emit(evt: string, data?: any) {
    handlers.get(evt)?.forEach((fn) => fn(data));
  },
};

export const toast = (msg: string) => bus.emit('toast', msg);
export const changed = () => bus.emit('change');
