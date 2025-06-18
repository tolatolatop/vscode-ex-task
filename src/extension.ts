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

	context.subscriptions.push(disposable, generateTaskConfigDisposable, submitTaskDisposable);
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

		// 显示输入对话框获取任务信息
		const taskName = await vscode.window.showInputBox({
			prompt: '请输入任务名称',
			placeHolder: '例如: 构建项目',
			value: '构建项目'
		});

		if (!taskName) {
			return;
		}

		const taskDescription = await vscode.window.showInputBox({
			prompt: '请输入任务描述',
			placeHolder: '描述任务的具体内容',
			value: `在项目 ${workspaceName} 中执行 ${taskName} 任务`
		});

		if (!taskDescription) {
			return;
		}

		// 显示进度条
		await vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "正在提交任务到远程服务...",
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
			//         name: taskName,
			//         description: taskDescription,
			//         workspace: workspaceName,
			//         timestamp: new Date().toISOString()
			//     })
			// });

			await new Promise(resolve => setTimeout(resolve, 1000));
			progress.report({ increment: 100 });
		});

		// 显示成功消息
		vscode.window.showInformationMessage(
			`任务 "${taskName}" 已成功提交到远程服务！`,
			'查看详情'
		).then(selection => {
			if (selection === '查看详情') {
				// 这里可以打开任务详情页面或显示更多信息
				vscode.window.showInformationMessage(`任务详情:\n名称: ${taskName}\n描述: ${taskDescription}\n工作区: ${workspaceName}`);
			}
		});

	} catch (error) {
		vscode.window.showErrorMessage(`提交任务时出错: ${error}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
