import { createInitialConsoleState } from '../domain/defaults';
import type { ConsoleSessionState } from '../domain/schemas';
import type { RuntimeMachineState } from '../types/electron';

export type ConsoleAction =
  | { type: 'hydrate'; displayHint: string; audioHint: string }
  | { type: 'hydrate-runtime'; runtimeState: RuntimeMachineState | undefined; displayHint: string; audioHint: string }
  | { type: 'boot-complete' }
  | { type: 'toggle-pause' }
  | { type: 'disconnect' }
  | { type: 'reconnect' }
  | { type: 'toggle-mute' }
  | { type: 'toggle-fullscreen' }
  | { type: 'toggle-input-capture' }
  | { type: 'set-zoom'; zoom: ConsoleSessionState['zoom'] };

function event(level: 'info' | 'success' | 'warning', message: string) {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    level,
    message,
    time: new Date().toISOString()
  };
}

/** Map a RuntimeMachineState status to a console-displayable status string. */
export function runtimeStatusToConsoleStatus(
  runtimeState: RuntimeMachineState | undefined
): ConsoleSessionState['status'] {
  if (!runtimeState) return 'disconnected';
  switch (runtimeState.status) {
    case 'starting':
      return 'booting';
    case 'running':
      return 'running';
    case 'stopping':
      return 'disconnected';
    case 'stopped':
    default:
      return 'disconnected';
  }
}

/** Derive a display-friendly backend label from RuntimeMachineState. */
export function formatRuntimeBackend(runtimeState: RuntimeMachineState | undefined): string {
  if (!runtimeState) return '—';
  return runtimeState.displayFrontend === 'sanaka'
    ? `Sanaka / ${runtimeState.displayBackend.toUpperCase()}`
    : `${runtimeState.displayFrontend.toUpperCase()} / ${runtimeState.displayBackend.toUpperCase()}`;
}

/** Derive a display-friendly port label. */
export function formatRuntimePort(runtimeState: RuntimeMachineState | undefined): string {
  if (!runtimeState) return '—';
  return String(runtimeState.displayPort);
}

export function createConsoleSession(displayHint: string, audioHint: string) {
  return createInitialConsoleState(displayHint, audioHint);
}

export function consoleSessionReducer(state: ConsoleSessionState, action: ConsoleAction): ConsoleSessionState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        displayHint: action.displayHint,
        audioHint: action.audioHint
      };
    case 'hydrate-runtime': {
      const { runtimeState } = action;
      const connected = runtimeState ? (runtimeState.status === 'running' || runtimeState.status === 'starting') : false;
      const status = runtimeStatusToConsoleStatus(runtimeState);
      return {
        ...state,
        displayHint: action.displayHint,
        audioHint: action.audioHint,
        connected,
        status,
        events:
          runtimeState && runtimeState.status !== state.status
            ? [
                event(
                  runtimeState.status === 'running' ? 'success' : runtimeState.status === 'starting' ? 'info' : 'warning',
                  runtimeState.status === 'running'
                    ? 'console.eventMessages.bootComplete'
                    : runtimeState.status === 'starting'
                      ? 'console.eventMessages.attached'
                      : 'console.eventMessages.shutdown'
                ),
                ...state.events
              ].slice(0, 50)
            : state.events
      };
    }
    case 'boot-complete':
      return {
        ...state,
        status: 'running',
        events: [...state.events, event('success', 'console.eventMessages.bootComplete')]
      };
    case 'toggle-pause':
      return {
        ...state,
        status: state.status === 'paused' ? 'running' : 'paused',
        events: [
          ...state.events,
          event('info', state.status === 'paused' ? 'console.eventMessages.resumed' : 'console.eventMessages.paused')
        ]
      };
    case 'disconnect':
      return {
        ...state,
        connected: false,
        status: 'disconnected',
        events: [...state.events, event('warning', 'console.eventMessages.shutdown')]
      };
    case 'reconnect':
      return {
        ...state,
        connected: true,
        status: 'running',
        events: [...state.events, event('success', 'console.eventMessages.restarted')]
      };
    case 'toggle-mute':
      return {
        ...state,
        muted: !state.muted,
        events: [...state.events, event('info', state.muted ? 'console.eventMessages.unmuted' : 'console.eventMessages.muted')]
      };
    case 'toggle-fullscreen':
      return {
        ...state,
        fullscreen: !state.fullscreen
      };
    case 'toggle-input-capture':
      return {
        ...state,
        inputCaptured: !state.inputCaptured,
        events: [...state.events, event('info', state.inputCaptured ? 'console.eventMessages.inputReleased' : 'console.eventMessages.inputCaptured')]
      };
    case 'set-zoom':
      return {
        ...state,
        zoom: action.zoom
      };
    default:
      return state;
  }
}
