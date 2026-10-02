/**
 * Minimal fake of the `obsidian` module for unit tests (aliased in vitest.config.mts).
 *
 * Only what the code under test touches is implemented. UI classes are inert stubs so
 * that modules which `extends` them can be imported. Behaviour that matters for the
 * board format (moment, YAML) uses libraries that behave like the ones Obsidian bundles.
 */
import momentLib from 'moment';
import YAML from 'yaml';

export const moment = momentLib;

export function parseYaml(text: string): any {
  return YAML.parse(text);
}

export function stringifyYaml(obj: any): string {
  return YAML.stringify(obj, { lineWidth: 0 });
}

export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  timeout = 0,
  _resetTimer = false
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), timeout);
    return wrapped;
  };
  (wrapped as any).cancel = () => {
    if (timer) clearTimeout(timer);
    return wrapped;
  };
  (wrapped as any).run = () => fn();
  return wrapped as any;
}

export function getLinkpath(linktext: string): string {
  return parseLinktext(linktext).path;
}

export function parseLinktext(linktext: string): { path: string; subpath: string } {
  const i = linktext.search(/[#^]/);
  if (i < 0) return { path: linktext, subpath: '' };
  return { path: linktext.slice(0, i), subpath: linktext.slice(i) };
}

export function htmlToMarkdown(html: string): string {
  return html;
}

export function setIcon(_el: HTMLElement, _icon: string) {}

export const Platform = {
  isDesktop: true,
  isDesktopApp: true,
  isMobile: false,
  isMobileApp: false,
  isPhone: false,
  isTablet: false,
  isMacOS: false,
  isWin: false,
  isLinux: true,
};

export const Keymap = {
  isModEvent: () => false,
  isModifier: () => false,
};

export abstract class TAbstractFile {
  path = '';
  name = '';
  parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {
  basename = '';
  extension = 'md';
  stat = { ctime: 0, mtime: 0, size: 0 };

  constructor(path = '') {
    super();
    this.path = path;
    this.name = path.split('/').pop() ?? '';
    this.basename = this.name.replace(/\.[^.]+$/, '');
    this.extension = this.name.includes('.') ? this.name.split('.').pop()! : '';
  }
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
}

export class Component {
  _children: Component[] = [];
  load() {
    this.onload();
  }
  onload() {}
  unload() {
    this.onunload();
  }
  onunload() {}
  addChild<T extends Component>(c: T): T {
    this._children.push(c);
    c.load();
    return c;
  }
  removeChild<T extends Component>(c: T): T {
    this._children = this._children.filter((x) => x !== c);
    c.unload();
    return c;
  }
  register(_cb: () => any) {}
  registerEvent(_ref: any) {}
  registerDomEvent(..._args: any[]) {}
  registerInterval(id: number) {
    return id;
  }
}

class Stub {
  constructor(..._args: any[]) {}
}

export class App extends Stub {}
export class Vault extends Stub {}
export class Plugin extends Component {
  app: any;
  constructor(app?: any, _manifest?: any) {
    super();
    this.app = app;
  }
}
export class Modal extends Stub {}
export class PluginSettingTab extends Stub {}
export class Setting extends Stub {}
export class Menu extends Stub {}
export class Notice extends Stub {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class EditorSuggest<T> extends Stub {}
export class MarkdownView extends Stub {}
export class WorkspaceLeaf extends Stub {}
export class HoverPopover extends Stub {}
export class ItemView extends Component {}
export class TextFileView extends Component {}
export class DropdownComponent extends Stub {}
export class ToggleComponent extends Stub {}

export const MarkdownRenderer = {
  render: async () => {},
  renderMarkdown: async () => {},
};
