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

        if (id === "new") {
          this._isNewBook = true;
          const oContext = this._libraryModelV2.createEntry("/Books");
          this.getView().setBindingContext(oContext, "LibraryODataV2Model");
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

          if (key === "Rating") {
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

      onDelete() {
        const sPath = this.getView().getBindingContext("LibraryODataV2Model")?.getPath();

        if (!sPath || this._isNewBook) {
          return;
        }

        MessageBox.confirm(this._resourceBundle.getText("deleteConfirmMessage"), {
          onClose: (action) => {
            if (action === MessageBox.Action.YES) {
              this._libraryModelV2.remove(sPath, {
                success: () => {
                  MessageToast.show(this._resourceBundle.getText("deleteSuccessMessage"));
                  this._router.navTo("RouteMain", {}, true);
                },
                error: () => MessageBox.error(this._resourceBundle.getText("deleteErrorMessage")),
              });
            }
          },
        });
      },

      onCancelBookDialog() {
        this._viewModel.setProperty("/bookForm", null);
        this._addEditODataV2BookDialog.close();
      },

      onConfirmBook() {
        if (!this._validateAddEditBookDialog()) {
          return;
        }

        const data = this._viewModel.getProperty("/bookForm");

        const payload = {
          Title: data.fields.Title.value,
          Description: data.fields.Description.value,
          PublishDate: data.fields.PublishDate.dateValue,
          PageCount: parseInt(data.fields.PageCount.value, 10),
          Rating: parseInt(data.fields.Rating.value, 10),
          Price: parseFloat(data.fields.Price.value),
          Available: !!data.fields.Available.value,
          AuthorID: data.fields.AuthorID.value ? parseInt(data.fields.AuthorID.value, 10) : null,
          CategoryID: data.fields.CategoryID.value ? parseInt(data.fields.CategoryID.value, 10) : null,
        };

        const successHandler = () => {
          MessageToast.show(
            this._resourceBundle.getText(data.mode === "create" ? "createSuccessMessage" : "saveSuccessMessage"),
          );
          this._addEditODataV2BookDialog.close();
        };

        const errorHandler = () => {
          MessageBox.error(
            this._resourceBundle.getText(data.mode === "create" ? "createErrorMessage" : "saveErrorMessage"),
          );
        };

        if (data.mode === "create") {
          payload.ID = parseInt(data.fields.ID.value, 10);

          this._libraryModelV2.create("/Books", payload, {
            success: successHandler,
            error: errorHandler,
          });
        }

        if (data.mode === "edit") {
          this._libraryModelV2.update(data.bookPath, payload, {
            success: successHandler,
            error: errorHandler,
          });
        }
      },
    });
  },
);
