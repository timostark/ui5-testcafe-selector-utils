import { ClientFunction } from "testcafe";
import { ui5 } from ".";

class ui5WaiterDef {
    async waitForBOToBeLoaded() {
        await ui5().domQuery('#sap-ui-blocklayer-popup').expectVisible(false).notOK("Busy Indicator must go away!", { timeout: 120000 });
    }

    async waitForLaunchpadToBeLoaded() {
        const fnWaitLoaded = ClientFunction(() => {
            return new Promise((resolve, reject) => {
                var iTimeout = setTimeout(e => {
                    reject(); //timeouts after 100 seconds
                }, 100000);
                var iInterval = setInterval(e => {
                    //very very bad style - i do not really find an event, which is saying "i am done" - this is the closest i can get
                    //this document is called duringstartup
                    // @ts-ignore
                    var oFloatingContainer = window["sap"]["ui"].getCore().byId("shell-floatingContainer");
                    if (oFloatingContainer) {
                        clearInterval(iInterval);
                        clearTimeout(iTimeout);
                        resolve();
                    }
                }, 10);
            });
        });
        await fnWaitLoaded();
    }
}

let ui5Waiter: ui5WaiterDef = new ui5WaiterDef();
export { ui5Waiter };