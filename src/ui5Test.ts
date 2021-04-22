import { ClientFunction } from "testcafe";
import { ui5Launchpad, ui5Proxy, ui5TraceOptions, UserRole } from ".";
import { ui5ActionDef, ui5ActionDefIntf, ui5Steps, ui5TraceSelectorResultOverview } from "./ui5Action"
import { ui5Config } from "./ui5Config";
import { ui5Coverage } from "./ui5Coverage";
import { ui5CacheRequestHooks } from "./ui5Cache";
import { ui5Lumira } from "./ui5Lumira";
import { ui5TestData } from "./ui5TestData";
import { start } from "repl";

process.setMaxListeners(0);

export interface ui5FixtureProperties {
    disableCoverage: boolean
};

export function ui5Fixture(name: string, url: string, category?: string, additionalProperties?: ui5FixtureProperties): FixtureFn {
    var urlUse = url;

    if (ui5Config.coverage.enabled && ui5Config.coverage.proxy) {
        if (!(additionalProperties?.disableCoverage === true)) {
            urlUse = ui5Proxy.startCoverageProxy(url, ui5Config.coverage);
        }
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


interface BOParameter {
    number: number,
    value: string
};

export interface ui5BOLaunchpadParams {
    description: string,
    testCase: string,
    role: UserRole,
    testData?: string,
    parameter?: BOParameter[];
};

export interface ui5LaunchpadStartupParams {
    description: string,
    testCase: string,
    role: UserRole,
    testData?: string,
    tile?: string;
}

interface ui5MergedParams {
    description: string,
    testCase: string,
    role: UserRole,
    testData?: string,
    parameter?: BOParameter[];
    tile?: string;
    isLaunchpad: boolean;
}

export function lumiraTest(startup: ui5BOLaunchpadParams, func: (actionDef: ui5ActionDefIntf, t?: TestController) => Promise<void>): TestFn {
    let params: ui5MergedParams = {
        description: startup.description,
        testCase: startup.testCase,
        testData: startup.testData,
        role: startup.role,
        isLaunchpad: false,
        parameter: startup.parameter
    };
    return ui5TestInternal(params, func);
};

export function ui5Test(startup: ui5LaunchpadStartupParams, func: (actionDef: ui5ActionDefIntf, t?: TestController) => Promise<void>): TestFn {
    let params: ui5MergedParams = {
        description: startup.description,
        testCase: startup.testCase,
        testData: startup.testData,
        role: startup.role,
        isLaunchpad: true,
        tile: startup.tile
    };
    return ui5TestInternal(params, func);
};

function ui5TestInternal(startup: ui5MergedParams, func: (actionDef: ui5ActionDefIntf, t?: TestController) => Promise<void>): TestFn {
    return test.clientScripts({ path: __dirname + "/clientScripts/client.js" }).after(async t => {
        const { error } = await t.getBrowserConsoleMessages();
        const coverage = await ClientFunction((): any => { return window[<any>"__coverage__"]; })();
        if (coverage) {
            ui5Coverage.mergeConverage(coverage);
        }

        ui5Steps.setConsoleErrorLogs(t, error);
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log("\u001b[1m" + startup.testCase + " : '" + startup.description + "' stopped after " + sTime + "s\u001b[22m");

        if (ui5Config.coverage.enabled && ui5Config.coverage.proxy) {
            await ui5Proxy.checkLoggedComponents(t);
        }

        if (startup.testData) {
            await ui5TestData.deleteTestData(startup.role, startup.testCase, startup.testData);
        }
        
        if (ui5Config.traceSelectorOnFailure || ui5Config.logSelectorOnFailure) {
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

                ui5Steps.setTestIdErrorLog(ui5Steps.getCurrentTestName(t), log);

                if(ui5Config.traceSelectorOnFailure) {
                    console.log("\u001b[1mFound items:" + Object.keys(consLength).length + "\u001b[22m");
                    if (log.found.length > 0) {
                        console.table(log.found, ["id", "target", "property", "expected", "actual"])
                    }

                    console.log("\u001b[1mNot-Found items:" + Object.keys(log.notFound).length + "\u001b[22m");
                    console.table(log.notFound, ["target", "property", "expected", "actual"]);
                }
            }
        }
    }).meta('TEST_CASE', startup.testCase).requestHooks(ui5CacheRequestHooks())(startup.description, async t => {
        t.ctx.name = startup.description;
        t.ctx.testCase = startup.testCase;

        ui5ActionDef.currentTestRun = t;
        let ui5ActionsDefForRun = new ui5ActionDef(t);
        var sTime = Math.round(((process.uptime()) + Number.EPSILON) * 100) / 100;
        console.log("\u001b[1m" + startup.testCase + " : '" + startup.description + "' started after " + sTime + "s\u001b[22m");

        if (startup.isLaunchpad === true) {
            await ui5Launchpad.startup({
                role: startup.role,
                testData: startup.testData,
                tile: startup.tile
            });
        } else {
            await ui5Lumira.startup({
                role: startup.role,
                testData: startup.testData,
                parameter: startup.parameter,
            })
        }
        await func(ui5ActionsDefForRun, t);
    });
}