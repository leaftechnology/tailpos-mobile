import { types } from "mobx-state-tree";
import { sales, listing, login, payment, settings } from "./DefaultValues";
import {
  ModelSales,
  ModelListing,
  ModelLogin,
  ModelPayment,
  ModelSettings,
} from "./Models";

export const Sales = types.model("Sales", ModelSales);
export const Listing = types.model("Listing", ModelListing);
export const Login = types.model("Login", ModelLogin);
export const Payment = types.model("Payment", ModelPayment);
export const Settings = types.model("Settings", ModelSettings);

const StateStore = types
  .model("StateStore", {
    sales_state: types.optional(types.array(Sales), []),
    listing_state: types.optional(types.array(Listing), []),
    login_state: types.optional(types.array(Login), []),
    payment_state: types.optional(types.array(Payment), []),
    settings_state: types.optional(types.array(Settings), []),

    // Value from payment state
    payment_value: types.optional(types.string, "0"),
    amount_due: types.optional(types.string, "0.00"),
    round_off: types.optional(types.string, "0.00"),

    // SalesListing
    orders: types.optional(types.frozen, []),
    orderId: types.optional(types.number, -1),
    currentTable: types.optional(types.number, -1),
    isViewingOrder: types.optional(types.boolean, false),
    isLoadingOrder: types.optional(types.boolean, false),
    currentConfirmation: types.optional(types.string, ""),
    index_value: types.optional(types.number, 0),
    discount_string: types.optional(types.string, "{}"),
    receipt_summary: types.optional(types.string, "{}"),
    scanned_nfc: types.optional(types.string, "{}"),
    payment_types: types.optional(types.string, "[]"),
    payment_amount: types.optional(types.string, "0"),
    balance: types.optional(types.string, "0"),
    customers_pin: types.optional(types.boolean, false),
    customers_pin_value: types.optional(types.string, ""),
    balanceOkay: types.optional(types.boolean, false),
    wallet_balance: types.optional(types.string, ""),
    // Settings
    queueHost: types.optional(types.string, ""),
    hasTailOrder: types.optional(types.boolean, false),
    isEditingQueue: types.optional(types.boolean, false),
    useDescription: types.optional(types.boolean, false),
    isHttps: types.optional(types.boolean, false),
    isCurrencyDisabled: types.optional(types.boolean, false),
    enableOverallTax: types.optional(types.boolean, false),
    deviceId: types.optional(types.string, ""),
    isStackItem: types.optional(types.boolean, false),

    // Is Syncing
    isSyncing: types.optional(types.boolean, false),

    // Change Table
    inTableOptions: types.optional(types.boolean, false),
    newTableNumber: types.optional(types.string, ""),

    // Default Customer
    useDefaultCustomer: types.optional(types.boolean, false),
  })
  .views(self => ({
    get queueOrigin() {
      return `http://${self.queueHost}`;
    },
  }))
  .actions(self => ({
    initializeState() {
      self.sales_state.push(sales);
      self.listing_state.push(listing);
      self.login_state.push(login);
      self.payment_state.push(payment);
      self.settings_state.push(settings);
    },

    restoreDefault() {
      Object.keys(settings).forEach(function(key) {
        Object.keys(self.settings_state[0]).forEach(function(key1) {
          if (key === key1) {
            self.settings_state[0][key1] = settings[key];
          }
        });
      });
    },
    updateScannedNfc(key, value) {
      let scanned_nfc = JSON.parse(self.scanned_nfc);

      scanned_nfc[key] = value;
      self.scanned_nfc = JSON.stringify(scanned_nfc);
    },
    is_customers_pin() {
      self.customers_pin = true;
    },
    is_balance_okay() {
      self.balanceOkay = true;
    },
    is_not_balance_okay() {
      self.balanceOkay = false;
    },
    wallet_balance_add(wallet_balance) {
      self.wallet_balance = wallet_balance.toString();
    },
    is_not_customers_pin() {
      self.customers_pin = true;
    },
    set_receipt_summary(data) {
      self.receipt_summary = data;
    },
    setDefaultValues(containerName, objectValue) {
      let containerNameValue = "";
      if (containerName === "Sales") {
        containerNameValue = self.sales_state;
      } else if (containerName === "Listing") {
        containerNameValue = self.listing_state;
      } else if (containerName === "Login") {
        containerNameValue = self.login_state;
      } else if (containerName === "Payment") {
        containerNameValue = self.payment_state;
      } else if (containerName === "Settings") {
        containerNameValue = self.settings_state;
      }
      Object.keys(containerNameValue[0]).forEach(function(key) {
        Object.keys(objectValue).forEach(function(key1) {
          if (key === key1) {
            containerNameValue[0][key] = objectValue[key1];
          }
        });
      });
    },
    changeValue(fieldName, value, containerName) {
      let containerNameValue = "";
      if (containerName === "Sales") {
        containerNameValue = self.sales_state;
      } else if (containerName === "Listing") {
        containerNameValue = self.listing_state;
      } else if (containerName === "Login") {
        containerNameValue = self.login_state;
      } else if (containerName === "Payment") {
        containerNameValue = self.payment_state;
      } else if (containerName === "Settings") {
        containerNameValue = self.settings_state;
      }

      Object.keys(containerNameValue[0]).forEach(function(key) {
        if (key === fieldName) {
          containerNameValue[0][key] = value;
        }
      });
    },
    resetPaymentTypes() {
      self.payment_types = "[]";
    },

    resetScannedNfc() {
      self.scanned_nfc = "{}";
    },
    addPaymentTypes(obj) {
      let payment_types = JSON.parse(self.payment_types);
      payment_types.push(obj);
      self.payment_types = JSON.stringify(payment_types);
    },
    updatePaymentType(obj) {
      if (obj) {
        let objectLength = JSON.parse(self.payment_types);
        let exists = false;
        let hasAsterisk = false;
        for (let i = 0; i < objectLength.length; i += 1) {
          if (objectLength[i].type.includes("*") && obj.type.includes("*")){
              hasAsterisk = true;
          }
          if (obj.type === objectLength[i].type) {
            objectLength[i].amount = obj.amount;
            exists = true;
          }
        }
        if (!exists && !hasAsterisk) {
          self.addPaymentTypes({
            type: obj.type,
            amount: obj.amount,
              translation_text: obj.translation_text,

          });
        } else {
          self.payment_types = JSON.stringify(objectLength);
        }

        return exists ? false : hasAsterisk;
      }
    },
    removePaymentType() {
      let objectLength = JSON.parse(self.payment_types);
      let filtered_items = objectLength.filter(
        payment_type => payment_type.type !== self.payment_state[0].selected,
      );
      self.payment_types = JSON.stringify(filtered_items);
    },
    setPaymentValue(value) {
      self.payment_value = value;
    },
    set_customers_pin(value) {
      self.customers_pin_value = value;
    },
    setMopAmount(value) {
      self.payment_amount = value;
    },
    setBalance(value) {
      self.balance = value;
    },
    setAmountDue(value) {
      self.amount_due = value;
    },
      setRoundOff(value) {
      self.round_off = value;
    },
    setViewingOrder(isViewingOrder) {
      self.isViewingOrder = isViewingOrder;
    },
    setLoadingOrder(isLoadingOrder) {
      self.isLoadingOrder = isLoadingOrder;
    },
    changeConfirmation(currentConfirmation) {
      self.currentConfirmation = currentConfirmation;
    },
    changeIndex(index) {
      self.index_value = index;
    },
    setOrders(orders) {
      self.orders = orders;
    },
    setOrderId(orderId) {
      self.orderId = orderId;
    },
    setCurrentTable(index) {
      self.currentTable = index;
    },
    setQueueHost(host) {
      self.queueHost = host;
    },
    changeDiscountString(discount) {
      self.discount_string = discount;
    },
    toggleTailOrder() {
      self.hasTailOrder = !self.hasTailOrder;
    },
    hideDeleteDialog() {
      self.sales_state[0].deleteDialogVisible = false;
    },
    hidePriceModal() {
      self.sales_state[0].priceModalVisible = false;
    },
    hideQuantityModal() {
      self.sales_state[0].quantityModalVisible = false;
    },
    hideConfirmOrderModal() {
      self.sales_state[0].confirmOrder = false;
    },
    setQueueEditing() {
      self.isEditingQueue = true;
    },
    setQueueNotEditing() {
      self.isEditingQueue = false;
    },
    setIsSyncing() {
      self.isSyncing = true;
    },
    setIsNotSyncing() {
      self.isSyncing = false;
    },
    toggleUseDescription() {
      self.useDescription = !self.useDescription;
    },
    setInTableOptions() {
      self.inTableOptions = true;
    },
    setInNotTableOptions() {
      self.inTableOptions = false;
    },
    setNewTableNumber(newTableNumber) {
      self.newTableNumber = newTableNumber;
    },
    toggleUseDefaultCustomer() {
      self.useDefaultCustomer = !self.useDefaultCustomer;
    },
    toggleHttps() {
      self.isHttps = !self.isHttps;
    },
    changeIsHttps(status) {
      self.isHttps = status;
    },
    toggleCurrencyDisabled() {
      self.isCurrencyDisabled = !self.isCurrencyDisabled;
    },
    toggleEnableOverallTax() {
      self.enableOverallTax = !self.enableOverallTax;
    },
    setDeviceId(deviceId) {
      self.deviceId = deviceId;
    },
    toggleIsStackItem() {
      self.isStackItem = !self.isStackItem;
    },
    changeCompanyCheckBox(isCurrencyDisabled) {
      self.isCurrencyDisabled = isCurrencyDisabled;
    },
    changeOverallTax(overallTax) {
      self.enableOverallTax = overallTax;
    },
  }));

const Store = StateStore.create({});

export default Store;
