sap.ui.define([
    "sap/m/MessageToast",
    "sap/ndc/BarcodeScanner"
], function (MessageToast, BarcodeScanner) {
    'use strict';

    return {

        tableId: "br.com.nadirfigueiredo.qualidadecoletor::sap.suite.ui.generic.template.ObjectPage.view.Details::Ordens--LotCt::responsiveTable",

        onInit: function (oEvent) {

        },

        onAfterRendering: function (oEvent) {

            let oTable = this.getView().byId(this.tableId)
            let oQView = this.getView().byId("br.com.nadirfigueiredo.qualidadecoletor::sap.suite.ui.generic.template.ObjectPage.view.Details::Ordens--template:::ObjectPageTable:::SegmentedButton:::sFacet::LotCt")

            if (oTable) {

                oQView.getButtons().forEach(e => e.attachPress(function (oEvent) { oTable.removeSelections(true) }))

                oTable.getModel().setSizeLimit(100)
                oTable.setGrowingScrollToLoad(true)

                oTable.attachSelect(function (oEvent) {

                    if (oEvent.getSource().getSelectedContexts().length != 1 || oEvent.getSource().getSelectedContexts().some((s) => s.getObject().IsPrinted === false && s.getObject().InspectionValuationResult === ''))
                        this.getView().byId(this.tableId).getHeaderToolbar().getContent().filter((s) => s instanceof sap.m.Button && s.getId().includes("UserDecision"))[0].setEnabled(false)

                    if (oEvent.getSource().getSelectedContexts().some((s) => s.getObject().IsPrinted === false && s.getObject().InspectionValuationResult === ''))
                        this.getView().byId(this.tableId).getHeaderToolbar().getContent().filter((s) => s instanceof sap.m.Button && s.getId().includes("Imprimir"))[0].setEnabled(false)

                    if (oEvent.getSource().getSelectedContexts().length != 1 || oEvent.getSource().getSelectedContexts().some((s) => s.getObject().IsSkipAllowed === false))
                        this.getView().byId(this.tableId).getHeaderToolbar().getContent().filter((s) => s instanceof sap.m.Button && s.getId().includes("Skip"))[0].setEnabled(false)

                }.bind(this))
            }

        },

        onSwitchChange: function (oEvent) {
            if (oEvent.getSource().getState()) {
                this.getView().byId("idQtde").setValue(oEvent.getSource().getBindingContext().getObject().QuantityNumerator)
                this.getView().byId("idQtde").setEnabled(false)
                this.getView().byId("btnAccept").setEnabled(true)
            } else {
                this.getView().byId("idQtde").setValue()
                this.getView().byId("idQtde").setEnabled(true)
                this.getView().byId("btnAccept").setEnabled(false)
            }
        },

        onDateSetupChange: function (oEvent) {
            if (oEvent.getSource().getState()) {
                this.getView().byId("idDateSetup").setVisible(true)
            } else {
                this.getView().byId("idDateSetup").setVisible(false)
            }
        },

        onInputChange: function (oEvent) {
            oEvent.getSource().setValueState("None")
            oEvent.getSource().setValueStateText("")
            if (oEvent.getSource().getValue().length > 0) {
                if (Number.parseFloat(oEvent.getSource().getValue()) > Number.parseFloat(oEvent.getSource().getBindingContext().getObject().QuantityNumerator)) {
                    oEvent.getSource().setValueState("Error")
                    oEvent.getSource().setValueStateText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("QuantityNumeratorLimit"))
                    this.getView().byId("btnAccept").setEnabled(false)
                }
                else {
                    this.getView().byId("btnAccept").setEnabled(true)
                    this.getView().byId("idSwitch").setEnabled(false)
                }
            } else {
                this.getView().byId("idSwitch").setEnabled(true)
            }
        },

        onConfirmar: function (oEvent) {
            let oView = this.getView()
            let oObject = oView.getBindingContext().getObject()

            if (oObject.ConfirmationLimit) {
                sap.m.MessageBox.alert(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("ConfirmationLimit"))
                return
            }

            this.createDialog(oView, "br.com.nadirfigueiredo.qualidadecoletor.ext.view.confirmation").then(function (oDialog) {
                oDialog.getSubHeader().setVisible(oObject.Manager)

                oDialog.open()
            });
        },

        createDialog: function (oView, sFragment, sBindingPath) {
            return sap.ui.core.Fragment.load({
                id: oView.getId(),
                name: sFragment,
                controller: this
            }).then(function (oDialog) {
                if (sBindingPath)
                    oDialog.bindElement(sBindingPath)
                else
                    oDialog.bindElement(oView.getBindingContext().getPath());
                oView.addDependent(oDialog);
                return oDialog;
            }.bind(this));
        },

        onClose: function (oEvent) {
            this.getView().setBusy(false)
            try {
                oEvent.getSource().getParent().close();
                oEvent.getSource().getParent().destroy();
            } catch (error) {
                this.getView().byId("idDialog").close();
                this.getView().byId("idDialog").destroy();
            }
            this.getView().removeAllDependents();
            this.templateBaseExtension.getExtensionAPI().refresh();
        },

        onAccept: function (oEvent) {
            let oApi = this.templateBaseExtension.getExtensionAPI()
            let oView = this.getView()
            let oSwitch = this.getView().byId("idSwitch")

            let oSwitchDate = this.getView().byId("idSwitchDate")
            let oDateConf = this.getView().byId("idDateConf")

            let oInput = this.getView().byId("idQtde")
            let oTable = this.getView().byId(this.tableId)

            if (isNaN(Number.parseInt(oInput.getValue())) && oSwitch.getState() == false) {
                oInput.setValueState("Error")
                oInput.setValueStateText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("QtdeObrigatoria"))
                oInput.focus()
                return
            }

            oEvent.getSource().getParent().getEndButton().firePress()
            oView.setBusy(true)

            let oObject = this.getView().getBindingContext().getObject()
            this.getView().getModel().refreshSecurityToken()
            this.getView().getModel().callFunction('/confirmar',
                {
                    refreshAfterChange: true,
                    method: 'POST',
                    urlParameters: {
                        Plant: oObject.Plant,
                        WorkCenterLocation: oObject.WorkCenterLocation,
                        MachineType: oObject.MachineType,
                        Processo: oObject.Processo,
                        OrderID: oObject.OrderID,
                        Quantidade: oSwitch.getState() ? oObject.QuantityNumerator : Number.parseInt(oInput.getValue()),
                        DataConf: oSwitchDate.getState() ? oDateConf.getDateValue().toISOString() : new Date().toISOString()
                    },
                    success: function (oData, response) {
                        oTable.refreshAggregation("items")
                        oView.getModel().refresh(true)
                        oApi.refresh()
                        oView.setBusy(false)
                    },
                    error: function (error) {
                        oTable.refreshAggregation("items")
                        oView.getModel().refresh(true)
                        oApi.refresh()
                        oView.setBusy(false)
                    }
                }
            )
        },

        onTableFilter: function (oEvent) {
            MessageToast.show("Custom handler invoked.");
        },

        onLoteCancel: function (oEvent) {
            let that = this
            let oView = this.getView()
            let oContext = oEvent.getSource().getBindingContext().getObject()
            let oTable = this.getView().byId(this.tableId)
            sap.m.MessageBox.confirm("Deseja estornar o lote de controle?",
                {
                    onClose: function (oAction) {
                        if (oAction == sap.m.MessageBox.Action.OK) {
                            oView.setBusy(true)
                            let oObject = oView.getBindingContext().getObject()
                            oView.getModel().refreshSecurityToken()
                            oView.getModel().callFunction('/cancelar',
                                {
                                    refreshAfterChange: true,
                                    method: 'POST',
                                    urlParameters: {
                                        Plant: oObject.Plant,
                                        WorkCenterLocation: oObject.WorkCenterLocation,
                                        MachineType: oObject.MachineType,
                                        Processo: oObject.Processo,
                                        OrderID: oObject.OrderID,
                                        Lote: oContext.InspectionLot
                                    },
                                    success: function (oData, response) {
                                        oView.setBusy(false)
                                        oView.getModel().refresh()
                                        oTable.refreshAggregation("items")
                                        try {
                                            that.showMessages(that.buildMessages(JSON.parse(JSON.stringify(response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"]))))
                                        } catch (error) {
                                            that.showMessages(that.buildMessages(JSON.parse(JSON.stringify(response.headers["sap-message"]))))
                                        }
                                    },
                                    error: function (error) {
                                        oView.setBusy(false)
                                        oView.getModel().refresh()
                                        oTable.refreshAggregation("items")
                                    }
                                }
                            )
                        } else {

                        }
                    }
                })
        },

        onLoteSkip: function (oEvent) {
            let oView = this.getView()
            let oTable = this.getView().byId(this.tableId)
            let oContext = oTable.getSelectedContexts()[0].getObject() //oEvent.getSource().getBindingContext().getObject()
            oView.setBusy(true)
            let oObject = oView.getBindingContext().getObject()
            oView.getModel().refreshSecurityToken()
            oView.getModel().callFunction('/skip',
                {
                    refreshAfterChange: true,
                    method: 'POST',
                    urlParameters: {
                        Plant: oObject.Plant,
                        WorkCenterLocation: oObject.WorkCenterLocation,
                        MachineType: oObject.MachineType,
                        Processo: oObject.Processo,
                        OrderID: oObject.OrderID,
                        InspectionLot: oContext.InspectionLot,
                        OperationStandardTextCode: oContext.OperationStandardTextCode
                    },
                    success: function (oData, response) {
                        oView.setBusy(false)
                        oView.getModel().refresh()
                        oTable.refreshAggregation("items")
                        oTable.removeSelections(true)
                        try {
                            that.showMessages(that.buildMessages(JSON.parse(JSON.stringify(response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"]))))
                        } catch (error) {
                            that.showMessages(that.buildMessages(JSON.parse(JSON.stringify(response.headers["sap-message"]))))
                        }
                    },
                    error: function (error) {
                        oView.setBusy(false)
                        oView.getModel().refresh()
                        oTable.refreshAggregation("items")
                        oTable.removeSelections(true)
                    }
                }
            )
        },

        onPostResultsFisico: function (oEvent) {
            let that = this
            let oApi = this.templateBaseExtension.getExtensionAPI()
            let oView = this.getView()
            let oDialog = oEvent.getSource().getParent()
            let oTable = oView.byId("idTblDefeito")
            let oCombo = oView.byId("idOper")
            let sOper = oCombo.getSelectedItem().getBindingContext().getObject().Operation_2
            let defGroup = oView.getModel().getDeferredGroups().find((f) => f == 'postFisico')
            if (!defGroup)
                oView.getModel().setDeferredGroups(oView.getModel().getDeferredGroups().concat(["postFisico"]))

            for (let oItem of oTable.getItems()) {
                let oObject = oItem.getBindingContext().getObject()
                for (let oControl of oItem.getCells())
                    if (oControl instanceof sap.m.Input) {
                        oView.getModel().callFunction('/post_fisico',
                            {
                                chandeSetId: new Date().getTime(),
                                groupId: "postFisico",
                                method: 'POST',
                                urlParameters: {
                                    Plant: oView.getBindingContext().getObject().Plant,
                                    WorkCenterLocation: oView.getBindingContext().getObject().WorkCenterLocation,
                                    MachineType: oView.getBindingContext().getObject().MachineType,
                                    Processo: oView.getBindingContext().getObject().Processo,
                                    OrderID: oTable.getBindingContext().getObject().ManufacturingOrder,
                                    InspectionLot: oTable.getBindingContext().getObject().InspectionLot,
                                    OperationStandardTextCode: oTable.getBindingContext().getObject().OperationStandardTextCode,
                                    Quantidade: Number.parseFloat(oControl.getValue() === '' ? 0 : oControl.getValue()),
                                    BOOCharacteristic: oObject.BOOCharacteristic,
                                    MfgActionReasonCodeGroup: oObject.InspectionSpecification,
                                    Evaluated: oControl.getValueState() == sap.ui.core.ValueState.Error ? 'R' : 'A',
                                    Operation: sOper
                                }
                            }
                        )
                    }
            }

            oView.getModel().submitChanges({
                groupId: "postFisico",
                success: function (oData, response) {
                    oTable.refreshAggregation("items")
                    oApi.refreshAncestors()
                    oApi.refresh()
                    oDialog.setBusy(false)

                    // if (!oView.byId("idTblDefeito").getItems().some((s) => s.getBindingContext().getObject().InspectionResultMeanValue <= 0)){
                    if (oView.byId("idTblDefeito").getBindingContext().getObject().InspectionValuationResult != '') {
                        debugger
                        // oDialog.getEndButton().firePress()
                        oDialog.getButtons()[2].firePress()
                    } else {
                        oCombo.setSelectedItem(oCombo.getItems()[Number.parseInt(oCombo.getItems().findIndex((f) => f === oCombo.getSelectedItem())) + 1])
                        oCombo.fireChange({ selectedItem: oCombo.getSelectedItem() })
                    }
                    that.showMessages(that.buildMessages(JSON.parse(JSON.stringify(response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"]))))

                    oView.getModel().refresh(true)
                },
                error: function (error) {
                    oView.getModel().refresh(true)
                    oTable.refreshAggregation("items")
                    oApi.refreshAncestors()
                    oApi.refresh()
                    oDialog.setBusy(false)
                    // oDialog.getEndButton().firePress()
                    that.showMessages(that.buildMessages(JSON.parse(JSON.stringify(error))))

                    oView.getModel().refresh(true)
                }
            })
        },

        onEncerrarFisico: function (oEvent) {
            let that = this
            let oView = this.getView()
            let oSource = oEvent.getSource()
            let oObject = oEvent.getSource().getBindingContext().getObject()
            let oDialog = oEvent.getSource().getParent()
            let oApi = this.templateBaseExtension.getExtensionAPI()
            sap.m.MessageBox.confirm(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("EncerraFisico"), {
                onClose: function (oAction) {
                    if (oAction == sap.m.MessageBox.Action.OK) {

                        let defGroup = oView.getModel().getDeferredGroups().find((f) => f == 'close')
                        if (!defGroup)
                            oView.getModel().setDeferredGroups(oView.getModel().getDeferredGroups().concat(["close"]))

                        oView.getModel().callFunction('/close',
                            {
                                chandeSetId: new Date().getTime(),
                                groupId: "close",
                                method: 'POST',
                                urlParameters: {
                                    Plant: oView.getBindingContext().getObject().Plant,
                                    WorkCenterLocation: oView.getBindingContext().getObject().WorkCenterLocation,
                                    MachineType: oView.getBindingContext().getObject().MachineType,
                                    Processo: oView.getBindingContext().getObject().Processo,
                                    OrderID: oObject.ManufacturingOrder,
                                    InspectionLot: oObject.InspectionLot
                                }
                            }
                        )
                        oView.getModel().submitChanges({
                            groupId: "close",
                            success: function (oData, response) {
                                // oTable.refreshAggregation("items")
                                let oResponse = JSON.parse(response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"])
                                oApi.refresh()
                                oApi.refreshAncestors()
                                oView.getModel().read("/DefeitosVisual2",
                                    {
                                        filters: [new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, oObject.InspectionLot)],
                                        success: function (oData, response) {
                                            oDialog.getButtons()[2].firePress({ "noMsg": oData.results[0].UD })
                                            if (oData.results[0].UD)
                                                that.showMessages(that.buildMessages(oResponse),
                                                    {
                                                        InspectionLot: oObject.InspectionLot,
                                                        hasDU: oData.results[0].UD
                                                    }
                                                )
                                            oDialog.setBusy(false)
                                        }
                                    })
                            },
                            error: function (error) {
                                // oTable.refreshAggregation("items")
                                oDialog.setBusy(false)
                                oApi.refresh()
                                oApi.refreshAncestors()
                                oDialog.getButtons()[2].firePress()
                                that.showMessages(that.buildMessages(JSON.parse(error)))
                            }
                        })
                    }
                }
            })
        },

        onPostResults: function (oEvent) {
            let that = this
            let oApi = this.templateBaseExtension.getExtensionAPI()
            let oView = this.getView()
            let oDialog = oEvent.getSource().getParent()
            let oTable = oView.byId("idTblDefeito")
            oDialog.setBusy(true)
            let oContext
            let oObject = oEvent.getSource().getBindingContext().getObject()
            let oModel = oView.getModel("Defeitos")?.getData()

            let defGroup = oView.getModel().getDeferredGroups().find((f) => f == 'postVisual')
            if (!defGroup)
                oView.getModel().setDeferredGroups(oView.getModel().getDeferredGroups().concat(["postVisual"]))

            try {
                oContext = oModel.find(e => JSON.stringify(e, Object.keys(e).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')) == JSON.stringify(oObject, Object.keys(oObject).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')))
            } catch (error) {

            }

            if (oContext) {
                oView.getModel().refreshSecurityToken()
                for (let i = 0; i < oContext.to_Defeitos.length; i++)

                    oView.getModel().callFunction('/post_visual',
                        {
                            chandeSetId: new Date().getTime(),
                            groupId: "postVisual",
                            method: 'POST',
                            urlParameters: {
                                Plant: oView.getBindingContext().getObject().Plant,
                                WorkCenterLocation: oView.getBindingContext().getObject().WorkCenterLocation,
                                MachineType: oView.getBindingContext().getObject().MachineType,
                                Processo: oView.getBindingContext().getObject().Processo,
                                OrderID: oObject.ManufacturingOrder,
                                InspectionLot: oObject.InspectionLot,
                                OperationStandardTextCode: oObject.OperationStandardTextCode,
                                ManufacturingActionReasonCode: oContext.to_Defeitos[i].ManufacturingActionReasonCode,
                                MfgActionReasonGroup: oContext.to_Defeitos[i].MfgActionReasonGroup,
                                MfgActionReasonCodeGroup: oContext.to_Defeitos[i].MfgActionReasonCodeGroup,
                                Quantidade: Number.parseInt(oContext.to_Defeitos[i].Quantidade === '' ? 0 : oContext.to_Defeitos[i].Quantidade)
                                // BOOCharacteristic: oContext.to_Defeitos[i].BOOCharacteristic
                            }
                        }
                    )
                // }
            } else {
                oView.getModel().callFunction('/post_visual',
                    {
                        chandeSetId: new Date().getTime(),
                        groupId: "postVisual",
                        method: 'POST',
                        urlParameters: {
                            Plant: oView.getBindingContext().getObject().Plant,
                            WorkCenterLocation: oView.getBindingContext().getObject().WorkCenterLocation,
                            MachineType: oView.getBindingContext().getObject().MachineType,
                            Processo: oView.getBindingContext().getObject().Processo,
                            OrderID: oObject.ManufacturingOrder,
                            InspectionLot: oObject.InspectionLot,
                            OperationStandardTextCode: oObject.OperationStandardTextCode
                            // ManufacturingActionReasonCode: oContext.ManufacturingActionReasonCode,
                            // MfgActionReasonGroup: oContext.MfgActionReasonGroup,
                            // MfgActionReasonCodeGroup: oContext.MfgActionReasonCodeGroup,
                            // Quantidade: Number.parseInt(oControl.getValue()), //oContext.Quantidade,
                            // BOOCharacteristic: oContext.BOOCharacteristic
                        }
                    }
                )
            }

            oView.getModel().submitChanges({
                groupId: "postVisual",
                success: function (oData, response) {
                    // oTable.refreshAggregation("items")
                    oDialog.setBusy(false)
                    oApi.refresh()
                    oApi.refreshAncestors()
                    oDialog.getEndButton().firePress()
                    that.showMessages(that.buildMessages(JSON.parse(response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"])))
                },
                error: function (error) {
                    // oTable.refreshAggregation("items")
                    oDialog.setBusy(false)
                    oApi.refresh()
                    oApi.refreshAncestors()
                    oDialog.getEndButton().firePress()
                    that.showMessages(that.buildMessages(JSON.parse(error)))
                }
            })
        },

        onInspect: function (oEvent) {
            let oView = this.getView()
            // let oObject = oView.byId(this.tableId).getSelectedItem().getBindingContext().getObject()
            let oObject = oEvent.getSource().getParent().getParent().getBindingContext().getObject()

            let oContext = oView.getBindingContext()
            // oListener.setSelectedItem(oListener.getSelectedItem(), false)
            let sPath = "/Lotes(ManufacturingOrder='" + oContext.getObject().OrderID + "',Plant='" + oContext.getObject().Plant + "',InspectionLot='" + oObject.InspectionLot + "',Material='" + oObject.Material + "',OperationStandardTextCode='" + oObject.OperationStandardTextCode + "')"
            let sDialog
            switch (oObject.OperationStandardTextCode) {
                case "ZQM01":
                    sDialog = "br.com.nadirfigueiredo.qualidadecoletor.ext.view.visual_nc"
                    break;
                case "ZQM02":
                    sDialog = "br.com.nadirfigueiredo.qualidadecoletor.ext.view.fisico_nc"
                    break;
                default:
                    break;
            }

            this.createDialog(this.getView(), sDialog, sPath).then(function (oDialog) {
                let oView = oDialog.getParent()
                let oControl = oDialog.getParent().byId("idHeader")
                let sPath
                // oDialog.setBusy(true)

                oControl.addAttribute(new sap.m.ObjectAttribute({ text: oView.getBindingContext().getObject().WorkCenterLocation }).bindProperty("title", "i18n>Linha"))
                oControl.addAttribute(new sap.m.ObjectAttribute({ text: oView.getBindingContext().getObject().ArticleValue }).bindProperty("title", "i18n>Artigo"))
                oDialog.getParent().byId("idTblDefeito").getModel().setSizeLimit(5000)
                oDialog.getParent().byId("idTblDefeito").setSticky([sap.m.Sticky.ColumnHeaders, sap.m.Sticky.HeaderToolbar])

                switch (oObject.OperationStandardTextCode) {
                    case 'ZQM01':
                        sPath = "/DefeitosVisual2"
                        // oView.getModel().read(sPath, {
                        //     filters: [new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, oObject.InspectionLot)],
                        //     success: function (oData, response) {
                        //         if (oData.results.length > 0)
                        //             oDialog.getParent().byId("idTblDefeito").getBinding("items").filter([
                        //                 new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, oObject.InspectionLot)
                        //             ])
                        //         else
                        //             // oDialog.getParent().byId("idTblDefeito").getBinding("items").filter([
                        //             // new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, "000000000000"),
                        //             // new sap.ui.model.Filter("BillOfOperationsType", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsType),
                        //             // new sap.ui.model.Filter("BillOfOperationsGroup", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsGroup)
                        //             //     new sap.ui.model.Filter("BillOfOperationsUsage", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsUsage),
                        //             // ])
                        //             oDialog.setBusy(true)
                        oDialog.open()
                        //     },
                        //     error: function (error) { }
                        // })
                        break;
                    case 'ZQM02':
                        sPath = "/DefeitosFisico"
                        oDialog.getParent().byId("idTblDefeito").getBinding("items").filter([new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, oObject.InspectionLot)])
                        oDialog.open()
                        break;
                    default:
                        break;
                }
            });
        },

        onFisico: function (oEvent) {

            if (oEvent.getParameter("reason") == 'Refresh')
                // if (this.getView().byId("idTblDefeito").getItems().some((s) => s.getBindingContext().getObject().InspectionResultMeanValue <= Number.parseFloat(0))) {
                if (this.getView().byId("idTblDefeito").getItems().some((s) => !s.getBindingContext().getObject().Closed)) {
                    this.getView().byId("idOper").setValueState("Error")
                    this.getView().byId("idOper").setValueStateText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("SelGrupo"))
                    this.getView().byId("idTblDefeito").setVisible(false)
                } else {
                    this.getView().byId("idOper").setVisible(false)
                    this.getView().byId("btnAccept").setVisible(false)
                    this.getView().byId("lblGroup").setVisible(false)
                    this.getView().byId("idTblDefeito").setVisible(true)
                }
            this.getView().setBusy(false)
        },

        onOpenFisico: function (oEvent) {
            let aFilters = []
            let oObject = oEvent.getSource().getBindingContext()?.getObject()
            if (oObject) {
                aFilters.push(
                    new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, oObject.InspectionLot),
                    new sap.ui.model.Filter("BillOfOperationsType", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsType),
                    new sap.ui.model.Filter("BillOfOperationsUsage", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsUsage),
                    new sap.ui.model.Filter("BillOfOperationsGroup", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsGroup)
                )
                // oEvent.getSource().setSelectedItem(oEvent.getSource().getItems()[0])
                // oEvent.getSource().fireChange({ selectedItem: oEvent.getSource().getItems()[0] })
                oEvent.getSource().getBinding("items").filter(aFilters)

                //         // if (this.getView().byId("idTblDefeito").getItems().some((s) => s.getBindingContext().getObject().InspectionResultMeanValue <= Number.parseFloat(0))) {
                //         //     oEvent.getSource().setValueState("Error")
                //         //     oEvent.getSource().setValueStateText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("SelGrupo"))
                //         //     this.getView().byId("idTblDefeito").setVisible(false)
                //         // } else {
                //         //     oEvent.getSource().setVisible(false)
                //         //     this.getView().byId("btnAccept").setVisible(false)
                //         //     this.getView().byId("lblGroup").setVisible(false)
                //         //     this.getView().byId("idTblDefeito").setVisible(true)
                //         // }

                //         // aFilters.push(new sap.ui.model.Filter("BOOOperationInternalID", sap.ui.model.FilterOperator.EQ, oEvent.getSource().getSelectedKey()))
                //         // this.getView().byId("idTblDefeito").getBinding("items").filter(aFilters)

                //         // this.getView().byId("idTblDefeito").getBinding("items").filter([new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, oEvent.getSource().getSelectedKey())])
                //         // oEvent.getSource().getParent().getParent().setBusy(false)
            }
        },

        onUpdateStarted: function (oEvent) {
            oEvent.getSource().getParent().getParent().setBusy(true)
            // let oObject = oEvent.getSource().getBindingContext()?.getObject()
            // if (oObject) {
            //     let aFilters = oEvent.getSource().getBinding("items").aFilters
            //     if (!aFilters) aFilters = []
            //     aFilters.push(
            //         new sap.ui.model.Filter("BillOfOperationsType", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsType),
            //         new sap.ui.model.Filter("BillOfOperationsGroup", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsGroup)
            //         // new sap.ui.model.Filter("BOOOperationInternalID", sap.ui.model.FilterOperator.EQ, oObject.BOOOperationInternalID)
            //     )
            //     oEvent.getSource().getBinding("items").filter(aFilters)
            // }
        },

        onSearchDefeitos: function (oEvent) {
            let sQuery = oEvent.getSource().getValue().toUpperCase()
            let oObject = oEvent.getSource().getBindingContext().getObject()
            let oModel = this.getView().getModel("Defeitos")?.getData()
            let oContext

            let aFilters = oEvent.getSource().getParent().getParent().getBinding("items").aFilters
            if (!aFilters) aFilters = []
            else {
                let iIdx = aFilters.indexOf(aFilters.find((s) => s.sPath == 'MfgActionReasonCodeName'))
                if (iIdx >= 0)
                    aFilters.splice(iIdx, 1)
            }
            if (sQuery && sQuery.length > 0)
                aFilters.push(new sap.ui.model.Filter("MfgActionReasonCodeName", sap.ui.model.FilterOperator.Contains, sQuery))

            if (oModel) {
                oContext = oModel.find(e => JSON.stringify(e, Object.keys(e).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')) == JSON.stringify(oObject, Object.keys(oObject).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')))
                for (let oDefeito of oContext.to_Defeitos)
                    aFilters.push(new sap.ui.model.Filter("MfgActionReasonCodeName", sap.ui.model.FilterOperator.EQ, oDefeito.MfgActionReasonCodeName))
            }

            oEvent.getSource().getParent().getParent().getBinding("items").filter(aFilters)
            oEvent.getSource().setValue(sQuery)
        },

        onUpdateFinished: function (oEvent) {
            let oObject
            let iCount
            let oModel
            let oTable = oEvent.getSource()

            oTable.getParent().getParent().setBusy(true)
            switch (oEvent.getParameter("reason")) {
                case 'Filter':
                    this.getView().byId("idVisualNC").setBusy(false)
                    break;
                case 'Refresh':

                    oObject = oTable.getBindingContext()?.getObject()
                    if (oObject) {
                        let aFilters = oTable.getBinding("items").aFilters
                        if (!aFilters) aFilters = []
                        if (oTable.getBinding("items").getContexts().some((s) => s.getObject().InspectionLot == oObject.InspectionLot)) {

                            oTable.setMode(sap.m.ListMode.None)
                            oTable.getParent().getParent().getBeginButton().setVisible(false)
                        }
                        // } else {
                        //     aFilters.push(new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, '000000000000'))
                        // }

                        aFilters.push(
                            new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, oObject.InspectionLot),
                            new sap.ui.model.Filter("BillOfOperationsType", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsType),
                            //     new sap.ui.model.Filter("BillOfOperationsUsage", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsUsage),
                            new sap.ui.model.Filter("BillOfOperationsGroup", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsGroup)
                        )
                        oTable.getBinding("items").filter(aFilters)
                    }

                    //     break;
                    // case 'Filter':
                    // // iCount = 0
                    // // for (let oItem of oTable.getItems())
                    // //     if (!oItem.isGroupHeader())
                    // //         for (let oControl of oItem.getCells())
                    // //             if (oControl instanceof sap.m.Input) {
                    // //                 let iValue = Number.parseInt(oControl.getValue())
                    // //                 iCount += iValue
                    // //             }
                    // // break;
                    // case 'Change':

                    iCount = 0;
                    oObject = oTable.getBindingContext()?.getObject()
                    oModel = this.getView().getModel("Defeitos")?.getData()

                    oObject.to_Defeitos = []
                    // oObject.InspectionLot = 
                    if (!oModel) {
                        oModel = []
                        oModel.push(oObject)
                    } else {
                        if (!oModel.find(e => JSON.stringify(e, Object.keys(e).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')) == JSON.stringify(oObject, Object.keys(oObject).filter((k) => k !== 'to_Defeitos' && k !== '__metadata'))))
                            oModel.push(oObject)
                        else {
                            oObject = oModel.find((e) => JSON.stringify(e, Object.keys(e).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')) == JSON.stringify(oObject, Object.keys(oObject).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')))
                            if (oObject) {
                                oObject.to_Defeitos.forEach((e) => {
                                    let oItem = oTable.getItems().find((f) => !f.isGroupHeader() && JSON.stringify(e, Object.keys(e).filter((k) => k !== 'InspectionLot' && k !== 'Quantidade' && k !== '__metadata')) == JSON.stringify(f.getBindingContext().getObject(), Object.keys(f.getBindingContext().getObject()).filter((k) => k !== 'InspectionLot' && k !== 'Quantidade' && k !== '__metadata')))
                                    if (oItem) {
                                        oTable.setSelectedItem(oItem, true)
                                        for (let oControl of oItem.getCells())
                                            if (oControl instanceof sap.m.Input) {
                                                let iValue = Number.parseInt(e.Quantidade)
                                                if (iValue > 0) {
                                                    oControl.setValue(iValue)
                                                    oControl.focus()
                                                    // iCount += iValue
                                                }
                                            }
                                        oTable.fireSelectionChange({ listItems: [oItem], selected: true })
                                    } else {
                                        // iCount += e.Quantidade
                                    }
                                })
                            }
                        }
                    }
                    break;
                default:
                    break;
            }

            for (let oItem of oTable.getItems())
                if (!oItem.isGroupHeader())
                    for (let oControl of oItem.getCells())
                        if (oControl instanceof sap.m.Input) {
                            iCount += Number.parseInt(oControl.getValue())
                            oControl.setEnabled(oItem.getSelected())
                        }

            iCount = isNaN(iCount) ? "0" : Number.parseInt(iCount)
            this.getView().byId("idHeader").setNumber("NC: " + iCount)
            // oTable.getParent().getParent().setBusy(false)
        },

        onSelectDefeito: function (oEvent) {
            let oContext = oEvent.getSource().getBindingContext().getObject()
            for (let oItem of oEvent.getParameter("listItems"))
                if (!oItem.isGroupHeader())
                    for (let oControl of oItem.getCells())
                        if (oControl instanceof sap.m.Input) {
                            if (oControl.getEnabled()) { //Selecionado
                                let oModel = this.getView().getModel("Defeitos")?.getData()
                                if (oModel) {
                                    let oObject = oModel.find((f) => JSON.stringify(f, Object.keys(f).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')) == JSON.stringify(oContext, Object.keys(oContext).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')))
                                    if (oObject) {
                                        oObject.to_Defeitos.splice(oObject.to_Defeitos.indexOf(JSON.parse(JSON.stringify(oItem.getBindingContext().getObject(), Object.keys(oItem.getBindingContext().getObject()).filter((k) => k !== '__metadata')))))
                                        oControl.setValue()
                                    }
                                }
                            }
                            oControl.setEnabled(oItem.getSelected())
                        }
        },

        onInputLimite: function (oEvent) {
            let fValue = Number.parseFloat(oEvent.getSource().getValue())
            let oContext = oEvent.getSource().getBindingContext().getObject()
            if (oContext.InspSpecTargetValue != 0)
                if (fValue < oContext.InspSpecLowerLimit || fValue > oContext.InspSpecUpperLimit) {
                    oEvent.getSource().setValueState("Error")
                    oEvent.getSource().setValueStateText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("Tolerancia"))
                }
                else {
                    oEvent.getSource().setValueState("Success")
                }
            else
                if (!fValue) {
                    oEvent.getSource().setValueState("Warning")
                } else {
                    oEvent.getSource().setValueState("None")
                }
        },

        onInputNC: function (oEvent) {
            let iCount = 0;
            let oModel = this.getView().getModel("Defeitos")?.getData() ? this.getView().getModel("Defeitos").getData() : []
            let oContext = oEvent.getSource().getParent().getParent().getBindingContext().getObject()
            let oItem = oEvent.getSource().getParent()

            if (oModel.length > 0)
                oContext = oModel.find((e) => JSON.stringify(e, Object.keys(e).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')) == JSON.stringify(oContext, Object.keys(oContext).filter((k) => k !== 'to_Defeitos' && k !== '__metadata')))

            if (!JSON.parse(JSON.stringify(oContext)).hasOwnProperty("to_Defeitos"))
                oContext.to_Defeitos = []

            for (let oControl of oItem.getCells())
                if (oControl instanceof sap.m.Input) {
                    let oObject = oContext.to_Defeitos.find((f) => JSON.stringify(f, Object.keys(f).filter((k) => k !== 'Quantidade' && k !== 'NumberOfDefects' && k !== 'InspectionLot')) == JSON.stringify(oItem.getBindingContext().getObject(), Object.keys(oItem.getBindingContext().getObject()).filter((k) => k !== '__metadata' && k !== 'NumberOfDefects' && k !== 'InspectionLot')))
                    let iValue = Number.parseInt(oEvent.getParameter("newValue"))
                    oControl.setValue(iValue == 0 ? 0 : iValue)
                    if (iValue > 0) {
                        if (!oObject) {
                            oObject = oItem.getBindingContext().getObject()
                            oObject.InspectionLot = oContext.InspectionLot
                            oObject.Quantidade = iValue
                            oContext.to_Defeitos.push(JSON.parse(JSON.stringify(oObject, Object.keys(oObject).filter((k) => k !== '__metadata'))))
                        } else
                            oObject.Quantidade = iValue
                    } else {
                        iValue -= Number.parseInt(oObject.Quantidade)
                        oEvent.getSource().getParent().getParent().setSelectedItem(oItem, false)
                        oContext.to_Defeitos.splice(oContext.to_Defeitos.indexOf(oObject), 1)
                    }
                }

            if (oModel.length == 0)
                oModel.push(oContext)

            iCount = oContext.to_Defeitos.reduce((acc, curr) => acc + curr.Quantidade, 0) //iCount < 0 ? 0 : iCount

            this.getView().setModel(new sap.ui.model.json.JSONModel(oModel), "Defeitos")
            this.getView().byId("idHeader").setNumber("NC: " + iCount)
        },

        onCloseResults: function (oEvent) {
            this.onClose(oEvent)
        },

        onCloseResultsFisico: function (oEvent) {
            let oView = this.getView()
            let oSource = oEvent.getSource()
            let noMsg = false

            if (oEvent.getParameter("noMsg")) {
                noMsg = oEvent.getParameter("noMsg")
            }

            // if (oView.byId("idTblDefeito").getItems().some((s) => s.getBindingContext().getObject().InspectionResultMeanValue <= 0))
            if (oView.byId("idTblDefeito").getItems().some((s) => !s.getBindingContext().getObject().Closed) && !noMsg)
                sap.m.MessageBox.confirm(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("ConfirmFisico"), {
                    onClose: function (oAction) {
                        if (oAction == sap.m.MessageBox.Action.OK) {
                            // this.onClose(oEvent)
                            oSource.getParent().close();
                            oSource.getParent().destroy();
                            oView.removeAllDependents();
                        }
                    }
                })
            else {
                oSource.getParent().close();
                oSource.getParent().destroy();
                oView.removeAllDependents();
            }
        },

        getGroupHeader: function (oGroup) {
            return new sap.m.GroupHeaderListItem({
                title: oGroup.key,
                upperCase: false
            });
        },

        onSelectChange: function (oEvent) {
            let oView = this.getView()
            let oControl = oEvent.getSource()
            let oObject = oControl.getSelectedItem()?.getBindingContext().getObject()
            let aFilters
            if (oObject) {
                aFilters = [
                    new sap.ui.model.Filter("InspectionLot", sap.ui.model.FilterOperator.EQ, oObject.InspectionLot),
                    new sap.ui.model.Filter("BillOfOperationsUsage", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsUsage),
                    new sap.ui.model.Filter("BOOOperationInternalID", sap.ui.model.FilterOperator.EQ, oEvent.getSource().getSelectedKey()),
                    new sap.ui.model.Filter("BillOfOperationsGroup", sap.ui.model.FilterOperator.EQ, oObject.BillOfOperationsGroup)
                ]
            }
            // if (oEvent.getParameter("previousSelectedItem") && oView.byId("idTblDefeito").getBindingContext().getObject().InspectionValuationResult == '')
            // if (oEvent.getParameter("previousSelectedItem") && oView.byId("idTblDefeito").getItems().some((s) => s.getBindingContext().getObject().InspectionOperation === oEvent.getParameter("previousSelectedItem").getBindingContext().getObject().Operation_2 && s.getBindingContext().getObject().InspectionResultMeanValue <= 0))
            if (oEvent.getParameter("previousSelectedItem") && oView.byId("idTblDefeito").getItems().some((s) => s.getBindingContext().getObject().InspectionOperation === oEvent.getParameter("previousSelectedItem").getBindingContext().getObject().Operation_2 && s.getBindingContext().getObject().Closed === false))
                sap.m.MessageBox.confirm(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("ConfirmFisico"), {
                    onClose: function (oAction) {
                        if (oAction == sap.m.MessageBox.Action.OK) {
                            oControl.getParent().getParent().setBusy(true)
                            oView.byId("idTblDefeito").getBinding("items").filter(aFilters)
                            oControl.getParent().getParent().setBusy(false)
                        }
                    }
                })
            else {
                oControl.getParent().getParent().setBusy(true)

                oControl.setValueState("None")
                oControl.setValueStateText("")

                oView.byId("idTblDefeito").getBinding("items").aFilters = undefined
                oView.byId("idTblDefeito").getBinding("items").filter(aFilters)

                oView.byId("idTblDefeito").setVisible(true)

                oControl.getParent().getParent().setBusy(false)
            }

            for (let oItem of oView.byId("idTblDefeito").getItems())
                for (let oControl of oItem.getCells())
                    if (oControl instanceof sap.m.Input) {
                        // oControl.setValue(Number.parseFloat(oControl.getValue()) === 0.000 ? '' : oControl.getValue())
                        oControl.setValue()
                        // oControl.setValueState("None")
                    }
        },

        onDUConfirm: function (oEvent) {
            this.createDialog(this.getView(), "br.com.nadirfigueiredo.qualidadecoletor.ext.view.du").then(function (oDialog) {
                oDialog.open()
                oDialog.getParent().byId("idBarcode").focus()
            });
        },

        showMessages: function (oMessage, oObject) {
            let that = this
            let oView = this.getView()
            let oMessageView = new sap.m.MessageView({
                showDetailsPageHeader: false,
                itemSelect: function (oEvent) {
                    //debugger
                    oEvent.getSource().getParent().getCustomHeader().getContentLeft()[0].setVisible(true);
                },
                items: {
                    path: "/",
                    template: new sap.m.MessageItem({
                        type: "{= ${severity} === 'error' ? 'Error' : 'Success' }",
                        title: "{message}",
                        description: "{code}",
                        subtitle: "{target}"
                    })
                }
            });
            oMessageView.setModel(new sap.ui.model.json.JSONModel(oMessage));
            new sap.m.Dialog({
                resizable: true,
                type: "Message",
                icon: "sap-icon://message-information",
                title: "Mensagens",
                state: "Information",
                contentHeight: "50%",
                contentWidth: "50%",
                verticalScrolling: false,
                content: oMessageView,
                beginButton: new sap.m.Button({
                    press: function (oEvent) {
                        this.getParent().close();
                        if (oObject) {
                            that.createDialog(oView, "br.com.nadirfigueiredo.qualidadecoletor.ext.view.du").then(function (oDialog) {
                                oDialog.addCustomData(new sap.ui.core.CustomData({ key: "InspectionLot", value: oObject.InspectionLot }))
                                oDialog.open()
                            });
                        }
                    },
                    text: "Fechar"
                }),
                customHeader: new sap.m.Bar({
                    contentLeft: [new sap.m.Button({
                        icon: "sap-icon://nav-back",
                        visible: false,
                        press: function (oEvent) {
                            oMessageView.navigateBack();
                            this.setVisible(false);
                        }
                    })],
                    contentMiddle: [
                        new sap.m.Title({
                            text: "{i18n>MessageTitle}",
                            level: sap.ui.core.TitleLevel.H1
                        })
                    ]
                })
            }).open();
        },

        buildMessages: function (oMessage) {
            let aMessage = []

            try {
                aMessage.push(JSON.parse(oMessage, Object.keys(oMessage).filter((k) => k !== "details")))
                aMessage = aMessage.concat(JSON.parse(oMessage).details)
            } catch (error) {
                aMessage.push(JSON.parse(JSON.stringify(oMessage, Object.keys(oMessage).filter((k) => k !== "details"))))
                aMessage = aMessage.concat(JSON.parse(JSON.stringify(oMessage)).details)
            }

            return [...new Set(aMessage)]
        },

        onImprimir: function (oEvent) {
            let that = this
            let oView = this.getView()
            let oTable = oView.byId(this.tableId)
            let oApi = this.templateBaseExtension.getExtensionAPI()
            let defGroup = oView.getModel().getDeferredGroups().find((f) => f == 'print')
            if (!defGroup)
                oView.getModel().setDeferredGroups(oView.getModel().getDeferredGroups().concat(["print"]))
            oView.setBusy(true)
            for (let oItem of oTable.getSelectedItems()) {
                oView.getModel().callFunction('/print',
                    {
                        chandeSetId: new Date().getTime(),
                        groupId: "print",
                        method: 'POST',
                        urlParameters: {
                            Plant: oView.getBindingContext().getObject().Plant,
                            WorkCenterLocation: oView.getBindingContext().getObject().WorkCenterLocation,
                            MachineType: oView.getBindingContext().getObject().MachineType,
                            Processo: oView.getBindingContext().getObject().Processo,
                            OrderID: oItem.getBindingContext().getObject().ManufacturingOrder,
                            InspectionLot: oItem.getBindingContext().getObject().InspectionLot,
                            OperationStandardTextCode: oItem.getBindingContext().getObject().OperationStandardTextCode
                        }
                    }
                )
                oTable.setSelectedItem(oItem, false)
            }

            oView.getModel().submitChanges({
                groupId: "print",
                success: function (oData, response) {
                    oApi.refresh()
                    oView.setBusy(false)
                    oTable.removeSelections(true)
                    that.showMessages(that.buildMessages(JSON.parse(response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"])))
                },
                error: function (error) {
                    oApi.refresh()
                    oView.setBusy(false)
                    oTable.removeSelections(true)
                    that.showMessages(that.buildMessages(JSON.parse(error)))
                }
            })
        },

        onDuFake: function (oEvent) {
            let that = this
            let oView = this.getView()
            let oTable = oView.byId(this.tableId)
            let oApi = this.templateBaseExtension.getExtensionAPI()
            let defGroup = oView.getModel().getDeferredGroups().find((f) => f == 'du_fake')
            if (!defGroup)
                oView.getModel().setDeferredGroups(oView.getModel().getDeferredGroups().concat(["du_fake"]))
            oView.getModel().callFunction('/du_fake',
                {
                    chandeSetId: new Date().getTime(),
                    groupId: "du_fake",
                    method: 'POST',
                    urlParameters: {
                        Plant: oView.getBindingContext().getObject().Plant,
                        WorkCenterLocation: oView.getBindingContext().getObject().WorkCenterLocation,
                        MachineType: oView.getBindingContext().getObject().MachineType,
                        Processo: oView.getBindingContext().getObject().Processo,
                        OrderID: oView.getBindingContext().getObject().OrderID,
                        InspectionLot: oEvent.getSource().getCustomData()[0].getValue(),
                        Code: oEvent.getParameter("selectedItem").getBindingContext().getObject().CharacteristicAttributeCode
                    }
                }
            )

            oView.getModel().submitChanges({
                groupId: "du_fake",
                success: function (oData, response) {
                    oApi.refresh()
                    oView.setBusy(false)
                    oTable.removeSelections(true)
                    that.showMessages(that.buildMessages(JSON.parse(response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"])))
                },
                error: function (error) {
                    oApi.refresh()
                    oView.setBusy(false)
                    oTable.removeSelections(true)
                    that.showMessages(that.buildMessages(JSON.parse(error)))
                }
            })

        },



        // Barcode

        onUserDecision: function (oEvent) {

            let oTable = this.getView().byId(this.tableId)

            if (oTable) {

                if (oTable.getSelectedContexts().length > 1) {
                    sap.m.MessageBox.alert(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("DU1"))
                    return
                }

                if (oTable.getSelectedContexts().some((s) => s.getObject().InspectionValuationResult === '')) {
                    sap.m.MessageBox.alert(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("DU2"))
                    return
                }
                if (oTable.getSelectedContexts().some((s) => s.getObject().IsPrinted === false)) {
                    sap.m.MessageBox.alert(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("DU3"))
                    return
                }

            }
            this.createDialog(this.getView(), "br.com.nadirfigueiredo.qualidadecoletor.ext.view.BarcodeScanner").then(function (oDialog) {
                oDialog.open()
                oDialog.getParent().byId("idBarcode").focus()
            })
        },

        onScan: function (oEvent) {
            this.onClose(oEvent)
            let that = this
            let oObject = this.byId(this.tableId).getSelectedContexts()[0].getObject()
            BarcodeScanner.scan(
                function (oResult) {
                    BarcodeScanner.closeScanDialog()
                    that._onScanCallback(oObject, oResult.newValue)
                }.bind(this),
                function (oError) {
                    BarcodeScanner.closeScanDialog()
                    return oResult.newValue
                },
                function (oResult) {
                    BarcodeScanner.closeScanDialog()
                    that._onScanCallback(oObject, oResult.newValue)
                }.bind(this)
            )
        },

        onScanChange: function (oEvent) {
            let that = this
            let oApi = this.templateBaseExtension.getExtensionAPI()
            let oTable = this.byId(this.tableId)
            let oObject = oTable.getSelectedContexts()[0].getObject()
            let oView = this.getView()
            let oDialog = this.getView().byId("idDialog")

            oEvent.getSource().setValueState("None")
            oEvent.getSource().setValueStateText("")

            if (oEvent.getSource().getValue().length < 12) {
                oEvent.getSource().setValueState("Warning")
                oEvent.getSource().setValueStateText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("InspLot"))
                return
            }

            if (!isNaN(oEvent.getSource().getValue()) && Number.parseInt(oEvent.getSource().getValue()) !== Number.parseInt(oObject.InspectionLot)) {
                oEvent.getSource().setValueState("Error")
                oEvent.getSource().setValueStateText(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("InspLot2"))
                return
            }

            oDialog.setBusy(true)
            this.getView().getModel().callFunction('/setUserDecision',
                {
                    refreshAfterChange: true,
                    method: 'POST',
                    urlParameters: {
                        Plant: oObject.Plant,
                        InspectionLot: oObject.InspectionLot
                    },
                    success: function (oData, response) {
                        oDialog.setBusy(false)
                        oDialog.getEndButton().firePress()
                        // oApi.refreshTable()
                        oTable.removeSelections(true)

                        try {
                            that.showMessages(that.buildMessages(JSON.parse(response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"])))
                        } catch (error) {
                            that.showMessages(that.buildMessages(JSON.parse(response.headers["sap-message"])))
                        }

                        // let oReturn = JSON.parse(response.headers["sap-message"])

                        // switch (oReturn.severity) {
                        //     case 'error':
                        //         sap.m.MessageBox.error(oReturn.message)
                        //         break;
                        //     case 'success':
                        //         sap.m.MessageBox.success(oReturn.message)
                        //         break;
                        //     case 'warning':
                        //         sap.m.MessageBox.alert(oReturn.message)
                        //         break;
                        //     default:
                        //         break;
                        // }
                    },
                    error: function (error) {
                        oDialog.setBusy(false)
                        oDialog.getEndButton().firePress()
                        // oApi.refreshTable()
                        oTable.removeSelections(true)
                    }
                }
            )
        },

        _onScanCallback: function (oObject, sValue) {
            let oApi = this.templateBaseExtension.getExtensionAPI()
            let oView = this.getView()

            oView.setBusy(true)

            BarcodeScanner.closeScanDialog()

            this.getView().getModel().callFunction('/setUserDecision',
                {
                    refreshAfterChange: true,
                    method: 'POST',
                    urlParameters: {
                        Plant: oObject.Plant,
                        InspectionLot: oObject.InspectionLot
                    },
                    success: function (oData, response) {
                        oView.setBusy(false)
                        // oApi.refreshTable()

                        try {
                            that.showMessages(that.buildMessages(JSON.parse(response.data.__batchResponses[0].__changeResponses[0].headers["sap-message"])))
                        } catch (error) {
                            that.showMessages(that.buildMessages(JSON.parse(response.headers["sap-message"])))
                        }

                        // let oReturn = JSON.parse(response.headers["sap-message"])

                        // switch (oReturn.severity) {
                        //     case 'error':
                        //         sap.m.MessageBox.error(oReturn.message)
                        //         break;
                        //     case 'success':
                        //         sap.m.MessageBox.success(oReturn.message)
                        //         break;
                        //     case 'warning':
                        //         sap.m.MessageBox.alert(oReturn.message)
                        //         break;
                        //     default:
                        //         break;
                        // }

                    },
                    error: function (error) {
                        oView.setBusy(false)
                        // oApi.refreshTable()
                    }
                }
            )
        }
    };
});