import { ui5ActionDef, ui5Steps, ui5StepType, ui5StepStatus } from "./ui5Action";
import { UI5BaseBuilderIntf } from "./ui5Builder";

class ui5AssertDef {
    async expectVisible(selector: UI5BaseBuilderIntf | Selector, message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(ui5StepType.ASSERT_VISIBLE, ui5StepStatus.QUEUED, selector);
        let oSel = selector instanceof UI5BaseBuilderIntf ? selector.build() : selector;

        //strange bug, that testcafe is not respecting the timeout within the visiblity option - therefore at first validate the exists.. afterwards the visible
        await ui5ActionDef.currentTestRun.expect(oSel.exists).ok(message, options);
        await ui5ActionDef.currentTestRun.expect(oSel.visible).ok(message, options);
        ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
    }

    async expectProperty(selector: UI5BaseBuilderIntf, property: string, propertyValue: any, message?: string, options?: AssertionOptions) {
        let oStep = ui5Steps.addStep(ui5StepType.ASSERT_VISIBLE, ui5StepStatus.QUEUED, selector);

        const data = await selector.data();
        await ui5ActionDef.currentTestRun.expect(data.property[property]).eql(propertyValue, message, options);

        ui5Steps.setStepStatus(oStep, ui5StepStatus.PROCESSED);
    }
}

let ui5Assert = new ui5AssertDef();
export { ui5Assert };