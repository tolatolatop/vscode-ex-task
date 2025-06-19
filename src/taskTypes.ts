import * as vscode from 'vscode';

// 任务配置接口
export interface TaskConfig {
    version: string;
    tasks: TaskDefinition[];
}

// 任务定义接口
export interface TaskDefinition {
    id: number;
    label: string;
    type: string;
    command: string;
    args: string[];
    group?: TaskGroup;
    presentation?: TaskPresentation;
    problemMatcher?: any[];
    description?: string;
    dependsOn?: string[];
    options?: TaskOptions;
}

// 任务分组接口
export interface TaskGroup {
    kind: 'build' | 'test' | 'none';
    isDefault?: boolean;
}

// 任务展示接口
export interface TaskPresentation {
    echo: boolean;
    reveal: 'always' | 'silent' | 'never';
    focus: boolean;
    panel: 'shared' | 'dedicated' | 'new';
    showReuseMessage?: boolean;
    clear?: boolean;
}

// 任务选项接口
export interface TaskOptions {
    cwd?: string;
    env?: { [key: string]: string };
    shell?: {
        executable?: string;
        args?: string[];
    };
}

// 任务模板接口
export interface TaskTemplate {
    name: string;
    description: string;
    template: TaskDefinition;
}

// TreeView任务项接口
export interface TreeViewTaskItem extends vscode.TreeItem {
    task: TaskDefinition;
}

// 任务模板管理器接口
export interface TaskTemplateManager {
    getTemplates(): TaskTemplate[];
    getTemplateByName(name: string): TaskTemplate | undefined;
    createTaskFromTemplate(templateName: string, customArgs?: string[]): TaskDefinition | null;
}

// 默认任务模板
export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
    {
        name: 'npm-build',
        description: 'NPM构建任务',
        template: {
            id: -1,
            label: '构建项目',
            type: 'shell',
            command: 'npm',
            args: ['run', 'build'],
            group: {
                kind: 'build',
                isDefault: true
            },
            presentation: {
                echo: true,
                reveal: 'always',
                focus: false,
                panel: 'shared'
            },
            problemMatcher: []
        }
    },
    {
        name: 'npm-test',
        description: 'NPM测试任务',
        template: {
            id: -1,
            label: '运行测试',
            type: 'shell',
            command: 'npm',
            args: ['test'],
            group: {
                kind: 'test'
            },
            presentation: {
                echo: true,
                reveal: 'always',
                focus: false,
                panel: 'shared'
            },
            problemMatcher: []
        }
    },
    {
        name: 'npm-install',
        description: 'NPM安装依赖',
        template: {
            id: -1,
            label: '安装依赖',
            type: 'shell',
            command: 'npm',
            args: ['install'],
            group: {
                kind: 'build'
            },
            presentation: {
                echo: true,
                reveal: 'always',
                focus: false,
                panel: 'shared'
            },
            problemMatcher: []
        }
    },
    {
        name: 'yarn-build',
        description: 'Yarn构建任务',
        template: {
            id: -1,
            label: '构建项目',
            type: 'shell',
            command: 'yarn',
            args: ['build'],
            group: {
                kind: 'build',
                isDefault: true
            },
            presentation: {
                echo: true,
                reveal: 'always',
                focus: false,
                panel: 'shared'
            },
            problemMatcher: []
        }
    },
    {
        name: 'yarn-test',
        description: 'Yarn测试任务',
        template: {
            id: -1,
            label: '运行测试',
            type: 'shell',
            command: 'yarn',
            args: ['test'],
            group: {
                kind: 'test'
            },
            presentation: {
                echo: true,
                reveal: 'always',
                focus: false,
                panel: 'shared'
            },
            problemMatcher: []
        }
    },
    {
        name: 'python-run',
        description: 'Python运行任务',
        template: {
            id: -1,
            label: '运行Python脚本',
            type: 'shell',
            command: 'python',
            args: ['main.py'],
            group: {
                kind: 'build'
            },
            presentation: {
                echo: true,
                reveal: 'always',
                focus: false,
                panel: 'shared'
            },
            problemMatcher: []
        }
    },
    {
        name: 'docker-build',
        description: 'Docker构建任务',
        template: {
            id: -1,
            label: '构建Docker镜像',
            type: 'shell',
            command: 'docker',
            args: ['build', '-t', 'myapp', '.'],
            group: {
                kind: 'build'
            },
            presentation: {
                echo: true,
                reveal: 'always',
                focus: false,
                panel: 'shared'
            },
            problemMatcher: []
        }
    }
];

// 默认任务配置
export const DEFAULT_TASK_CONFIG: TaskConfig = {
    version: "2.0.0",
    tasks: [
        DEFAULT_TASK_TEMPLATES[0].template, // npm-build
        DEFAULT_TASK_TEMPLATES[1].template  // npm-test
    ]
};

// 任务模板管理器实现
export class TaskTemplateManagerImpl implements TaskTemplateManager {
    private templates: TaskTemplate[] = DEFAULT_TASK_TEMPLATES;

    getTemplates(): TaskTemplate[] {
        return this.templates;
    }

    getTemplateByName(name: string): TaskTemplate | undefined {
        return this.templates.find(template => template.name === name);
    }

    createTaskFromTemplate(templateName: string, customArgs?: string[]): TaskDefinition | null {
        const template = this.getTemplateByName(templateName);
        if (!template) {
            return null;
        }

        const task = { ...template.template };
        if (customArgs) {
            task.args = customArgs;
        }

        return task;
    }

    addTemplate(template: TaskTemplate): void {
        this.templates.push(template);
    }

    removeTemplate(templateName: string): boolean {
        const index = this.templates.findIndex(template => template.name === templateName);
        if (index !== -1) {
            this.templates.splice(index, 1);
            return true;
        }
        return false;
    }
} 