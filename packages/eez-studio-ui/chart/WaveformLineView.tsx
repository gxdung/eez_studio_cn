import React from "react";
import { action, computed, observable, makeObservable } from "mobx";
import { observer } from "mobx-react";
import type {
    IWaveformRenderJobSpecification,
    ILineController,
    IWaveform
} from "eez-studio-ui/chart/chart";
import { renderWaveformPath } from "./renderWaveformPath";
import { globalViewOptions } from "eez-studio-ui/chart/GlobalViewOptions";

interface IWaveformLineController extends ILineController {
    waveform: IWaveform;
}

interface WaveformLineViewProperties {
    waveformLineController: IWaveformLineController;
    label?: string;
    color?: string;
    colorInverse?: string;
}

export const WaveformLineView = observer(
    class WaveformLineView extends React.Component<WaveformLineViewProperties> {
        waveformLineController = this.props.waveformLineController;

        nextJob: IWaveformRenderJobSpecification | undefined;
        canvas: HTMLCanvasElement | undefined;
        chartImage: string | undefined;
        continuation: any;
        requestAnimationFrameId: any;

        constructor(props: WaveformLineViewProperties) {
            super(props);

            makeObservable(this, {
                waveformLineController: observable,
                chartImage: observable,
                waveformRenderJobSpecification: computed,
                componentDidUpdate: action,
                drawStep: action.bound
            });
        }

        get waveformRenderJobSpecification():
            | IWaveformRenderJobSpecification
            | undefined {
            const yAxisController = this.waveformLineController.yAxisController;
            const chartsController = yAxisController.chartsController;
            const xAxisController = chartsController.xAxisController;
            const waveform = this.waveformLineController.waveform;

            if (chartsController.chartWidth < 1 || !waveform.length) {
                return undefined;
            }

            return {
                renderAlgorithm: globalViewOptions.renderAlgorithm,
                waveform,
                xAxisController,
                yAxisController,
                xFromValue: xAxisController.from,
                xToValue: xAxisController.to,
                yFromValue: yAxisController.from,
                yToValue: yAxisController.to,
                strokeColor: globalViewOptions.blackBackground
                    ? this.props.color ?? yAxisController.axisModel.color
                    : this.props.colorInverse ??
                      yAxisController.axisModel.colorInverse,
                label:
                    yAxisController.chartController!.lineControllers.length >
                        1 && chartsController.mode !== "preview"
                        ? this.props.label
                        : undefined
            };
        }

        componentDidUpdate(prevProps: any) {
            if (this.props != prevProps) {
                this.waveformLineController = this.props.waveformLineController;
            }
            this.draw();
        }

        componentDidMount() {
            this.draw();
        }

        drawStep() {
            if (!this.canvas) {
                const chartsController =
                    this.props.waveformLineController.yAxisController
                        .chartsController;
                this.canvas = document.createElement("canvas");
                this.canvas.width = Math.floor(chartsController.chartWidth);
                this.canvas.height = Math.floor(chartsController.chartHeight);
            }

            this.continuation = renderWaveformPath(
                this.canvas,
                this.nextJob!,
                this.continuation
            );
            if (this.continuation) {
                this.requestAnimationFrameId = window.requestAnimationFrame(
                    this.drawStep
                );
            } else {
                this.requestAnimationFrameId = undefined;
                this.chartImage = this.canvas.toDataURL();
                this.canvas = undefined;
            }
        }

        draw() {
            if (this.nextJob != this.waveformRenderJobSpecification) {
                if (this.requestAnimationFrameId) {
                    window.cancelAnimationFrame(this.requestAnimationFrameId);
                    this.requestAnimationFrameId = undefined;
                }

                this.nextJob = this.waveformRenderJobSpecification;
                this.continuation = undefined;
                this.drawStep();
            }
        }

        componentWillUnmount() {
            if (this.requestAnimationFrameId) {
                window.cancelAnimationFrame(this.requestAnimationFrameId);
            }
        }

        render() {
            if (!this.waveformRenderJobSpecification) {
                return null;
            }
            const chartsController =
                this.props.waveformLineController.yAxisController
                    .chartsController;

            return (
                <image
                    x={Math.floor(chartsController.chartLeft)}
                    y={Math.floor(chartsController.chartTop)}
                    width={Math.floor(chartsController.chartWidth)}
                    height={Math.floor(chartsController.chartHeight)}
                    href={this.chartImage}
                />
            );
        }
    }
);
