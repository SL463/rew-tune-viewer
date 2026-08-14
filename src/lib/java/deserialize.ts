// Minimal Java Object Serialization Stream Protocol (JOSP) parser.
// Enough to read REW .mdat files: objects, class descriptors, strings,
// enums, references, and primitive/object arrays. Custom writeObject
// annotation blocks are consumed and discarded.

const TC_NULL = 0x70;
const TC_REFERENCE = 0x71;
const TC_CLASSDESC = 0x72;
const TC_OBJECT = 0x73;
const TC_STRING = 0x74;
const TC_ARRAY = 0x75;
const TC_CLASS = 0x76;
const TC_BLOCKDATA = 0x77;
const TC_ENDBLOCKDATA = 0x78;
const TC_RESET = 0x79;
const TC_BLOCKDATALONG = 0x7a;
const TC_EXCEPTION = 0x7b;
const TC_LONGSTRING = 0x7c;
const TC_PROXYCLASSDESC = 0x7d;
const TC_ENUM = 0x7e;

const BASE_HANDLE = 0x7e0000;

const SC_WRITE_METHOD = 0x01;
const SC_SERIALIZABLE = 0x02;
const SC_EXTERNALIZABLE = 0x04;
const SC_BLOCK_DATA = 0x08;
const SC_ENUM = 0x10;

export interface JavaField {
  typecode: string;
  name: string;
  className?: string;
}

export interface JavaClassDesc {
  name: string;
  serialVersionUID: bigint;
  flags: number;
  fields: JavaField[];
  superClass: JavaClassDesc | null;
  isEnum: boolean;
}

export interface JavaObject {
  __class: string;
  __fields: Record<string, unknown>;
  __classDesc: JavaClassDesc;
}

export interface JavaEnum {
  __enum: string;
  __constant: string;
}

export type JavaArray = {
  __arrayType: string;
  values: unknown;
};

const BLOCKDATA_MARKER = Symbol("blockdata");

export class JavaDeserializer {
  private buf: Buffer;
  private pos = 0;
  private handles: unknown[] = [];

  constructor(buf: Buffer) {
    this.buf = buf;
  }

  static parse(buf: Buffer): unknown[] {
    const d = new JavaDeserializer(buf);
    return d.readStream();
  }

  private u8() {
    return this.buf.readUInt8(this.pos++);
  }
  private i8() {
    return this.buf.readInt8(this.pos++);
  }
  private u16() {
    const v = this.buf.readUInt16BE(this.pos);
    this.pos += 2;
    return v;
  }
  private i16() {
    const v = this.buf.readInt16BE(this.pos);
    this.pos += 2;
    return v;
  }
  private i32() {
    const v = this.buf.readInt32BE(this.pos);
    this.pos += 4;
    return v;
  }
  private i64() {
    const v = this.buf.readBigInt64BE(this.pos);
    this.pos += 8;
    return v;
  }
  private f32() {
    const v = this.buf.readFloatBE(this.pos);
    this.pos += 4;
    return v;
  }
  private f64() {
    const v = this.buf.readDoubleBE(this.pos);
    this.pos += 8;
    return v;
  }
  private utf() {
    const len = this.u16();
    const s = this.buf.toString("utf8", this.pos, this.pos + len);
    this.pos += len;
    return s;
  }
  private utfLong() {
    const len = Number(this.i64());
    const s = this.buf.toString("utf8", this.pos, this.pos + len);
    this.pos += len;
    return s;
  }

  private newHandle(obj: unknown): number {
    this.handles.push(obj);
    return BASE_HANDLE + this.handles.length - 1;
  }
  private setHandle(handle: number, obj: unknown) {
    this.handles[handle - BASE_HANDLE] = obj;
  }
  private getHandle(handle: number): unknown {
    return this.handles[handle - BASE_HANDLE];
  }

  private readStream(): unknown[] {
    const magic = this.u16();
    const version = this.u16();
    if (magic !== 0xaced) {
      throw new Error(`Not a Java serialization stream (magic=0x${magic.toString(16)})`);
    }
    void version;
    const contents: unknown[] = [];
    while (this.pos < this.buf.length) {
      const tc = this.buf.readUInt8(this.pos);
      if (tc === TC_RESET) {
        this.pos++;
        this.handles = [];
        continue;
      }
      const v = this.readContent(false);
      if (v !== BLOCKDATA_MARKER) contents.push(v);
    }
    return contents;
  }

  // Reads one content element. When `blockAllowed` is false at a spot where
  // only objects are expected we still tolerate block data by skipping it.
  private readContent(_blockAllowed: boolean): unknown {
    const tc = this.u8();
    switch (tc) {
      case TC_NULL:
        return null;
      case TC_REFERENCE:
        return this.getHandle(this.i32());
      case TC_STRING: {
        const s = this.utf();
        this.newHandle(s);
        return s;
      }
      case TC_LONGSTRING: {
        const s = this.utfLong();
        this.newHandle(s);
        return s;
      }
      case TC_CLASSDESC:
      case TC_PROXYCLASSDESC:
        this.pos--;
        return this.readClassDesc();
      case TC_OBJECT:
        return this.readNewObject();
      case TC_ARRAY:
        return this.readNewArray();
      case TC_ENUM:
        return this.readNewEnum();
      case TC_CLASS: {
        const cd = this.readClassDesc();
        this.newHandle(cd);
        return cd;
      }
      case TC_BLOCKDATA: {
        const len = this.u8();
        this.pos += len;
        return BLOCKDATA_MARKER;
      }
      case TC_BLOCKDATALONG: {
        const len = this.i32();
        this.pos += len;
        return BLOCKDATA_MARKER;
      }
      case TC_ENDBLOCKDATA:
        return BLOCKDATA_MARKER;
      case TC_EXCEPTION:
        throw new Error("TC_EXCEPTION encountered in stream");
      case TC_RESET:
        this.handles = [];
        return this.readContent(_blockAllowed);
      default:
        throw new Error(
          `Unknown type code 0x${tc.toString(16)} at pos ${this.pos - 1}`
        );
    }
  }

  private readClassDesc(): JavaClassDesc | null {
    const tc = this.u8();
    if (tc === TC_NULL) return null;
    if (tc === TC_REFERENCE) return this.getHandle(this.i32()) as JavaClassDesc;
    if (tc === TC_PROXYCLASSDESC) {
      throw new Error("Proxy class descriptors not supported");
    }
    if (tc !== TC_CLASSDESC) {
      throw new Error(`Expected class desc, got 0x${tc.toString(16)}`);
    }
    const name = this.utf();
    const serialVersionUID = this.i64();
    const desc: JavaClassDesc = {
      name,
      serialVersionUID,
      flags: 0,
      fields: [],
      superClass: null,
      isEnum: false,
    };
    this.newHandle(desc);
    const flags = this.u8();
    desc.flags = flags;
    desc.isEnum = (flags & SC_ENUM) !== 0;
    const fieldCount = this.u16();
    for (let i = 0; i < fieldCount; i++) {
      const typecode = String.fromCharCode(this.u8());
      const fieldName = this.utf();
      let className: string | undefined;
      if (typecode === "[" || typecode === "L") {
        // field type name is a (new)String
        const v = this.readContent(false);
        className = typeof v === "string" ? v : String(v);
      }
      desc.fields.push({ typecode, name: fieldName, className });
    }
    // classAnnotation: skip until TC_ENDBLOCKDATA
    this.skipAnnotation();
    desc.superClass = this.readClassDesc();
    return desc;
  }

  private skipAnnotation() {
    // Reads content entries until an end-of-block marker is hit.
    for (;;) {
      const tc = this.buf.readUInt8(this.pos);
      if (tc === TC_ENDBLOCKDATA) {
        this.pos++;
        return;
      }
      const v = this.readContent(true);
      void v;
    }
  }

  private readNewObject(): JavaObject {
    const classDesc = this.readClassDesc();
    if (!classDesc) throw new Error("null class desc for object");
    const obj: JavaObject = {
      __class: classDesc.name,
      __fields: {},
      __classDesc: classDesc,
    };
    this.newHandle(obj);
    this.readClassData(classDesc, obj);
    return obj;
  }

  private readClassData(classDesc: JavaClassDesc, obj: JavaObject) {
    // Walk hierarchy from most-super to most-derived.
    const chain: JavaClassDesc[] = [];
    let c: JavaClassDesc | null = classDesc;
    while (c) {
      chain.unshift(c);
      c = c.superClass;
    }
    for (const cd of chain) {
      const isSer = (cd.flags & SC_SERIALIZABLE) !== 0;
      const isExt = (cd.flags & SC_EXTERNALIZABLE) !== 0;
      if (isSer) {
        // read declared field values in order
        for (const f of cd.fields) {
          obj.__fields[f.name] = this.readFieldValue(f.typecode);
        }
        if (cd.flags & SC_WRITE_METHOD) {
          this.skipAnnotation();
        }
      } else if (isExt) {
        if (cd.flags & SC_BLOCK_DATA) {
          this.skipAnnotation();
        } else {
          throw new Error(
            `Externalizable without block data not supported: ${cd.name}`
          );
        }
      }
    }
  }

  private readFieldValue(typecode: string): unknown {
    switch (typecode) {
      case "B":
        return this.i8();
      case "C":
        return this.u16();
      case "D":
        return this.f64();
      case "F":
        return this.f32();
      case "I":
        return this.i32();
      case "J":
        return this.i64();
      case "S":
        return this.i16();
      case "Z":
        return this.u8() !== 0;
      case "[":
      case "L":
        return this.readContent(false);
      default:
        throw new Error(`Unknown field typecode ${typecode}`);
    }
  }

  private readNewArray(): JavaArray {
    const classDesc = this.readClassDesc();
    if (!classDesc) throw new Error("null class desc for array");
    const arrType = classDesc.name; // e.g. "[F", "[D", "[I", "[Lfoo;"
    const comp = arrType.charAt(1);
    const arr: JavaArray = { __arrayType: arrType, values: null };
    this.newHandle(arr);
    const size = this.i32();
    switch (comp) {
      case "B": {
        const a = this.buf.subarray(this.pos, this.pos + size);
        this.pos += size;
        arr.values = new Int8Array(a);
        break;
      }
      case "F": {
        const a = new Float32Array(size);
        for (let i = 0; i < size; i++) a[i] = this.f32();
        arr.values = a;
        break;
      }
      case "D": {
        const a = new Float64Array(size);
        for (let i = 0; i < size; i++) a[i] = this.f64();
        arr.values = a;
        break;
      }
      case "I": {
        const a = new Int32Array(size);
        for (let i = 0; i < size; i++) a[i] = this.i32();
        arr.values = a;
        break;
      }
      case "S": {
        const a = new Int16Array(size);
        for (let i = 0; i < size; i++) a[i] = this.i16();
        arr.values = a;
        break;
      }
      case "J": {
        const a: bigint[] = new Array(size);
        for (let i = 0; i < size; i++) a[i] = this.i64();
        arr.values = a;
        break;
      }
      case "Z": {
        const a = new Array<boolean>(size);
        for (let i = 0; i < size; i++) a[i] = this.u8() !== 0;
        arr.values = a;
        break;
      }
      case "C": {
        const a = new Array<number>(size);
        for (let i = 0; i < size; i++) a[i] = this.u16();
        arr.values = a;
        break;
      }
      default: {
        // object array ("[" or "L")
        const a = new Array<unknown>(size);
        for (let i = 0; i < size; i++) a[i] = this.readContent(false);
        arr.values = a;
      }
    }
    return arr;
  }

  private readNewEnum(): JavaEnum {
    const classDesc = this.readClassDesc();
    const en: JavaEnum = { __enum: classDesc?.name ?? "", __constant: "" };
    this.newHandle(en);
    const name = this.readContent(false);
    en.__constant = typeof name === "string" ? name : String(name);
    return en;
  }
}

// ---- helpers for consumers ----

export function isJavaObject(v: unknown): v is JavaObject {
  return typeof v === "object" && v !== null && "__class" in (v as object);
}

export function fieldNum(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  // java.lang.Double/Integer/Float wrapper objects
  if (isJavaObject(v)) {
    const inner = v.__fields["value"];
    if (typeof inner === "number") return inner;
    if (typeof inner === "bigint") return Number(inner);
  }
  return undefined;
}

export function fieldBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (isJavaObject(v)) {
    const inner = v.__fields["value"];
    if (typeof inner === "boolean") return inner;
  }
  return undefined;
}

export function fieldFloatArray(v: unknown): Float32Array | Float64Array | undefined {
  if (v && typeof v === "object" && "__arrayType" in (v as object)) {
    const vals = (v as JavaArray).values;
    if (vals instanceof Float32Array || vals instanceof Float64Array) return vals;
  }
  return undefined;
}

export function collectByClass(roots: unknown[], className: string): JavaObject[] {
  const out: JavaObject[] = [];
  const seen = new Set<unknown>();
  const stack: unknown[] = [...roots];
  while (stack.length) {
    const cur = stack.pop();
    if (cur === null || cur === undefined) continue;
    if (typeof cur !== "object") continue;
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (isJavaObject(cur)) {
      if (cur.__class === className) out.push(cur);
      for (const k in cur.__fields) stack.push(cur.__fields[k]);
    } else if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item);
    } else if ("__arrayType" in (cur as object)) {
      const vals = (cur as JavaArray).values;
      if (Array.isArray(vals)) for (const item of vals) stack.push(item);
    }
  }
  return out;
}
