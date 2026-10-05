import {
  CompileContext,
  Extension as FromMarkdownExtension,
  Token,
} from 'mdast-util-from-markdown';
import { markdownLineEndingOrSpace } from 'micromark-util-character';
import { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

import { getSelf } from './helpers';
import { TagNode } from './types';

export function tagExtension(): Extension {
  const name = 'hashtag';
  const hashCharCode = '#'.charCodeAt(0);

  function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
    let data = false;
    let startMarkerCursor = 0;

    // An arrow function, to read the tokenizer context (`this`) when the tag starts.
    const start = (code: Code): State | void => {
      const prev = this.previous;
      // micromark gives line endings and tabs negative codes, so check them before the regex.
      if (
        code !== hashCharCode ||
        (prev !== null && !markdownLineEndingOrSpace(prev) && !/\s/.test(String.fromCharCode(prev)))
      ) {
        return nok(code);
      }

      effects.enter(name);
      effects.enter(`${name}Marker`);

      return consumeStart(code);
    };

    return start;

    function consumeStart(code: Code) {
      if (startMarkerCursor === 1) {
        effects.exit(`${name}Marker`);
        return consumeData(code);
      }

      if (code !== hashCharCode) {
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
      if (
        code === null ||
        markdownLineEndingOrSpace(code) ||
        /[\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~[\]\\\s\n\r]/.test(
          String.fromCharCode(code)
        )
      ) {
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
    text: { [hashCharCode]: call },
  };
}

export function tagFromMarkdown(): FromMarkdownExtension {
  const name = 'hashtag';

  function enterTag(this: CompileContext, token: Token) {
    this.enter({ type: name, value: null }, token);
  }

  function exitTagTarget(this: CompileContext, token: Token) {
    const target = this.sliceSerialize(token);
    const current = getSelf(this.stack) as TagNode;

    current.value = target;
  }

  function exitTag(this: CompileContext, token: Token) {
    this.exit(token);
  }

  return {
    enter: {
      [name]: enterTag,
    },
    exit: {
      [`${name}Target`]: exitTagTarget,
      [name]: exitTag,
    },
  };
}
