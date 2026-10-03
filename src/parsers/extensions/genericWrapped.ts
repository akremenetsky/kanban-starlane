import {
  CompileContext,
  Extension as FromMarkdownExtension,
  Token,
} from 'mdast-util-from-markdown';
import { markdownLineEnding, markdownLineEndingOrSpace } from 'micromark-util-character';
import { Code, Effects, Extension, State } from 'micromark-util-types';

import { getSelf } from './helpers';
import { ValueNode, WrappedName } from './types';

export function genericWrappedExtension(
  name: WrappedName,
  startMarker: string,
  endMarker: string
): Extension {
  function tokenize(effects: Effects, ok: State, nok: State): State {
    let data = false;
    let startMarkerCursor = 0;
    let endMarkerCursor = 0;

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
      if (markdownLineEnding(code) || code === null) {
        return nok(code);
      }

      effects.enter(`${name}Data`);
      effects.enter(`${name}Target`);
      return consumeTarget(code);
    }

    function consumeTarget(code: Code) {
      if (code === endMarker.charCodeAt(endMarkerCursor)) {
        if (!data) return nok(code);
        effects.exit(`${name}Target`);
        effects.exit(`${name}Data`);
        effects.enter(`${name}Marker`);
        return consumeEnd(code);
      }

      if (markdownLineEnding(code) || code === null) {
        return nok(code);
      }

      if (!markdownLineEndingOrSpace(code)) {
        data = true;
      }

      effects.consume(code);

      return consumeTarget;
    }

    function consumeEnd(code: Code) {
      if (endMarkerCursor === endMarker.length) {
        effects.exit(`${name}Marker`);
        effects.exit(name);
        return ok(code);
      }

      if (code !== endMarker.charCodeAt(endMarkerCursor)) {
        return nok(code);
      }

      effects.consume(code);
      endMarkerCursor++;

      return consumeEnd;
    }
  }

  const call = { tokenize: tokenize };

  return {
    text: { [startMarker.charCodeAt(0)]: call },
  };
}

export function genericWrappedFromMarkdown<N extends ValueNode = ValueNode>(
  name: WrappedName,
  process?: (str: string, curr: N) => void
): FromMarkdownExtension {
  function enterWrapped(this: CompileContext, token: Token) {
    this.enter({ type: name, value: null } as ValueNode, token);
  }

  function exitWrappedTarget(this: CompileContext, token: Token) {
    const target = this.sliceSerialize(token);
    const current = getSelf(this.stack) as N;

    current.value = target;

    if (process) {
      process(target, current);
    }
  }

  function exitWrapped(this: CompileContext, token: Token) {
    this.exit(token);
  }

  return {
    enter: {
      [name]: enterWrapped,
    },
    exit: {
      [`${name}Target`]: exitWrappedTarget,
      [name]: exitWrapped,
    },
  };
}
