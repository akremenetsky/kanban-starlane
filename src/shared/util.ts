const { compare } = new Intl.Collator(undefined, {
  usage: 'sort',
  sensitivity: 'base',
  numeric: true,
});

export const defaultSort = compare;

export class PromiseCapability<T = void> {
  promise: Promise<T>;

  resolve: (data: T) => void;
  reject: (reason: Error) => void;

  settled = false;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (data) => {
        this.settled = true;
        resolve(data);
      };

      this.reject = (reason) => {
        this.settled = true;
        reject(reason);
      };
    });
  }
}

type QAble = () => Promise<unknown>;

export class PromiseQueue {
  queue: Array<QAble> = [];
  isRunning: boolean = false;

  /** `getWin`: the window of the board, so the pauses run on its (unthrottled) timers. */
  constructor(
    public onComplete: () => void,
    private getWin: () => Window
  ) {}

  clear() {
    this.queue.length = 0;
    this.isRunning = false;
  }

  add(item: QAble) {
    this.queue.push(item);

    if (!this.isRunning) {
      void this.run();
    }
  }

  async run() {
    this.isRunning = true;

    const { queue } = this;
    let intervalStart = performance.now();

    while (queue.length) {
      const item = queue.splice(0, 5);

      try {
        await Promise.all(item.map((item) => item()));
      } catch (e) {
        console.error(e);
      }

      if (!this.isRunning) return;

      const now = performance.now();
      if (now - intervalStart > 50) {
        await new Promise((res) => this.getWin().setTimeout(res));
        intervalStart = now;
      }
    }

    this.isRunning = false;
    this.onComplete();
  }
}

const reRegExChar = /[\\^$.*+?()[\]{}|]/g;

const reHasRegExChar = RegExp(reRegExChar.source);

export function escapeRegExpStr(str: string) {
  return str && reHasRegExChar.test(str) ? str.replace(reRegExChar, '\\$&') : str || '';
}

/** True for plain objects (`{}`, `Object.create(null)`), also those made in another window. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (Object.prototype.toString.call(value) !== '[object Object]') return false;
  const ctor = (value as { constructor?: { prototype: unknown } }).constructor;
  if (ctor === undefined) return true;
  const proto = ctor.prototype;
  if (Object.prototype.toString.call(proto) !== '[object Object]') return false;
  return Object.prototype.hasOwnProperty.call(proto, 'isPrototypeOf') as boolean;
}

/** Whatever was thrown, as an Error. */
export function toError(thrown: unknown): Error {
  return thrown instanceof Error ? thrown : new Error(String(thrown));
}
