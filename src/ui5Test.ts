import { ui5ActionDef, ui5Steps } from "./ui5Action"
var colors = require('colors/safe');

require('dotenv').config();

export function ui5Fixture(name: string, product: string, url: string): FixtureFn {
    return fixture(name)
        .meta('PRODUCT', product)
        .page(url);
}

export function ui5Test(name: string, testCase: string, func: (test: TestController) => Promise<void>) {
    return test.clientScripts({
        content: `
            window.addEventListener('error', function (e) {
                if(e.error) {
                    //avoid errors of notifications, as they do not help anyone..
                    if(e.error.stack.indexOf("/sap/ushell/services/Notifications.js") === -1  ) {
                        console.error(e.error.stack);
                    }
                }
            });`
    }).after(async t => {
        const { error } = await t.getBrowserConsoleMessages();
        ui5Steps.setConsoleErrorLogs(error);
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + " : '" + name + "' stopped after " + sTime + "s"));
    }).meta('TEST_CASE', testCase)(name, async t => {
        t.ctx.name = name;
        t.ctx.testCase = testCase;
        ui5ActionDef.currentTestRun = t;
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + " : '" + name + "' started after " + sTime + "s"));
        await func(t);
    });
}