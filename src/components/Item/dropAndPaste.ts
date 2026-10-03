import { FileWithPath, fromEvent } from 'file-selector';
import { Platform, TFile, TFolder, htmlToMarkdown, moment, parseLinktext } from 'obsidian';
import { StateManager } from 'src/state/StateManager';

export function linkTo(
  stateManager: StateManager,
  file: TFile,
  sourcePath: string,
  subpath?: string
) {
  // Generate a link relative to this Kanban board, respecting user link type preferences
  return stateManager.app.fileManager.generateMarkdownLink(file, sourcePath, subpath);
}

export function getMarkdown(html: string) {
  return htmlToMarkdown(html);
}

export function fixLinks(text: string) {
  // Internal links from e.g. dataview plugin incorrectly begin with `app://obsidian.md/`, and
  // we also want to remove bullet points and task markers from text and markdown
  return text.replace(/^\[(.*)\]\(app:\/\/obsidian.md\/(.*)\)$/, '[$1]($2)');
}

export function getFileListFromClipboard(win: Window & typeof window) {
  const clipboard = win.require('electron').remote.clipboard;

  if (process.platform === 'darwin') {
    // https://github.com/electron/electron/issues/9035#issuecomment-359554116
    if (clipboard.has('NSFilenamesPboardType')) {
      return (
        (clipboard.read('NSFilenamesPboardType') as string)
          .match(/<string>.*<\/string>/g)
          ?.map((item) => item.replace(/<string>|<\/string>/g, '')) || []
      );
    } else {
      const clipboardImage = clipboard.readImage('clipboard');
      if (!clipboardImage.isEmpty()) {
        const png = clipboardImage.toPNG();
        const fileInfo: FileData = {
          buffer: png,
          mimeType: 'image/png',
          originalName: `Pasted image ${moment().format('YYYYMMDDHHmmss')}.png`,
        };
        return [fileInfo];
      } else {
        return [(clipboard.read('public.file-url') as string).replace('file://', '')].filter(
          (item) => item
        );
      }
    }
  } else {
    // https://github.com/electron/electron/issues/9035#issuecomment-536135202
    // https://docs.microsoft.com/en-us/windows/win32/shell/clipboard#cf_hdrop
    // https://www.codeproject.com/Reference/1091137/Windows-Clipboard-Formats
    if (clipboard.has('CF_HDROP')) {
      const rawFilePathStr = clipboard.read('CF_HDROP') || '';
      let formatFilePathStr = [...rawFilePathStr]
        .filter((_, index) => rawFilePathStr.charCodeAt(index) !== 0)
        .join('')
        .replace(/\\/g, '\\');

      const drivePrefix = formatFilePathStr.match(/[a-zA-Z]:\\/);

      if (drivePrefix) {
        const drivePrefixIndex = formatFilePathStr.indexOf(drivePrefix[0]);
        if (drivePrefixIndex !== 0) {
          formatFilePathStr = formatFilePathStr.slice(drivePrefixIndex);
        }
        return formatFilePathStr
          .split(drivePrefix[0])
          .filter((item) => item)
          .map((item) => drivePrefix + item);
      }
    } else {
      const clipboardImage = clipboard.readImage('clipboard');
      if (!clipboardImage.isEmpty()) {
        const png = clipboardImage.toPNG();
        const fileInfo: FileData = {
          buffer: png,
          mimeType: 'image/png',
          originalName: `Pasted image ${moment().format('YYYYMMDDHHmmss')}.png`,
        };
        return [fileInfo];
      } else {
        return [
          (clipboard.readBuffer('FileNameW').toString('ucs2') as string).replace(
            RegExp(String.fromCharCode(0), 'g'),
            ''
          ),
        ].filter((item) => item);
      }
    }
  }

  return null;
}

function getFileFromPath(file: string) {
  return file.split('\\').pop().split('/').pop();
}

async function linkFromBuffer(
  stateManager: StateManager,
  fileName: string,
  ext: string,
  buffer: ArrayBuffer
) {
  const path = (await stateManager.app.vault.getAvailablePathForAttachments(
    fileName,
    ext,
    stateManager.file
  ));

  const newFile = await stateManager.app.vault.createBinary(path, buffer);

  return linkTo(stateManager, newFile, stateManager.file.path);
}

async function handleElectronPaste(stateManager: StateManager, win: Window & typeof window) {
  const list = getFileListFromClipboard(win);

  if (!list || list.length === 0) return null;

  const fs = win.require('fs/promises');
  const nPath = win.require('path');

  return (
    await Promise.all(
      list.map(async (file) => {
        if (typeof file === 'string') {
          const fileStr = getFileFromPath(file);

          const splitFile = fileStr.split('.');
          const ext = splitFile.pop();
          const fileName = splitFile.join('.');

          const path = (await stateManager.app.vault.getAvailablePathForAttachments(
            fileName,
            ext,
            stateManager.file
          ));

          const basePath = stateManager.app.vault.adapter.basePath;

          await fs.copyFile(file, nPath.join(basePath, path));

          // Wait for Obsidian to update
          await new Promise((resolve) => win.setTimeout(resolve, 50));

          const newFile = stateManager.app.vault.getAbstractFileByPath(path) as TFile;

          return linkTo(stateManager, newFile, stateManager.file.path);
        } else {
          const splitFile = file.originalName.split('.');
          const ext = splitFile.pop();
          const fileName = splitFile.join('.');

          return await linkFromBuffer(stateManager, fileName, ext, file.buffer);
        }
      })
    )
  ).filter((file) => file);
}

function handleFiles(stateManager: StateManager, files: FileWithPath[], isPaste?: boolean) {
  return Promise.all(
    files.map((file) => {
      const splitFileName = file.name.split('.');

      let ext = splitFileName.pop();
      let fileName = splitFileName.join('.');

      if (isPaste) {
        switch (file.type) {
          case 'text/jpg':
            ext = 'jpg';
            break;
          case 'text/jpeg':
            ext = 'jpeg';
            break;
          case 'text/png':
            ext = 'png';
            break;
        }

        fileName = 'Pasted image ' + moment().format('YYYYMMDDHHmmss');
      }

      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const path = (await stateManager.app.vault.getAvailablePathForAttachments(
              fileName,
              ext,
              stateManager.file
            ));
            const newFile = await stateManager.app.vault.createBinary(
              path,
              e.target.result as ArrayBuffer
            );

            resolve(linkTo(stateManager, newFile, stateManager.file.path));
          } catch (e) {
            console.error(e);
            reject(e);
          }
        };
        reader.readAsArrayBuffer(file);
      });
    })
  );
}

async function handleNullDraggable(
  stateManager: StateManager,
  e: DragEvent | ClipboardEvent,
  win: Window & typeof window
) {
  const isClipboardEvent = (e as DragEvent).view ? false : true;
  const forcePlaintext = isClipboardEvent ? stateManager.getAView().isShiftPressed : false;
  const transfer = isClipboardEvent
    ? (e as ClipboardEvent).clipboardData
    : (e as DragEvent).dataTransfer;
  const clipboard =
    isClipboardEvent && Platform.isDesktopApp ? win.require('electron').remote.clipboard : null;
  const formats = clipboard ? clipboard.availableFormats() : [];

  if (!isClipboardEvent) {
    const files = await fromEvent(e);
    if (files.length) {
      return await handleFiles(stateManager, files as FileWithPath[]);
    }
  } else if (isClipboardEvent && !forcePlaintext && !formats.includes('text/rtf')) {
    if (Platform.isDesktopApp) {
      const links = await handleElectronPaste(stateManager, win);

      if (links?.length) {
        return links;
      }
    }

    const files: File[] = [];
    const items = (e as ClipboardEvent).clipboardData.items;

    for (const index in items) {
      const item = items[index];
      if (item.kind === 'file') {
        files.push(item.getAsFile());
      }
    }

    if (files.length) {
      return await handleFiles(stateManager, files, true);
    }
  }

  const html = transfer.getData('text/html');
  const plain = transfer.getData('text/plain');
  const uris = transfer.getData('text/uri-list');

  const text = forcePlaintext ? plain || html : getMarkdown(html);

  return [fixLinks(text || uris || plain || html || '').trim()];
}

export async function handleDragOrPaste(
  stateManager: StateManager,
  e: DragEvent | ClipboardEvent,
  win: Window & typeof window
): Promise<string[]> {
  const draggable = stateManager.app.dragManager.draggable;
  const transfer = (e as DragEvent).view
    ? (e as DragEvent).dataTransfer
    : (e as ClipboardEvent).clipboardData;

  switch (draggable?.type) {
    case 'file':
      if (!(draggable.file instanceof TFile)) return [];
      return [linkTo(stateManager, draggable.file, stateManager.file.path)];
    case 'files':
      return draggable.files.map((f) => linkTo(stateManager, f, stateManager.file.path));
    case 'folder': {
      if (!(draggable.file instanceof TFolder)) return [];
      return draggable.file.children
        .filter((f): f is TFile => f instanceof TFile)
        .map((f) => linkTo(stateManager, f, stateManager.file.path));
    }
    case 'link': {
      let link =
        draggable.file instanceof TFile
          ? linkTo(stateManager, draggable.file, parseLinktext(draggable.linktext).subpath)
          : `[[${draggable.linktext}]]`;
      const alias = new DOMParser().parseFromString(transfer.getData('text/html'), 'text/html')
        .documentElement.textContent; // Get raw text
      link = link.replace(/]]$/, `|${alias}]]`).replace(/^\[[^\]].+]\(/, `[${alias}](`);
      return [link];
    }
    default: {
      return await handleNullDraggable(stateManager, e, win);
    }
  }
}

interface FileData {
  buffer: ArrayBuffer;
  mimeType: string;
  originalName: string;
}
