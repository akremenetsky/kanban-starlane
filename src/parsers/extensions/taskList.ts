import { CompileContext, Token } from 'mdast-util-from-markdown';
import { factorySpace } from 'micromark-factory-space';
import { markdownLineEndingOrSpace, markdownSpace } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol/codes.js';
import { types } from 'micromark-util-symbol/types.js';
import { Code, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

const tasklistCheck = { tokenize: tokenizeTasklistCheck };

export const gfmTaskListItem: Extension = {
  text: { [codes.leftSquareBracket]: tasklistCheck },
};

function tokenizeTasklistCheck(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State
): State {
  // An arrow function, to read the tokenizer context (`this`) when the check starts.
  const open = (code: Code): State | void => {
    if (
      // Exit if there’s stuff before.
      this.previous !== codes.eof ||
      // Exit if not in the first content that is the first child of a list
      // item.
      !this._gfmTasklistFirstContentOfListItem
    ) {
      return nok(code);
    }

    effects.enter('taskListCheck');
    effects.enter('taskListCheckMarker');
    effects.consume(code);
    effects.exit('taskListCheckMarker');
    return inside;
  };

  return open;

  function inside(code: Code): State | void {
    if (markdownSpace(code)) {
      effects.enter('taskListCheckValueUnchecked');
      effects.consume(code);
      effects.exit('taskListCheckValueUnchecked');
      return close;
    }

    if (code !== codes.rightSquareBracket) {
      effects.enter('taskListCheckValueChecked');
      effects.consume(code);
      effects.exit('taskListCheckValueChecked');
      return close;
    }

    return nok(code);
  }

  function close(code: Code): State | void {
    if (code === codes.rightSquareBracket) {
      effects.enter('taskListCheckMarker');
      effects.consume(code);
      effects.exit('taskListCheckMarker');
      effects.exit('taskListCheck');
      return effects.check({ tokenize: spaceThenNonSpace }, ok, nok);
    }

    return nok(code);
  }
}

function spaceThenNonSpace(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  // An arrow function, to read the events (`this`) after the whitespace.
  const after = (code: Code): State | void => {
    const tail = this.events[this.events.length - 1];

    return tail &&
      tail[1].type === types.whitespace &&
      code !== codes.eof &&
      !markdownLineEndingOrSpace(code)
      ? ok(code)
      : nok(code);
  };

  return factorySpace(effects, after, types.whitespace);
}

export const gfmTaskListItemFromMarkdown = {
  exit: {
    taskListCheckValueChecked: exitCheck,
    taskListCheckValueUnchecked: exitCheck,
    paragraph: exitParagraphWithTaskListItem,
  },
};

function exitCheck(this: CompileContext, token: Token) {
  // We’re always in a paragraph, in a list item.
  const node = this.stack[this.stack.length - 2];
  if (node.type !== 'listItem') return;
  node.checked = token.type === 'taskListCheckValueChecked';
  node.checkChar = this.sliceSerialize(token);
}

function exitParagraphWithTaskListItem(this: CompileContext, token: Token) {
  const parent = this.stack[this.stack.length - 2];
  const node = this.stack[this.stack.length - 1];

  if (
    parent &&
    parent.type === 'listItem' &&
    typeof parent.checked === 'boolean' &&
    node.type === 'paragraph'
  ) {
    const head = node.children[0];
    const firstParaghraph = parent.children.find((sibling) => sibling.type === 'paragraph');

    if (head && head.type === 'text' && firstParaghraph === node) {
      // Must start with a space or a tab.
      head.value = head.value.slice(1);

      if (head.value.length === 0) {
        node.children.shift();
      } else if (node.position && head.position && typeof head.position.start.offset === 'number') {
        head.position.start.column++;
        head.position.start.offset++;
        node.position.start = Object.assign({}, head.position.start);
      }
    }
  }

  this.exit(token);
}
