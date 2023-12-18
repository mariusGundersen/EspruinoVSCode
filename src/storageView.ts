import path from "path";
import { Event, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, commands, window, workspace } from "vscode";
import { getIcon } from "./utils";

export default function initStorageView(context: ExtensionContext) {
  const storageTreeDataProvider = new StorageTreeDataProvider();
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.refresh', storageTreeDataProvider.refresh));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.delete', storageTreeDataProvider.delete));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.downloadFile', storageTreeDataProvider.download));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.showHiddenFiles', storageTreeDataProvider.toggleHiddenFiles));
  context.subscriptions.push(commands.registerCommand('espruinovscode.storage.hideHiddenFiles', storageTreeDataProvider.toggleHiddenFiles));

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
          for (const file of files) {
            console.log(file);
            const uri = Uri.parse(file);
            const bytes = await workspace.fs.readFile(uri);
            console.log(uri, bytes);
            storageTreeDataProvider.upload(path.basename(uri.path), bytes);
          }
        },
      }
    });

    await storageTreeDataProvider.refresh();
    return () => storageTree.dispose();
  };
}

interface StorageFile {
  readonly name: string;
  readonly type: 'StorageFile' | 'file';
  readonly size: number;
}

export class StorageTreeDataProvider implements TreeDataProvider<StorageFile> {
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

    treeItem.command = { command: 'espruinovscode.storage.downloadFile', title: "Download File", arguments: [file.name] };

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
          type: 'StorageFile',
          size: await executeExpression<number>(`require('Storage').open(${JSON.stringify(name)}, 'r').getLength()`)
        });
        skipName = `${name}\x01`;
      } else {
        this._files.push({
          name,
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

  download = async (name: string) => {
    const content = await new Promise(res => Espruino.Core.Utils.downloadFile(name, res)) as string | undefined;
    if (!content) return;
    window.showTextDocument(await workspace.openTextDocument({
      content
    }));
  };

  upload = async (name: string, content: Uint8Array) => {
    const data = String.fromCharCode(...content);
    await new Promise<void>(res => Espruino.Core.Utils.uploadFile(name, data, res));
    await this.refresh();
  };

  toggleHiddenFiles = () => {
    this._showHiddenFiles = !this._showHiddenFiles;
    commands.executeCommand('setContext', 'espruinovscode.storage.showHiddenFiles', this._showHiddenFiles);
    this._onDidChangeTreeData.fire(undefined);
  };
}

async function executeExpression<T>(expression: string) {
  const json = await new Promise<string>(res => Espruino.Core.Utils.executeExpression(expression, res));
  return JSON.parse(json) as T;
}