import { ui5ActionDef } from "./ui5Action"

export function ui5Test(name: string, testCase: string, func: (test: TestController) => Promise<void>) {
    return test
        .after(async t => {
            var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
            console.log(testCase + ":" + name + " stopped after " + sTime + "s");
        }).meta('TEST_CASE', testCase)(name, async t => {
            t.ctx.name = name;
            t.ctx.testCase = testCase;
            ui5ActionDef.currentTestRun = t;
            var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
            console.log(testCase + ":" + name + " started after " + sTime + "s");
            await func(t);
        });
}