import { types, destroy, getRoot } from "mobx-state-tree";
import DeviceInfo from "react-native-device-info";
import { Customer } from "./CustomerStore";
import { assignUUID } from "./Utils";
import {
  editFields,
  openAndSyncDB,
  saveSnapshotToDB,
  syncDB,
} from "./DbFunctions";

let db = openAndSyncDB("receipts", true);
let customerDB = openAndSyncDB("customers");
// let rowsOptions = {};

let replicationHandler = null;

export const ReceiptLine = types
  .model("ReceiptLine", {
    _id: types.identifier(),
    item: types.string, // identifier item
    item_name: types.maybe(types.string), // history purposes
    sold_by: types.optional(types.string, ""),
    category: types.optional(types.string, ""),
    translation_text: types.optional(types.string, ""),
    price: types.number,
    qty: types.number,
    commission_details: types.optional(types.string, "[]"),
    discount_rate: types.optional(types.number, 0),
    tax: types.optional(types.string, "[]"),
    discountType: types.optional(types.string, "percentage"),
  })
  .preProcessSnapshot(snapshot => assignUUID(snapshot, "ReceiptLine"))
  .views(self => ({
    get total() {
      if (self.discount_rate > 0) {
        if (self.discountType === "percentage") {
          return (
            self.price * self.qty -
            self.price * self.qty * (self.discount_rate / 100)
          );
        } else if (self.discountType === "fixDiscount") {
          return self.price * self.qty - self.discount_rate;
        }
      }
      return self.price * self.qty;
    },
    get tax_total() {
      let total = 0;
      let taxValue = JSON.parse(self.tax);
      for (let x = 0; x < taxValue.length; x += 1){
        total = total + ((taxValue[x].tax_rate / 100) * self.total);
      }
      return total;
    },
  }))
  .actions(self => ({
    setQuantity(qty) {
      self.qty = qty;
    },
    setPrice(price) {
      self.price = price;
    },
    setCommissionDetails(values) {
      self.commission_details = values;
    },
    changeCommissionStatus(name) {
      let commission_details = JSON.parse(self.commission_details);
      for (let i = 0; i < commission_details.length; i++) {
        if (commission_details[i].commission_attendant_name === name) {
          commission_details[i].status = true;
        }
      }
      self.setCommissionDetails(JSON.stringify(commission_details));
    },
    setDiscountRate(amount, discountType) {
      self.discount_rate = amount;
      self.discountType = discountType;
    },

    edit(data) {
      editFields(self, data);
    },
    delete() {
      getRoot(self).deleteLine(self);
    },
  }));

export const Receipt = types
  .model("Receipt", {
    _id: types.identifier(),
    date: types.optional(types.Date, Date.now),
    status: types.optional(
      types.enumeration("Status", [
        "current",
        "completed",
        "draft",
        "cancelled",
      ]),
      "draft",
    ),
    reason: types.optional(types.string, ""),
    customer: types.string,
    lines: types.optional(types.array(ReceiptLine), []),
    discountName: types.optional(types.string, ""),
    discount: types.optional(types.string, ""),
    discountValue: types.optional(types.number, 0),
    receiptNumber: types.optional(types.number, 0),
    vatNumber: types.optional(types.string, ""),
    ticketNumber: types.optional(types.number, 0),
    hasTailOrder: types.optional(types.boolean, false),
    discountType: types.optional(types.string, "percentage"),
    taxesValue: types.optional(types.string, ""),
    taxesAmount: types.optional(types.number, 0),
    shift: types.optional(types.string, ""),
    deviceId: types.optional(types.string, DeviceInfo.getDeviceId()),
    dateUpdated: types.optional(types.Date, Date.now),
    syncStatus: types.optional(types.boolean, false),
    roundOff: types.optional(types.boolean, false),
    attendant: types.optional(types.string, ""),
    totalAmount: types.optional(types.number, 0),
    usePoints: types.optional(types.boolean, false),
    points: types.optional(types.number, 0),
    mobileNumber: types.optional(types.string, ""),
    loyalty: types.optional(types.number, 0),
    orderType: types.optional(
      types.enumeration("OrderType", [
        "Dine-in",
        "Takeaway",
        "Delivery",
        "Online",
        "Family",
        "None",
      ]),
      "None",
    ),
  })
  .preProcessSnapshot(snapshot => assignUUID(snapshot, "Receipt"))
  .views(self => ({
    get grandTotal() {
      if (self.lines.length !== 0) {
        let total = 0;
        for (let i = 0; i < self.lines.length; i++) {
          total = total + self.lines[i].total;
        }

        return total;
      }
      return 0;
    },

    get discounts() {
      let total = 0;
      if (self.lines.length !== 0) {
        for (let i = 0; i < self.lines.length; i++) {
          if (self.lines[i].discount_rate > 0) {
            if (self.lines[i].discountType === "percentage") {
              total +=
                self.lines[i].price *
                self.lines[i].qty *
                (self.lines[i].discount_rate / 100);
            } else if (self.lines[i].discountType === "fixDiscount") {
              total += self.lines[i].discount_rate;
            }
          }
        }
      }
      if (self.discountType === "percentage") {
        return self.discountValue * self.grandTotal + total;
      } else if (self.discountType === "fixDiscount") {
        return self.discountValue + total;
      }
    },
    get netTotal() {
      let discountValue = self.discountValue;
      if (self.discountType === "percentage") {
        discountValue = discountValue * self.grandTotal;
      }
      let netTotal = self.grandTotal - discountValue;

      if (netTotal <= 0) {
        netTotal = 0;
      }
      if(self.usePoints){
        netTotal -= self.points
      }
      return netTotal;
    },
    get grandQuantity() {
      if (self.lines.length !== 0) {
        let total = 0;
        for (let i = 0; i < self.lines.length; i++) {
          const { qty } = self.lines[i];
          total = total + qty;
        }
        return total;
      }
      return 0;
    },
    get subtotal() {
      if (self.lines.length !== 0) {
        let total = 0;
        for (let i = 0; i < self.lines.length; i++) {
          total = total + self.lines[i].total;
        }
        return total;
      }
      return 0;
    },
    get get_tax_total() {
      if (self.lines.length !== 0) {
        let total = 0;
        for (let i = 0; i < self.lines.length; i++) {
          total = total + self.lines[i].total;
        }

        return parseFloat(total, 10) * (parseFloat(self.taxesValue, 10) / 100);
      }
      return 0;
    },

    get get_tax_total_based_on_each_item() {
      if (self.lines.length !== 0) {
        let total = 0;
        for (let i = 0; i < self.lines.length; i++) {
          total = total + self.lines[i].tax_total;
        }

        return total;
      }
      return 0;
    },
    get linesLength() {
      return self.lines.length;
    },
      get taxesValues(){
      let taxObjectInReceipt = [];

        for (let x = 0; x < self.lines.length; x += 1){

            let taxObjectFromLine = JSON.parse(self.lines[x].tax);
            for (let ii = 0; ii < taxObjectFromLine.length; ii += 1) {
                let status = false;
                for (let i = 0; i < taxObjectInReceipt.length; i += 1){
                    if (taxObjectInReceipt[i].name === taxObjectFromLine[ii].tax_type) {
                        status = true;
                        taxObjectInReceipt[i].totalAmount += (taxObjectFromLine[ii].tax_rate / 100) * (self.lines[x].qty * self.lines[x].price);
                    }
                }
                if (!status){
                    taxObjectInReceipt.push({
                        name: taxObjectFromLine[ii].tax_type,
                        totalAmount: (taxObjectFromLine[ii].tax_rate / 100) * (self.lines[x].qty * self.lines[x].price),
                        translation: taxObjectFromLine[ii].tax_translation
                    });
                }
            }
        }
        return taxObjectInReceipt;
      },
    get getOrderTypesTotal() {
      if (self.lines.length !== 0) {
        let totals = {
          dineInTotal: 0,
          takeawayTotal: 0,
          deliveryTotal: 0,
          onlineTotal: 0,
          familyTotal: 0,
        };
        for (let i = 0; i < self.lines.length; i++) {
          const { orderType, price, qty } = self.lines[i];
          if (orderType === "Dine-in") {
            totals.dineInTotal = totals.dineInTotal + price * qty;
          } else if (orderType === "Takeaway") {
            totals.takeawayTotal = totals.takeawayTotal + price * qty;
          } else if (orderType === "Delivery") {
            totals.deliveryTotal = totals.deliveryTotal + price * qty;
          } else if (orderType === "Online") {
            totals.onlineTotal = totals.onlineTotal + price * qty;
          } else if (orderType === "Family") {
            totals.familyTotal = totals.familyTotal + price * qty;
          }
        }
        return totals;
      }
      return 0;
    },
  }))
  .actions(self => ({
    postProcessSnapshot(snapshot) {
      saveSnapshotToDB(db, snapshot);
    },
    edit(data) {
      editFields(self, data);
    },
      setMobileNumber(mobileNumber) {
      console.log("SET MOBILE NUMBER")
      console.log(mobileNumber)

        self.mobileNumber = mobileNumber
      },
      setPoints(points) {
        self.points = points
      }, setLoyalty(points) {
        self.loyalty = points
      },
      setUsePoints(usePoints) {
        self.usePoints = usePoints
      },
    changeTaxesAmount(taxAmount) {
      self.taxesAmount = taxAmount;
    },
    changeTaxes(taxAmount) {
      self.taxesValue = taxAmount ? taxAmount : "0";
    },
    changeStatusCommission(name) {
      for (let i = 0; i < self.lines.length; i += 1) {
        let objectReceipt = JSON.parse(self.lines[i].commission_details);
        for (let x = 0; x < objectReceipt.length; x += 1) {
          if (objectReceipt[x].commission_attendant_name === name) {
            self.lines[i].changeCommissionStatus(name);
          }
        }
      }
    },
    setOrderType(orderType) {
      self.orderType = orderType;
    },
    setVatNumber(vatNumber) {
      self.vatNumber = vatNumber;
    },
      setTicketNumber(ticketNumber) {
      self.ticketNumber = ticketNumber;

    },
      setTotalAmount(totalAmount) {

      self.totalAmount = totalAmount;
    },
      setHasTailOrder(hasTailorder) {
      self.hasTailOrder = hasTailorder;
    },
    setRoundOff(roundOff) {
      self.roundOff = roundOff;
    },
    add(line, isStackItem) {
      let resLine = null;

      if (isStackItem) {
        const lastItemId = self.lines.length - 1;
        if (lastItemId >= 0) {
          if (self.lines[lastItemId].item === line.item) {
            resLine = self.lines[lastItemId];
          }
        }
      } else {
        resLine = self.lines.find(
          findLine =>
            findLine.item === line.item && findLine.price === line.price,
        );
      }

      if (resLine) {
        resLine.qty = resLine.qty + line.qty;
      } else {
        self.lines.push(line);
      }

      return self.lines.length - 1;
    },
    cancelDiscount() {
      self.discount = "";
      self.discountName = "";
      self.discountValue = 0;
      self.discountType = "percentage";
    },
    addReceiptDiscount(discount) {
      if (discount.percentageType === "percentage") {
        self.discountName = discount.name;
        self.discount = discount._id;
        self.discountValue = discount.value / 100;
        self.discountType = discount.percentageType;
      } else if (discount.percentageType === "fixDiscount") {
        self.discountName = discount.name;
        self.discount = discount._id;
        self.discountValue = discount.value;
        self.discountType = discount.percentageType;
      }
    },
    addOnTheFlyReceiptDiscount(discount) {
      if (discount.percentageType === "percentage") {
        self.discount = "";
        self.discountName = "On The Fly Discount";
        self.discountValue = discount.value / 100;
        self.discountType = discount.percentageType;
      } else if (discount.percentageType === "fixDiscount") {
        self.discount = "";
        self.discountName = "On The Fly Discount";
        self.discountValue = discount.value;
        self.discountType = discount.percentageType;
      }
    },
    find(id) {
      return self.lines.filter(line => line._id === id)[0];
    },
    setShift(shift) {
      self.shift = shift;
    },
    setDeviceId(id) {
      self.deviceId = id;
    },
    deleteLine(line) {
      const index = self.lines.indexOf(line);

      self.lines.splice(index, 1);
    },
    delete() {
      ReceiptStore.delete(self); // Reference
    },
    clear() {
      // Yay!
      self.lines.splice(0, self.lines.length);
    },
    setAttendant(attendant) {
      self.attendant = attendant;
    },
    completed() {
      self.status = "completed";
    },
      setDate(date) {
      self.date = date;
    },
    cancelled(obj) {
      self.status = "cancelled";
      self.dateUpdated = Date.now();
      self.syncStatus = false;
    },
    changeReason(reasonVal) {
      self.reason = reasonVal;
    },
    changeStatus() {
      // self.dateUpdate = Date.now;
      self.syncStatus = true;
    },
    setCancel(reason) {
      self.reason = reason;
      self.status = "cancelled";
      self.dateUpdated = Date.now();
      self.syncStatus = false;
    },
  }));

const Store = types
  .model("ReceiptStore", {
    rows: types.optional(types.array(types.reference(Receipt)), []),
    defaultCustomer: types.optional(types.reference(Customer), ""),
    defaultReceipt: types.maybe(types.reference(Receipt)),
    previousReceipt: types.maybe(types.reference(Receipt)),
    selectedLine: types.maybe(types.reference(ReceiptLine)),
    lastScannedBarcode: types.optional(types.string, ""),
    commissions: types.optional(types.string, "[]"),
  })
  .actions(self => ({
    initSync(session) {
      replicationHandler = syncDB(db, "receipts", session);
      replicationHandler.on("complete", function() {
        if (self.rows.length === 0) {
          // self.getFromDb(20);
        }
      });
    },
    destroyDb() {
      self.defaultCustomer = "";
      self.defaultReceipt = null;
      self.selectedLine = null;
      self.lastScannedBarcode = "";

      db.destroy().then(function() {
        self.clearRows();
        db = openAndSyncDB("receipts", true);
        // rowsOptions = {};
      });
    },
    clearRows() {
      self.rows.clear();
    },
    emptyCommissions() {
      self.commissions = "[]";
    },
    addCommissions(objectCommission) {
      const cat = JSON.parse(self.commissions);
      cat.push(objectCommission);
      self.commissions = JSON.stringify(cat);
    },
    updateCommissions(obj) {
      if (obj) {
        let existing = false;
        let objectLength = JSON.parse(self.commissions);

        for (let i = 0; i < objectLength.length; i += 1) {
          if (obj.commission_attendant_name === objectLength[i].name) {
            objectLength[i].amount =
              parseFloat(objectLength[i].amount, 10) +
              parseFloat(obj.commission_amount, 10);
            objectLength[i].status = obj.status;
            existing = true;
            self.commissions = JSON.stringify(objectLength);
          }
        }
        if (!existing) {
          self.addCommissions({
            name: obj.commission_attendant_name,
            amount: parseFloat(obj.commission_amount, 10),
            status: obj.status,
          });
        }
      }
    },
    updateCommissionsStatus(obj) {
      if (obj) {
        let objectLength = JSON.parse(self.commissions);
        for (let i = 0; i < objectLength.length; i += 1) {
          if (obj.name === objectLength[i].name) {
            objectLength[i].status = true;
            self.commissions = JSON.stringify(objectLength);
          }
        }
      }
    },
    setPreviuosReceiptToNull() {
      self.previousReceipt = null;
    },
    setPreviousReceipt(obj) {
      self.previousReceipt = obj;
    },
    setCustomer(customer) {
      self.defaultCustomer = customer;
    },
    setReceipt(receipt) {
      self.defaultReceipt = receipt;
    },

    async setDefaultCustomer() {
      return await customerDB
        .find({
          selector: {
            name: { $eq: "Default customer" },
          },
        })
        .then(result => {
          const { docs } = result;
          if (docs.length === 0) {
            const newCustomer = Customer.create({
              name: "Default customer",
              email: "default@bai.ph",
              phoneNumber: "09213887721",
              note: "Default note",
            });
            self.setCustomer(newCustomer);
          } else {
            const customer = Customer.create({
              _id: docs[0]._id,
              name: docs[0].name,
              email: docs[0].email,
              phoneNumber: docs[0].phoneNumber,
              note: docs[0].note,
            });
            self.setCustomer(customer);
          }
          return Promise.resolve("Success");
        });
    },
    setReceiptLine(line) {
      self.selectedLine = line;
    },
    add(data) {
      self.rows.push(data);
    },
    findReceipt(id) {
      let obj = self.rows.find(data => {
        return data._id === id;
      });

      if (obj) {
        return obj;
      } else {
        db.get(id).then(doc => {
          return Receipt.create(JSON.parse(JSON.stringify(doc)));
        });
      }
      return null;
    },
    delete(row) {
      const index = self.rows.indexOf(row);
      self.rows.splice(index, 1);
      destroy(row);
    },
    newReceipt() {
      self.numberOfReceipts().then(response => {
        const newReceipt = Receipt.create({
          status: "current",
          customer: self.defaultCustomer._id,
          receiptNumber: parseInt(response, 10) + 1,
          dateUpdated: Date.now(),
          syncStatus: false,
        });
        self.setReceipt(newReceipt);
      });
    },
    getReceiptsForItemSalesReport(date) {
      return new Promise((resolve, reject) => {
        db
          .find({
            selector: {
              date: {
                $regex: `.*${Date.parse(new Date(date).toDateString())}.*`,
              },
              status: { $eq: "completed" },
            },
          })

          .then(result => {
            const { docs } = result;
            return resolve(docs);
          });
      });
    },

    currentReceipt(tax) {
      if (!self.defaultReceipt) {
        db
          .find({
            selector: {
              status: { $eq: "current" },
            },
          })
          .then(async result => {
            const { docs } = result;
            let receiptNumber = await self.numberOfReceipts();
            // if no docs
            if (docs.length === 0) {
              const newReceipt = Receipt.create({
                status: "current",
                taxesValue: tax ? tax : "0",
                customer: self.defaultCustomer._id,
                receiptNumber: parseInt(receiptNumber, 10) + 1,
                dateUpdated: Date.now(),
                syncStatus: false,
              });

              self.setReceipt(newReceipt);
            } else {
              const receipt = Receipt.create({
                _id: docs[0]._id,
                date: Date.parse(new Date(docs[0].date).toDateString()),
                status: docs[0].status,
                reason: docs[0].reason,
                customer: docs[0].customer,
                taxesValue:
                  parseFloat(docs[0].taxesValue) > 0 ? docs[0].taxesValue : tax,
                taxesAmount: docs[0].taxesAmount > 0 ? docs[0].taxesAmount : 0,
                discount: docs[0].discount,
                discountName: docs[0].discountName,
                  vatNumber: docs[0].vatNumber,
                  ticketNumber: docs[0].ticketNumber,
                  hasTailOrder: docs[0].hasTailOrder,
                  totalAmount: docs[0].totalAmount,
                deviceId: docs[0].deviceId,
                discountValue: docs[0].discountValue,
                discountType: docs[0].discountType,
                receiptNumber: docs[0].receiptNumber,
                dateUpdated: docs[0].dateUpdated,
                mobileNumber: docs[0].mobileNumber,
                points: docs[0].points,
                usePoints: docs[0].usePoints,
                syncStatus: docs[0].syncStatus,
                attendant: docs[0].attendant,
              });
              const { lines } = docs[0];
              Object.keys(lines).map(key => {
                let valueOfLine = lines[key];
                if (key === "tax" && lines[key] === 0){
                    valueOfLine = "[]";
                }
                receipt.add(valueOfLine);
              });
              self.setReceipt(receipt);
            }
            return self.defaultReceipt;
          });
      }
      if (self.rows.length === 0) {
        self.getFromDb(20);
      }
    },
    unselectReceiptLine() {
      self.selectedLine = null;
    },
    setLastScannedBarcode(barcodeValue) {
      self.lastScannedBarcode = barcodeValue;
    },
    getShiftReceipts(shift) {
      return new Promise((resolve, reject) => {
        db
          .find({
            selector: {
              shift: { $regex: `.*${shift}.*` },
            },
          })
          .then(result => {
            const { docs } = result;
            return resolve(docs);
          });
      });
    },
    async getFromDb(numberRows) {
      let maximumReceiptNumber = (await self.numberOfReceipts()) - 1;
      let minimumReceiptNumber = maximumReceiptNumber - 20;

      await db
        .find({
          selector: {
            receiptNumber: {
              $gt: minimumReceiptNumber,
              $lte: maximumReceiptNumber,
            },
          },
        })
        .then(async result => {
          if (result && result.docs.length > 0) {
            for (let x = 0; x < result.docs.length; x++) {
              const doc = result.docs[x];
              const receiptObj = Receipt.create({
                _id: doc._id,
                date: Date.parse(new Date(doc.date).toDateString()),
                status: doc.status,
                reason: doc.reason,
                customer: doc.customer,
                taxesValue: doc.taxesValue.toString(),
                taxesAmount: doc.taxesAmount > 0 ? doc.taxesAmount : 0,
                receiptNumber: doc.receiptNumber,
                vatNumber: doc.vatNumber,
                ticketNumber: doc.ticketNumber,
                hasTailOrder: doc.hasTailOrder,
                totalAmount: doc.totalAmount,
                mobileNumber: doc.mobileNumber,
                points: doc.points,
                usePoints: doc.usePoints,
                discountName: doc.discountName,
                discount: doc.discount,
                deviceId: doc.deviceId,
                discountValue: doc.discountValue,
                discountType: doc.discountType,
                dateUpdated: doc.dateUpdated,
                syncStatus: doc.syncStatus,
                attendant: doc.attendant,
              });
              Object.keys(doc.lines).map(key => {
                  let valueOfLine = doc.lines[key];
                  if (key === "tax" && doc.lines[key] === 0){
                      valueOfLine = "[]";
                  }
                  receiptObj.add(valueOfLine);
              });
              self.add(receiptObj);
            }
          }
        });
    },
    async find(key) {
      return await db.get(key).then(receipt => {
        const receiptObject = Receipt.create({
          _id: receipt._id,
          date: receipt.date,
          status: receipt.status,
          customer: receipt.customer,
          taxesValue:
            receipt.taxesValue !== undefined || receipt.taxesValue !== null
              ? receipt.taxesValue
              : "0",
          taxesAmount: receipt.taxesAmount > 0 ? receipt.taxesAmount : 0,
            vatNumber: receipt.vatNumber,
            ticketNumber: receipt.ticketNumber,
            hasTailOrder: receipt.hasTailOrder,
            totalAmount: receipt.totalAmount,
            mobileNumber: receipt.mobileNumber,
            points: receipt.points,
            usePoints: receipt.usePoints,
            discountName: receipt.discountName,
          discount: receipt.discount,
          deviceId: receipt.deviceId,
          discountType: receipt.discountType,
          discountValue: receipt.discountValue,
          receiptNumber: receipt.receiptNumber,
          dateUpdated: receipt.dateUpdated,
          syncStatus: receipt.syncStatus,
          attendant: receipt.attendant,
        });
        Object.keys(receipt.lines).map(index => {
            let valueOfLine = receipt.lines[index];
            if (index === "tax" && receipt.lines[index] === 0){
                valueOfLine = "[]";
            }
            receiptObject.add(valueOfLine);
        });
        return Promise.resolve(receiptObject);
      });
    },
    numberOfReceipts() {
      return new Promise((resolve, reject) => {
        db.allDocs().then(entries => {
          return resolve(entries.total_rows);
        });
      });
    },
  }));

const ReceiptStore = Store.create({});

export default ReceiptStore;
