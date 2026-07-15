sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/UIComponent", "sap/m/MessageToast", "sap/m/MessageBox"],
  function (Controller, UIComponent, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("library.catalog.controller.BaseController", {
      getModel(name) {
        return this.getView().getModel(name);
      },
    });
  },
);
