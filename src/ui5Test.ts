import { ui5ActionDef } from "./ui5Action"

export function ui5Test(name: string, testCase: string, func: (test: TestController) => Promise<void>) {
    return test.meta('TEST_CASE', testCase)(name, async t => {
        t.ctx.name = name;
        t.ctx.testCase = testCase;
        ui5ActionDef.currentTestRun = t;
        await func(t);
    });
}