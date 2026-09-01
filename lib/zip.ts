export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): { time: number; date: number } {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

class ByteWriter {
  private bytes: number[] = [];

  get length(): number {
    return this.bytes.length;
  }

  u8(v: number) {
    this.bytes.push(v & 0xff);
  }

  u16(v: number) {
    this.u8(v);
    this.u8(v >>> 8);
  }

  u32(v: number) {
    this.u16(v);
    this.u16(v >>> 16);
  }

  raw(data: Uint8Array) {
    for (let i = 0; i < data.length; i++) this.bytes.push(data[i]!);
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}

// Minimal STORE-only (uncompressed) ZIP writer - no external dependency.
// Good enough for small, text-heavy archives like a .docx package, where
// the size savings from real compression aren't worth pulling in a library.
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const local = new ByteWriter();
  const central = new ByteWriter();
  const offsets: number[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    offsets.push(local.length);

    local.u32(0x04034b50);
    local.u16(20);
    local.u16(0);
    local.u16(0);
    local.u16(time);
    local.u16(date);
    local.u32(crc);
    local.u32(entry.data.length);
    local.u32(entry.data.length);
    local.u16(nameBytes.length);
    local.u16(0);
    local.raw(nameBytes);
    local.raw(entry.data);
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);

    central.u32(0x02014b50);
    central.u16(20);
    central.u16(20);
    central.u16(0);
    central.u16(0);
    central.u16(time);
    central.u16(date);
    central.u32(crc);
    central.u32(entry.data.length);
    central.u32(entry.data.length);
    central.u16(nameBytes.length);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u16(0);
    central.u32(0);
    central.u32(offsets[i]!);
    central.raw(nameBytes);
  }

  const centralDirOffset = local.length;
  const end = new ByteWriter();
  end.u32(0x06054b50);
  end.u16(0);
  end.u16(0);
  end.u16(entries.length);
  end.u16(entries.length);
  end.u32(central.length);
  end.u32(centralDirOffset);
  end.u16(0);

  const out = new Uint8Array(local.length + central.length + end.length);
  out.set(local.toUint8Array(), 0);
  out.set(central.toUint8Array(), local.length);
  out.set(end.toUint8Array(), local.length + central.length);
  return out;
}
