import { observable, makeObservable } from "mobx";

import type {
    IViewOptions,
    IViewOptionsAxesLines,
    IViewOptionsAxesLinesType
} from "eez-studio-ui/chart/chart";

////////////////////////////////////////////////////////////////////////////////

export class ViewOptions implements IViewOptions {
    constructor(props?: any) {
        makeObservable(this, {
            axesLines: observable,
            showAxisLabels: observable,
            showZoomButtons: observable
        });

        if (props) {
            Object.assign(this, props);
        }
    }

    axesLines: IViewOptionsAxesLines = {
        type: "dynamic",
        steps: {
            x: [],
            y: []
        },
        majorSubdivision: {
            horizontal: 24,
            vertical: 8
        },
        minorSubdivision: {
            horizontal: 5,
            vertical: 5
        },
        snapToGrid: true,
        defaultZoomMode: "all"
    };

    showAxisLabels: boolean = true;
    showZoomButtons: boolean = true;

    setAxesLinesType(type: IViewOptionsAxesLinesType) {
        this.axesLines.type = type;
    }

    setAxesLinesMajorSubdivisionHorizontal(value: number) {
        this.axesLines.majorSubdivision.horizontal = value;
    }

    setAxesLinesMajorSubdivisionVertical(value: number) {
        this.axesLines.majorSubdivision.vertical = value;
    }

    setAxesLinesMinorSubdivisionHorizontal(value: number) {
        this.axesLines.minorSubdivision.horizontal = value;
    }

    setAxesLinesMinorSubdivisionVertical(value: number) {
        this.axesLines.minorSubdivision.vertical = value;
    }

    setAxesLinesStepsX(steps: number[]) {
        if (!this.axesLines.steps) {
            this.axesLines.steps = {
                x: [],
                y: []
            };
        }
        this.axesLines.steps.x = steps;
    }

    setAxesLinesStepsY(index: number, steps: number[]): void {
        if (!this.axesLines.steps) {
            this.axesLines.steps = {
                x: [],
                y: []
            };
        }
        this.axesLines.steps.y[index] = steps;
    }

    setAxesLinesSnapToGrid(value: boolean): void {
        this.axesLines.snapToGrid = value;
    }

    setShowAxisLabels(value: boolean) {
        this.showAxisLabels = value;
    }

    setShowZoomButtons(value: boolean) {
        this.showZoomButtons = value;
    }
}
