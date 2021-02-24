import { ui5Password } from ".";

class PBKTestDataSets {
    public static readonly BKMFA = {
        PLANT9991_WITH_STRUCTURE: 'PLANT9991_WITH_STRUCTURE',
        NEW_PLANT_WITHOUT_STRUCTURE: 'NEW_PLANT_WITHOUT_STRUCTURE',
        BKMFA_POWERTRAIN: 'BKMFA_POWERTRAIN',
        BKMFA_KMS_NEW_PLANT: 'BKMFA_KMS_NEW_PLANT',
        BKMFA_CREATE_CA: ' BKMFA_CREATE_CA'
    };
}

class PBKRole {
    public static readonly BKMFA = {
        KMS_ZENTRAL: 'kmsZentral',
        KMS_ZENTRAL2: 'kmsZentral2',
        KMS_PT_ZENTRAL: 'kmsPTZentral'
    };
}

type TestDataSet = string;
type UserRole = string;

enum Products {
    BKML = "BKML",
    BKMFA = "BKMFA",
    BCAP = "BCAP",
    PRP = "PRP",
    BP = "BP"
}

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
        let oUser = this._config["users"][role][this._enviroment][sys];
        return new LoginUser(oUser.userId, ui5Password.decrypt(oUser.password));
    }
};

var ui5Constants = new ConstantReader();

export { Products, TestDataSet, ui5Constants, LoginUser, SystemType, UserRole, PBKTestDataSets, PBKRole };