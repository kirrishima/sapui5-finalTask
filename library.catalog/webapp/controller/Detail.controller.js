sap.ui.define(
  ["./BaseController", "sap/ui/model/json/JSONModel", "sap/ui/core/library", "sap/m/MessageBox", "sap/m/MessageToast"],
  /**
   * @param {typeof import("sap/ui/core/mvc/Controller").default} BaseControllerr
   * @param {typeof import("sap/ui/model/json/JSONModel").default} JSONModel
   * @param {typeof import("sap/ui/core/library").default} coreLibrary
   * @param {typeof import("sap/m/MessageBox").default} MessageBox
   * @param {typeof import("sap/m/MessageToast").default} MessageToast
   */
  (BaseControllerr, JSONModel, coreLibrary, MessageBox, MessageToast) => {
    "use strict";
    const ValueState = coreLibrary.ValueState;

    return BaseControllerr.extend("library.catalog.controller.Detail", {
      onInit() {
        /** @type {import("sap/ui/model/odata/v2/ODataModel").default} */
        this._libraryModelV2 =
          /** @type {import("sap/ui/model/odata/v2/ODataModel").default} */ this.getOwnerComponent().getModel(
            "LibraryODataV2Model",
          );

        this._viewModel = new JSONModel({ bookForm: null, editable: false });
        this.getView().setModel(this._viewModel, "viewModel");
        this._resourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
        this._router = this.getOwnerComponent().getRouter();
        this._router.getRoute("RouteDetail").attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched(event) {
        const id = event.getParameter("arguments").BookID;

        if (id == null) {
          return;
        }

        const appViewModel = this.getView().getModel("appView");
        if (appViewModel.getProperty("/layout") !== "MidColumnFullScreen") {
          appViewModel.setProperty("/layout", "TwoColumnsMidExpanded");
        }

        if (this._pendingCreateContext) {
          this._libraryModelV2.deleteCreatedEntry(this._pendingCreateContext);
          this._pendingCreateContext = null;
        }

        this._isNewBook = id === "new";

        if (id === "new") {
          this.getView().unbindElement("LibraryODataV2Model");

          const context = this._libraryModelV2.createEntry("/Books", { properties: { ID: null } });
          this._pendingCreateContext = context;

          this.getView().setBindingContext(context, "LibraryODataV2Model");
          this._viewModel.setProperty("/bookForm", null);
          return;
        }

        const bookPath = this._libraryModelV2.createKey("/Books", {
          ID: Number(id),
        });

        this.getView().bindElement({
          path: bookPath,
          model: "LibraryODataV2Model",
          parameters: { expand: "Author,Category" },
          events: {
            dataReceived: (event) => {
              const data = event.getParameter("data");
              const error = event.getParameter("error");

              if (error || !data) {
                this._router.navTo("RouteMain", {}, true);
                MessageToast.show(this._resourceBundle.getText("bookNotFoundMessage"), { duration: 3000 });
              }
            },
          },
        });
      },

      _formatDateForForm(date) {
        if (!date) return "";
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
      },

      _getEmptyBookForm(mode, entity) {
        const data = entity || {};

        const field = (value, required = false) => ({
          value: value ?? "",
          valueState: "None",
          required,
        });

        return {
          mode,
          bookPath: null,
          fields: {
            ID: field(data.ID, true),
            Title: field(data.Title, true),
            Description: field(data.Description),
            PublishDate: {
              value: "",
              valueState: "None",
              required: true,
              dateValue: data.PublishDate ? new Date(data.PublishDate) : null,
            },
            PageCount: field(data.PageCount != null ? String(data.PageCount) : "", true),
            Rating: field(data.Rating != null ? String(data.Rating) : "", true),
            Price: field(data.Price != null ? String(data.Price) : "", true),
            Available: field(data.Available ?? false),
            AuthorID: field(data.AuthorID, false),
            CategoryID: field(data.CategoryID, false),
          },
        };
      },

      async onEditBook(event) {
        const context = event.getSource().getBindingContext("LibraryODataV2Model");

        if (!context) {
          return;
        }

        this._currentContext = context;

        const bookForm = this._getEmptyBookForm(this._isNewBook ? "create" : "edit", context.getObject());
        bookForm.bookPath = context.getPath();

        this._viewModel.setProperty("/bookForm", bookForm);

        if (!this._addEditODataV2BookDialog) {
          this._addEditODataV2BookDialog = await this.loadFragment({
            name: "library.catalog.view.AddEditBookDialog",
          });
        }

        this._addEditODataV2BookDialog.open();
      },

      _validateAddEditBookDialog() {
        const data = this._viewModel.getProperty("/bookForm");
        let valid = true;

        for (const key in data.fields) {
          const control = data.fields[key];
          const value = control.value;
          const num = Number(value);

          let isValid = !(control.required && !value && !control.dateValue);

          if (key === "ID" && data.mode === "create") {
            isValid = isValid && !isNaN(num) && Number.isInteger(num) && num > 0;
          } else if (key === "Rating") {
            isValid = isValid && !isNaN(num) && num >= 0 && num <= 5;
          } else if (key === "Price") {
            isValid = isValid && !isNaN(num) && num >= 0;
          } else if (key === "PageCount") {
            isValid = isValid && !isNaN(num) && num >= 0;
          } else if (key === "PublishDate" && value) {
            isValid = isValid && !!control.dateValue;
          }

          control.valueState = isValid ? ValueState.None : ValueState.Error;
          valid = valid && isValid;
        }

        if (!valid) {
          this._viewModel.setProperty("/bookForm", data);
        }

        return valid;
      },

      async onDelete() {
        const sPath = this.getView().getBindingContext("LibraryODataV2Model")?.getPath();

        if (!sPath || this._isNewBook) {
          return;
        }

        MessageBox.confirm(this._resourceBundle.getText("deleteConfirmMessage"), {
          onClose: async (action) => {
            if (action === MessageBox.Action.OK) {
              this._libraryModelV2.remove(sPath);

              try {
                await this.applySubmitChanges();
                MessageToast.show(this._resourceBundle.getText("deleteSuccessMessage"));
                this._router.navTo("RouteMain", {}, true);
              } catch (error) {
                console.log(error);
                MessageBox.error(this._resourceBundle.getText("deleteErrorMessage"));
              }
            }
          },
        });
      },

      onCancelBookDialog() {
        if (this._isNewBook && this._pendingCreateContext) {
          this._libraryModelV2.deleteCreatedEntry(this._pendingCreateContext);
          this._pendingCreateContext = null;
        }
        this._viewModel.setProperty("/bookForm", null);
        this._addEditODataV2BookDialog.close();
      },

      onCloseDetailPress() {
        this.getView().getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
        this._router.navTo("RouteMain", {}, true);
      },

      toggleFullScreen() {
        const appViewModel = this.getView().getModel("appView");
        const isFullScreen = appViewModel.getProperty("/actionButtonsInfo/midColumn/fullScreen");

        appViewModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", !isFullScreen);

        if (!isFullScreen) {
          appViewModel.setProperty("/previousLayout", appViewModel.getProperty("/layout"));
          appViewModel.setProperty("/layout", "MidColumnFullScreen");
        } else {
          appViewModel.setProperty("/layout", appViewModel.getProperty("/previousLayout"));
        }
      },

      async onConfirmBook() {
        if (!this._validateAddEditBookDialog()) {
          return;
        }

        const data = this._viewModel.getProperty("/bookForm");

        const setProp = (name, value) =>
          this._libraryModelV2.setProperty(`${data.bookPath}/${name}`, value, this._currentContext);

        if (data.mode === "create") {
          setProp("ID", parseInt(data.fields.ID.value, 10));
        }

        setProp("Title", data.fields.Title.value);
        setProp("Description", data.fields.Description.value);
        setProp("PublishDate", data.fields.PublishDate.dateValue);
        setProp("PageCount", parseInt(data.fields.PageCount.value, 10));
        setProp("Rating", parseInt(data.fields.Rating.value, 10));
        setProp("Price", parseFloat(data.fields.Price.value));
        setProp("Available", !!data.fields.Available.value);
        setProp("AuthorID", data.fields.AuthorID.value ? parseInt(data.fields.AuthorID.value, 10) : null);
        setProp("CategoryID", data.fields.CategoryID.value ? parseInt(data.fields.CategoryID.value, 10) : null);

        try {
          await this.applySubmitChanges();
          MessageToast.show(
            this._resourceBundle.getText(data.mode === "create" ? "createSuccessMessage" : "saveSuccessMessage"),
          );

          if (data.mode === "create") {
            this._pendingCreateContext = null;
            this._router.navTo("RouteDetail", { BookID: data.fields.ID.value }, true);
          }

          this._addEditODataV2BookDialog.close();
        } catch (error) {
          console.error("Error while saving book:", error);
          MessageBox.error(
            this._resourceBundle.getText(data.mode === "create" ? "createErrorMessage" : "saveErrorMessage"),
          );
        }
      },
    });
  },
);
