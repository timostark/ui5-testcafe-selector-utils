import { ui5ActionDef, ui5Steps } from "./ui5Action"
var colors = require('colors/safe');

require('dotenv').config();

export function ui5Fixture(name: string, product: string, url: string): FixtureFn {
    return fixture(name)
        .meta('PRODUCT', product)
        .meta('URL', url)
        .page(url);
}


export function ui5Test(name: string, testCase: string, func: (actionDef: ui5ActionDef) => Promise<void>) {
    return test.clientScripts({
        content: `
            window.addEventListener('error', function (e) {
                if(e.error) {
                    console.error(e.error.stack);
                }
            });`
    }).after(async t => {
        const { error } = await t.getBrowserConsoleMessages();
        ui5Steps.setConsoleErrorLogs(t, error);
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + " : '" + name + "' stopped after " + sTime + "s"));
    }).meta('TEST_CASE', testCase)(name, async t => {
        t.ctx.name = name;
        t.ctx.testCase = testCase;

        ui5ActionDef.currentTestRun = t;
        let ui5ActionsDefForRun = new ui5ActionDef(t);
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + " : '" + name + "' started after " + sTime + "s"));
        await func(ui5ActionsDefForRun);
    });
}