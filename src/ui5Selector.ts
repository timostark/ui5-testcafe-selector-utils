import { time } from 'console';
import { Selector } from 'testcafe';

interface UI5SelectorDefIdentification {
    /**
     * For getUI5() the "ui5Id" - for checking, it will search all id patterns (ui5Id, ui5LocalId, domId, lumiraId)
     */
    id?: string;

    /**
     * UI5 ID, including all parent IDs, but without a component ID
     */
    ui5Id?: string,
    /**
     * UI5 ID maintained during creation in the ID field
     */
    ui5LocalId?: string,
    /**
     * DOM ID of the root HTML element - should normally not be used
     */
    domId?: string,
    /**
     * For Lumira Applications: Lumira Identifier
     */
    lumriaId?: string,
    /**
     * true in case the item referes to a cloned item-list (e.g. item 1 in a list)
     */
    idCloned?: boolean,
    /**
     * true in case the id is artifical (so no static id was defined). Do not use that element
     */
    idGenerated?: boolean,
    /**
     * The absolute UI5 Identifier, including all information (getId())
     */
    ui5AbsoluteId?: string
}

interface UI5BindingDefProperty {
    path: string,
    pathRelative: string,
    model: string
}

interface UI5PropertyDefMetadata {
    [property: string]: string | number | boolean;
}

interface UI5LumiraProperty {
    [property: string]: string | number | boolean;
}

interface UI5BindingDefMetadata {
    [binding: string]: UI5BindingDefProperty
}

interface UI5TableData {
    visibleDimensionsCol?: string[];
    visibleDimensionsRow?: string[];
    finalLength?: number;
    data: any[];
}

interface UI5SACData {
    widgetId?: string
}

interface UI5SelectorCSSValues {
    [cssAttributeName: string]: string
};

interface UI5SelectorCustomData {
    [customDataName: string]: string | boolean | number;
};

interface UI5SelectorChildrenCountDef {
    _all: number;
    [className: string]: number;
};

interface UI5BindingContextDefMetadata {
    [binding: string]: string
}

interface UI5BindingContextData {
    [context: string]: any
}

interface UI5SelectorDefInteractable {
    busy?: boolean,
    needsRerendering?: boolean,
    enabled?: boolean,
    visible?: boolean,
    blocked?: boolean,
    nonZeroSize?: boolean,
    interactable?: boolean
}

interface UI5SelectorDefMetadata {
    elementName?: string | string[],
    componentName?: string,
    /**
     * For Lumira Applications: Lumira Element Type
     */
    lumiraType?: string,
    interactable?: UI5SelectorDefInteractable
}

interface UI5SelectorChildrenDef {
    id: string,
    className: string,
    property?: UI5PropertyDefMetadata
}

interface UI5TableSettings {
    insideATable?: boolean;
    tableRow?: number;
    tableCol?: number;
}

interface UI5AggregationRowInfoData {
    ui5Id: string,
    ui5AbsoluteId: string
}

interface UI5AggregationInfoData {
    rows: UI5AggregationRowInfoData[],
    filled: boolean,
    name: string,
    length: number
}

interface UI5LabelInfoData {
    property: UI5PropertyDefMetadata;
    textBinding: string;
};

interface UI5DataResultBase {
    /**
     * Identification information, mostly related about ID (getId()) information
     */
    identifier?: UI5SelectorDefIdentification,

    /**
     * Metadata-Information about the control itself
     */
    metadata?: UI5SelectorDefMetadata,

    /**
     * Contains information about related aggregations - structure:
     * AGGREGATION_NAME { length: the length of the aggregation }
     * 
     * Example: { items: { length: 3 }}
     */
    aggregation?: UI5AggregationInfoData,
    /**
     * Contains information about related binding contexts - structure:
     * MODEL_NAME { DYNAMIC_VALUES_OF_THE_BINDING }
     * 
     * Example: { undefined: { purchaseOrderId: '12345' }}
     */
    context?: UI5BindingContextData,

    /**
     * Identical to "context", but not using any model-name, for better upgradeability
     * It is searching for local bindings and taking the model-name defined here..
     * 
     */
    smartContext?: any,

    binding?: UI5BindingDefMetadata,

    bindingContext?: UI5BindingContextDefMetadata,
    property?: UI5PropertyDefMetadata,
    lumiraProperty?: UI5LumiraProperty,
    sac?: UI5SACData;

    /**
     * Assigned Style classes
     */
    styleClass?: string[];
    /**
     * Assigned CSS Values
     */
    cssValues?: UI5SelectorCSSValues;

    customData?: UI5SelectorCustomData;

    /**
     * DOM position relative to the children of the direct parent
     */
    positionInParent?: number,
}

export interface UI5DataResult extends UI5DataResultBase {
    /**
     * Bound in case the selected control is a tabular like control - contains the JSON formatted data
     */
    tableData?: UI5TableData,

    parents?: UI5DataResultBase[],

    itemdata?: UI5PropertyDefMetadata;

    label?: UI5LabelInfoData;

    /**
     * Information about the Children
     */
    children?: UI5SelectorChildrenDef[],

    /**
     * Amount of Children
     */
    childrenCount?: UI5SelectorChildrenCountDef,

    /**
     * Set in case any parent is of type sap.m.Table, sap.ui.table.Table, sap.ui.table.TreeTable or sap.zen.crosstab.Crosstab
     */
    tableSettings?: UI5TableSettings;

    /**
     * Can be returned by custom enhancement scripts (use fn function)
     */
    enhancedData?: any;
}


export interface UI5SelectorDef extends Selector {
    getUI5(fn?: UI5DataCallback, fnCustomData?: string): Promise<UI5DataResult>;
}


export type UI5DataCallback = (element: UI5SelectorDef) => any;

export let UI5Selector = function (timeout?: number): UI5SelectorDef {
    let selector = Selector((id): Node[] => {
        //@ts-ignore
        return ui5TestCafeSelector.find(id);
    }).addCustomMethods({
        getUI5: (oDomNode: any, fn: UI5DataCallback, fnCustomData?: string) => {
            //@ts-ignore
            var oReturn = ui5TestCafeSelector.getDomNodeInformation(oDomNode, fnCustomData);

            const element = oReturn;
            if (typeof fn === 'function') {
                return fn(element);
            }

            return element;
        }
    });
    if (timeout) {
        selector = selector.with({ timeout: timeout });
    }
    return <UI5SelectorDef>selector;
};