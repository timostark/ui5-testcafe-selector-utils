import { ClientFunction } from "testcafe";
import { ui5 } from ".";
import { ui5Action } from "./ui5Action";

export interface ui5SACStartupParameters {
    user: string,
    password: string,
    afterLogin?: () => Promise<any>
}

class ui5SACDef {
    constructor() {

    }

    public async startup(params: ui5SACStartupParameters) {
        await ui5Action.typeText(ui5("User-Name Field").domQuery('#j_username'), params.user)
            .typeText(ui5("Password Field").domQuery('#j_password'), params.password, { anonymize: true })
            .click(ui5("Login Button").domQuery("#logOnFormSubmit"));

        //wait for ui5 to be initialized..
        const cnt = ClientFunction(function () {
            return new Promise(function (resolve) {
                var iInterval = setInterval(function () {
                    //@ts-ignore
                    if (window.sap && sap.ui && sap.ui.getCore && sap.ui.getCore() && sap.ui.getCore().isInitialized() === true) {
                        //@ts-ignore
                        if (!sap.ui.getCore().byId("sap-fpa-ui-splash-view") || !sap.ui.getCore().byId("sap-fpa-ui-splash-view").getVisible()) {
                            clearInterval(iInterval);
                            resolve(true);
                        }
                    }
                }, 30);
            });
        });

        await cnt();
    }
}

export let ui5SAC = new ui5SACDef();