
let _wnd = window;
let iFrames = document.getElementsByTagName("iframe");
for (let i = 0; i < iFrames.length; i++) {
    if (iFrames[i].contentWindow && iFrames[i].contentWindow.sap) {
        _wnd = iFrames[i].contentWindow;
        break;
    }
}

window.addEventListener('error', function (e) {
    if (e.error) {
        console.error(e.error.stack);
    }
});

function ui5TestCafeSelectorDef() {
    this._ui5SelectorLog = {};
    this._ui5SelectorLogOK = {};
    this._ui5SelectorLogFound = [];
    this._ui5LastSelectorDef = {};
    this._ui5CurrentSelectorItem = "";
    this._ui5CurrentSelectorTarget = "";
    this._oDomFieldMapBy = {};
    return this;
}

ui5TestCafeSelectorDef.prototype.findBy = function (id) {
    if (JSON.stringify(id) == JSON.stringify({})) {
        return [];
    }

    this._allElements = this._getAllElements();
    this._ui5LastSelectorDef = id;
    this._oDomFieldMapBy = {};

    //preprocess and adjust id..
    if (id && id.metadata && id.metadata.interactable && id.metadata.interactable.interactable === true) {
        id.metadata.interactable = {
            busy: false,
            needsRerendering: false,
            blocked: false,
            enabled: true,
            visible: true,
            nonZeroSize: true,
            interactable: true
        };
    }

    if (id && typeof id.functions !== "undefined" && typeof id.functions.checkItem !== "undefined") {
        id.functions.checkItem = new Function('return ' + id.functions.checkItem)();
    }

    //search for identifier of every single object..
    let bFound = false;
    this._ui5SelectorLog = {};
    this._ui5SelectorLogOK = {};
    this._ui5SelectorLogFound = [];
    var aItemFoundAll = [];
    var aItem = [];

    for (let sElement in this._allElements) {
        let oItem = this._allElements[sElement];
        if (window.__ui5SelectorDebug) {
            if (oItem.getId().indexOf(window.__ui5SelectorDebug) !== -1) {
                // eslint-disable-next-line no-debugger
                debugger;
            }
        }

        if (this._oCurrentItemInRecordMode && this._oCurrentItemInRecordMode.getId() === oItem.getId()) {
            debugger;
        }

        bFound = true;

        this._ui5CurrentSelectorItem = oItem.getId();
        this._ui5CurrentSelectorTarget = "";

        bFound = this._checkItem(oItem, id);
        if (bFound === false) {
            continue;
        }

        if (bFound === false) {
            continue;
        }

        aItem = _wnd.$(oItem.getDomRef());

        if (!aItem.length) {
            continue;
        }

        let oField = aItem.get(0);
        if (this._getIsInstanceOf(aItem.control()[0], "sap.m.InputBase") && typeof id.domChildWith === "undefined") {
            let sIdUsed = oField.id;
            if (sIdUsed && !sIdUsed.endsWith("-inner")) {
                let oElement = document.getElementById(sIdUsed + "-inner");
                if (oElement) {
                    aItem = _wnd.$(oElement);
                }
            }
        }

        if (typeof id.domChildWith !== "undefined") {
            let oElement = document.getElementById(oItem.getId() + id.domChildWith);
            if (oElement) {
                aItem = _wnd.$(oElement);
            }
        }

        if (this._oDomFieldMapBy[oItem.getId()]) {
            aItem = _wnd.$(this._oDomFieldMapBy[oItem.getId()]);
        }

        if (id.selectAll === true) {
            aItemFoundAll = aItemFoundAll.concat(aItem.get());
            continue;
        }
        break;
    }


    if (id.selectAll === true) {
        return aItemFoundAll;
    }
    if (aItem.length) {
        return aItem.get();
    }
    return [];
};

ui5TestCafeSelectorDef.prototype._getBindingInformation = function (oItem, sBinding) {
    let oBindingInfo = oItem.getBindingInfo(sBinding);
    let oBinding = oItem.getBinding(sBinding);
    let oReturn = {};
    if (!oBindingInfo) {
        return oReturn;
    }

    //not really perfect for composite bindings (what we are doing here) - we are just returning the first for that..
    //in case of a real use case --> enhance
    let oRelevantPart = oBindingInfo;

    if (oBindingInfo.parts && oBindingInfo.parts.length > 0) {
        oRelevantPart = oBindingInfo.parts[0];
    }

    //get the binding context we are relevant for..
    let oBndgContext = oItem.getBindingContext(oRelevantPart.model);
    let sPathPre = oBndgContext ? oBndgContext.getPath() + "/" : "";

    if (oBinding) {
        oReturn = {
            model: oRelevantPart.model,
            path: oBinding.sPath && oBinding.getPath()
        };

        oReturn.path = sPathPre + oReturn.path;
        oReturn.pathFull = oRelevantPart.model + ">" + sPathPre + oReturn.path;
        oReturn.pathRelative = oReturn.path;
    } else {
        oReturn = {
            path: oBindingInfo.path,
            pathRelative: oBindingInfo.path,
            pathFull: oRelevantPart.model + ">" + oBindingInfo.path,
            model: oRelevantPart.model
        };
    }
    return oReturn;
};

ui5TestCafeSelectorDef.prototype._getParentWithDom = function (oItem, iCounter, bViewOnly) {
    oItem = oItem.getParent();
    while (oItem && oItem.getParent) {
        if (oItem.getDomRef && oItem.getDomRef()) {
            iCounter = iCounter - 1;
            if (iCounter <= 0) {
                if (bViewOnly === true && !oItem.getViewData) {
                    oItem = oItem.getParent();
                    continue;
                }
                return oItem;
            }
        }
        oItem = oItem.getParent();
    }
    return null;
};
ui5TestCafeSelectorDef.prototype._getLumiraId = function (oItem) {
    return oItem.zenPureId;
};

ui5TestCafeSelectorDef.prototype._getUi5LocalId = function (oItem) {
    let sId = oItem.getId();
    if (sId.lastIndexOf("-") !== -1) {
        return sId.substr(sId.lastIndexOf("-") + 1);
    }
    return sId;
};

ui5TestCafeSelectorDef.prototype._getIsInstanceOf = function (oInstanceOfItem, str) {
    if (!oInstanceOfItem || !oInstanceOfItem.getMetadata) {
        return false;
    }
    var itm = oInstanceOfItem.getMetadata();
    while (itm) {
        if (itm.getName() === str) {
            return true;
        }
        itm = itm.getParent();
    }
    return false;
};

ui5TestCafeSelectorDef.prototype._getItemForItem = function (oItem) {
    //(0) check if we are already an item - no issue than..
    if (this._getIsInstanceOf(oItem, "sap.ui.core.Item")) {
        return oItem;
    }

    //(1) check by custom data..
    if (oItem.getCustomData()) {
        for (let i = 0; i < oItem.getCustomData().length; i++) {
            let oObj = oItem.getCustomData()[i].getValue();
            if (this._getIsInstanceOf(oObj, "sap.ui.core.Item")) {
                return oObj;
            }
        }
    }

    //(2) no custom data? search for combobox & multi-combo-box case..
    let iIndex = 1;
    let oPrt = oItem;
    while (iIndex < 100) {
        oPrt = this._getParentWithDom(oItem, iIndex);
        if (!oPrt) {
            return null;
        }
        iIndex += 1;
        let sElementName = oPrt.getMetadata().getElementName();
        if (oPrt && (sElementName === "sap.m.MultiComboBox" || sElementName === "sap.m.ComboBox")) {
            if (oPrt._getItemByListItem) {
                return oPrt._getItemByListItem(oItem);
            }
        }
    }
    return null;
};

ui5TestCafeSelectorDef.prototype._getAllLabels = function () {
    for (let sCoreObject in this._allElements) {
        let oObject = this._allElements[sCoreObject];
        if (oObject.getMetadata()._sClassName === "sap.m.Label") {
            let oLabelFor = oObject.getLabelFor ? oObject.getLabelFor() : null;
            if (oLabelFor) {
                return oLabelFor;
            } else {
                //yes.. labelFor is maintained in one of 15 cases (fuck it)
                //for forms it seems to be filled "randomly" - as apparently no developer is maintaing that correctly
                //we have to search UPWARDS, and hope we are within a form.. in that case, normally we can just take all the fields aggregation elements
                if (oObject.getParent() && oObject.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                    //ok.. we got luck.. let's assign all fields..
                    let oFormElementFields = oObject.getParent().getFields();
                    for (let j = 0; j < oFormElementFields.length; j++) {
                        return oObject;
                    }
                }
            }
        }
    }

    return null;
};


ui5TestCafeSelectorDef.prototype._getLabelForItem = function (oItem) {
    let aItems = this._getAllLabels();
    return (aItems && aItems[oItem.getId()]) ? aItems[oItem.getId()] : null;
};


ui5TestCafeSelectorDef.prototype.getControlFromDom = function (oDOMNode) {
    // predefine resulting element ID
    var sResultID;

    // if we do not have DOM node to work with
    if (!oDOMNode) {
        return null;
    }

    if (Array.isArray(oDOMNode)) {
        oDOMNode = oDOMNode[0];
    }
    if (oDOMNode instanceof NodeList) {
        oDOMNode = oDOMNode[0];
    }
    var oCurrentCandidate = oDOMNode;
    do {
        if (oCurrentCandidate.hasAttribute("data-sap-ui-related")) {
            sResultID = oCurrentCandidate.getAttribute("data-sap-ui-related");
            break;
        }
        if (oCurrentCandidate.hasAttribute("data-sap-ui")) {
            sResultID = oCurrentCandidate.getAttribute("id");
            break;
        }
        oCurrentCandidate = oCurrentCandidate.parentNode;

    } while (oCurrentCandidate);
    if (!sResultID) {
        return null;
    }

    // obtain and return UI5 control by the ID we found
    //@ts-ignore
    return _wnd.sap.ui.getCore().byId(sResultID);
}

ui5TestCafeSelectorDef.prototype._getUi5Id = function (oItem) {
    //remove all component information from the control
    let oParent = oItem;
    let sCurrentComponent = "";
    while (oParent && oParent.getParent) {
        if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
            sCurrentComponent = oParent.getController().getOwnerComponent().getId();
            break;
        }
        oParent = oParent.getParent();
    }
    if (!sCurrentComponent.length) {
        return oItem.getId();
    }

    let sId = oItem.getId();
    sCurrentComponent = sCurrentComponent + "---";
    if (sId.lastIndexOf(sCurrentComponent) !== -1) {
        return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
    }
    return sId;
};

ui5TestCafeSelectorDef.prototype.runSupportAssistant = function () {
    var aVisibleComponents = this._getAllVisibleComponents();
    var oAllComponents = sap.ui.core.Component.registry.all();
    var aComponentsVisibleFilter = [];
    for (var sComp in oAllComponents) {
        var oComp = oAllComponents[sComp];
        if (oComp.getManifest && oComp.getManifest() && oComp.getManifest()["sap.app"] && oComp.getManifest()["sap.app"].id) {
            if (aVisibleComponents.indexOf(oComp.getManifest()["sap.app"].id) !== -1) {
                aComponentsVisibleFilter.push(sComp);
            }
        }
    }

    var oComponentFilter = undefined;
    if (aComponentsVisibleFilter.length) {
        oComponentFilter = {
            type: "components",
            components: aComponentsVisibleFilter
        };
    }

    var oPromise = new Promise(function (resolve) {
        sap.ui.require(["sap/ui/support/Bootstrap"], function (Bootstrap) {
            Bootstrap.initSupportRules(["silent"], {
                onReady: function () {
                    jQuery.sap.support.analyze(oComponentFilter).then(function () {
                        resolve(this._analyzeSupportAssistant());
                    }.bind(this));
                }.bind(this)
            });
        }.bind(this));
    }.bind(this));

    return oPromise;
};

ui5TestCafeSelectorDef.prototype._analyzeSupportAssistant = function () {
    var aReturn = [];
    var aIssues = jQuery.sap.support.getLastAnalysisHistory();
    if (!aIssues) {
        return aReturn;
    }
    for (var i = 0; i < aIssues.issues.length; i++) {
        var oIssue = aIssues.issues[i];

        //ignore webpage scopes for the moment..
        if (oIssue.context && oIssue.context.id === 'WEBPAGE') {
            continue;
        }

        aReturn.push({
            severity: oIssue.severity,
            ruleId: oIssue.rule.id,
            context: oIssue.context.id ? oIssue.context.id : "",
            details: oIssue.details
        });
    }

    return aReturn;
};

ui5TestCafeSelectorDef.prototype._getAllVisibleComponents = function (bFilterOutSapStandard) {
    var aComponents = [];
    var bFilterOutSapStandard = typeof bFilterOutSapStandard === "undefined" ? true : false;

    for (var s in this._allElements) {
        var oElem = this._allElements[s];
        if (!oElem || !oElem.getDomRef || !oElem.getDomRef() || !oElem.getVisible || !oElem.getVisible()) {
            continue;
        }
        var sComp = this._getOwnerComponentId(oElem);
        if (!sComp || !sComp.length) {
            continue;
        }
        if (aComponents.indexOf(sComp) === -1) {
            aComponents.push(sComp);
        }
    }

    if (bFilterOutSapStandard === true) {
        aComponents = aComponents.filter(function (e) {
            return e.indexOf("sap.") !== -1 || e.indexOf("sap.ui.demo") !== -1;
        });
    }

    return aComponents;
}

ui5TestCafeSelectorDef.prototype._getOwnerComponentId = function (oParent) {
    let sCurrentComponent = "";
    while (oParent && oParent.getParent) {
        if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
            var oManifest = oParent.getController().getOwnerComponent().getManifest();
            if (!oManifest || !oManifest["sap.app"] || !oManifest["sap.app"].id) {
                continue;
            }
            sCurrentComponent = oManifest["sap.app"].id;
            break;
        }
        oParent = oParent.getParent();
    }
    return sCurrentComponent;
};

ui5TestCafeSelectorDef.prototype._getOwnerComponent = function (oParent) {
    let sCurrentComponent = "";
    while (oParent && oParent.getParent) {
        if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
            sCurrentComponent = oParent.getController().getOwnerComponent().getId();
            break;
        }
        oParent = oParent.getParent();
    }
    return sCurrentComponent;
};

ui5TestCafeSelectorDef.prototype.getSelectorLog = function (oTraceOptions) {
    var oReturnNotFound = {};

    //research using select all
    if (!this._ui5LastSelectorDef.selectAll) {
        this._ui5LastSelectorDef.selectAll = true;
    }
    var aItemsFound = this.find(this._ui5LastSelectorDef);

    for (var sIdent in this._ui5SelectorLog) {
        var oItem = sap.ui.getCore().byId(sIdent);
        var bHasDomRef = oItem && oItem.getDomRef();
        if ((!oTraceOptions || !oTraceOptions.showWithoutDomRef) && !bHasDomRef) {
            continue;
        }
        if (oTraceOptions && oTraceOptions.hideTypes && oTraceOptions.hideTypes.indexOf(this._ui5SelectorLog[sIdent].property) !== -1) {
            continue;
        }

        oReturnNotFound[sIdent] = this._ui5SelectorLog[sIdent];

        //checks, which are ok..
        if (this._ui5SelectorLogOK[sIdent]) {
            for (var i = 0; i < this._ui5SelectorLogOK[sIdent].length; i++) {
                var sProp = this._ui5SelectorLogOK[sIdent][i].property;
                sProp = sProp.substr(sProp.lastIndexOf(".") + 1);
                oReturnNotFound[sIdent][sProp] = 'X';
            }
        }
    }

    //revalidate those items which are found..
    var oReturnFound = [];
    for (var i = 0; i < this._ui5SelectorLogFound.length; i++) {
        var sFoundId = this._ui5SelectorLogFound[i];
        if (this._ui5SelectorLogOK[sFoundId]) {
            oReturnFound = oReturnFound.concat(this._ui5SelectorLogOK[sFoundId]);
        }
    }

    return {
        notFound: oReturnNotFound,
        found: oReturnFound
    }
};

ui5TestCafeSelectorDef.prototype._logWrongValue = function (sIdent, sValueExpected, sValueActual) {
    this._ui5SelectorLog[this._ui5CurrentSelectorItem] = {
        target: this._ui5CurrentSelectorTarget,
        property: sIdent,
        expected: sValueExpected,
        actual: sValueActual
    };
};

ui5TestCafeSelectorDef.prototype._logFound = function () {
    this._ui5SelectorLogFound.push(this._ui5CurrentSelectorItem);
}

ui5TestCafeSelectorDef.prototype._logCorrectValue = function (sIdent, sValueExpected, sValueActual) {
    if (!this._ui5SelectorLogOK[this._ui5CurrentSelectorItem]) {
        this._ui5SelectorLogOK[this._ui5CurrentSelectorItem] = [];
    }
    this._ui5SelectorLogOK[this._ui5CurrentSelectorItem].push({
        id: this._ui5CurrentSelectorItem,
        target: this._ui5CurrentSelectorTarget,
        property: sIdent,
        expected: sValueExpected,
        actual: sValueActual
    });
};

ui5TestCafeSelectorDef.prototype._getSmartContextModelName = function (oItem) {
    var oCurParent = oItem;
    var sModelName = "";
    var bAnyBinding = false;

    //"smart": maybe enable to search for more specific bindings based on the control - i.e. for texts, search for texts..
    while (oCurParent) {
        var sControlParent = oCurParent.getMetadata()._sClassName;
        if (sControlParent === "sap.m.Table" || sControlParent === "sap.m.PlanningCalendar" || sControlParent === "sap.m.Tree" || sControlParent === "sap.m.List" || sControlParent === "sap.ui.table.Table" || sControlParent === "sap.ui.table.TreeTable" || sControlParent === "sap.zen.crosstab.Crosstab") {
            if (oCurParent.mBindingInfos["items"] || oCurParent.mBindingInfos["rows"]) {
                var sBinding = oCurParent.mBindingInfos["items"] ? "items" : "rows";
                var oBndg = oCurParent.mBindingInfos[sBinding];
                if (oBndg.parts) {
                    for (let i = 0; i < oBndg.parts.length; i++) {
                        sModelName = oItem.mBindingInfos[sBinding].parts[i].model ? oItem.mBindingInfos[sBinding].parts[i].model : "undefined";
                        break;
                    }
                } else {
                    sModelName = oBndg.model ? oBndg.model : "undefined";
                }
            }
            break;
        }
        oCurParent = oCurParent.getParent();
    }
    if (sModelName.length === 0) {
        for (let sBinding in oItem.mBindingInfos) {
            if (!oItem.mBindingInfos[sBinding].parts) {
                continue;
            }
            for (let i = 0; i < oItem.mBindingInfos[sBinding].parts.length; i++) {
                sModelName = oItem.mBindingInfos[sBinding].parts[i].model ? oItem.mBindingInfos[sBinding].parts[i].model : "undefined";
            }
            bAnyBinding = true;
        }
        if (!bAnyBinding) {
            //search up the binding context hierarchy (first=direct element bindings, than bindings coming directly from parent, than via propagated views/elements)
            let bndgCtx = {};
            if (!$.isEmptyObject(oItem.mElementBindingContexts)) {
                bndgCtx = oItem.mElementBindingContexts;
            } else if (!$.isEmptyObject(oItem.oBindingContexts)) {
                bndgCtx = oItem.oBindingContexts;
            } else if (!$.isEmptyObject(oItem.oPropagatedProperties.oBindingContexts)) {
                bndgCtx = oItem.oPropagatedProperties.oBindingContexts;
            } else {
                return undefined;
            }
            for (let sModelNameLoc in bndgCtx) {
                sModelName = sModelNameLoc ? sModelNameLoc : "undefined";
                break;
            }
        }
    }
    return sModelName;
};


ui5TestCafeSelectorDef.prototype._getPropertyValueForItem = function (oItem, sProperty) {
    try {
        if (!oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]) {
            return undefined;
        }
        return oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
    } catch (err) {
        return "error while selecting";
    }
};

ui5TestCafeSelectorDef.prototype._convertPropertyValueForItem = function (oItem, sProperty, sPropertyValueSearch) {
    try {
        var sPropertyType = oItem.getMetadata().getProperty(sProperty).getType().getName();
        if (sPropertyType == "boolean") {
            sPropertyValueSearch = (typeof sPropertyValueSearch === "boolean") ? sPropertyValueSearch : sPropertyValueSearch === "true";
        } else if (sPropertyType == "int") {
            sPropertyValueSearch = parseInt(sPropertyValueSearch, 10);
        } else if (sPropertyType == "float") {
            sPropertyValueSearch = parseFloat(sPropertyValueSearch);
        } else if (sPropertyType == "string") {
            sPropertyValueSearch = sPropertyValueSearch.toString();
        }
    } catch (e) {
        sPropertyValueSearch = sPropertyValueSearch;
    }
    return sPropertyValueSearch;
};

ui5TestCafeSelectorDef.prototype._checkItem = function (oItem, id) {
    let bFound = true;
    if (!oItem) { //e.g. parent level is not existing at all..
        return false;
    }

    if (!oItem.getDomRef || !oItem.getDomRef()) {
        this._logWrongValue("domRef", "exists", "does not exist");
        return false;
    }

    if (id.identifier) {
        var sUi5Id = this._getUi5Id(oItem);
        var sUi5LocalId = this._getUi5LocalId(oItem);
        var sLumiraId = this._getLumiraId(oItem);

        if (id.identifier.ui5Id) {
            if (id.identifier.ui5Id !== sUi5Id) {
                this._logWrongValue("identifier.ui5Id", id.identifier.ui5Id, sUi5Id);
                return false;
            }
            this._logCorrectValue("identifier.ui5Id", id.identifier.ui5Id, sUi5Id);
        }
        if (id.identifier.ui5LocalId) {
            if (id.identifier.ui5LocalId !== sUi5LocalId) {
                this._logWrongValue("identifier.ui5LocalId", id.identifier.ui5LocalId, this._getUi5LocalId(oItem));
                return false;
            }
            this._logCorrectValue("identifier.ui5LocalId", id.identifier.ui5LocalId, sUi5LocalId);
        }
        if (id.identifier.lumiraId) {
            if (id.identifier.lumiraId !== sLumiraId) {
                this._logWrongValue("identifier.lumiraId", id.identifier.lumiraId, this._getLumiraId(oItem));
                return false;
            }
            this._logCorrectValue("identifier.lumiraId", id.identifier.lumiraId, sLumiraId);
        }
        if (id.identifier.id) {
            if (id.identifier.id !== sUi5Id && id.identifier.id !== sUi5LocalId && id.identifier.id !== sLumiraId) {
                var sIdMap = [sUi5Id, sUi5LocalId, sLumiraId].filter(function (e) { return typeof e !== "undefined" }).join(",");
                this._logWrongValue("identifier.id", id.identifier.id, sIdMap);
                return false;
            }
            if (id.identifier.id === sUi5Id) {
                this._logCorrectValue("identifier.id", id.identifier.id, sUi5Id);
            } else if (id.identifier.id === sUi5LocalId) {
                this._logCorrectValue("identifier.id", id.identifier.id, sUi5LocalId);
            } else if (id.identifier.id === sLumiraId) {
                this._logCorrectValue("identifier.id", id.identifier.id, sLumiraId);
            }
        }
    }

    if (id.metadata) {
        if (id.metadata.elementName) {
            let aClassArray = [];
            let oMeta = oItem.getMetadata();
            while (oMeta) {
                aClassArray.push(oMeta._sClassName);
                oMeta = oMeta.getParent();
            }

            var aClassArrayLog = aClassArray;
            if (aClassArrayLog.length > 3) {
                aClassArrayLog = [aClassArrayLog[0], aClassArrayLog[1], aClassArrayLog[2], "..."];
            }

            if (_wnd.$.isArray(id.metadata.elementName)) {
                let bFoundAnyElementName = false;
                for (let i = 0; i < id.metadata.elementName.length; i++) {
                    if (aClassArray.indexOf(id.metadata.elementName[i]) != -1) {
                        bFoundAnyElementName = true;
                        break;
                    }
                }
                if (!bFoundAnyElementName) {
                    return false;
                }
                this._logCorrectValue("metadata.elementName", id.metadata.elementName.join(","), aClassArrayLog.join(","));
            } else if (aClassArray.indexOf(id.metadata.elementName) === -1) {
                this._logWrongValue("metadata.elementName", id.metadata.elementName, aClassArrayLog.join(","));
                return false;
            } else {
                this._logCorrectValue("metadata.elementName", id.metadata.elementName, aClassArrayLog.join(","));
            }

        }
        var sComp = this._getOwnerComponent(oItem);
        if (id.metadata.componentName) {
            if (id.metadata.componentName !== sComp) {
                this._logWrongValue("metadata.componentName", id.metadata.componentName, sComp);
                return false;
            }

            this._logCorrectValue("metadata.componentName", id.metadata.componentName, sComp);
        }
    }

    if (id.domChildWith && id.domChildWith.length > 0) {
        let oDomRef = oItem.getDomRef();
        if (!oDomRef) {
            this._logWrongValue("domRef", "available", "not available");
            return false;
        }
        if (_wnd.$("*[id$='" + oDomRef.id + id.domChildWith + "']").length === 0) {
            this._logWrongValue("domChild", id.domChildWith, "not available");
            return false;
        }
    }

    if (id.model) {
        for (let sModel in id.model) {
            sModel = sModel === "undefined" ? undefined : sModel;
            if (!oItem.getModel(sModel)) {
                this._logWrongValue("model", sModel, "not available");
                return false;
            }
            for (let sModelProp in id.model[sModel]) {
                if (oItem.getModel(sModel).getProperty(sModelProp) !== id.model[sModel][sModelProp]) {
                    this._logWrongValue("model." + sModel + "." + sModelProp, id.model[sModel][sModelProp], oItem.getModel(sModel).getProperty(sModelProp));
                    return false;
                } else {
                    this._logCorrectValue("model." + sModel + "." + sModelProp, id.model[sModel][sModelProp], oItem.getModel(sModel).getProperty(sModelProp));
                }
            }
        }
    }

    if (id.metadata && typeof id.metadata.interactable !== "undefined") {
        var bPropVisible = oItem["getVisible"] ? oItem["getVisible"]() : null;
        var bPropEnabled = oItem["getEnabled"] ? oItem["getEnabled"]() : null;

        if (typeof id.metadata.interactable.enabled !== "undefined" && bPropEnabled !== null) {
            if (id.metadata.interactable.enabled != bPropEnabled) {
                this._logWrongValue("metadata.interactable.enabled", id.metadata.interactable.enabled, bPropEnabled);
                return false;
            }
            this._logCorrectValue("metadata.interactable.enabled", id.metadata.interactable.enabled, bPropEnabled);
        }

        if (typeof id.metadata.interactable.visible !== "undefined" && bPropVisible !== null) {
            if (id.metadata.interactable.visible != bPropVisible) {
                this._logWrongValue("metadata.interactable.visible", id.metadata.interactable.enabled, bPropVisible);
                return false;
            }
            this._logCorrectValue("metadata.interactable.visible", id.metadata.interactable.enabled, bPropVisible);
        }
        if (typeof id.metadata.interactable.needsRerendering !== "undefined") {
            if (oItem.bNeedsRerendering) { //don't interact, we are currently rerendering
                this._logWrongValue("metadata.interactable.needsRerendering", oItem.bNeedsRerendering, id.metadata.interactable.needsRerendering);
                return false;
            }
            this._logCorrectValue("metadata.interactable.needsRerendering", oItem.bNeedsRerendering, id.metadata.interactable.needsRerendering);
        }

        //check if me or any direct parent is busy..
        if (typeof id.metadata.interactable.busy !== "undefined") {
            var oCur = oItem;
            while (oCur) {
                if (oCur.getBusy && oCur.getBusy() === true) {
                    this._logWrongValue("metadata.interactable.busy", id.metadata.interactable.busy, oCur.getBusy());
                    return false;
                }
                oCur = oCur.getParent();
            }
            this._logCorrectValue("metadata.interactable.busy", id.metadata.interactable.busy, false);
        }

        if (typeof id.metadata.interactable.blocked !== "undefined") {
            var oStaticArea = _wnd.sap.ui.getCore().getStaticAreaRef();
            var bControlIsInStaticArea = _wnd.$.contains(oStaticArea, oItem.getDomRef());
            var bOpenStaticBlockingLayer = _wnd.$("#sap-ui-blocklayer-popup").is(":visible");
            if (!bControlIsInStaticArea && bOpenStaticBlockingLayer) {
                this._logWrongValue("metadata.interactable.blocked", id.metadata.interactable.blocked, true);
                return false; //blocked and not interactable
            }
            this._logCorrectValue("metadata.interactable.blocked", id.metadata.interactable.blocked, false);
        }

        if (typeof id.metadata.interactable.nonZeroSize !== "undefined") {
            var bNonZeroWidth = _wnd.$(oItem.getDomRef()).outerWidth() > 0 && _wnd.$(oItem.getDomRef()).outerHeight() > 0.
            if (bNonZeroWidth !== id.metadata.interactable.nonZeroSize) {
                this._logWrongValue("metadata.interactable.nonZeroSize", id.metadata.interactable.nonZeroSize, bNonZeroWidth);
                return false;
            }
            this._logCorrectValue("metadata.interactable.nonZeroSize", id.metadata.interactable.nonZeroSize, bNonZeroWidth);
        }
    }

    if (id.styleClass) {
        var aStyleClasses = this._getStyleClassList(oItem);
        for (var i = 0; i < id.styleClass.length; i++) {
            if (aStyleClasses.indexOf(id.styleClass[i]) === -1) {
                this._logWrongValue("id.styleClass." + id.styleClass[i], id.styleClass[i], "-");
                return false;
            }
            this._logCorrectValue("id.styleClass." + id.styleClass[i], id.styleClass[i], "-");
        }
    }

    if (typeof id.positionInParent !== "undefined") {
        var iPosInParent = this._getPositionInParent(oItem);
        if (iPosInParent !== id.positionInParent) {
            this._logWrongValue("id.positionInParent", id.positionInParent, iPosInParent);
            return false;
        }
        this._logCorrectValue("id.positionInParent", id.positionInParent, iPosInParent);
    }

    if (id.cssValue) {
        var oCssValue = this._getCssMap(oItem);
        for (var sCssAttribute in id.cssValues) {
            if (!oCssValue[sCustData] || id.cssValue[sCssAttribute] !== oCssValue[sCssAttribute]) {
                this._logWrongValue("id.cssValue." + sCssAttribute, id.cssValue[sCssAttribute], oCssValue[sCssAttribute]);
                return false;
            }
            this._logCorrectValue("id.cssValue." + sCssAttribute, id.cssValue[sCssAttribute], oCssValue[sCssAttribute]);
        }
    }

    if (id.customData) {
        var oItemCustData = this._getCustomData(oItem);
        for (var sCustData in id.customData) {
            if (!oItemCustData[sCustData] || (typeof id.customData[sCustData] !== "undefined" && id.customData[sCustData] !== oItemCustData[sCustData])) {
                this._logWrongValue("id.customData." + sCustData, id.customData[sCustData], oItemCustData[sCustData]);
                return false;
            }
            this._logCorrectValue("id.customData." + sCustData, id.customData[sCustData], oItemCustData[sCustData]);
        }
    }

    if (id.childrenCount) {
        var sClassName = id.childrenCount.className ? id.childrenCount.className : "_all";
        var aChildrenCount = this._getChildrenCount(this._getChildren(oItem));
        if (!aChildrenCount[sClassName] || aChildrenCount[sClassName] !== id.childrenCount.count) {
            this._logWrongValue("id.childrenCount", id.childrenCount.count, aChildrenCount[sClassName]);
            return false;
        }
        this._logCorrectValue("id.childrenCount", id.childrenCount.count, aChildrenCount[sClassName]);
    }

    if (typeof id.tableSettings !== "undefined") {
        if (typeof id.tableSettings.insideATable !== "undefined" ||
            typeof id.tableSettings.tableRow !== "undefined" || typeof id.tableSettings.tableCol !== "undefined" || typeof id.tableSettings.tableColId !== "undefined"
            || typeof id.tableSettings.tableColDescr !== "undefined") {
            var bIsInTable = false;
            let iTableRow = 0;
            let iTableCol = 0;
            let sTableColId = "";
            let sTableColDescr = "";
            let aParentIds = [];
            aParentIds.push(oItem.getId());
            var oParent = oItem.getParent();
            while (oParent) {
                aParentIds.push(oParent.getId());
                var sControl = oParent.getMetadata()._sClassName;
                if (sControl === "sap.m.Table" || sControl === "sap.ui.table.Table" || sControl === "sap.m.List" || sControl === "sap.m.PlanningCalendar" ||
                    sControl === "sap.ui.table.TreeTable" || sControl === "sap.zen.crosstab.Crosstab") {
                    bIsInTable = true;

                    if (typeof id.tableSettings.tableRow !== "undefined" || typeof id.tableSettings.tableCol !== "undefined") {
                        let aRows = oParent.getAggregation("rows") ? oParent.getAggregation("rows") : oParent.getAggregation("items");

                        var aCol = oParent.getColumns ? oParent.getColumns() : [];

                        if (aRows) {
                            for (let j = 0; j < aRows.length; j++) {
                                if (aParentIds.indexOf(aRows[j].getId()) !== -1) {
                                    iTableRow = j;
                                    iTableCol = 0;
                                    var iTableColCounter = 0;
                                    var iVisibleColCounter = 0;
                                    let aCells = aRows[j].getCells ? aRows[j].getCells() : [];
                                    for (let x = 0; x < aCells.length; x++) {
                                        if (aCol && aCol.length && aCol.length > iTableColCounter) {
                                            if (aCol[iTableColCounter].getVisible() === false) {
                                                iTableColCounter = iTableColCounter + 1;
                                                x = x - 1;
                                                continue;
                                            }
                                        }
                                        iTableColCounter = iTableColCounter + 1;
                                        if (aParentIds.indexOf(aCells[x].getId()) !== -1) {
                                            iTableCol = iVisibleColCounter;

                                            if (aCol && aCol.length && aCol.length > x) {
                                                sTableColId = this._getUi5Id(aCol[x]);
                                                sTableColDescr = aCol[x].getLabel ? aCol[x].getLabel().getText() : "";
                                            }
                                            break;
                                        }
                                        iVisibleColCounter = iVisibleColCounter + 1;
                                    }
                                    break;
                                }
                            }
                        }

                        if ((typeof id.tableSettings.tableRow !== "undefined" && id.tableSettings.tableRow !== iTableRow) ||
                            (typeof id.tableSettings.tableCol !== "undefined" && id.tableSettings.tableCol !== iTableCol)) {
                            this._logWrongValue("tableSettings.tableRow", id.tableSettings.tableRow, iTableRow);
                            this._logWrongValue("tableSettings.tableCol", id.tableSettings.tableCol, iTableCol);
                            return false;
                        }
                        if (typeof id.tableSettings.tableRow !== "undefined") {
                            this._logCorrectValue("tableSettings.tableRow", id.tableSettings.tableRow, iTableRow);
                        }
                        if (typeof id.tableSettings.tableCol !== "undefined") {
                            this._logCorrectValue("tableSettings.tableCol", id.tableSettings.tableCol, iTableCol);
                        }
                        if ((typeof id.tableSettings.tableColId !== "undefined" && id.tableSettings.tableColId !== sTableColId) ||
                            (typeof id.tableSettings.tableColDescr !== "undefined" && id.tableSettings.tableColDescr !== sTableColDescr)) {
                            this._logWrongValue("tableSettings.tableColId", id.tableSettings.tableColId, sTableColId);
                            this._logWrongValue("tableSettings.tableColDescr", id.tableSettings.tableColDescr, sTableColDescr);
                            return false;
                        }
                        if (typeof id.tableSettings.tableColId !== "undefined") {
                            this._logCorrectValue("tableSettings.tableColId", id.tableSettings.tableColId, sTableColId);
                        }
                        if (typeof id.tableSettings.tableColDescr !== "undefined") {
                            this._logCorrectValue("tableSettings.tableColDescr", id.tableSettings.tableColDescr, sTableColDescr);
                        }
                    }
                    break;
                }
                oParent = oParent.getParent();
            }
            if (bIsInTable !== id.tableSettings.insideATable) {
                this._logWrongValue("tableSettings.insideATable", id.tableSettings.insideATable, bIsInTable);
                return false;
            }
            this._logCorrectValue("tableSettings.insideATable", id.tableSettings.insideATable, bIsInTable);
        }
    }

    if (id.bindingContext) {
        for (let sModel in id.bindingContext) {
            let oCtx = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
            if (!oCtx) {
                this._logWrongValue("bindingContext." + sModel, "available", "not available");
                return false;
            }

            if (oCtx.getPath() !== id.bindingContext[sModel]) {
                this._logWrongValue("bindingContext." + sModel, id.bindingContext[sModel], oCtx.getPath());
                return false;
            }
            this._logCorrectValue("bindingContext." + sModel, id.bindingContext[sModel], oCtx.getPath());
        }
    }

    if (id.binding) {
        for (let sBinding in id.binding) {
            let oBndgInfo = this._getBindingInformation(oItem, sBinding);

            if (!oBndgInfo.path && !oBndgInfo.pathFull && !oBndgInfo.pathRelative) {
                this._logWrongValue("binding." + sBinding, "exists", "-");
                return false;
            }

            var aCheckArray = [oBndgInfo.path, oBndgInfo.pathFull, oBndgInfo.pathRelative];
            if (aCheckArray.indexOf(id.binding[sBinding]) === -1) {
                if (oItem.getMetadata().getElementName() === "sap.m.Label") {
                    if (oItem.getParent() && oItem.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                        let oParentBndg = oItem.getParent().getBinding("label");
                        if (!oParentBndg || oParentBndg.getPath() !== id.binding[sBinding]) {
                            this._logWrongValue("binding." + sBinding, id.binding[sBinding], !oParentBndg ? "not available" : oParentBndg.getPath());
                            return false;
                        }
                    } else {
                        this._logWrongValue("binding." + sBinding, id.binding[sBinding], aCheckArray.join(","));
                        return false;
                    }
                } else {
                    this._logWrongValue("binding." + sBinding, id.binding[sBinding], aCheckArray.join(","));
                    return false;
                }
            }

            this._logCorrectValue("binding." + sBinding, id.binding[sBinding], aCheckArray.join(","));
        }
    }

    if (id.lumiraProperty) {
        if (typeof id.lumiraProperty.numberOfDimensionsOnRow !== "undefined") {
            if (id.lumiraProperty.numberOfDimensionsOnRow !== oItem.oHeaderInfo.getNumberOfDimensionsOnRowsAxis()) {
                this._logWrongValue("lumiraProperty.numberOfDimensionsOnRow", id.lumiraProperty.numberOfDimensionsOnRow, oItem.oHeaderInfo.getNumberOfDimensionsOnRowsAxis());
                return false;
            } else {
                this._logCorrectValue("lumiraProperty.numberOfDimensionsOnRow", id.lumiraProperty.numberOfDimensionsOnRow, oItem.oHeaderInfo.getNumberOfDimensionsOnRowsAxis());
            }
        }
        if (typeof id.lumiraProperty.numberOfDimensionsOnCol !== "undefined") {
            if (id.lumiraProperty.numberOfDimensionsOnCol !== oItem.oHeaderInfo.getNumberOfDimensionsOnColsAxis()) {
                this._logWrongValue("lumiraProperty.numberOfDimensionsOnCol", id.lumiraProperty.numberOfDimensionsOnCol, oItem.oHeaderInfo.getNumberOfDimensionsOnColsAxis());
                return false;
            } else {
                this._logCorrectValue("lumiraProperty.numberOfDimensionsOnCol", id.lumiraProperty.numberOfDimensionsOnCol, oItem.oHeaderInfo.getNumberOfDimensionsOnColsAxis());
            }
        }
        if (typeof id.lumiraProperty.numberOfRows !== "undefined") {
            if (id.lumiraProperty.numberOfRows !== oItem.rowHeaderArea.oDataModel.getRowCnt()) {
                this._logWrongValue("lumiraProperty.numberOfRows", id.lumiraProperty.numberOfRows, oItem.rowHeaderArea.oDataModel.getRowCnt());
                return false;
            } else {
                this._logCorrectValue("lumiraProperty.numberOfRows", id.lumiraProperty.numberOfRows, oItem.rowHeaderArea.oDataModel.getRowCnt());
            }
        }

        if (typeof id.lumiraProperty.numberOfCols !== "undefined") {
            if (id.lumiraProperty.numberOfCols !== oItem.columnHeaderArea.oDataModel.getColCnt()) {
                this._logWrongValue("lumiraProperty.numberOfCols", id.lumiraProperty.numberOfCols, oItem.columnHeaderArea.oDataModel.getColCnt());
                return false;
            } else {
                this._logCorrectValue("lumiraProperty.numberOfCols", id.lumiraProperty.numberOfCols, oItem.columnHeaderArea.oDataModel.getColCnt());
            }
        }

        if (typeof id.lumiraProperty.numberOfDataCells !== "undefined") {
            if (id.lumiraProperty.numberOfDataCells !== oItem.getAggregation("dataCells").length) {
                this._logWrongValue("lumiraProperty.numberOfDataCells", id.lumiraProperty.numberOfDataCells, oItem.getAggregation("dataCells").length);
                return false;
            } else {
                this._logCorrectValue("lumiraProperty.numberOfDataCells", id.lumiraProperty.numberOfDataCells, oItem.getAggregation("dataCells").length);
            }
        }

        if (typeof id.lumiraProperty.chartTitle !== "undefined") {
            if (id.lumiraProperty.chartTitle !== oItem.widget.getTitleTextInternal()) {
                this._logWrongValue("lumiraProperty.chartTitle", id.lumiraProperty.chartTitle, oItem.widget.getTitleTextInternal());
                return false;
            } else {
                this._logCorrectValue("lumiraProperty.chartTitle", id.lumiraProperty.chartTitle, oItem.widget.getTitleTextInternal());
            }
        }

        if (typeof id.lumiraProperty.chartType !== "undefined") {
            if (id.lumiraProperty.chartType !== oItem.widget.vizType()) {
                this._logWrongValue("lumiraProperty.chartType", id.lumiraProperty.chartType, oItem.widget.vizType());
                return false;
            } else {
                this._logCorrectValue("lumiraProperty.chartType", id.lumiraProperty.chartType, oItem.widget.vizType());
            }
        }
        if (typeof id.lumiraProperty.dimensionCount !== "undefined" || typeof id.lumiraProperty.measuresCount !== "undefined") {
            let aFeedItems = JSON.parse(oItem.widget.feedItems());
            let iDimCount = 0;
            let iMeasCount = 0;
            aFeedItems.filter(function (e) {
                return e.type == "Dimension";
            }).forEach(function (e) {
                iDimCount += e.values.length;
            });
            aFeedItems.filter(function (e) {
                return e.type == "Measure";
            }).forEach(function (e) {
                iMeasCount += e.values.length;
            });
            if (typeof id.lumiraProperty.dimensionCount !== "undefined") {
                if (id.lumiraProperty.dimensionCount !== iDimCount) {
                    this._logWrongValue("lumiraProperty.dimensionCount", id.lumiraProperty.dimensionCount, iDimCount);
                    return false;
                } else {
                    this._logCorrectValue("lumiraProperty.dimensionCount", id.lumiraProperty.dimensionCount, iDimCount);
                }
            }
            if (typeof id.lumiraProperty.measuresCount !== "undefined") {
                if (id.lumiraProperty.measuresCount !== iMeasCount) {
                    this._logWrongValue("lumiraProperty.measuresCount", id.lumiraProperty.measuresCount, iMeasCount);
                    return false;
                } else {
                    this._logCorrectValue("lumiraProperty.measuresCount", id.lumiraProperty.measuresCount, iMeasCount);
                }
            }
        }
        if (typeof id.lumiraProperty.dataCellCount !== "undefined") {
            let iDataCellCount = 0;
            oItem.widget._uvbVizFrame.vizData().data().data.forEach(function (e) {
                iDataCellCount += e.length;
            });
            if (id.lumiraProperty.dataCellCount !== iDataCellCount) {
                this._logWrongValue("lumiraProperty.dataCellCount", id.lumiraProperty.dataCellCount, iDataCellCount);
                return false;
            } else {
                this._logCorrectValue("lumiraProperty.dataCellCount", id.lumiraProperty.dataCellCount, iDataCellCount);
            }
        }
    }

    if (id.aggregation) {
        for (let sAggregationName in id.aggregation) {
            let oAggr = id.aggregation[sAggregationName];
            if (!oAggr.name) {
                continue; //no sense to search without aggregation name..
            }
            if (typeof oAggr.length !== "undefined") {
                if (oItem.getAggregation(sAggregationName).length !== oAggr.length) {
                    this._logWrongValue("aggregation." + sAggregationName, oAggr.length, oItem.getAggregation(sAggregationName).length);
                    bFound = false;
                } else {
                    this._logCorrectValue("aggregation." + sAggregationName, oAggr.length, oItem.getAggregation(sAggregationName).length);
                }
            }
            if (bFound === false) {
                return false;
            }
        }
    }
    if (id.context) {
        for (let sModel in id.context) {
            let oCtx = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
            if (!oCtx) {
                this._logWrongValue("context." + sModel, "available", "not available");
                return false;
            }
            let oObjectCompare = oCtx.getObject();
            if (!oObjectCompare) {
                this._logWrongValue("context." + sModel, "object assigned", "no object assigned");
                return false;
            }
            let oObject = id.context[sModel];
            for (let sAttr in oObject) {
                if (oObject[sAttr] !== oObjectCompare[sAttr]) {
                    this._logWrongValue("context." + sModel + "." + sAttr, oObject[sAttr], oObjectCompare[sAttr]);
                    return false;
                }

                this._logCorrectValue("context." + sModel + "." + sAttr, oObject[sAttr], oObjectCompare[sAttr]);
            }
        }
    }

    if (id.smartContext) {
        var sModelName = this._getSmartContextModelName(oItem);
        let oCtx = oItem.getBindingContext(sModelName === "undefined" ? undefined : sModelName);
        if (!oCtx) {
            this._logWrongValue("smartContext." + sModelName, "available", "not available");
            return false;
        }
        let oObjectCompare = oCtx.getObject();
        if (!oObjectCompare) {
            this._logWrongValue("smartContext." + sModelName, "object", "no object");
            return false;
        }
        for (let sAttr in id.smartContext) {
            if (id.smartContext[sAttr] !== oObjectCompare[sAttr]) {
                this._logWrongValue("smartContext." + sModelName + "." + sAttr, id.smartContext[sAttr], oObjectCompare[sAttr]);
                return false;
            }
            this._logCorrectValue("smartContext." + sModelName + "." + sAttr, id.smartContext[sAttr], oObjectCompare[sAttr]);
        }
    }

    if (id.viewProperty) {
        let oView = this._getParentWithDom(oItem, 1, true);
        if (oView) {
            var sViewProp = oView.getProperty("viewName");
            var sLocalView = sViewProp.split(".").pop();
            if (id.viewProperty.localViewName) {
                if (id.viewProperty.localViewName !== sLocalView) {
                    this._logWrongValue("viewProperty.localViewName", id.viewProperty.localViewName, sLocalView);
                    return false;
                } else {
                    this._logCorrectValue("viewProperty.localViewName", id.viewProperty.localViewName, sLocalView);
                }
            }
            if (id.viewProperty.viewName) {
                if (id.viewProperty.viewName !== sViewProp) {
                    this._logWrongValue("viewProperty.viewName", id.viewProperty.viewName, sViewProp);
                    return false;
                } else {
                    this._logCorrectValue("viewProperty.viewName", id.viewProperty.viewName, sViewProp);
                }
            }
        }
    }

    if (id.property) {
        for (let sProperty in id.property) {
            let sPropertyValueItem = this._getPropertyValueForItem(oItem, sProperty);
            let sPropertyValueSearch = this._convertPropertyValueForItem(oItem, sProperty, id.property[sProperty]);

            if (sPropertyValueItem !== sPropertyValueSearch) {
                this._logWrongValue("property." + sProperty, sPropertyValueItem, sPropertyValueSearch);
                return false;
            }
            this._logCorrectValue("property." + sProperty, sPropertyValueItem, sPropertyValueSearch);
        }
    }

    if (id.label) {
        var oLabel = this._getLabelForItem(oItem);
        if (!oLabel) {
            this._logWrongValue("label", "exists", "-");
            return false;
        }
        this._logCorrectValue("label", "exists", "exists");

        if (id.label.property) {
            for (let sProperty in id.label.property) {
                let sPropertyValueItem = this._getPropertyValueForItem(oLabel, sProperty);
                let sPropertyValueSearch = this._convertPropertyValueForItem(oLabel, sProperty, id.label.property[sProperty]);

                if (sPropertyValueItem !== sPropertyValueSearch) {
                    this._logWrongValue("label.property." + sProperty, sPropertyValueItem, sPropertyValueSearch);
                    return false;
                }
                this._logCorrectValue("label.property." + sProperty, sPropertyValueItem, sPropertyValueSearch);
            }
        }

        if (id.label.textBinding) {
            let oBndgInfo = this._getBindingInformation(oItem, "text");
            let aCheckArray = oBndgInfo.path ? [oBndgInfo.path, oBndgInfo.pathFull, oBndgInfo.pathRelative] : [];
            if (!oBndgTextBinding || aCheckArray.indexOf(id.label.textBinding) === -1) {
                this._logWrongValue("label.textBinding", id.label.textBinding, oBndgTextBinding.path ? oBndgTextBinding.path : "-");
                return false;
            }
            this._logCorrectValue("label.textBinding", id.label.textBinding, id.label.textBinding);
        }
    }

    if (id.itemdata) {
        var oItemForItem = this._getItemForItem(oItem);
        if (!oItemForItem) {
            this._logWrongValue("itemdata", "exists", "-");
            return false;
        }
        this._logCorrectValue("itemdata", "exists", "exists");

        for (let sProperty in id.itemdata) {
            let sPropertyValueItem = this._getPropertyValueForItem(oItemForItem, sProperty);
            let sPropertyValueSearch = this._convertPropertyValueForItem(oItemForItem, sProperty, id.itemdata[sProperty]);

            if (sPropertyValueItem !== sPropertyValueSearch) {
                this._logWrongValue("itemdata." + sProperty, sPropertyValueItem, sPropertyValueSearch);
                return false;
            }
            this._logCorrectValue("itemdata." + sProperty, sPropertyValueItem, sPropertyValueSearch);
        }
    }

    if (typeof id.sac !== "undefined") {
        if (this._isSACWidgetBusy(oItem)) {
            this._logWrongValue("interactable.sac", false, true);
            return false;
        }
        this._logCorrectValue("interactable.sac", false, false);


        if (typeof id.sac.widgetId !== "undefined") {
            if (!oItem.getWidgetId || id.sac.widgetId !== oItem.getWidgetId()) {
                this._logWrongValue("id.sac.widgetid", id.sac.widgetId, oItem.getWidgetId ? oItem.getWidgetId() : null);
                return false;
            }
            this._logCorrectValue("id.sac.widgetid", id.sac.widgetId, oItem.getWidgetId ? oItem.getWidgetId() : null);
        }

        let oRet = this._getSACData(oItem);

        if (typeof id.sac.chart !== "undefined") {
            if (typeof id.sac.chart.title !== "undefined") {
                if (d.sac.chart.title !== oRet.chart.title) {
                    this._logWrongValue("id.sac.chart.title", id.sac.chart.title, oRet.chart.title);
                    return false;
                }
                this._logCorrectValue("id.sac.chart.title", id.sac.chart.title, oRet.chart.title);
            }
            if (typeof id.sac.chart.subTitle !== "undefined") {
                if (id.sac.chart.subTitle !== oRet.chart.subTitle) {
                    this._logWrongValue("id.sac.chart.subTitle", id.sac.chart.subTitle, oRet.chart.subTitle);
                    return false;
                }
                this._logCorrectValue("id.sac.chart.subTitle", id.sac.chart.subTitle, oRet.chart.subTitle);
            }
            if (typeof id.sac.chart.type !== "undefined") {
                if (id.sac.chart.type !== oRet.chart.type) {
                    this._logWrongValue("id.sac.chart.type", id.sac.chart.type, oRet.chart.type);
                    return false;
                }
                this._logCorrectValue("id.sac.chart.type", id.sac.chart.type, oRet.chart.type);
            }
            if (typeof id.sac.chart.dataLabelVisible !== "undefined") {
                if (id.sac.chart.dataLabelVisible !== oRet.chart.dataLabelVisible) {
                    this._logWrongValue("id.sac.chart.dataLabelVisible", id.sac.chart.dataLabelVisible, oRet.chart.dataLabelVisible);
                    return false;
                }
                this._logCorrectValue("id.sac.chart.dataLabelVisible", id.sac.chart.dataLabelVisible, oRet.chart.dataLabelVisible);
            }
        }

        if (typeof id.sac.dataPoint !== "undefined") {
            //check if data-point is actually available..   
            let bDataPointFound = false;
            for (var i = 0; i < oRet.dataPoints.length; i++) {
                if (oRet.dataPoints[i].xValue === id.sac.dataPoint.x && oRet.dataPoints[i].yValue === id.sac.dataPoint.y) {
                    bDataPointFound = true;

                    //we have to adjust this item later on..
                    this._oDomFieldMapBy[oItem.getId()] = oRet.dataPoints[i].domTarget;
                    break;
                }
            }
            if (bDataPointFound === false) {
                //for tables we might have a special row/col (e.g. for the title) - we will allow interactions here, even if not available.
                var oCellDomRef = $('#' + oItem.getId() + ' td').filter('*[data-row="' + id.sac.dataPoint.x + '"]').filter('*[data-col="' + id.sac.dataPoint.y + '"]');
                if (oCellDomRef.length === 0) {
                    this._logWrongValue("id.sac.dataPoint", id.sac.dataPoint.x + "/" + id.sac.dataPoint.y, "not available");
                    return false;
                } else {
                    this._oDomFieldMapBy[oItem.getId()] = oCellDomRef[0];
                }
            }
            this._logCorrectValue("id.sac.dataPoint", id.sac.dataPoint.x + "/" + id.sac.dataPoint.y, id.sac.dataPoint.x + "/" + id.sac.dataPoint.y);
        }
    }

    if (id.parentAnyLevel) {
        let oParent = oItem.getParent();
        this._ui5CurrentSelectorTarget = "parentAnyLevel";
        if (!oParent) {
            this._logWrongValue("id.parentAnyLevel", "parent available", "-");
            return false;
        }

        //extremly simplistic here..
        while (oParent) {
            if (this._checkItem(oParent, id.parentAnyLevel)) {
                break;
            }
            oParent = this._getParentWithDom(oParent, 1, false);
            if (!oParent) {
                return false;
            }
        }
        this._ui5CurrentSelectorTarget = "";
    }

    if (id.atLeastOneChild) {
        let aChildren = this._getChildren(oItem);
        this._ui5CurrentSelectorTarget = "atLeastOneChild";

        let bFound = false;
        for (var i = 0; i < aChildren.length; i++) {
            var oElem = _wnd.sap.ui.getCore().byId(aChildren[i].id);
            if (oElem && this._checkItem(oElem, id.atLeastOneChild)) {
                bFound = true;
                break;
            }
        }
        if (!bFound) {
            return false;
        }
        this._ui5CurrentSelectorTarget = "";
    }

    if (typeof id.functions !== "undefined" && typeof id.functions.checkItem !== "undefined") {
        try {
            if (id.functions.checkItem(oItem, id, function () {
                return this.getElementInformation(oItem, oItem.getDomRef())
            }.bind(this)) === false) {
                this._logWrongValue("id.functions.checkItem", true, false);
                return false;
            }
            this._logCorrectValue("id.functions.checkItem", true, false);
        } catch (err) {
            this._logWrongValue("id.functions.checkItem", true, err.message);
            return false;
        }
    }

    this._logFound();
    return true;
};

ui5TestCafeSelectorDef.prototype._getAllElements = function () {
    let oCoreObject = null;
    let fakePlugin = {
        startPlugin: function (core) {
            oCoreObject = core;
            return core;
        }
    };
    _wnd.sap.ui.getCore().registerPlugin(fakePlugin);
    _wnd.sap.ui.getCore().unregisterPlugin(fakePlugin);
    let aElements = {};
    if (_wnd.sap.ui.core.Element && _wnd.sap.ui.core.Element.registry) {
        aElements = _wnd.sap.ui.core.Element.registry.all();
    } else {
        aElements = oCoreObject.mElements;
    }
    return aElements;
};

ui5TestCafeSelectorDef.prototype._isInTransition = function () {
    for (let sElement in this._allElements) {
        let oItem = this._allElements[sElement];
        if (this._getIsInstanceOf(oItem, "sap.m.NavContainer")) {
            if (oItem.bTransition2EndPending === true ||
                oItem.bTransitionEndPending === true ||
                oItem._bNavigating === true ||
                (oItem._aQueue && oItem._aQueue.length > 0)) {
                return true;
            }
        }
    }

    if (_wnd.$(':animated').length > 0) {
        //something is animating - we shouldn't do anything as of now, as most probably (sap.m.NavContainer / sap.m.Carousel / sap.m.Wizard) at the end of the navigation, the focus is changed
        return true;
    }
    return false;
}

ui5TestCafeSelectorDef.prototype.find = function (id) {
    let aItem = null;

    if (id && id.actionDescription) {
        var oNodeElem = this._getHammerheadShadowUiByClass("status-hammerhead-shadow-ui");
        if (oNodeElem) {
            oNodeElem.innerText = id.actionDescription;
        }
    }

    if (typeof _wnd.sap === "undefined" || typeof _wnd.sap.ui === "undefined" || typeof _wnd.sap.ui.getCore === "undefined" || !_wnd.sap.ui.getCore() || !_wnd.sap.ui.getCore().isInitialized()) {
        return [];
    }

    //First Step: Early exits, in case anything suspicious is happening..
    //1.1: early exit in case of transitions..
    if (this._isInTransition() === true) {
        return [];
    }

    if (typeof id === "string") {
        if (id.charAt(0) === '#') {
            id = id.substr(1); //remove the trailing "#" if any
        }
        let searchId = "*[id$='" + id + "']";
        aItem = _wnd.$(searchId);

        //fallbacks to make the API simpler - search for ui5-id as if the user would search for ids
        if (!aItem || !aItem.length || !aItem.control() || !aItem.control().length) {
            aItem = this.findBy({
                identifier: {
                    id: id
                }
            });
        }
    } else {
        aItem = this.findBy(id);
    }

    if (!aItem || !aItem.length) {
        return [];
    }

    return aItem;
}


ui5TestCafeSelectorDef.prototype._getTableData = function (oItem) {
    let oReturn = {};
    if (oItem.getMetadata()._sClassName === "sap.zen.crosstab.Crosstab" && oItem.oHeaderInfo) {
        //dimensions:
        let iDimensionsColAxis = oItem.oHeaderInfo.getNumberOfDimensionsOnColsAxis();
        let iDimensionsRowAxis = oItem.oHeaderInfo.getNumberOfDimensionsOnRowsAxis();
        let oDimCols = {};
        let oDimRows = {};
        let i = 0;
        oReturn.visibleDimensionsCol = [];
        oReturn.visibleDimensionsRow = [];
        oReturn.data = [];
        for (i = 0; i < iDimensionsColAxis; i++) {
            oDimCols[i] = oItem.oHeaderInfo.getDimensionNameByRow(i);
            oReturn.visibleDimensionsCol.push(oDimCols[i]);
        }
        for (i = 0; i < iDimensionsRowAxis; i++) {
            oDimRows[i] = oItem.oHeaderInfo.getDimensionNameByCol(i);
            oReturn.visibleDimensionsRow.push(oDimRows[i]);
        }

        let aDataCells = oItem.getAggregation("dataCells");
        for (i = 0; i < aDataCells.length; i++) {
            let oDataCell = aDataCells[i].mProperties;

            //we have our row && col --> get all corresponding attributes..
            let oDataLine = {};
            for (let x = 0; x < iDimensionsRowAxis; x++) {
                let oColVal = oItem.rowHeaderArea.oDataModel.getCell(oDataCell.tableRow - iDimensionsColAxis, x);
                if (!oColVal) {
                    continue;
                }
                oDataLine[oDimRows[x]] = oColVal.mProperties.text;
            }
            for (let x = 0; x < iDimensionsColAxis; x++) {
                let oColVal = oItem.columnHeaderArea.oDataModel.getCell(oDataCell.tableCol - iDimensionsRowAxis, x);
                if (!oColVal) {
                    continue;
                }
                oDataLine[oDimCols[x]] = oColVal.mProperties.text;
            }
            oDataLine.cellValue = oDataCell.text;
            oDataLine.tableRow = oDataCell.tableRow - iDimensionsColAxis;
            oDataLine.tableCol = oDataCell.tableCol - iDimensionsRowAxis;
            oReturn.data.push(oDataLine);
        }

        oReturn.data = oReturn.data.sort(function (a, b) {
            if (a.tableRow < b.tableRow) {
                return -1;
            } else if (a.tableRow > b.tableRow) {
                return 1;
            } else if (a.tableCol < b.tableCol) {
                return -1;
            } else {
                return 1;
            }
        });
    } else if (oItem.getMetadata()._sClassName === "sap.designstudio.sdk.AdapterControl" &&
        oItem.zenType === "com_sap_ip_bi_VizFrame" && oItem.widget) {
        oReturn.feeds = [];

        let aFeedItems = JSON.parse(oItem.widget.feedItems());
        for (let i = 0; i < aFeedItems.length; i++) {
            oReturn.feeds.push({
                type: aFeedItems[i].type,
                id: aFeedItems[i].id,
                dimensions: aFeedItems[i].values.filter(function (e) {
                    return e.type === "dimension";
                }).map(function (e) {
                    return {
                        id: e.id,
                        name: e.name
                    };
                }),
                measures: aFeedItems[i].values.filter(function (e) {
                    return e.type === "measure";
                }).map(function (e) {
                    return {
                        id: e.id,
                        name: e.name
                    };
                })
            });
        }

        //hardcore internal:
        let aDataPoints = oItem.widget._uvbVizFrame.chart()._chartView()._chart.app._dataModel.dataModel.getDataPoints();

        let chartData = oItem.widget._uvbVizFrame.vizData().data();
        oReturn.data = [];
        oReturn.dimensions = chartData.metadata.fields.filter(function (e) {
            return e.type === "Dimension" || e.semanticType === "Measure";
        }).map(function (e) {
            return {
                id: e.id,
                name: e.name
            };
        });

        oReturn.measures = chartData.metadata.fields.filter(function (e) {
            return e.type === "Measure" || e.semanticType === "Measure";
        }).map(function (e) {
            return {
                id: e.id,
                name: e.name
            };
        });

        for (let i = 0; i < chartData.data.length; i++) {
            let oDataLine = {};
            for (let k = 0; k < oReturn.dimensions.length; k++) {
                oDataLine[oReturn.dimensions[k].id] = chartData.data[i][k].v;
                oDataLine[oReturn.dimensions[k].id + ".d"] = chartData.data[i][k].d;
            }
            let oDataPointSearch = oDataLine;
            for (let j = oReturn.dimensions.length; j < chartData.data[i].length; j++) {
                oDataLine[oReturn.measures[j - oReturn.dimensions.length].id] = chartData.data[i][j];

                oDataPointSearch[oReturn.measures[j - oReturn.dimensions.length].id] = chartData.data[i][j];

                //try to find the datapoint per dimensions..
                for (let k = 0; k < aDataPoints.length; k++) {
                    let oDataPointData = aDataPoints[k]._data;
                    let bFalse = false;
                    for (let sData in oDataPointData) {
                        if (oDataPointData[sData] != oDataPointSearch[sData]) {
                            bFalse = true;
                            break;
                        }
                    }
                    if (bFalse === true) {
                        continue;
                    }
                    //we have the datapoint!!!
                    oDataPointSearch[oReturn.measures[j - oReturn.dimensions.length].id + "_selector"] = "[data-datapoint-id='" + aDataPoints[k].id + "']";
                    break;
                }
            }

            oReturn.data.push(oDataLine);
        }
    } else if (oItem.getMetadata()._sClassName === "sap.m.Table" || oItem.getMetadata()._sClassName === "sap.m.List") {
        let oBndg = oItem.getBinding("items");
        if (oBndg) {
            let aContext = oBndg.getContexts(0, oBndg.getLength());
            oReturn.finalLength = oBndg.getLength();
            oReturn.data = [];
            for (let i = 0; i < aContext.length; i++) {
                oReturn.data.push(aContext[i].getObject());
            }
        }
    } else if (oItem.getMetadata()._sClassName === "sap.ui.table.Table" || oItem.getMetadata()._sClassName === "sap.ui.table.TreeTable") {
        let oBndg = oItem.getBinding("rows");
        if (oBndg) {
            let aContext = oBndg.getContexts(0, oBndg.getLength());
            oReturn.finalLength = oBndg.getLength();
            oReturn.data = [];
            for (let i = 0; i < aContext.length; i++) {
                oReturn.data.push(aContext[i].getObject());
            }
        }
    } else if (oItem.getMetadata()._sClassName === "sap.m.MultiInput") {
        let oToken = oItem.getTokens();
        oReturn = [];
        for (let i = 0; i < oToken.length; i++) {
            oReturn.push({
                key: oToken[i].getKey(),
                text: oToken[i].getText()
            });
        }
    }
    return oReturn;
};


ui5TestCafeSelectorDef.prototype._getContextModels = function (oItem) {
    let oReturn = {};

    if (!oItem) {
        return oReturn;
    }

    let oModel = oItem.oModels;
    for (let s in oItem.oPropagatedProperties.oModels) {
        if (!oModel[s]) {
            oModel[s] = oItem.oPropagatedProperties.oModels[s];
        }
    }

    return oModel;
};

ui5TestCafeSelectorDef.prototype._getEmptyReturn = function (bWithParent) {
    var oRet = {
        property: {},
        aggregation: [],
        binding: {},
        bindingContext: {},
        context: {},
        model: {},
        metadata: {},
        lumiraProperty: {},
        viewProperty: {},
        sac: {},
        classArray: [],
        identifier: {
            domId: "",
            ui5Id: "",
            idCloned: false,
            idGenerated: false,
            ui5LocalId: "",
            localIdClonedOrGenerated: false,
            ui5AbsoluteId: "",
            lumiraId: ""
        },
        control: null,
        dom: null,
        tableSettings: {
            insideATable: false
        }
    };

    if (!bWithParent) {
        return oRet;
    }

    var oReturn = JSON.parse(JSON.stringify(oRet));
    return oReturn;
}

ui5TestCafeSelectorDef.prototype._getParents = function (oItem) {
    var aParents = [];
    let oParent = this._getParentWithDom(oItem, 1, false);
    while (oParent) {
        aParents.push(this._getElementInformation(oParent, oParent.getDomRef(), false));
        oParent = this._getParentWithDom(oParent, 1, false);
    }
    return aParents;
}

ui5TestCafeSelectorDef.prototype._getElementProperties = function (oItem) {
    var oReturn = {};
    for (let sProperty in oItem.mProperties) {
        if (typeof oItem.mProperties[sProperty] === "function" || typeof oItem.mProperties[sProperty] === "object") {
            continue;
        }
        let fnGetter = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)];
        if (fnGetter) {
            oReturn[sProperty] = fnGetter.call(oItem);
        } else {
            oReturn[sProperty] = oItem.mProperties[sProperty];
        }
    }

    return oReturn;
};

ui5TestCafeSelectorDef.prototype._getElementInformation = function (oItem, oDomNode, bCurElement) {
    let oReturn = this._getEmptyReturn(false);

    if (!oItem) {
        return oReturn;
    }
    if (!oDomNode && oItem.getDomRef) {
        oDomNode = oItem.getDomRef();
    }

    oReturn.identifier.ui5Id = this._getUi5Id(oItem);
    oReturn.identifier.ui5LocalId = this._getUi5LocalId(oItem);

    oReturn.classArray = [];
    let oMeta = oItem.getMetadata();
    while (oMeta) {
        oReturn.classArray.push({
            elementName: oMeta._sClassName
        });
        oMeta = oMeta.getParent();
    }

    //does the ui5Id contain a "-" with a following number? it is most likely a dependn control (e.g. based from aggregation or similar)
    if (RegExp("([A-Z,a-z,0-9])-([0-9])").test(oReturn.identifier.ui5Id) === true) {
        oReturn.identifier.idCloned = true;
    } else {
        //check as per metadata..
        let oMetadata = oItem.getMetadata();
        while (oMetadata) {
            if (!oMetadata._sClassName) {
                break;
            }
            if (["sap.ui.core.Item", "sap.ui.table.Row", "sap.m.ObjectListItem"].indexOf(oMetadata._sClassName) !== -1) {
                oReturn.identifier.idCloned = true;
            }
            oMetadata = oMetadata.getParent();
        }
    }
    //does the ui5id contain a "__"? it is most likely a generated id which should NOT BE USESD!!
    //check might be enhanced, as it seems to be that all controls are adding "__[CONTORLNAME] as dynamic view..
    if (oReturn.identifier.ui5Id.indexOf("__") !== -1) {
        oReturn.identifier.idGenerated = true;
    }
    if (oDomNode) {
        oReturn.identifier.domId = oDomNode.id;
    }
    if (oReturn.identifier.idCloned === true || oReturn.identifier.ui5LocalId.indexOf("__") !== -1) {
        oReturn.identifier.localIdClonedOrGenerated = true;
    }
    oReturn.identifier.ui5AbsoluteId = oItem.getId();

    if (oItem.zenPureId) {
        oReturn.identifier.lumiraId = oItem.zenPureId;
    }

    oReturn.identifier.id = oItem.zenPureId ? oItem.zenPureId : oReturn.identifier.ui5Id;

    //get metadata..
    oReturn.metadata = {
        elementName: oItem.getMetadata().getElementName(),
        componentName: this._getOwnerComponent(oItem),
        componentId: "",
        componentTitle: "",
        componentDescription: "",
        componentDataSource: {},
        lumiraType: "",
        interactable: {}
    };


    //get interactable information..
    oReturn.metadata.interactable.visible = oItem["getVisible"] ? oItem["getVisible"]() : null;
    oReturn.metadata.interactable.enabled = oItem["getEnabled"] ? oItem["getEnabled"]() : null;
    oReturn.metadata.interactable.needsRerendering = oItem.bNeedsRerendering;
    oReturn.metadata.interactable.busy = false;
    var oCur = oItem;
    while (oCur) {
        if (oCur.getBusy && oCur.getBusy() === true) {
            oReturn.metadata.interactable.busy = true;
            break;
        }
        oCur = oCur.getParent();
    }

    oReturn.metadata.interactable.blocked = false;
    var oStaticArea = _wnd.sap.ui.getCore().getStaticAreaRef();
    var bControlIsInStaticArea = _wnd.$.contains(oStaticArea, oItem.getDomRef());
    var bOpenStaticBlockingLayer = _wnd.$("#sap-ui-blocklayer-popup").is(":visible");
    if (!bControlIsInStaticArea && bOpenStaticBlockingLayer) {
        oReturn.metadata.interactable.blocked = true;
    }

    oReturn.metadata.interactable.nonZeroSize = oItem.getDomRef() ? (_wnd.$(oItem.getDomRef()).outerWidth() > 0 && _wnd.$(oItem.getDomRef()).outerHeight() > 0) : false;
    oReturn.metadata.interactable.interactable = false;
    if (oReturn.metadata.interactable.busy === false &&
        oReturn.metadata.interactable.needsRerendering === false &&
        oReturn.metadata.interactable.blocked === false &&
        (oReturn.metadata.interactable.enabled === true || oReturn.metadata.interactable.enabled === null) &&
        oReturn.metadata.interactable.visible === true &&
        oReturn.metadata.interactable.nonZeroSize === true) {
        oReturn.metadata.interactable.interactable = true;
    }

    if (oItem.zenType) {
        oReturn.metadata.lumiraType = oItem.zenType;
    }

    //enhance component information..
    let oComponent = _wnd.sap.ui.getCore().getComponent(oReturn.metadata.componentName);
    if (oComponent) {
        let oManifest = oComponent.getManifest();
        if (oManifest && oManifest["sap.app"]) {
            let oApp = oManifest["sap.app"];
            oReturn.metadata.componentId = oApp.id;
            oReturn.metadata.componentTitle = oApp.title;
            oReturn.metadata.componentDescription = oApp.description;
        }
    }

    //view..
    let oView = this._getParentWithDom(oItem, 1, true);
    if (oView) {
        if (oView.getProperty("viewName")) {
            oReturn.viewProperty.viewName = oView.getProperty("viewName");
            oReturn.viewProperty.localViewName = oReturn.viewProperty.viewName.split(".").pop();
            if (oReturn.viewProperty.localViewName.length) {
                oReturn.viewProperty.localViewName = oReturn.viewProperty.localViewName.charAt(0).toUpperCase() + oReturn.viewProperty.localViewName.substring(1);
            }
        }
    }

    //bindings..
    for (let sBinding in oItem.mBindingInfos) {
        oReturn.binding[sBinding] = this._getBindingInformation(oItem, sBinding);
    }


    //very special for "sap.m.Label"..
    if (oReturn.metadata.elementName === "sap.m.Label" && !oReturn.binding.text) {
        if (oItem.getParent() && oItem.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
            let oParentBndg = oItem.getParent().getBinding("label");
            if (oParentBndg) {
                oReturn.binding["text"] = {
                    path: oParentBndg.sPath && oParentBndg.getPath(),
                    "static": oParentBndg.oModel && oParentBndg.getModel() instanceof _wnd.sap.ui.model.resource.ResourceModel
                };
            }
        }
    }

    //binding context
    let aModels = this._getContextModels(oItem);
    for (let sModel in aModels) {
        let oBndg = this._getBindingInformation(oItem, sModel);
        if (!oBndg) {
            continue;
        }
        oReturn.bindingContext[sModel] = oBndg;
    }


    //return all simple properties
    oReturn.property = this._getElementProperties(oItem);

    if (oItem.getMetadata()._sClassName === "sap.zen.crosstab.Crosstab") {
        oReturn.lumiraProperty["numberOfDimensionsOnRow"] = oItem.oHeaderInfo ? oItem.oHeaderInfo.getNumberOfDimensionsOnRowsAxis() : 0;
        oReturn.lumiraProperty["numberOfDimensionsOnCol"] = oItem.oHeaderInfo ? oItem.oHeaderInfo.getNumberOfDimensionsOnColsAxis() : 0;
        oReturn.lumiraProperty["numberOfRows"] = oItem.rowHeaderArea ? oItem.rowHeaderArea.oDataModel.getRowCnt() : 0;
        oReturn.lumiraProperty["numberOfCols"] = oItem.columnHeaderArea ? oItem.columnHeaderArea.oDataModel.getColCnt() : 0;
        oReturn.lumiraProperty["numberOfDataCells"] = oItem.getAggregation("dataCells").length;
    }
    if (oItem.getMetadata()._sClassName === "sap.designstudio.sdk.AdapterControl" &&
        oItem.zenType === "com_sap_ip_bi_VizFrame" && oItem.widget) {
        oReturn.lumiraProperty["chartTitle"] = oItem.widget.getTitleTextInternal();
        oReturn.lumiraProperty["chartType"] = oItem.widget.vizType();
        let aFeedItems = JSON.parse(oItem.widget.feedItems());
        oReturn.lumiraProperty["dimensionCount"] = 0;
        oReturn.lumiraProperty["measuresCount"] = 0;
        aFeedItems.filter(function (e) {
            return e.type == "Dimension";
        }).forEach(function (e) {
            oReturn.lumiraProperty["dimensionCount"] += e.values.length;
        });
        aFeedItems.filter(function (e) {
            return e.type == "Measure";
        }).forEach(function (e) {
            oReturn.lumiraProperty["measuresCount"] += e.values.length;
        });

        oReturn.lumiraProperty["numberOfDataCells"] = 0;
        oItem.widget._uvbVizFrame.vizData().data().data.forEach(function (e) {
            oReturn.lumiraProperty["numberOfDataCells"] += e.length;
        });
    }

    oReturn.context = this._getContexts(oItem);
    oReturn.styleClass = this._getStyleClassList(oItem);
    oReturn.cssValues = this._getCssMap(oItem);
    oReturn.customData = this._getCustomData(oItem);
    oReturn.positionInParent = this._getPositionInParent(oItem);

    var sModelName = this._getSmartContextModelName(oItem);
    if (oReturn.context[sModelName]) {
        oReturn.smartContext = oReturn.context[sModelName];
    }

    if (bCurElement) {
        oReturn.parents = this._getParents(oItem);
    }

    if (bCurElement) {
        oReturn.children = this._getChildren(oItem);
        oReturn.childrenCount = this._getChildrenCount(oReturn.children);
        oReturn.tableData = this._getTableData(oItem);

        oReturn.label = {
            textBinding: null,
            property: {}
        };
        oReturn.itemdata = {};

        var oLabel = this._getLabelForItem(oItem);
        if (oLabel) {
            oReturn.label.property = this._getElementProperties(oLabel);
            var oBndg = this._getBindingInformation(oLabel, "text");
            oReturn.label.textBinding = oBndg ? oBndg.path : null;
        }
        var oItemForItem = this._getItemForItem(oItem);
        if (oItemForItem) {
            oReturn.itemdata = this._getElementProperties(oItemForItem);
        }


        let aParentIds = [];
        aParentIds.push(oItem.getId());
        let oParent = oItem.getParent();
        while (oParent) {
            aParentIds.push(oParent.getId());
            var sControl = oParent.getMetadata()._sClassName;
            if (sControl === "sap.m.Table" || sControl === "sap.m.PlanningCalendar" || sControl === "sap.m.List" || sControl === "sap.ui.table.Table" ||
                sControl === "sap.ui.table.TreeTable" || sControl === "sap.zen.crosstab.Crosstab") {
                oReturn.tableSettings.insideATable = true;

                let aRows = oParent.getAggregation("rows") ? oParent.getAggregation("rows") : oParent.getAggregation("items");
                var aCol = oParent.getColumns ? oParent.getColumns() : [];

                if (aRows) {
                    for (let j = 0; j < aRows.length; j++) {
                        if (aParentIds.indexOf(aRows[j].getId()) !== -1) {
                            oReturn.tableSettings.tableRow = j;
                            oReturn.tableSettings.tableCol = 0;
                            var iVisibleColCounter = 0;
                            var iColCounter = 0;
                            let aCells = aRows[j].getCells ? aRows[j].getCells() : [];
                            for (let x = 0; x < aCells.length; x++) {
                                if (aCol && aCol.length && aCol.length > iColCounter) {
                                    if (aCol[iColCounter].getVisible() === false) {
                                        x = x - 1;
                                        iColCounter = iColCounter + 1;
                                        continue;
                                    }
                                }
                                if (aParentIds.indexOf(aCells[x].getId()) !== -1) {
                                    oReturn.tableSettings.tableCol = iVisibleColCounter;
                                    if (aCol && aCol.length && aCol.length > x) {
                                        oReturn.tableSettings.tableColId = this._getUi5Id(aCol[x]);
                                        if ( aCol[x].getLabel && aCol[x].getLabel() && aCol[x].getLabel().getText ) {
                                            oReturn.tableSettings.tableColDescr = aCol[x].getLabel().getText();
                                        } else {
                                            oReturn.tableSettings.tableColDescr = "";
                                        }
                                    }

                                    break;
                                }
                                iColCounter = iColCounter + 1;
                                iVisibleColCounter = iVisibleColCounter + 1;
                            }
                            break;
                        }
                    }
                }
                break;
            }
            oParent = oParent.getParent();
        }
    }

    //get model information..
    oReturn.model = {};

    //return length of all aggregations
    let aMetadata = oItem.getMetadata().getAllAggregations();
    for (let sAggregation in aMetadata) {
        if (aMetadata[sAggregation].multiple === false) {
            continue;
        }
        let aAggregation = oItem["get" + sAggregation.charAt(0).toUpperCase() + sAggregation.substr(1)]();
        let oAggregationInfo = {
            rows: [],
            filled: false,
            name: sAggregation,
            length: 0
        };
        if (typeof aAggregation !== "undefined" && aAggregation !== null) {
            oAggregationInfo.filled = true;
            oAggregationInfo.length = aAggregation.length;
        }

        //for every single line, get the binding context, and the row id, which can later on be analyzed again..
        for (let i = 0; i < aAggregation.length; i++) {
            oAggregationInfo.rows.push({
                ui5Id: this._getUi5Id(aAggregation[i]),
                ui5AbsoluteId: aAggregation[i].getId()
            });
        }

        oReturn.aggregation[oAggregationInfo.name] = oAggregationInfo;
    }

    oReturn.sac = this._getSACData(oItem);
    for (var i = 0; i < oReturn.sac.dataPoints.length; i++) {
        delete oReturn.sac.dataPoints[i].domTarget;
    }

    return oReturn;
};

ui5TestCafeSelectorDef.prototype._getSACTableData = function (oItem) {
    var oReturn = {
        chart: {},
        filters: [],
        relatedElements: {},
        dataPoints: [],
        tableData: []
    };

    oReturn.filters = this._readSACFilterData(oItem._getFiltersSync());

    var oDataRegion = oItem.getTableController().getActiveDataRegion();
    var aRows = oDataRegion.getCells();
    var oHeaderCells = {};
    var sCurrentTableId = oItem.getTableController().getView().getId();

    oReturn.relatedElements = {
        filterOpenLink: oDataRegion.data.key + "-" + sCurrentTableId + "-filterToken",
        filterDeleteLink: null,
        filterPopup: null
    };

    for (var iLine = 1; iLine < aRows.length; iLine++) {
        var aCols = aRows[iLine];
        var oDataLine = {};
        var bHasFactCell = false;
        var bInHeaderLine = false;

        for (var iCol = 0; iCol < aCols.length; iCol++) {
            var oCell = aCols[iCol];
            if (oCell.isHeaderCell()) {
                bInHeaderLine = true;
            }
            if ((oCell.isHeaderCell() || oCell.isMemberCell()) && bInHeaderLine === true) {
                oHeaderCells[iCol] = {
                    val: oCell.getFormattedValue(),
                    rowIndex: iLine,
                    colIndex: iCol
                };
                continue;
            }
            if (!oCell.isFactCell()) {
                continue;
            }
            var oMemberContext = oCell.getCellMemberContext();
            for (var sMember in oMemberContext) {
                oDataLine[sMember] = oMemberContext[sMember].id;
            }
            oDataLine[oHeaderCells[iCol]] = oCell.getVal();
            oDataLine._row = iLine;
            bHasFactCell = true;

            //add to line to data-cells..
            var oCellDomRef = $('#' + oItem.getId() + ' td').filter('*[data-row="' + iLine + '"]').filter('*[data-col="' + iCol + '"]');

            oReturn.dataPoints.push({
                xValue: iCol,
                yValue: iLine,
                measures: oHeaderCells[iCol],
                dimensions: oDataLine,
                domTarget: oCellDomRef.length ? oCellDomRef[0] : null
            });
        }

        if (bHasFactCell) {
            oReturn.tableData.push(oDataLine);
        }
    }

    return oReturn;
};

ui5TestCafeSelectorDef.prototype._readSACFilterData = function (aFilters) {
    var aFiltersRet = [];
    var aFiltersRelevant = aFilters.filter(function (e) {
        if (e.entityId.find(function (f) { return f.id === "Version" })) {
            return false;
        }
        return true;
    });
    for (var i = 0; i < aFiltersRelevant.length; i++) {
        var sAttr = aFiltersRelevant[i].entityId.map(function (f) { return f.id; }).join(",");
        var aValues = aFiltersRelevant[i].originalValues.map(function (e) {
            return { displayName: e.displayName, operator: e.operator }
        });
        aFiltersRet.push({
            attribute: sAttr,
            values: aValues,
            exclude: typeof aFiltersRelevant[i].filters.find(function (e) { return e.exclude === true; }) !== "undefined"
        });
    }
    return aFiltersRet;
};

ui5TestCafeSelectorDef.prototype._getSACChartData = function (oItem) {
    var oReturn = {
        chart: {},
        filters: [],
        relatedElements: {},
        dataPoints: [],
        tableData: []
    };
    var oVizDefinition = oItem.getWidgetDefinition().definition.vizContent.vizDefinition;

    oReturn.chart = {
        title: oVizDefinition.chart.title,
        subTitle: oVizDefinition.chart.subTitle,
        type: oVizDefinition.chart.type,
        dataLabelVisible: oVizDefinition.chart.properties.plotArea.dataLabel.visible
    };

    oReturn.filters = this._readSACFilterData(oVizDefinition.filters);

    //get actual data..
    var aData = oItem.oViz._infoChart.getAllPointsData();
    oReturn.dataPoints = aData.map(function (e) {
        //get all members for this dataPoint..
        var oDimensions = {};
        for (var j = 0; j < e.info.dimensions.length; j++) {
            oDimensions[e.info.dimensions[j].dimensionDisplayName] = e.info.dimensions[j].members.join(",");
        }
        var oMeasures = [];
        for (var j = 0; j < e.info.measures.length; j++) {
            oMeasures.push(e.info.measures[j].measureDisplayName);
        }
        return {
            yValue: e.target.point.y,
            xValue: e.target.point.x,
            dimensions: oDimensions,
            measures: oMeasures,
            domTarget: e.target
        };
    });

    //get related settings..
    oReturn.relatedElements = {
        filterOpenLink: oItem.oViz.getFilterToken() ? oItem.oViz.getFilterToken()._captionLink.getId() : null,
        filterDeleteLink: oItem.oViz.getFilterToken() ? oItem.oViz.getFilterToken()._oDeleteToken.getId() : null,
        filterPopup: oItem.oViz.getFilterToken() ? oItem.oViz.getFilterToken()._toolPopup.getId() : null,
        titleControl: oItem.oViz.getTitleControl() ? oItem.oViz.getTitleControl().getId() : null
    };

    return oReturn;
}

ui5TestCafeSelectorDef.prototype._isSACWidgetBusy = function (oItem) {
    var sCls = oItem.getMetadata()._sClassName;
    if (sCls === "sap.fpa.ui.story.entity.infochartviz.InfochartVizWidget") {
        return !oItem.oViz || oItem.oViz.isLoadingAnimationShown() || !oItem.oViz._infoChart;
    } else if (sCls === "sap.fpa.ui.story.entity.dynamictable.DynamicTableWidget") {
        return !oItem.getTableController() || !oItem.getTableController().getScrollableTable() || oItem.getTableController().getScrollableTable().getUpdateInProgress();
    } else if (sCls === "sap.fpa.ui.story.entity.text.TextWidget") {

    }
    return false;
}

ui5TestCafeSelectorDef.prototype._getSACData = function (oItem) {
    var oRet = {
        chart: {},
        filters: [],
        relatedElements: {},
        dataPoints: [],
        tableData: []
    };

    //depending on the widget type, we are "simply" getting
    var sCls = oItem.getMetadata()._sClassName;
    if (sCls === "sap.fpa.ui.story.entity.infochartviz.InfochartVizWidget") {
        oRet = this._getSACChartData(oItem);
    } else if (sCls === "sap.fpa.ui.story.entity.dynamictable.DynamicTableWidget") {
        oRet = this._getSACTableData(oItem);
    } else if (sCls === "sap.fpa.ui.story.entity.text.TextWidget") {

    }

    if (oItem.getWidgetId) {
        oRet.widgetId = oItem.getWidgetId();
    }
    return oRet;
};

//missing: get elements with same parent, to get elements "right next", "left" and on same level
ui5TestCafeSelectorDef.prototype._getContexts = function (oItem) {
    let oReturn = {};

    if (!oItem) {
        return oReturn;
    }

    let oModel = oItem.oModels;
    for (let s in oItem.oPropagatedProperties.oModels) {
        if (!oModel[s]) {
            oModel[s] = oItem.oPropagatedProperties.oModels[s];
        }
    }

    //second, get all binding contexts
    for (let sModel in oModel) {
        let oBindingContext = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
        if (!oBindingContext) {
            continue;
        }

        oReturn[sModel] = oBindingContext.getObject();
    }
    return oReturn;
};


ui5TestCafeSelectorDef.prototype._getFieldGroupIds = function (oItem) {
    if (!oItem || !oItem.getFieldGroupIds || !oItem.getFieldGroupIds()) {
        return [];
    }
    return oItem.getFieldGroupIds();
};


ui5TestCafeSelectorDef.prototype._getChildrenRec = function (oItemOrig, aChildren, aReturn) {
    if (!aChildren || !aChildren.length) {
        return;
    }
    for (var i = 0; i < aChildren.length; i++) {
        var oCtrl = _wnd.$(aChildren[i]).control();
        if (!oCtrl || !oCtrl.length || oCtrl[0].getId() === oItemOrig.getId()) {
            this._getChildrenRec(oItemOrig, aChildren[i].children, aReturn);
            continue;
        }
        if (!aReturn.find(function (e) {
            return e.id === oCtrl[0].getId();
        })) {
            aReturn.push({
                id: oCtrl[0].getId(),
                className: oCtrl[0].getMetadata()._sClassName,
                property: this._getElementProperties(oCtrl[0])
            });
        }
    }
};

ui5TestCafeSelectorDef.prototype._getChildren = function (oItem) {
    if (!oItem || !oItem.getDomRef || !oItem.getDomRef()) {
        return [];
    }

    var aChildren = document.getElementById(oItem.getDomRef().id).children;

    var aItems = [];
    this._getChildrenRec(oItem, aChildren, aItems);
    return aItems;
};

ui5TestCafeSelectorDef.prototype._getChildrenCount = function (aChildrenList) {
    var oRet = {};
    for (var i = 0; i < aChildrenList.length; i++) {
        if (!oRet["_all"]) {
            oRet["_all"] = 0;
        }
        if (!oRet[aChildrenList[i].className]) {
            oRet[aChildrenList[i].className] = 0;
        }
        oRet[aChildrenList[i].className] += 1;
        oRet["_all"] += 1;
    }
    return oRet;
}

ui5TestCafeSelectorDef.prototype._getPositionInParent = function (oItem) {
    if (!oItem || !oItem.getDomRef || !oItem.getDomRef()) {
        return [];
    }

    var aParentChildren = this._getChildren(oItem.getParent());
    var iIndex = aParentChildren.findIndex(function (e) {
        return e.id === oItem.getId()
    });

    return iIndex;
};

ui5TestCafeSelectorDef.prototype._getCssMap = function (oItem) {
    if (!oItem || !oItem.getDomRef || !oItem.getDomRef()) {
        return {};
    }
    var aRet = {};
    var css = _wnd.getComputedStyle(oItem.getDomRef());
    for (var i = 0; i < css.length; i++) {
        aRet[css[i]] = css.getPropertyValue(css[i]);
    }
    return aRet;
};

ui5TestCafeSelectorDef.prototype._getStyleClassList = function (oItem) {
    if (!oItem || !oItem.getDomRef() || !oItem.getDomRef().className) {
        return [];
    }
    return oItem.getDomRef().className.split(' ');
};

ui5TestCafeSelectorDef.prototype._getCustomData = function (oItem) {
    if (!oItem || !oItem.getCustomData || !oItem.getCustomData()) {
        return [];
    }
    var oRet = {};
    var oCust = oItem.getCustomData();
    for (var sName in oCust) {
        var oCustItem = oCust[sName];
        if (typeof oCustItem === "string" || typeof oCustItem === "bigint" || typeof oCustItem === "boolean" || typeof oCustItem === "number") {
            oRet[sName] = oCustItem;
        } else {
            oRet[sName] = "object";
        }
    }
    return oRet;
};

ui5TestCafeSelectorDef.prototype.getElementInformation = function (oItem, oDomNode, fnCustomData) {
    let oReturn = this._getEmptyReturn(true);

    if (!oItem) {
        return oReturn;
    }

    //local methods on purpose (even if duplicated) (see above)
    oReturn = this._getElementInformation(oItem, oDomNode, true);

    if (typeof fnCustomData !== "undefined") {
        try {
            var fnAddData = new Function('return ' + fnCustomData)();
            oReturn.enhancedData = fnAddData(oItem, oReturn);
        } catch (err) {
        }
    }

    return oReturn;
};

ui5TestCafeSelectorDef.prototype.getDomNodeInformation = function (oDomNode, fnCallback) {
    let aItem = _wnd.$(oDomNode).control();
    if (!aItem.length) {
        return this._getEmptyReturn(true);
    }
    let oItem = aItem[0];
    return this.getElementInformation(oItem, oDomNode, fnCallback);
};


ui5TestCafeSelectorDef.prototype._getTableSelectDialog = function (aOutput) {
    if (this._oPopover) {
        this._oPopover.destroy();
        this._oPopover = null;
    }

    var aCols = [
        new sap.m.Column({ width: "12em", hAlign: "Center", header: new sap.m.Label({ text: "Group" }) }),
        new sap.m.Column({ width: "16em", hAlign: "Center", header: new sap.m.Label({ text: "Name" }) }),
        new sap.m.Column({ hAlign: "Center", header: new sap.m.Label({ text: "Value" }) }),
        new sap.m.Column({ hAlign: "Center", header: new sap.m.Label({ text: "Code" }) })];


    var aCells = [new sap.m.Text({ text: "{group}" }), new sap.m.Text({ text: "{name}" }), new sap.m.Text({ text: "{value}" }), new sap.m.Text({ text: "{code}" })];
    if (this._recordModeIdentifierBase) {
        aCols.push(new sap.m.Column({ hAlign: "Center", header: new sap.m.Label({ text: "Debug-Selector Value" }) }));
        aCells.push(new sap.m.ObjectStatus({ text: "{selectorValue}", state: "{selectorValueStatus}" }))
    }

    this._oSearchField = new sap.m.SearchField({
        width: "40%",
        liveChange: function (e) {
            this._updateFilterForPopup(e.getParameter("newValue"));
        }.bind(this),
        search: function (e) {
            this._updateFilterForPopup();
        }.bind(this)
    })
    var aButtons = [this._oSearchField, new sap.m.ToolbarSpacer()];
    this._oToggleButtonForParent = new sap.m.ToggleButton({
        text: "With Parents",
        pressed: true,
        press: function (e) {
            this._updateFilterForPopup();
        }.bind(this)
    });
    aButtons.push(this._oToggleButtonForParent);

    this._oToggleButtonForSelector = new sap.m.ToggleButton({
        text: "With Selector Data",
        pressed: true,
        press: function (e) {
            this._updateFilterForPopup();
        }.bind(this)
    });

    if (this._recordModeIdentifierBase) {
        aButtons.push(this._oToggleButtonForSelector);
    }
    aButtons.push(new sap.m.Button({
        text: "Goto Parent",
        icon: "sap-icon://arrow-top", press: function () {
            var oItem = this._oCurrentItemInRecordMode;
            var oParent = this._getParentWithDom(oItem, 1, false);
            if (!oParent) {
                return;
            }
            this.onClickInRecordMode(oParent.getDomRef());
        }.bind(this)
    }));

    var oToolbar = new sap.m.OverflowToolbar({
        content: aButtons
    });

    var oTable = new sap.m.Table("tableInfo", { mode: "MultiSelect", columns: aCols, headerToolbar: oToolbar });
    var oItemTemplate = new sap.m.ColumnListItem({ type: "Active", cells: aCells });
    if (oTable.setSticky) {
        oTable.setSticky([sap.m.Sticky.ColumnHeaders, sap.m.Sticky.HeaderToolbar]);
    }
    var oScrollContainer = new sap.m.ScrollContainer({
        width: "100%", horizontal: false, vertical: true, height: "570px", content: [oTable]
    });
    var oInput = new sap.m.Input("inpText", { editable: false });
    var oFoundText = new sap.m.Text("inpResultText", { wrapping: true, maxLines: 3 });
    this._oPopover = new sap.m.Dialog("detailsDialogPopover", {
        title: "Details of item",
        contentWidth: "70%",
        contentHeight: "80%",
        beginButton: new sap.m.Button({ text: "Close and Continue Test", press: function () { this._oPopover.close(); this._fnRecordModeSelectResolve(); }.bind(this) }),
        endButton: new sap.m.Button({ text: "Reselect", press: function () { this._oPopover.close(); }.bind(this) }),
        content: [oScrollContainer, oInput, oFoundText]
    });
    this._oPopover.addStyleClass("sapUiSizeCompact");
    this._oPopoverModel = new sap.ui.model.json.JSONModel({ items: aOutput, currentCode: "" });
    this._oPopoverModel.setSizeLimit(10000);
    this._oPopover.setModel(this._oPopoverModel);

    oInput.bindValue("/currentCode");
    oFoundText.bindText("/currentFoundItems");
    oTable.bindAggregation("items", "/items", oItemTemplate);

    this._oPopover.attachAfterClose(function (e) {
        this._bSelectDialogIsOpen = false;
    }.bind(this));

    oTable.attachSelectionChange(function () {
        this._updateCodeAndFoundItems();
    }.bind(this));

    this._oTable = oTable;
    this._updateFilterForPopup();

    return this._oPopover;
};

ui5TestCafeSelectorDef.prototype._updateFilterForPopup = function (sSearchFieldValue) {
    var aFilter = [];
    if (!this._oToggleButtonForParent.getPressed()) {
        aFilter.push(new sap.ui.model.Filter("parent", "NE", true));
    }
    if (this._oToggleButtonForSelector.getPressed() && this._recordModeIdentifierBase) {
        aFilter.push(new sap.ui.model.Filter("selectorAvailable", "EQ", true));
    }
    if (sSearchFieldValue || this._oSearchField.getValue().length > 0) {
        var sVal = sSearchFieldValue ? sSearchFieldValue : this._oSearchField.getValue();
        aFilter.push(new sap.ui.model.Filter({
            filters: [new sap.ui.model.Filter("group", "Contains", sVal), new sap.ui.model.Filter("name", "Contains", sVal), new sap.ui.model.Filter("valueAsStr", "Contains", sVal), new sap.ui.model.Filter("code", "Contains", sVal)],
            and: false
        }));
    }

    this._oTable.getBinding("items").filter(aFilter);
};

ui5TestCafeSelectorDef.prototype._updateCodeAndFoundItems = function () {
    var aElems = this._oTable.getSelectedContexts();
    var sCode = "ui5()";
    var oId = {};
    for (var i = 0; i < aElems.length; i++) {
        let oObj = aElems[i].getObject();
        sCode += "." + oObj.code;

        //generate selector value based on the value
        var aId = oObj.selector.split(".");
        var oCur = oId;
        for (let j = 0; j < aId.length; j++) {
            if (j === aId.length - 1) {
                oCur[aId[j]] = oObj.value;
                continue;
            }
            if (!oCur[aId[j]]) {
                oCur[aId[j]] = {};
            }
            oCur = oCur[aId[j]];
        }
    }
    sCode += ";";
    this._oPopoverModel.setProperty("/currentCode", sCode);

    oId.selectAll = true;
    var aItems = this.findBy(oId);
    var aItemsCtrl = [];
    for (let j = 0; j < aItems.length; j++) {
        aItemsCtrl.push(this.getControlFromDom(aItems[j]).getId());
    }
    var sFoundItems = "Found Items (" + aItems.length + "):" + aItemsCtrl.join(",");
    this._oPopoverModel.setProperty("/currentFoundItems", sFoundItems);
};

ui5TestCafeSelectorDef.prototype._getValueFromSelector = function (sSel) {
    if (!this._recordModeIdentifierBase) {
        return null;
    }
    var aSplit = sSel.split(".");
    var oCurrent = this._recordModeIdentifierBase;
    for (var i = 0; i < aSplit.length; i++) {
        if (!oCurrent[aSplit[i]]) {
            return null;
        }
        oCurrent = oCurrent[aSplit[i]];
    }
    return oCurrent;
};

ui5TestCafeSelectorDef.prototype._formatValueForCode = function (val) {
    if (typeof val === "string") {
        return "'" + val + "'";
    }
    if (typeof val !== "undefined" && val.toString) {
        return val.toString();
    }
    return val;
};

ui5TestCafeSelectorDef.prototype.onClickInRecordMode = function (oDomNode) {
    var oItem = this.getControlFromDom(oDomNode);
    var oData = this.getElementInformation(oItem, oDomNode);

    this._oCurrentItemInRecordMode = oItem;

    //match to possible selector attributes of this element..
    bInTable = true;

    //also add the code as last column, on how to get that..
    //(1) identifier..
    var aOutput = [];

    aOutput.push({ parent: false, group: "Id", name: "Identifier", value: oData.identifier.ui5Id, code: "id(" + this._formatValueForCode(oData.identifier.ui5Id) + ")", selector: "identifier.id" });

    //loop over parents to add those identifiers..
    for (let i = 0; i < oData.parents.length; i++) {
        aOutput.push({ parent: false, group: "Id", name: "Parent Identifier", value: oData.parents[i].identifier.ui5Id, selector: "parentAnyLevel.identifier.id", code: "parentId(" + this._formatValueForCode(oData.parents[i].identifier.ui5Id) + ")" });
    }


    aOutput.push({ parent: false, group: "Metadata", name: "Class-Name", value: oData.metadata.elementName, code: "element(" + this._formatValueForCode(oData.metadata.elementName) + ")", selector: "metadata.elementName" });
    aOutput.push({ parent: false, group: "Metadata", name: "Component", value: oData.metadata.componentName, code: "component(" + this._formatValueForCode(oData.metadata.componentName) + ")", selector: "metadata.componentName" });
    aOutput.push({ parent: false, group: "Metadata", name: "Interactable", value: oData.metadata.interactable.interactable, code: "interactable()", selector: "metadata.interactable.interactable" });
    aOutput.push({ parent: false, group: "Metadata", name: "Position in Parent", value: oData.positionInParent, code: "positionInParent(" + this._formatValueForCode(oData.positionInParent) + ")", selector: "positionInParent" });

    if (oData.metadata.lumiraType) {
        aOutput.push({ parent: false, group: "Metadata", name: "Lumira-Type", value: oData.metadata.componentName, code: "lumiraType(" + this._formatValueForCode(oData.metadata.lumiraType) + ")", selector: "metadata.lumiraType" });
    }
    for (let i = 0; i < oData.parents.length; i++) {
        aOutput.push({ parent: true, group: "Metadata", name: "Parent Class-Name", value: oData.parents[i].metadata.elementName, selector: "parentAnyLevel.metadata.elementName", code: "parentElementName(" + this._formatValueForCode(oData.parents[i].metadata.elementName) + ")" });
    }

    for (let s in oData.property) {
        aOutput.push({ parent: false, group: "Property", name: s, value: oData.property[s], code: "property('" + s + "'," + this._formatValueForCode(oData.property[s]) + ")", selector: "metadata.property." + s });
    }
    for (let i = 0; i < oData.parents.length; i++) {
        for (let s in oData.parents[i].property) {
            aOutput.push({
                parent: true, group: "Property", name: "Parent (" + (i + 1) + "): " + s, value: oData.parents[i].property[s], selector: "parentAnyLevel.property." + s, code: "parentPropery(" + s + "'," + this._formatValueForCode(oData.parents[i].property[s]) + ")"
            });
        }
    }

    aOutput.push({ parent: false, group: "Table-Settings", name: "Inside a Table", value: oData.tableSettings.insideATable, code: "insideATable()", selector: "tableSettings.insideATable" });
    aOutput.push({ parent: false, group: "Table-Settings", name: "Table-Row", value: oData.tableSettings.tableRow, code: "row(" + this._formatValueForCode(oData.tableSettings.tableRow) + ")", selector: "tableSettings.tableRow" });
    aOutput.push({ parent: false, group: "Table-Settings", name: "Table-Column", value: oData.tableSettings.tableCol, code: "column(" + this._formatValueForCode(oData.tableSettings.tableCol) + ")", selector: "tableSettings.tableCol" });

    for (let s in oData.smartContext) {
        aOutput.push({ parent: false, group: "Context", name: s, value: oData.smartContext[s], code: "context('" + s + "'," + this._formatValueForCode(oData.smartContext[s]) + ")", selector: "smartContext." + s });
    }

    for (let s in oData.binding) {
        aOutput.push({ parent: false, group: "Binding", name: s, value: oData.binding[s].path, code: "bindingPath('" + s + "'," + this._formatValueForCode(oData.binding[s].path) + ")", selector: "binding." + s });
    }

    for (let s in oData.lumiraProperty) {
        aOutput.push({ parent: false, group: "Lumira-Property", name: s, value: oData.lumiraProperty[s], code: "lumiraProperty('" + s + "'," + this._formatValueForCode(oData.lumiraProperty[s]) + ")", selector: "lumiraProperty." + s });
    }

    for (let s in oData.customData) {
        aOutput.push({ parent: false, group: "Custom-Data", name: s, value: oData.customData[s], code: "customData('" + s + "'," + this._formatValueForCode(oData.customData[s]) + ")", selector: "customData." + s });
    }

    for (let s in oData.childrenCount) {
        aOutput.push({ parent: false, group: "Children-Count", name: s === "_all" ? "All" : s, value: oData.childrenCount[s], code: "childrenCount('" + s + "'," + this._formatValueForCode(oData.childrenCount[s]) + (s === "_all" ? "" : (",'" + s + "'")) + ")", selector: "childrenCount." + s });
    }

    if (oData.label && oData.label.textBinding) {
        aOutput.push({ parent: false, group: "Label", name: "Text-Binding", value: oData.label.textBinding, code: "labelTextBinding(" + this._formatValueForCode(oData.label.textBinding) + ")", selector: "label.textBinding" });
    }
    for (let s in oData.label.property) {
        aOutput.push({ parent: false, group: "Label", name: s, value: oData.label.property[s], code: "labelProperty('" + s + "'," + this._formatValueForCode(oData.label.property[s]) + ")", selector: "label.property." + s });
    }
    for (let s in oData.itemdata) {
        aOutput.push({ parent: false, group: "Itemdata", name: s, value: oData.itemdata[s], code: "itemdata('" + s + "'," + this._formatValueForCode(oData.itemdata[s]) + ")", selector: "itemdata." + s });
    }

    if (oData.sac) {
        aOutput.push({ parent: false, group: "SAC", name: "Widget-Id", value: oData.sac.widgetId, code: "sac().widgetId(" + this._formatValueForCode(oData.sac.widgetId) + ")", selector: "sac.widgetId" });
    }

    for (var i = 0; i < aOutput.length; i++) {
        var sVal = this._getValueFromSelector(aOutput[i].selector);
        aOutput[i].valueAsStr = (typeof aOutput[i].value === "undefined" || !aOutput[i].value.toString) ? "undefined" : aOutput[i].value.toString();
        aOutput[i].selectorValue = sVal ? sVal : "";
        aOutput[i].selectorAvailable = sVal !== null;
        aOutput[i].selectorValueStatus = (aOutput[i].selectorValue === aOutput[i].value) ? "Success" : "Error";
    }

    aOutput = aOutput.filter(function (e) {
        return !(e.selectorAvailable === false && typeof e.value === "undefined");
    });
    var oSelDialog = this._getTableSelectDialog(aOutput);
    oSelDialog.open();

    var aItems = this._oTable.getItems();
    for (var i = 0; i < aOutput.length; i++) {
        if ((aOutput[i].selectorValue.indexOf("parentAnyLevel") === -1 && aOutput[i].selectorAvailable === true) ||
            (aOutput[i].selectorValue.indexOf("parentAnyLevel") !== -1 && aOutput[i].selectorValueStatus === "Success" && aOutput[i].selectorAvailable === true)) {
            this._oTable.setSelectedItem(aItems[i]);
        }
    }
    this._updateCodeAndFoundItems();

    //@ts-ignore
    this._bSelectDialogIsOpen = true;
};

ui5TestCafeSelectorDef.prototype._getHammerheadShadowUiByClass = function (sClassName) {
    //status-hammerhead-shadow-ui
    //locked-hammerhead-shadow-ui
    //@ts-ignore
    const hammerhead = window["%hammerhead%"];
    const registerServiceWorker = hammerhead.nativeMethods.getElementsByClassName;
    return registerServiceWorker.call(document, sClassName)[0];
}

ui5TestCafeSelectorDef.prototype.startRecordMode = function (id) {
    const oDOMNode = this._getHammerheadShadowUiByClass("locked-hammerhead-shadow-ui");
    var event = new MouseEvent('mousedown', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    oDOMNode.dispatchEvent(event);

    const oDOMForArrow = this._getHammerheadShadowUiByClass("cursor-hammerhead-shadow-ui");
    $(oDOMForArrow).css("display", "none");

    this._recordModeIdentifierBase = id ? id : null;
    this._recordModeAllowInteraction = false;

    //@ts-ignore
    $("<style type='text/css'>.UI5TR_ElementHover,\
            .UI5TR_ElementHover * {\
                background: rgba(193, 137, 156,0.5)!important;\
            }\
            \
                .UI5TR_ControlFound,\
            .UI5TR_ControlFound * {\
                background: rgba(113, 148, 175,0.5)!important;\
            }\
            \
            #UI5TR_BusyDialog - Dialog.sapUiLocalBusyIndicatorAnimation > div:: before {\
            \
            background: #a01441; \
        } \
        </style > ").appendTo("head");


    var that = this;
    this._bSelectDialogIsOpen = false;

    var fnMouseOverBefore = document.onmouseover;
    document.onmouseover = function (e) {
        if (that._bSelectDialogIsOpen === true || that._recordModeAllowInteraction === true) {
            return;
        }
        //@ts-ignore
        var e = e || window.event,
            el = e.target || e.srcElement;
        //@ts-ignore
        el.classList.add("UI5TR_ElementHover");
    };

    var fnMouseOutBefore = document.onmouseout;
    document.onmouseout = function (e) {
        //@ts-ignore
        var e = e || _wnd.window.event,
            el = e.target || e.srcElement;
        //@ts-ignore
        el.classList.remove("UI5TR_ElementHover");
    }

    var fnClickEventListener = function (event) {
        if (that._bSelectDialogIsOpen === true || that._recordModeAllowInteraction === true) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        event = event || window.event;
        var el = event.target || event.srcElement;
        window.ui5TestCafeSelector.onClickInRecordMode(el);
    };

    document.addEventListener('click', fnClickEventListener, true);

    if (this._recordModeIdentifierBase) {
        debugger;
        var aItems = this.findBy(this._recordModeIdentifierBase);
        if (aItems && aItems.length > 0) {
            this.onClickInRecordMode(aItems[0]);
        }
    }

    var oCurrentlyPressed = {};
    var fnOnKeyDown = function (e) {
        oCurrentlyPressed[e.key] = true;

        if (that._bSelectDialogIsOpen) {
            return;
        }

        if (oCurrentlyPressed["Control"] && oCurrentlyPressed["Alt"] && (oCurrentlyPressed["C"] || oCurrentlyPressed["c"])) {
            that._recordModeAllowInteraction = that._recordModeAllowInteraction === false;
            if (that._recordModeAllowInteraction) {
                sap.m.MessageToast.show("Interaction Mode activated");
            } else {
                sap.m.MessageToast.show("Record Mode activated");
            }
        }
    };
    var fnOnKeyUp = function (e) {
        if (oCurrentlyPressed[e.key]) {
            oCurrentlyPressed[e.key] = false;
        }
    };
    sap.m.MessageToast.show("Press CTRL+ALT+C to switch between record and interaction mode...");

    document.addEventListener("keydown", fnOnKeyDown);
    document.addEventListener("keyup", fnOnKeyUp);

    return new Promise(function (resolve) {
        this._fnRecordModeSelectResolve = function () {
            $(oDOMForArrow).css("display", "");
            this._oCurrentItemInRecordMode = null;
            document.removeEventListener("click", fnClickEventListener, true);
            document.removeEventListener("keydown", fnOnKeyDown);
            document.removeEventListener("keyup", fnOnKeyUp);
            document.onmouseover = fnMouseOverBefore;
            document.onmouseout = fnMouseOutBefore;
            resolve();
        };
    }.bind(this));
}

window.ui5TestCafeSelector = new ui5TestCafeSelectorDef();