sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/model/json/JSONModel", "sap/ui/model/Filter", "sap/ui/model/FilterOperator"],
  /**
   * @param {typeof import("sap/ui/core/mvc/Controller").default} Controller
   * @param {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   * @param {typeof import("sap/ui/model/Filter").default} Filter
   * @param {typeof import("sap/ui/model/FilterOperator").default} FilterOperator
   */
  (Controller, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("library.catalog.controller.Main", {
      /** @this {import("sap/ui/core/mvc/Controller").default} */
      onInit() {
        this._libraryModelV2 = this.getOwnerComponent().getModel("LibraryODataV2Model");
        this._router = this.getOwnerComponent().getRouter();
      },

      onAuthorFilterChange(event) {
        const comboBox = event.getSource();
        const selectedKey = comboBox.getSelectedKey();
        const binding = this.byId("booksTable").getBinding("items");

        let filter = selectedKey
          ? [
              new Filter({
                path: "AuthorID",
                operator: FilterOperator.EQ,
                value1: parseInt(selectedKey, 10),
              }),
            ]
          : [];

        binding.filter(filter);
      },

      onNavToDetails(event) {
        const id = event.getSource().getBindingContext("LibraryODataV2Model")?.getProperty("ID");

        if (id == null) {
          return;
        }

        this._router.navTo("RouteDetail", { BookID: id });
      },
    });
  },
);
