// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "patch-test" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('patch-test.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from patch-test!');
	});

	// 注册生成任务配置命令
	const generateTaskConfigDisposable = vscode.commands.registerCommand('patch-test.generateTaskConfig', async () => {
		await generateTaskConfig();
	});

	// 注册提交任务命令
	const submitTaskDisposable = vscode.commands.registerCommand('patch-test.submitTask', async () => {
		await submitTaskToRemote();
	});

	// 注册任务管理面板命令
	const taskManagerDisposable = vscode.commands.registerCommand('patch-test.openTaskManager', () => {
		TaskManagerPanel.createOrShow(context.extensionUri);
	});

	context.subscriptions.push(disposable, generateTaskConfigDisposable, submitTaskDisposable, taskManagerDisposable);
}

// 生成任务配置功能
async function generateTaskConfig() {
	try {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('没有找到工作区文件夹');
			return;
		}

		const workspaceRoot = workspaceFolders[0].uri.fsPath;
		const vscodeDir = path.join(workspaceRoot, '.vscode');
		const tasksJsonPath = path.join(vscodeDir, 'tasks.json');

		// 检查.vscode目录是否存在，如果不存在则创建
		if (!fs.existsSync(vscodeDir)) {
			fs.mkdirSync(vscodeDir, { recursive: true });
		}

		// 默认任务配置模板
		const defaultTaskConfig = {
			version: "2.0.0",
			tasks: [
				{
					id: -1,
					label: "构建项目",
					type: "shell",
					command: "npm",
					args: ["run", "build"],
					group: {
						kind: "build",
						isDefault: true
					},
					presentation: {
						echo: true,
						reveal: "always",
						focus: false,
						panel: "shared"
					},
					problemMatcher: []
				},
				{
					id: -1,
					label: "运行测试",
					type: "shell",
					command: "npm",
					args: ["test"],
					group: "test",
					presentation: {
						echo: true,
						reveal: "always",
						focus: false,
						panel: "shared"
					},
					problemMatcher: []
				}
			]
		};

		// 检查是否已存在tasks.json文件
		if (fs.existsSync(tasksJsonPath)) {
			const overwrite = await vscode.window.showWarningMessage(
				'tasks.json文件已存在，是否要覆盖？',
				'是', '否'
			);
			if (overwrite !== '是') {
				return;
			}
		}

		// 写入任务配置文件
		fs.writeFileSync(tasksJsonPath, JSON.stringify(defaultTaskConfig, null, 2));

		vscode.window.showInformationMessage('任务配置已成功生成在 .vscode/tasks.json 文件中');

		// 打开生成的文件
		const document = await vscode.workspace.openTextDocument(tasksJsonPath);
		await vscode.window.showTextDocument(document);

	} catch (error) {
		vscode.window.showErrorMessage(`生成任务配置时出错: ${error}`);
	}
}

// 提交任务到远程服务功能
async function submitTaskToRemote() {
	try {
		// 获取当前工作区信息
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('没有找到工作区文件夹');
			return;
		}

		const workspaceRoot = workspaceFolders[0].uri.fsPath;
		const workspaceName = path.basename(workspaceRoot);
		const tasksJsonPath = path.join(workspaceRoot, '.vscode', 'tasks.json');

		// 检查是否存在tasks.json文件
		if (!fs.existsSync(tasksJsonPath)) {
			const createConfig = await vscode.window.showWarningMessage(
				'未找到任务配置文件，是否先创建？',
				'是', '否'
			);
			if (createConfig === '是') {
				await generateTaskConfig();
			} else {
				return;
			}
		}

		// 读取现有的任务配置
		const tasksConfigContent = fs.readFileSync(tasksJsonPath, 'utf8');
		const tasksConfig = JSON.parse(tasksConfigContent);

		// 过滤出未提交的任务（id为-1的任务）
		const unsubmittedTasks = tasksConfig.tasks.filter((task: any) => task.id === -1);

		if (unsubmittedTasks.length === 0) {
			vscode.window.showInformationMessage('所有任务都已提交完成！');
			return;
		}

		// 让用户选择要提交的任务
		const taskLabels = unsubmittedTasks.map((task: any) => task.label);
		const selectedTaskLabel = await vscode.window.showQuickPick(taskLabels, {
			placeHolder: '选择要提交的任务'
		});

		if (!selectedTaskLabel) {
			return;
		}

		// 找到选中的任务
		const selectedTask = tasksConfig.tasks.find((task: any) => task.label === selectedTaskLabel);

		// 显示输入对话框获取任务描述
		const taskDescription = await vscode.window.showInputBox({
			prompt: '请输入任务描述',
			placeHolder: '描述任务的具体内容',
			value: `在项目 ${workspaceName} 中执行 ${selectedTaskLabel} 任务`
		});

		if (!taskDescription) {
			return;
		}

		// 显示进度条
		let remoteTaskId: number = -1;
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `正在提交任务 "${selectedTaskLabel}" 到远程服务...`,
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0 });

			// 模拟提交过程
			await new Promise(resolve => setTimeout(resolve, 2000));
			progress.report({ increment: 50 });

			// 这里可以添加实际的远程服务API调用
			// 例如：
			// const response = await fetch('https://your-remote-service.com/api/tasks', {
			//     method: 'POST',
			//     headers: { 'Content-Type': 'application/json' },
			//     body: JSON.stringify({
			//         name: selectedTaskLabel,
			//         description: taskDescription,
			//         workspace: workspaceName,
			//         timestamp: new Date().toISOString()
			//     })
			// });
			// const result = await response.json();
			// remoteTaskId = result.id;

			// 模拟远程返回的ID（实际使用时替换为真实API调用）
			remoteTaskId = Math.floor(Math.random() * 10000) + 1;

			await new Promise(resolve => setTimeout(resolve, 1000));
			progress.report({ increment: 100 });

			// 更新任务配置中的ID
			const taskIndex = tasksConfig.tasks.findIndex((task: any) => task.label === selectedTaskLabel);
			if (taskIndex !== -1) {
				tasksConfig.tasks[taskIndex].id = remoteTaskId;

				// 回写到文件
				fs.writeFileSync(tasksJsonPath, JSON.stringify(tasksConfig, null, 2));
			}
		});

		// 显示成功消息
		vscode.window.showInformationMessage(
			`任务 "${selectedTaskLabel}" 已成功提交到远程服务！远程ID: ${remoteTaskId}`,
			'查看详情', '打开配置文件'
		).then(selection => {
			if (selection === '查看详情') {
				// 显示任务详情
				vscode.window.showInformationMessage(
					`任务详情:\n名称: ${selectedTaskLabel}\n描述: ${taskDescription}\n工作区: ${workspaceName}\n远程ID: ${remoteTaskId}`
				);
			} else if (selection === '打开配置文件') {
				// 打开配置文件
				vscode.workspace.openTextDocument(tasksJsonPath).then(document => {
					vscode.window.showTextDocument(document);
				});
			}
		});

	} catch (error) {
		vscode.window.showErrorMessage(`提交任务时出错: ${error}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }

// 任务管理面板类
class TaskManagerPanel {
	private static currentPanel: TaskManagerPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// 如果已经有面板，就显示它
		if (TaskManagerPanel.currentPanel) {
			TaskManagerPanel.currentPanel._panel.reveal(column);
			return;
		}

		// 否则创建一个新的面板
		const panel = vscode.window.createWebviewPanel(
			'taskManager',
			'任务管理器',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [extensionUri]
			}
		);

		TaskManagerPanel.currentPanel = new TaskManagerPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// 设置初始HTML内容
		this._update();

		// 监听面板关闭事件
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// 处理来自webview的消息
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'refresh':
						this._update();
						return;
					case 'submitTask':
						this._submitTask(message.taskLabel);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		TaskManagerPanel.currentPanel = undefined;

		// 清理资源
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private async _update() {
		this._panel.webview.html = await this._getHtmlForWebview();
	}

	private async _getHtmlForWebview() {
		const tasks = await this._getTasks();

		return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>任务管理器</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .title {
            font-size: 18px;
            font-weight: bold;
        }
        .refresh-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .refresh-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .task-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .task-item {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .task-info {
            flex: 1;
        }
        .task-label {
            font-weight: bold;
            margin-bottom: 5px;
            color: var(--vscode-editor-foreground);
        }
        .task-command {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            background-color: var(--vscode-textBlockQuote-background);
            padding: 2px 6px;
            border-radius: 3px;
        }
        .task-status {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-submitted {
            background-color: #4CAF50;
            color: white;
        }
        .status-pending {
            background-color: #FF9800;
            color: white;
        }
        .submit-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
        }
        .submit-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .submit-btn:disabled {
            background-color: var(--vscode-disabledForeground);
            cursor: not-allowed;
        }
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">任务管理器</div>
        <button class="refresh-btn" onclick="refreshTasks()">刷新</button>
    </div>
    
    <div class="task-list">
        ${tasks.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div>暂无任务配置</div>
                <div style="margin-top: 10px; font-size: 12px;">请先运行"生成任务配置"命令</div>
            </div>
        ` : tasks.map((task: any) => `
            <div class="task-item">
                <div class="task-info">
                    <div class="task-label">${task.label}</div>
                    <div class="task-command">${task.command} ${task.args.join(' ')}</div>
                </div>
                <div class="task-status">
                    <div class="status-badge ${task.id === -1 ? 'status-pending' : 'status-submitted'}">
                        ${task.id === -1 ? '待提交' : '已提交'}
                    </div>
                    ${task.id === -1 ?
				`<button class="submit-btn" onclick="submitTask('${task.label}')">提交</button>` :
				`<div style="font-size: 11px; color: var(--vscode-descriptionForeground);">ID: ${task.id}</div>`
			}
                </div>
            </div>
        `).join('')}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function refreshTasks() {
            vscode.postMessage({ command: 'refresh' });
        }
        
        function submitTask(taskLabel) {
            vscode.postMessage({ 
                command: 'submitTask', 
                taskLabel: taskLabel 
            });
        }
    </script>
</body>
</html>`;
	}

	private async _getTasks() {
		try {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				return [];
			}

			const workspaceRoot = workspaceFolders[0].uri.fsPath;
			const tasksJsonPath = path.join(workspaceRoot, '.vscode', 'tasks.json');

			if (!fs.existsSync(tasksJsonPath)) {
				return [];
			}

			const tasksConfigContent = fs.readFileSync(tasksJsonPath, 'utf8');
			const tasksConfig = JSON.parse(tasksConfigContent);

			return tasksConfig.tasks || [];
		} catch (error) {
			console.error('读取任务配置失败:', error);
			return [];
		}
	}

	private async _submitTask(taskLabel: string) {
		try {
			// 调用现有的提交任务功能
			await submitTaskToRemote();
			// 提交完成后刷新面板
			this._update();
		} catch (error) {
			vscode.window.showErrorMessage(`提交任务失败: ${error}`);
		}
	}
}
