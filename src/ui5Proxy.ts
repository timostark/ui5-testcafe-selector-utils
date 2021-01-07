
import { ClientFunction } from "testcafe";
import { ui5CoverageConfiguration, ui5Config } from "./ui5Config";

let proxy: any = null;
let expressApp: any = null;
let fs: any = null;
let im: any = null;
let Url: any = null;

if (ui5Config.coverage.enabled && ui5Config.coverage.proxy) {
    proxy = require('express-http-proxy');
    expressApp = require('express');
    fs = require('fs');
    im = require('istanbul-lib-instrument');
    Url = require('url-parse');
}

class ui5ProxyDef {
    private _coverageUrl: string = "";
    private _bCoverageStarted: boolean;
    private _instrumenter: any;
    private _app: any;
    private _oServer: any;
    private _basePath: string;
    private _oServerPromise: any;
    private _adjustedUrl: string = "";
    private _config?: ui5CoverageConfiguration;
    private _reportedLists: any;
    private _fileCache: any;
    private _paused: boolean;

    constructor() {
        this._coverageUrl = "";
        this._basePath = "";
        this._bCoverageStarted = false;
        this._reportedLists = {};
        this._fileCache = {};
        this._paused = false;
        this._instrumenter = im ? im.createInstrumenter() : null;
    }

    private _matcher(url: string) {
        if (url.match(/\.js$/) && !url.match(/jquery/)) {
            return url;
        }
        return null;
    }

    public pauseCoverageProxy() {
        this._paused = true;
    }

    public stopCoverageProxy() {
        if (!this._bCoverageStarted) {
            return;
        }

        this._app.close();
        this._bCoverageStarted = false;
        this._coverageUrl = "";
        this._adjustedUrl = "";
    }

    public async checkLoggedComponents(t: TestController) {
        if (!this._config?.log) {
            return;
        }

        const clientComp = await ClientFunction((): string[] => {
            //@ts-ignore
            if (!sap.ui.core.Component || !sap.ui.core.Component.registry) {
                return [];
            }
            //@ts-ignore
            var aComp = sap.ui.core.Component.registry.all();
            var aCompList = [];
            for (var sComp in aComp) {
                var sCompName = aComp[sComp].getMetadata().getComponentName();
                if (sCompName.startsWith("sap.") && !sCompName.startsWith("sap.ui.demo")) {
                    continue;
                }
                aCompList.push(sCompName.replace(/\./g, '/'));
            }
            return aCompList;
        }, { boundTestRun: t })();

        for (var i = 0; i < clientComp.length; i++) {
            if (this._config?.debugComponents?.indexOf(clientComp[i]) !== -1) {
                continue;
            }
            if (this._reportedLists[clientComp[i]]) {
                continue;
            }
            this._reportedLists[clientComp[i]] = 1;
        }
    }

    public logMissingComponents() {
        if (!this._config?.log) {
            return;
        }

        for (var sComp in this._reportedLists) {
            if (this._reportedLists[sComp] === 2) {
                continue;
            }
            this._reportedLists[sComp] = 2;
            console.log("Component " + sComp + " might not have been instrumented, as not part of debug sources");
        }
    }

    public startCoverageProxy(url: string, config: ui5CoverageConfiguration): string {
        let urlParse = new Url(url);
        let urlHost = urlParse.protocol + "//" + urlParse.host;
        this._paused = false;
        this._config = config;

        if (this._coverageUrl !== "" && this._coverageUrl !== urlHost) {
            return this._adjustedUrl;
        } else if (this._coverageUrl === urlHost) {
            this._basePath = config.basePath ? config.basePath : "";
            return this._adjustedUrl;
        }

        this._coverageUrl = urlHost;
        this._basePath = config.basePath ? config.basePath : "";

        this._app = expressApp();

        let adjustedUrl = "http://localhost:3000" + urlParse.pathname;
        if (!urlParse.query && config.debugComponents) {
            adjustedUrl += "?";
        }
        if (urlParse.query) {
            adjustedUrl += urlParse.query;
        }
        if (config.debugComponents && config.debugComponents.length > 0) {
            if (urlParse.query) {
                adjustedUrl += "&";
            }
            adjustedUrl += "sap-ui-debug="
            for (var i = 0; i < config.debugComponents.length; i++) {
                adjustedUrl += config.debugComponents[i];
                if (i !== config.debugComponents.length - 1) {
                    adjustedUrl += ",";
                }
            }
        }
        adjustedUrl += urlParse.hash;

        var that = this;

        if (this._bCoverageStarted === false) {
            // run the proxy middleware based on the baseUri configuration
            this._app.use('/', proxy(this._coverageUrl, {
                https: urlParse.protocol === "https:",
                limit: false,
                preserveHostHdr: false,
                proxyReqOptDecorator: function (proxyReqOpts: any) {
                    proxyReqOpts.rejectUnauthorized = false;
                    return proxyReqOpts;
                },
                proxyReqPathResolver: function (req: any) {
                    return req.url;
                },
                userResDecorator: function (proxyRes: any, proxyResData: any, userReq: any, userRes: any) {
                    if (that._paused === true) {
                        return proxyResData;
                    }
                    if (proxyRes.statusCode > 300) {
                        return proxyResData;
                    }
                    if (!that._matcher(proxyRes.req.path)) {
                        return proxyResData;
                    }
                    if (proxyRes.req.path.indexOf("/sap/bc/ui5_ui5/ui2/ushell/resources") !== -1) {
                        return proxyResData; //generally do not instrument sap standard code..
                    }
                    if (proxyRes.req.path.indexOf("/sap/public/bc/ui2") !== -1) {
                        return proxyResData; //logon data..
                    }
                    if (proxyRes.req.path.indexOf("sap-ui-core.js") !== -1) {
                        if (that._config?.log === true) {
                            console.log("skipped " + proxyRes.req.path + " as it is a a SAPUI5 file");
                        }
                        return proxyResData;
                    }
                    if (proxyRes.req.path.indexOf("library-preload.js") !== -1) {
                        if (that._config?.log === true) {
                            console.log("skipped " + proxyRes.req.path + " as it is a library-preload file - add to debug sources if this file should be instrumented");
                        }
                        return proxyResData;
                    }
                    if (proxyRes.req.path.indexOf("Component-preload") !== -1) {
                        if (that?._config?.log === true) {
                            console.log("skipped " + proxyRes.req.path + " as it is a component-preload file - add to debug sources if this file should be instrumented");
                        }
                        return proxyResData;
                    }
                    if (proxyRes.req.path.indexOf(that._basePath) === -1) {
                        if (that?._config?.log === true) {
                            console.log("skipped " + proxyRes.req.path + " as it is not part of base Path " + that._basePath);
                        }
                        return proxyResData;
                    }
                    if (proxyRes.req.path.indexOf(that._basePath) === -1) {
                        if (that?._config?.log === true) {
                            console.log("skipped " + proxyRes.req.path + " as it is not part of base Path " + that._basePath);
                        }
                        return proxyResData;
                    }

                    //do we have any whitelist?
                    if (that?._config?.includePaths) {
                        let bFound = false;
                        for (let j = 0; j < that._config.includePaths.length; j++) {
                            if (proxyRes.req.path.indexOf(that._config.includePaths[j]) !== -1) {
                                bFound = true;
                                break;
                            }
                        }
                        if (bFound === false && that._config.includePaths.length > 0) {
                            if (that?._config?.log === true) {
                                console.log("skipped " + proxyRes.req.path + " as it is not part of include paths");
                            }
                            return proxyResData;
                        }
                    }
                    if (that?._config?.excludePaths) {
                        let bFound = false;
                        for (let j = 0; j < that._config.excludePaths.length; j++) {
                            if (proxyRes.req.path.indexOf(that._config.excludePaths[j]) !== -1) {
                                bFound = true;
                                break;
                            }
                        }
                        if (bFound === true && that._config.excludePaths.length > 0) {
                            if (that?._config?.log === true) {
                                console.log("skipped " + proxyRes.req.path + " as it is part of exclude paths");
                            }
                            return proxyResData;
                        }
                    }

                    if (that?._fileCache[proxyRes.req.path]) {
                        return that?._fileCache[proxyRes.req.path];
                    }

                    if (that?._config?.log === true) {
                        console.log("instrument: " + proxyRes.req.path);
                    }

                    var pathname = proxyRes.req.path;
                    //pathname every now and than contains a "~" (cache variant) - remove paths containing this cache..
                    if (pathname.indexOf("~") !== -1) {
                        pathname = pathname.split("/").filter((e: string) => e.indexOf("~") === -1).join("/");
                    }

                    const fileName = `${process.env.APPDATA}/ui5-testcafe-selector-utils/tmp/` + pathname;
                    const fileNameArr = fileName.split('/');
                    fileNameArr.pop()
                    const dirName = fileNameArr.join('/')

                    fs.mkdirSync(dirName, {
                        recursive: true,
                    })
                    let data = proxyResData.toString('utf8');
                    fs.writeFileSync(fileName, data);
                    try {
                        data = that._instrumenter.instrumentSync(data, fileName);
                    } catch (err) {
                        if (that?._config?.log === true) {
                            console.log("instrument failed for " + proxyRes.req.path);
                        }
                        return proxyResData;
                    }
                    that._fileCache[proxyRes.req.path] = data;
                    return data;
                },
                userResHeaderDecorator: function (headers: any, userReq: any, userRes: any, proxyReq: any, proxyRes: any) {
                    if (urlParse.protocol === "https:") {
                        Object.keys(headers).forEach((headerName) => {
                            if (/set-cookie/i.test(headerName)) {
                                // remove the secure flag of the cookies
                                if (Array.isArray(headers[headerName])) {
                                    headers[headerName] = headers[headerName]
                                        // remove flag 'Secure'
                                        .map(function (cookieValue: string) {
                                            return cookieValue.replace(/;\s*secure\s*(?:;|$)/gi, ";");
                                        })
                                        // remove attribute 'SameSite'
                                        .map(function (cookieValue: string) {
                                            return cookieValue.replace(/;\s*samesite=[^;]+\s*(?:;|$)/gi, ";");
                                        });
                                }
                            }
                        });
                    }
                    return headers;
                }
            }));

            this._oServerPromise = new Promise((resolve) => {
                this._oServer = this._app.listen(3000, function () {
                    that._bCoverageStarted = true;
                    resolve(true);
                });
            });

            let oServer = this._oServer;

            let exitHandler = function () {
                if (!that._bCoverageStarted) {
                    return;
                }
                that._bCoverageStarted = false;
                oServer.close();
            };
            //do something when app is closing
            process.on('exit', exitHandler);
            process.on('SIGINT', exitHandler);
            process.on('SIGUSR1', exitHandler);
            process.on('SIGUSR2', exitHandler);
            process.on('uncaughtException', exitHandler);
        }

        this._adjustedUrl = adjustedUrl;

        return adjustedUrl;
    }

    public getStartPromise(): Promise<boolean> {
        return this._oServerPromise;
    }
}

export let ui5Proxy = new ui5ProxyDef();