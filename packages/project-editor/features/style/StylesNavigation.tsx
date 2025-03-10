import React from "react";
import { action, computed, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import classNames from "classnames";
import * as FlexLayout from "flexlayout-react";

import { FlexLayoutContainer } from "eez-studio-ui/FlexLayout";

import { isObjectExists } from "project-editor/store";
import { ProjectContext } from "project-editor/project/context";
import { Style } from "./style";
import { drawText } from "project-editor/flow/editor/eez-gui-draw";
import { LVGLStylesNavigation } from "project-editor/lvgl/style";

import { StylesTreeNavigation } from "project-editor/features/style/StylesTreeNavigation";

////////////////////////////////////////////////////////////////////////////////

export const StylesTab = observer(
    class StylesTab extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        constructor(props: any) {
            super(props);

            makeObservable(this, {});
        }

        render() {
            return this.context.projectTypeTraits.isLVGL ? (
                <LVGLStylesNavigation />
            ) : (
                <StylesNavigation />
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const StylesNavigation = observer(
    class StylesNavigation extends React.Component {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                navigationObject: computed
            });
        }

        get navigationObject() {
            return this.context.project.styles;
        }

        factory = (node: FlexLayout.TabNode) => {
            var component = node.getComponent();

            if (component === "styles") {
                return (
                    <StylesTreeNavigation
                        id={"styles"}
                        navigationObject={this.navigationObject}
                        selectedObject={
                            this.context.navigationStore.selectedStyleObject
                        }
                    />
                );
            }

            if (component === "preview") {
                return <StyleEditor width={480} height={272} text="Hello!" />;
            }

            return null;
        };

        render() {
            return (
                <FlexLayoutContainer
                    model={this.context.layoutModels.styles}
                    factory={this.factory}
                />
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

export function drawStylePreview(
    canvas: HTMLCanvasElement,
    style: Style,
    text: string,
    inverse: boolean
) {
    let ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (ctx) {
        ctx.save();
        if (style.blinkProperty) {
            drawText(
                ctx,
                text,
                0,
                0,
                canvas.width,
                canvas.height,
                style,
                inverse
            );
        } else {
            if (canvas.width > canvas.height) {
                drawText(
                    ctx,
                    text,
                    0,
                    0,
                    canvas.width / 2 - 4,
                    canvas.height,
                    style,
                    false
                );
                drawText(
                    ctx,
                    text,
                    canvas.width / 2 + 4,
                    0,
                    canvas.width / 2 - 4,
                    canvas.height,
                    style,
                    true
                );
            } else {
                drawText(
                    ctx,
                    text,
                    0,
                    0,
                    canvas.width,
                    canvas.height / 2 - 4,
                    style,
                    false
                );
                drawText(
                    ctx,
                    text,
                    0,
                    canvas.height / 2 + 4,
                    canvas.width,
                    canvas.height / 2 - 4,
                    style,
                    true
                );
            }
        }
        ctx.restore();
    }
}

////////////////////////////////////////////////////////////////////////////////

const StyleEditor = observer(
    class StyleEditor extends React.Component<{
        width: number;
        height: number;
        text: string;
    }> {
        static contextType = ProjectContext;
        declare context: React.ContextType<typeof ProjectContext>;

        inverse: boolean = false;
        interval: any;

        constructor(props: any) {
            super(props);

            makeObservable(this, {
                inverse: observable
            });
        }

        componentDidMount(): void {
            this.interval = setInterval(
                action(() => {
                    this.inverse = !this.inverse;
                }),
                400
            );
        }

        componentWillUnmount(): void {
            if (this.interval) {
                clearInterval(this.interval);
            }
        }

        get style() {
            const navigationStore = this.context.navigationStore;

            const style = navigationStore.selectedStyleObject.get();
            if (!style) {
                return undefined;
            }

            if (!isObjectExists(style)) {
                return undefined;
            }

            if (style instanceof Style) {
                return style;
            }

            return undefined;
        }

        render() {
            const { width, height, text } = this.props;

            const style = this.style;
            if (!style) {
                return null;
            }

            if (this.context.projectTypeTraits.isDashboard) {
                return (
                    <div className="EezStudio_StylePreviewContainer">
                        <div
                            className={classNames(
                                "EezStudio_StylePreview",
                                style.classNames
                            )}
                        >
                            {text}
                        </div>
                    </div>
                );
            } else {
                let canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                drawStylePreview(canvas, style, text, this.inverse);

                return (
                    <img
                        className="EezStudio_StyleEditorImg"
                        src={canvas.toDataURL()}
                    />
                );
            }
        }
    }
);
