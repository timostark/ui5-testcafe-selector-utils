import { ui5Password } from "./ui5Password";

export interface ui5CoverageConfiguration {
    outDir?: string,
    type?: string,
    proxy?: boolean,
    enabled?: boolean,
    log?: boolean,
    basePath?: string,
    debugComponents?: string[],
    includePaths?: string[],
    excludePaths?: string[]
}

export interface ui5RestConfiguration {
    url: string,
    videoUrl: string,
    user: string,
    password: string
}

export interface ui5LaunchpadConfiguration {
    deactivateAnimation?: boolean;
}

export interface ui5Configuration {
    coverage: ui5CoverageConfiguration;
    rest?: ui5RestConfiguration;
    launchpad?: ui5LaunchpadConfiguration;
    firstSelectorTimeout: number;
    traceSelectorOnFailure: boolean;
};

class ui5ConfigDef {
    private _config: ui5Configuration;

    constructor() {
        try {
            this._config = require(process.cwd() + '\\.ui5-testcafe.json');
        } catch {
            this._config = {
                coverage: {
                    outDir: "",
                    basePath: "",
                    type: "html",
                    enabled: false,
                    log: false,
                    proxy: false,
                    debugComponents: [],
                    includePaths: [],
                    excludePaths: []
                },
                launchpad: {
                    deactivateAnimation: false
                },
                firstSelectorTimeout: 40000,
                traceSelectorOnFailure: false
            };
        }

        if (typeof this._config.coverage === "undefined") {
            this._config.coverage = {};
        }
        if (typeof this._config.coverage.enabled === "undefined") {
            this._config.coverage.enabled = false;
        }
        if (typeof this._config.coverage.basePath === "undefined") {
            this._config.coverage.basePath = "";
        }
        if (typeof this._config.coverage.proxy === "undefined") {
            this._config.coverage.proxy = false;
        }
        if (typeof this._config.coverage.outDir === "undefined") {
            this._config.coverage.outDir = "./report/coverage";
        }
        if (typeof this._config.rest !== "undefined") {
            this._config.rest.password = ui5Password.decrypt(this._config.rest.password);
        }
        if (typeof this._config.launchpad === "undefined") {
            this._config.launchpad = {};
        }
        if (typeof this._config.launchpad.deactivateAnimation === "undefined") {
            this._config.launchpad.deactivateAnimation = false;
        }

        this._config.firstSelectorTimeout = this._config.firstSelectorTimeout ? this._config.firstSelectorTimeout : 40000;
        this._config.coverage.enabled = process.env.UI5_COVERAGE_ENABLED ? process.env.UI5_COVERAGE_ENABLED === "true" : this._config.coverage.enabled;
        this._config.traceSelectorOnFailure = typeof this._config.traceSelectorOnFailure === "undefined" ? false : this._config.traceSelectorOnFailure;
    }

    get traceSelectorOnFailure(): boolean {
        return this._config.traceSelectorOnFailure;
    }

    get firstSelectorTimeout(): number {
        return this._config.firstSelectorTimeout;
    }

    get launchpad(): ui5LaunchpadConfiguration {
        return this._config.launchpad ? this._config.launchpad : { deactivateAnimation: false };
    }

    get coverage(): ui5CoverageConfiguration {
        return this._config.coverage;
    }
    get rest(): ui5RestConfiguration | undefined {
        return this._config.rest;
    }
}


export let ui5Config = new ui5ConfigDef();
