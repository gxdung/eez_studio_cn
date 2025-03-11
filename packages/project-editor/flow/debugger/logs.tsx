import { observable, action, makeObservable } from "mobx";

import { guid } from "eez-studio-shared/guid";

import {
    getLabel,
    getObjectFromStringPath,
    getObjectPathAsString
} from "project-editor/store";
import { ConnectionLine } from "project-editor/flow/connection-line";
import type {
    FlowState,
    QueueTask,
    RuntimeBase
} from "project-editor/flow/runtime/runtime";
import type { Component, Widget } from "project-editor/flow/component";
import {
    getInputDisplayName,
    getOutputDisplayName
} from "project-editor/flow/helper";
import type { LogItemType } from "project-editor/flow/flow-interfaces";

////////////////////////////////////////////////////////////////////////////////

export const MAX_LOGS_ITEMS = 1000;

////////////////////////////////////////////////////////////////////////////////

export class LogItem {
    date: Date = new Date();
    id = guid();

    constructor(
        public type: LogItemType,
        private _label: string | undefined,
        public flowState: FlowState | undefined,
        public component?: Component,
        public connectionLine?: ConnectionLine
    ) {}

    get label() {
        return this._label;
    }
}

////////////////////////////////////////////////////////////////////////////////

export class ActionStartLogItem extends LogItem {
    constructor(flowState: FlowState) {
        super("debug", undefined, flowState);
    }

    get label() {
        return `操作执行: ${getLabel(this.flowState!.flow)}`;
    }
}

export class ActionEndLogItem extends LogItem {
    constructor(flowState: FlowState) {
        super("debug", undefined, flowState);
    }

    get label() {
        return `操作完成: ${getLabel(this.flowState!.flow)}`;
    }
}

export class ExecuteComponentLogItem extends LogItem {
    constructor(public queueTask: QueueTask) {
        super(
            "debug",
            undefined,
            queueTask.flowState,
            queueTask.component,
            queueTask.connectionLine
        );
    }

    get label() {
        return `执行组件: ${getQueueTaskLabel(this.queueTask)}`;
    }
}

export class ExecuteWidgetActionLogItem extends LogItem {
    constructor(flowState: FlowState | undefined, component: Component) {
        super("debug", undefined, flowState, component);
    }

    get label() {
        return `执行组件操作: ${getLabel(this.component!)}`;
    }
}

export class WidgetActionNotDefinedLogItem extends LogItem {
    constructor(flowState: FlowState | undefined, component: Component) {
        super("error", undefined, flowState, component);
    }

    get label() {
        return `组件操作未定义: ${getLabel(this.component!)}`;
    }
}

export class WidgetActionNotFoundLogItem extends LogItem {
    constructor(flowState: FlowState | undefined, component: Component) {
        super("error", undefined, flowState, component);
    }

    get label() {
        return `组件操作未找到: ${(this.component as Widget).action}`;
    }
}

export class NoConnectionLogItem extends LogItem {
    constructor(
        public flowState: FlowState | undefined,
        component: Component,
        public output?: string
    ) {
        super("error", undefined, flowState, component);
    }

    get label() {
        return `操作 ${getLabel(this.component!)} 没有输出连接 ${this.output}`;
    }
}

export class OutputValueLogItem extends LogItem {
    constructor(
        public flowState: FlowState,
        public connectionLine: ConnectionLine,
        public output?: string,
        public value?: any
    ) {
        super("debug", undefined, flowState, undefined, connectionLine);
    }

    get label() {
        let value = this.value ?? null;
        if (value) {
            try {
                value = JSON.stringify(value);
            } catch (err) {
                try {
                    value = value?.toString();
                } catch (err) {
                    console.error(err, value);
                }
            }
        }

        return `输出值来自 [${
            this.output ||
            getOutputDisplayName(
                this.connectionLine.sourceComponent,
                this.connectionLine.output
            )
        }] 到 [${getLabel(
            this.connectionLine.targetComponent!
        )}/${getInputDisplayName(
            this.connectionLine.targetComponent,
            this.connectionLine.input
        )}]: ${value}`;
    }
}

export class ExecutionErrorLogItem extends LogItem {
    constructor(flowState: FlowState, component: Component, public error: any) {
        super("error", undefined, flowState, component);
    }

    get label() {
        return `执行错误: ${getLabel(
            this.component!
        )}: ${this.error.toString()}`;
    }
}

export class NoStartActionComponentLogItem extends LogItem {
    constructor(public flowState: FlowState | undefined) {
        super("error", undefined, flowState);
    }

    get label() {
        return `没有 StartactionComponent`;
    }
}

////////////////////////////////////////////////////////////////////////////////

export class RuntimeLogs {
    logs: LogItem[] = [];
    selectedLogItem: LogItem | undefined;

    constructor() {
        makeObservable(this, {
            logs: observable,
            selectedLogItem: observable,
            addLogItem: action,
            clear: action.bound,
            loadDebugInfo: action
        });
    }

    addLogItem(logItem: LogItem) {
        this.logs.push(logItem);

        if (logItem.type != "error") {
            const numLogItems = this.logs.filter(
                existingLogItem => existingLogItem.type == logItem.type
            ).length;

            if (numLogItems > MAX_LOGS_ITEMS) {
                for (let i = 0; i < this.logs.length; i++) {
                    if (this.logs[i].type === logItem.type) {
                        this.logs.splice(i, 1);
                        return;
                    }
                }
            }
        }
    }

    clear() {
        this.logs = [];
    }

    get debugInfo() {
        return this.logs.map(logItem => ({
            id: logItem.id,
            date: logItem.date.getTime(),
            type: logItem.type,
            label: logItem.label,
            flowState: logItem.flowState?.id,
            component: logItem.component
                ? getObjectPathAsString(logItem.component)
                : undefined,
            connectionLine: logItem.connectionLine
                ? getObjectPathAsString(logItem.connectionLine)
                : undefined
        }));
    }

    loadDebugInfo(runtime: RuntimeBase, debugInfo: any) {
        this.logs = debugInfo.map((logItemDebugInfo: any) => {
            const logItem = new LogItem(
                logItemDebugInfo.type,
                logItemDebugInfo.label,
                runtime.findFlowStateById(logItemDebugInfo.flowState),
                logItemDebugInfo.component
                    ? (getObjectFromStringPath(
                          runtime.projectStore.project,
                          logItemDebugInfo.component
                      ) as Component)
                    : undefined,
                logItemDebugInfo.connectionLine
                    ? (getObjectFromStringPath(
                          runtime.projectStore.project,
                          logItemDebugInfo.connectionLine
                      ) as ConnectionLine)
                    : undefined
            );

            logItem.id = logItemDebugInfo.id;
            logItem.date = new Date(logItemDebugInfo.date);

            return logItem;
        });
    }
}

////////////////////////////////////////////////////////////////////////////////

export function getFlowStateLabel(flowState: FlowState) {
    return `${getLabel(flowState.flow)} (${flowState.flowStateIndex})`;
}

function getFullFlowStateLabel(flowState: FlowState): string {
    return flowState.parentFlowState
        ? `${getFullFlowStateLabel(
              flowState.parentFlowState
          )} / ${getFlowStateLabel(flowState)}`
        : getFlowStateLabel(flowState);
}

export function getQueueTaskLabel(queueTask: QueueTask) {
    return `${getFullFlowStateLabel(queueTask.flowState)} / ${
        queueTask.connectionLine &&
        queueTask.connectionLine.sourceComponent &&
        queueTask.connectionLine.targetComponent
            ? getLabel(queueTask.connectionLine)
            : getLabel(queueTask.component)
    }`;
}
