import {
    Selector,
    t
} from "testcafe";
import {
    UI5Selector
} from "ui5-testcafe-selector";


abstract class Ui5BaseBuilder<B extends Ui5BaseBuilder<B>>  {

    protected thisPointer: B;
    protected _id: any;
    protected _domQuery: string;
    protected _name: string = "";

    protected abstract getThisPointer(): B;

    constructor(chain?: any) {
        this.thisPointer = this.getThisPointer();
        this._id = {};

        if (chain && chain instanceof Ui5BaseBuilder) {
            this._id = chain._id;
            this._name = chain._name;
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
        return new UI5ComboBoxChainSelection(this.element(["sap.m.ComboBox", "sap.m.Select"]));
    }
    list(): UI5ListChainSelection {
        return new UI5ListChainSelection(this.element("sap.m.List"));
    }

    tableRow(): UI5TableRowChainSelection {
        return new UI5TableRowChainSelection(this.element("sap.ui.table.Row").insideATable());
    }

    element(sElement: string | string[]): B {
        this._id = this._enhanceWith(this._id, {
            metadata: {
                elementName: sElement
            }
        });
        return this.thisPointer;
    }


    /** attributes */
    bindingPath(modelName: string, path: string): B {
        var oPath: any = {};
        oPath[modelName] = path;
        this._id = this._enhanceWith(this._id, {
            bindingContext: oPath
        });
        return this.thisPointer;
    }

    property(propertyName: string, propertyValue: any): B {
        var oPath: any = {};
        oPath[propertyName] = propertyValue;
        this._id = this._enhanceWith(this._id, {
            property: oPath
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

    context(path: string, value: any): B {
        var oProp: any = {};
        oProp[path] = value;
        this._id = this._enhanceWith(this._id, {
            smartContext: oProp
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

    domChildWith(sDomWith: string): B {
        this._id = this._enhanceWith(this._id, {
            domChildWith: sDomWith
        });
        return this.thisPointer;
    }


    inTableRow(tableRow?: number): B {
        this._id = this._enhanceWith(this._id, {
            tableSettings: {
                insideATable: true,
                tableRow: tableRow
            }
        });
        return this.thisPointer;
    }

    inTableCol(tableCol?: number): B {
        this._id = this._enhanceWith(this._id, {
            tableSettings: {
                insideATable: true,
                tableCol: tableCol
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

    id(id: string): B {
        this._id = this._enhanceWith(this._id, {
            identifier: {
                id: id
            }
        });
        return this.thisPointer;
    }

    domQuery(id: string): B {
        this._domQuery = id;
        return this.thisPointer;
    }

    name(id: string): B {
        this._name = id;
        return this.thisPointer;
    }


    format(): string {
        let sName = this._name + " ( " + JSON.stringify(this._id) + " )";
        return sName;
    }


    /** actions */
    async click(): Promise<any> {
        await t.click(this.build());
    }

    async typeText(text: string, bConfirm?: boolean): Promise<any> {
        await t.typeText(this.build(), text);
        if (bConfirm === true) {
            await t.pressKey("enter");
        }
    }

    async data(): Promise<UI5SelectorDef> {
        const data = await this.build().getUI5();
        return data;
    }

    /** expects.. */
    async expectVisible(msg: string, timeout: number): Promise<any> {
        await t.expect(this.build().visible).ok(msg, timeout ? {
            timeout: timeout
        } : {});
    }

    /** helpers.. */
    build(): Selector {
        if (this._domQuery) {
            return Selector(this._domQuery);
        }

        return UI5Selector(this._id);
    }

    protected _enhanceWith(id: any, enhanceWith: any): any {
        let oEnhanceBasis: any = {};
        if (typeof id === "string") {
            oEnhanceBasis.identifier.id = id;
        } else {
            oEnhanceBasis = Object.assign(id, enhanceWith);
        }
        return oEnhanceBasis;
    }
}

export class UI5ChainSelection extends Ui5BaseBuilder<UI5ChainSelection> {
    getThisPointer(): UI5ChainSelection {
        return this;
    }
}


export class UI5CoreItemSelection extends Ui5BaseBuilder<UI5CoreItemSelection> {
    getThisPointer(): UI5CoreItemSelection {
        return this;
    }

    key(key: string): UI5CoreItemSelection {
        return this.property("key", key);
    }
}

export class UI5ComboBoxChainSelection extends Ui5BaseBuilder<UI5ComboBoxChainSelection> {
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

    async selectItem(key: string) {
        await t.click(ui5(this).domChildWith("-arrow").build());

        const elem: any = await this.data(); //we could use that for a parent identifier..i guess it was level 4
        const itemIdSelector = ui5().parentId(elem.identifier.ui5LocalId).element("sap.ui.core.Item").property("key", key).build();
        await t.click(itemIdSelector);
    }
}

export class UI5ListChainSelection extends Ui5BaseBuilder<UI5ListChainSelection> {
    getThisPointer(): UI5ListChainSelection {
        return this;
    }
}

export class UI5TableRowChainSelection extends Ui5BaseBuilder<UI5TableRowChainSelection> {
    getThisPointer(): UI5TableRowChainSelection {
        return this;
    }

    col0(): UI5TableRowChainSelection {
        return <UI5TableRowChainSelection>this.domChildWith("-col0");
    }
}

export class UI5ObjectAttributeSelection extends Ui5BaseBuilder<UI5ObjectAttributeSelection> {
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

export function ui5(oChain?: UI5ChainSelection | string) {
    return new UI5ChainSelection(oChain);
}