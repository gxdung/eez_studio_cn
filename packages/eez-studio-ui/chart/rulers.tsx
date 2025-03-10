import React from "react";
import {
    action,
    autorun,
    computed,
    observable,
    runInAction,
    makeObservable
} from "mobx";
import { observer } from "mobx-react";
import classNames from "classnames";
import { range } from "lodash";

import { closestByClass } from "eez-studio-shared/dom";

import { Checkbox } from "eez-studio-ui/properties";
import { IconAction } from "eez-studio-ui/action";

import type {
    IAxisController,
    IChartsController,
    IChartView,
    ICursor,
    MouseHandler
} from "eez-studio-ui/chart/chart";
import { globalViewOptions } from "eez-studio-ui/chart/GlobalViewOptions";

import { isArray } from "eez-studio-shared/util";

export interface IRulersController {
    rulersModel: IRulersModel;
    chartsController: IChartsController;
    render(chartView: IChartView): React.ReactNode;
    onDragStart(
        chartView: IChartView,
        event: PointerEvent
    ): MouseHandler | undefined;
    snapToSample(x: number): number;
}

export interface IRulersModel {
    xAxisRulersEnabled: boolean;
    x1: number;
    x2: number;
    yAxisRulersEnabled: boolean[];
    y1: number[];
    y2: number[];
    pauseDbUpdate?: boolean;
    initYRulers(numCharts: number): void;
}

export function getSnapToValue(
    event: PointerEvent | undefined,
    value: number,
    axisController: IAxisController
): number {
    let snapValue: number | undefined = undefined;

    if (
        !(event && event.shiftKey) &&
        axisController.chartsController.viewOptions.axesLines.snapToGrid
    ) {
        axisController.ticks.forEach(tick => {
            if (
                tick.allowSnapTo &&
                (snapValue === undefined ||
                    Math.abs(value - tick.value) < Math.abs(value - snapValue))
            ) {
                snapValue = tick.value;
            }
        });
    }

    return snapValue !== undefined ? snapValue : value;
}

export class RulersController {
    constructor(
        public chartsController: IChartsController,
        public rulersModel: IRulersModel
    ) {
        makeObservable(this, {
            x1: computed,
            x2: computed,
            color: computed,
            fillOpacity: computed
        });
    }

    get x1() {
        return (
            Math.round(
                this.chartsController.chartLeft +
                    this.chartsController.xAxisController.valueToPx(
                        this.rulersModel.x1
                    )
            ) + 0.5
        );
    }

    get x2() {
        return (
            Math.round(
                this.chartsController.chartLeft +
                    this.chartsController.xAxisController.valueToPx(
                        this.rulersModel.x2
                    )
            ) + 0.5
        );
    }

    getY1(chartIndex: number) {
        return (
            Math.round(
                this.chartsController.chartBottom -
                    this.chartsController.chartControllers[
                        chartIndex
                    ].yAxisController.valueToPx(this.rulersModel.y1[chartIndex])
            ) + 0.5
        );
    }

    getY2(chartIndex: number) {
        return (
            Math.round(
                this.chartsController.chartBottom -
                    this.chartsController.chartControllers[
                        chartIndex
                    ].yAxisController.valueToPx(this.rulersModel.y2[chartIndex])
            ) + 0.5
        );
    }

    onDragStart(
        chartView: IChartView,
        event: PointerEvent
    ): MouseHandler | undefined {
        if (closestByClass(event.target, "EezStudio_ChartRuler_x1rect")) {
            return new DragXRulerMouseHandler(this, "x1");
        }

        if (closestByClass(event.target, "EezStudio_ChartRuler_x2rect")) {
            return new DragXRulerMouseHandler(this, "x2");
        }

        if (closestByClass(event.target, "EezStudio_ChartRuler_y1rect")) {
            return new DragYRulerMouseHandler(chartView, "y1");
        }

        if (closestByClass(event.target, "EezStudio_ChartRuler_y2rect")) {
            return new DragYRulerMouseHandler(chartView, "y2");
        }

        if (closestByClass(event.target, "EezStudio_ChartRuler_xrect")) {
            return new DragXRulerMouseHandler(this, "both");
        }

        if (closestByClass(event.target, "EezStudio_ChartRuler_yrect")) {
            return new DragYRulerMouseHandler(chartView, "both");
        }

        if (this.rulersModel.xAxisRulersEnabled) {
            return new DragXRulerMouseHandler(this, "none");
        } else if (
            chartView.props.chartController.chartIndex <
                this.rulersModel.yAxisRulersEnabled.length &&
            this.rulersModel.yAxisRulersEnabled[
                chartView.props.chartController.chartIndex
            ]
        ) {
            return new DragYRulerMouseHandler(chartView, "none");
        }

        return undefined;
    }

    static LINE_WIDTH = 2;
    static BAND_WIDTH = 8;

    get color() {
        return globalViewOptions.blackBackground ? "#d4e5f3" : "#337BB7";
    }

    get fillOpacity() {
        return globalViewOptions.blackBackground ? 0.2 : 0.1;
    }

    renderXRulersRect(chartView: IChartView) {
        if (!this.rulersModel.xAxisRulersEnabled) {
            return null;
        }

        let x1 = this.x1;
        let x2 = this.x2;
        if (x1 > x2) {
            const temp = x1;
            x1 = x2;
            x2 = temp;
        }

        const y1 = this.chartsController.chartTop;
        const y2 = this.chartsController.chartBottom;

        return (
            <g clipPath={`url(#${chartView.clipId})`}>
                <rect
                    className="EezStudio_ChartRuler_xrect"
                    x={x1}
                    y={y1}
                    width={x2 - x1}
                    height={y2 - y1}
                    fillOpacity={this.fillOpacity}
                    fill={this.color}
                    style={{ cursor: "move" }}
                />
            </g>
        );
    }

    renderXRulersLines(chartView: IChartView) {
        if (!this.rulersModel.xAxisRulersEnabled) {
            return null;
        }

        const x1 = this.x1;
        const x2 = this.x2;

        const y1 = this.chartsController.chartTop;
        const y2 = this.chartsController.chartBottom;

        return (
            <g clipPath={`url(#${chartView.clipId})`}>
                <line
                    x1={x1}
                    y1={y1}
                    x2={x1}
                    y2={y2}
                    stroke={this.color}
                    strokeWidth={RulersController.LINE_WIDTH}
                />
                <rect
                    className="EezStudio_ChartRuler_x1rect"
                    x={x1 - RulersController.BAND_WIDTH / 2}
                    y={y1}
                    width={RulersController.BAND_WIDTH}
                    height={y2 - y1}
                    fillOpacity={0}
                    style={{ cursor: "ew-resize" }}
                />

                <line
                    x1={x2}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={this.color}
                    strokeWidth={RulersController.LINE_WIDTH}
                />
                <rect
                    className="EezStudio_ChartRuler_x2rect"
                    x={x2 - RulersController.BAND_WIDTH / 2}
                    y={y1}
                    width={RulersController.BAND_WIDTH}
                    height={y2 - y1}
                    fillOpacity={0}
                    style={{ cursor: "ew-resize" }}
                />
            </g>
        );
    }

    renderYRulersRect(chartView: IChartView) {
        const chartIndex = chartView.props.chartController.chartIndex;

        if (
            chartIndex >= this.rulersModel.yAxisRulersEnabled.length ||
            !this.rulersModel.yAxisRulersEnabled[chartIndex]
        ) {
            return null;
        }

        let y1 = this.getY1(chartIndex);
        let y2 = this.getY2(chartIndex);
        if (y1 < y2) {
            const temp = y1;
            y1 = y2;
            y2 = temp;
        }

        const x1 = this.chartsController.chartLeft;
        const x2 = this.chartsController.chartRight;

        return (
            <g clipPath={`url(#${chartView.clipId})`}>
                <rect
                    className="EezStudio_ChartRuler_yrect"
                    x={x1}
                    y={y2}
                    width={x2 - x1}
                    height={y1 - y2}
                    fillOpacity={this.fillOpacity}
                    fill={this.color}
                    style={{ cursor: "move" }}
                />
            </g>
        );
    }

    renderYRulersLines(chartView: IChartView) {
        const chartIndex = chartView.props.chartController.chartIndex;

        if (
            chartIndex >= this.rulersModel.yAxisRulersEnabled.length ||
            !this.rulersModel.yAxisRulersEnabled[chartIndex]
        ) {
            return null;
        }

        const y1 = this.getY1(chartIndex);
        const y2 = this.getY2(chartIndex);

        const x1 = this.chartsController.chartLeft;
        const x2 = this.chartsController.chartRight;

        return (
            <g clipPath={`url(#${chartView.clipId})`}>
                <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y1}
                    stroke={this.color}
                    strokeWidth={RulersController.LINE_WIDTH}
                />
                <rect
                    className="EezStudio_ChartRuler_y1rect"
                    x={x1}
                    y={y1 - RulersController.BAND_WIDTH / 2}
                    width={x2 - x1}
                    height={RulersController.BAND_WIDTH}
                    fillOpacity={0}
                    style={{ cursor: "ns-resize" }}
                />

                <line
                    x1={x1}
                    y1={y2}
                    x2={x2}
                    y2={y2}
                    stroke={this.color}
                    strokeWidth={RulersController.LINE_WIDTH}
                />
                <rect
                    className="EezStudio_ChartRuler_y2rect"
                    x={x1}
                    y={y2 - RulersController.BAND_WIDTH / 2}
                    width={x2 - x1}
                    height={RulersController.BAND_WIDTH}
                    fillOpacity={0}
                    style={{ cursor: "ns-resize" }}
                />
            </g>
        );
    }

    render(chartView: IChartView) {
        return (
            <React.Fragment>
                {this.renderYRulersRect(chartView)}
                {this.renderXRulersRect(chartView)}
                {this.renderYRulersLines(chartView)}
                {this.renderXRulersLines(chartView)}
            </React.Fragment>
        );
    }

    snapToSample(x: number) {
        x =
            (x / this.chartsController.xAxisController.range) *
            (this.chartsController.xAxisController.numSamples - 1);
        return (
            (Math.round(x) * this.chartsController.xAxisController.range) /
            (this.chartsController.xAxisController.numSamples - 1)
        );
    }
}

interface RulersDockViewProps {
    chartsController: IChartsController;
}

export const RulersDockView = observer(
    class RulersDockView extends React.Component<RulersDockViewProps> {
        x1: string = "";
        x1Error: boolean = false;
        x2: string = "";
        x2Error: boolean = false;
        y1: string[] = [];
        y1Error: boolean[] = [];
        y2: string[] = [];
        y2Error: boolean[] = [];

        outsideChangeInXRulersSubscriptionDisposer: any;
        outsideChangeInYRulersSubscriptionDisposer: any;

        isInsideChange: boolean = false;

        constructor(props: RulersDockViewProps) {
            super(props);

            makeObservable(this, {
                x1: observable,
                x1Error: observable,
                x2: observable,
                x2Error: observable,
                y1: observable,
                y1Error: observable,
                y2: observable,
                y2Error: observable,
                subscribeToOutsideModelChanges: action,
                enableXAxisRulers: action.bound,
                enableYAxisRulers: action.bound
            });

            this.subscribeToOutsideModelChanges();
        }

        componentDidUpdate(prevProps: any) {
            if (this.props != prevProps) {
                this.subscribeToOutsideModelChanges();
            }
        }

        componentWillUnmount() {
            if (this.outsideChangeInXRulersSubscriptionDisposer) {
                this.outsideChangeInXRulersSubscriptionDisposer();
            }
            if (this.outsideChangeInYRulersSubscriptionDisposer) {
                this.outsideChangeInYRulersSubscriptionDisposer();
            }
        }

        subscribeToOutsideModelChanges() {
            if (this.outsideChangeInXRulersSubscriptionDisposer) {
                this.outsideChangeInXRulersSubscriptionDisposer();
            }

            this.outsideChangeInXRulersSubscriptionDisposer = autorun(() => {
                const x1 =
                    this.props.chartsController.xAxisController.unit.formatValue(
                        this.rulersModel.x1,
                        10
                    );
                const x2 =
                    this.props.chartsController.xAxisController.unit.formatValue(
                        this.rulersModel.x2,
                        10
                    );
                if (!this.isInsideChange) {
                    runInAction(() => {
                        this.x1 = x1;
                        this.x1Error = false;
                        this.x2 = x2;
                        this.x2Error = false;
                    });
                }
            });

            if (this.outsideChangeInYRulersSubscriptionDisposer) {
                this.outsideChangeInYRulersSubscriptionDisposer();
            }

            this.outsideChangeInYRulersSubscriptionDisposer = autorun(() => {
                for (
                    let i = 0;
                    i < this.props.chartsController.chartControllers.length;
                    ++i
                ) {
                    const chartController =
                        this.props.chartsController.chartControllers[i];
                    if (
                        i < this.rulersModel.yAxisRulersEnabled.length &&
                        this.rulersModel.yAxisRulersEnabled[i] &&
                        !this.isInsideChange
                    ) {
                        const y1 =
                            chartController.yAxisController.unit.formatValue(
                                this.rulersModel.y1[i],
                                4
                            );
                        const y2 =
                            chartController.yAxisController.unit.formatValue(
                                this.rulersModel.y2[i],
                                4
                            );

                        runInAction(() => {
                            this.y1[i] = y1;
                            this.y1Error[i] = false;
                            this.y2[i] = y2;
                            this.y2Error[i] = false;
                        });
                    }
                }
            });
        }

        get rulersController() {
            return this.props.chartsController.rulersController;
        }

        get rulersModel() {
            return this.rulersController.rulersModel!;
        }

        validateXRange() {
            const xAxisController = this.props.chartsController.xAxisController;

            const x1 = xAxisController.unit.parseValue(this.x1);
            this.x1Error =
                x1 == null ||
                x1 < xAxisController.minValue ||
                x1 > xAxisController.maxValue;

            const x2 = xAxisController.unit.parseValue(this.x2);
            this.x2Error =
                x2 == null ||
                x2 < xAxisController.minValue ||
                x2 > xAxisController.maxValue;

            if (this.x1Error || this.x2Error) {
                return;
            }

            this.rulersModel.x1 = x1!;
            this.rulersModel.x2 = x2!;
        }

        enableXAxisRulers(checked: boolean) {
            if (checked) {
                this.rulersModel.xAxisRulersEnabled = true;

                const xAxisController =
                    this.props.chartsController.xAxisController;

                this.rulersModel.x1 = this.rulersController.snapToSample(
                    xAxisController.from + 0.1 * xAxisController.distance
                );

                this.rulersModel.x2 = this.rulersController.snapToSample(
                    xAxisController.to - 0.1 * xAxisController.distance
                );
            } else {
                this.rulersModel.xAxisRulersEnabled = false;
            }
        }

        setX1 = (event: React.ChangeEvent<HTMLInputElement>) => {
            this.isInsideChange = true;
            runInAction(() => {
                this.x1 = event.target.value;
                this.validateXRange();
            });
            this.isInsideChange = false;
        };

        setX2 = (event: React.ChangeEvent<HTMLInputElement>) => {
            this.isInsideChange = true;
            runInAction(() => {
                this.x2 = event.target.value;
                this.validateXRange();
            });
            this.isInsideChange = false;
        };

        zoomToFitXRulers = () => {
            let x1;
            let x2;
            if (this.rulersModel.x1 < this.rulersModel.x2) {
                x1 = this.rulersModel.x1;
                x2 = this.rulersModel.x2;
            } else {
                x1 = this.rulersModel.x2;
                x2 = this.rulersModel.x1;
            }

            const dx = x2 - x1;
            this.props.chartsController.xAxisController.zoom(
                x1 - 0.05 * dx,
                x2 + 0.05 * dx
            );
        };

        validateYRange(chartIndex: number) {
            const yAxisController =
                this.props.chartsController.chartControllers[chartIndex]
                    .yAxisController;

            const y1 = yAxisController.unit.parseValue(this.y1[chartIndex]);
            this.y1Error[chartIndex] =
                y1 == null ||
                y1 < yAxisController.minValue ||
                y1 > yAxisController.maxValue;

            const y2 = yAxisController.unit.parseValue(this.y2[chartIndex]);
            this.y2Error[chartIndex] =
                y2 == null ||
                y2 < yAxisController.minValue ||
                y2 > yAxisController.maxValue;

            if (this.y1Error[chartIndex] || this.y2Error[chartIndex]) {
                return;
            }

            this.rulersModel.y1[chartIndex] = y1!;
            this.rulersModel.y2[chartIndex] = y2!;
        }

        enableYAxisRulers(chartIndex: number, checked: boolean) {
            if (checked) {
                this.rulersModel.yAxisRulersEnabled[chartIndex] = true;

                const yAxisController =
                    this.props.chartsController.chartControllers[chartIndex]
                        .yAxisController;

                this.rulersModel.y1[chartIndex] =
                    yAxisController.from + 0.1 * yAxisController.distance;
                this.rulersModel.y2[chartIndex] =
                    yAxisController.to - 0.1 * yAxisController.distance;
            } else {
                this.rulersModel.yAxisRulersEnabled[chartIndex] = false;
            }
        }

        setY1 = (
            chartIndex: number,
            event: React.ChangeEvent<HTMLInputElement>
        ) => {
            this.isInsideChange = true;
            runInAction(() => {
                this.y1[chartIndex] = event.target.value;
                this.validateYRange(chartIndex);
            });
            this.isInsideChange = false;
        };

        setY2 = (
            chartIndex: number,
            event: React.ChangeEvent<HTMLInputElement>
        ) => {
            this.isInsideChange = true;
            runInAction(() => {
                this.y2[chartIndex] = event.target.value;
                this.validateYRange(chartIndex);
            });
            this.isInsideChange = false;
        };

        zoomToFitYRulers = (chartIndex: number) => {
            let y1;
            let y2;
            if (
                this.rulersModel.y1[chartIndex] <
                this.rulersModel.y2[chartIndex]
            ) {
                y1 = this.rulersModel.y1[chartIndex];
                y2 = this.rulersModel.y2[chartIndex];
            } else {
                y1 = this.rulersModel.y2[chartIndex];
                y2 = this.rulersModel.y1[chartIndex];
            }

            const dy = y2 - y1;
            this.props.chartsController.chartControllers[
                chartIndex
            ].yAxisController.zoom(y1 - 0.05 * dy, y2 + 0.05 * dy);
        };

        render() {
            return (
                <div className="EezStudio_SideDockViewContainer">
                    <div className="EezStudio_AxisRulersProperties">
                        <div className="EezStudio_SideDockView_PropertyLabel">
                            <Checkbox
                                checked={this.rulersModel.xAxisRulersEnabled}
                                onChange={this.enableXAxisRulers}
                            >
                                Enable X axis rulers
                            </Checkbox>
                        </div>
                        {this.rulersModel.xAxisRulersEnabled && (
                            <div className="EezStudio_SideDockView_Property">
                                <table>
                                    <tbody>
                                        <tr>
                                            <td>X1</td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className={classNames(
                                                        "form-control",
                                                        {
                                                            error: this.x1Error
                                                        }
                                                    )}
                                                    value={this.x1}
                                                    onChange={this.setX1}
                                                />
                                            </td>
                                            <td>X2</td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className={classNames(
                                                        "form-control",
                                                        {
                                                            error: this.x2Error
                                                        }
                                                    )}
                                                    value={this.x2}
                                                    onChange={this.setX2}
                                                />
                                            </td>
                                            <td>&Delta;X</td>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={this.props.chartsController.xAxisController.unit.formatValue(
                                                        this.rulersModel.x2 -
                                                            this.rulersModel.x1,
                                                        10
                                                    )}
                                                    readOnly={true}
                                                />
                                            </td>
                                            <td />
                                            <td style={{ textAlign: "left" }}>
                                                <IconAction
                                                    icon="material:search"
                                                    onClick={
                                                        this.zoomToFitXRulers
                                                    }
                                                    title="Zoom chart to fit both x1 and x2"
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    {range(
                        this.props.chartsController.chartControllers.length
                    ).map(chartIndex => (
                        <div
                            key={chartIndex}
                            className="EezStudio_AxisRulersProperties"
                        >
                            <div className="EezStudio_SideDockView_PropertyLabel">
                                <Checkbox
                                    checked={
                                        chartIndex <
                                            this.rulersModel.yAxisRulersEnabled
                                                .length &&
                                        this.rulersModel.yAxisRulersEnabled[
                                            chartIndex
                                        ]
                                    }
                                    onChange={(checked: boolean) =>
                                        this.enableYAxisRulers(
                                            chartIndex,
                                            checked
                                        )
                                    }
                                >
                                    Enable{" "}
                                    {this.props.chartsController
                                        .chartControllers.length > 1
                                        ? `"${this.props.chartsController.chartControllers[chartIndex].yAxisController.axisModel.label}" `
                                        : ""}
                                    Y axis rulers
                                </Checkbox>
                            </div>
                            {chartIndex <
                                this.rulersModel.yAxisRulersEnabled.length &&
                                this.rulersModel.yAxisRulersEnabled[
                                    chartIndex
                                ] && (
                                    <div className="EezStudio_SideDockView_Property">
                                        <table>
                                            <tbody>
                                                <tr>
                                                    <td>Y1</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className={classNames(
                                                                "form-control",
                                                                {
                                                                    error: this
                                                                        .y1Error[
                                                                        chartIndex
                                                                    ]
                                                                }
                                                            )}
                                                            value={
                                                                this.y1[
                                                                    chartIndex
                                                                ]
                                                            }
                                                            onChange={event =>
                                                                this.setY1(
                                                                    chartIndex,
                                                                    event
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    <td>Y2</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className={classNames(
                                                                "form-control",
                                                                {
                                                                    error: this
                                                                        .y2Error[
                                                                        chartIndex
                                                                    ]
                                                                }
                                                            )}
                                                            value={
                                                                this.y2[
                                                                    chartIndex
                                                                ]
                                                            }
                                                            onChange={event =>
                                                                this.setY2(
                                                                    chartIndex,
                                                                    event
                                                                )
                                                            }
                                                        />
                                                    </td>
                                                    <td>&Delta;Y</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={this.props.chartsController.chartControllers[
                                                                chartIndex
                                                            ].yAxisController.unit.formatValue(
                                                                this.rulersModel
                                                                    .y2[
                                                                    chartIndex
                                                                ] -
                                                                    this
                                                                        .rulersModel
                                                                        .y1[
                                                                        chartIndex
                                                                    ],
                                                                4
                                                            )}
                                                            readOnly={true}
                                                        />
                                                    </td>
                                                    <td />
                                                    <td
                                                        style={{
                                                            textAlign: "left"
                                                        }}
                                                    >
                                                        <IconAction
                                                            icon="material:search"
                                                            onClick={() =>
                                                                this.zoomToFitYRulers(
                                                                    chartIndex
                                                                )
                                                            }
                                                            title="Zoom chart to fit both y1 and y2"
                                                        />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                        </div>
                    ))}
                </div>
            );
        }
    }
);

class DragXRulerMouseHandler implements MouseHandler {
    cursor = "ew-resize";
    xStart: number = 0;
    x1: number = 0;
    dx: number = 0;

    constructor(
        private rulersController: IRulersController,
        private whichRuller: "x1" | "x2" | "both" | "none"
    ) {
        makeObservable(this, {
            down: action,
            move: action,
            up: action
        });
    }

    get xAxisController() {
        return this.rulersController.chartsController.xAxisController;
    }

    down(point: SVGPoint, event: PointerEvent) {
        this.rulersController.rulersModel.pauseDbUpdate = true;

        this.xStart = this.xAxisController.pxToValue(point.x);

        if (this.whichRuller === "none") {
            let x = getSnapToValue(event, this.xStart, this.xAxisController);
            x = this.rulersController.snapToSample(x);

            this.rulersController.rulersModel.x1 = x;
            this.rulersController.rulersModel.x2 = x;
        }

        this.x1 = this.rulersController.rulersModel.x1;
        this.dx =
            this.rulersController.rulersModel.x2 -
            this.rulersController.rulersModel.x1;
    }

    move(point: SVGPoint, event: PointerEvent) {
        let x = this.xAxisController.pxToValue(point.x);
        if (this.whichRuller === "both") {
            x = getSnapToValue(
                event,
                this.x1 + x - this.xStart,
                this.xAxisController
            );
            x = this.rulersController.snapToSample(x);

            if (x < this.xAxisController.minValue) {
                x = this.xAxisController.minValue;
            }

            if (x + this.dx < this.xAxisController.minValue) {
                x = this.xAxisController.minValue - this.dx;
            }

            if (x > this.xAxisController.maxValue) {
                x = this.xAxisController.maxValue;
            }

            if (x + this.dx > this.xAxisController.maxValue) {
                x = this.xAxisController.maxValue - this.dx;
            }

            this.rulersController.rulersModel.x1 = x;
            this.rulersController.rulersModel.x2 = x + this.dx;
        } else {
            x = getSnapToValue(event, x, this.xAxisController);
            x = this.rulersController.snapToSample(x);

            if (x < this.xAxisController.minValue) {
                x = this.xAxisController.minValue;
            } else if (x > this.xAxisController.maxValue) {
                x = this.xAxisController.maxValue;
            }

            if (this.whichRuller === "x1") {
                this.rulersController.rulersModel.x1 = x;
            } else {
                this.rulersController.rulersModel.x2 = x;
            }

            if (
                this.rulersController.rulersModel.x1 >
                this.rulersController.rulersModel.x2
            ) {
                const temp = this.rulersController.rulersModel.x2;
                this.rulersController.rulersModel.x2 =
                    this.rulersController.rulersModel.x1;
                this.rulersController.rulersModel.x1 = temp;

                this.whichRuller = this.whichRuller === "x1" ? "x2" : "x1";
            }
        }
    }

    up(
        point: SVGPoint | undefined,
        event: PointerEvent | undefined,
        cancel: boolean
    ) {
        this.rulersController.rulersModel.pauseDbUpdate = false;
    }

    updateCursor(event: PointerEvent | undefined, cursor: ICursor) {
        cursor.visible = false;
    }

    render() {
        return null;
    }
}

class DragYRulerMouseHandler implements MouseHandler {
    chartIndex: number;

    cursor = "ns-resize";
    yStart: number = 0;
    y1: number = 0;
    dy: number = 0;

    constructor(
        private chartView: IChartView,
        private whichRuller: "y1" | "y2" | "both" | "none"
    ) {
        makeObservable(this, {
            down: action,
            move: action,
            up: action
        });

        this.chartIndex = chartView.props.chartController.chartIndex;
    }

    get rulersController() {
        return this.chartView.props.chartController.chartsController
            .rulersController;
    }

    get rulersModel() {
        return this.rulersController.rulersModel;
    }

    get yAxisController() {
        return this.chartView.props.chartController.yAxisController;
    }

    down(point: SVGPoint, event: PointerEvent) {
        this.rulersModel.pauseDbUpdate = true;

        this.yStart = this.yAxisController.pxToValue(point.y);

        if (this.whichRuller === "none") {
            let y = this.yAxisController.pxToValue(point.y);
            y = getSnapToValue(event, y, this.yAxisController);

            this.rulersModel.y1[this.chartIndex] = y;
            this.rulersModel.y2[this.chartIndex] = y;
        }

        this.y1 = this.rulersModel.y1[this.chartIndex];
        this.dy =
            this.rulersModel.y2[this.chartIndex] -
            this.rulersModel.y1[this.chartIndex];
    }

    move(point: SVGPoint, event: PointerEvent) {
        let y = this.yAxisController.pxToValue(point.y);
        if (this.whichRuller === "both") {
            y = getSnapToValue(
                event,
                this.y1 + y - this.yStart,
                this.yAxisController
            );

            if (y < this.yAxisController.minValue) {
                y = this.yAxisController.minValue;
            }

            if (y + this.dy < this.yAxisController.minValue) {
                y = this.yAxisController.minValue - this.dy;
            }

            if (y > this.yAxisController.maxValue) {
                y = this.yAxisController.maxValue;
            }

            if (y + this.dy > this.yAxisController.maxValue) {
                y = this.yAxisController.maxValue - this.dy;
            }

            this.rulersModel.y1[this.chartIndex] = y;
            this.rulersModel.y2[this.chartIndex] = y + this.dy;
        } else {
            y = getSnapToValue(event, y, this.yAxisController);

            if (y < this.yAxisController.minValue) {
                y = this.yAxisController.minValue;
            } else if (y > this.yAxisController.maxValue) {
                y = this.yAxisController.maxValue;
            }

            if (this.whichRuller === "y1") {
                this.rulersModel.y1[this.chartIndex] = y;
            } else {
                this.rulersModel.y2[this.chartIndex] = y;
            }
        }
    }

    up(
        point: SVGPoint | undefined,
        event: PointerEvent | undefined,
        cancel: boolean
    ) {
        this.rulersModel.pauseDbUpdate = false;
    }

    updateCursor(event: PointerEvent | undefined, cursor: ICursor) {
        cursor.visible = false;
    }

    render() {
        return null;
    }
}

export class RulersModel {
    xAxisRulersEnabled: boolean = false;
    x1: number = 0;
    x2: number = 0;
    yAxisRulersEnabled: boolean[] = [];
    y1: number[] = [];
    y2: number[] = [];
    pauseDbUpdate?: boolean = false;

    constructor(props: any) {
        makeObservable(this, {
            xAxisRulersEnabled: observable,
            x1: observable,
            x2: observable,
            yAxisRulersEnabled: observable,
            y1: observable,
            y2: observable,
            pauseDbUpdate: observable
        });

        if (props) {
            if (!isArray(props.yAxisRulersEnabled)) {
                props.yAxisRulersEnabled = [props.yAxisRulersEnabled];
                props.y1 = [props.y1];
                props.y2 = [props.y2];
            }

            Object.assign(this, props);
        }
    }

    initYRulers(numCharts: number) {
        for (let chartIndex = 0; chartIndex < numCharts; chartIndex++) {
            if (
                chartIndex >= this.yAxisRulersEnabled.length ||
                this.yAxisRulersEnabled[chartIndex] === undefined
            ) {
                this.yAxisRulersEnabled[chartIndex] = false;
                this.y1[chartIndex] = 0;
                this.y2[chartIndex] = 0;
            }
        }
    }
}
