import { ui5Config } from "./ui5Config";

var istanbul: any = null;
if (ui5Config.coverage.enabled) {
    istanbul = require('istanbul-lib-coverage');
}

class ui5CoverageDef {
    private _coverageInformation: any;
    private _hasCoverageInfomation: boolean;

    constructor() {
        this._coverageInformation = null;
        this._hasCoverageInfomation = false;
    }

    getCoverageMap(): any {
        return this._coverageInformation;
    }

    hasCoverageInformation(): boolean {
        return this._hasCoverageInfomation;
    }

    mergeConverage(json: any) {
        if (!this._coverageInformation) {
            this._coverageInformation = istanbul.createCoverageMap({});
        }
        this._coverageInformation.merge(json);
        this._hasCoverageInfomation = true;
    };
}

export var ui5Coverage = new ui5CoverageDef();