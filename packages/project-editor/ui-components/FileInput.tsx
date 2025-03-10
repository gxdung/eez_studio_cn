import React from "react";
import { dialog, getCurrentWindow } from "@electron/remote";

import { Icon } from "eez-studio-ui/icon";
import { FieldComponent } from "eez-studio-ui/generic-dialog";
import { ProjectContext } from "project-editor/project/context";

////////////////////////////////////////////////////////////////////////////////

export class RelativeFileInput extends FieldComponent {
    static contextType = ProjectContext;
    declare context: React.ContextType<typeof ProjectContext>;

    onClear = () => {
        this.props.onChange(undefined);
    };

    onSelect = async () => {
        const result = await dialog.showOpenDialog(getCurrentWindow(), {
            properties: ["openFile"],
            filters: this.props.fieldProperties.options.filters
        });

        if (result.filePaths && result.filePaths[0]) {
            this.props.onChange(
                this.context.getFilePathRelativeToProjectPath(
                    result.filePaths[0]
                )
            );
        }
    };

    render() {
        let clearButton: JSX.Element | undefined;

        if (this.props.values[this.props.fieldProperties.name]) {
            clearButton = (
                <button
                    className="btn btn-default"
                    type="button"
                    onClick={this.onClear}
                >
                    <Icon icon="material:close" size={17} />
                </button>
            );
        }

        return (
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    value={
                        this.props.values[this.props.fieldProperties.name] || ""
                    }
                    readOnly
                />
                <>
                    {clearButton}
                    <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={this.onSelect}
                    >
                        &hellip;
                    </button>
                </>
            </div>
        );
    }
}

////////////////////////////////////////////////////////////////////////////////

export class AbsoluteFileInput extends FieldComponent {
    static contextType = ProjectContext;
    declare context: React.ContextType<typeof ProjectContext>;

    onClear = () => {
        this.props.onChange(undefined);
    };

    onSelect = async () => {
        const result = await dialog.showOpenDialog(getCurrentWindow(), {
            properties: ["openFile"],
            filters: this.props.fieldProperties.options.filters
        });

        if (result.filePaths && result.filePaths[0]) {
            this.props.onChange(result.filePaths[0]);
        }
    };

    render() {
        let clearButton: JSX.Element | undefined;

        if (this.props.values[this.props.fieldProperties.name]) {
            clearButton = (
                <button
                    className="btn btn-default"
                    type="button"
                    onClick={this.onClear}
                >
                    <Icon icon="material:close" size={17} />
                </button>
            );
        }

        return (
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    value={
                        this.props.values[this.props.fieldProperties.name] || ""
                    }
                    readOnly
                />
                <>
                    {clearButton}
                    <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={this.onSelect}
                    >
                        &hellip;
                    </button>
                </>
            </div>
        );
    }
}

////////////////////////////////////////////////////////////////////////////////

export class MultipleAbsoluteFileInput extends FieldComponent {
    static contextType = ProjectContext;
    declare context: React.ContextType<typeof ProjectContext>;

    onClear = () => {
        this.props.onChange(undefined);
    };

    onSelect = async () => {
        const result = await dialog.showOpenDialog(getCurrentWindow(), {
            properties: ["openFile", "multiSelections"],
            filters: this.props.fieldProperties.options.filters
        });

        if (result.filePaths && result.filePaths.length > 0) {
            this.props.onChange(result.filePaths);
        }
    };

    get value() {
        const value = this.props.values[this.props.fieldProperties.name];
        if (!value) {
            return "";
        }

        if (value.length > 1) {
            return `${value.length} images selected`;
        }

        return value;
    }

    render() {
        let clearButton: JSX.Element | undefined;

        if (this.props.values[this.props.fieldProperties.name]) {
            clearButton = (
                <button
                    className="btn btn-default"
                    type="button"
                    onClick={this.onClear}
                >
                    <Icon icon="material:close" size={17} />
                </button>
            );
        }

        return (
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    value={this.value}
                    readOnly
                />
                <>
                    {clearButton}
                    <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={this.onSelect}
                    >
                        &hellip;
                    </button>
                </>
            </div>
        );
    }
}

////////////////////////////////////////////////////////////////////////////////

export class AbsoluteFileSaveInput extends FieldComponent {
    static contextType = ProjectContext;
    declare context: React.ContextType<typeof ProjectContext>;

    onClear = () => {
        this.props.onChange(undefined);
    };

    onSelect = async () => {
        const result = await dialog.showSaveDialog(getCurrentWindow(), {
            properties: ["showOverwriteConfirmation"],
            filters: this.props.fieldProperties.options.filters
        });

        if (result.filePath) {
            this.props.onChange(result.filePath);
        }
    };

    render() {
        let clearButton: JSX.Element | undefined;

        if (this.props.values[this.props.fieldProperties.name]) {
            clearButton = (
                <button
                    className="btn btn-default"
                    type="button"
                    onClick={this.onClear}
                >
                    <Icon icon="material:close" size={17} />
                </button>
            );
        }

        return (
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    value={
                        this.props.values[this.props.fieldProperties.name] || ""
                    }
                    readOnly
                />
                <>
                    {clearButton}
                    <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={this.onSelect}
                    >
                        &hellip;
                    </button>
                </>
            </div>
        );
    }
}
