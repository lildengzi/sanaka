import { useEffect, useMemo, useRef, useState } from 'react';
import RFB from '@novnc/novnc';
import { useT } from '../hooks/useT';

export type DisplayConnectionState =
  | 'waiting-runtime'
  | 'waiting-display'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'unavailable';

export function NoVncViewport({
  websocketPort,
  password = '',
  active,
  machineRunning = active,
  className = '',
  reconnectWindowMs = 15000,
  initialDelayMs = 0,
  onConnectionStateChange,
  scaleMode = 'fit'
}: {
  websocketPort?: number;
  password?: string;
  active: boolean;
  machineRunning?: boolean;
  className?: string;
  reconnectWindowMs?: number;
  initialDelayMs?: number;
  onConnectionStateChange?: (state: DisplayConnectionState) => void;
  scaleMode?: 'stretch' | 'fit';
}) {
  const t = useT();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rfbRef = useRef<RFB | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const initialDelayTimerRef = useRef<number | null>(null);
  const reconnectStartedAtRef = useRef<number | null>(null);
  const onConnectionStateChangeRef = useRef(onConnectionStateChange);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [displayReady, setDisplayReady] = useState(false);
  const [connectionState, setConnectionState] = useState<DisplayConnectionState>('waiting-runtime');

  const url = useMemo(() => {
    if (!websocketPort) {
      return null;
    }
    return `ws://127.0.0.1:${websocketPort}`;
  }, [websocketPort]);

  useEffect(() => {
    onConnectionStateChangeRef.current = onConnectionStateChange;
  }, [onConnectionStateChange]);

  useEffect(() => {
    onConnectionStateChangeRef.current?.(connectionState);
  }, [connectionState]);

  useEffect(() => {
    setConnectionAttempt(0);
    setDisplayReady(false);
    reconnectStartedAtRef.current = null;

    if (initialDelayTimerRef.current != null) {
      window.clearTimeout(initialDelayTimerRef.current);
      initialDelayTimerRef.current = null;
    }

    if (!active || !machineRunning || !url) {
      setConnectionState(machineRunning ? 'waiting-display' : 'waiting-runtime');
      return;
    }

    setConnectionState(initialDelayMs > 0 ? 'waiting-display' : 'connecting');
    initialDelayTimerRef.current = window.setTimeout(() => {
      setDisplayReady(true);
    }, initialDelayMs);

    return () => {
      if (initialDelayTimerRef.current != null) {
        window.clearTimeout(initialDelayTimerRef.current);
        initialDelayTimerRef.current = null;
      }
    };
  }, [active, initialDelayMs, machineRunning, url]);

  useEffect(() => {
    const target = mountRef.current;
    if (!active || !machineRunning || !displayReady || !target || !url) {
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (rfbRef.current) {
        rfbRef.current.disconnect();
        rfbRef.current = null;
      }
      return;
    }

    let disposed = false;
    if (reconnectTimerRef.current != null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    target.replaceChildren();
    setConnectionState(connectionAttempt > 0 ? 'reconnecting' : 'connecting');

    const rfb = new RFB(target, url, {
      credentials: password ? { password } : undefined,
      shared: true
    });
    rfb.viewOnly = false;
    rfb.scaleViewport = scaleMode === 'fit';
    rfb.resizeSession = false;
    rfb.background = '#1c1724';
    rfb.clipViewport = false;
    rfb.qualityLevel = 6;
    rfb.compressionLevel = 2;
    rfbRef.current = rfb;

    const handleConnect = () => {
      if (disposed) return;
      reconnectStartedAtRef.current = null;
      setConnectionState('connected');
    };

    const handleDisconnect = (event: Event) => {
      if (disposed) return;
      const detail = (event as CustomEvent<{ clean?: boolean }>).detail;
      const now = Date.now();
      if (reconnectStartedAtRef.current == null) {
        reconnectStartedAtRef.current = now;
      }
      const elapsed = now - reconnectStartedAtRef.current;

      if (elapsed >= reconnectWindowMs) {
        setConnectionState('unavailable');
        return;
      }

      setConnectionState('reconnecting');
      reconnectTimerRef.current = window.setTimeout(() => {
        if (!disposed) {
          setConnectionAttempt((attempt) => attempt + 1);
        }
      }, detail?.clean ? 500 : 900);
    };

    const handleCredentialsRequired = () => {
      if (disposed) return;
      if (password) {
        rfb.sendCredentials({ password });
        return;
      }
      setConnectionState('unavailable');
    };

    const handleSecurityFailure = () => {
      if (disposed) return;
      setConnectionState('unavailable');
    };

    rfb.addEventListener('connect', handleConnect);
    rfb.addEventListener('disconnect', handleDisconnect);
    rfb.addEventListener('credentialsrequired', handleCredentialsRequired);
    rfb.addEventListener('securityfailure', handleSecurityFailure);

    return () => {
      disposed = true;
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      rfb.removeEventListener('connect', handleConnect);
      rfb.removeEventListener('disconnect', handleDisconnect);
      rfb.removeEventListener('credentialsrequired', handleCredentialsRequired);
      rfb.removeEventListener('securityfailure', handleSecurityFailure);
      rfb.disconnect();
      if (rfbRef.current === rfb) {
        rfbRef.current = null;
      }
    };
  }, [active, connectionAttempt, displayReady, machineRunning, password, reconnectWindowMs, url]);

  // Apply scale mode to noVNC canvas
  useEffect(() => {
    const rfb = rfbRef.current;
    if (!rfb) return;
    // fit uses noVNC autoscale to preserve aspect ratio
    // stretch keeps the local canvas filling the viewport via CSS
    rfb.scaleViewport = scaleMode === 'fit';
    rfb.resizeSession = false;
  }, [scaleMode]);

  return (
    <div className={['novnc-viewport', className, `novnc-viewport--${scaleMode}`].filter(Boolean).join(' ')}>
      <div ref={mountRef} className="novnc-viewport__mount" />
      {connectionState !== 'connected' && (
        <div className="novnc-viewport__overlay" data-state={connectionState}>
          <span className="novnc-viewport__status">
            {connectionState === 'waiting-runtime' || connectionState === 'waiting-display'
              ? t('console.waitingConnection')
              : connectionState === 'connecting'
                ? t('console.liveDisplayConnecting')
                : connectionState === 'reconnecting'
                  ? t('console.liveDisplayReconnecting')
                  : t('console.liveDisplayUnavailable')}
          </span>
        </div>
      )}
    </div>
  );
}
