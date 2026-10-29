// Générateur de zip minimal, sans compression (méthode "store") : suffisant pour
// regrouper des PNG, déjà compressés, sans ajouter de dépendance.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (data: Bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

// Date/heure au format MS-DOS des en-têtes zip.
const dosDateTime = (date: Date) => ({
  time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
});

type Bytes = Uint8Array<ArrayBuffer>;

export interface ZipEntry {
  name: string;
  data: Bytes;
}

export const createZip = (entries: ZipEntry[]): Blob => {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const parts: BlobPart[] = [];
  const central: Bytes[] = [];
  let offset = 0;

  entries.forEach(({ name, data }) => {
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // signature d'en-tête local
    local.setUint16(4, 20, true); // version requise
    local.setUint16(6, 0x0800, true); // noms de fichiers en UTF-8
    local.setUint16(8, 0, true); // méthode : store
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    parts.push(local.buffer, nameBytes, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true); // signature d'entrée du répertoire central
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, time, true);
    entry.setUint16(14, date, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);

    offset += 30 + nameBytes.length + data.length;
  });

  const centralSize = central.reduce((n, b) => n + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); // fin du répertoire central
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
};

// Noms de fichiers sans caractères interdits ni doublons dans l'archive.
export const uniqueFileNames = (names: string[], extension: string) => {
  const used = new Map<string, number>();
  return names.map(raw => {
    const base = raw.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'build';
    const n = used.get(base.toLowerCase()) ?? 0;
    used.set(base.toLowerCase(), n + 1);
    return `${n === 0 ? base : `${base} (${n + 1})`}.${extension}`;
  });
};
