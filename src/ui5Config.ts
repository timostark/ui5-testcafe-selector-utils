import { ui5Password } from "./ui5Password";

export interface ui5CoverageConfiguration {
    outDir?: string,
    type?: string,
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

export interface ui5Configuration {
    coverage: ui5CoverageConfiguration;
    rest?: ui5RestConfiguration;
};

class ui5ConfigDef {
    private _config: ui5Configuration;

    constructor() {
        try {
            this._config = require(process.cwd() + '\\.ui5-testcafe.json');
            if (typeof this._config.coverage.enabled === "undefined") {
                this._config.coverage.enabled = false;
            }
            if (typeof this._config.coverage.outDir === "undefined") {
                this._config.coverage.outDir = "/report/coverage";
            }
            if (typeof this._config.rest !== "undefined") {
                this._config.rest.password = ui5Password.decrypt(this._config.rest.password);
            }
        } catch {
            this._config = {
                coverage: {
                    outDir: "",
                    basePath: "",
                    type: "html",
                    enabled: false,
                    log: false,
                    debugComponents: [],
                    includePaths: [],
                    excludePaths: []
                }
            };
        }

        this._config.coverage.enabled = process.env.UI5_COVERAGE_ENABLED ? process.env.UI5_COVERAGE_ENABLED === "true" : this._config.coverage.enabled;
    }

    get coverage(): ui5CoverageConfiguration {
        return this._config.coverage;
    }
    get rest(): ui5RestConfiguration | undefined {
        return this._config.rest;
    }
}


export let ui5Config = new ui5ConfigDef();
