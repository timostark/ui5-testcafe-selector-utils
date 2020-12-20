import { ui5 } from ".";
import { ui5Action } from "./ui5Action";
import { ui5Waiter } from "./ui5Waiter";

interface startupParams {
    user: string,
    password: string,
    tile?: string;
}

class Launchpad {
    async startup(params: startupParams) {
        await this.login(params.user, params.password);

        //wait for the launchpad to be loaded.. 
        await ui5Waiter.waitForLaunchpadToBeLoaded();

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

export default new Launchpad();
