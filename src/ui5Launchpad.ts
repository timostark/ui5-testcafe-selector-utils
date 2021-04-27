import { t } from "testcafe";
import { LoginUser, ui5, ui5TestData, UserRole, ui5Constants, SystemType } from ".";
import { ui5Action } from "./ui5Action";
import { ui5Config } from "./ui5Config";
import { ui5Waiter } from "./ui5Waiter";

export interface ui5LaunchpadStartupParams {
    role: UserRole;
    testData?: string,
    tile?: string;
}

class ui5LaunchpadDef {
    async startup(params: ui5LaunchpadStartupParams) {
        let user = this.getUser(params.role);

        //if wanted, wait for further actions..
        let testDataPromise = null;
        if (params.testData) {
            testDataPromise = ui5TestData.createTestData(params.role, params.testData, t.ctx.testCase);
        }

        await this.login(user.user, user.pw);

        //wait for the launchpad to be loaded.. 
        await ui5Waiter.waitForLaunchpadToBeLoaded();
        
        if(testDataPromise) {
            await testDataPromise;
        }


        if (ui5Config.launchpad.deactivateAnimation === true) {
            await ui5Action.deactivateAnimation();
        }

        if (params.tile) {
            await this.openTile(params.tile);
        }
    }

    private getUser(role: UserRole): LoginUser {
        return ui5Constants.getUser(role, SystemType.FIORI);
    }

    async login(userName: string, password: string) {
        await ui5Action.typeText(ui5("User-Name Field").domQuery('#USERNAME_FIELD-inner'), userName)
            .typeText(ui5("Password Field").domQuery('#PASSWORD_FIELD-inner'), password, { anonymize: true })
            .click(ui5("Login Button").domQuery("#LOGIN_LINK"));
    }

    async openTile(sHash: string) {
        await ui5Action.click(ui5("Launchpad-Tile " + sHash).genericTile().parentProperty("target", sHash).timeout(ui5Config.tileOpeningTimeout));
    }
}

export var ui5Launchpad = new ui5LaunchpadDef();