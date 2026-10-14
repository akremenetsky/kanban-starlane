import { AbstractInputSuggest, App } from 'obsidian';
import { useEffect, useRef } from 'preact/compat';
import { t } from 'src/lang/helpers';
import { BoardFilter, TagCount, addFilterTag } from 'src/state/boardFilter';

import { Icon } from './Icon/Icon';
import { c } from './helpers';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  color?: string;
}

/** Suggestions of an input in the filter bar; `getOptions` is read on every keystroke. */
class FilterSuggest extends AbstractInputSuggest<FilterOption> {
  constructor(
    app: App,
    inputEl: HTMLInputElement,
    private getOptions: () => FilterOption[],
    onPick: (option: FilterOption) => void
  ) {
    super(app, inputEl);
    // Show every tag of the board, not only the first 100.
    this.limit = 0;
    this.onSelect((option) => {
      onPick(option);
      this.setValue('');
      this.close();
    });
  }

  getSuggestions(query: string) {
    const q = query.trim().toLocaleLowerCase().replace(/^#/, '');
    return this.getOptions().filter((o) =>
      o.label.toLocaleLowerCase().replace(/^#/, '').includes(q)
    );
  }

  renderSuggestion(option: FilterOption, el: HTMLElement) {
    el.addClass(c('filter-suggestion'));
    if (option.color) {
      el.createSpan({ cls: c('filter-board-dot') }).setCssStyles({ backgroundColor: option.color });
    }
    el.createSpan({ cls: c('filter-suggestion-label'), text: option.label });
    if (option.count !== undefined) {
      el.createSpan({ cls: c('filter-suggestion-count'), text: String(option.count) });
    }
  }
}

interface FilterInputProps {
  app: App;
  placeholder: string;
  options: FilterOption[];
  onPick: (option: FilterOption) => void;
  /** Backspace in the empty input removes the last chip of this group. */
  onRemoveLast: () => void;
  onEscape: () => void;
  /** Changing it focuses the input and opens its suggestions. */
  focusKey?: number;
  className: string;
}

function FilterInput({
  app,
  placeholder,
  options,
  onPick,
  onRemoveLast,
  onEscape,
  focusKey,
  className,
}: FilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef(options);
  const onPickRef = useRef(onPick);
  optionsRef.current = options;
  onPickRef.current = onPick;

  useEffect(() => {
    const suggest = new FilterSuggest(
      app,
      inputRef.current,
      () => optionsRef.current,
      (option) => onPickRef.current(option)
    );
    return () => suggest.close();
  }, [app]);

  useEffect(() => {
    if (!focusKey) return;
    const input = inputRef.current;
    input?.focus();
    input?.dispatchEvent(new Event('input'));
  }, [focusKey]);

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      placeholder={placeholder}
      // The suggestions open on input; a click into the already focused field should too.
      onClick={(e) => (e.target as HTMLInputElement).dispatchEvent(new Event('input'))}
      onKeyDown={(e) => {
        const input = e.target as HTMLInputElement;
        if (input.value) return;
        if (e.key === 'Backspace') onRemoveLast();
        else if (e.key === 'Escape') onEscape();
      }}
    />
  );
}

function Chip({ label, color, onRemove }: { label: string; color?: string; onRemove: () => void }) {
  return (
    <span className={c('filter-chip')}>
      {color && <span className={c('filter-board-dot')} style={{ backgroundColor: color }} />}
      <span className={c('filter-chip-label')}>{label}</span>
      <a
        className={`${c('filter-chip-remove')} clickable-icon`}
        aria-label={t('Remove')}
        onClick={onRemove}
      >
        <Icon name="lucide-x" />
      </a>
    </span>
  );
}

export interface FilterBarProps {
  app: App;
  filter: BoardFilter;
  setFilter: (filter: BoardFilter) => void;
  tags: TagCount[];
  /** Boards cards can come from; the board group is shown only when there are several. */
  boards: FilterOption[];
  focusKey: number;
  onClose: () => void;
}

/** The tag/board filter row under the board header. */
export function FilterBar({
  app,
  filter,
  setFilter,
  tags,
  boards,
  focusKey,
  onClose,
}: FilterBarProps) {
  const selectedTags = new Set(filter.tags.map((tag) => tag.toLocaleLowerCase()));
  const tagOptions = tags
    .filter((tag) => !selectedTags.has(tag.tag.toLocaleLowerCase()))
    .map((tag) => ({ value: tag.tag, label: tag.tag, count: tag.count }));
  const boardOptions = boards.filter((b) => !filter.boards.includes(b.value));
  const showBoards = boards.length > 1;
  const escape = () => {
    if (!filter.tags.length && !filter.boards.length) onClose();
  };

  return (
    <div className={c('filter-bar')}>
      <Icon name="lucide-filter" className={c('filter-bar-icon')} />
      <div className={c('filter-group')}>
        {filter.tags.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            onRemove={() => setFilter({ ...filter, tags: filter.tags.filter((t) => t !== tag) })}
          />
        ))}
        <FilterInput
          app={app}
          className={c('filter-input-tags')}
          placeholder={t('Filter by tag...')}
          options={tagOptions}
          onPick={(option) => setFilter(addFilterTag(filter, option.value))}
          onRemoveLast={() => setFilter({ ...filter, tags: filter.tags.slice(0, -1) })}
          onEscape={escape}
          focusKey={focusKey}
        />
      </div>
      {showBoards && (
        <div className={c('filter-group')}>
          {filter.boards.map((path) => {
            const board = boards.find((b) => b.value === path);
            return (
              <Chip
                key={path}
                label={board?.label ?? path}
                color={board?.color}
                onRemove={() =>
                  setFilter({ ...filter, boards: filter.boards.filter((b) => b !== path) })
                }
              />
            );
          })}
          <FilterInput
            app={app}
            className={c('filter-input-boards')}
            placeholder={t('Filter by board...')}
            options={boardOptions}
            onPick={(option) => setFilter({ ...filter, boards: [...filter.boards, option.value] })}
            onRemoveLast={() => setFilter({ ...filter, boards: filter.boards.slice(0, -1) })}
            onEscape={escape}
          />
        </div>
      )}
      <a
        className={`${c('filter-clear')} clickable-icon`}
        aria-label={t('Clear filter')}
        onClick={onClose}
      >
        <Icon name="lucide-x" />
      </a>
    </div>
  );
}
