import { ui5 } from ".";
import { ui5Action } from "./ui5Action";
import { ui5Waiter } from "./ui5Waiter";

export interface ui5LaunchpadStartupParams {
    user: string,
    password: string,
    afterLogin?: () => Promise<any>,
    tile?: string;
}

class ui5LaunchpadDef {
    async startup(params: ui5LaunchpadStartupParams) {
        await this.login(params.user, params.password);

        //wait for the launchpad to be loaded.. 
        await ui5Waiter.waitForLaunchpadToBeLoaded();

        //if wanted, wait for further actions..
        if (params.afterLogin) {
            await params.afterLogin();
        }

        if (params.tile) {
            await this.openTile(params.tile);
        }
    }

    async login(userName: string, password: string) {
        await ui5Action.typeText(ui5("User-Name Field").domQuery('#USERNAME_FIELD-inner'), userName)
            .typeText(ui5("Password Field").domQuery('#PASSWORD_FIELD-inner'), password, { anonymize: true })
            .click(ui5("Login Button").domQuery("#LOGIN_LINK"));
    }

    async openTile(sHash: string) {
        await ui5Action.click(ui5("Launchpad-Tile " + sHash).genericTile().parentProperty("target", sHash));
    }
}

export var ui5Launchpad = new ui5LaunchpadDef();