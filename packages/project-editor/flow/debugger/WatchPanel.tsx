import React from "react";
import { observer } from "mobx-react";
import { computedFn } from "mobx-utils";
import {
    computed,
    IObservableValue,
    observable,
    runInAction,
    action,
    makeObservable
} from "mobx";

import { Panel } from "project-editor/ui-components/Panel";
import { IColumn, ITreeNode, TreeTable } from "eez-studio-ui/tree-table";
import type { IDataContext } from "project-editor/flow/flow-interfaces";
import type { Variable } from "project-editor/features/variable/variable";
import {
    getArrayElementTypeFromType,
    getObjectVariableTypeFromType,
    getStructureFromType
} from "project-editor/features/variable/value-type";
import { FlowTabState } from "project-editor/flow/flow-tab-state";
import { ConnectionLine } from "project-editor/flow/connection-line";
import type {
    ComponentState,
    RuntimeBase
} from "project-editor/flow/runtime/runtime";
import { getInputDisplayName } from "project-editor/flow/helper";
import { evalExpressionGetValueType } from "project-editor/flow/expression";
import { IconAction } from "eez-studio-ui/action";
import { showGenericDialog } from "eez-studio-ui/generic-dialog";
import { validators } from "eez-studio-shared/validation";
import { ProjectEditor } from "project-editor/project-editor-interface";
import { getValueLabel } from "project-editor/features/variable/value-type";
import { stringCompare } from "eez-studio-shared/string";

import { isArray } from "eez-studio-shared/util";
import type { UserProperty } from "project-editor/flow/user-property";
import { IObjectVariableValueFieldDescription } from "eez-studio-types";
import { SearchInput } from "eez-studio-ui/search-input";

////////////////////////////////////////////////////////////////////////////////

export function valueToString(value: any) {
    if (value === undefined) {
        return "undefined";
    }
    try {
        return JSON.stringify(value);
    } catch (err) {
        try {
            return value.toString();
        } catch (err) {
            return "err!";
        }
    }
}

////////////////////////////////////////////////////////////////////////////////

export const WatchPanel = observer(
    class WatchPanel extends React.Component<{
        runtime: RuntimeBase;
    }> {
        onAddExpression = async () => {
            const result = await showGenericDialog({
                dialogDefinition: {
                    title: "添加监视表达式",
                    fields: [
                        {
                            name: "expression",
                            displayName: "表达式",
                            type: "string",
                            validators: [validators.required]
                        }
                    ]
                },
                values: {},
                dialogContext: this.props.runtime.projectStore.project
            });

            runInAction(() =>
                this.props.runtime.projectStore.uiStateStore.watchExpressions.push(
                    result.values.expression
                )
            );
        };

        onEditExpression = async () => {
            const i = this.selectedExpression.get();
            if (i == -1) {
                return;
            }

            const result = await showGenericDialog({
                dialogDefinition: {
                    title: "编辑监视表达式",
                    fields: [
                        {
                            name: "expression",
                            displayName: "表达式",
                            type: "string",
                            validators: [validators.required]
                        }
                    ]
                },
                values: {
                    expression:
                        this.props.runtime.projectStore.uiStateStore
                            .watchExpressions[i]
                },
                dialogContext: this.props.runtime.projectStore.project
            });

            runInAction(
                () =>
                    (this.props.runtime.projectStore.uiStateStore.watchExpressions[
                        i
                    ] = result.values.expression)
            );
        };

        onDeleteEpression = action(() => {
            const i = this.selectedExpression.get();
            if (i == -1) {
                return;
            }

            runInAction(() =>
                this.props.runtime.projectStore.uiStateStore.watchExpressions.splice(
                    i,
                    1
                )
            );
        });

        selectedExpression = observable.box<number>(-1);

        render() {
            return (
                <div className="EezStudio_DebuggerPanel">
                    <Panel
                        id="project-editor/debugger/variables"
                        title=""
                        buttons={[
                            <IconAction
                                key="add"
                                icon="material:add"
                                iconSize={20}
                                title="添加监视表达式"
                                onClick={this.onAddExpression}
                            />,
                            <IconAction
                                key="edit"
                                icon="material:edit"
                                iconSize={20}
                                title="编辑监视表达式"
                                onClick={this.onEditExpression}
                                enabled={this.selectedExpression.get() != -1}
                            />,
                            <IconAction
                                key="delete"
                                icon="material:delete"
                                iconSize={20}
                                title="删除监视表达式"
                                onClick={this.onDeleteEpression}
                                enabled={this.selectedExpression.get() != -1}
                            />
                        ]}
                        body={
                            <WatchTable
                                runtime={this.props.runtime}
                                selectedExpression={this.selectedExpression}
                            />
                        }
                    />
                </div>
            );
        }
    }
);

const WatchTable = observer(
    class WatchTable extends React.Component<{
        runtime: RuntimeBase;
        selectedExpression: IObservableValue<number>;
    }> {
        constructor(props: {
            runtime: RuntimeBase;
            selectedExpression: IObservableValue<number>;
        }) {
            super(props);

            makeObservable(this, {
                searchText: observable,
                columns: computed,
                watchExpressions: computed,
                globalVariables: computed,
                localVariables: computed,
                selectedComponent: computed,
                componentInputs: computed,
                rootNode: computed,
                expandedMap: observable
            });
        }

        expandedMap = new Map<string, boolean>();
        searchText = "";

        onSearchChange = (event: any) => {
            this.searchText = event.target.value;
        };

        filterBySearchText(text: string) {
            const searchText = this.searchText.trim().toLowerCase();
            if (!searchText) {
                return true;
            }
            return text.toLowerCase().indexOf(searchText) != -1;
        }

        expanded(id: string, defaultValue: boolean) {
            const expandedMap = this.expandedMap;
            return {
                get() {
                    const expanded = expandedMap.get(id);
                    if (expanded != undefined) {
                        return expanded;
                    }
                    return defaultValue;
                },
                set(value: boolean) {
                    expandedMap.set(id, value);
                }
            };
        }

        get columns() {
            let result: IColumn[] = [];

            result.push({
                name: "name",
                title: "名称"
            });

            result.push({
                name: "value",
                title: "值"
            });

            result.push({
                name: "type",
                title: "类型"
            });

            return result;
        }

        getValueChildren = computedFn(
            (
                id: string,
                value: any,
                type: string | null
            ): (() => ITreeNode[]) | undefined => {
                if (type == "date") {
                    return undefined;
                }

                const MAX_CHILDREN = 1000; // MAX_ARRAY_SIZE_TRANSFERRED_IN_DEBUGGER

                if (isArray(value) || value instanceof Uint8Array) {
                    return () => {
                        const elementType = type
                            ? getArrayElementTypeFromType(type)
                            : undefined;

                        const children: ITreeNode[] = [];

                        for (
                            let i = 0;
                            i < Math.min(value.length, MAX_CHILDREN);
                            i++
                        ) {
                            const elementValue = value[i];
                            const name = `[${i}]`;
                            const type = elementType ?? typeof elementValue;
                            const valueLabel = (
                                <span>
                                    {getValueLabel(
                                        this.props.runtime.projectStore.project,
                                        elementValue,
                                        type
                                    )}
                                </span>
                            );

                            children.push(
                                observable({
                                    id: id + name,
                                    name,
                                    nameTitle: name,
                                    value: valueLabel,
                                    valueTitle: valueLabel,
                                    type: type,

                                    children: this.getValueChildren(
                                        id + name,
                                        elementValue,
                                        type
                                    ),
                                    selected: false,
                                    expanded: this.expanded(id + name, false)
                                })
                            );
                        }

                        return children;
                    };
                }

                if (value != null && typeof value == "object") {
                    return () => {
                        let structure;
                        if (type) {
                            const objectVariableType =
                                getObjectVariableTypeFromType(
                                    this.props.runtime.projectStore,
                                    type
                                );

                            if (objectVariableType) {
                                value = objectVariableType.getValue
                                    ? objectVariableType.getValue(value)
                                    : undefined;

                                const getChildren = (
                                    value: any,
                                    valueFieldDescriptions: IObjectVariableValueFieldDescription[]
                                ): ITreeNode[] => {
                                    const children: ITreeNode[] = [];

                                    for (const valueFieldDescription of valueFieldDescriptions) {
                                        const propertyValue =
                                            valueFieldDescription.getFieldValue(
                                                value
                                            );

                                        const name = valueFieldDescription.name;

                                        const valueType =
                                            valueFieldDescription.valueType;

                                        const valueLabel = (
                                            <span>
                                                {getValueLabel(
                                                    this.props.runtime
                                                        .projectStore.project,
                                                    propertyValue,
                                                    typeof valueType == "string"
                                                        ? valueType
                                                        : null
                                                )}
                                            </span>
                                        );

                                        children.push(
                                            observable({
                                                id: id + name,
                                                name,
                                                nameTitle: name,
                                                value: valueLabel,
                                                valueTitle: valueLabel,
                                                type:
                                                    typeof valueType == "string"
                                                        ? valueType
                                                        : "object",

                                                children:
                                                    typeof valueType == "string"
                                                        ? undefined
                                                        : () =>
                                                              getChildren(
                                                                  propertyValue,
                                                                  valueType
                                                              ),
                                                selected: false,
                                                expanded: this.expanded(
                                                    id + name,
                                                    false
                                                )
                                            })
                                        );
                                    }

                                    return children;
                                };

                                return getChildren(
                                    value,
                                    objectVariableType.valueFieldDescriptions
                                );
                            }

                            structure = getStructureFromType(
                                this.props.runtime.projectStore.project,
                                type
                            );
                        }

                        let numChildren = 0;

                        const children: ITreeNode[] = [];

                        for (const name in value) {
                            const propertyValue = value[name];

                            let fieldType: string | null = null;
                            if (structure) {
                                const field = structure.fieldsMap.get(name);
                                if (field) {
                                    fieldType = field.type;
                                }
                            }

                            const valueLabel = (
                                <span>
                                    {getValueLabel(
                                        this.props.runtime.projectStore.project,
                                        propertyValue,
                                        fieldType
                                    )}
                                </span>
                            );

                            children.push(
                                observable({
                                    id: id + name,
                                    name,
                                    nameTitle: name,
                                    value: valueLabel,
                                    valueTitle: valueLabel,
                                    type: fieldType ?? typeof propertyValue,

                                    children: this.getValueChildren(
                                        id + name,
                                        propertyValue,
                                        fieldType
                                    ),
                                    selected: false,
                                    expanded: this.expanded(id + name, false)
                                })
                            );

                            if (++numChildren == MAX_CHILDREN) {
                                break;
                            }
                        }

                        return children;
                    };
                }

                return undefined;
            }
        );

        get watchExpressions() {
            const result = this.selectedComponent;

            return observable({
                id: "expressions",
                name: "表达式",
                value: undefined,
                type: "",
                children: () =>
                    this.props.runtime.projectStore.uiStateStore.watchExpressions
                        .filter(expression =>
                            this.filterBySearchText(expression)
                        )
                        .map((expression, i) => {
                            let watchExpressionLabel;
                            let value;
                            let type: any;
                            let className: string | undefined;
                            if (result) {
                                try {
                                    ({ value, valueType: type } =
                                        evalExpressionGetValueType(
                                            result.flowState,
                                            result.component,
                                            expression
                                        ));

                                    watchExpressionLabel = (
                                        <span>
                                            {getValueLabel(
                                                this.props.runtime.projectStore
                                                    .project,
                                                value,
                                                type
                                            )}
                                        </span>
                                    );
                                } catch (err) {
                                    watchExpressionLabel = err.toString();
                                    type = "";
                                    className = "error";
                                }
                            } else {
                                watchExpressionLabel = "undefined";
                                type = "undefined";
                            }

                            return observable({
                                id: "expressions-" + expression,

                                name: expression,
                                nameTitle: expression,
                                value: watchExpressionLabel,
                                valueTitle: watchExpressionLabel,
                                type,

                                children: this.getValueChildren(
                                    "expressions-" + expression,
                                    value,
                                    type
                                ),
                                selected:
                                    this.props.selectedExpression.get() == i,
                                expanded: this.expanded(
                                    "expressions-" + expression,
                                    false
                                ),
                                className,
                                data: i
                            });
                        }),
                selected: false,
                expanded: this.expanded("expressions", true)
            });
        }

        getVariableTreeNodes = (
            id: string,
            variables: (Variable | UserProperty)[]
        ) => {
            variables = variables.slice();
            variables.sort((a, b) => stringCompare(a.fullName, b.fullName));
            return variables
                .filter(variable => this.filterBySearchText(variable.fullName))
                .map(variable => {
                    const flowState = this.props.runtime.selectedFlowState;

                    let dataContext: IDataContext;
                    if (flowState) {
                        dataContext = flowState.dataContext;
                    } else {
                        dataContext =
                            this.props.runtime.projectStore.dataContext;
                    }

                    const name = variable.fullName;

                    const value = dataContext.get(name);
                    const valueLabel = (
                        <span>
                            {getValueLabel(
                                this.props.runtime.projectStore.project,
                                value,
                                variable.type
                            )}
                        </span>
                    );

                    return observable({
                        id: id + name,

                        name: name,
                        nameTitle: name,
                        value: valueLabel,
                        valueTitle: valueLabel,
                        type: variable.type,

                        children: this.getValueChildren(
                            id + name,
                            value,
                            variable.type
                        ),
                        selected: false,
                        expanded: this.expanded(id + name, false)
                    });
                });
        };

        get globalVariables() {
            return observable({
                id: "global-variables",
                name: "全局变量",
                value: undefined,
                type: "",
                children: () =>
                    this.getVariableTreeNodes(
                        "global-variables",
                        this.props.runtime.projectStore.project
                            .allGlobalVariables
                    ),
                selected: false,
                expanded: this.expanded("global-variables", true)
            });
        }

        get localVariables() {
            const flowState = this.props.runtime.selectedFlowState;
            if (!flowState) {
                return undefined;
            }

            if (flowState.flow.userPropertiesAndLocalVariables.length == 0) {
                return undefined;
            }

            return observable({
                id: "local-variables",
                name: "本地变量",
                value: undefined,
                type: "",
                children: () =>
                    this.getVariableTreeNodes(
                        "local-variables",
                        flowState.flow.userPropertiesAndLocalVariables
                    ),
                selected: false,
                expanded: this.expanded("local-variables", true)
            });
        }

        getComponentStateInputsTreeNodes = (
            id: string,
            componentState: ComponentState
        ) => {
            const inputs = componentState.component.inputs.filter(
                input => input.name != "@seqin"
            );
            return inputs.map(input => {
                const name = getInputDisplayName(
                    componentState.component,
                    input.name
                );

                let value = componentState.getInputValue(input.name);

                let valueLabel = (
                    <span>
                        {getValueLabel(
                            this.props.runtime.projectStore.project,
                            value,
                            null
                        )}
                    </span>
                );

                return observable({
                    id: id + input.name,

                    name: name,
                    nameTitle: name,
                    value: valueLabel,
                    valueTitle: valueLabel,
                    type: input.type,

                    children: this.getValueChildren(
                        id + input.name,
                        value,
                        null
                    ),
                    selected: false,
                    expanded: this.expanded(id + input.name, false)
                });
            });
        };

        get selectedComponent() {
            const flowState = this.props.runtime.selectedFlowState;
            if (!flowState) {
                return undefined;
            }

            const editorState =
                this.props.runtime.projectStore.editorsStore.activeEditor
                    ?.state;
            if (!(editorState instanceof FlowTabState)) {
                return undefined;
            }

            const selectedObjects = editorState.selectedObjects;

            let component;
            if (selectedObjects.length == 1) {
                component = selectedObjects[0];
            } else if (selectedObjects.length == 3) {
                const connectionLines = selectedObjects.filter(
                    selectedObject => selectedObject instanceof ConnectionLine
                ) as ConnectionLine[];
                if (connectionLines.length == 1) {
                    component = connectionLines[0].targetComponent;
                }
            }
            if (!component) {
                return undefined;
            }
            if (!(component instanceof ProjectEditor.ComponentClass)) {
                return undefined;
            }

            return { flowState, component };
        }

        get componentInputs() {
            const result = this.selectedComponent;
            if (!result) {
                return undefined;
            }

            const { flowState, component } = result;

            const inputs = component.inputs.filter(
                input =>
                    input.name != "@seqin" &&
                    this.filterBySearchText(input.name)
            );
            if (inputs.length == 0) {
                return undefined;
            }

            // if (flowState.flow.components.indexOf(component) == -1) {
            //     return undefined;
            // }

            const componentState = flowState.getComponentState(component);

            return observable({
                id: "component-inputs",
                name: "组件输入",
                value: undefined,
                type: "",
                children: () =>
                    this.getComponentStateInputsTreeNodes(
                        "component-inputs",
                        componentState
                    ),
                selected: false,
                expanded: this.expanded("component-inputs", true)
            });
        }

        get rootNode(): ITreeNode {
            const treeNode: ITreeNode = {
                id: "root",
                label: "",
                children: () => {
                    const children: ITreeNode[] = [];

                    if (
                        this.props.runtime.projectStore.uiStateStore
                            .watchExpressions.length > 0
                    ) {
                        children.push(this.watchExpressions);
                    }

                    children.push(this.globalVariables);

                    const localVariables = this.localVariables;
                    if (localVariables) {
                        children.push(localVariables);
                    }

                    const componentInputs = this.componentInputs;
                    if (componentInputs) {
                        children.push(componentInputs);
                    }

                    return children;
                },
                selected: false,
                expanded: this.expanded("root", true)
            };

            return treeNode;
        }

        selectedNode: ITreeNode | undefined;

        selectNode = action((node?: ITreeNode) => {
            if (this.selectedNode) {
                this.selectedNode.selected = false;
                this.selectedNode = undefined;
            }

            if (node && typeof node.data == "number") {
                this.props.selectedExpression.set(node.data);
                this.selectedNode = node;
                node.selected = true;
            } else {
                this.props.selectedExpression.set(-1);
            }
        });

        render() {
            return (
                <div className="EezStudio_DebuggerPanel_WatchBody">
                    <SearchInput
                        searchText={this.searchText}
                        onClear={action(() => {
                            this.searchText = "";
                        })}
                        onChange={this.onSearchChange}
                        onKeyDown={this.onSearchChange}
                    ></SearchInput>
                    <div className="EezStudio_DebuggerVariablesTable">
                        {
                            <TreeTable
                                columns={this.columns}
                                showOnlyChildren={true}
                                rootNode={this.rootNode}
                                selectNode={this.selectNode}
                            />
                        }
                    </div>
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////
