import { describe, expect, it } from 'vitest';
import { consoleSessionReducer, createConsoleSession } from './console-session';

describe('console session reducer', () => {
  it('transitions between booting, running, paused, and disconnected states', () => {
    let state = createConsoleSession('Sanaka / SPICE', 'SPICE audio shell');
    expect(state.status).toBe('booting');

    state = consoleSessionReducer(state, { type: 'boot-complete' });
    expect(state.status).toBe('running');

    state = consoleSessionReducer(state, { type: 'toggle-pause' });
    expect(state.status).toBe('paused');

    state = consoleSessionReducer(state, { type: 'disconnect' });
    expect(state.status).toBe('disconnected');
    expect(state.connected).toBe(false);

    state = consoleSessionReducer(state, { type: 'reconnect' });
    expect(state.status).toBe('running');
    expect(state.connected).toBe(true);
  });
});
