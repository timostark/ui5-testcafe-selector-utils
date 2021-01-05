import {
    Selector,
    t
} from "testcafe";
import { UI5DataResult, UI5Selector, UI5DataCallback, UI5SelectorDef } from "./ui5Selector";
import { ui5AssertDef, ui5Assert, ui5AssertOperator, ui5AssertOperatorVisible, ui5AssertOperatorExists } from "./ui5Asserts";

export enum ui5SACWidgetType {
    Chart = 1,
    Table = 2,
    Text = 3
}

export abstract class UI5StepBaseLib {
    abstract data(f?: UI5DataCallback): Promise<UI5DataResult>;
    abstract dataSync(f?: UI5DataCallback): Promise<UI5DataResult>;
    abstract format(): string;
}

export abstract class UI5BaseBuilderIntf {
    protected _id: any;
    protected _domQuery: string = "";
    protected _name: string = "";
    protected _timeout?: number;
    protected _hasTimeout: boolean = false;
    protected _trace: boolean = false;
    protected _sBasisObj: string = "";
};


export class UI5AnyValueBuilder implements UI5StepBaseLib {
    public _value: any;

    format(): string {
        return "any value";
    }

    async data(f?: UI5DataCallback): Promise<UI5DataResult> {
        return this._value;
    }

    dataSync(f?: UI5DataCallback): Promise<UI5DataResult> {
        return this._value;
    }

    constructor(val: any) {
        this._value = val;
    }
}

export abstract class UI5ParentBuilder<B extends UI5ParentBuilder<B>> extends UI5BaseBuilderIntf {
    protected abstract getThisPointer(): B;
    protected thisPointer: B;

    constructor(chain?: any) {
        super();

        this.thisPointer = this.getThisPointer();
        this._id = {};

        if (chain && chain instanceof UI5BaseBuilderIntf) {
            this._id = (<any>chain)._id;
            this._name = (<any>chain)._name;
            this._domQuery = (<any>chain)._domQuery;
            this._hasTimeout = (<any>chain)._hasTimeout;
            this._timeout = (<any>chain)._timeout;
            this._trace = (<any>chain)._trace;
        } else if (chain && typeof chain == "string") {
            this._name = chain;
        }
        this._domQuery = chain ? chain._domQuery : null;
    }

    /** elements */
    button(): B {
        return this.element("sap.m.Button");
    }
    link(): B {
        return this.element("sap.m.Link");
    }
    text(): B {
        return this.element("sap.m.Text");
    }
    multiInput(): B {
        return this.element("sap.m.MultiInput");
    }
    listItem(): B {
        return this.element("sap.m.ListItemBase");
    }
    genericTile(): B {
        return this.element("sap.m.GenericTile");
    }
    coreItem(): UI5CoreItemSelection {
        return new UI5CoreItemSelection(this.element("sap.ui.core.Item"))
    }
    objectAttribute(): UI5ObjectAttributeSelection {
        return new UI5ObjectAttributeSelection(this.element("sap.m.ObjectAttribute"));
    }
    comboBox(): UI5ComboBoxChainSelection {
        return new UI5ComboBoxChainSelection(this.element(["sap.m.MultiComboBox", "sap.m.ComboBox", "sap.m.Select"]));
    }
    list(): UI5ListChainSelection {
        return new UI5ListChainSelection(this.element("sap.m.List"));
    }

    messageToast(): UI5MessageToast {
        return new UI5MessageToast(this)
    }

    element(sElement: string | string[]): B {
        this._id = this._enhanceWith(this._id, {
            metadata: {
                elementName: sElement
            }
        });
        return this.thisPointer;
    }

    interactable(): B {
        this._id = this._enhanceWith(this._id, {
            metadata: {
                interactable: {
                    interactable: true
                }
            }
        });
        return this.thisPointer;
    }

    id(id: string): B {
        this._id = this._enhanceWith(this._id, {
            identifier: {
                id: id
            }
        });
        return this.thisPointer;
    }

    /** attributes */
    bindingContextPath(modelName: string | any, path: string): B {
        var oPath: any = {};
        oPath[modelName] = path;
        this._id = this._enhanceWith(this._id, {
            bindingContext: oPath
        });
        return this.thisPointer;
    }

    bindingPath(attribute: string, path: string): B {
        var oPath: any = {};
        oPath[attribute] = path;
        this._id = this._enhanceWith(this._id, {
            binding: oPath
        });
        return this.thisPointer;
    }

    protected _isObject(item: any) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    protected _mergeDeep(target: any, ...sources: any): any {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this._isObject(target) && this._isObject(source)) {
            for (const key in source) {
                if (this._isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this._mergeDeep(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        return this._mergeDeep(target, ...sources);
    }

    protected _enhanceWith(id: any, enhanceWith: any): any {
        let oEnhanceBasis: any = {};
        if (typeof id === "string") {
            oEnhanceBasis.identifier.id = id;
        }
        let oEnhance: any = enhanceWith;
        if (this._sBasisObj !== "") {
            oEnhance = {};
            oEnhance[this._sBasisObj] = enhanceWith;
        }
        oEnhanceBasis = this._mergeDeep(id, oEnhance);
        return oEnhanceBasis;
    }
    property(propertyName: string, propertyValue: any): B {
        var oPath: any = {};
        oPath[propertyName] = propertyValue;
        this._id = this._enhanceWith(this._id, {
            property: oPath
        });
        return this.thisPointer;
    }
    context(path: string, value: any): B {
        var oProp: any = {};
        oProp[path] = value;
        this._id = this._enhanceWith(this._id, {
            smartContext: oProp
        });
        return this.thisPointer;
    }

    cssValue(cssAttribute: string, value: string): B {
        var oEnhance = <any>{};
        oEnhance[cssAttribute] = value;
        this._id = this._enhanceWith(this._id, {
            cssValue: oEnhance
        });

        return this.thisPointer;
    }

    positionInParent(position: number): B {
        this._id = this._enhanceWith(this._id, {
            positionInParent: position
        });

        return this.thisPointer;
    }

    styleClass(styleClass: string): B {
        this._id = this._enhanceWith(this._id, {
            styleClass: [styleClass]
        });

        return this.thisPointer;
    }

    customData(id: string, value?: string): B {
        var oEnhance = <any>{};
        oEnhance[id] = value;
        this._id = this._enhanceWith(this._id, {
            customData: oEnhance
        });

        return this.thisPointer;
    }

    localViewName(viewName: string): B {
        this._id = this._enhanceWith(this._id, {
            viewProperty: { localViewName: viewName }
        });
        return this.thisPointer;
    }

    sacWidget(widgetType: ui5SACWidgetType): UI5SACWidgetChainSelection {
        if (widgetType === ui5SACWidgetType.Chart) {
            new UI5SACWidgetChainSelection(this.element(["sap.fpa.ui.story.entity.infochartviz.InfochartVizWidget"]));
        } else if (widgetType === ui5SACWidgetType.Table) {

        } else if (widgetType === ui5SACWidgetType.Text) {

        }

        return new UI5SACWidgetChainSelection(this.thisPointer);
    }

}

export abstract class UI5BaseBuilder<B extends UI5BaseBuilder<B>> extends UI5ParentBuilder<B> {
    itemdata(itemPropertyName: string, itemPropertyValue: any): B {
        var oPath: any = {};
        oPath[itemPropertyName] = itemPropertyValue;
        this._id = this._enhanceWith(this._id, {
            itemdata: {
                property: oPath
            }
        });
        return this.thisPointer;
    }

    parentId(id: string): B {
        this._id = this._enhanceWith(this._id, {
            parentAnyLevel: {
                identifier: {
                    id: id
                }
            }
        });
        return this.thisPointer;
    }

    parentProperty(name: string, value: any): B {
        var oProp: any = {};
        oProp[name] = value;
        this._id = this._enhanceWith(this._id, {
            parentAnyLevel: {
                property: oProp
            }
        });
        return this.thisPointer;
    }

    parentElementName(elem: string): B {
        this._id = this._enhanceWith(this._id, {
            parentAnyLevel: {
                identifier: {
                    elementName: elem
                }
            }
        });
        return this.thisPointer;
    }

    enhancedData(custData: any): B {
        this._id = this._enhanceWith(this._id, {
            enhancedData: custData
        });

        return this.thisPointer;
    }


    childWithId(id: string): B {
        this._id = this._enhanceWith(this._id, {
            hasChildWith: {
                id: id
            }
        });

        return this.thisPointer;
    }

    tableRow(): UI5TableRowChainSelection {
        return new UI5TableRowChainSelection(this.element("sap.ui.table.Row").insideATable());
    }

    childWithClassName(className: string): B {
        this._id = this._enhanceWith(this._id, {
            hasChildWith: {
                className: className
            }
        });

        return this.thisPointer;
    }

    childrenCount(cnt: number, className?: string): B {
        this._id = this._enhanceWith(this._id, {
            childrenCount: {
                count: cnt,
                className: className
            }
        });

        return this.thisPointer;
    }

    domChildWith(sDomWith: string): B {
        this._id = this._enhanceWith(this._id, {
            domChildWith: sDomWith
        });
        return this.thisPointer;
    }

    row(tableRow?: number): B {
        this._id = this._enhanceWith(this._id, {
            tableSettings: {
                insideATable: true,
                tableRow: tableRow
            }
        });
        return this.thisPointer;
    }

    column(tableCol?: number): B {
        this._id = this._enhanceWith(this._id, {
            tableSettings: {
                insideATable: true,
                tableCol: tableCol
            }
        });
        return this.thisPointer;
    }

    columnDescr(tableCol: string): B {
        this._id = this._enhanceWith(this._id, {
            tableSettings: {
                insideATable: true,
                tableColDescr: tableCol
            }
        });
        return this.thisPointer;
    }

    columnId(tableCol: string): B {
        this._id = this._enhanceWith(this._id, {
            tableSettings: {
                insideATable: true,
                tableColId: tableCol
            }
        });
        return this.thisPointer;
    }

    insideATable(tableRow?: number, tableCol?: number): B {
        this._id = this._enhanceWith(this._id, {
            tableSettings: {
                insideATable: true,
                tableRow: tableRow,
                tableCol: tableCol
            }
        });
        return this.thisPointer;
    }

    selectAll(): B {
        this._id = this._enhanceWith(this._id, {
            selectAll: true
        });
        return this.thisPointer;
    }

    fnData(fnEnhance: (ui5Element: any, retData: UI5DataResult) => any): B {
        this._id = this._enhanceWith(this._id, {
            functions: {
                enhancedData: fnEnhance.toString()
            }
        });
        return this.thisPointer;
    }

    fnSelect(fnCheck: (ui5Element: any, selDef?: UI5DataResult, getElemInfo?: () => UI5DataResult) => boolean): B {
        this._id = this._enhanceWith(this._id, {
            functions: {
                checkItem: fnCheck.toString()
            }
        });
        return this.thisPointer;
    }

    parent(parent: UI5ParentSelection): B {
        //take over all element names
        let _idParent: any = (<any>parent)._id;

        this._sBasisObj = "parentAnyLevel";
        this._id = this._enhanceWith(this._id, _idParent);
        return this.thisPointer;
    }

    child(child: UI5ChildSelection): B {
        //take over all element names
        let _idChild: any = (<any>child)._id;

        this._sBasisObj = "atLeastOneChild";
        this._id = this._enhanceWith(this._id, _idChild);
        return this.thisPointer;
    }

    domQuery(id: string): B {
        this._domQuery = id;
        return this.thisPointer;
    }

    timeout(iTimeout: number): B {
        this._timeout = iTimeout;
        this._hasTimeout = true;
        return this.thisPointer;
    }

    hasOwnTimeout(): boolean {
        return this._hasTimeout;
    }

    name(id: string): B {
        this._name = id;
        return this.thisPointer;
    }

    format(): string {
        if (this._domQuery) {
            return this._domQuery;
        }

        let sName = this._name + " ( " + JSON.stringify(this._id) + " )";
        return sName;
    }

    private getEnhanceFunction(): string | undefined {
        if (this._id && this._id.functions && this._id.functions.enhancedData) {
            return this._id.functions.enhancedData;
        }
        return undefined;
    }

    /** actions */
    async data(f?: UI5DataCallback): Promise<UI5DataResult> {
        await this.build(); //first wait until we generally see the element..
        let oSelector = <UI5SelectorDef>this.build();

        if (typeof oSelector.getUI5 !== "undefined") {
            if (f) {
                return oSelector.getUI5(f, this.getEnhanceFunction());
            }
            return oSelector.getUI5(undefined, this.getEnhanceFunction());
        }
        return {};
    }

    dataSync(f?: UI5DataCallback): Promise<UI5DataResult> {
        let oSelector = <UI5SelectorDef>this.build();
        if (typeof oSelector.getUI5 !== "undefined") {
            return oSelector.getUI5(f);
        }
        return new Promise((resolve) => {
            resolve({});
        });
    }

    /** expects */
    expectProperty(property: string): ui5AssertOperator {
        return this.expect().property(property);
    }
    expectVisible(bExpectInteractable: boolean = true): ui5AssertOperatorVisible {
        return this.expect().visible(bExpectInteractable);
    }
    expectExists(): ui5AssertOperatorExists {
        return this.expect().exists();
    }
    expectDynamic(prop: (e: UI5DataResult) => any): ui5AssertOperator {
        return this.expect().dynamic(prop);
    }

    expect(): ui5AssertDef {
        return ui5Assert(this);
    }

    /** helpers.. */
    build(bInteractRequired?: boolean, timeout?: number): Selector {
        if (this._domQuery) {
            return Selector(this._domQuery)
        }

        if (bInteractRequired === true) {
            //i want to interact with this page element --> add attributes visible && enabled..
            this.interactable();
        }

        //hmmm.. probably not a good idea ?
        return <Selector><any>UI5Selector(timeout)(this._id);
    }

    trace(): B {
        this._trace = true;
        return this.thisPointer;
    }

    isTraced(): boolean {
        return this._trace;
    }
}

export class UI5ParentSelection extends UI5ParentBuilder<UI5ParentSelection> {
    getThisPointer(): UI5ParentSelection {
        return this;
    }
}

export class UI5ChildSelection extends UI5ParentBuilder<UI5ChildSelection> {
    getThisPointer(): UI5ChildSelection {
        return this;
    }
}

export class UI5ChainSelection extends UI5BaseBuilder<UI5ChainSelection> {
    getThisPointer(): UI5ChainSelection {
        return this;
    }
}

export class UI5MessageToast extends UI5BaseBuilder<UI5MessageToast> {
    private _text: string = "";

    getThisPointer(): UI5MessageToast {
        return this;
    }

    format(): string {
        return "Message-Toast" + (this._text.length ? ("with text " + this._text) : "");
    }

    withText(txt: string): UI5ChainSelection {
        this._text = txt;
        return this;
    }

    build(): Selector {
        if (this._text.length) {
            return Selector(".sapMMessageToast").withText(this._text);
        }
        return Selector(".sapMMessageToast");
    }
}

export class UI5CoreItemSelection extends UI5BaseBuilder<UI5CoreItemSelection> {
    getThisPointer(): UI5CoreItemSelection {
        return this;
    }

    key(key: string): UI5CoreItemSelection {
        return this.property("key", key);
    }
}

export class UI5SACWidgetChainSelection extends UI5BaseBuilder<UI5SACWidgetChainSelection> {
    getThisPointer(): UI5SACWidgetChainSelection {
        return this;
    }

    widgetId(id: string): UI5SACWidgetChainSelection {
        this._id = this._enhanceWith(this._id, {
            sac: {
                widgetId: id
            }
        });
        return this.thisPointer;
    }
}


export class UI5ComboBoxChainSelection extends UI5BaseBuilder<UI5ComboBoxChainSelection> {
    getThisPointer(): UI5ComboBoxChainSelection {
        return this;
    }

    arrow(): UI5ComboBoxChainSelection {
        return this.domChildWith("-arrow");
    }

    item(key: string): UI5CoreItemSelection {
        //merge own attributes and set as parent (to be improved)
        return ui5().parentId(this._id.identifier.id).coreItem().key(key);
    }
}

export class UI5ListChainSelection extends UI5BaseBuilder<UI5ListChainSelection> {
    getThisPointer(): UI5ListChainSelection {
        return this;
    }
}

export class UI5TableRowChainSelection extends UI5BaseBuilder<UI5TableRowChainSelection> {
    getThisPointer(): UI5TableRowChainSelection {
        return this;
    }

    col0(): UI5TableRowChainSelection {
        return <UI5TableRowChainSelection>this.domChildWith("-col0");
    }
}

export class UI5ObjectAttributeSelection extends UI5BaseBuilder<UI5ObjectAttributeSelection> {
    getThisPointer(): UI5ObjectAttributeSelection {
        return this;
    }

    inList(listId: string): UI5ObjectAttributeSelection {
        return this.parentId(listId);
    }

    withText(text: string): UI5ObjectAttributeSelection {
        return this.property("text", text);
    }
}

export function ui5(oChain?: UI5ChainSelection | string): UI5ChainSelection {
    return new UI5ChainSelection(oChain);
}

export function ui5Child(): UI5ChildSelection {
    return new UI5ChildSelection();
}

export function ui5Parent(): UI5ParentSelection {
    return new UI5ParentSelection();
}
