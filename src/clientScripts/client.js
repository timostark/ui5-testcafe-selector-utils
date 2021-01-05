
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
    return this;
}

ui5TestCafeSelectorDef.prototype.findBy = function (id) {
    if (JSON.stringify(id) == JSON.stringify({})) {
        return [];
    }

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
    let sSelectorStringForJQuery = "";
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
        bFound = true;

        this._ui5CurrentSelectorItem = oItem.getId();
        this._ui5CurrentSelectorTarget = "";

        bFound = this._checkItem(oItem, id);
        if (bFound === false) {
            continue;
        }
        if (id.label) {
            this._ui5CurrentSelectorTarget = "label";
            bFound = bFound && this._checkItem(this._getLabelForItem(oItem), id.label);
            if (bFound === false) {
                continue;
            }
        }

        //check parent levels..
        if (id.parent) {
            this._ui5CurrentSelectorTarget = "parent-1";
            bFound = bFound && this._checkItem(this._getParentWithDom(oItem, 1), id.parent);
            if (bFound === false) {
                continue;
            }
        }
        if (id.parentL2) {
            this._ui5CurrentSelectorTarget = "parent-2";
            bFound = bFound && this._checkItem(this._getParentWithDom(oItem, 2), id.parentL2);
            if (bFound === false) {
                continue;
            }
        }
        if (id.parentL3) {
            this._ui5CurrentSelectorTarget = "parent-3";
            bFound = bFound && this._checkItem(this._getParentWithDom(oItem, 3), id.parentL3);
            if (bFound === false) {
                continue;
            }
        }
        if (id.parentL4) {
            this._ui5CurrentSelectorTarget = "parent-4";
            bFound = bFound && this._checkItem(this._getParentWithDom(oItem, 4), id.parentL4);
            if (bFound === false) {
                continue;
            }
        }
        if (id.itemdata) {
            this._ui5CurrentSelectorTarget = "itemdata";
            bFound = bFound && this._checkItem(this._getItemForItem(oItem), id.itemdata);
            if (bFound === false) {
                continue;
            }
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

ui5TestCafeSelectorDef.prototype._checkItem = function (oItem, id) {
    let bFound = true;
    if (!oItem) { //e.g. parent level is not existing at all..
        return false;
    }
    if (!oItem.getDomRef()) {
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
            var bNonZeroWidth = _wnd.$(oItem.getDomRef()).width() > 0 && _wnd.$(oItem.getDomRef()).height() > 0.
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

    if (id.hasChildWith) {
        var aChildren = this._getChildren(oItem);
        if (id.hasChildWithId.id) {
            if (!aChildren.find(function (e) {
                return e.id.indexOf(id.hasChildWith.id) !== -1;
            })) {
                this._logWrongValue("id.hasChildWith.id", id.hasChildWith.id, "-");
                return false;
            }
            this._logCorrectValue("id.hasChildWith.id", id.hasChildWith.id, id.hasChildWith.id);
        }
        if (id.hasChildWithId.className) {
            if (!aChildren.find(function (e) {
                return e.className.indexOf(id.hasChildWith.className) !== -1;
            })) {
                this._logWrongValue("id.hasChildWith.className", id.hasChildWith.className, "-");
                return false;
            }
            this._logCorrectValue("id.hasChildWith.className", id.hasChildWith.className, id.hasChildWith.className);
        }
    }

    if (id.parentAnyLevel) {
        let oParent = oItem.getParent();
        this._ui5CurrentSelectorTarget = "parentAnyLevel";

        //extremly simplistic here..
        while (oParent) {
            if (!this._checkItem(oParent, id.parentAnyLevel)) {
                return false;
            }
            oParent = oParent.getParent();
        }
        this._ui5CurrentSelectorTarget = "";
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
        var bAnyBinding = false;
        var oCurParent = oItem;
        var sModelName = "";

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
                    return false;
                }
                for (let sModelNameLoc in bndgCtx) {
                    sModelName = sModelNameLoc ? sModelNameLoc : "undefined";
                    break;
                }
            }
        }
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
            if (!oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]) {
                //property is not even available in that item.. just skip it..
                bFound = false;
                break;
            }

            let sPropertyValueItem = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
            let sPropertyValueSearch = id.property[sProperty];
            try {
                var sPropertyType = oItem.getProperty(sProperty).getType().getName();
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

            if (sPropertyValueItem !== sPropertyValueSearch) {
                this._logWrongValue("property." + sProperty, sPropertyValueItem, sPropertyValueSearch);
                bFound = false;
                break;
            }
            this._logCorrectValue("property." + sProperty, sPropertyValueItem, sPropertyValueSearch);
        }
        if (bFound === false) {
            return false;
        }
    }

    if (typeof id.sac !== "undefined") {
        let oRet = this._getSACData(oItem);

        if (typeof id.sac.widgetId !== "undefined") {
            if (id.sac.widgetId !== oRet.widgetId) {
                this._logWrongValue("id.sac.widgetid", id.sac.widgetId, oRet.widgetId);
                return false;
            }
            this._logCorrectValue("id.sac.widgetid", id.sac.widgetId, oRet.widgetId);
        }
    }

    if (id.atLeastOneChild) {
        let aChildren = this._getChildren(oItem);
        this._ui5CurrentSelectorTarget = "atLeastOneChild";

        for (var i = 0; i < aChildren.length; i++) {
            var oElem = _wnd.sap.ui.getCore().byId(aChildren[i].id);
            if (oElem && this._checkItem(oElem, id.atLeastOneChild)) {
                return false;
            }
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
    if (typeof _wnd.sap === "undefined" || typeof _wnd.sap.ui === "undefined" || typeof _wnd.sap.ui.getCore === "undefined" || !_wnd.sap.ui.getCore() || !_wnd.sap.ui.getCore().isInitialized()) {
        return [];
    }

    this._ui5LastSelectorDef = id;
    this._allElements = this._getAllElements();

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
        association: {},
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
    oReturn.parent = oReturn;
    oReturn.parentL2 = oReturn;
    oReturn.parentL3 = oReturn;
    oReturn.parentL4 = oReturn;
    oReturn.itemdata = oReturn;

    return oReturn;
}

ui5TestCafeSelectorDef.prototype._getElementInformation = function (oItem, oDomNode, bFull, bCurElement) {
    let oReturn = this._getEmptyReturn(false);
    bFull = typeof bFull === "undefined" ? true : bFull;

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

    oReturn.metadata.interactable.nonZeroSize = oItem.getDomRef() ? (_wnd.$(oItem.getDomRef()).width() > 0 && _wnd.$(oItem.getDomRef()).height() > 0) : false;
    oReturn.metadata.interactable.interactable = false;
    if (oReturn.metadata.interactable.busy === false &&
        oReturn.metadata.interactable.needsRerendering === false &&
        oReturn.metadata.interactable.blocked === false &&
        oReturn.metadata.interactable.enabled === true &&
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
            if (oApp.dataSources) {
                for (let sDs in oApp.dataSources) {
                    let oDS = oApp.dataSources[sDs];
                    if (oDS.type !== "OData") {
                        continue;
                    }
                    oReturn.metadata.componentDataSource[sDs] = {
                        uri: oDS.uri,
                        localUri: (oDS.settings && oDS.settings.localUri) ? oDS.settings.localUri : ""
                    };
                }
            }
        }
    }

    if (bFull === false) {
        return oReturn;
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
    for (let sProperty in oItem.mProperties) {
        if (typeof oItem.mProperties[sProperty] === "function" || typeof oItem.mProperties[sProperty] === "object") {
            continue;
        }
        let fnGetter = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)];
        if (fnGetter) {
            oReturn.property[sProperty] = fnGetter.call(oItem);
        } else {
            oReturn.property[sProperty] = oItem.mProperties[sProperty];
        }
    }

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

    if (bCurElement) {
        oReturn.children = this._getChildren(oItem);
        oReturn.childrenCount = this._getChildrenCount(oReturn.children);
        oReturn.tableData = this._getTableData(oItem);

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
                                        oReturn.tableSettings.tableColDescr = aCol[x].getLabel ? aCol[x].getLabel().getText() : "";
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
                context: this._getContexts(aAggregation[i]),
                ui5Id: this._getUi5Id(aAggregation[i]),
                ui5AbsoluteId: aAggregation[i].getId()
            });

            //performance and navigation: in case we have more than 50 aggregation we just don't need them in any realistic scenario..
            if (i > 50) {
                break;
            }
        }
        oReturn.aggregation[oAggregationInfo.name] = oAggregationInfo;
    }

    oReturn.sac = this._getSACData(oItem);

    return oReturn;
};

ui5TestCafeSelectorDef.prototype._getSACData = function (oItem) {
    var oRet = {};
    if (oItem && oItem.getWidgetId) {
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
                className: oCtrl[0].getMetadata()._sClassName
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
    oReturn = this._getElementInformation(oItem, oDomNode, true, true);

    //get all parents, and attach the same information in the same structure
    oReturn.parent = this._getElementInformation(this._getParentWithDom(oItem, 1));
    oReturn.parentL2 = this._getElementInformation(this._getParentWithDom(oItem, 2));
    oReturn.parentL3 = this._getElementInformation(this._getParentWithDom(oItem, 3));
    oReturn.parentL4 = this._getElementInformation(this._getParentWithDom(oItem, 4));
    oReturn.label = this._getElementInformation(this._getLabelForItem(oItem));
    oReturn.itemdata = this._getElementInformation(this._getItemForItem(oItem));

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

window.ui5TestCafeSelector = new ui5TestCafeSelectorDef();
