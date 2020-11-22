import { ui5ActionDef } from "./ui5Action"
var colors = require('colors/safe');

export function ui5Test(name: string, testCase: string, func: (test: TestController) => Promise<void>) {
    return test.clientScripts({
        content: `
            window.addEventListener('error', function (e) {
                alert(e.message); 
            });`
    }).after(async t => {
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + ":" + name + " stopped after " + sTime + "s"));
    }).meta('TEST_CASE', testCase)(name, async t => {
        t.ctx.name = name;
        t.ctx.testCase = testCase;
        ui5ActionDef.currentTestRun = t;
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + ":" + name + " started after " + sTime + "s"));
        await func(t);
    });
}