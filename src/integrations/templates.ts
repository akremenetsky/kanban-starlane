import { App, MarkdownView, Plugin, TFile } from 'obsidian';
import { StateManager } from 'src/state/StateManager';

export const templaterDetectRegex = /<%/;

export async function applyTemplate(stateManager: StateManager, templatePath?: string) {
  const templateFile = templatePath
    ? stateManager.app.vault.getAbstractFileByPath(templatePath)
    : null;

  if (templateFile && templateFile instanceof TFile) {
    const activeView = stateManager.app.workspace.getActiveViewOfType(MarkdownView);

    try {
      // Force the view to source mode, if needed
      if (activeView?.getMode() !== 'source') {
        await activeView.setState(
          {
            ...activeView.getState(),
            mode: 'source',
          },
          { history: false }
        );
      }

      const { templatesEnabled, templaterEnabled, templatesPlugin, templaterPlugin } =
        getTemplatePlugins(stateManager.app);

      const templateContent = await stateManager.app.vault.read(templateFile);

      // If both plugins are enabled, attempt to detect templater first
      if (templatesEnabled && templaterEnabled) {
        if (templaterDetectRegex.test(templateContent)) {
          return await templaterPlugin.append_template_to_active_file(templateFile);
        }

        return await templatesPlugin.instance.insertTemplate?.(templateFile);
      }

      if (templatesEnabled) {
        return await templatesPlugin.instance.insertTemplate?.(templateFile);
      }

      if (templaterEnabled) {
        return await templaterPlugin.append_template_to_active_file(templateFile);
      }

      // No template plugins enabled so we can just append the template to the doc
      await stateManager.app.vault.modify(
        stateManager.app.workspace.getActiveFile(),
        templateContent
      );
    } catch (e) {
      console.error(e);
      stateManager.setError(e);
    }
  }
}

interface TemplaterPlugin extends Plugin {
  settings?: { empty_file_template?: string; template_folder?: string };
  templater?: { append_template_to_active_file(file: TFile): Promise<void> };
}

export function getTemplatePlugins(app: App) {
  const templatesPlugin = app.internalPlugins.plugins['templates'];
  const templatesEnabled = !!templatesPlugin?.enabled;
  const templaterPlugin = app.plugins.plugins['templater-obsidian'] as TemplaterPlugin | undefined;
  const templaterEnabled = app.plugins.enabledPlugins.has('templater-obsidian');
  const templaterEmptyFileTemplate = templaterPlugin?.settings?.empty_file_template;

  const templateFolder = templatesEnabled
    ? (templatesPlugin.instance.options?.folder as string | undefined)
    : templaterPlugin
      ? templaterPlugin.settings?.template_folder
      : undefined;

  return {
    templatesPlugin,
    templatesEnabled,
    templaterPlugin: templaterPlugin?.templater,
    templaterEnabled,
    templaterEmptyFileTemplate,
    templateFolder,
  };
}
