import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TaskDefinition, TaskConfig, DEFAULT_TASK_CONFIG, TaskTemplateManager } from './taskTypes';
import { TaskTreeDataProvider } from './viewProviders';

// 全局变量引用
let taskTreeDataProvider: TaskTreeDataProvider;
let taskTemplateManager: TaskTemplateManager;

// 设置全局引用
export function setGlobalReferences(treeDataProvider: TaskTreeDataProvider, templateManager: TaskTemplateManager) {
    taskTreeDataProvider = treeDataProvider;
    taskTemplateManager = templateManager;
}

// 显示任务详情
export async function showTaskDetails(task: TaskDefinition) {
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

        // 查找任务的行号 - 使用更精确的匹配
        let taskLineNumber = -1;
        let taskStartLine = -1;
        let taskEndLine = -1;
        let braceCount = 0;
        let inTasksArray = false;
        let currentTaskStart = -1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // 检查是否进入tasks数组
            if (line.includes('"tasks"') && line.includes('[')) {
                inTasksArray = true;
                continue;
            }

            // 如果不在tasks数组中，跳过
            if (!inTasksArray) {
                continue;
            }

            // 检查是否遇到任务开始（左大括号）
            if (line.includes('{')) {
                if (braceCount === 0) {
                    currentTaskStart = i;
                }
                braceCount++;
            }

            // 检查是否遇到任务结束（右大括号）
            if (line.includes('}')) {
                braceCount--;
                if (braceCount === 0 && currentTaskStart !== -1) {
                    // 检查这个任务是否是我们要找的任务
                    for (let j = currentTaskStart; j <= i; j++) {
                        const taskLine = lines[j].trim();
                        if (taskLine.includes(`"label"`) && taskLine.includes(`"${task.label}"`)) {
                            taskLineNumber = j;
                            taskStartLine = currentTaskStart;
                            taskEndLine = i;
                            break;
                        }
                    }
                    currentTaskStart = -1;
                }
            }

            // 如果找到了任务，跳出循环
            if (taskLineNumber !== -1) {
                break;
            }
        }

        // 如果找到了任务，跳转到对应行并高亮显示
        if (taskLineNumber !== -1) {
            const position = new vscode.Position(taskLineNumber, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

            // 可选：高亮显示整个任务块
            if (taskStartLine !== -1 && taskEndLine !== -1) {
                const startPos = new vscode.Position(taskStartLine, 0);
                const endPos = new vscode.Position(taskEndLine, lines[taskEndLine].length);
                editor.selection = new vscode.Selection(startPos, endPos);
            }

            // 显示任务信息
            const status = task.id === -1 ? '待提交' : '已提交';
            const args = task.args && Array.isArray(task.args) ? task.args.join(' ') : '';
            const command = task.command || '';
            const groupKind = task.group?.kind || '无';
            const hasProblemMatcher = task.problemMatcher && Array.isArray(task.problemMatcher) && task.problemMatcher.length > 0;
            const resourceInfo = task.resource && Array.isArray(task.resource) && task.resource.length > 0
                ? `\n资源文件: ${task.resource.join(', ')}`
                : '\n资源文件: 无';

            vscode.window.showInformationMessage(
                `任务详情:\n名称: ${task.label}\n命令: ${command} ${args}\n状态: ${status}\n${task.id !== -1 ? `远程ID: ${task.id}` : ''}\n分组: ${groupKind}\n问题匹配器: ${hasProblemMatcher ? '已配置' : '未配置'}${resourceInfo}`
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
export async function submitSingleTask(task: TaskDefinition) {
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
export async function generateTaskConfig() {
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
export async function submitTaskToRemote() {
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
export async function createTaskFromTemplate() {
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

// 编辑任务
export async function editTask(task: TaskDefinition) {
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

        // 打开文件并跳转到任务位置
        const document = await vscode.workspace.openTextDocument(patchTestJsonPath);
        const editor = await vscode.window.showTextDocument(document);

        // 查找任务在文件中的位置
        const text = document.getText();
        const lines = text.split('\n');

        // 查找任务的行号
        let taskLineNumber = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes(`"label"`) && line.includes(`"${task.label}"`)) {
                taskLineNumber = i;
                break;
            }
        }

        if (taskLineNumber !== -1) {
            const position = new vscode.Position(taskLineNumber, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            vscode.window.showInformationMessage(`已跳转到任务 "${task.label}" 的编辑位置`);
        } else {
            vscode.window.showWarningMessage(`未找到任务 "${task.label}" 的位置`);
        }

    } catch (error) {
        vscode.window.showErrorMessage(`编辑任务时出错: ${error}`);
    }
}

// 删除任务
export async function deleteTask(task: TaskDefinition) {
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

        // 确认删除
        const confirm = await vscode.window.showWarningMessage(
            `确定要删除任务 "${task.label}" 吗？`,
            '是', '否'
        );

        if (confirm !== '是') {
            return;
        }

        // 读取配置文件
        const tasksConfigContent = fs.readFileSync(patchTestJsonPath, 'utf8');
        const tasksConfig: TaskConfig = JSON.parse(tasksConfigContent);

        // 找到并删除任务
        const taskIndex = tasksConfig.tasks.findIndex((t: TaskDefinition) => t.label === task.label);
        if (taskIndex !== -1) {
            tasksConfig.tasks.splice(taskIndex, 1);

            // 写回文件
            fs.writeFileSync(patchTestJsonPath, JSON.stringify(tasksConfig, null, 2));

            // 刷新任务树
            taskTreeDataProvider.refresh();

            vscode.window.showInformationMessage(`已成功删除任务 "${task.label}"`);
        } else {
            vscode.window.showErrorMessage(`未找到任务 "${task.label}"`);
        }

    } catch (error) {
        vscode.window.showErrorMessage(`删除任务时出错: ${error}`);
    }
}

// 管理任务资源
export async function manageTaskResources(task: TaskDefinition) {
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

        // 显示当前资源列表
        const currentResources = task.resource || [];
        const resourceList = currentResources.length > 0 ? currentResources.join('\n') : '无';

        // 让用户选择操作
        const action = await vscode.window.showQuickPick([
            { label: '查看当前资源', description: '显示当前任务的资源列表' },
            { label: '添加文件资源', description: '选择文件添加到资源列表' },
            { label: '添加网络资源', description: '添加HTTP/HTTPS网络资源' },
            { label: '清空资源列表', description: '移除所有资源' },
            { label: '编辑资源列表', description: '手动编辑资源列表' }
        ], {
            placeHolder: '选择操作'
        });

        if (!action) {
            return;
        }

        switch (action.label) {
            case '查看当前资源':
                vscode.window.showInformationMessage(
                    `任务 "${task.label}" 的资源列表:\n${resourceList}`
                );
                break;

            case '添加文件资源':
                const fileUris = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: true,
                    openLabel: '选择文件'
                });
                if (fileUris && fileUris.length > 0) {
                    await updateTaskResources(task, [...currentResources, ...fileUris.map(uri => uri.toString())]);
                }
                break;

            case '添加网络资源':
                const networkResource = await vscode.window.showInputBox({
                    prompt: '请输入网络资源URI',
                    placeHolder: '例如：http://example.com/resource.zip'
                });
                if (networkResource) {
                    await updateTaskResources(task, [...currentResources, networkResource]);
                }
                break;

            case '清空资源列表':
                const confirm = await vscode.window.showWarningMessage(
                    `确定要清空任务 "${task.label}" 的资源列表吗？`,
                    '是', '否'
                );
                if (confirm === '是') {
                    await updateTaskResources(task, []);
                }
                break;

            case '编辑资源列表':
                const newResourceList = await vscode.window.showInputBox({
                    prompt: '请输入资源列表（用逗号分隔多个URI）',
                    placeHolder: 'file:///path/to/file1,file:///path/to/file2',
                    value: resourceList === '无' ? '' : currentResources.join(',')
                });
                if (newResourceList !== undefined) {
                    const resources = newResourceList.trim() ? newResourceList.split(',').map(s => s.trim()).filter(s => s) : [];
                    await updateTaskResources(task, resources);
                }
                break;
        }

    } catch (error) {
        vscode.window.showErrorMessage(`管理任务资源时出错: ${error}`);
    }
}

// 更新任务资源
async function updateTaskResources(task: TaskDefinition, newResources: string[]) {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('没有找到工作区文件夹');
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const patchTestJsonPath = path.join(workspaceRoot, '.vscode', 'patch-test.json');

        // 读取配置文件
        const tasksConfigContent = fs.readFileSync(patchTestJsonPath, 'utf8');
        const tasksConfig: TaskConfig = JSON.parse(tasksConfigContent);

        // 找到并更新任务
        const taskIndex = tasksConfig.tasks.findIndex((t: TaskDefinition) => t.label === task.label);
        if (taskIndex !== -1) {
            tasksConfig.tasks[taskIndex].resource = newResources;

            // 写回文件
            fs.writeFileSync(patchTestJsonPath, JSON.stringify(tasksConfig, null, 2));

            // 刷新任务树
            taskTreeDataProvider.refresh();

            vscode.window.showInformationMessage(
                `已更新任务 "${task.label}" 的资源列表，共 ${newResources.length} 个资源`
            );
        } else {
            vscode.window.showErrorMessage(`未找到任务 "${task.label}"`);
        }

    } catch (error) {
        vscode.window.showErrorMessage(`更新任务资源时出错: ${error}`);
    }
}

// 注册网络资源只读内容提供器（只注册一次）
let netProviderRegistered = false;
function registerNetworkContentProvider() {
    if (netProviderRegistered) return;
    vscode.workspace.registerTextDocumentContentProvider('patchtest-net', {
        async provideTextDocumentContent(uri) {
            const url = decodeURIComponent(uri.query);
            const response = await fetch(url);
            if (!response.ok) throw new Error('网络资源获取失败');
            return await response.text();
        }
    });
    netProviderRegistered = true;
}

// 根据内容类型获取文件扩展名
function getFileExtension(contentType: string, fileName: string): string {
    // 如果文件名已有扩展名，直接返回
    if (path.extname(fileName)) {
        return '';
    }

    // 根据内容类型确定扩展名
    const typeMap: { [key: string]: string } = {
        'text/plain': '.txt',
        'text/html': '.html',
        'text/css': '.css',
        'text/javascript': '.js',
        'application/json': '.json',
        'application/xml': '.xml',
        'text/xml': '.xml',
        'application/yaml': '.yaml',
        'text/yaml': '.yaml',
        'application/yml': '.yml',
        'text/yml': '.yml'
    };

    return typeMap[contentType] || '.txt';
}

export async function openNetworkResource(resourceUri: string) {
    try {
        registerNetworkContentProvider();

        // 先获取内容类型
        const response = await fetch(resourceUri);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'text/plain';
        const url = new URL(resourceUri);
        const fileName = path.basename(url.pathname) || 'network-resource';
        const fileExtension = getFileExtension(contentType, fileName);

        // 生成虚拟只读uri，包含文件扩展名
        const netUri = vscode.Uri.parse(`patchtest-net://${encodeURIComponent(fileName + fileExtension)}?${encodeURIComponent(resourceUri)}`);
        const doc = await vscode.workspace.openTextDocument(netUri);

        // 根据文件扩展名设置语言模式
        const languageId = getLanguageId(fileExtension);
        if (languageId) {
            await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Active });
            // 设置语言模式
            await vscode.languages.setTextDocumentLanguage(doc, languageId);
        } else {
            await vscode.window.showTextDocument(doc, { preview: false });
        }

        vscode.window.showInformationMessage(`网络资源已以只读方式打开: ${fileName}${fileExtension} (可复制、另存为，但无法编辑)`);
    } catch (error) {
        vscode.window.showErrorMessage(`下载网络资源失败: ${error}`);
    }
}

// 根据文件扩展名获取语言ID
function getLanguageId(fileExtension: string): string | undefined {
    const languageMap: { [key: string]: string } = {
        '.json': 'json',
        '.html': 'html',
        '.css': 'css',
        '.js': 'javascript',
        '.xml': 'xml',
        '.yaml': 'yaml',
        '.yml': 'yaml',
        '.txt': 'plaintext'
    };

    return languageMap[fileExtension];
} 