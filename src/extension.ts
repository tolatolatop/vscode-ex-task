// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
	TaskDefinition,
	TaskConfig,
	DEFAULT_TASK_CONFIG,
	TaskTemplateManagerImpl,
	TaskTemplateManager,
	TreeViewTaskItem
} from './taskTypes';

// 任务数据提供者类
class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TaskItem | undefined | null | void> = new vscode.EventEmitter<TaskItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<TaskItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TaskItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: TaskItem): Thenable<TaskItem[]> {
		if (element) {
			return Promise.resolve([]);
		}
		return this.getTasks();
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

// 任务项类
class TaskItem extends vscode.TreeItem {
	constructor(
		public readonly task: TaskDefinition
	) {
		super(
			task.label,
			vscode.TreeItemCollapsibleState.None
		);

		this.tooltip = `${task.label} - ${task.command} ${task.args.join(' ')}`;
		this.description = `${task.command} ${task.args.join(' ')}`;

		// 根据任务状态设置图标和上下文值
		if (task.id === -1) {
			this.iconPath = new vscode.ThemeIcon('clock');
			this.contextValue = 'pendingTask';
		} else {
			this.iconPath = new vscode.ThemeIcon('check');
			this.contextValue = 'submittedTask';
		}

		// 设置命令
		this.command = {
			command: 'patch-test.viewTaskDetails',
			title: '查看任务详情',
			arguments: [task]
		};
	}
}

// 全局变量
let taskTreeDataProvider: TaskTreeDataProvider;
let taskTemplateManager: TaskTemplateManager;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "patch-test" is now active!');

	// 初始化任务模板管理器
	taskTemplateManager = new TaskTemplateManagerImpl();

	// 初始化任务树数据提供者
	taskTreeDataProvider = new TaskTreeDataProvider();

	// 注册任务树视图
	vscode.window.registerTreeDataProvider('taskManager', taskTreeDataProvider);

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
		// 显示任务管理器视图
		vscode.commands.executeCommand('workbench.view.extension.taskManager');
	});

	// 注册刷新任务列表命令
	const refreshTasksDisposable = vscode.commands.registerCommand('patch-test.refreshTasks', () => {
		taskTreeDataProvider.refresh();
	});

	// 注册查看任务详情命令
	const viewTaskDetailsDisposable = vscode.commands.registerCommand('patch-test.viewTaskDetails', async (task: TaskDefinition) => {
		await showTaskDetails(task);
	});

	// 注册提交单个任务命令
	const submitSingleTaskDisposable = vscode.commands.registerCommand('patch-test.submitSingleTask', async (task: TaskDefinition) => {
		await submitSingleTask(task);
	});

	// 注册右键菜单命令
	const submitTaskFromTreeDisposable = vscode.commands.registerCommand('patch-test.submitTaskFromTree', async (taskItem: TaskItem) => {
		await submitSingleTask(taskItem.task);
	});

	// 注册从模板创建任务命令
	const createTaskFromTemplateDisposable = vscode.commands.registerCommand('patch-test.createTaskFromTemplate', async () => {
		await createTaskFromTemplate();
	});

	context.subscriptions.push(
		disposable,
		generateTaskConfigDisposable,
		submitTaskDisposable,
		taskManagerDisposable,
		refreshTasksDisposable,
		viewTaskDetailsDisposable,
		submitSingleTaskDisposable,
		submitTaskFromTreeDisposable,
		createTaskFromTemplateDisposable
	);
}

// 显示任务详情
async function showTaskDetails(task: TaskDefinition) {
	try {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('没有找到工作区文件夹');
			return;
		}

		const workspaceRoot = workspaceFolders[0].uri.fsPath;
		const patchTestJsonPath = path.join(workspaceRoot, '.vscode', 'patch-test.json');

		if (!fs.existsSync(patchTestJsonPath)) {
			vscode.window.showErrorMessage('未找到任务配置文件');
			return;
		}

		// 打开文件
		const document = await vscode.workspace.openTextDocument(patchTestJsonPath);
		const editor = await vscode.window.showTextDocument(document);

		// 查找任务在文件中的位置
		const text = document.getText();
		const lines = text.split('\n');

		// 查找任务的行号
		let taskLineNumber = -1;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			// 查找包含任务标签的行
			if (line.includes(`"label"`) && line.includes(`"${task.label}"`)) {
				taskLineNumber = i;
				break;
			}
		}

		// 如果找到了任务，跳转到对应行
		if (taskLineNumber !== -1) {
			const position = new vscode.Position(taskLineNumber, 0);
			editor.selection = new vscode.Selection(position, position);
			editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

			// 高亮显示任务信息
			const status = task.id === -1 ? '待提交' : '已提交';
			const args = task.args && Array.isArray(task.args) ? task.args.join(' ') : '';
			const command = task.command || '';
			const groupKind = task.group?.kind || '无';
			const hasProblemMatcher = task.problemMatcher && Array.isArray(task.problemMatcher) && task.problemMatcher.length > 0;

			vscode.window.showInformationMessage(
				`任务详情:\n名称: ${task.label}\n命令: ${command} ${args}\n状态: ${status}\n${task.id !== -1 ? `远程ID: ${task.id}` : ''}\n分组: ${groupKind}\n问题匹配器: ${hasProblemMatcher ? '已配置' : '未配置'}`
			);
		} else {
			// 如果没找到具体行，仍然显示文件
			vscode.window.showWarningMessage(`已打开配置文件，但未找到任务 "${task.label}" 的具体位置`);
		}

	} catch (error) {
		vscode.window.showErrorMessage(`打开任务详情时出错: ${error}`);
	}
}

// 提交单个任务
async function submitSingleTask(task: TaskDefinition) {
	try {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('没有找到工作区文件夹');
			return;
		}

		const workspaceRoot = workspaceFolders[0].uri.fsPath;
		const workspaceName = path.basename(workspaceRoot);
		const patchTestJsonPath = path.join(workspaceRoot, '.vscode', 'patch-test.json');

		// 检查任务是否已经提交
		if (task.id !== -1) {
			vscode.window.showInformationMessage(`任务 "${task.label}" 已经提交过了！`);
			return;
		}

		// 显示输入对话框获取任务描述
		const taskDescription = await vscode.window.showInputBox({
			prompt: '请输入任务描述',
			placeHolder: '描述任务的具体内容',
			value: `在项目 ${workspaceName} 中执行 ${task.label} 任务`
		});

		if (!taskDescription) {
			return;
		}

		// 显示进度条
		let remoteTaskId: number = -1;
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: `正在提交任务 "${task.label}" 到远程服务...`,
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0 });

			// 模拟提交过程
			await new Promise(resolve => setTimeout(resolve, 2000));
			progress.report({ increment: 50 });

			// 模拟远程返回的ID（实际使用时替换为真实API调用）
			remoteTaskId = Math.floor(Math.random() * 10000) + 1;

			await new Promise(resolve => setTimeout(resolve, 1000));
			progress.report({ increment: 100 });

			// 更新任务配置中的ID
			const tasksConfigContent = fs.readFileSync(patchTestJsonPath, 'utf8');
			const tasksConfig: TaskConfig = JSON.parse(tasksConfigContent);

			const taskIndex = tasksConfig.tasks.findIndex((t: TaskDefinition) => t.label === task.label);
			if (taskIndex !== -1) {
				tasksConfig.tasks[taskIndex].id = remoteTaskId;

				// 回写到文件
				fs.writeFileSync(patchTestJsonPath, JSON.stringify(tasksConfig, null, 2));
			}
		});

		// 刷新任务树
		taskTreeDataProvider.refresh();

		// 显示成功消息
		vscode.window.showInformationMessage(
			`任务 "${task.label}" 已成功提交到远程服务！远程ID: ${remoteTaskId}`
		);

	} catch (error) {
		vscode.window.showErrorMessage(`提交任务时出错: ${error}`);
	}
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
		const patchTestJsonPath = path.join(vscodeDir, 'patch-test.json');

		// 检查.vscode目录是否存在，如果不存在则创建
		if (!fs.existsSync(vscodeDir)) {
			fs.mkdirSync(vscodeDir, { recursive: true });
		}

		// 检查是否已存在patch-test.json文件
		if (fs.existsSync(patchTestJsonPath)) {
			const overwrite = await vscode.window.showWarningMessage(
				'patch-test.json文件已存在，是否要覆盖？',
				'是', '否'
			);
			if (overwrite !== '是') {
				return;
			}
		}

		// 写入任务配置文件
		fs.writeFileSync(patchTestJsonPath, JSON.stringify(DEFAULT_TASK_CONFIG, null, 2));

		vscode.window.showInformationMessage('任务配置已成功生成在 .vscode/patch-test.json 文件中');

		// 刷新任务树视图
		if (taskTreeDataProvider) {
			taskTreeDataProvider.refresh();
		}

		// 打开生成的文件
		const document = await vscode.workspace.openTextDocument(patchTestJsonPath);
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
		const patchTestJsonPath = path.join(workspaceRoot, '.vscode', 'patch-test.json');

		// 检查是否存在patch-test.json文件
		if (!fs.existsSync(patchTestJsonPath)) {
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
		const tasksConfigContent = fs.readFileSync(patchTestJsonPath, 'utf8');
		const tasksConfig: TaskConfig = JSON.parse(tasksConfigContent);

		// 过滤出未提交的任务（id为-1的任务）
		const unsubmittedTasks = tasksConfig.tasks.filter((task: TaskDefinition) => task.id === -1);

		if (unsubmittedTasks.length === 0) {
			vscode.window.showInformationMessage('所有任务都已提交完成！');
			return;
		}

		// 让用户选择要提交的任务
		const taskLabels = unsubmittedTasks.map((task: TaskDefinition) => task.label);
		const selectedTaskLabel = await vscode.window.showQuickPick(taskLabels, {
			placeHolder: '选择要提交的任务'
		});

		if (!selectedTaskLabel) {
			return;
		}

		// 找到选中的任务
		const selectedTask = tasksConfig.tasks.find((task: TaskDefinition) => task.label === selectedTaskLabel);

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
			const taskIndex = tasksConfig.tasks.findIndex((task: TaskDefinition) => task.label === selectedTaskLabel);
			if (taskIndex !== -1) {
				tasksConfig.tasks[taskIndex].id = remoteTaskId;

				// 回写到文件
				fs.writeFileSync(patchTestJsonPath, JSON.stringify(tasksConfig, null, 2));
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
				vscode.workspace.openTextDocument(patchTestJsonPath).then(document => {
					vscode.window.showTextDocument(document);
				});
			}
		});

	} catch (error) {
		vscode.window.showErrorMessage(`提交任务时出错: ${error}`);
	}
}

// 从模板创建任务
async function createTaskFromTemplate() {
	try {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			vscode.window.showErrorMessage('没有找到工作区文件夹');
			return;
		}

		const workspaceRoot = workspaceFolders[0].uri.fsPath;
		const patchTestJsonPath = path.join(workspaceRoot, '.vscode', 'patch-test.json');

		// 获取所有可用的模板
		const templates = taskTemplateManager.getTemplates();
		const templateOptions = templates.map(template => ({
			label: template.name,
			description: template.description,
			detail: `${template.template.command} ${template.template.args.join(' ')}`
		}));

		// 让用户选择模板
		const selectedTemplate = await vscode.window.showQuickPick(templateOptions, {
			placeHolder: '选择任务模板'
		});

		if (!selectedTemplate) {
			return;
		}

		// 获取选中的模板
		const template = taskTemplateManager.getTemplateByName(selectedTemplate.label);
		if (!template) {
			vscode.window.showErrorMessage('模板不存在');
			return;
		}

		// 让用户输入任务标签
		const taskLabel = await vscode.window.showInputBox({
			prompt: '请输入任务标签',
			placeHolder: '例如：构建项目',
			value: template.template.label
		});

		if (!taskLabel) {
			return;
		}

		// 创建新任务
		const newTask = taskTemplateManager.createTaskFromTemplate(selectedTemplate.label);
		if (!newTask) {
			vscode.window.showErrorMessage('创建任务失败');
			return;
		}

		// 更新任务标签
		newTask.label = taskLabel;

		// 读取现有配置或创建新配置
		let tasksConfig: TaskConfig;
		if (fs.existsSync(patchTestJsonPath)) {
			const tasksConfigContent = fs.readFileSync(patchTestJsonPath, 'utf8');
			tasksConfig = JSON.parse(tasksConfigContent);
		} else {
			tasksConfig = {
				version: "2.0.0",
				tasks: []
			};
		}

		// 添加新任务
		tasksConfig.tasks.push(newTask);

		// 写入配置文件
		fs.writeFileSync(patchTestJsonPath, JSON.stringify(tasksConfig, null, 2));

		// 刷新任务树
		taskTreeDataProvider.refresh();

		vscode.window.showInformationMessage(`已成功创建任务 "${taskLabel}"`);

	} catch (error) {
		vscode.window.showErrorMessage(`创建任务时出错: ${error}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
