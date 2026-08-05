function createSilentWav() {
  const sampleRate = 8_000;
  const durationSeconds = 1;
  const channelCount = 1;
  const bitsPerSample = 16;
  const sampleCount = sampleRate * durationSeconds;
  const dataSize = sampleCount * channelCount * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channelCount * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channelCount * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

export async function GET() {
  return new Response(createSilentWav(), {
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Type': 'audio/wav',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
