import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TaskDefinition, TaskConfig } from './taskTypes';

// 资源项类
export class ResourceItem extends vscode.TreeItem {
    constructor(
        public readonly resourceUriString: string
    ) {
        super(
            path.basename(resourceUriString),
            vscode.TreeItemCollapsibleState.None
        );

        this.tooltip = resourceUriString;
        this.description = resourceUriString;

        // 根据资源类型设置图标和命令
        if (this.isNetworkResource(resourceUriString)) {
            this.iconPath = new vscode.ThemeIcon('globe');
            this.command = {
                command: 'patch-test.openNetworkResource',
                title: '打开网络资源',
                arguments: [resourceUriString]
            };
        } else {
            this.iconPath = new vscode.ThemeIcon('file');
            this.resourceUri = vscode.Uri.parse(resourceUriString);
            this.command = {
                command: 'vscode.open',
                title: '打开资源',
                arguments: [this.resourceUri]
            };
        }
    }

    private isNetworkResource(uri: string): boolean {
        return uri.startsWith('http://') || uri.startsWith('https://');
    }
}

// 任务项类
export class TaskItem extends vscode.TreeItem {
    constructor(
        public readonly task: TaskDefinition
    ) {
        super(
            task.label,
            // 如果有资源，则设置为可展开，否则为不可展开
            (task.resource && task.resource.length > 0)
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None
        );

        // 设置工具提示
        this.tooltip = `${task.label} - ${task.command} ${task.args?.join(' ') || ''}`;

        // 根据任务状态设置图标
        if (task.id === -1) {
            this.iconPath = new vscode.ThemeIcon('clock', new vscode.ThemeColor('warningForeground'));
            this.contextValue = 'pendingTask';
        } else {
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
            this.contextValue = 'submittedTask';
        }

        // 不设置description，保持简洁
        this.description = '';
    }
}

// 任务数据提供者类
export class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskItem | ResourceItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TaskItem | ResourceItem | undefined | null | void> = new vscode.EventEmitter<TaskItem | ResourceItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TaskItem | ResourceItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TaskItem | ResourceItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TaskItem | ResourceItem): Thenable<TaskItem[] | ResourceItem[]> {
        if (element instanceof ResourceItem) {
            // 资源项没有子节点
            return Promise.resolve([]);
        } else if (element instanceof TaskItem) {
            // 任务项的子节点是资源项
            const resources = element.task.resource || [];
            return Promise.resolve(resources.map(uri => new ResourceItem(uri)));
        } else {
            // 根节点返回任务列表
            return this.getTasks();
        }
    }

    private async getTasks(): Promise<TaskItem[]> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return [];
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const patchTestJsonPath = path.join(workspaceRoot, '.vscode', 'patch-test.json');

            if (!fs.existsSync(patchTestJsonPath)) {
                return [];
            }

            const tasksConfigContent = fs.readFileSync(patchTestJsonPath, 'utf8');
            const tasksConfig: TaskConfig = JSON.parse(tasksConfigContent);

            return (tasksConfig.tasks || []).map((task: TaskDefinition) => new TaskItem(task));
        } catch (error) {
            console.error('读取任务配置失败:', error);
            return [];
        }
    }
} 