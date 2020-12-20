
var colors = require('colors/safe');
import { ClientFunction, Selector, t } from "testcafe";
import { UI5SelectorDef } from "ui5-testcafe-selector";
import { ui5, UI5ComboBoxChainSelection } from ".";
import { ui5AssertDef, ui5AssertOperator, ui5AssertOperatorVisible } from "./ui5Asserts";
import { UI5ChainSelection, UI5BaseBuilder, UI5BaseBuilderIntf } from "./ui5Builder";

enum ui5StepType {
    UNDEFINED = 0,
    CLICK = 1,
    TYPE_TEXT = 2,
    ASSERT_VISIBLE = 3,
    ASSERT_PROPERTY_VALUE = 4,
    PRESS_KEY = 4,
    BLUR = 5,
    CLEAR_TEXT = 6,
    ASSERT_EXISTS = 7,
};

enum ui5StepStatus {
    UNDEFINED = 0,
    QUEUED = 1,
    PROCESSED = 2,
    FAILED = 3,
    FAILED_UNPROCESSED = 4
};

class ui5ActionStep {
    public stepId: number = 0;
    public stepType: ui5StepType = ui5StepType.UNDEFINED;
    public status: ui5StepStatus = ui5StepStatus.UNDEFINED;
    public testName: string = "";

    public selector: string = "";
    public activity: string = "";
    public startTime: number = 0;
    public endTime: number = 0;

    constructor(stepId: number, stepType: ui5StepType, status: ui5StepStatus, selector: string, startTime: number, testName: string, activity?: string) {
        this.stepId = stepId;
        this.stepType = stepType;
        this.status = status;
        this.selector = selector;
        this.startTime = startTime;
        this.testName = testName;
        this.activity = activity ? activity : "";
    }
}

interface ui5ActionTests {
    [key: string]: ui5ActionStep[];
}

interface ui5ActionErrorLogs {
    [key: string]: string[];
}

class ui5StepsDef {
    _steps: ui5ActionTests = {};
    _startTime: number = 0;
    _errorLogs: ui5ActionErrorLogs = {};

    getCurrentTestName(t?: TestController): string {
        t = t ? t : ui5ActionDef.currentTestRun;

        if (t.ctx && t.ctx.testCase) {
            return t.ctx.testCase;
        } else if (t.ctx && t.ctx.name) {
            return t.ctx.name;
        }
        return "";
    }

    setConsoleErrorLogs(t: TestController, errorLog: string[]) {
        this._errorLogs[this.getCurrentTestName(t)] = errorLog;
    }

    getConsoleErrorLog(testCase: string): string[] {
        if (this._errorLogs[testCase]) {
            return this._errorLogs[testCase];
        }
        return [];
    }

    getStatusDescr(status: ui5StepStatus): string {
        switch (status) {
            case ui5StepStatus.FAILED:
                return "Failed";
            case ui5StepStatus.FAILED_UNPROCESSED:
                return "Failed (previous errors)";
            case ui5StepStatus.PROCESSED:
                return "Processed";
            case ui5StepStatus.QUEUED:
                return "Queued";
            default:
                return "";
        }
    }

    getStepDescr(step: ui5StepType): string {
        switch (step) {
            case ui5StepType.CLICK:
                return "Click";
            case ui5StepType.TYPE_TEXT:
                return "Type-Text";
            case ui5StepType.BLUR:
                return "Blurs";
            case ui5StepType.ASSERT_VISIBLE:
                return "Asserts Visiblity";
            case ui5StepType.ASSERT_PROPERTY_VALUE:
                return "Asserts Property"
            case ui5StepType.PRESS_KEY:
                return "Press Key";
            case ui5StepType.CLEAR_TEXT:
                return "Clear";
            default:
                return "";
        }
    }

    getSteps(sTestId: string, sFixtureName: string): ui5ActionStep[] {
        return this._steps[sTestId + sFixtureName];
    }

    getCurSteps(testName: string): ui5ActionStep[] {
        if (!this._steps[testName]) {
            this._steps[testName] = [];
            this._startTime = process.uptime();
        }

        return this._steps[testName];
    }

    getCurConsoleErrorLogs(): string[] {
        return this.getConsoleErrorLog(this.getCurrentTestName());
    }

    addStep(t: TestController, stepType: ui5StepType, status: ui5StepStatus, selector?: UI5BaseBuilderIntf | Selector, activity?: string): ui5ActionStep {
        var sFormat = "";
        if (selector) {
            sFormat = selector instanceof UI5BaseBuilder ? selector.format() : "Selector";
        }

        var sCurTestName = this.getCurrentTestName(t);
        let step = new ui5ActionStep(this.getCurSteps(sCurTestName).length, stepType, status, sFormat, process.uptime(), sCurTestName, activity);
        this.getCurSteps(sCurTestName).push(step);

        let sText = "Step " + step.stepId + ": " + this.getStatusDescr(step.status) + " (action: " + this.getStepDescr(step.stepType);
        if (activity) {
            sText += ", " + activity;
        }
        sText += ") for element " + sFormat;

        console.log(sText);

        return step;
    }

    setStepStatus(step: ui5ActionStep, stat: ui5StepStatus) {
        if (stat === ui5StepStatus.FAILED && this.hasFailedSteps(step.testName)) {
            stat = ui5StepStatus.FAILED_UNPROCESSED;
        }

        let oLastTest = this.getCurSteps(step.testName).find(e => { return e.stepId === step.stepId - 1 });
        step.startTime = oLastTest ? oLastTest.endTime : step.startTime;
        step.status = stat;
        step.endTime = process.uptime();

        var sTime = Math.round(((step.endTime - step.startTime) + Number.EPSILON) * 100) / 100;

        let sText = "Step " + step.stepId + ": " + this.getStatusDescr(step.status) + " within " + sTime + "s";
        if (stat == ui5StepStatus.FAILED) {
            sText = colors.red(sText);
        } else if (stat == ui5StepStatus.FAILED_UNPROCESSED) {
            sText = colors.yellow(sText);
        } else if (stat == ui5StepStatus.PROCESSED) {
            sText = colors.green(sText);
        }

        console.log(sText);
    }

    hasFailedSteps(test: string): boolean {
        return this.getCurSteps(test).find(e => e.status === ui5StepStatus.FAILED) !== undefined;
    }
}

let ui5Steps = new ui5StepsDef();

export interface UI5TypeActionOptions extends TypeActionOptions {
    /**
     * `true` to log only "****" inside the log handler
     */
    anonymize?: boolean;
}


class ui5ActionDef {

    public static currentTestRun: TestController;
    public lclTestRun: TestController;

    constructor(t?: TestController) {
        this.lclTestRun = t ? t : ui5ActionDef.currentTestRun;
    }

    public get t(): TestController {
        try {
            var oCtx = t.ctx; // this will crash in case no test run can be derived..
            return t;
        } catch { };
        return this.lclTestRun ? this.lclTestRun : ui5ActionDef.currentTestRun; //use 
    }

    public async debugSelector(elementId: string) {
        const fnWaitLoaded = ClientFunction((elementId) => {
            // @ts-ignore
            window["__ui5SelectorDebug"] = elementId;
        });
        await fnWaitLoaded(elementId);
    }


    public expectProperty(selector: UI5BaseBuilderIntf, prop: string): ui5AssertOperator {
        return new ui5AssertDef(selector, this.t).property(prop);
    }
    public expectExists(selector: UI5BaseBuilderIntf): ui5AssertOperator {
        return new ui5AssertDef(selector, this.t).exists();
    }
    public expectVisible(selector: UI5BaseBuilderIntf): ui5AssertOperatorVisible {
        return new ui5AssertDef(selector, this.t).visible();
    }
    public expectElement(selector: UI5BaseBuilderIntf, prop: (e: UI5SelectorDef) => any): ui5AssertOperator {
        return new ui5AssertDef(selector, this.t).element(prop);
    }

    public expectValue(selector: any): ui5AssertOperator {
        return new ui5AssertDef(selector, this.t).value();
    }

    public expect(selector: UI5BaseBuilderIntf | any): ui5AssertDef {
        return new ui5AssertDef(selector, this.t);
    }

    public clearText(selector: UI5BaseBuilderIntf | Selector): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.CLEAR_TEXT, ui5StepStatus.QUEUED, selector);

        var oLclTestRun = this.t;
        let oProm = this.t.typeText(selector instanceof UI5BaseBuilderIntf ? selector.build(true) : selector, "", { replace: true });
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });

        return <any>oProm;
    }

    public typeText(selector: UI5BaseBuilderIntf | Selector, text: string, options?: UI5TypeActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.TYPE_TEXT, ui5StepStatus.QUEUED, selector, options && options.anonymize ? "******" : text);

        let oProm = this.t.typeText(selector instanceof UI5BaseBuilderIntf ? selector.build(true) : selector, text, options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });

        return <any>oProm;
    }

    public selectElement(selectorParent: UI5BaseBuilderIntf, key: string): ui5ActionDefPromise {
        return this.click(selectorParent.comboBox().arrow()).
            click(ui5().parent(selectorParent).itemdata("key", key));
    }

    public click(selector: UI5BaseBuilderIntf | Selector, options?: ClickActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.CLICK, ui5StepStatus.QUEUED, selector);

        var oProm = this.t.click(selector instanceof UI5BaseBuilderIntf ? selector.build(true) : selector, options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public blur(): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.BLUR, ui5StepStatus.QUEUED);

        var oProm = this.t.click(Selector(".sapUiBody"));
        oProm = this._delegateAPIToPromise(this, oProm);
        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public pressKey(keys: string, options?: ActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.PRESS_KEY, ui5StepStatus.QUEUED, undefined, keys);

        var oProm = this.t.pressKey(keys, options);
        oProm = this._delegateAPIToPromise(this, oProm);
        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    private _delegateAPIToPromise(_handler: any, dest: any) {
        ["click", "typeText", "pressKey", "blur", "selectElement"].forEach((srcProp) => {
            const fn = function (...args: any[]) {
                return _handler[srcProp](...args);
            };
            dest[srcProp] = fn;
        });
        return dest;
    }
}

interface ui5ActionDefPromise extends ui5ActionDef, Promise<any> {
}

let ui5Action = new ui5ActionDef();
export { ui5Action, ui5ActionStep, ui5ActionDef, ui5Steps, ui5StepType, ui5StepStatus };