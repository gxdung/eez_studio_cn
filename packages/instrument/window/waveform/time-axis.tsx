import { observable, makeObservable } from "mobx";

import { IUnit } from "eez-studio-shared/units";
import type {
    IAxisModel,
    ZoomMode,
    IChartsController
} from "eez-studio-ui/chart/chart";

interface IWaveform {
    xAxisUnit: IUnit;
    xAxisLabel?: string;
    samplingRate: number;
    length: number;
    xAxisDefaultSubdivisionOffset: number | undefined;
    xAxisDefaultSubdivisionScale: number | undefined;
}

////////////////////////////////////////////////////////////////////////////////

export class WaveformTimeAxisModel implements IAxisModel {
    constructor(
        private waveform: IWaveform,
        public semiLogarithmic?: { a: number; b: number }
    ) {
        makeObservable(this, {
            dynamic: observable,
            fixed: observable
        });
    }

    chartsController: IChartsController;

    get unit() {
        return this.waveform.xAxisUnit;
    }

    get minValue() {
        return 0;
    }

    get maxValue() {
        return (this.waveform.length - 1) / this.waveform.samplingRate;
    }

    get defaultFrom() {
        return 0;
    }

    get defaultTo() {
        if (this.semiLogarithmic) {
            return this.maxValue;
        }
        return this.chartsController.chartWidth / this.waveform.samplingRate;
    }

    get minScale() {
        return 1e-15;
    }

    get maxScale() {
        return 1e15;
    }

    dynamic: {
        zoomMode: ZoomMode;
        from: number;
        to: number;
    } = {
        zoomMode: "all",
        from: 0,
        to: 0
    };

    fixed: {
        zoomMode: ZoomMode;
        subdivisionOffset: number;
        subdivisonScale: number;
    } = {
        zoomMode: "all",
        subdivisionOffset: 0,
        subdivisonScale: 0
    };

    get defaultSubdivisionOffset() {
        return this.waveform.xAxisDefaultSubdivisionOffset;
    }

    get defaultSubdivisionScale() {
        return this.waveform.xAxisDefaultSubdivisionScale;
    }

    get label() {
        return this.waveform.xAxisLabel || "";
    }

    get color() {
        return "#eee";
    }

    get colorInverse() {
        return "#333";
    }
}
