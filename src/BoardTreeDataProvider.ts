import { TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";

export default class BoardTreeDataProvider implements TreeDataProvider<TreeItem> {
  private boardData = Espruino.Core.Env.getBoardData();

  async getChildren(element?: TreeItem) {
    if (element?.label) {
      const data = this.boardData[element.label];

      if (!data) return [];

      if (typeof data === "number") {
        return [
          new TreeItem(data / 1024 + " kib", TreeItemCollapsibleState.None)
        ];
      } else {
        return data.split(',').map(d => new TreeItem(d, TreeItemCollapsibleState.None));
      }
    }

    return Object.keys(this.boardData).map((key) => new TreeItem(key, TreeItemCollapsibleState.Collapsed));
  }

  getTreeItem(element: TreeItem) {
    return element;
  }
}