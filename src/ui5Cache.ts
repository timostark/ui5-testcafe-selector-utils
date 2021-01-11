
import { RequestHook, RequestMock } from 'testcafe';
import { ui5Config } from './ui5Config';
const fs = require('fs');
const crypto = require("crypto");

interface CacheBufferEntry {
    fileName: string,
    fileNameHeader: string,
    expires: number
};

interface CacheBufferDataEntry {
    data?: Buffer,
    dataHeader?: Buffer
};

interface CacheBufferEntries {
    [url: string]: CacheBufferEntry;
}

interface CacheBufferDataEntries {
    [url: string]: CacheBufferDataEntry;
}

class CacheBufferDef {
    private cacheBuffer: CacheBufferEntries;
    private cacheDataBuffer: CacheBufferDataEntries;
    //on purpose store per repo, so that we are not having any concurrency issues or similar
    private fileNameCache = `./node_modules/ui5-testcafe-selector-utils/cache_db.json`;

    constructor() {
        try {
            // fs.rmSync(fileNameCache);
            this.cacheBuffer = JSON.parse(fs.readFileSync(this.fileNameCache).toString());
        } catch (err) {
            this.cacheBuffer = {};
        }
        this.cacheDataBuffer = {};

        //remove all cache buffer hits, which are expired..
        for (const url in this.cacheBuffer) {
            if (ui5Config.clearCache === true || new Date().getTime() > this.cacheBuffer[url].expires) {
                this.deleteCacheBuffer(url);
            }
        }
    }

    public deleteCacheBuffer(urlReq: string) {
        const url = this._adjustUrl(urlReq);
        try {
            fs.rmSync(this.cacheBuffer[url].fileName);
            fs.rmSync(this.cacheBuffer[url].fileNameHeader);
        } catch (err) {
        }
        delete this.cacheBuffer[url];
        this._writeCacheBufferFile();
    }

    private _writeCacheBufferFile() {
        fs.writeFileSync(this.fileNameCache, JSON.stringify(this.cacheBuffer));
    }

    private _adjustUrl(reqUrl: string): string {
        let url = reqUrl;
        if (url.indexOf("/sap/public/bc/themes") !== -1) {
            //remove caching.. not reaaaaally clear here, why this theming stuff has a seperate caching variant.. still to be sure..
            url = url.split("/").filter((e: string) => e.indexOf("~") === -1).join("/");
        }
        return url;
    }

    public writeFile(urlReq: string, data: any, headers: any, maxAge: number) {
        const url = this._adjustUrl(urlReq);
        const fileNameHash = crypto.createHash('md5').update(url).digest("hex");
        const expires = new Date().getTime() + maxAge;
        const fileName = `${process.env.APPDATA}/ui5-testcafe-selector-utils/tmp/buffer/` + fileNameHash;
        const fileNameHeader = fileName + "_h";

        fs.writeFileSync(fileName, data);
        fs.writeFileSync(fileNameHeader, JSON.stringify(headers));

        this.cacheBuffer[url] = { fileName: fileName, fileNameHeader: fileNameHeader, expires: expires };
        this._writeCacheBufferFile();
    }

    public async readFile(urlReq: string): Promise<CacheBufferDataEntry> {
        const url = this._adjustUrl(urlReq);

        return new Promise((resolve, reject) => {
            const buf = this.cacheBuffer[url];

            fs.readFile(buf.fileName, (err: any, data: Buffer) => {
                this.cacheDataBuffer[url].data = data;
                if (this.cacheDataBuffer[url].data && this.cacheDataBuffer[url].dataHeader) {
                    resolve(this.cacheDataBuffer[url]);
                }
            });
            fs.readFile(buf.fileNameHeader, (err: any, data: Buffer) => {
                this.cacheDataBuffer[url].dataHeader = data;
                if (this.cacheDataBuffer[url].data && this.cacheDataBuffer[url].dataHeader) {
                    resolve(this.cacheDataBuffer[url]);
                }
            });
        });
    }

    public exists(urlReq: string, withFileCheck: boolean = true): boolean {
        const url = this._adjustUrl(urlReq);

        if (this.cacheBuffer[url]) {
            if (withFileCheck === false) {
                return true;
            }
            if (fs.existsSync(this.cacheBuffer[url].fileName) && fs.existsSync(this.cacheBuffer[url].fileNameHeader)) {
                return true;
            }
        }
        return false;
    }
};

let CacheBuffer = new CacheBufferDef();


class CacheHeaderControl {
    private HEADER_REGEXP = /([a-zA-Z][a-zA-Z_-]*)\s*(?:=(?:"([^"]*)"|([^ \t",;]*)))?/g;
    private CACHE_CONTROL_FIELDS = {
        maxAge: 'max-age',
        noCache: 'no-cache',
        noStore: 'no-store',
    };

    public maxAge: number | null = null;
    public noCache: boolean | null = null;
    public noStore: boolean | null = null;
    constructor(cacheHeader: string) {
        this._parseCacheHeader(cacheHeader);
    }

    private _parseBooleanOnly(value: string): boolean {
        return value === null;
    }

    private _parseDuration(value: string): number | null {
        if (!value) {
            return null;
        }

        const duration = Number.parseInt(value, 10);

        if (!Number.isFinite(duration) || duration < 0) {
            return null;
        }

        return duration;
    }

    private _parseCacheHeader(cacheControl: string) {
        if (!cacheControl || cacheControl.length === 0) {
            return undefined;
        }

        const values: any = {};
        const matches = cacheControl.match(this.HEADER_REGEXP) || [];

        Array.prototype.forEach.call(matches, match => {
            const tokens = match.split('=', 2);

            const [key] = tokens;
            let value = null;

            if (tokens.length > 1) {
                value = tokens[1].trim();
            }

            values[key.toLowerCase()] = value;
        });

        this.maxAge = this._parseDuration(values[this.CACHE_CONTROL_FIELDS.maxAge]);
        this.noCache = this._parseBooleanOnly(values[this.CACHE_CONTROL_FIELDS.noCache])
        this.noStore = this._parseBooleanOnly(values[this.CACHE_CONTROL_FIELDS.noStore]);
    }
}

export let ui5CacheWriteMock = RequestMock()
    .onRequestTo((req: RequestOptions) => {
        if (req.headers && req.headers["cache-control"]) {
            const cacheControl = new CacheHeaderControl(req.headers["cache-control"]);
            if (cacheControl.noCache || cacheControl.noStore || !cacheControl.maxAge) {
                return false;
            }
        }

        if (CacheBuffer.exists(req.url)) {
            return true;
        }

        return false;
    })
    .respond(async (req: RequestOptions, res: ResponseMock) => {
        return new Promise((resolve) => {
            CacheBuffer.readFile(req.url).then((data) => {
                res.setBody(<any>data.data);
                if (data.dataHeader) {
                    res.headers = JSON.parse(data.dataHeader.toString());
                }
                resolve(true);
            })
        });
    });

class CacheWriteHookDef extends RequestHook {
    _cacheRequestId: any = {};
    constructor() {
        super(undefined, { includeBody: true, includeHeaders: true });
    }

    async onRequest(e: any) {
        if (e.requestOptions.method !== "GET") {
            return;
        }
        if (CacheBuffer.exists(e.requestOptions.url)) {
            return;
        }
        this._cacheRequestId[e.requestOptions.requestId] = e.requestOptions.url;
    }

    async onResponse(e: any) {
        if (!this._cacheRequestId[e.requestId]) {
            return;
        }
        const url = this._cacheRequestId[e.requestId];
        delete this._cacheRequestId[e.requestId];
        if (!e.headers || !e.headers["cache-control"]) {
            return; //we wont buffer anything here
        }
        const cacheControl = new CacheHeaderControl(e.headers["cache-control"]);
        if (cacheControl.noCache === true || cacheControl.noStore === true) {
            return;
        }
        //no need to make the manual effort here and cache very small numbers..
        if (!cacheControl.maxAge || cacheControl.maxAge < 100) {
            return;
        }

        //we are not caching anything which is setting a cookie - seems to be strange..
        if (e.headers["set-cookie"]) {
            return;
        }

        CacheBuffer.writeFile(url, e.body, e.headers, cacheControl.maxAge);
    }
}

export let ui5CacheWriteHook = new CacheWriteHookDef();