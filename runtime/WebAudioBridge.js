const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

function encodeWavHeader(dataSize, sampleRate = 44100, channels = 2, bitsPerSample = 16) {
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(Math.max(36 + dataSize, 36), 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(Math.max(dataSize, 0), 40);
  return buffer;
}

class WebAudioBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.machineId = options.machineId;
    this.runtimeDir = options.runtimeDir;
    this.log = typeof options.log === 'function' ? options.log : () => {};
    this.sampleRate = options.sampleRate || 44100;
    this.channels = options.channels || 2;
    this.bitsPerSample = options.bitsPerSample || 16;
    this.captureFilePath = path.join(this.runtimeDir, 'web-audio.wav');
    this.watchTimer = null;
    this.filePosition = 0;
    this.active = false;
    this.headerSent = false;
    this.closed = false;
  }

  getState() {
    return {
      enabled: this.active,
      captureFilePath: this.captureFilePath,
      sampleRate: this.sampleRate,
      channels: this.channels,
      bitsPerSample: this.bitsPerSample
    };
  }

  getStreamHeader() {
    return encodeWavHeader(0x7ffff000, this.sampleRate, this.channels, this.bitsPerSample);
  }

  async start() {
    this.closed = false;
    this.active = true;
    this.headerSent = false;
    this.filePosition = 0;
    await fs.promises.mkdir(this.runtimeDir, { recursive: true });
    await fs.promises.rm(this.captureFilePath, { force: true }).catch(() => null);
    this.log(`[web-audio] capture file prepared at ${this.captureFilePath}`);
    this.#scheduleWatch();
  }

  async stop() {
    this.active = false;
    if (this.watchTimer) {
      clearTimeout(this.watchTimer);
      this.watchTimer = null;
    }
    this.closed = true;
    this.removeAllListeners('chunk');
  }

  #scheduleWatch() {
    if (!this.active || this.closed) {
      return;
    }

    this.watchTimer = setTimeout(async () => {
      try {
        await this.#pump();
      } catch (error) {
        this.log(`[web-audio] pump error: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        this.#scheduleWatch();
      }
    }, 180);
    this.watchTimer.unref?.();
  }

  async #pump() {
    let stat;
    try {
      stat = await fs.promises.stat(this.captureFilePath);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }

    if (!this.headerSent && stat.size >= 44) {
      this.headerSent = true;
      this.filePosition = 44;
      this.log('[web-audio] capture header detected');
    }

    if (!this.headerSent || stat.size <= this.filePosition) {
      return;
    }

    const readStream = fs.createReadStream(this.captureFilePath, {
      start: this.filePosition,
      end: stat.size - 1
    });

    await new Promise((resolve, reject) => {
      readStream.on('data', (chunk) => {
        this.filePosition += chunk.length;
        this.emit('chunk', chunk);
      });
      readStream.once('end', resolve);
      readStream.once('error', reject);
    });
  }
}

module.exports = {
  WebAudioBridge
};
