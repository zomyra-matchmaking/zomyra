/**
 * Mock API abstraction layer.
 *
 * Every screen in the app talks to these services — never directly to mock
 * data. To switch to a real backend later, only this file (and siblings in
 * /services) needs to change. The function shapes are designed to map 1:1
 * onto a REST/GraphQL backend without touching screens.
 */

const NETWORK_DELAY_MS = 250;

export function fakeNetwork<T>(value: T, ms: number = NETWORK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
