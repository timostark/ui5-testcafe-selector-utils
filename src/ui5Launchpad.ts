import { ClientFunction, t } from "testcafe";
import { LoginUser, ui5, ui5TestData, UserRole, ui5Constants, SystemType } from ".";
import { ui5Action } from "./ui5Action";
import { ui5Config } from "./ui5Config";
import { ui5Proxy } from "./ui5Proxy";
import { ui5Waiter } from "./ui5Waiter";

export interface ui5LaunchpadStartupParams {
    role: UserRole;
    testData?: string,
    tile?: string;
    tileDirect?: boolean;
}

class ui5LaunchpadDef {
    async startup(params: ui5LaunchpadStartupParams) {
        let user = this.getUser(params.role);

        //if wanted, wait for further actions..
        let testDataPromise = null;
        if (params.testData) {
            testDataPromise = ui5TestData.createTestData(params.role, params.testData, t.ctx.testCase);
        }

        if (params.tileDirect === true) {
            let windowLoc = await ClientFunction(() => window.location)();
            await t.navigateTo(windowLoc.pathname + windowLoc.search + params.tile);
        }

        await this.login(user.user, user.pw);

        if( ui5Config.coverage && ui5Config.coverage.enabled === true && ui5Proxy.isRunning() ) {
            //foreward again to our url we want to go - that is required, because the login will "destroy" our actual url with debug components..
            await t.navigateTo(ui5Proxy.getAdjustedUrl());
        }

        //wait for the launchpad to be loaded.. 
        if (params.tileDirect !== true) {
            await ui5Waiter.waitForLaunchpadToBeLoaded();
        }


        if (testDataPromise) {
            await testDataPromise;
        }

        if (ui5Config.launchpad.deactivateAnimation === true) {
            await ui5Action.deactivateAnimation();
        }

        if (params.tile && params.tileDirect !== true) {
            await this.openTile(params.tile);
        }
    }

    private getUser(role: UserRole): LoginUser {
        return ui5Constants.getUser(role, SystemType.FIORI);
    }

    async login(userName: string, password: string) {
        await ui5Action.typeText(ui5("User-Name Field").domQuery('#USERNAME_FIELD-inner'), userName, { paste: true })
            .typeText(ui5("Password Field").domQuery('#PASSWORD_FIELD-inner'), password, { anonymize: true, paste: true })
            .click(ui5("Login Button").domQuery("#LOGIN_LINK"));
    }

    async getPerformanceMetrics() {
      const getLoadTime = JSON.parse(await t.eval(() => JSON.stringify(window.performance.timing)));
      const p = await getLoadTime(t);
      const timeToMS = ( time: number ) => parseInt( (time / 10).toString(), 10);
    
      const raw = {
        navigationStart: p.navigationStart,
        unloadEventStart: p.unloadEventStart,
        unloadEventEnd: p.unloadEventEnd,
        redirectStart: p.redirectStart,
        redirectEnd: p.redirectEnd,
        fetchStart: p.fetchStart,
        domainLookupStart: p.domainLookupStart,
        domainLookupEnd: p.domainLookupEnd,
        connectStart: p.connectStart,
        connectEnd: p.connectEnd,
        secureConnectionStart: p.secureConnectionStart,
        requestStart: p.requestStart,
        responseStart: p.responseStart,
        responseEnd: p.responseEnd,
        domLoading: p.domLoading,
        domInteractive: p.domInteractive,
        domContentLoadedEventStart: p.domContentLoadedEventStart,
        domContentLoadedEventEnd: p.domContentLoadedEventEnd,
        domComplete: p.domComplete,
        loadEventStart: p.loadEventStart,
        loadEventEnd: p.loadEventEnd
      };
    
      const computed = {
        ttfb: timeToMS(raw.responseEnd - raw.navigationStart),
        dns: timeToMS(raw.domainLookupEnd - raw.domainLookupStart),
        tcp: timeToMS(raw.connectEnd - raw.connectStart),
        domReady: timeToMS(raw.domComplete - raw.navigationStart),
        networkLatency: timeToMS(raw.responseEnd - raw.fetchStart),
        processing: timeToMS(raw.loadEventEnd - raw.responseEnd),
        everything: timeToMS(raw.loadEventEnd - raw.navigationStart)
      };
    
      return { raw, computed };
    };
    

    async openTile(sHash: string) {
        //check if launchpad tile is available.. if yes --> click it, otherwise navigate via URL to save time..
        const tileHash = ui5("Launchpad-Tile " + sHash).genericTile().parentProperty("target", sHash);
        if ( await tileHash.build().exists ) {
            await ui5Action.click(tileHash);
        } else {
            let windowLoc = await ClientFunction(() => window.location)();
            await t.navigateTo(windowLoc.pathname + windowLoc.search + sHash);
        }
    }
}

export var ui5Launchpad = new ui5LaunchpadDef();