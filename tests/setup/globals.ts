/**
 * Polyfills for the prototype extensions and globals Obsidian installs at runtime
 * (see `declare global` in node_modules/obsidian/obsidian.d.ts).
 * Add more here when a test hits "x is not a function".
 */

const define = (proto: object, name: string, value: unknown) => {
  if (!(name in proto)) {
    Object.defineProperty(proto, name, { value, configurable: true, writable: true });
  }
};

define(Array.prototype, 'first', function <T>(this: T[]) {
  return this[0];
});
define(Array.prototype, 'last', function <T>(this: T[]) {
  return this[this.length - 1];
});
define(Array.prototype, 'contains', function <T>(this: T[], target: T) {
  return this.includes(target);
});
define(Array.prototype, 'remove', function <T>(this: T[], target: T) {
  const i = this.indexOf(target);
  if (i >= 0) this.splice(i, 1);
});
define(Array.prototype, 'unique', function <T>(this: T[]) {
  return Array.from(new Set(this));
});
define(String.prototype, 'contains', function (this: string, target: string) {
  return this.includes(target);
});

const g = globalThis as any;
g.activeWindow ??= window;
g.activeDocument ??= document;

define(Node.prototype, 'empty', function (this: Node) {
  while (this.firstChild) this.removeChild(this.firstChild);
});
define(Element.prototype, 'addClass', function (this: Element, ...cls: string[]) {
  this.classList.add(...cls);
});
define(Element.prototype, 'removeClass', function (this: Element, ...cls: string[]) {
  this.classList.remove(...cls);
});
define(Element.prototype, 'toggleClass', function (this: Element, cls: string, value: boolean) {
  this.classList.toggle(cls, value);
});
define(Element.prototype, 'hasClass', function (this: Element, cls: string) {
  return this.classList.contains(cls);
});

function createEl(this: Node | void, tag: string, o?: any): HTMLElement {
  const el = document.createElement(tag);
  if (typeof o === 'string') el.className = o;
  else if (o) {
    if (o.cls) el.className = Array.isArray(o.cls) ? o.cls.join(' ') : o.cls;
    if (o.text) el.textContent = o.text;
    if (o.attr) for (const [k, v] of Object.entries(o.attr)) el.setAttribute(k, String(v));
  }
  if (this instanceof Node) this.appendChild(el);
  return el;
}
define(Node.prototype, 'createEl', createEl);
define(Node.prototype, 'createDiv', function (this: Node, o?: any) {
  return createEl.call(this, 'div', o);
});
define(Node.prototype, 'createSpan', function (this: Node, o?: any) {
  return createEl.call(this, 'span', o);
});
g.createEl ??= (tag: string, o?: any) => createEl.call(undefined, tag, o);
g.createDiv ??= (o?: any) => createEl.call(undefined, 'div', o);
g.createSpan ??= (o?: any) => createEl.call(undefined, 'span', o);
