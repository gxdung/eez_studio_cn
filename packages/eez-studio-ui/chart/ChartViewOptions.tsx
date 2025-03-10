import React from "react";
import { observable, action, makeObservable } from "mobx";
import { observer } from "mobx-react";
import classNames from "classnames";

import { Checkbox, Radio } from "eez-studio-ui/properties";

import type {
    IChartsController,
    WaveformRenderAlgorithm,
    IChartController
} from "eez-studio-ui/chart/chart";

import { globalViewOptions } from "eez-studio-ui/chart/GlobalViewOptions";

////////////////////////////////////////////////////////////////////////////////

export const ChartViewOptions = observer(
    class ChartViewOptions extends React.Component<
        ChartViewOptionsProps & {
            chartsController: IChartsController;
        }
    > {
        render() {
            const chartsController = this.props.chartsController;
            const viewOptions = chartsController.viewOptions;

            return (
                <div className="EezStudio_ChartViewOptionsContainer">
                    <div>
                        <div className="EezStudio_SideDockView_PropertyLabel">
                            Axes lines subdivision:
                        </div>
                        <div className="EezStudio_SideDockView_Property">
                            <Radio
                                checked={
                                    viewOptions.axesLines.type === "dynamic"
                                }
                                onChange={action(() =>
                                    viewOptions.setAxesLinesType("dynamic")
                                )}
                            >
                                Dynamic
                            </Radio>
                            {viewOptions.axesLines.type === "dynamic" && (
                                <DynamicSubdivisionOptions
                                    chartsController={chartsController}
                                />
                            )}
                            <Radio
                                checked={viewOptions.axesLines.type === "fixed"}
                                onChange={action(() =>
                                    viewOptions.setAxesLinesType("fixed")
                                )}
                            >
                                Fixed
                            </Radio>
                            {viewOptions.axesLines.type === "fixed" && (
                                <FixedSubdivisionOptions
                                    chartsController={chartsController}
                                />
                            )}
                        </div>
                        <div className="EezStudio_SideDockView_PropertyLabel">
                            <Checkbox
                                checked={viewOptions.axesLines.snapToGrid}
                                onChange={action((checked: boolean) => {
                                    viewOptions.setAxesLinesSnapToGrid(checked);
                                })}
                            >
                                Snap to grid
                            </Checkbox>
                        </div>
                    </div>
                    {this.props.showRenderAlgorithm && (
                        <div>
                            <div className="EezStudio_SideDockView_PropertyLabel">
                                Rendering algorithm:
                            </div>
                            <div className="EezStudio_SideDockView_Property">
                                <select
                                    className="form-select"
                                    title="Chart rendering algorithm"
                                    value={globalViewOptions.renderAlgorithm}
                                    onChange={action(
                                        (
                                            event: React.ChangeEvent<HTMLSelectElement>
                                        ) =>
                                            (globalViewOptions.renderAlgorithm =
                                                event.target
                                                    .value as WaveformRenderAlgorithm)
                                    )}
                                >
                                    <option value="avg">Average</option>
                                    <option value="minmax">Min-max</option>
                                    <option value="gradually">Gradually</option>
                                </select>
                            </div>
                        </div>
                    )}
                    <div>
                        <div>
                            <Checkbox
                                checked={viewOptions.showAxisLabels}
                                onChange={action((checked: boolean) => {
                                    viewOptions.setShowAxisLabels(checked);
                                })}
                            >
                                Show axis labels
                            </Checkbox>
                        </div>
                        <div>
                            <Checkbox
                                checked={viewOptions.showZoomButtons}
                                onChange={action((checked: boolean) => {
                                    viewOptions.setShowZoomButtons(checked);
                                })}
                            >
                                Show zoom in/out buttons
                            </Checkbox>
                        </div>
                        <div className="EezStudio_GlobalOptionsContainer">
                            Global options:
                        </div>
                        <div>
                            <Checkbox
                                checked={globalViewOptions.enableZoomAnimations}
                                onChange={action((checked: boolean) => {
                                    globalViewOptions.enableZoomAnimations =
                                        checked;
                                })}
                            >
                                Enable zoom in/out animations
                            </Checkbox>
                        </div>
                        <div>
                            <Checkbox
                                checked={globalViewOptions.blackBackground}
                                onChange={action((checked: boolean) => {
                                    globalViewOptions.blackBackground = checked;
                                })}
                            >
                                Black background
                            </Checkbox>
                        </div>
                        {this.props.showShowSampledDataOption && (
                            <div>
                                <Checkbox
                                    checked={globalViewOptions.showSampledData}
                                    onChange={action(
                                        (checked: boolean) =>
                                            (globalViewOptions.showSampledData =
                                                checked)
                                    )}
                                >
                                    Show sampled data
                                </Checkbox>
                            </div>
                        )}
                    </div>
                </div>
            );
        }
    }
);
export interface ChartViewOptionsProps {
    showRenderAlgorithm: boolean;
    showShowSampledDataOption: boolean;
}

////////////////////////////////////////////////////////////////////////////////

interface DynamicSubdivisionOptionsProps {
    chartsController: IChartsController;
}

const DynamicSubdivisionOptions = observer(
    class DynamicSubdivisionOptions extends React.Component<DynamicSubdivisionOptionsProps> {
        xAxisSteps: string = "";
        xAxisStepsError: boolean = false;
        yAxisSteps: string[] = [];
        yAxisStepsError: boolean[] = [];

        constructor(props: DynamicSubdivisionOptionsProps) {
            super(props);

            makeObservable(this, {
                xAxisSteps: observable,
                xAxisStepsError: observable,
                yAxisSteps: observable,
                yAxisStepsError: observable,
                loadProps: action
            });

            this.loadProps(this.props);
        }

        componentDidUpdate(prevProps: any) {
            if (this.props != prevProps) {
                this.loadProps(this.props);
            }
        }

        loadProps(props: DynamicSubdivisionOptionsProps) {
            const chartsController = props.chartsController;
            const viewOptions = chartsController.viewOptions;

            const xSteps =
                viewOptions.axesLines.steps && viewOptions.axesLines.steps.x;
            this.xAxisSteps = xSteps
                ? xSteps
                      .map(step =>
                          chartsController.xAxisController.unit.formatValue(
                              step
                          )
                      )
                      .join(", ")
                : "";

            this.yAxisSteps = chartsController.chartControllers.map(
                (chartController: IChartController, i: number) => {
                    const ySteps =
                        viewOptions.axesLines.steps &&
                        i < viewOptions.axesLines.steps.y.length &&
                        viewOptions.axesLines.steps.y[i];
                    return ySteps
                        ? ySteps
                              .map(step =>
                                  chartsController.chartControllers[
                                      i
                                  ].yAxisController.unit.formatValue(step)
                              )
                              .join(", ")
                        : "";
                }
            );
            this.yAxisStepsError = this.yAxisSteps.map(x => false);
        }

        render() {
            const chartsController = this.props.chartsController;
            const viewOptions = chartsController.viewOptions;

            const yAxisSteps = chartsController.chartControllers
                .filter(
                    chartController =>
                        !chartController.yAxisController.isDigital
                )
                .map((chartController: IChartController, i: number) => {
                    const yAxisController = chartController.yAxisController;

                    return (
                        <tr key={i}>
                            <td>{yAxisController.axisModel.label}</td>
                            <td>
                                <input
                                    type="text"
                                    className={classNames("form-control", {
                                        error: this.yAxisStepsError[i]
                                    })}
                                    value={this.yAxisSteps[i]}
                                    onChange={action(
                                        (
                                            event: React.ChangeEvent<HTMLInputElement>
                                        ) => {
                                            this.yAxisSteps[i] =
                                                event.target.value;

                                            const steps = event.target.value
                                                .split(",")
                                                .map(value =>
                                                    yAxisController.unit.parseValue(
                                                        value
                                                    )
                                                );

                                            if (
                                                steps.length === 0 ||
                                                !steps.every(
                                                    step =>
                                                        step != null &&
                                                        step >=
                                                            yAxisController.unit
                                                                .units[0]
                                                )
                                            ) {
                                                this.yAxisStepsError[i] = true;
                                            } else {
                                                this.yAxisStepsError[i] = false;
                                                steps.sort();
                                                viewOptions.setAxesLinesStepsY(
                                                    i,
                                                    steps as number[]
                                                );
                                            }
                                        }
                                    )}
                                />
                            </td>
                        </tr>
                    );
                });

            return (
                <div className="EezStudio_ChartViewOptions_DynamicAxisLines_Properties">
                    <table>
                        <tbody>
                            <tr>
                                <td />
                                <td>Steps</td>
                            </tr>
                            <tr>
                                <td>Time</td>
                                <td>
                                    <input
                                        type="text"
                                        className={classNames("form-control", {
                                            error: this.xAxisStepsError
                                        })}
                                        value={this.xAxisSteps}
                                        onChange={action(
                                            (
                                                event: React.ChangeEvent<HTMLInputElement>
                                            ) => {
                                                this.xAxisSteps =
                                                    event.target.value;

                                                const steps = event.target.value
                                                    .split(",")
                                                    .map(value =>
                                                        chartsController.xAxisController.unit.parseValue(
                                                            value
                                                        )
                                                    )
                                                    .sort();

                                                if (
                                                    steps.length === 0 ||
                                                    !steps.every(
                                                        step =>
                                                            step != null &&
                                                            step >=
                                                                chartsController
                                                                    .xAxisController
                                                                    .unit
                                                                    .units[0]
                                                    )
                                                ) {
                                                    this.xAxisStepsError = true;
                                                } else {
                                                    this.xAxisStepsError =
                                                        false;
                                                    steps.sort();
                                                    viewOptions.setAxesLinesStepsX(
                                                        steps as number[]
                                                    );
                                                }
                                            }
                                        )}
                                    />
                                </td>
                            </tr>
                            {yAxisSteps}
                        </tbody>
                    </table>
                </div>
            );
        }
    }
);

////////////////////////////////////////////////////////////////////////////////

interface FixedSubdivisionOptionsProps {
    chartsController: IChartsController;
}

const FixedSubdivisionOptions = observer(
    class FixedSubdivisionOptions extends React.Component<FixedSubdivisionOptionsProps> {
        majorSubdivisionHorizontal: number = 0;
        majorSubdivisionVertical: number = 0;
        minorSubdivisionHorizontal: number = 0;
        minorSubdivisionVertical: number = 0;
        majorSubdivisionHorizontalError: boolean = false;

        constructor(props: FixedSubdivisionOptionsProps) {
            super(props);

            makeObservable(this, {
                majorSubdivisionHorizontal: observable,
                majorSubdivisionVertical: observable,
                minorSubdivisionHorizontal: observable,
                minorSubdivisionVertical: observable,
                majorSubdivisionHorizontalError: observable,
                loadProps: action
            });

            this.loadProps(this.props);
        }

        componentDidUpdate(prevProps: any) {
            if (this.props != prevProps) {
                this.loadProps(this.props);
            }
        }

        loadProps(props: FixedSubdivisionOptionsProps) {
            const axesLines = props.chartsController.viewOptions.axesLines;

            this.majorSubdivisionHorizontal =
                axesLines.majorSubdivision.horizontal;
            this.majorSubdivisionVertical = axesLines.majorSubdivision.vertical;
            this.minorSubdivisionHorizontal =
                axesLines.minorSubdivision.horizontal;
            this.minorSubdivisionVertical = axesLines.minorSubdivision.vertical;
        }

        render() {
            const viewOptions = this.props.chartsController.viewOptions;

            return (
                <div className="EezStudio_ChartViewOptions_FixedAxisLines_Properties">
                    <table>
                        <tbody>
                            <tr>
                                <td />
                                <td>X axis</td>
                                <td />
                                <td>Y axis</td>
                            </tr>
                            <tr>
                                <td>Major</td>
                                <td>
                                    <input
                                        type="number"
                                        min={2}
                                        max={100}
                                        className={classNames("form-control", {
                                            error: this
                                                .majorSubdivisionHorizontalError
                                        })}
                                        value={this.majorSubdivisionHorizontal}
                                        onChange={action((event: any) => {
                                            this.majorSubdivisionHorizontal =
                                                event.target.value;

                                            const value = parseInt(
                                                event.target.value
                                            );

                                            if (
                                                isNaN(value) ||
                                                value < 2 ||
                                                value > 100
                                            ) {
                                                this.majorSubdivisionHorizontalError =
                                                    true;
                                            } else {
                                                this.majorSubdivisionHorizontalError =
                                                    false;
                                                viewOptions.setAxesLinesMajorSubdivisionHorizontal(
                                                    value
                                                );
                                            }
                                        })}
                                    />
                                </td>
                                <td>by</td>
                                <td>
                                    <input
                                        type="number"
                                        min={2}
                                        max={100}
                                        className="form-control"
                                        value={this.majorSubdivisionVertical}
                                        onChange={action((event: any) => {
                                            this.majorSubdivisionVertical =
                                                event.target.value;

                                            const value = parseInt(
                                                event.target.value
                                            );

                                            if (
                                                isNaN(value) ||
                                                value < 2 ||
                                                value > 100
                                            ) {
                                            } else {
                                                viewOptions.setAxesLinesMajorSubdivisionVertical(
                                                    value
                                                );
                                            }
                                        })}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>Minor</td>
                                <td>
                                    <input
                                        type="number"
                                        min={2}
                                        max={10}
                                        className="form-control"
                                        value={this.minorSubdivisionHorizontal}
                                        onChange={action((event: any) => {
                                            this.minorSubdivisionHorizontal =
                                                event.target.value;

                                            const value = parseInt(
                                                event.target.value
                                            );

                                            if (
                                                isNaN(value) ||
                                                value < 2 ||
                                                value > 10
                                            ) {
                                            } else {
                                                viewOptions.setAxesLinesMinorSubdivisionHorizontal(
                                                    value
                                                );
                                            }
                                        })}
                                    />
                                </td>
                                <td>by</td>
                                <td>
                                    <input
                                        type="number"
                                        min={2}
                                        max={10}
                                        className="form-control"
                                        value={this.minorSubdivisionVertical}
                                        onChange={action((event: any) => {
                                            this.minorSubdivisionVertical =
                                                event.target.value;

                                            const value = parseInt(
                                                event.target.value
                                            );

                                            if (
                                                isNaN(value) ||
                                                value < 2 ||
                                                value > 10
                                            ) {
                                            } else {
                                                viewOptions.setAxesLinesMinorSubdivisionVertical(
                                                    value
                                                );
                                            }
                                        })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            );
        }
    }
);
