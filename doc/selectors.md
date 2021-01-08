# Selectors

To use a UI5 based selector always use the initialization method `ui5()`. Available methods and corresponding UI5 representation are mentioned in the following table.

### Control-Type Selectors
| Selector-Method        | UI5 Representation      
| ------------- |:-------------:|
| `button()`      | Element of type sap.m.Button |
| `link()`      | Element of type sap.m.Link |
| `text()`      | Element of type sap.m.Text |
| `multiInput()`      | Element of type sap.m.MultiInput |
| `listItem()`      | Element of type sap.m.ListItemBase |
| `genericTile()`      | Element of type sap.m.GenericTile |
| `coreItem()`      | Element of type sap.ui.core.Item. Returns a specialized version for Items (with a key method) |
| `objectAttribute()`      | Element of type sap.m.ObjectAttribute |
| `comboBox()`      | Element of type sap.m.ComboBox, sap.m.MultiComboBox, sap.m.Select |
| `list()`      | Element of type sap.m.List |
| `messageToast()`      | References an active message-toast. Note that message toasts are no normal UI5 controls, therefore a specialized version of the UI5 selector for message toasts is returned. |
| `element(element: string | string[])`      | Checks if the element is of specified type(s). Note that methods above are internally using this method. |


### Attribute Selectors
| Selector-Method        | UI5 Representation      
| ------------- |:-------------:|
| `id(id: string)`      | Checks if the provided ID is part of the item id (substr is used internally) |
| `component(component: string)`      | Checks if the element is assigned to specified component |
| `interactable()`      | Checks that the element is interactable, which means that it is enabled, visible of non-zero size and not busy. Note that this selector is automatically added in case you are performing actions on a selector |
| `bindingContextPath(modelName: string, path: string)`      | Checks if a binding context path (`getBindingContext(sModelName).getPath()`) is matching. You can provid undefined for the first argument, in case you would use `getBindingContext().getPath()` in UI5. |
| `bindingPath(attribute: string, path: string)`      | Checks if the provided attribute is bound against the specified path. Internally using `getBinding(sAttribute).getPath()` |
| `property(propertyName : string, propertyValue: string)`      |Checks the given property name and value. Uses the `getProperty()` API internally|
| `context(path : string, value: any)`      |Internally the correct model is evaludated (e.g. for tables the items model is used). Will call the `getObject()` method on this binding context and compare the value behind the provided path with the specified value|
| `customData(id: string, value ?: string)`      |Checks if the item has the provided custom data id assigned. Uses the `customData` API internally.|
| `cssValue(cssAttr : string, cssValue: any)`      |Checks that the item has the provided css attribute and value|
| `styleClass(styleClass: string)`      |Checks that the item has the corresponding css class assigned.|
| `positionInParent(position: number)`      |Checks the position of the item within it's parent. E.g. for a row it will be the row number. For a form element it will be the occurences inside the form.|
| `localViewName(viewName: string)`      |Checks the view name of the element|
| `enhancedData(custData: any)`      |Allows to pass any kind of data to your selector function |

## Table Selectors
| Selector-Method        | UI5 Representation      
| ------------- |:-------------:|
| `row(sRow : number)`      |If the element is inside a table (sap.m.List, sap.ui.Table (and related)) you can check the table row of the given element|
| `column(sCol : number)`      |If the element is inside a table (sap.m.List, sap.ui.Table (and related)) you can check the table column of the given element|
| `columnDescr(sCol : string)`      |If the element is inside a table (sap.m.List, sap.ui.Table (and related)) you can check the table column title description (label) of the given element|
| `columnId(sColId : string)`      |If the element is inside a table (sap.m.List, sap.ui.Table (and related)) you can check the table column identifier of the given element|
| `insideATable(bInside: boolean)`      |Only searches for elements inside a table|

## Parent and Children Selectors
| Selector-Method        | UI5 Representation      
| ------------- |:-------------:|
| `parent(selector: ui5())`      |Allows you to specifiy any selector (with the API described here) which should be the any parent of the given element.|
| `parentId(id: string)`      |Checks if any parent has the given ID|
| `parentProperty(propertyName: string, propertyValue: any)`      |Checks if any parent has the given property name and value assigned|
| `parentElementName(cotrolType: string)`      |Checks if any parent has the given control-type|
| `childWithId(id: string)`      |Checks if any child (only one level!) has the given id |
| `childWithClassName(className: string)`      |Checks if any child (only one level!) has the given control-type |
| `childWithProperty(propertyName: string, propertyValue: any)`      |Checks if any child (only one level!) has the given property value and name |
| `childrenCount(cnt: number, controlType : string)`      |Checks amount of children. The second argument can be a control-type, to only count those children of a specific type. |


## Adjusting Selector Result
| Selector-Method        | UI5 Representation      
| ------------- |:-------------:|
| `domChildWith(sDomWith : string)`      |Adjust the selected DOM element. Sometimes you do not want to work on the root node element of a UI5 application, but instead on a subnode, which itself is no own UI5 id. You can specifiy the relative path to this dom child here|

## Related Elements
| Selector-Method        | UI5 Representation      
| ------------- |:-------------:|
| `labelProperty(propName: string, propValue: any)`      |Checks the related label of a control (e.g. in a Form) for a property. Normally you will check the `text` property of the element to check the text of a label. |
| `labelTextBinding(i18nText: string)`      |Checks the related label of a control (e.g. in a Form) for its 18n text binding path|
| `itemdata(itemProp: string, value: string)`      |For certain UI5 elements (e.g. ComboBox), the items holding key values are not those visible. To cirumvent this, you can get the actual itemdata properties, which are assigned / bound inside your ComboBox items aggregation using this method|

## SAP Analytics Cloud Selectors
| Selector-Method        | UI5 Representation      
| ------------- |:-------------:|
| `sac()`      |Returns a specialized selector for SAP Analytics Cloud|
| `widgetId(id: str)`      |Provides the widget-id of the widget to be analyzed|
| `widgetType(type: ui5SACWidgetType)`      |Allows you to specify the widget type you are searching for. Currently only chart, table and text are supported|
| `dataPoint(x: number, y: numbr)`      |Allows you to interact on any data-point using the x/y coordinates|