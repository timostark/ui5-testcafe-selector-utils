import { ui5ActionDef } from "./ui5Action"

export function ui5Test(name: string, testCase: string, func: any) {
    func.testName = name;
    return test(name, func).meta('TEST_CASE', testCase).before(async test => {
        test.ctx.name = name;
        test.ctx.testCase = testCase;
        ui5ActionDef.currentTestRun = test;
    });
}