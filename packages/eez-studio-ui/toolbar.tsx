import React from "react";
import { observer } from "mobx-react";
import classnames from "classnames";

export const Toolbar = observer(
    class Toolbar extends React.Component<{
        children?: React.ReactNode;
        className?: string;
        style?: React.CSSProperties;
    }> {
        render() {
            let className = classnames(
                "EezStudio_Toolbar",
                this.props.className
            );

            return (
                <div className={className} style={this.props.style}>
                    {this.props.children}
                </div>
            );
        }
    }
);
