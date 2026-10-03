import { Instance } from './instance';

/** An element a picker is attached to. */
export interface FPHTMLElement extends HTMLElement {
  _flatpickr?: Instance;
}

/** The picker's input remembers its original type while flatpickr sets it to text. */
export interface FPInput extends HTMLInputElement {
  _type?: string;
}
