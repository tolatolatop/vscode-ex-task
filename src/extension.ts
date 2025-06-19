// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
	TaskTemplateManagerImpl,
	TaskTemplateManager
} from './taskTypes';
import { TaskTreeDataProvider } from './viewProviders';
import {
	setGlobalReferences,
	showTaskDetails,
	submitSingleTask,
	generateTaskConfig,
	submitTaskToRemote,
	createTaskFromTemplate,
	editTask,
	deleteTask,
	manageTaskResources,
	openNetworkResource
} from './commands';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "patch-test" is now active!');

	// 初始化任务模板管理器
	const taskTemplateManager: TaskTemplateManager = new TaskTemplateManagerImpl();

	// 初始化任务树数据提供者
	const taskTreeDataProvider: TaskTreeDataProvider = new TaskTreeDataProvider();

	// 设置全局引用
	setGlobalReferences(taskTreeDataProvider, taskTemplateManager);

	// 注册任务树视图
	vscode.window.registerTreeDataProvider('taskManager', taskTreeDataProvider);

	// 注册文件保存监听器，当patch-test.json保存时自动刷新任务树
	const fileSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
		try {
			console.log('文件保存事件触发，文件名:', document.fileName);

			// 检查是否是patch-test.json文件
			if (document.fileName.includes('patch-test.json')) {
				console.log('检测到patch-test.json文件保存，正在刷新任务树...');

				// 延迟刷新，确保文件写入完成
				setTimeout(() => {
					taskTreeDataProvider.refresh();
					vscode.window.showInformationMessage('检测到patch-test.json已保存，任务树已刷新');
					console.log('任务树刷新完成');
				}, 100);
			}
		} catch (error) {
			console.error('文件保存监听器出错:', error);
			vscode.window.showErrorMessage(`文件保存监听器出错: ${error}`);
		}
	});

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
	const viewTaskDetailsDisposable = vscode.commands.registerCommand('patch-test.viewTaskDetails', async (task: any) => {
		await showTaskDetails(task);
	});

	// 注册提交单个任务命令
	const submitSingleTaskDisposable = vscode.commands.registerCommand('patch-test.submitSingleTask', async (task: any) => {
		await submitSingleTask(task);
	});

	// 注册右键菜单命令
	const submitTaskFromTreeDisposable = vscode.commands.registerCommand('patch-test.submitTaskFromTree', async (taskItem: any) => {
		await submitSingleTask(taskItem.task);
	});

	// 注册从模板创建任务命令
	const createTaskFromTemplateDisposable = vscode.commands.registerCommand('patch-test.createTaskFromTemplate', async () => {
		await createTaskFromTemplate();
	});

	// 注册编辑任务命令
	const editTaskDisposable = vscode.commands.registerCommand('patch-test.editTask', async (taskItem: any) => {
		await editTask(taskItem.task);
	});

	// 注册删除任务命令
	const deleteTaskDisposable = vscode.commands.registerCommand('patch-test.deleteTask', async (taskItem: any) => {
		await deleteTask(taskItem.task);
	});

	// 注册管理任务资源命令
	const manageTaskResourcesDisposable = vscode.commands.registerCommand('patch-test.manageTaskResources', async (taskItem: any) => {
		await manageTaskResources(taskItem.task);
	});

	// 注册打开网络资源命令
	const openNetworkResourceDisposable = vscode.commands.registerCommand('patch-test.openNetworkResource', async (resourceUri: string) => {
		await openNetworkResource(resourceUri);
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
		createTaskFromTemplateDisposable,
		editTaskDisposable,
		deleteTaskDisposable,
		manageTaskResourcesDisposable,
		openNetworkResourceDisposable,
		fileSaveListener
	);
}

// This method is called when your extension is deactivated
export function deactivate() { }