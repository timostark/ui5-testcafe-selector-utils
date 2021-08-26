import { LoginUser, SystemType, ui5Constants, UserRole } from "./ui5Constants";
import { request } from 'https';
import { ui5Config } from "./ui5Config";
var setCookie = require('set-cookie-parser');

interface cookieAndAuth {
    xcsrf: string,
    cookies: string
};

class ui5TestDataDef {
    public async createTestData(role: UserRole, testSetId: string, testCaseId: string) {
        let user = this.getUser(role);
        const reqHeaders = await this._executeXsrfToken(user.user, user.pw);
        await this._executeTestData(user.user, user.pw, reqHeaders, testCaseId, testSetId);
    }

    public async deleteTestData(role: UserRole, testCaseId: string, testSetId: string) {
        let user = this.getUser(role);
        const reqHeaders = await this._executeXsrfToken(user.user, user.pw);
        await this._executeDeleteTestData(user.user, user.pw, reqHeaders, testCaseId, testSetId);
    }

    private getUser(role: UserRole): LoginUser {
        return ui5Constants.getUser(role, SystemType.FIORI);
    }

    private async _executeXsrfToken(username: string, password: string): Promise<cookieAndAuth> {
        return new Promise(resolve => {
            var auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

            const options = {
                hostname: ui5Constants.getHost(SystemType.FIORI),
                path: ui5Config.testDataUrl + ui5Constants.getURLOption(SystemType.FIORI),
                port: ui5Constants.getPort(SystemType.FIORI),
                rejectUnauthorized: false,
                headers: {
                    "x-csrf-token": "Fetch",
                    'Authorization': auth
                },
                method: 'GET'
            };
            const req = request(options, res => {
                var cookies = setCookie.parse(res, {
                    decodeValues: true  // default: true
                });
                let aCookies = [];
                for (var i = 0; i < cookies.length; i++) {
                    aCookies.push(cookies[i].name + "=" + cookies[i].value);
                }
                let sCookie = aCookies.join(";");

                resolve({ cookies: sCookie, xcsrf: <string>res.headers["x-csrf-token"] });
                console.log("Test-Data-Container x-csrf-token loaded");
            });


            req.on('error', e => {
                console.error(e);
            });

            req.end();
        });
    };

    async _executeDeleteTestData(username: string, password: string, incoHeader: cookieAndAuth, testData: string, testCase: string): Promise<boolean> {
        return new Promise(resolve => {
            var auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

            const options = {
                hostname: ui5Constants.getHost(SystemType.FIORI),
                port: ui5Constants.getPort(SystemType.FIORI),
                path: ui5Config.testDataUrl + ui5Config.testDataDelFunction + "?TestSetId='" + testCase + "'&test_case_id='" + testData + "'",// + ui5Constants.getURLOption(SystemType.FIORI),
                headers: {
                    "x-csrf-token": incoHeader.xcsrf,
                    "Cookie": incoHeader.cookies,
                    'Authorization': auth
                },
                rejectUnauthorized: false,
                method: 'POST'
            };

            const req = request(options, res => {
                res.on("data", data => {
                    console.log("Test-Data-Container " + testData + " unloaded");
                    resolve(data);
                });
            });

            req.on('error', e => {
                console.error(e);
            });

            req.end();
        });
    };

    async _executeTestData(username: string, password: string, incoHeader: cookieAndAuth, testData: string, testCase: string): Promise<boolean> {
        return new Promise(resolve => {
            var auth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

            const options = {
                hostname: ui5Constants.getHost(SystemType.FIORI),
                port: ui5Constants.getPort(SystemType.FIORI),
                path: ui5Config.testDataUrl + ui5Config.testDataCreateFunction + "?TestSetId='" + testCase + "'&test_case_id='" + testData + "'", // + ui5Constants.getURLOption(SystemType.FIORI),
                headers: {
                    "x-csrf-token": incoHeader.xcsrf,
                    "Cookie": incoHeader.cookies,
                    'Authorization': auth
                },
                rejectUnauthorized: false,
                method: 'POST'
            };

            const req = request(options, res => {
                console.log("Test-Data-Container " + testData + " loaded with status code " + res.statusCode);
                let stCode = res.statusCode;
                res.on("data", data => {
                    if ( stCode && stCode > 300 ) {
                        process.stdout.write(data);
                    }
                    resolve(data);
                });
            });

            req.on('error', e => {
                console.error(e);
            });


            req.end();
        });
    };
}

export let ui5TestData = new ui5TestDataDef();