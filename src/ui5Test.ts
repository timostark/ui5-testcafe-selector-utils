import { ClientFunction } from "testcafe";
import { ui5Proxy, ui5TraceOptions } from ".";
import { ui5ActionDef, ui5ActionDefIntf, ui5Steps, ui5TraceSelectorResult, ui5TraceSelectorResultOverview } from "./ui5Action"
import { ui5Config } from "./ui5Config";
import { ui5Coverage } from "./ui5Coverage";
var colors = require('colors/safe');

try {
    require('dotenv').config();
} catch (err) { }

export function ui5Fixture(name: string, url: string, category?: string): FixtureFn {
    var urlUse = url;

    if (ui5Config.coverage.enabled && ui5Config.coverage.proxy) {
        urlUse = ui5Proxy.startCoverageProxy(url, ui5Config.coverage);
    }
    return fixture(name)
        .meta('PRODUCT', category ? category : "")
        .meta('URL', url)
        .before(async t => {
            if (ui5Config.coverage.enabled && ui5Config.coverage.proxy) {
                await ui5Proxy.getStartPromise();
            }
        })
        .after(async t => {
            if (ui5Config.coverage.enabled && ui5Config.coverage.proxy) {
                await ui5Proxy.logMissingComponents();
            }
        })
        .page(urlUse);
}


export function ui5Test(description: string, func: (actionDef: ui5ActionDefIntf, t?: TestController) => Promise<void>): TestFn;
export function ui5Test(description: string, testCase: string, func: (actionDef: ui5ActionDefIntf, t?: TestController) => Promise<void>): TestFn;

export function ui5Test(description: string, testCase: any, func?: (actionDef: ui5ActionDefIntf, t?: TestController) => Promise<void>): TestFn {
    var fnCall = func ? func : testCase;
    var testCase = func ? testCase : description;
    if (!testCase) {
        testCase = description;
    }
    return test.clientScripts({ path: __dirname + "/clientScripts/client.js" }).after(async t => {
        const { error } = await t.getBrowserConsoleMessages();
        const coverage = await ClientFunction((): any => { return window[<any>"__coverage__"]; })();
        if (coverage) {
            ui5Coverage.mergeConverage(coverage);
        }

        ui5Steps.setConsoleErrorLogs(t, error);
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + " : '" + description + "' stopped after " + sTime + "s"));

        if (ui5Config.coverage.enabled && ui5Config.coverage.proxy) {
            await ui5Proxy.checkLoggedComponents(t);
        }

        if (ui5Config.traceSelectorOnFailure) {
            if (ui5Steps.hasFailedSteps(ui5Steps.getCurrentTestName(t))) {
                const fnGetLog = ClientFunction((traceOptions?: ui5TraceOptions): ui5TraceSelectorResultOverview => {
                    //@ts-ignore
                    return window.ui5TestCafeSelector.getSelectorLog(traceOptions);
                }, { boundTestRun: t });

                const log = await fnGetLog();
                let consLength = <any>{};
                for (var i = 0; i < log.found.length; i++) {
                    consLength[log.found[i].id] = true;
                }
                console.log(colors.bold("Found items:" + Object.keys(consLength).length));
                if (log.found.length > 0) {
                    console.table(log.found, ["id", "target", "property", "expected", "actual"])
                }

                console.log(colors.bold("Not-Found items:" + Object.keys(log.notFound).length));
                console.table(log.notFound, ["target", "property", "expected", "actual"]);
            }
        }
    }).meta('TEST_CASE', testCase)(description, async t => {
        t.ctx.name = description;
        t.ctx.testCase = testCase;

        ui5ActionDef.currentTestRun = t;
        let ui5ActionsDefForRun = new ui5ActionDef(t);
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log(colors.bold(testCase + " : '" + description + "' started after " + sTime + "s"));
        await fnCall(ui5ActionsDefForRun, t);
    });
}