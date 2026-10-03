import { Image, Link } from 'mdast';
import { CompileContext, Token } from 'mdast-util-from-markdown';

/** Calls `process` on every markdown link and image (embed) node when it is complete. */
export function internalMarkdownLinks(process: (node: Link | Image, isEmbed: boolean) => void) {
  function exitLink(this: CompileContext, token: Token) {
    process(this.stack[this.stack.length - 1] as Link, false);
    this.exit(token);
  }

  function exitImage(this: CompileContext, token: Token) {
    process(this.stack[this.stack.length - 1] as Image, true);
    this.exit(token);
  }

  return {
    exit: {
      link: exitLink,
      image: exitImage,
    },
  };
}
