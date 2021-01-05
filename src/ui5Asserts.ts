import { ui5ActionDef, ui5Steps, ui5StepType, ui5StepStatus } from "./ui5Action";
import { UI5AnyValueBuilder, UI5StepBaseLib, UI5BaseBuilderIntf } from "./ui5Builder";
import { t } from "testcafe";
import { UI5ChainSelection, UI5DataResult } from ".";

const rqTrack = require("testcafe/lib/api/test-run-tracker");

class ui5AssertOperator {
    protected _selector: UI5StepBaseLib;
    protected _testCafeSelector: any = null;
    protected _propertyName: string = "";
    protected _lclTestRun: TestController;
    protected _filterFunction: (e: any) => any = e => e;

    constructor(selector: UI5StepBaseLib, t: TestController) {
        this._selector = selector;
        this._testCafeSelector = selector instanceof UI5ChainSelection ? selector.build() : selector;
        this._lclTestRun = t;
    }

    public setPropertyName(name: string) {
        this._propertyName = name;
    }

    public setDataFunction(t: (e: any) => any) {
        this._filterFunction = t;
    }

    public get toBe(): ui5AssertOperator {
        return this;
    }

    protected _executeTestcafeExpect() {
        return this._lclTestRun.expect(this._selector.dataSync(this._filterFunction));
    }

    private async _waitForSelector() {
        if (this._selector instanceof UI5ChainSelection) {
            await this._selector.build();
        }
    }

    public async greater(val: any, message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(this._lclTestRun, ui5StepType.ASSERT_PROPERTY_VALUE, ui5StepStatus.QUEUED, this._selector, (this._propertyName + " greater than '" + val.toString() + "'"));
        await this._waitForSelector();
        let oProm = this._executeTestcafeExpect().gt(val, message, options);
        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oStep, ui5StepStatus.FAILED);
        });
        return oProm;
    }

    public async less(val: any, message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(this._lclTestRun, ui5StepType.ASSERT_PROPERTY_VALUE, ui5StepStatus.QUEUED, this._selector, (this._propertyName + " less than '" + val.toString() + "'"));
        await this._waitForSelector();
        let oProm = this._executeTestcafeExpect().lt(val, message, options);
        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oStep, ui5StepStatus.FAILED);
        });
        return oProm;
    }

    public async equal(val: any, message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(this._lclTestRun, ui5StepType.ASSERT_PROPERTY_VALUE, ui5StepStatus.QUEUED, this._selector, (this._propertyName + " equal to '" + val.toString() + "'"));

        await this._waitForSelector();
        let oProm = this._executeTestcafeExpect().eql(val, message, options);
        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oStep, ui5StepStatus.FAILED);
        });
        return oProm;
    }

    public async notEqual(val: any, message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(this._lclTestRun, ui5StepType.ASSERT_PROPERTY_VALUE, ui5StepStatus.QUEUED, this._selector, (this._propertyName + " unequal to '" + val.toString() + "'"));

        await this._waitForSelector();
        let oProm = this._executeTestcafeExpect().notEql(val, message, options);
        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oStep, ui5StepStatus.FAILED);
        });
        return oProm;
    }
}


export class ui5AssertOperatorCount extends ui5AssertOperator {
    protected _executeTestcafeExpect() {
        return this._lclTestRun.expect(this._testCafeSelector.count);
    }
}

export class ui5AssertOperatorVisible extends ui5AssertOperator {
    async ok(message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(this._lclTestRun, ui5StepType.ASSERT_VISIBLE, ui5StepStatus.QUEUED, this._selector);
        try {
            await this._lclTestRun.expect(this._testCafeSelector.exists).ok(message, options);
            await this._lclTestRun.expect(this._testCafeSelector.visible).ok(message, options);
        } catch (err) {
            ui5Steps.setStepStatus(oStep, ui5StepStatus.FAILED);
            throw err;
        }

        ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
    }

    async notOK(message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(this._lclTestRun, ui5StepType.ASSERT_VISIBLE, ui5StepStatus.QUEUED, this._selector);
        try {
            await this._lclTestRun.expect(this._testCafeSelector.visible).notOk(message, options);
        } catch (err) {
            ui5Steps.setStepStatus(oStep, ui5StepStatus.FAILED);
            return;
        }

        ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
    }
}


export class ui5AssertOperatorExists extends ui5AssertOperator {
    async ok(message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(this._lclTestRun, ui5StepType.ASSERT_EXISTS, ui5StepStatus.QUEUED, this._selector);
        try {
            await this._lclTestRun.expect(this._testCafeSelector.exists).ok(message, options);
        } catch (err) {
            ui5Steps.setStepStatus(oStep, ui5StepStatus.FAILED);
            throw err;
        }

        ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
    }

    async notOK(message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(this._lclTestRun, ui5StepType.ASSERT_EXISTS, ui5StepStatus.QUEUED, this._selector);
        try {
            await this._lclTestRun.expect(this._testCafeSelector.exists).notOk(message, options);
        } catch (err) {
            ui5Steps.setStepStatus(oStep, ui5StepStatus.FAILED);
            return;
        }

        ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
    }
}

class ui5AssertDef {
    private _selector: UI5StepBaseLib;
    private _lclTestRun: TestController;

    private get t(): TestController {
        try {
            var oRun = rqTrack.resolveContextTestRun();  //try first..
            if (oRun && oRun.controller) {
                return oRun.controller;
            }
        } catch { };
        return this._lclTestRun ? this._lclTestRun : ui5ActionDef.currentTestRun; //use 
    }

    public exists(expectInteractable: boolean = true): ui5AssertOperatorExists {
        let selector = this._selector;
        if (expectInteractable === true) {
            selector = selector instanceof UI5ChainSelection ? selector.interactable() : selector;
        }

        let oOperator = new ui5AssertOperatorExists(this._selector, this.t);
        return oOperator;
    }

    public visible(expectInteractable: boolean = true): ui5AssertOperatorVisible {
        let selector = this._selector;
        if (expectInteractable === true) {
            selector = selector instanceof UI5ChainSelection ? selector.interactable() : selector;
        }

        let oOperator = new ui5AssertOperatorVisible(this._selector, this.t);
        return oOperator;
    }

    public count(expectInteractable: boolean = true): ui5AssertOperatorCount {
        let selector = this._selector;
        if (expectInteractable === true) {
            selector = selector instanceof UI5ChainSelection ? selector.interactable() : selector;
        }

        let oOperator = new ui5AssertOperatorCount(this._selector, this.t);
        return oOperator;
    }

    public property(property: string): ui5AssertOperator {
        let oOperator = new ui5AssertOperator(this._selector, this.t);
        oOperator.setPropertyName(property);
        var f: (e: any) => any = <any>new Function('e', 'return e.property["' + property + '"];');
        oOperator.setDataFunction(f);

        return oOperator;
    }

    public tableLength(): ui5AssertOperator {
        return this.dynamic((e) => e?.tableData?.finalLength, "Final Table Length");
    }

    public insideATable(): ui5AssertOperator {
        return this.dynamic((e) => e?.tableSettings?.insideATable, "Inside A Table");
    }

    public bindingContextPath(sProp: string): ui5AssertOperator {
        return this.dynamic((e) => { if (e.bindingContext && e.bindingContext[sProp]) { return e?.bindingContext[sProp]; } else { return undefined; } }, sProp);
    }
    public bindingPath(sProp: string): ui5AssertOperator {
        return this.dynamic((e) => { if (e.binding && e.binding[sProp]) { return e?.binding[sProp]; } else { return undefined; } }, sProp);
    }
    public context(sProp: string): ui5AssertOperator {
        return this.dynamic((e) => e?.smartContext[sProp], sProp);
    }

    public tableCol(): ui5AssertOperator {
        return this.dynamic((e) => e?.tableSettings?.tableCol, "Table Column");
    }
    public tableRow(): ui5AssertOperator {
        return this.dynamic((e) => e?.tableSettings?.tableRow, "Table Row");
    }

    public dynamic(property: (e: UI5DataResult) => any, propName?: string): ui5AssertOperator {
        let oOperator = new ui5AssertOperator(this._selector, this.t);
        oOperator.setDataFunction(property);
        if (propName) {
            oOperator.setPropertyName(propName);
        }

        return oOperator;
    }

    public value(): ui5AssertOperator {
        let oOperator = new ui5AssertOperator(this._selector, this.t);
        oOperator.setDataFunction((e) => e);

        return oOperator;
    }

    public constructor(selector: UI5StepBaseLib | any, t?: TestController) {
        if (selector instanceof UI5ChainSelection) {
            this._selector = selector;
        } else {
            this._selector = new UI5AnyValueBuilder(selector);
        }

        this._lclTestRun = t ? t : ui5ActionDef.currentTestRun;
    }
}


function ui5Assert(selector: UI5BaseBuilderIntf | Selector, t?: TestController) {
    return new ui5AssertDef(selector, t);
}

export { ui5Assert, ui5AssertDef, ui5AssertOperator };