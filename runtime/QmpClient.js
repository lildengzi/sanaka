const net = require('net');
const { EventEmitter } = require('events');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class QmpClient extends EventEmitter {
  constructor(options) {
    super();
    this.transport = options.transport;
    this.path = options.path;
    this.host = options.host || '127.0.0.1';
    this.port = options.port;
    this.socket = null;
    this.buffer = '';
    this.commandId = 0;
    this.pending = new Map();
    this.ready = false;
  }

  async connect({ retries = 25, retryDelayMs = 200, timeoutMs = 5000, shouldContinue } = {}) {
    const canContinue = typeof shouldContinue === 'function' ? shouldContinue : () => true;

    for (let attempt = 0; attempt < retries; attempt += 1) {
      if (!canContinue()) {
        throw new Error('QMP startup cancelled.');
      }

      try {
        await this.#connectOnce(timeoutMs);
        if (!canContinue()) {
          this.close();
          throw new Error('QMP startup cancelled.');
        }
        await this.execute('qmp_capabilities');
        this.ready = true;
        return;
      } catch (error) {
        this.close();
        if (!canContinue()) {
          throw error;
        }
        if (attempt === retries - 1) {
          throw error;
        }
        await delay(retryDelayMs);
      }
    }
  }

  #connectOnce(timeoutMs) {
    return new Promise((resolve, reject) => {
      const onMessage = (message) => {
        if (message.QMP) {
          this.off('message', onMessage);
          resolve();
        }
      };

      const socket = this.transport === 'unix'
        ? net.createConnection(this.path)
        : net.createConnection({ host: this.host, port: this.port });

      const timer = setTimeout(() => {
        this.off('message', onMessage);
        socket.destroy(new Error('QMP connection timeout.'));
        reject(new Error('QMP connection timeout.'));
      }, timeoutMs);

      socket.once('error', (error) => {
        clearTimeout(timer);
        this.off('message', onMessage);
        reject(error);
      });

      socket.on('close', () => {
        this.ready = false;
        for (const pending of this.pending.values()) {
          pending.reject(new Error('QMP socket closed.'));
        }
        this.pending.clear();
      });

      socket.on('data', (chunk) => {
        this.#consumeBuffer(chunk.toString('utf8'));
      });

      socket.once('connect', () => {
        clearTimeout(timer);
      });

      this.on('message', onMessage);
      this.socket = socket;
    });
  }

  #consumeBuffer(chunk) {
    this.buffer += chunk;

    while (this.buffer.includes('\n')) {
      const newlineIndex = this.buffer.indexOf('\n');
      const raw = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (!raw) {
        continue;
      }

      let message;
      try {
        message = JSON.parse(raw);
      } catch {
        continue;
      }

      this.emit('message', message);

      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (Object.prototype.hasOwnProperty.call(message, 'error')) {
          pending.reject(new Error(message.error?.desc || 'QMP command failed.'));
        } else {
          pending.resolve(message.return);
        }
        continue;
      }

      if (message.event) {
        this.emit('event', message);
      }
    }
  }

  execute(command, args = {}) {
    if (!this.socket) {
      return Promise.reject(new Error('QMP socket is not connected.'));
    }

    const id = `qmp-${++this.commandId}`;
    const payload = {
      execute: command,
      arguments: args,
      id
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.write(`${JSON.stringify(payload)}\r\n`);
    });
  }

  queryStatus() {
    return this.execute('query-status');
  }

  queryBlock() {
    return this.execute('query-block');
  }

  systemPowerdown() {
    return this.execute('system_powerdown');
  }

  quit() {
    return this.execute('quit');
  }

  systemReset() {
    return this.execute('system_reset');
  }

  blockdevChangeMedium({ id, filename, format = 'raw', readOnly = false, force = true }) {
    return this.execute('blockdev-change-medium', {
      id,
      filename,
      format,
      force,
      'read-only-mode': readOnly ? 'read-only' : 'retain'
    });
  }

  humanMonitorCommand(commandLine) {
    return this.execute('human-monitor-command', {
      'command-line': commandLine
    });
  }

  close() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.ready = false;
  }
}

module.exports = {
  QmpClient
};
