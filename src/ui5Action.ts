
var colors = require('colors/safe');
import { t } from "testcafe";
import { UI5ChainSelection, UI5BaseBuilder } from "./ui5Builder";

enum ui5StepType {
    UNDEFINED = 0,
    CLICK = 1,
    TYPE_TEXT = 2
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

    public selector: string = "";
    public activity: string = "";
    public startTime: number = 0;
    public endTime: number = 0;

    constructor(stepId: number, stepType: ui5StepType, status: ui5StepStatus, selector: string, startTime: number, activity?: string) {
        this.stepId = stepId;
        this.stepType = stepType;
        this.status = status;
        this.selector = selector;
        this.startTime = startTime;
        this.activity = activity ? activity : "";
    }
}

interface ui5ActionTests {
    [key: string]: ui5ActionStep[];
}

class ui5StepsDef {
    _steps: ui5ActionTests = {};
    _startTime: number = 0;

    getCurrentTestName(): string {
        if (ui5ActionDef.currentTestRun.ctx && ui5ActionDef.currentTestRun.ctx.testCase) {
            return ui5ActionDef.currentTestRun.ctx.testCase;
        } else if (ui5ActionDef.currentTestRun.ctx && ui5ActionDef.currentTestRun.ctx.name) {
            return ui5ActionDef.currentTestRun.ctx.name;
        }
        return "";
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
            default:
                return "";
        }
    }

    getSteps(sTestId: string, sFixtureName: string): ui5ActionStep[] {
        return this._steps[sTestId + sFixtureName];
    }

    getCurSteps(): ui5ActionStep[] {
        if (!this._steps[this.getCurrentTestName()]) {
            this._steps[this.getCurrentTestName()] = [];
            this._startTime = process.uptime();
        }

        return this._steps[this.getCurrentTestName()];
    }

    addStep(stepType: ui5StepType, status: ui5StepStatus, selector: UI5BaseBuilder<any> | Selector, activity?: string): ui5ActionStep {
        var sFormat = selector instanceof UI5BaseBuilder ? selector.format() : "Selector";

        let step = new ui5ActionStep(this.getCurSteps().length, stepType, status, sFormat, process.uptime(), activity);
        this.getCurSteps().push(step);

        let sText = "Step " + step.stepId + ": " + this.getStatusDescr(step.status) + " (action: " + this.getStepDescr(step.stepType);
        if (activity) {
            sText += ", " + activity;
        }
        sText += ") for element " + sFormat;

        console.log(sText);

        return step;
    }

    setStepStatus(step: ui5ActionStep, stat: ui5StepStatus) {
        if (stat === ui5StepStatus.FAILED && this.hasFailedSteps()) {
            stat = ui5StepStatus.FAILED_UNPROCESSED;
        }

        step.status = stat;
        step.endTime = process.uptime();

        var sTime = Math.round(((step.endTime - step.startTime) + Number.EPSILON) * 100) / 100;

        let sText = "Step " + step.stepId + ": " + this.getStatusDescr(step.status) + " within " + sTime + "s";
        if (stat == ui5StepStatus.FAILED) {
            sText = colors.red(sText);
        } else if (stat == ui5StepStatus.FAILED_UNPROCESSED) {
            sText = colors.orange(sText);
        } else if (stat == ui5StepStatus.PROCESSED) {
            sText = colors.green(sText);
        }

        console.log(sText);
    }

    hasFailedSteps(): boolean {
        return this.getCurSteps().find(e => e.status === ui5StepStatus.FAILED) !== undefined;
    }
}

let ui5Steps = new ui5StepsDef();
let originalThen: any;
originalThen = Promise.resolve().then;

class ui5ActionDef {

    public static currentTestRun: TestController;
    executionChain: Promise<any>;

    constructor() {
        this.executionChain = Promise.resolve();
    }

    _createExtendedPromise(promise: any) {
        const extendedPromise = promise.then();

        extendedPromise.then = function () {
            return originalThen.apply(this, arguments);
        };

        this._delegateAPIToPromise(this, extendedPromise);

        return extendedPromise;
    }

    _enqueueTask(createTaskExecutor: any) {
        const executor = createTaskExecutor();

        this.executionChain.then = originalThen;
        this.executionChain = this.executionChain.then(executor);
        this.executionChain = this._createExtendedPromise(this.executionChain);

        return this.executionChain;
    }

    public typeText(selector: UI5BaseBuilder<any> | Selector, text: string, options?: TypeActionOptions): ui5ActionDefPromise {
        let oProm = <ui5ActionDefPromise>this._enqueueTask(() => {
            return (): Promise<any> => {
                //now execute action
                return new Promise((resolve, reject) => {
                    let oAction = ui5Steps.addStep(ui5StepType.TYPE_TEXT, ui5StepStatus.QUEUED, selector, text);
                    ui5ActionDef.currentTestRun.typeText(selector instanceof UI5BaseBuilder ? selector.build() : selector, text, options).then(function () {
                        ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
                        resolve();
                    }, function () {
                        ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
                        reject();
                    });
                });
            };
        });

        return oProm;
    }

    public click(selector: UI5BaseBuilder<any> | Selector, options?: ClickActionOptions): ui5ActionDefPromise {
        let oProm = <ui5ActionDefPromise>this._enqueueTask(() => {
            return (): Promise<any> => {
                //now execute action
                return new Promise((resolve, reject) => {
                    let oAction = ui5Steps.addStep(ui5StepType.CLICK, ui5StepStatus.QUEUED, selector);

                    ui5ActionDef.currentTestRun.click(selector instanceof UI5BaseBuilder ? selector.build() : selector, options).then(function () {
                        ui5Steps.setStepStatus(oAction, ui5StepStatus.PROCESSED);
                        resolve();
                    }, function () {
                        ui5Steps.setStepStatus(oAction, ui5StepStatus.FAILED);
                        reject();
                    });
                });

            };
        });

        return oProm;
    }

    private _delegateAPIToPromise(_handler: any, dest: any) {
        ["click", "typeText"].forEach((srcProp) => {
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
export { ui5Action, ui5ActionStep, ui5ActionDef };