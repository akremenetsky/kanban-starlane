import update from 'immutability-helper';
import { Modal, Setting, TFile } from 'obsidian';
import { c } from 'src/components/helpers';
import { t } from 'src/lang/helpers';
import { LinkedLaneSource } from 'src/model/types';
import { hasFrontmatterKey } from 'src/parsers/boardDetection';
import { StateManager } from 'src/state/StateManager';
import { readLinkedLanes, setLaneSources } from 'src/state/linkedLanes';
import { KanbanView } from 'src/view/KanbanView';

/** Choose which lanes of other boards an own lane shows. */
export class LinkLanesModal extends Modal {
  private boardPath = '';
  private lanePath = '';

  constructor(
    private view: KanbanView,
    private stateManager: StateManager,
    private laneTitle: string
  ) {
    super(view.app);
  }

  onOpen() {
    this.modalEl.addClass(c('link-lanes-modal'));
    this.titleEl.setText(t('Show cards from other boards'));
    this.render();
  }

  onClose() {
    this.contentEl.empty();
  }

  private get sources(): LinkedLaneSource[] {
    const linked = readLinkedLanes(this.stateManager.state.data.settings);
    return linked[this.laneTitle]?.sources ?? [];
  }

  private save(sources: LinkedLaneSource[]) {
    const linked = readLinkedLanes(this.stateManager.state.data.settings);
    const next = setLaneSources(linked, this.laneTitle, sources);

    this.stateManager.setState((board) =>
      update(board, {
        data: {
          settings: Object.keys(next).length
            ? { 'linked-lanes': { $set: next } }
            : { $unset: ['linked-lanes'] },
        },
      })
    );
    this.render();
  }

  private boardFiles() {
    return this.app.vault
      .getMarkdownFiles()
      .filter((f) => f !== this.stateManager.file && hasFrontmatterKey(this.app, f))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  private async laneTitles(path: string): Promise<string[]> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return [];

    const stateManager = await this.view.plugin.retainBoard(file);
    try {
      return stateManager.state.children.map((l) => l.data.title);
    } finally {
      stateManager.release();
    }
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('p', {
      text: t(
        'Cards of the chosen lists appear in this list. They stay in their own board: moving them here moves them there.'
      ),
    });

    const sources = this.sources;
    if (!sources.length) {
      contentEl.createEl('p', { text: t('No linked lists yet.'), cls: 'setting-item-description' });
    }

    sources.forEach((source, i) => {
      new Setting(contentEl)
        .setName(`${source.file.replace(/\.md$/, '')} → ${source.lane}`)
        .addExtraButton((b) =>
          b
            .setIcon('lucide-trash-2')
            .setTooltip(t('Remove'))
            .onClick(() => this.save(sources.filter((_, j) => j !== i)))
        );
    });

    const addSetting = new Setting(contentEl).setName(t('Add a list'));

    addSetting.addDropdown((dropdown) => {
      dropdown.addOption('', t('Board'));
      this.boardFiles().forEach((f) => dropdown.addOption(f.path, f.path.replace(/\.md$/, '')));
      dropdown.setValue(this.boardPath);
      dropdown.onChange((value) => {
        this.boardPath = value;
        this.lanePath = '';
        this.render();
      });
    });

    addSetting.addDropdown((dropdown) => {
      dropdown.addOption('', t('List'));
      dropdown.setDisabled(!this.boardPath);
      if (this.boardPath) {
        void this.laneTitles(this.boardPath).then((titles) => {
          titles.forEach((title) => dropdown.addOption(title, title));
          dropdown.setValue(this.lanePath);
        });
      }
      dropdown.onChange((value) => {
        this.lanePath = value;
      });
    });

    addSetting.addButton((b) =>
      b
        .setButtonText(t('Add list'))
        .setCta()
        .onClick(() => {
          if (!this.boardPath || !this.lanePath) return;
          const exists = sources.some((s) => s.file === this.boardPath && s.lane === this.lanePath);
          if (!exists) {
            const next = [...sources, { file: this.boardPath, lane: this.lanePath }];
            this.boardPath = '';
            this.lanePath = '';
            this.save(next);
          }
        })
    );
  }
}
