import { ClientFunction, Selector, t } from "testcafe";
import { ui5 } from ".";
import { ui5Action } from "./ui5Action";
import { ui5Config } from "./ui5Config";

class ui5WaiterDef {
    async waitForBOToBeLoaded() {
        await ui5().domQuery('#sap-ui-blocklayer-popup').expectVisible(false).notOK("Busy Indicator must go away!", { timeout: ui5Config.tileOpeningTimeout });
    }

    async waitForLaunchpadToBeLoaded() {
        //very very bad style - i do not really find an event, which is saying "i am done" - this is the closest i can get
        //this document is called duringstartup
        await ui5Action.expectExists(ui5().domQuery("#floatingContainer-shellArea")).ok("Wait for Launchpad to be loaded failed", { timeout: ui5Config.tileOpeningTimeout });
    }
}

let ui5Waiter: ui5WaiterDef = new ui5WaiterDef();
export { ui5Waiter };