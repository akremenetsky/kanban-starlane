import { Keymap, Menu } from 'obsidian';

import { KanbanView } from './KanbanView';

export function applyCheckboxIndexes(dom: HTMLElement) {
  const checkboxes = dom.querySelectorAll('.task-list-item-checkbox');

  checkboxes.forEach((el, i) => {
    (el as HTMLElement).dataset.checkboxIndex = i.toString();
  });
}

export function bindMarkdownEvents(view: KanbanView) {
  const { contentEl, app } = view;

  const parseLink = (el: HTMLElement) => {
    const href = el.getAttr('data-href') || el.getAttr('href');
    if (!href) return null;

    return {
      href,
      displayText: el.getText().trim(),
    };
  };

  const onLinkClick = (evt: MouseEvent, targetEl: HTMLElement) => {
    if (evt.button !== 0 && evt.button !== 1) return;

    const link = parseLink(targetEl);
    if (!link) return;

    evt.preventDefault();
    void app.workspace.openLinkText(link.href, view.file.path, Keymap.isModEvent(evt));
  };

  contentEl.on('click', 'a.internal-link', onLinkClick);
  contentEl.on('auxclick', 'a.internal-link', onLinkClick);
  contentEl.on('dragstart', 'a.internal-link', (evt: DragEvent) => {
    evt.preventDefault();
  });
  contentEl.on('contextmenu', 'a.internal-link', (evt: PointerEvent, targetEl: HTMLElement) => {
    const link = parseLink(targetEl);
    if (!link) return;

    const menu = new Menu();
    menu.addSections(['title', 'open', 'action', 'view', 'info', '', 'danger']);
    app.workspace.handleLinkContextMenu(menu, link.href, view.file.path);
    menu.showAtMouseEvent(evt);
  });
  contentEl.on('mouseover', 'a.internal-link', (evt: MouseEvent, targetEl: HTMLElement) => {
    const link = parseLink(targetEl);
    if (!link) return;
    app.workspace.trigger('hover-link', {
      event: evt,
      source: 'preview',
      hoverParent: view,
      targetEl,
      linktext: link.href,
      sourcePath: view.file.path,
    });
  });
  contentEl.on('click', 'a.external-link', (evt: MouseEvent, targetEl: HTMLElement) => {
    const link = parseLink(targetEl);
    if (!link) return;

    evt.preventDefault();

    if (!link.href || link.href.contains(' ')) return;
    try {
      new URL(link.href);
    } catch {
      return;
    }

    const paneType = Keymap.isModEvent(evt);
    const clickTarget = typeof paneType === 'boolean' ? '' : paneType;
    window.open(link.href, clickTarget);
  });
  contentEl.on('contextmenu', 'a.external-link', (evt: PointerEvent, targetEl: HTMLElement) => {
    const link = parseLink(targetEl);
    if (!link) return;

    const menu = new Menu();
    menu.addSections([
      'title',
      'open',
      'selection',
      'clipboard',
      'action',
      'view',
      'info',
      '',
      'danger',
    ]);
    app.workspace.handleExternalLinkContextMenu(menu, link.href);
    menu.showAtMouseEvent(evt);
  });
  contentEl.on('click', 'a.tag', (evt: MouseEvent, targetEl: HTMLElement) => {
    if (evt.button !== 0) return;

    const tag = targetEl.getText();
    const searchPlugin = app.internalPlugins.getPluginById('global-search');
    const stateManager = view.plugin.getStateManager(view.file);
    const tagAction = stateManager.getSetting('tag-action');

    if (tagAction === 'kanban') {
      view.emitter.emit('hotkey', { commandId: 'editor:open-search', data: tag });
    } else if (searchPlugin) {
      searchPlugin.instance.openGlobalSearch(`tag:${tag}`);
    }
  });
}
