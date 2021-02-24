import { t } from "testcafe";
import { ui5Action } from "./ui5Action";
import { ui5Assert } from "./ui5Asserts";
import { ui5 } from "./ui5Builder";
import { LoginUser, SystemType, ui5Constants, UserRole } from "./ui5Constants";
import { ui5TestData } from "./ui5TestData";
import { ui5Waiter } from "./ui5Waiter";

export interface ui5LumiraParameters {
    number: number,
    value: string
};

export interface ui5LumiraStartupParameters {
    testData?: string,
    role: UserRole;
    parameter?: ui5LumiraParameters[]
}

class ui5LumiraDef {
    public async startup(params: ui5LumiraStartupParameters) {
        let user = this.getUser(params.role);

        await this.login(user.user, user.pw);

        if (params.testData) {
            await ui5TestData.createTestData(params.role, params.testData, t.ctx.testCase);
        }

        if (params.parameter) {
            for (let i = 0; i < params.parameter.length; i++) {
                await this.enterParameter(params.parameter[i].number, params.parameter[i].value);
            }
            await this.confirmParameter();
        } else {
            await ui5Waiter.waitForBOToBeLoaded();
        }
    }

    getUser(role: UserRole): LoginUser {
        return ui5Constants.getUser(role, SystemType.FIORI);
    }

    private async login(user: string, pw: string) {
        await ui5Action.typeText(ui5().domQuery('#_id0\\3Alogon\\3AUSERNAME'), user)
            .typeText(ui5().domQuery('#_id0\\3Alogon\\3APASSWORD'), pw, { anonymize: true })
            .click(ui5().domQuery('#_id0\\3Alogon\\3AlogonButton'));

        //set focus on new iframe
        await t.switchToIframe("#openDocChildFrame");

        //wait 5 seconds for the i am loading from backend text to appear
        await ui5Action.expect(ui5().domQuery('#progressText')).exists().ok("Wait for Progress to be available", { timeout: 5000 });
        await ui5Action.expect(ui5().domQuery('#progressText')).exists().notOK("wait for Progress to disappear again", { timeout: 120000 });
    }

    private async enterParameter(parameterNumber: number, parameterValue: string) {
        await ui5Action.typeText(ui5().element(["sap.m.MultiInput", "sap.m.Input", "sap.m.DatePicker"])
            .bindingContextPath(undefined, "/characteristics/" + parameterNumber.toString()), parameterValue, { replace: true }).
            pressKey('enter');
    }

    private async confirmParameter() {
        await ui5Action.click(ui5().id("OK"));

        await ui5Waiter.waitForBOToBeLoaded();
    }
}

export var ui5Lumira = new ui5LumiraDef();