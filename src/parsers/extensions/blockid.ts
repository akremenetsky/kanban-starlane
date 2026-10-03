import {
  CompileContext,
  Extension as FromMarkdownExtension,
  Token,
} from 'mdast-util-from-markdown';
import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { getSelf } from './helpers';
import { BlockIdNode } from './types';

export function blockidExtension(): Extension {
  const name = 'blockid';
  const startMarker = '^';

  function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
    let data = false;
    let startMarkerCursor = 0;

    return start;

    function start(code: Code) {
      if (code !== startMarker.charCodeAt(startMarkerCursor)) return nok(code);

      effects.enter(name);
      effects.enter(`${name}Marker`);

      return consumeStart(code);
    }

    function consumeStart(code: Code) {
      if (startMarkerCursor === startMarker.length) {
        effects.exit(`${name}Marker`);
        return consumeData(code);
      }

      if (code !== startMarker.charCodeAt(startMarkerCursor)) {
        return nok(code);
      }

      effects.consume(code);
      startMarkerCursor++;

      return consumeStart;
    }

    function consumeData(code: Code) {
      effects.enter(`${name}Data`);
      effects.enter(`${name}Target`);
      return consumeTarget(code);
    }

    function consumeTarget(code: Code) {
      if (markdownSpace(code)) {
        return nok(code);
      }

      if (markdownLineEnding(code) || code === null) {
        if (!data) return nok(code);
        effects.exit(`${name}Target`);
        effects.exit(`${name}Data`);
        effects.exit(name);

        return ok(code);
      }

      data = true;
      effects.consume(code);

      return consumeTarget;
    }
  }

  const call = { tokenize: tokenize };

  return {
    text: { [startMarker.charCodeAt(0)]: call },
  };
}

export function blockidFromMarkdown(): FromMarkdownExtension {
  const name = 'blockid';

  function enter(this: CompileContext, token: Token) {
    this.enter({ type: name, value: null } as BlockIdNode, token);
  }

  function exitTarget(this: CompileContext, token: Token) {
    const target = this.sliceSerialize(token);
    const current = getSelf(this.stack) as BlockIdNode;

    current.value = target;
  }

  function exit(this: CompileContext, token: Token) {
    this.exit(token);
  }

  return {
    enter: {
      [name]: enter,
    },
    exit: {
      [`${name}Target`]: exitTarget,
      [name]: exit,
    },
  };
}
