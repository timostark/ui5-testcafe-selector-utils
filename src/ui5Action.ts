
import { ClientFunction, Selector, t } from "testcafe";
import { ui5, ui5Config } from ".";
import { ui5AssertDef, ui5AssertOperator, ui5AssertOperatorExists, ui5AssertOperatorVisible, ui5AssertOperatorCount } from "./ui5Asserts";
import { UI5BaseBuilder, UI5ChainSelection, UI5StepBaseLib } from "./ui5Builder";

const rqTrack = require("testcafe/lib/api/test-run-tracker");

const colorAssingmentPerTest: any = [
    [37, 39], [34, 39], [36, 39], [90, 39], [36, 39]
]

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
    RIGHT_CLICK = 8,
    DOUBLE_CLICK = 9,
    HOVER = 10,
    DRAG = 11,
    DRAG_TO_ELEMENT = 12,
    SELECT_TEXT = 13,
    SELECT_TEXT_AREA_CONTENT = 14,
    SELECT_EDITABLE_CONTENT = 15,
    WAIT = 16,
    NAVIGATE_TO = 17,
    SET_FILES_TO_UPLOAD = 18,
    UPLOAD = 19,
    CLEAR_UPLOAD = 20,
    TAKE_SCREENSHOT = 21,
    TAKE_ELEMENT_SCREENSHOT = 22,
    RESIZE_WINDOW = 24,
    MAXIMIZE_WINDOW = 25,
    SWITCH_TO_IFRAME = 26,
    SET_NATIVE_DIALOG_HANDLER = 27,
    OPEN_WINDOW = 28,
    DEBUG = 29
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
    public t: TestController;

    public selector: string = "";
    public activity: string = "";
    public startTime: number = 0;
    public endTime: number = 0;
    public isUI5Selector: boolean = false;
    public isFirstUI5Selector: boolean = false;
    public isTracedSelector: boolean = false;

    constructor(stepId: number, stepType: ui5StepType, status: ui5StepStatus, selector: string, startTime: number, testName: string, isUI5Selector: boolean, isTracedSelector: boolean, testCtrl: TestController, activity?: string) {
        this.stepId = stepId;
        this.t = testCtrl;
        this.stepType = stepType;
        this.status = status;
        this.selector = selector;
        this.startTime = startTime;
        this.testName = testName;
        this.activity = activity ? activity : "";
        this.isUI5Selector = isUI5Selector;
        this.isTracedSelector = isTracedSelector;
        this.isFirstUI5Selector = false;
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

    static testIds: any = {};

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

    getTestIdFromTestName(sCurTestName: string): number {
        if (typeof ui5StepsDef.testIds[sCurTestName] === "undefined") {
            ui5StepsDef.testIds[sCurTestName] = Object.keys(ui5StepsDef.testIds).length;
            if (ui5StepsDef.testIds[sCurTestName] >= colorAssingmentPerTest.length) {
                ui5StepsDef.testIds[sCurTestName] = 0; //reset to black if we have more than 5 tests...
            }
        }
        return ui5StepsDef.testIds[sCurTestName];
    }

    addStep(t: TestController, stepType: ui5StepType, status: ui5StepStatus, selector?: UI5StepBaseLib | Selector, activity?: string): ui5ActionStep {
        var sFormat = "";
        if (selector) {
            sFormat = selector instanceof UI5BaseBuilder ? selector.format() : "Selector";
        }


        var bUI5Selector = selector instanceof UI5BaseBuilder ? true : false;
        var bIsTraceSelector = selector instanceof UI5BaseBuilder && selector.isTraced() ? true : false;
        var sCurTestName = this.getCurrentTestName(t);
        const curTestId = this.getTestIdFromTestName(sCurTestName);
        const sCurTestWithColor = "\u001b[" + colorAssingmentPerTest[curTestId][0] + "m" + sCurTestName + "\u001b[" + colorAssingmentPerTest[curTestId][1] + "m";
        let step = new ui5ActionStep(this.getCurSteps(sCurTestName).length, stepType, status, sFormat, process.uptime(), sCurTestName, bUI5Selector, bIsTraceSelector, t, activity);
        if (this.getCurSteps(sCurTestName).filter(e => e.isUI5Selector === true).length === 0 && bUI5Selector === true) {
            step.isFirstUI5Selector = true;
        }
        this.getCurSteps(sCurTestName).push(step);

        let sStepDescr = "Step " + step.stepId + ": action: " + this.getStepDescr(step.stepType) + (activity ? ", " + activity : "") + " for element " + sFormat;
        if (selector instanceof UI5BaseBuilder) {
            selector.actionDescription(sStepDescr);
        }

        //colorize the test
        let sText = sCurTestWithColor + ", Step " + step.stepId + ": " + this.getStatusDescr(step.status) + " (action: " + this.getStepDescr(step.stepType);
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

        const curTestId = this.getTestIdFromTestName(step.testName);
        const sCurTestWithColor = "\u001b[" + colorAssingmentPerTest[curTestId][0] + "m" + step.testName + "\u001b[" + colorAssingmentPerTest[curTestId][1] + "m";


        let oLastTest = this.getCurSteps(step.testName).find(e => { return e.stepId === step.stepId - 1 });
        step.startTime = oLastTest ? oLastTest.endTime : step.startTime;
        step.status = stat;
        step.endTime = process.uptime();

        var sTime = Math.round(((step.endTime - step.startTime) + Number.EPSILON) * 100) / 100;

        let sText = "Step " + step.stepId + ": " + this.getStatusDescr(step.status) + " within " + sTime + "s";
        if (stat == ui5StepStatus.FAILED) {
            sText = "\u001b[31m" + sText + "\u001b[39m";
        } else if (stat == ui5StepStatus.FAILED_UNPROCESSED) {
            sText = "\u001b[33m" + sText + "\u001b[39m";
        } else if (stat == ui5StepStatus.PROCESSED) {
            sText = "\u001b[32m" + sText + "\u001b[39m";
        }
        sText = sCurTestWithColor + ", " + sText;

        console.log(sText);
    }

    hasFailedSteps(test: string): boolean {
        return this.getCurSteps(test).find(e => e.status === ui5StepStatus.FAILED) !== undefined;
    }
}

let ui5Steps = new ui5StepsDef();

/// <reference path="testcafe" />
export interface UI5TypeActionOptions extends TypeActionOptions {
    /**
     * `true` to log only "****" inside the log handler
     */
    anonymize?: boolean;

    /**
     * `true` to press enter after typing
     */
    confirm?: boolean;
}

export interface ui5TraceSelectorItemResult {
    target: string,
    property: string,
    expected: string,
    actual: string,
    ok: string
};

export interface ui5TraceSelectorItemResultOK {
    id: string,
    target: string,
    property: string,
    expected: string,
    actual: string
};

export enum ui5TraceMismatchType {
    CONTROL_TYPE = "metadata.elementName",
    CONTEXT = "context",
    ID = "identifier.id"
}

export interface ui5TraceOptions {
    showWithoutDomRef?: boolean,
    hideTypes?: ui5TraceMismatchType[];
    timeout?: number;
    showFoundElements?: boolean;
    showCorrectValues?: boolean;
}

export interface ui5TraceSelectorResult {
    [id: string]: ui5TraceSelectorItemResult;
};

export interface ui5TraceSelectorResultOverview {
    found: ui5TraceSelectorItemResultOK[];
    notFound: ui5TraceSelectorResult;
};

export enum ui5SupportAssistantIssueSeverity {
    High = "High",
    Medium = "Medium",
    Low = "Low"
};

export interface ui5SupportAssistantIssue {
    severity: ui5SupportAssistantIssueSeverity,
    ruleId: string,
    context: string,
    details: string
};

export interface ui5SupportAssistantAssertion {
    failOnSeverity?: ui5SupportAssistantIssueSeverity[],
    outputLog?: boolean
};

interface ui5ActionDefIntf {
    debugSelector(selector?: UI5ChainSelection): Promise<void>;
    traceSelector(selector: UI5ChainSelection, traceOptions?: ui5TraceOptions): Promise<void>;
    pressKey(keys: string, options?: ActionOptions): ui5ActionDefPromise;
    getTestId() : string,
    blur(): ui5ActionDefPromise;
    runSupportAssistant(): Promise<ui5SupportAssistantIssue[]>;
    deactivateAnimation(): Promise<any>;
    takeElementScreenshot(selector: UI5ChainSelection | Selector, path: string, options?: TakeElementScreenshotOptions): ui5ActionDefPromise;
    selectText(selector: UI5ChainSelection | Selector, startPos?: number, endPos?: number, options?: ActionOptions): ui5ActionDefPromise;
    dragToElement(selector: UI5ChainSelection | Selector, destinationSelector: UI5ChainSelection | Selector, options?: MouseActionOptions): ui5ActionDefPromise;
    drag(selector: UI5ChainSelection | Selector, dragOffsetX: number, dragOffsetY: number, options?: MouseActionOptions): ui5ActionDefPromise;
    hover(selector: UI5ChainSelection | Selector, options?: MouseActionOptions): ui5ActionDefPromise;
    doubleClick(selector: UI5ChainSelection | Selector, options?: ClickActionOptions): ui5ActionDefPromise;
    selectElement(selectorParent: UI5ChainSelection, key: string): ui5ActionDefPromise;
    typeText(selector: UI5ChainSelection | Selector, text: string, options?: UI5TypeActionOptions): ui5ActionDefPromise;
    clearText(selector: UI5ChainSelection | Selector): ui5ActionDefPromise;
    expect(selector: UI5ChainSelection | any): ui5AssertDef;
    debug(): ui5ActionDefPromise;

    expectAny(selector: any): ui5AssertOperator;
    expectVisible(selector: UI5ChainSelection): ui5AssertOperatorVisible;
    expectProperty(selector: UI5ChainSelection, propName: string): ui5AssertOperator;
    expectCount(selector: UI5ChainSelection): ui5AssertOperatorCount;
    expectExists(selector: UI5ChainSelection): ui5AssertOperatorExists;
    expectNoSupportAssistantIssue(config?: ui5SupportAssistantAssertion): Promise<void>;
    rightClick(selector: UI5ChainSelection | Selector, options?: ClickActionOptions): ui5ActionDefPromise;
    click(selector: UI5ChainSelection | Selector, options?: ClickActionOptions): ui5ActionDefPromise;
}

class ui5ActionProxyDef implements ui5ActionDefIntf {
    private getRunDef(): ui5ActionDef {
        try {
            var oRun = rqTrack.resolveContextTestRun();  //try first..
            if (oRun && oRun.controller) {
                //search it based on our current controller
                for (let i = 0; i < ui5ActionDef.instances.length; i++) {
                    if (ui5ActionDef.instances[i].getTestId() === oRun.test.id) {
                        return ui5ActionDef.instances[i];
                    }
                }
            }
        } catch { };

        return ui5ActionDef.instances[0];
    }

    public async debugSelector(selector?: UI5ChainSelection): Promise<void> {
        return this.getRunDef().debugSelector(selector);
    }

    public async deactivateAnimation(): Promise<void> {
        return this.getRunDef().deactivateAnimation();
    }

    public async runSupportAssistant(): Promise<ui5SupportAssistantIssue[]> {
        return this.getRunDef().runSupportAssistant();
    }

    public async traceSelector(selector: UI5ChainSelection, traceOptions?: ui5TraceOptions): Promise<void> {
        return this.getRunDef().traceSelector(selector, traceOptions);
    }
    public pressKey(keys: string, options?: ActionOptions): ui5ActionDefPromise {
        return this.getRunDef().pressKey(keys, options);
    }

    public debug(): ui5ActionDefPromise {
        return this.getRunDef().debug();
    }
    public getTestId(): string {
        return this.getRunDef().getTestId();
    }
    
    public blur(): ui5ActionDefPromise {
        return this.getRunDef().blur();
    }
    public takeElementScreenshot(selector: UI5ChainSelection | Selector, path: string, options?: TakeElementScreenshotOptions): ui5ActionDefPromise {
        return this.getRunDef().takeElementScreenshot(selector, path, options);
    }
    public selectText(selector: UI5ChainSelection | Selector, startPos?: number, endPos?: number, options?: ActionOptions): ui5ActionDefPromise {
        return this.getRunDef().selectText(selector, startPos, endPos, options);
    }
    public dragToElement(selector: UI5ChainSelection | Selector, destinationSelector: UI5ChainSelection | Selector, options?: MouseActionOptions): ui5ActionDefPromise {
        return this.getRunDef().dragToElement(selector, destinationSelector, options);
    }
    public drag(selector: UI5ChainSelection | Selector, dragOffsetX: number, dragOffsetY: number, options?: MouseActionOptions): ui5ActionDefPromise {
        return this.getRunDef().drag(selector, dragOffsetX, dragOffsetY, options);
    }
    public hover(selector: UI5ChainSelection | Selector, options?: MouseActionOptions): ui5ActionDefPromise {
        return this.getRunDef().hover(selector, options);
    }
    public doubleClick(selector: UI5ChainSelection | Selector, options?: ClickActionOptions): ui5ActionDefPromise {
        return this.getRunDef().doubleClick(selector, options);
    }
    public selectElement(selectorParent: UI5ChainSelection, key: string): ui5ActionDefPromise {
        return this.getRunDef().selectElement(selectorParent, key);
    }
    public typeText(selector: UI5ChainSelection | Selector, text: string, options?: UI5TypeActionOptions): ui5ActionDefPromise {
        return this.getRunDef().typeText(selector, text, options);
    }
    public clearText(selector: UI5ChainSelection | Selector): ui5ActionDefPromise {
        return this.getRunDef().clearText(selector);
    }
    public expect(selector: UI5ChainSelection | any): ui5AssertDef {
        return this.getRunDef().expect(selector);
    }
    public expectAny(selector: any): ui5AssertOperator {
        return this.getRunDef().expectAny(selector);
    }
    public expectVisible(selector: UI5ChainSelection): ui5AssertOperatorVisible {
        return this.getRunDef().expectVisible(selector);
    }
    public expectCount(selector: UI5ChainSelection): ui5AssertOperatorCount {
        return this.getRunDef().expectCount(selector);
    }
    public expectExists(selector: UI5ChainSelection): ui5AssertOperatorExists {
        return this.getRunDef().expectExists(selector);
    }
    public expectProperty(selector: UI5ChainSelection, propName: string): ui5AssertOperator {
        return this.getRunDef().expectProperty(selector, propName);
    }
    public async expectNoSupportAssistantIssue(config?: ui5SupportAssistantAssertion): Promise<void> {
        return this.getRunDef().expectNoSupportAssistantIssue(config);
    }

    public rightClick(selector: UI5ChainSelection | Selector, options?: ClickActionOptions): ui5ActionDefPromise {
        return this.getRunDef().rightClick(selector, options);
    }
    public click(selector: UI5ChainSelection | Selector, options?: ClickActionOptions): ui5ActionDefPromise {
        return this.getRunDef().click(selector, options);
    }
}

class ui5ActionDef implements ui5ActionDefIntf {
    public static currentTestRun: TestController;
    public lclTestRun: TestController;
    public static instances: ui5ActionDef[] = [];

    constructor(t: TestController) {
        this.lclTestRun = t;

        ui5ActionDef.instances.push(this);
    }

    public getTestId(): string {
        return (<any>this.t).testRun.test.id;
    }

    public get t(): TestController {
        try {
            var oRun = rqTrack.resolveContextTestRun();  //try first..
            if (oRun && oRun.controller) {
                return oRun.controller;
            }
        } catch { };
        return this.lclTestRun;
    }

    public async debugSelector(selector?: UI5ChainSelection) {
        var oId = (<any>selector)?._id;
        const cntStart = ClientFunction(function (oId) {
            // @ts-ignore
            return window.ui5TestCafeSelector.startRecordMode(oId);
        });
        await cntStart(oId);
    }

    private async _logSelector(traceOptions?: ui5TraceOptions) {
        const fnGetLog = ClientFunction((traceOptions?: ui5TraceOptions): ui5TraceSelectorResultOverview => {
            //@ts-ignore
            return window.ui5TestCafeSelector.getSelectorLog(traceOptions);
        }, { boundTestRun: this.t });

        const log = await fnGetLog(traceOptions);

        if (!traceOptions || typeof traceOptions.showFoundElements === "undefined" || traceOptions.showFoundElements === true) {
            let consLength = <any>{};
            for (var i = 0; i < log.found.length; i++) {
                consLength[log.found[i].id] = true;
            }
            console.log("\u001b[1mFound items:\u001b[22m" + Object.keys(consLength).length);

            if (log.found.length > 0) {
                console.table(log.found, ["id", "target", "property", "expected", "actual"])
            }
        }

        var aCols = ["target", "property", "expected", "actual"];
        if (traceOptions?.showCorrectValues === true) {
            //loop over all items to find all possible options, which were added..
            for (var sNotFound in log.notFound) {
                for (var sProp in log.notFound[sNotFound]) {
                    if (aCols.indexOf(sProp) === -1) {
                        aCols.push(sProp);
                    }
                }
            }
        }
        console.log("\u001b[1mNot-Found items:\u001b[22m" + Object.keys(log.notFound).length);
        console.table(log.notFound, aCols);
    }

    public async traceSelector(selector: UI5ChainSelection, traceOptions?: ui5TraceOptions) {
        await selector.build(true, traceOptions?.timeout ? traceOptions.timeout : 0);
        await this._logSelector(traceOptions);
    }

    public expectExists(selector: UI5ChainSelection): ui5AssertOperatorExists {
        return new ui5AssertDef(selector, this.t).exists();
    }
    public expectCount(selector: UI5ChainSelection): ui5AssertOperatorCount {
        return new ui5AssertDef(selector.selectAll(), this.t).count();
    }
    public expectVisible(selector: UI5ChainSelection): ui5AssertOperatorVisible {
        return new ui5AssertDef(selector, this.t).visible();
    }
    public expectProperty(selector: UI5ChainSelection, propName: string): ui5AssertOperator {
        return new ui5AssertDef(selector, this.t).property(propName);
    }
    public expectAny(selector: any): ui5AssertOperator {
        return new ui5AssertDef(selector, this.t).value();
    }

    public expect(selector: UI5ChainSelection | any): ui5AssertDef {
        return new ui5AssertDef(selector, this.t);
    }

    public async expectNoSupportAssistantIssue(config?: ui5SupportAssistantAssertion): Promise<any> {
        var cnfg = config ? config : {};
        if (typeof cnfg.failOnSeverity === "undefined") {
            cnfg.failOnSeverity = [ui5SupportAssistantIssueSeverity.High, ui5SupportAssistantIssueSeverity.Medium];
        }
        if (typeof cnfg.outputLog === "undefined") {
            cnfg.outputLog = true;
        }
        const issues = await this.runSupportAssistant();
        const issuesWithSeverity = issues.filter(e => { return cnfg.failOnSeverity?.indexOf(e.severity) !== -1 });

        if (cnfg.outputLog) {
            console.log("Output of Support Assistant:");
            console.table(issuesWithSeverity);
        }

        await this.expectAny(issuesWithSeverity.length).equal(0, "We are expecting to have no support assistant issue for the severities " + cnfg.failOnSeverity.join(","));
    }


    private _getSelector(selector: UI5ChainSelection | Selector, step: ui5ActionStep): Selector {
        let iNumber = undefined;
        if (selector instanceof UI5BaseBuilder) {
            if (selector.hasOwnTimeout()) {
                iNumber = (<any>selector)._timeout;
            } else if (step.isFirstUI5Selector === true) {
                iNumber = ui5Config.firstSelectorTimeout;

                if ((<any>this.t).testRun.opts.selectorTimeout && iNumber < (<any>this.t).testRun.opts.selectorTimeout) {
                    iNumber = undefined; //reset to default..
                }
            }

            if (ui5Config.timeoutIncreaseFactor > 1) {
                if (!iNumber) {
                    iNumber = (<any>this.t).testRun.opts.selectorTimeout * ui5Config.timeoutIncreaseFactor;
                } else {
                    iNumber = iNumber * ui5Config.timeoutIncreaseFactor;
                }
            }
        }
        let oSel = selector instanceof UI5BaseBuilder ? selector.build(true, iNumber) : selector;
        return oSel;
    }

    public clearText(selector: UI5ChainSelection | Selector): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.CLEAR_TEXT, ui5StepStatus.QUEUED, selector);
        let oProm = this.t.typeText(this._getSelector(selector, oAction), "", { replace: true });
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });

        return <any>oProm;
    }

    public async traceSel(): Promise<ui5SupportAssistantIssue[]> {
        const oSupportAssistant = ClientFunction((): ui5SupportAssistantIssue[] => {
            //@ts-ignore
            return ui5TestCafeSelector.runSupportAssistant();
        });
        const supportAssistantResults = await oSupportAssistant();
        return supportAssistantResults;
    }


    public async runSupportAssistant(): Promise<ui5SupportAssistantIssue[]> {
        const oSupportAssistant = ClientFunction((): ui5SupportAssistantIssue[] => {
            //@ts-ignore
            return ui5TestCafeSelector.runSupportAssistant();
        });
        const supportAssistantResults = await oSupportAssistant();
        return supportAssistantResults;
    }

    public async deactivateAnimation(): Promise<any> {
        await this.click(ui5().domQuery(".sapUiBody")); //only reason: wait for xhr requests to be finished..
        const oDeactivateFunction = ClientFunction(() => {
            return new Promise(function (resolve) {
                //@ts-ignore
                sap.ui.getCore().getConfiguration().setAnimationMode(sap.ui.core.Configuration.AnimationMode.none);
            });
        });
        await oDeactivateFunction();
    }

    public typeText(selector: UI5ChainSelection | Selector, text: string, options?: UI5TypeActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.TYPE_TEXT, ui5StepStatus.QUEUED, selector, options && options.anonymize ? "******" : text);
        let oProm = this.t.typeText(this._getSelector(selector, oAction), text, options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function (err) {
            //in theory we should rewrite the callsiteFrameIdx here - let's see if that stuff get's relevant..
            // err.callsite.callsiteFrameIdx = 10;
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });

        if (options?.confirm === true) {
            return (<any>oProm).pressKey("enter");
        }

        return <any>oProm;
    }

    public selectElementByIndex(selectorParent: UI5ChainSelection, iIndex: number): ui5ActionDefPromise {
        return this.click(selectorParent.clone().comboBox().arrow()).
            click(ui5().parent(selectorParent.clone()).insideATable(iIndex));
    }

    public selectElementByText(selectorParent: UI5ChainSelection, text: string): ui5ActionDefPromise {
        return this.click(selectorParent.clone().comboBox().arrow()).
            click(ui5().parent(selectorParent.clone()).itemdata("text", text));
    }

    public selectElement(selectorParent: UI5ChainSelection, key: string): ui5ActionDefPromise {
        return this.click(selectorParent.clone().comboBox().arrow()).
            click(ui5().parent(selectorParent.clone()).itemdata("key", key));
    }

    public doubleClick(selector: UI5ChainSelection | Selector, options?: ClickActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.DOUBLE_CLICK, ui5StepStatus.QUEUED, selector);

        var oProm = this.t.doubleClick(this._getSelector(selector, oAction), options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public rightClick(selector: UI5ChainSelection | Selector, options?: ClickActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.RIGHT_CLICK, ui5StepStatus.QUEUED, selector);

        var oProm = this.t.rightClick(this._getSelector(selector, oAction), options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public debug(): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.DEBUG, ui5StepStatus.QUEUED);

        var oProm = this.t.debug();
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public hover(selector: UI5ChainSelection | Selector, options?: MouseActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.HOVER, ui5StepStatus.QUEUED, selector);

        var oProm = this.t.hover(this._getSelector(selector, oAction), options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public drag(selector: UI5ChainSelection | Selector, dragOffsetX: number, dragOffsetY: number, options?: MouseActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.DRAG, ui5StepStatus.QUEUED, selector);

        var oProm = this.t.drag(this._getSelector(selector, oAction), dragOffsetX, dragOffsetY, options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public dragToElement(selector: UI5ChainSelection | Selector, destinationSelector: UI5ChainSelection | Selector, options?: MouseActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.DRAG, ui5StepStatus.QUEUED, selector);

        var oProm = this.t.dragToElement(this._getSelector(selector, oAction), this._getSelector(destinationSelector, oAction), options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public selectText(selector: UI5ChainSelection | Selector, startPos?: number, endPos?: number, options?: ActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.SELECT_TEXT, ui5StepStatus.QUEUED, selector);

        var oProm = this.t.selectText(this._getSelector(selector, oAction), startPos, endPos, options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public click(selector: UI5ChainSelection | Selector, options?: ClickActionOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.CLICK, ui5StepStatus.QUEUED, selector);

        var oProm = this.t.click(this._getSelector(selector, oAction), options);
        oProm = this._delegateAPIToPromise(this, oProm);

        oProm.then(function () { //dmmy..
            ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
        }, function () {
            ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
        });
        return <any>oProm;
    }

    public takeElementScreenshot(selector: UI5ChainSelection | Selector, path: string, options?: TakeElementScreenshotOptions): ui5ActionDefPromise {
        let oAction = ui5Steps.addStep(this.t, ui5StepType.TAKE_ELEMENT_SCREENSHOT, ui5StepStatus.QUEUED, selector);

        var oProm = this.t.takeElementScreenshot(selector instanceof UI5BaseBuilder ? selector.build(true) : selector, path, options);
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
        ["click", "typeText", "clearText", "traceSelector", "expectExists", "expectCount", "expectVisible", "expectProperty", "expectAny", "expect", "deactivateAnimation", "selectElement", "traceSelector", "doubleClick", "rightClick", "hover", "drag", "dragToElement", "selectText", "takeElementScreenshot", "pressKey", "blur", "selectElement"].forEach((srcProp) => {
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

let ui5Action = new ui5ActionProxyDef();
export { ui5Action, ui5ActionStep, ui5ActionDef, ui5Steps, ui5StepType, ui5StepStatus, ui5ActionDefIntf };