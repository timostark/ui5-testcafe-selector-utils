
var colors = require('colors/safe');
import { t } from "testcafe";
import { UI5ChainSelection } from "./ui5Builder";

class ui5ActionDef {

    constructor() {
    }

    public typeText(selector: UI5ChainSelection, text: string, options?: TypeActionOptions): ui5ActionDefPromise{
        let oRes: any;

        console.log(colors.gray('queued: type-text: ') + selector.format() + ": " + text );

        oRes = t.typeText(selector.build(), text, options );
        oRes.then(() => {
            console.log(colors.green('succeeded: type-text: ') + selector.format()  + ":" + text );
            return true;
        }, () => {
            console.log(colors.red('failed: type-text: ') + selector.format()  + ":" + text );
            return true;
        });

        oRes = this._delegateAPIToPromise(this, oRes);
        return oRes;
    }
    
    public click(selector: UI5ChainSelection, options?: ClickActionOptions): ui5ActionDefPromise {
        let oRes: any;
        console.log(colors.gray('queued: click:') + selector.format() );
        oRes = t.click(selector.build(), options );
        oRes.then(() => {
            console.log(colors.green('succeeded: click') + selector.format() );
            return true;
        }, () => {
            console.log(colors.red('failed: click') + selector.format() );
            return true;
        });

        oRes = this._delegateAPIToPromise(this, oRes);
        return oRes;
    }

    _delegateAPIToPromise (_handler : any, dest : any) {
        ["click", "typeText"].forEach((srcProp) => {
            const fn = function (...args: any[]) {
                return _handler[srcProp](...args);
            };
            dest[srcProp] = fn;
        });
        return dest;
    }
}

interface ui5ActionDefPromise extends ui5ActionDef, Promise<any> {
}

let ui5Action = new ui5ActionDef();
export { ui5Action };