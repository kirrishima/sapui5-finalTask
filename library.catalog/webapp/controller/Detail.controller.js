sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel"],
  /** @param {typeof import("sap/ui/core/mvc/Controller").default} Controller */
  (Controller, JSONModel) => {
    "use strict";

    return Controller.extend("library.catalog.controller.Detail", {
      onInit() {
        /** @type {import("sap/ui/model/odata/v2/ODataModel").default} */
        this._libraryModelV2 =
          /** @type {import("sap/ui/model/odata/v2/ODataModel").default} */ this.getOwnerComponent().getModel(
            "LibraryODataV2Model",
          );

        this._router = this.getOwnerComponent()
          .getRouter()
          .getRoute("RouteDetail")
          .attachMatched(this._onRouteMatched, this);

        this.getView().setModel(new JSONModel({ editable: false }), "viewModel");
      },

      _onRouteMatched(event) {
        const id = event.getParameter("arguments").BookID;

        if (id == null) {
          return;
        }

        const bookPath = this._libraryModelV2.createKey("/Books", {
          ID: Number(id),
        });

        this.getView().bindElement({
          path: bookPath,
          model: "LibraryODataV2Model",
          parameters: { expand: "Author,Category" },
        });
      },
    });
  },
);
