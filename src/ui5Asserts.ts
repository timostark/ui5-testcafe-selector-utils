import { ui5ActionDef, ui5Steps, ui5StepType, ui5StepStatus } from "./ui5Action";
import { UI5BaseBuilderIntf } from "./ui5Builder";

class ui5AssertDef {
    async expectVisible(selector: UI5BaseBuilderIntf | Selector) {
        let oStep = ui5Steps.addStep(ui5StepType.TYPE_TEXT, ui5StepStatus.QUEUED, selector);
        let oSel = selector instanceof UI5BaseBuilderIntf ? selector.build() : selector;
        await ui5ActionDef.currentTestRun.expect(oSel.visible).ok();
        ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
    }
}

let ui5Assert = new ui5AssertDef();
export { ui5Assert };