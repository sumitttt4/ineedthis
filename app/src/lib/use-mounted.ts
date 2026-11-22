import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True on the client after hydration, false during SSR. No effect + setState round trip. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
