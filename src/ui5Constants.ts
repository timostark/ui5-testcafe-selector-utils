import { env } from "process";
import { ui5Password } from ".";

type TestDataSet = string;
type UserRole = string;

enum Enviroment {
    DEV = "DEV",
    INT = "INT",
    MAINT = "MAINT"
}

enum SystemType {
    BO = "BO",
    FIORI = "FIORI"
}

class LoginUser {
    public user: string;
    public pw: string;

    constructor(user: string, pw: string) {
        this.user = user;
        this.pw = pw;
    }
}

class ConstantReader {
    _config: any;
    _enviroment: Enviroment;

    constructor() {
        this._config = require(process.cwd() + '\\.constants.json');
        this._enviroment = <Enviroment>process.env.TEST_SYSTEM || Enviroment.DEV;
    }

    getURL(sys: SystemType) {
        var oUrl = this._config["url"][sys][this._enviroment];
        return oUrl.PROTOCOL + "://" + oUrl.HOST + ":" + oUrl.PORT + oUrl.PATH + this.getURLOption(sys);
    }

    getHost(sys: SystemType) {
        var oUrl = this._config["url"][sys][this._enviroment];
        return oUrl.HOST;
    }
    getPort(sys: SystemType) {
        var oUrl = this._config["url"][sys][this._enviroment];
        return oUrl.PORT;
    }
    getURLOption(sys: SystemType) {
        var oUrl = this._config["url"][sys][this._enviroment];
        return oUrl.URL_OPTION ? ("?" + oUrl.URL_OPTION) : "";
    }

    getUser(role: UserRole, sys: SystemType): LoginUser {
        if ( process.env.TESTCAFE_LOCAL_USER && process.env.TESTCAFE_LOCAL_PASSWORD ) {
            return new LoginUser(process.env.TESTCAFE_LOCAL_USER, process.env.TESTCAFE_LOCAL_PASSWORD);
        }
        
        let oUser = this._config["users"][role][this._enviroment][sys];
        return new LoginUser(oUser.userId, ui5Password.decrypt(oUser.password));
    }
};

var ui5Constants = new ConstantReader();

export { TestDataSet, ui5Constants, LoginUser, SystemType, UserRole };