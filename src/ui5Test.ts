import { config } from "dotenv/types";
import { ClientFunction } from "testcafe";
import { ui5Proxy } from ".";
import { ui5ActionDef, ui5Steps } from "./ui5Action"
import { ui5Config } from "./ui5Config";
import { ui5Coverage } from "./ui5Coverage";
var colors = require('colors/safe');

try {
    require('dotenv').config();
} catch (err) { }

export function ui5Fixture(name: string, url: string, category?: string): FixtureFn {
    var urlUse = url;

    if (ui5Config.coverage.enabled) {
        urlUse = ui5Proxy.startCoverageProxy(url, ui5Config.coverage);
    }
    return fixture(name)
        .meta('PRODUCT', category ? category : "")
        .meta('URL', url)
        .before(async t => {
            if (ui5Config.coverage.enabled) {
                await ui5Proxy.getStartPromise();
            }
        })
        .after(async t => {
            if (ui5Config.coverage.enabled) {
                await ui5Proxy.logMissingComponents();
            }
        })
        .page(urlUse);
}


export function ui5Test(description: string, func: (actionDef: ui5ActionDef) => Promise<void>): TestFn;
export function ui5Test(description: string, testCase: string, func: (actionDef: ui5ActionDef) => Promise<void>): TestFn;

export function ui5Test(description: string, testCase: any, func?: (actionDef: ui5ActionDef) => Promise<void>): TestFn {
    var fnCall = func ? func : testCase;
    var testCase = func ? testCase : description;
    if (!testCase) {
        testCase = description;
    }
    return test.clientScripts({
        content: `
            window.addEventListener('error', function (e) {
                if(e.error) {
                    console.error(e.error.stack);
                }
            });`
    }).after(async t => {
        const { error } = await t.getBrowserConsoleMessages();
        const coverage = await ClientFunction((): any => { return window[<any>"__coverage__"]; })();
        if (coverage) {
            ui5Coverage.mergeConverage(coverage);
        }

        ui5Steps.setConsoleErrorLogs(t, error);
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + " : '" + description + "' stopped after " + sTime + "s"));

        if (ui5Config.coverage.enabled) {
            await ui5Proxy.checkLoggedComponents(t);
        }
    }).meta('TEST_CASE', testCase)(description, async t => {
        t.ctx.name = description;
        t.ctx.testCase = testCase;

        ui5ActionDef.currentTestRun = t;
        let ui5ActionsDefForRun = new ui5ActionDef(t);
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + " : '" + description + "' started after " + sTime + "s"));
        await fnCall(ui5ActionsDefForRun);
    });
}