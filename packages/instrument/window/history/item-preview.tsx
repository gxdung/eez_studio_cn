import React from "react";
import ReactDOM from "react-dom";
import { observer } from "mobx-react";
import classNames from "classnames";

import { Toolbar } from "eez-studio-ui/toolbar";
import { IconAction } from "eez-studio-ui/action";
import {
    VerticalHeaderWithBody,
    Body,
    Header
} from "eez-studio-ui/header-with-body";

////////////////////////////////////////////////////////////////////////////////

const ZoomedPreview = observer(
    class ZoomedPreview extends React.Component<{
        children?: React.ReactNode;
        toolbar?: React.ReactNode;
        className?: string;
        toggleZoom: (event: React.MouseEvent<HTMLElement>) => void;
        enableUnzoomWithEsc: boolean;
    }> {
        el: HTMLDivElement;

        constructor(props: any) {
            super(props);

            this.el = document.createElement("div");
            this.el.tabIndex = 0;
            this.el.onkeydown = this.onKeyDown;
        }

        componentDidMount() {
            document
                .getElementById("EezStudio_ModalContent")!
                .appendChild(this.el);
            this.el.focus();
        }

        componentWillUnmount() {
            document
                .getElementById("EezStudio_ModalContent")!
                .removeChild(this.el);
        }

        onContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
        };

        onKeyDown = (event: KeyboardEvent) => {
            if (this.props.enableUnzoomWithEsc && event.keyCode == 27) {
                this.props.toggleZoom(event as any);
            }
        };

        render() {
            return ReactDOM.createPortal(
                <VerticalHeaderWithBody
                    className={this.props.className}
                    onContextMenu={this.onContextMenu}
                >
                    <Header className="EezStudio_PanelHeader">
                        {this.props.toolbar || <Toolbar />}
                        <Toolbar>
                            <IconAction
                                icon="material:close"
                                iconSize={24}
                                title="Leave full screen mode"
                                onClick={this.props.toggleZoom}
                            />
                        </Toolbar>
                    </Header>
                    <Body className="EezStudio_ZoomedPreviewBody">
                        {this.props.children}
                    </Body>
                </VerticalHeaderWithBody>,
                this.el
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

const UnzoomedPreview = observer(
    class UnzoomedPreview extends React.Component<{
        children?: React.ReactNode;
        className?: string;
        toggleZoom: (event: React.MouseEvent<HTMLElement>) => void;
    }> {
        render() {
            return (
                <div
                    className={classNames(
                        "EezStudio_UnzoomedPreviewBody",
                        this.props.className
                    )}
                    onClick={this.props.toggleZoom}
                >
                    {this.props.children}
                </div>
            );
        }
    }
);

export const HistoryItemPreview = observer(
    class HistoryItemPreview extends React.Component<{
        children?: React.ReactNode;
        className?: string;
        toolbarWhenZoomed?: React.ReactNode;
        zoom: boolean;
        toggleZoom: () => void;
        enableUnzoomWithEsc: boolean;
    }> {
        toggleZoom = (event: React.MouseEvent<HTMLElement>) => {
            if (this.props.zoom || (!event.shiftKey && !event.ctrlKey)) {
                event.preventDefault();
                event.stopPropagation();

                this.props.toggleZoom();
            }
        };

        render() {
            const className = classNames(
                "EezStudio_ItemPreview",
                this.props.className
            );

            if (this.props.zoom) {
                return (
                    <ZoomedPreview
                        className={className}
                        toggleZoom={this.toggleZoom}
                        toolbar={this.props.toolbarWhenZoomed}
                        enableUnzoomWithEsc={this.props.enableUnzoomWithEsc}
                    >
                        {this.props.children}
                    </ZoomedPreview>
                );
            } else {
                return (
                    <UnzoomedPreview
                        className={className}
                        toggleZoom={this.toggleZoom}
                    >
                        {this.props.children}
                    </UnzoomedPreview>
                );
            }
        }
    }
);
