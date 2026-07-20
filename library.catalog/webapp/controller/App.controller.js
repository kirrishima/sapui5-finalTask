sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel"], function (Controller, JSONModel) {
  "use strict";

  return Controller.extend("library.catalog.controller.App", {
    onInit() {
      const appViewModel = new JSONModel({
        layout: "OneColumn",
        previousLayout: "OneColumn",
        actionButtonsInfo: {
          midColumn: { fullScreen: false },
        },
      });

      this.getView().setModel(appViewModel, "appView");
    },

    onStateChange(event) {
      const isNavigationArrow = event.getParameter("isNavigationArrow");
      const layout = event.getParameter("layout");

      this.getView()
        .getModel("appView")
        .setProperty(
          "/actionButtonsInfo/midColumn/fullScreen",
          isNavigationArrow ? false : layout === "MidColumnFullScreen",
        );
    },
  });
});
