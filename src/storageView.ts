import { writeFile } from "fs/promises";
import path from "path";
import { CancellationToken, Event, EventEmitter, ExtensionContext, TextDocumentContentProvider, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, commands, window, workspace } from "vscode";
import { getIcon } from "./utils";

export default function initStorageView(context: ExtensionContext) {
  const storageTreeDataProvider = new StorageTreeDataProvider();
  const espruinoStorageDocumentContentProvider = new EspruinoStorageDocumentContentProvider();
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.refresh', storageTreeDataProvider.refresh));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.delete', storageTreeDataProvider.delete));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.deleteAll', storageTreeDataProvider.delete));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.downloadFile', storageTreeDataProvider.downloadAndSaveFile));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.uploadFile', storageTreeDataProvider.uploadFile));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.showHiddenFiles', storageTreeDataProvider.toggleHiddenFiles));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.hideHiddenFiles', storageTreeDataProvider.toggleHiddenFiles));
  context.subscriptions.push(workspace.registerTextDocumentContentProvider("espruino", espruinoStorageDocumentContentProvider));

  return async () => {
    const storageTree = window.createTreeView('espruinovscode-storage', {
      treeDataProvider: storageTreeDataProvider,
      dragAndDropController: {
        dropMimeTypes: ['text/uri-list'],
        dragMimeTypes: [],
        async handleDrop(target, dataTransfer, token) {
          console.log(dataTransfer);
          const files = (await dataTransfer.get('text/uri-list')?.asString())?.split('\r\n');
          if (!files) return;
          storageTreeDataProvider.upload(files.map(f => Uri.parse(f)));
        },
      }
    });

    await storageTreeDataProvider.refresh();
    return () => storageTree.dispose();
  };
}

interface StorageFile {
  readonly name: string;
  readonly uri: Uri;
  readonly type: 'StorageFile' | 'file';
  readonly size: number;
}

class StorageTreeDataProvider implements TreeDataProvider<StorageFile> {
  private _showHiddenFiles = false;
  private _files: StorageFile[] = [];
  private _onDidChangeTreeData: EventEmitter<any> = new EventEmitter<any>();
  readonly onDidChangeTreeData: Event<any> = this._onDidChangeTreeData.event;
  async getChildren(file?: StorageFile) {
    if (file) return [];

    if (this._showHiddenFiles) {
      return this._files;
    } else {
      return this._files.filter(f => !f.name.startsWith('.'));
    }
  }

  getTreeItem(file: StorageFile) {
    const treeItem = new TreeItem(file.name, TreeItemCollapsibleState.None);

    const icon = file.type === 'StorageFile' ? 'files' : 'file';
    treeItem.iconPath = getIcon(icon);

    treeItem.tooltip = file.size + ' bytes';

    treeItem.command = { command: 'vscode.open', title: "Open", arguments: [file.uri] };

    return treeItem;
  }

  refresh = async () => {
    const files = await executeExpression<string[]>(`require('Storage').list()`);
    this._files = [];

    let skipName = '';
    for (let name of files.sort()) {
      if (name === skipName) {
        skipName = name.replace(/(.)$/, v => String.fromCharCode(v.charCodeAt(0) + 1));
      } else if (name.endsWith('\x01')) {
        name = name.slice(0, name.length - 1);
        this._files.push({
          name,
          uri: Uri.parse(`espruino:${name}`),
          type: 'StorageFile',
          size: await executeExpression<number>(`require('Storage').open(${JSON.stringify(name)}, 'r').getLength()`)
        });
        skipName = `${name}\x01`;
      } else {
        this._files.push({
          name,
          uri: Uri.parse(`espruino:${name}`),
          type: 'file',
          size: await executeExpression<number>(`require('Storage').read(${JSON.stringify(name)}).length`)
        });
      }
    }

    this._onDidChangeTreeData.fire(undefined);
  };

  delete = async (file: StorageFile | undefined) => {
    if (file) {
      if (file.type === 'StorageFile') {
        await executeExpression(`require('Storage').open(${JSON.stringify(file.name)}, 'w').erase()`);
      } else {
        await executeExpression(`require('Storage').erase(${JSON.stringify(file.name)})`);
      }
    } else {
      await executeExpression(`require('Storage').eraseAll()`);
    }
    await this.refresh();
  };

  upload = async (files: Uri[]) => {
    for (const uri of files) {
      const bytes = await workspace.fs.readFile(uri);
      console.log(uri, bytes);
      const data = String.fromCharCode(...bytes);
      await new Promise<void>(res => Espruino.Core.Utils.uploadFile(path.basename(uri.path), data, res));
    }
    await this.refresh();
  };

  uploadFile = async () => {
    const result = await window.showOpenDialog({ canSelectMany: true });
    if (!result) return;
    await this.upload(result);
  };

  downloadAndSaveFile = async (file: StorageFile) => {
    const uri = await window.showSaveDialog({ defaultUri: file.uri.with({ scheme: 'file' }) });
    if (!uri) return;

    const doc = await workspace.openTextDocument(file.uri);
    await writeFile(uri.fsPath, doc.getText());
  };

  toggleHiddenFiles = () => {
    this._showHiddenFiles = !this._showHiddenFiles;
    commands.executeCommand('setContext', 'espruinovscode.storage.showHiddenFiles', this._showHiddenFiles);
    this._onDidChangeTreeData.fire(undefined);
  };
}


class EspruinoStorageDocumentContentProvider implements TextDocumentContentProvider {
  onDidChange?: Event<Uri> | undefined;
  async provideTextDocumentContent(uri: Uri, token: CancellationToken): Promise<string> {
    const content = await new Promise<string | undefined>(res => Espruino.Core.Utils.downloadFile(uri.path, res));
    if (!content) throw new Error("Could not open " + uri);
    return content;
  }
};

async function executeExpression<T>(expression: string) {
  const json = await new Promise<string>(res => Espruino.Core.Utils.executeExpression(expression, res));
  return JSON.parse(json) as T;
}
