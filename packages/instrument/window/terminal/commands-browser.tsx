import React from "react";
import { observable, action, makeObservable, runInAction } from "mobx";
import { observer } from "mobx-react";
import classNames from "classnames";

import {
    VALIDATION_MESSAGE_REQUIRED,
    filterInteger,
    filterNumber
} from "eez-studio-shared/validation";

import { List } from "eez-studio-ui/list";
import { ITreeNode, Tree } from "eez-studio-ui/tree";
import { Splitter } from "eez-studio-ui/splitter";
import {
    VerticalHeaderWithBody,
    Header,
    Body
} from "eez-studio-ui/header-with-body";
import { SearchInput } from "eez-studio-ui/search-input";
import { PropertyList, TextInputProperty } from "eez-studio-ui/properties";
import { Icon } from "eez-studio-ui/icon";

import { IParameter, compareMnemonic } from "instrument/scpi";
import {
    ICommandSyntax,
    IQuerySyntax,
    makeItShort
} from "instrument/commands-tree";

import type { InstrumentAppStore } from "instrument/window/app-store";
import type { TerminalState } from "instrument/window/terminal/terminalState";

////////////////////////////////////////////////////////////////////////////////

function insertScpiCommandIntoCode(
    appStore: InstrumentAppStore,
    scpiCommand: string
) {
    const scriptsModel = appStore.scriptsModel;

    const codeEditor = appStore.scriptView && appStore.scriptView.codeEditor;

    if (!codeEditor || !scriptsModel.selectedScript) {
        return;
    }

    let text;

    if (
        scriptsModel.selectedScript.action.type === "scpi-commands" ||
        scriptsModel.selectedScript.action.type === "commands"
    ) {
        text = scpiCommand;
    } else if (scriptsModel.selectedScript.action.type === "javascript") {
        text = `connection.command("${scpiCommand}");`;
    } else {
        return;
    }

    codeEditor.insertText(text);
}

function insertScpiQueryIntoCode(
    appStore: InstrumentAppStore,
    scpiQuery: string
) {
    const scriptsModel = appStore.scriptsModel;

    const codeEditor = appStore.scriptView && appStore.scriptView.codeEditor;

    if (!codeEditor || !scriptsModel.selectedScript) {
        return;
    }

    let text;

    if (
        scriptsModel.selectedScript.action.type === "scpi-commands" ||
        scriptsModel.selectedScript.action.type === "commands"
    ) {
        text = scpiQuery;
    } else if (scriptsModel.selectedScript.action.type === "javascript") {
        text = `var <name> = await connection.query("${scpiQuery}");`;
    } else {
        return;
    }

    codeEditor.insertText(text);
}

////////////////////////////////////////////////////////////////////////////////

export interface ICommandNode extends ITreeNode {
    commandSyntax?: ICommandSyntax;
    querySyntax?: IQuerySyntax;
}

export const CommandSyntax = observer(
    class CommandSyntax extends React.Component<
        {
            appStore: InstrumentAppStore;
            commandSyntax: ICommandSyntax | IQuerySyntax;
            copyCommand: (
                command: ICommandSyntax | IQuerySyntax,
                commandParameters: string
            ) => void;
        },
        {}
    > {
        parameterValues = new Map<string, string>();
        errors = new Map<string, string[]>();

        constructor(props: {
            appStore: InstrumentAppStore;
            commandSyntax: ICommandSyntax | IQuerySyntax;
            copyCommand: (
                command: ICommandSyntax | IQuerySyntax,
                commandParameters: string
            ) => void;
        }) {
            super(props);

            makeObservable(this, {
                parameterValues: observable,
                errors: observable,
                validateParameters: action
            });
        }

        addError(parameterName: string, error: string) {
            const parameterErrors = this.errors.get(parameterName);
            if (parameterErrors) {
                parameterErrors.push(error);
            } else {
                this.errors.set(parameterName, [error]);
            }
        }

        validateParameterValue(parameterValue: string, parameter: IParameter) {
            const types: string[] = [];

            for (let i = 0; i < parameter.type.length; ++i) {
                const type = parameter.type[i];
                if (type.type === "nr1") {
                    const num = filterInteger(parameterValue);
                    if (!isNaN(num)) {
                        return [null, parameterValue];
                    }
                    types.push("nr1");
                } else if (type.type === "nr2" || type.type === "nr3") {
                    const num = filterNumber(parameterValue);
                    if (!isNaN(num)) {
                        return [null, parameterValue];
                    }
                    types.push("nr2");
                } else if (type.type === "boolean") {
                    const num = filterNumber(parameterValue);
                    if (!isNaN(num) && (num === 0 || num === 1)) {
                        return [null, parameterValue];
                    }
                    types.push("Boolean");
                } else if (type.type === "discrete") {
                    const enumeration =
                        this.props.appStore.commandsTree.enums.find(
                            enumeration =>
                                enumeration.name ===
                                parameter.type[i].enumeration
                        );
                    if (enumeration) {
                        for (let j = 0; j < enumeration.members.length; ++j) {
                            if (
                                compareMnemonic(
                                    enumeration.members[j].name,
                                    parameterValue
                                )
                            ) {
                                return [null, parameterValue];
                            }
                        }
                    }
                    types.push(`Discrete<${parameter.type[i].enumeration}>`);
                } else if (type.type === "channel-list") {
                    return [null, parameterValue];
                }
            }

            for (let i = 0; i < parameter.type.length; ++i) {
                const type = parameter.type[i];
                if (type.type === "quoted-string") {
                    return [null, `"${parameterValue}"`];
                }
            }

            if (types.length === 0) {
                return [null, parameterValue];
            }

            if (types.length === 1) {
                return [`Expected ${types[0]} value`];
            }

            return [
                `Expected ${types.slice(0, types.length - 1).join(", ")} or ${
                    types[types.length - 1]
                } value`
            ];
        }

        validateParameters() {
            this.errors.clear();

            const parameters = this.props.commandSyntax.parameters;

            const finalValues = [];

            for (let i = 0; i < parameters.length; ++i) {
                let value = this.parameterValues.get(parameters[i].name);
                if (value) {
                    value = value.trim();
                }

                if (value) {
                    const [error, finalValue] = this.validateParameterValue(
                        value,
                        parameters[i]
                    );
                    if (error != null) {
                        this.addError(parameters[i].name, error);
                    } else {
                        finalValues.push(finalValue);
                    }
                } else {
                    if (!parameters[i].isOptional) {
                        this.addError(
                            parameters[i].name,
                            VALIDATION_MESSAGE_REQUIRED
                        );
                    } else {
                        for (let j = i + 1; j < parameters.length; ++j) {
                            let value2 = this.parameterValues.get(
                                parameters[j].name
                            );
                            if (value2) {
                                value2 = value2.trim();
                            }
                            if (value2) {
                                this.addError(
                                    parameters[i].name,
                                    VALIDATION_MESSAGE_REQUIRED
                                );
                                break;
                            }
                        }
                    }
                }
            }

            if (this.errors.size > 0) {
                return false;
            }

            if (finalValues.length === 0) {
                return "";
            }

            return " " + finalValues.join(", ");
        }

        copy = () => {
            const commandParameters = this.validateParameters();
            if (commandParameters !== false) {
                this.props.copyCommand(
                    this.props.commandSyntax,
                    commandParameters
                );
            }
        };

        copyToScript = () => {
            const commandParameters = this.validateParameters();
            if (commandParameters !== false) {
                const command =
                    this.props.commandSyntax.name + commandParameters;
                if (this.props.commandSyntax.name.endsWith("?")) {
                    insertScpiQueryIntoCode(this.props.appStore, command);
                } else {
                    insertScpiCommandIntoCode(this.props.appStore, command);
                }
            }
        };

        render() {
            return (
                <div className="EezStudio_CommandSyntaxContainer">
                    <h5>{this.props.commandSyntax.name}</h5>
                    <div className="EezStudio_Parameters">
                        <PropertyList>
                            {this.props.commandSyntax.parameters.map(
                                parameter => {
                                    const suggestions: string[] = [];

                                    for (
                                        let i = 0;
                                        i < parameter.type.length;
                                        ++i
                                    ) {
                                        if (
                                            parameter.type[i].type ===
                                            "discrete"
                                        ) {
                                            const enumeration =
                                                this.props.appStore.commandsTree.enums.find(
                                                    enumeration =>
                                                        enumeration.name ===
                                                        parameter.type[i]
                                                            .enumeration
                                                );
                                            if (enumeration) {
                                                enumeration.members.forEach(
                                                    member =>
                                                        suggestions.push(
                                                            member.name
                                                        )
                                                );
                                            }
                                        }
                                    }

                                    return (
                                        <TextInputProperty
                                            key={parameter.name}
                                            title={parameter.description}
                                            name={
                                                parameter.isOptional
                                                    ? `[ ${parameter.name} ]`
                                                    : parameter.name
                                            }
                                            value={
                                                this.parameterValues.get(
                                                    parameter.name
                                                ) || ""
                                            }
                                            onChange={action((value: string) =>
                                                this.parameterValues.set(
                                                    parameter.name,
                                                    value
                                                )
                                            )}
                                            suggestions={suggestions}
                                            errors={this.errors.get(
                                                parameter.name
                                            )}
                                        />
                                    );
                                }
                            )}
                        </PropertyList>
                    </div>
                    <div>
                        <button
                            className="btn btn-secondary btn-sm"
                            onClick={this.copy}
                        >
                            Copy
                        </button>
                        {this.props.appStore.navigationStore
                            .mainNavigationSelectedItem ===
                            this.props.appStore.navigationStore
                                .scriptsNavigationItem &&
                            this.props.appStore.scriptsModel.selectedScript && (
                                <button
                                    className="btn btn-secondary btn-sm ml-2"
                                    onClick={this.copyToScript}
                                >
                                    Copy to script
                                </button>
                            )}
                    </div>
                </div>
            );
        }
    }
);

export const CommandsBrowser = observer(
    class CommandsBrowser extends React.Component<{
        appStore: InstrumentAppStore;
        terminalState: TerminalState;
        host: {
            command: string;
        };
        className?: string;
        style?: React.CSSProperties;
        persistId?: string;
    }> {
        copyCommand = (command: ICommandSyntax, commandParameters: string) => {
            this.props.host.command = makeItShort(command) + commandParameters;
        };

        onSearchChange = (event: any) => {
            const searchText = $(event.target).val() as string;

            if (searchText != this.props.terminalState.searchText) {
                runInAction(() => {
                    this.props.terminalState.searchText = searchText;
                });

                this.props.terminalState.selectFirstNode();
            }
        };

        render() {
            const { commandsTree, selectedNode, selectNode, foundNodes } =
                this.props.terminalState;

            let leftSideBody;
            if (this.props.terminalState.searchText) {
                leftSideBody = (
                    <List nodes={foundNodes} selectNode={selectNode} />
                );
            } else {
                leftSideBody = (
                    <Tree
                        rootNode={commandsTree}
                        selectNode={selectNode}
                        showOnlyChildren={true}
                    />
                );
            }

            let syntax;
            let help;
            if (selectedNode) {
                syntax = (
                    <div className="EezStudio_CommandSyntaxes">
                        {selectedNode.commandSyntax && (
                            <CommandSyntax
                                appStore={this.props.appStore}
                                commandSyntax={selectedNode.commandSyntax}
                                copyCommand={this.copyCommand}
                            />
                        )}
                        {selectedNode.querySyntax && (
                            <CommandSyntax
                                appStore={this.props.appStore}
                                commandSyntax={selectedNode.querySyntax}
                                copyCommand={this.copyCommand}
                            />
                        )}
                    </div>
                );

                let helpLink =
                    (selectedNode.commandSyntax &&
                        selectedNode.commandSyntax.url) ||
                    (selectedNode.querySyntax && selectedNode.querySyntax.url);
                help = helpLink && <iframe src={helpLink} />;
            }

            return (
                <Splitter
                    type="horizontal"
                    sizes="240px|100%"
                    persistId={
                        this.props.persistId ||
                        "instrument/window/commands-browser/splitter1"
                    }
                    className={this.props.className}
                    style={this.props.style}
                >
                    <VerticalHeaderWithBody className="EezStudio_CommandsBrowserTree">
                        <Header>
                            <Icon
                                icon="material:link"
                                title="Link the command input with the documentation browser"
                                onClick={action(() => {
                                    this.props.terminalState.linkCommandInputWithDocumentationBrowser =
                                        !this.props.terminalState
                                            .linkCommandInputWithDocumentationBrowser;
                                })}
                                className={classNames({
                                    selected:
                                        this.props.terminalState
                                            .linkCommandInputWithDocumentationBrowser
                                })}
                            />
                            <SearchInput
                                searchText={
                                    this.props.terminalState.searchText || ""
                                }
                                onClear={action(() => {
                                    this.props.terminalState.searchText = "";
                                })}
                                onChange={this.onSearchChange}
                                onKeyDown={this.onSearchChange}
                            />
                        </Header>
                        <Body tabIndex={0}>{leftSideBody}</Body>
                    </VerticalHeaderWithBody>
                    <Splitter
                        type="horizontal"
                        sizes="400px|100%"
                        persistId="instrument/window/commands-browser/splitter2"
                    >
                        <div className="EezStudio_CommandsBrowserSyntax">
                            {syntax}
                        </div>
                        <div className="EezStudio_CommandsBrowserHelp">
                            {help}
                        </div>
                    </Splitter>
                </Splitter>
            );
        }
    }
);
