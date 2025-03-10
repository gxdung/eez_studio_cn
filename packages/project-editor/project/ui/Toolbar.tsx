import React from "react";
import ReactDOM from "react-dom";
import {
    action,
    computed,
    makeObservable,
    observable,
    runInAction
} from "mobx";
import { observer } from "mobx-react";
import { ButtonAction, IconAction } from "eez-studio-ui/action";
import { BuildConfiguration } from "project-editor/project/project";
import { ProjectContext } from "project-editor/project/context";
import { PageTabState } from "project-editor/features/page/PageEditor";
import {
    getChildren,
    getObjectIcon,
    objectToString
} from "project-editor/store";
import { RenderVariableStatus } from "project-editor/features/variable/global-variable-status";
import { FlowTabState } from "project-editor/flow/flow-tab-state";
import { RuntimeType } from "project-editor/project/project-type-traits";
import {
    PROJECT_EDITOR_SCRAPBOOK,
    RUN_ICON
} from "project-editor/ui-components/icons";
import { getEditorComponent } from "./EditorComponentFactory";
import { getId } from "project-editor/core/object";
import type { IObjectVariableValue } from "eez-studio-types";
import { getObjectVariableTypeFromType } from "project-editor/features/variable/value-type";
import {
    isScrapbookItemFilePath,
    showScrapbookManager,
    model as scrapbookModel
} from "project-editor/store/scrapbook";
import { closest } from "eez-studio-shared/dom";
import { Icon } from "eez-studio-ui/icon";

////////////////////////////////////////////////////////////////////////////////

export const Toolbar = observer(
    class Toolbar extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        get globalVariableStatuses() {
            let globalVariablesStatus: React.ReactNode[] = [];

            for (const variable of this.context.project.allGlobalVariables) {
                const objectVariableType = getObjectVariableTypeFromType(
                    this.context,
                    variable.type
                );
                if (objectVariableType) {
                    let objectVariableValue: IObjectVariableValue | undefined =
                        this.context.dataContext.get(variable.fullName);

                    if (objectVariableValue) {
                        const managedValue = objectVariableType.getValue
                            ? objectVariableType.getValue(objectVariableValue)
                            : undefined;
                        if (managedValue) {
                            objectVariableValue = managedValue;
                        }
                    }

                    globalVariablesStatus.push(
                        <RenderVariableStatus
                            key={variable.fullName}
                            variable={variable}
                            value={objectVariableValue}
                            onClick={async () => {
                                if (objectVariableType.editConstructorParams) {
                                    const constructorParams =
                                        await objectVariableType.editConstructorParams(
                                            variable,
                                            objectVariableValue?.constructorParams ||
                                                objectVariableValue,
                                            true
                                        );
                                    if (constructorParams !== undefined) {
                                        this.context.runtime!.setObjectVariableValue(
                                            variable.fullName,
                                            objectVariableType.createValue(
                                                constructorParams,
                                                true
                                            )
                                        );
                                    }
                                }
                            }}
                        />
                    );
                }
            }

            return globalVariablesStatus;
        }

        render() {
            const showEditorButtons =
                this.context.context.type != "run-tab" &&
                !this.context.project._isDashboardBuild &&
                !(
                    this.context.runtime &&
                    !this.context.runtime.isDebuggerActive
                );

            const showRunEditSwitchControls =
                this.context.context.type != "run-tab" &&
                !this.context.project._isDashboardBuild &&
                this.context.projectTypeTraits.runtimeType != RuntimeType.NONE;

            const globalVariablesStatuses = this.context.runtime
                ? this.globalVariableStatuses
                : [];

            if (
                !showEditorButtons &&
                !showRunEditSwitchControls &&
                globalVariablesStatuses.length == 0
            ) {
                return null;
            }

            return (
                <nav className="navbar justify-content-between EezStudio_ProjectEditor_ToolbarNav">
                    {showEditorButtons ? <EditorButtons /> : <div />}

                    {showRunEditSwitchControls ? (
                        <RunEditSwitchControls />
                    ) : (
                        <div />
                    )}

                    <div className="EezStudio_ProjectEditor_ToolbarNav_FlowRuntimeControls">
                        {globalVariablesStatuses}
                    </div>
                </nav>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const EditorButtons = observer(
    class EditorButtons extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                featureItems: computed
            });
        }

        setFrontFace = action((enabled: boolean) => {
            if (this.pageTabState) {
                this.pageTabState.frontFace = enabled;
            }
        });

        get pageTabState() {
            const editorState = this.context.editorsStore.activeEditor?.state;
            if (editorState instanceof PageTabState) {
                return editorState as PageTabState;
            }
            return undefined;
        }

        get flowTabState() {
            const editorState = this.context.editorsStore.activeEditor?.state;
            if (editorState instanceof FlowTabState) {
                return editorState as FlowTabState;
            }
            return undefined;
        }

        get isBuildConfigurationSelectorVisible() {
            return false;
        }

        onSelectedBuildConfigurationChange(event: any) {
            this.context.uiStateStore.setSelectedBuildConfiguration(
                event.target.value
            );
        }

        toggleShowTimeline = action(() => {
            if (this.pageTabState) {
                this.pageTabState.timeline.isEditorActive =
                    !this.pageTabState.timeline.isEditorActive;
            }
        });

        get isShowTimeline() {
            if (this.pageTabState) {
                return this.pageTabState.timeline.isEditorActive;
            }
            return false;
        }

        get featureItems() {
            if (this.context.runtime) {
                return undefined;
            }

            let featureItems = getChildren(this.context.project).filter(
                object =>
                    getObjectIcon(object) &&
                    getEditorComponent(object, undefined) &&
                    !(
                        object == this.context.project.userPages ||
                        object == this.context.project.userWidgets ||
                        object == this.context.project.actions ||
                        object == this.context.project.variables ||
                        object == this.context.project.styles ||
                        object == this.context.project.lvglStyles ||
                        object == this.context.project.fonts ||
                        object == this.context.project.bitmaps ||
                        object == this.context.project.texts ||
                        object == this.context.project.scpi ||
                        object == this.context.project.extensionDefinitions ||
                        object == this.context.project.changes
                    )
            );

            // push Settings to the end
            if (featureItems) {
                const settingsIndex = featureItems.findIndex(
                    item => item == this.context.project.settings
                );
                if (settingsIndex != -1) {
                    featureItems.splice(settingsIndex, 1);
                    featureItems.push(this.context.project.settings);
                }
            }

            return featureItems;
        }

        render() {
            let configurations =
                this.context.project.settings.build.configurations.map(
                    (item: BuildConfiguration) => {
                        return (
                            <option key={item.name} value={item.name}>
                                {objectToString(item)}
                            </option>
                        );
                    }
                );

            return (
                <div className="EezStudio_ProjectEditor_ToolbarNav_EditorButtons">
                    {!this.context.runtime && (
                        <div className="btn-group" role="group">
                            <IconAction
                                title="保存"
                                icon="material:save"
                                onClick={() => this.context.save()}
                                enabled={this.context.isModified}
                            />
                        </div>
                    )}

                    {!this.context.runtime && (
                        <>
                            <div className="btn-group" role="group">
                                <IconAction
                                    title={
                                        this.context.undoManager.canUndo
                                            ? `撤销 "${this.context.undoManager.undoDescription}"`
                                            : ""
                                    }
                                    icon="material:undo"
                                    onClick={() =>
                                        this.context.undoManager.undo()
                                    }
                                    enabled={this.context.undoManager.canUndo}
                                />
                                <IconAction
                                    title={
                                        this.context.undoManager.canRedo
                                            ? `重做 "${this.context.undoManager.redoDescription}"`
                                            : ""
                                    }
                                    icon="material:redo"
                                    onClick={() =>
                                        this.context.undoManager.redo()
                                    }
                                    enabled={this.context.undoManager.canRedo}
                                />
                            </div>

                            <div className="btn-group" role="group">
                                {false && (
                                    <IconAction
                                        title="剪切"
                                        icon="material:content_cut"
                                        iconSize={22}
                                        onClick={this.context.cut}
                                        enabled={this.context.canCut}
                                    />
                                )}
                                <IconAction
                                    title="复制"
                                    icon="material:content_copy"
                                    iconSize={22}
                                    onClick={this.context.copy}
                                    enabled={this.context.canCopy}
                                />
                                <IconAction
                                    title="粘贴"
                                    icon="material:content_paste"
                                    iconSize={22}
                                    onClick={this.context.paste}
                                    enabled={this.context.canPaste}
                                />
                            </div>
                            <div className="btn-group" role="group">
                                <IconAction
                                    title="Scrapbook"
                                    icon={PROJECT_EDITOR_SCRAPBOOK}
                                    iconSize={24}
                                    onClick={() => showScrapbookManager()}
                                    selected={scrapbookModel.isVisible}
                                />
                            </div>
                        </>
                    )}

                    {!this.context.runtime &&
                        this.isBuildConfigurationSelectorVisible && (
                            <div className="btn-group">
                                <select
                                    title="配置"
                                    id="btn-toolbar-configuration"
                                    className="form-select"
                                    value={
                                        this.context.uiStateStore
                                            .selectedBuildConfiguration
                                    }
                                    onChange={this.onSelectedBuildConfigurationChange.bind(
                                        this
                                    )}
                                >
                                    {configurations}
                                </select>
                            </div>
                        )}

                    {!this.context.runtime && (
                        <div className="btn-group" role="group">
                            {!this.context.projectTypeTraits.isDashboard && (
                                <IconAction
                                    title="校验"
                                    icon="material:check"
                                    onClick={() => this.context.check()}
                                    enabled={this.context.project._fullyLoaded}
                                />
                            )}
                            {!(
                                this.context.filePath &&
                                isScrapbookItemFilePath(this.context.filePath)
                            ) && (
                                <IconAction
                                    title="编译"
                                    icon="material:build"
                                    onClick={() => this.context.build()}
                                    enabled={this.context.project._fullyLoaded}
                                />
                            )}
                        </div>
                    )}

                    {this.context.projectTypeTraits.isResource &&
                        this.context.project.micropython && (
                            <div className="btn-group" role="group">
                                <IconAction
                                    title="运行 Micropython 脚本"
                                    icon={RUN_ICON}
                                    iconSize={28}
                                    onClick={() =>
                                        this.context.project.micropython.runScript()
                                    }
                                    enabled={this.context.project._fullyLoaded}
                                />
                            </div>
                        )}

                    {this.context.projectTypeTraits.hasFlowSupport && (
                        <>
                            {this.pageTabState && (
                                <>
                                    <div className="btn-group" role="group">
                                        <IconAction
                                            title="隐藏流程视图"
                                            icon="material:flip_to_front"
                                            iconSize={20}
                                            onClick={() =>
                                                this.setFrontFace(true)
                                            }
                                            selected={
                                                this.pageTabState.frontFace
                                            }
                                        />
                                        <IconAction
                                            title="显示流程视图"
                                            icon="material:flip_to_back"
                                            iconSize={20}
                                            onClick={() =>
                                                this.setFrontFace(false)
                                            }
                                            selected={
                                                !this.pageTabState.frontFace
                                            }
                                        />
                                    </div>

                                    {!this.flowTabState?.flowState && (
                                        <div className="btn-group" role="group">
                                            <IconAction
                                                title="显示时间轴"
                                                icon={
                                                    <svg viewBox="0 0 551 372">
                                                        <path d="M42.4631 336.4972H204.996v-42.4224h-65.4195v-60.132h65.4195v-42.4495H0l.0008 145.005zm-.0045-102.5747H99.046v60.132H42.4586zm233.9184-42.4632v42.4405h61.8929v60.132h-61.893v42.4405h61.352l42.4247.009h171.5298v-145.013zM442.0555 294.007h-61.893v-60.132h61.893zm67.1986 0h-24.74v-60.132h24.74z" />
                                                        <path d="M348.4318 42.4321c0-10.8489-4.1291-21.7155-12.4228-30.0003C327.7332 4.138 316.8667.009 306.0177.009L176.8741 0c-10.849 0-21.7243 4.129-30.0185 12.4227-8.2757 8.2937-12.7264 19.1555-12.4227 30.0004v53.5542l85.791 54.0862v221.6388h42.4495V150.0637l85.7751-54.0861.009-53.5362z" />
                                                    </svg>
                                                }
                                                iconSize={24}
                                                onClick={() =>
                                                    this.toggleShowTimeline()
                                                }
                                                selected={this.isShowTimeline}
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {(this.flowTabState ||
                                (this.pageTabState &&
                                    !this.pageTabState.frontFace)) && (
                                <div className="btn-group" role="group">
                                    <IconAction
                                        title="显示组件描述"
                                        icon="material:comment"
                                        iconSize={20}
                                        onClick={action(
                                            () =>
                                                (this.context.uiStateStore.showComponentDescriptions =
                                                    !this.context.uiStateStore
                                                        .showComponentDescriptions)
                                        )}
                                        selected={
                                            this.context.uiStateStore
                                                .showComponentDescriptions
                                        }
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {!this.context.runtime &&
                        this.context.project.texts?.languages.length > 0 && (
                            <div className="btn-group" role="group">
                                <SelectLanguage />
                            </div>
                        )}

                    {this.featureItems && (
                        <div className="btn-group" role="group">
                            {this.featureItems.map(featureItem => {
                                const title = objectToString(featureItem);

                                let icon = getObjectIcon(featureItem);

                                const editorComponent = getEditorComponent(
                                    featureItem,
                                    undefined
                                )!;

                                const onClick = action(() => {
                                    if (editorComponent) {
                                        this.context.editorsStore.openEditor(
                                            editorComponent.object,
                                            editorComponent.subObject
                                        );
                                    }
                                });

                                const isActive =
                                    editorComponent &&
                                    this.context.editorsStore.activeEditor &&
                                    this.context.editorsStore.getEditorByObject(
                                        editorComponent.object
                                    ) == this.context.editorsStore.activeEditor;

                                return (
                                    <IconAction
                                        key={getId(featureItem)}
                                        title={title}
                                        icon={icon}
                                        onClick={onClick}
                                        enabled={!isActive}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {this.pageTabState && (
                        <PageZoomButton pageTabState={this.pageTabState} />
                    )}
                </div>
            );
        }
    }
);

const SelectLanguage = observer(
    class SelectLanguage extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        render() {
            return (
                <select
                    className="form-select"
                    value={
                        this.context.uiStateStore.selectedLanguage.languageID
                    }
                    onChange={action(
                        (event: React.ChangeEvent<HTMLSelectElement>) =>
                            (this.context.uiStateStore.selectedLanguageID =
                                event.currentTarget.value)
                    )}
                    style={{ width: "fit-content" }}
                >
                    {this.context.project.texts.languages.map(language => (
                        <option
                            key={language.languageID}
                            value={language.languageID}
                        >
                            {language.languageID}
                        </option>
                    ))}
                </select>
            );
        }
    }
);

const PageZoomButton = observer(
    class PageZoomButton extends React.Component<{
        pageTabState: PageTabState;
    }> {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        buttonRef = React.createRef<HTMLButtonElement>();

        dropDownRef = React.createRef<HTMLDivElement>();

        dropDownOpen: boolean | undefined = false;
        dropDownLeft = 0;
        dropDownTop = 0;
        dropDownWidth = 0;

        zoomInput: string | undefined;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                dropDownOpen: observable,
                dropDownLeft: observable,
                dropDownTop: observable,
                dropDownWidth: observable,
                zoomInput: observable
            });
        }

        get zoom() {
            return this.globalZoom
                ? this.context.uiStateStore.flowZoom
                : this.props.pageTabState.transform.scale;
        }

        set zoom(value: number) {
            runInAction(() => {
                this.context.uiStateStore.flowZoom = value;
            });

            if (!this.globalZoom) {
                const newTransform = this.props.pageTabState.transform.clone();
                newTransform.scale = value;
                runInAction(() => {
                    this.props.pageTabState.transform = newTransform;
                });
            }
        }

        get globalZoom() {
            return this.context.uiStateStore.globalFlowZoom;
        }

        set globalZoom(value: boolean) {
            runInAction(() => {
                if (value) {
                    this.context.uiStateStore.flowZoom = this.zoom;
                } else {
                    for (const page of this.context.project.pages) {
                        if (page == this.props.pageTabState.flow) {
                            const newTransform =
                                this.props.pageTabState.transform.clone();
                            newTransform.scale = this.zoom;
                            runInAction(() => {
                                this.props.pageTabState.transform =
                                    newTransform;
                            });
                        } else {
                            let uiState =
                                this.context.uiStateStore.getObjectUIState(
                                    page,
                                    "flow-state"
                                );

                            if (!uiState) {
                                uiState = {};
                            }

                            uiState.transform = {
                                translate: uiState.transform?.translate,
                                scale: this.zoom
                            };

                            runInAction(() => {
                                this.context.uiStateStore.updateObjectUIState(
                                    page,
                                    "flow-state",
                                    uiState
                                );
                            });
                        }
                    }
                }

                this.context.uiStateStore.globalFlowZoom = value;
            });
        }

        setDropDownOpen = action((open: boolean) => {
            if (this.dropDownOpen === false) {
                document.removeEventListener(
                    "pointerdown",
                    this.onDocumentPointerDown,
                    true
                );
            }

            this.dropDownOpen = open;

            if (this.dropDownOpen) {
                document.addEventListener(
                    "pointerdown",
                    this.onDocumentPointerDown,
                    true
                );
            }
        });

        openDropdown = action(() => {
            const buttonEl = this.buttonRef.current;
            if (!buttonEl) {
                return;
            }

            const dropDownEl = this.dropDownRef.current;
            if (!dropDownEl) {
                return;
            }

            this.setDropDownOpen(!this.dropDownOpen);

            if (this.dropDownOpen) {
                const rectInputGroup =
                    buttonEl.parentElement!.getBoundingClientRect();

                this.dropDownLeft = rectInputGroup.left;
                this.dropDownTop = rectInputGroup.bottom;
                this.dropDownWidth = rectInputGroup.width;

                if (
                    this.dropDownLeft + this.dropDownWidth >
                    window.innerWidth
                ) {
                    this.dropDownLeft = window.innerWidth - this.dropDownWidth;
                }

                const DROP_DOWN_HEIGHT = 270;
                if (
                    this.dropDownTop + DROP_DOWN_HEIGHT + 20 >
                    window.innerHeight
                ) {
                    this.dropDownTop =
                        window.innerHeight - (DROP_DOWN_HEIGHT + 20);
                }
            }
        });

        onDocumentPointerDown = action((event: MouseEvent) => {
            if (this.dropDownOpen) {
                if (
                    !closest(
                        event.target,
                        el =>
                            this.buttonRef.current == el ||
                            this.dropDownRef.current == el
                    )
                ) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.setDropDownOpen(false);
                }
            }
        });

        render() {
            const portal = ReactDOM.createPortal(
                <div
                    ref={this.dropDownRef}
                    className="dropdown-menu dropdown-menu-end EezStudio_PageZoomButton_DropdownContent shadow rounded"
                    style={{
                        display: this.dropDownOpen ? "block" : "none",
                        left: this.dropDownLeft,
                        top: this.dropDownTop,
                        width: this.dropDownWidth
                    }}
                >
                    <ul>
                        <div className="EezStudio_PageZoomButton_DropdownContent_ZoomInput">
                            <input
                                type="text"
                                className="form-control"
                                value={
                                    this.zoomInput ??
                                    `${Math.round(this.zoom * 100)}%`
                                }
                                onChange={action(event => {
                                    this.zoomInput = event.target.value;
                                })}
                                onKeyDown={event => {
                                    if (event.key === "Enter") {
                                        let value = parseInt(
                                            this.zoomInput!.replace("%", "")
                                        );
                                        if (value) {
                                            if (value < 5) value = 5;
                                            else if (value > 1600) value = 1600;

                                            this.zoom = value / 100;
                                        }
                                        this.zoomInput = undefined;
                                        this.setDropDownOpen(false);
                                    }
                                }}
                            />
                        </div>
                        <hr className="dropdown-divider" />
                        {[10, 25, 50, 75, 100, 150, 200, 400, 800, 1600].map(
                            zoom => (
                                <li
                                    key={zoom}
                                    className="EezStudio_PageZoomButton_DropdownContent_MenuItem"
                                    onClick={() => {
                                        this.zoom = zoom / 100;
                                        this.setDropDownOpen(false);
                                    }}
                                >
                                    缩放到 {zoom}%
                                </li>
                            )
                        )}
                        <hr className="dropdown-divider" />
                        <li
                            className="EezStudio_PageZoomButton_DropdownContent_Checkmark"
                            onClick={() => {
                                this.globalZoom = !this.globalZoom;
                                this.setDropDownOpen(false);
                            }}
                        >
                            {this.globalZoom ? (
                                <Icon icon="material:check_box" size={20} />
                            ) : (
                                <Icon
                                    icon="material:check_box_outline_blank"
                                    size={20}
                                />
                            )}
                            <span style={{ paddingLeft: 2 }}>全局缩放</span>
                        </li>
                    </ul>
                </div>,
                document.body
            );

            return (
                <div className="btn-group" role="group">
                    <button
                        ref={this.buttonRef}
                        className="btn btn-primary dropdown-toggle EezStudio_PageZoomButton"
                        type="button"
                        onClick={this.openDropdown}
                    >
                        {Math.round(this.zoom * 100)}%
                    </button>
                    {portal}
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const RunEditSwitchControls = observer(
    class RunEditSwitchControls extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        render() {
            const iconSize = 20;
            return (
                <div className="EezStudio_ProjectEditor_ToolbarNav_RunEditSwitchControls">
                    <ButtonAction
                        text="编辑"
                        title="进入编辑模式 (Shift+F5)"
                        icon="material:mode_edit"
                        iconSize={iconSize}
                        onClick={this.context.onSetEditorMode}
                        selected={!this.context.runtime}
                    />

                    <ButtonAction
                        text="运行"
                        title="进入运行模式 (F5)"
                        icon={RUN_ICON}
                        iconSize={iconSize}
                        onClick={this.context.onSetRuntimeMode}
                        selected={
                            this.context.runtime &&
                            !this.context.runtime.isDebuggerActive
                        }
                    />

                    <ButtonAction
                        text="调试"
                        title="进入调试模式 (Ctrl+F5)"
                        icon={
                            <svg
                                viewBox="0 0 1024 1024"
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                p-id="2629"
                                width="40"
                                height="40"
                            >
                                <path
                                    d="M1022.06544 583.40119c0 11.0558-4.034896 20.61962-12.111852 28.696576-8.077979 8.077979-17.639752 12.117992-28.690436 12.117992L838.446445 624.215758c0 72.690556-14.235213 134.320195-42.718941 184.89915l132.615367 133.26312c8.076956 8.065699 12.117992 17.634636 12.117992 28.690436 0 11.050684-4.034896 20.614503-12.117992 28.691459-7.653307 8.065699-17.209964 12.106736-28.690436 12.106736-11.475356 0-21.040199-4.041036-28.690436-12.106736L744.717737 874.15318c-2.124384 2.118244-5.308913 4.88424-9.558703 8.283664-4.259 3.3984-13.180184 9.463536-26.78504 18.171871-13.598716 8.715499-27.415396 16.473183-41.439808 23.276123-14.029528 6.797823-31.462572 12.966313-52.289923 18.49319-20.827351 5.517667-41.446971 8.28571-61.842487 8.28571L552.801776 379.38668l-81.611739 0 0 571.277058c-21.668509 0-43.250036-2.874467-64.707744-8.615215-21.473057-5.734608-39.960107-12.749372-55.476499-21.039175-15.518438-8.289804-29.541827-16.572444-42.077328-24.867364-12.541641-8.290827-21.781072-15.193027-27.739784-20.714787l-9.558703-8.93244L154.95056 998.479767c-8.500605 8.921183-18.699897 13.386892-30.606065 13.386892-10.201339 0-19.335371-3.40454-27.409257-10.202363-8.079002-7.652284-12.437264-17.10968-13.080923-28.372188-0.633427-11.263531 2.659573-21.143553 9.893324-29.647227l128.787178-144.727219c-24.650423-48.464805-36.980239-106.699114-36.980239-174.710091L42.738895 624.207571c-11.057847 0-20.61655-4.041036-28.690436-12.111852-8.079002-8.082072-12.120039-17.640776-12.120039-28.696576 0-11.050684 4.041036-20.61962 12.120039-28.689413 8.073886-8.072863 17.632589-12.107759 28.690436-12.107759l142.81466 0L185.553555 355.156836l-110.302175-110.302175c-8.074909-8.077979-12.113899-17.640776-12.113899-28.691459 0-11.04966 4.044106-20.61962 12.113899-28.690436 8.071839-8.076956 17.638729-12.123109 28.691459-12.123109 11.056823 0 20.612457 4.052293 28.692482 12.123109l110.302175 110.302175 538.128077 0 110.303198-110.302175c8.070816-8.076956 17.632589-12.123109 28.690436-12.123109 11.050684 0 20.617573 4.052293 28.689413 12.123109 8.077979 8.070816 12.119015 17.640776 12.119015 28.690436 0 11.050684-4.041036 20.614503-12.119015 28.691459l-110.302175 110.302175 0 187.448206 142.815683 0c11.0558 0 20.618597 4.034896 28.690436 12.113899 8.076956 8.069793 12.117992 17.638729 12.117992 28.683273l0 0L1022.06544 583.40119 1022.06544 583.40119zM716.021162 216.158085 307.968605 216.158085c0-56.526411 19.871583-104.667851 59.616796-144.414087 39.733956-39.746236 87.88256-59.611679 144.411017-59.611679 56.529481 0 104.678084 19.865443 144.413064 59.611679C696.156742 111.48921 716.021162 159.631674 716.021162 216.158085L716.021162 216.158085 716.021162 216.158085 716.021162 216.158085z"
                                    fill="currentColor"
                                    p-id="2630"
                                ></path>
                            </svg>
                        }
                        iconSize={iconSize}
                        onClick={this.context.onSetDebuggerMode}
                        selected={
                            this.context.runtime &&
                            this.context.runtime.isDebuggerActive
                        }
                        attention={
                            !!(
                                this.context.runtime &&
                                this.context.runtime.error
                            )
                        }
                    />
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////
