import { debug } from "console";
import { ClientFunction } from "testcafe";
import { ui5CoverageConfiguration } from "./ui5Config";

let proxy = require('express-http-proxy');
var expressApp = require('express');
const fs = require('fs');
const im = require('istanbul-lib-instrument');
var Url = require('url-parse');

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

    constructor() {
        this._coverageUrl = "";
        this._basePath = "";
        this._bCoverageStarted = false;
        this._instrumenter = im.createInstrumenter();
    }

    private _matcher(url: string) {
        if (url.match(/\.js$/) && !url.match(/jquery/)) {
            return url;
        }
        return null;
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

    public async checkLoggedComponents() {
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
                var sCompName = aComp[sComp].getMetadata().getName()
                if (sCompName.startsWith("sap.")) {
                    continue;
                }
                aCompList.push(sCompName.replace(/\./g, '/'));
            }
            return aCompList;
        })();

        for (var i = 0; i < clientComp.length; i++) {
            if (this._config?.debugComponents.indexOf(clientComp[i]) !== -1) {
                continue;
            }

            console.log("Component " + clientComp[i] + " might not have been instrumented, as not part of debug sources");
        }
    }

    public startCoverageProxy(url: string, config: ui5CoverageConfiguration): string {
        let urlParse = new Url(url);
        let urlHost = urlParse.protocol + "//" + urlParse.host;
        this._config = config;

        if (this._coverageUrl !== "" && this._coverageUrl !== urlHost) {
            return this._adjustedUrl;
        } else if (this._coverageUrl === urlHost) {
            this._basePath = config.basePath;
            return this._adjustedUrl;
        }

        this._coverageUrl = urlHost;
        this._basePath = config.basePath;

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

                    if (that?._config?.log === true) {
                        console.log("instrument: " + proxyRes.req.path);
                    }

                    var pathname = proxyRes.req.path;
                    const fileName = `${process.cwd()}/tmp/` + pathname;
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