import * as React from "react";
import { Alert } from "react-native";
import { Container } from "native-base";
import SplashScreen from "react-native-splash-screen";
import { ConfirmDialog } from "react-native-simple-dialogs";
import { BluetoothStatus } from "react-native-bluetooth-status";

import { observer, inject } from "mobx-react/native";

import isFloat from "is-float";

import Sales from "@screens/Sales";

// TODO: receipt line (no access here to receipt lines)
import { ReceiptLine } from "../../store/PosStore/ReceiptStore";
import {
  isItemRemarks,
  showToast,
  showToastDanger,
  createReceiptLine,
  showAlert,
} from "../../utils";
import BluetoothSerial from "react-native-bluetooth-serial";

import PriceModalComponent from "@components/PriceModalComponent";
import ConfirmationModalComponent from "@components/ConfirmationModalComponent";
// import SummaryModalComponent from "@components/SummaryModalComponent";
import QuantityModalComponent from "@components/QuantityModalComponent";
import ConfirmOrderModalComponent from "@components/ConfirmOrderModalComponent";
import DiscountSelectionModalComponent from "@components/DiscountSelectionModalComponent";

// TailOrder
import {
  voidLine,
  sendOrder,
  printOrder,
  cancelOrder,
  tailOrderLine,
  changeOrderTable,
  getOrder,
    printOrderVoid,
  orderItemToReceiptItem,
} from "../../services/tailorder";
import {on_print_bill} from "./print_bill";
import { currentLanguage } from "../../translations/CurrentLanguage";
const Sound = require("react-native-sound");
Sound.setCategory("Playback");
const beep = new Sound("beep.mp3", Sound.MAIN_BUNDLE);
import translation from "../.././translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
@inject(
  "itemStore",
  "customerStore",
  "receiptStore",
  "discountStore",
  "categoryStore",
  "paymentStore",
  "printerStore",
  "shiftStore",
  "attendantStore",
  "stateStore",
  "loyaltyStore",
)
@observer
export default class SalesContainer extends React.Component {
  componentWillMount() {
      const { defaultReceipt } = this.props.receiptStore;
      if (defaultReceipt.mobileNumber) {
          this.props.stateStore.changeValue(
              "mobile_number",
              defaultReceipt.mobileNumber,
              "Sales",
          )
      }
      if (defaultReceipt.usePoints) {
          this.props.stateStore.changeValue(
              "useLoyaltyPoints",
              defaultReceipt.usePoints,
              "Sales",
          )
          this.props.loyaltyStore.findNumber(defaultReceipt.mobileNumber).then(result => {
              if(result){
                  if(result.points > 0){
                      this.props.stateStore.changeValue(
                          "currentPoints",
                          result.points,
                          "Sales")
                  } else {
                      this.props.stateStore.changeValue(
                          "useLoyaltyPoints",
                          false,
                          "Sales")
                      showToast("No remaining points");

                  }
              }
          })
      }
      if (defaultReceipt.points) {
          this.props.stateStore.changeValue(
              "points",
              defaultReceipt.points,
              "Sales",
          )
      }
      this.props.stateStore.changeValue(
          "tailOrderPrinting",
          this.props.printerStore.companySettings[0].tailOrderPrinting,
          "Settings",
      );
      this.props.stateStore.changeValue(
          "loyalty",
          this.props.printerStore.companySettings[0].loyalty,
          "Settings",
      );
      this.props.stateStore.changeValue(
          "loyaltyProgram",
          this.props.printerStore.companySettings[0].loyaltyProgram,
          "Settings",
      );


      for (let i = 0; i < this.props.printerStore.rows.length; i += 1) {
          if (this.props.printerStore.rows[i].defaultPrinter) {
              BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
                  .then(() => {
                      this.props.printerStore.setDefaultPrinter({
                          _id: this.props.printerStore.rows[i]._id,
                          name: this.props.printerStore.rows[i].name,
                          macAddress: this.props.printerStore.rows[i].macAddress,
                          defaultPrinter: this.props.printerStore.rows[i].defaultPrinter,
                      });
                  })
                  .catch(() => {

                      BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
                          .then(() => {
                              this.props.printerStore.setDefaultPrinter({
                                  _id: this.props.printerStore.rows[i]._id,
                                  name: this.props.printerStore.rows[i].name,
                                  macAddress: this.props.printerStore.rows[i].macAddress,
                                  defaultPrinter: this.props.printerStore.rows[i]
                                      .defaultPrinter,
                              });
                          })
                          .catch(() => {});
                  });
          }
      }
    this.getBluetoothState();
    this.viewOrders("willMount");
    this.props.categoryStore.setRemarksCategory();
  }

  async getBluetoothState() {
    if (!this.props.stateStore.settings_state[0].tailOrderPrinting) {
      BluetoothStatus.enable(true);
    } else {
        BluetoothStatus.disable(true);

    }
  }

  componentDidMount() {
    // Selected Category Index
    const { selectedCategoryIndex } = this.props.stateStore.sales_state[0];
    const { itemsBasedOnCategorySelected, favorites } = this.props.itemStore;

    if (selectedCategoryIndex === -1) {
      itemsBasedOnCategorySelected("All");
    } else if (selectedCategoryIndex === -2) {
      favorites();
    }

    SplashScreen.hide();
  }

  onItemClick = item => {
    const { changeValue } = this.props.stateStore;
    const { setReceiptLine } = this.props.receiptStore;
    const { defaultReceipt } = this.props.receiptStore;
    const { isStackItem } = this.props.stateStore;
    let line = "";
    if (item.category !== "No Category") {
      const categoryObj = this.props.categoryStore.find(item.category);

      line = createReceiptLine(
        item,
        categoryObj._55 !== null ? categoryObj._55.name : "No Category",
      );
    } else {
      line = createReceiptLine(item, item.category);
    }
    setReceiptLine(line);

    if (item.price <= 0 && !isItemRemarks(item)) {
      changeValue("priceModalVisible", true, "Sales");
    } else {
      defaultReceipt.add(line, isStackItem);
    }
  };

  onBarcodeRead = barcodeValue => {
    const { changeValue } = this.props.stateStore;
    const { searchByBarcode } = this.props.itemStore;
    const { barcodeStatus } = this.props.stateStore.sales_state[0];
    const {
      defaultReceipt,
      setReceiptLine,
      lastScannedBarcode,
      setLastScannedBarcode,
    } = this.props.receiptStore;

    if (barcodeStatus === "idle") {
      if (barcodeValue.toString() !== lastScannedBarcode) {
        setLastScannedBarcode(barcodeValue);

        beep.play();

        searchByBarcode(barcodeValue).then(resultItem => {
          const categoryObj = this.props.categoryStore.find(
            resultItem.category,
          );
          if (resultItem) {
            const line = ReceiptLine.create({
              item: resultItem._id,
              item_name: resultItem.name,
              category: categoryObj.name,
              qty: parseInt(1, 10),
              price: parseFloat(resultItem.price),
              date: Date.now(),
            });
            const lineIndex = defaultReceipt.add(line);
            setReceiptLine(defaultReceipt.lines[lineIndex]);
          } else {
            showToastDanger(strings.NoItemBasedOnTheBarcode);
          }
          changeValue("barcodeStatus", "idle", "Sales");
        });
        changeValue("barcodeStatus", "pending", "Sales");
      }
    }
  };

  onChangeSalesSearchText = text => {
    const { search } = this.props.itemStore;
    search(text);
  };

  onChangeBarcodeScannerInput = text => {
    const { changeValue } = this.props.stateStore;
    changeValue("barcodeScannerInput", text, "Sales");
  };

  searchStatusChange = async bool => {
    const { changeValue } = this.props.stateStore;

    BluetoothStatus.disable(bool);
    BluetoothStatus.enable(!bool);

    this.onCategoryClick(-1);

    changeValue("searchStatus", bool, "Sales");
  };

  onCategoryClick = (id, index) => {
    const { changeValue } = this.props.stateStore;
    const { itemsBasedOnCategorySelected, favorites } = this.props.itemStore;

    changeValue("selectedCategoryIndex", index, "Sales");

    if (index >= 0) {
      changeValue("categoryFilter", true, "Sales");
      changeValue("categoryValue", id, "Sales");
      itemsBasedOnCategorySelected(id);
    } else if (index === -1) {
      changeValue("categoryFilter", false, "Sales");
      itemsBasedOnCategorySelected("All");
    } else if (index === -2) {
      favorites();
    }
  };

  onDeleteClick = () => {
    const { changeValue, isViewingOrder } = this.props.stateStore;

    if (isViewingOrder) {
      showAlert(
        "Error",
        "Unable to clear items. You can either void the line and/or cancel the order.",
        null,
      );
    } else {
      changeValue("deleteDialogVisible", true, "Sales");
    }
  };
  onBillClick = () => {

      on_print_bill(this.props);
  };



  onDeleteReceiptLine = () => {
    const { hideDeleteDialog,changeValue } = this.props.stateStore;
    hideDeleteDialog();
    if (this.props.attendantStore.defaultAttendant.canApprove) {
      const { unselectReceiptLine, defaultReceipt } = this.props.receiptStore;
      unselectReceiptLine();
      defaultReceipt.clear();
      defaultReceipt.setPoints(0)
        changeValue("mobile_number", "", "Sales");
        changeValue("useLoyaltyPoints", false, "Sales");
        changeValue("currentPoints", 0, "Sales");
        changeValue("points", 0, "Sales");
        hideDeleteDialog();
    } else {
      this.props.stateStore.changeConfirmation("AllReceiptLine");
      changeValue("confirmation", true, "Sales");
    }
  };

  onBarcodeClick = () => {
    this.props.stateStore.changeValue("salesListStatus", true, "Sales");
  };

  onCloseClick = text => {
    this.props.stateStore.changeValue("salesListStatus", false, "Sales");
  };

  onDiscountClick = () => {
    const { changeValue } = this.props.stateStore;
    const { defaultReceipt } = this.props.receiptStore;

    if (defaultReceipt.lines.length === 0) {
      Alert.alert(strings.Discount, strings.PleaseAddAnItem, [{ text: "Ok" }]);
    } else {
      changeValue("discountSelection", true, "Sales");
      changeValue("discountSelectionStatus", "On The Fly Discount", "Sales");
    }
  };

  onPaymentClick = text => {
    const { defaultReceipt } = this.props.receiptStore
    if (this.props.stateStore.settings_state[0].loyaltyProgram){
        if (defaultReceipt.mobileNumber){
            this.onPayment();
        } else {
            Alert.alert( "Loyalty", "Do you want to add loyalty?", [
                { text: strings.No, style: "cancel", onPress: this.onPayment },
                { text: strings.Yes },
            ]);
        }

        } else {
        this.onPayment();
    }
  };
    onPayment = () => {
        const { navigate } = this.props.navigation;
        const { defaultShift } = this.props.shiftStore;
        const { setAmountDue, setRoundOff } = this.props.stateStore;
        const { allowRoundOff } = this.props.stateStore.settings_state[0];
        const { defaultAttendant } = this.props.attendantStore;
        const { defaultReceipt } = this.props.receiptStore;
        if (defaultShift.shiftStarted && !defaultShift.shiftEnded) {
            if (defaultShift.attendant === defaultAttendant.user_name) {
                let tax = this.props.stateStore.enableOverallTax
                    ? defaultReceipt.get_tax_total.toFixed(2)
                    : defaultReceipt.get_tax_total_based_on_each_item.toFixed(2);

                let totalPayment = defaultReceipt ? parseFloat(defaultReceipt.netTotal.toFixed(2)) + parseFloat(tax, 10) : 0;
                let roundOffValue = 0;
                if (allowRoundOff){
                    roundOffValue = totalPayment > 0 ? parseFloat(totalPayment % parseInt(totalPayment,10),10).toFixed(2) : 0;

                    if (roundOffValue <= 0.05 ){
                        totalPayment = parseInt(totalPayment,10);
                    } else if (roundOffValue > 0.05 ) {

                        totalPayment = parseInt(totalPayment, 10) + 1;
                    }
                }
                setAmountDue(totalPayment.toString());
                setRoundOff(roundOffValue.toString());
                navigate("Payment", { receipt: true });
            } else {
                showToastDanger(strings.ItIsNotYourShift);
            }
        } else {
            showToastDanger(strings.SetTheShift);
        }
    }
  onBluetoothScan = text => {
    const { changeValue } = this.props.stateStore;
    const { searchByBarcode } = this.props.itemStore;
    const { defaultReceipt, setReceiptLine } = this.props.receiptStore;

    let barcodeValue = text;

    changeValue("barcodeScannerInput", "", "Sales");
    searchByBarcode(barcodeValue).then(result => {
      const categoryObj = this.props.categoryStore.find(result.category);

      if (result) {
        const line = ReceiptLine.create({
          item: result._id,
          item_name: result.name,
          category: categoryObj.name,

          qty: parseInt(1, 10),
          price: parseFloat(result.price),
          date: Date.now(),
        });

        const lineIndex = defaultReceipt.add(line);
        setReceiptLine(defaultReceipt.lines[lineIndex]);

        if (result.price <= 0) {
          changeValue("priceModalVisible", true, "Sales");
        }
      } else {
        showToastDanger(strings.NoItemBasedOnTheBarcode);
      }
    });
  };
  onCancelDiscount(value) {
    const { unsetDiscount } = this.props.discountStore;
    const { defaultReceipt } = this.props.receiptStore;

    unsetDiscount();
    defaultReceipt.cancelDiscount();
  }
  onDiscountChange(discount, index) {
    const { changeValue } = this.props.stateStore;

    changeValue("selectedDiscount", discount, "Sales");
    changeValue("selectedDiscountIndex", index, "Sales");
  }
  onDiscountEdit = val => {
    if (this.props.attendantStore.defaultAttendant.canApprove) {
      this.onDiscountApply(val);
    } else {
      this.props.stateStore.changeDiscountString(JSON.stringify(val));
      this.props.stateStore.changeConfirmation("AllDiscount");
      const { changeValue } = this.props.stateStore;
      changeValue("confirmation", true, "Sales");
    }
  };
  onDiscountApply = val => {
    const { changeValue } = this.props.stateStore;
    const { defaultReceipt } = this.props.receiptStore;
    const { rows, setDiscount } = this.props.discountStore;
    const {
      discountSelectionStatus,
      selectedDiscountIndex,
    } = this.props.stateStore.sales_state[0];

    if (discountSelectionStatus) {
      defaultReceipt.addOnTheFlyReceiptDiscount({
        value: parseFloat(val.onTheFlyDiscountValue, 10),
        percentageType: val.percentageType,
      });
    } else {
      const discount = rows[selectedDiscountIndex];

      setDiscount(discount);
      defaultReceipt.addReceiptDiscount(discount);
    }
    if(this.props.stateStore.sales_state[0].mobile_number){
        const { mobile_number } = this.props.stateStore.sales_state[0]
        if(mobile_number[0] === "0"){
            if(mobile_number.length > 12){
                const {useLoyaltyPoints, points, currentPoints} = this.props.stateStore.sales_state[0]
                const {loyalty} = this.props.stateStore.settings_state[0]
                this.props.loyaltyStore.findNumber(mobile_number).then(result => {
                    if (!result) {
                        this.props.loyaltyStore.add({
                            customer_number: mobile_number,
                            points: 0,
                            loyaltyProgram: loyalty,
                            syncStatus: false,
                        })
                        defaultReceipt.setMobileNumber(mobile_number)
                        defaultReceipt.setLoyalty(loyalty)
                    } else {
                        defaultReceipt.setMobileNumber(mobile_number)
                        defaultReceipt.setLoyalty(result.loyaltyProgram)

                    }
                })

                if(useLoyaltyPoints) {
                    defaultReceipt.setUsePoints(useLoyaltyPoints)
                    if (points <= currentPoints) {
                        if(defaultReceipt.netTotal >= points){
                            defaultReceipt.setPoints(points)
                            changeValue("discountSelection", false, "Sales");
                        } else {
                            showToastDanger("Points must be lesser than or equal to grand total");

                        }

                    } else {
                        showToastDanger("Not enough points");
                    }

                } else {
                    changeValue("discountSelection", false, "Sales");
                }
            } else {
                showToastDanger("Mobile number must be greater than 12 digits")
            }
        } else {
            showToastDanger("Mobile number must start with 0")
        }
    } else {
        defaultReceipt.setMobileNumber("")
        changeValue("discountSelection", false, "Sales");
    }

    // hide modal
  };
  confirmReceiptDeleteDialog() {
    const { hideDeleteDialog } = this.props.stateStore;
    const { deleteDialogVisible } = this.props.stateStore.sales_state[0];

    return (
      <ConfirmDialog
        title={strings.ConfirmDelete}
        message={strings.AreYouSureToDeleteReceiptLines}
        visible={deleteDialogVisible}
        onTouchOutside={hideDeleteDialog}
        positiveButton={{
          title: strings.Yes,
          onPress: this.onDeleteReceiptLine,
        }}
        negativeButton={{
          title: strings.No,
          onPress: hideDeleteDialog,
        }}
      />
    );
  }
  getCurrentBalance = async () => {
      this.props.stateStore.changeValue("useLoyaltyPoints", !this.props.stateStore.sales_state[0].useLoyaltyPoints, "Sales")

      const { mobile_number } = this.props.stateStore.sales_state[0]
      this.props.loyaltyStore.findNumber(mobile_number).then(result => {
          if(result){
              console.log(result)
              if(result.points > 0){
                  this.props.stateStore.changeValue(
                      "currentPoints",
                      result.points,
                      "Sales")
              } else {
                  this.props.stateStore.changeValue(
                      "useLoyaltyPoints",
                      false,
                      "Sales")
                  showToast("No remaining points");

              }
          } else {


              this.props.stateStore.changeValue(
                  "useLoyaltyPoints",
                  false,
                  "Sales")
              showToast("No remaining points");
          }
      })


  }
  discountSelectionDialog() {
    const { rows, selectedDiscount } = this.props.discountStore;

    return (
      <DiscountSelectionModalComponent
          loyalty = {this.props.printerStore.companySettings[0].loyaltyProgram}
        discountData={rows.slice()}
        currentDiscount={selectedDiscount ? selectedDiscount : ""}
        onCancelDiscount={value => this.onCancelDiscount(value)}
        onDiscountChange={(discount, index) =>
          this.onDiscountChange(discount, index)
        }
        selectedDiscount={selectedDiscount ? selectedDiscount : ""}
        discountSelection={
          this.props.stateStore.sales_state.length > 0
            ? this.props.stateStore.sales_state[0].discountSelection
            : ""
        }
        mobile_number={
          this.props.stateStore.sales_state.length > 0
            ? this.props.stateStore.sales_state[0].mobile_number
            : ""
        }
        discountSelectionStatus={
          this.props.stateStore.sales_state.length > 0
            ? this.props.stateStore.sales_state[0].discountSelectionStatus
            : "On The Fly Discount"
        }
          useLoyaltyPoints={
          this.props.stateStore.sales_state.length > 0
            ? this.props.stateStore.sales_state[0].useLoyaltyPoints
            : false
        }
          currentPoints={
          this.props.stateStore.sales_state.length > 0
            ? this.props.stateStore.sales_state[0].currentPoints
            : 0
        }
          points={
          this.props.stateStore.sales_state.length > 0
            ? this.props.stateStore.sales_state[0].points
          : 0
      }
        onClick={() =>
          this.props.stateStore.changeValue("discountSelection", false, "Sales")
        }
        onDiscountEdit={this.onDiscountEdit}
        changeSelectionStatus={value =>
          this.props.stateStore.changeValue(
            "discountSelectionStatus",
            value,
            "Sales",
          )
        }
        changeMobileNumber={value =>
          this.props.stateStore.changeValue(
            "mobile_number",
            value,
            "Sales",
          )
        }

        onChangeCheckBox={async () => {
          await this.getCurrentBalance()
        }}
        changePoints={(value) => this.props.stateStore.changeValue("points", parseInt(value), "Sales")
        }
      />
    );
  }

  onPriceSubmit = value => {
    const { hidePriceModal, changeValue } = this.props.stateStore;
    const {
      selectedLine,
      defaultReceipt,
      unselectReceiptLine,
    } = this.props.receiptStore;

    if (selectedLine) {
      selectedLine.setPrice(value);
      defaultReceipt.add(selectedLine);

      hidePriceModal();
      changeValue("addReceiptLineStatus", false, "Sales");

      // kwan bug(?)
      unselectReceiptLine();
    }
  };

  priceInputDialog() {
    const { hidePriceModal } = this.props.stateStore;
    const { priceModalVisible } = this.props.stateStore.sales_state[0];

    return (
      <PriceModalComponent
        visible={priceModalVisible}
        onClose={hidePriceModal}
        onSubmit={this.onPriceSubmit}
      />
    );
  }

  onQuantityExit = () => {
    const { changeValue, hideQuantityModal } = this.props.stateStore;

    hideQuantityModal();
    changeValue("commissionArray", "[]", "Sales");
  };

  filterSystemUser = e => e.role !== "Cashier" && e.role !== "Owner";

  quantityEditDialog() {
    const { rows } = this.props.attendantStore;
    const { selectedLine } = this.props.receiptStore;
    const {
      commissionArray,
      quantityModalVisible,
    } = this.props.stateStore.sales_state[0];

    let qty = 0;
    let price = 0;
    let taxTotal = 0;
    let soldBy = "";
    let tax = "[]";
    let discount_rate = 0;

    if (selectedLine !== null) {
      qty = selectedLine.qty;
      price = selectedLine.price;
      tax = JSON.parse(selectedLine.tax);
      taxTotal = selectedLine.tax_total;
      soldBy = selectedLine.sold_by;
      discount_rate = selectedLine.discount_rate;
      if (JSON.parse(commissionArray).length === 0) {
        this.props.stateStore.changeValue(
          "commissionArray",
          selectedLine.commission_details,
          "Sales",
        );
      }
    }

    return (
      <QuantityModalComponent
          taxTotal={taxTotal}
        price={price}
        tax={tax}
        quantity={qty}
        soldBy={soldBy}
        discount_rate={discount_rate}
        onClick={this.onQuantityExit}
        visible={quantityModalVisible}
        onSubmit={this.onQuantitySubmit}
        commissionArray={JSON.parse(commissionArray).slice()}
        attendants={rows.slice().filter(this.filterSystemUser)}
        addCommissionArray={objectData => this.addCommissionToArray(objectData)}
      />
    );
  }

  addCommissionToArray(objectData) {
    const { changeValue } = this.props.stateStore;
    const { commissionArray } = this.props.stateStore.sales_state[0];

    let commissions = JSON.parse(commissionArray);

    let commissionValue = commissions.filter(
      attendant =>
        attendant.commission_attendant_id ===
        objectData.commission_attendant_id,
    );

    if (commissionValue.length === 0) {
      commissions.push(objectData);
      changeValue("commissionArray", JSON.stringify(commissions), "Sales");
    } else {
      showToastDanger(strings.AttendantAlreadyAdded);
    }
  }

  closeSummary = () => {
    const { changeValue } = this.props.stateStore;
    const { setPreviuosReceiptToNull } = this.props.receiptStore;

    setPreviuosReceiptToNull();
    changeValue("visibleSummaryModal", false, "Sales");
  };

  // summaryDialog() {
  //   const { previousReceipt } = this.props.receiptStore;
  //   const { enableOverallTax } = this.props.stateStore;
  //   const { cash, change } = this.props.stateStore.sales_state[0];
  //   const { countryCode } = this.props.printerStore.companySettings[0];
  //   console.log(this.props.stateStore.sales_state[0])
  //   return (
  //     <SummaryModalComponent
  //       enableOverallTax={enableOverallTax}
  //       cash={cash > 0 ? cash : 0}
  //       change={change > 0 ? change : 0}
  //       onClose={this.closeSummary}
  //       visibility={previousReceipt ? false : false}
  //       lines={previousReceipt ? previousReceipt.lines.slice() : []}
  //       details={
  //         previousReceipt && previousReceipt.lines ? previousReceipt : {}
  //       }
  //       currency={countryCode !== undefined ? countryCode : "PHP"}
  //     />
  //   );
  // }

  onQuantitySubmit = quantity => {
    if (
      this.props.attendantStore.defaultAttendant.canApprove ||
      parseFloat(quantity.discount) === 0
    ) {
      this.setEditedFigures(quantity);
    } else if (
      !this.props.attendantStore.defaultAttendant.canApprove &&
      parseFloat(quantity.discount) > 0
    ) {
      this.props.stateStore.changeDiscountString(JSON.stringify(quantity));
      this.props.stateStore.changeConfirmation("SingleDiscount");
      const { changeValue } = this.props.stateStore;
      changeValue("confirmation", true, "Sales");
    }
    // line
  };
  setEditedFigures = figures => {
    this.setState({ onChangeStatues: false });
    const line = this.props.receiptStore.selectedLine;

    const qty = parseFloat(figures.quantity)
      ? parseFloat(figures.quantity)
      : parseFloat(figures.defaultQty);

    if (line.sold_by === "Each") {
      if (isFloat(qty)) {
        showToast(strings.QuantityIsNotAllowed, "warning");
      } else {
        line.setQuantity(Number(qty.toFixed(2)));
      }
    } else {
      line.setQuantity(Number(qty.toFixed(2)));
    }

    const price = parseFloat(figures.price)
      ? parseFloat(figures.price)
      : parseFloat(figures.defaultPrice);

    // set the price
    line.setPrice(Number(price.toFixed(2)));
    line.setDiscountRate(
      parseFloat(figures.discount) > 0 ? parseFloat(figures.discount) : 0,
      figures.percentageType,
    );

    // unselect the line
    line.setCommissionDetails(
      this.props.stateStore.sales_state[0].commissionArray,
    );
    this.props.receiptStore.unselectReceiptLine();
    this.props.stateStore.changeValue("commissionArray", "[]", "Sales");

    // remove the receipt store
    this.props.stateStore.changeValue("quantityModalVisible", false, "Sales");
  };
  execute_method = pin => {
    const { changeValue } = this.props.stateStore;
    this.props.attendantStore.findAttendantBasedOnRole(pin).then(result => {
      if (result) {
        changeValue("confirmation", false, "Sales");
        if (this.props.stateStore.currentConfirmation === "ReceiptLine") {
          this.onReceiptLineDelete(this.props.stateStore.index_value);
          showToast("Successfully Deleted Receiptline(s)");
        } else if (
          this.props.stateStore.currentConfirmation === "AllReceiptLine"
        ) {
          const { hideDeleteDialog } = this.props.stateStore;
          const {
            unselectReceiptLine,
            defaultReceipt,
          } = this.props.receiptStore;
          unselectReceiptLine();
          defaultReceipt.clear();
          hideDeleteDialog();
          showToast("Successfully Deleted Receiptline(s)");
        } else if (
          this.props.stateStore.currentConfirmation === "AllDiscount"
        ) {
          this.onDiscountApply(
            JSON.parse(this.props.stateStore.discount_string),
          );
          showToast("Successfully Applied Discount");
        } else if (
          this.props.stateStore.currentConfirmation === "SingleDiscount"
        ) {
          this.setEditedFigures(
            JSON.parse(this.props.stateStore.discount_string),
          );
          showToast("Successfully Applied Discount");
        }
      } else {
        showToastDanger("Approvers Pin Invalid");
      }
    });
  };

  confirmationModal() {
    const { changeValue } = this.props.stateStore;
    return (
      <ConfirmationModalComponent
        visible={this.props.stateStore.sales_state[0].confirmation}
        secure={true}
        onSubmit={pin => this.execute_method(pin)}
        onClose={() => changeValue("confirmation", false, "Sales")}
      />
    );
  }
  showConfirmationModalReceiptLine = index => {
    if (this.props.attendantStore.defaultAttendant.canApprove) {
      this.onReceiptLineDelete(index);
    } else {
      this.props.stateStore.changeConfirmation("ReceiptLine");
      this.props.stateStore.changeIndex(index);
      const { changeValue } = this.props.stateStore;
      changeValue("confirmation", true, "Sales");
    }
  };
  onReceiptLineDelete = index => {
    const { queueOrigin, currentTable } = this.props.stateStore;
    this.props.receiptStore.unselectReceiptLine();

    const receipt = this.props.receiptStore.defaultReceipt;
    const receiptLine = receipt.lines[index];

    let message = strings.UnableToDeleteReceiptLine;
    if (currentTable !== -1) {

      voidLine(queueOrigin, {
        id: currentTable,
        line: index,
        item_code: receiptLine.item,
      })
        .then(res => {
          receipt.deleteLine(receiptLine);
          showToast(strings.ReceiptLineIsDeleted);
          return res;
        })
        .then(res => printOrderVoid(queueOrigin, { id: res.id }))
        .catch(err => showToastDanger(`${message}. [${err}]`));
    } else {
        receipt.deleteLine(receiptLine);
      showToast(strings.ReceiptLineIsDeleted);
    }
  };

  onReceiptLineEdit = index => {
    const receipt = this.props.receiptStore.defaultReceipt;

    const receiptLine = receipt.lines[index];
    this.props.receiptStore.setReceiptLine(receiptLine);

    this.props.stateStore.changeValue("quantityModalVisible", true, "Sales");
  };

  viewOrders = status => {
    const {
      setViewingOrder,
      setLoadingOrder,
      setOrders,
      queueOrigin,
    } = this.props.stateStore;

    setViewingOrder(!status);
    setLoadingOrder(!status);

    const url = `${queueOrigin}/api/v1/orders/`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setOrders(data);
      })
      .finally(() => setLoadingOrder(false));
  };

  onViewOrders = () => {
    const { defaultReceipt } = this.props.receiptStore;

    if (defaultReceipt.linesLength > 0) {
      showAlert(
        strings.ViewOrders,
        strings.AnyPendingTransactionsWillBeOverridedWouldYouLikeToContinue,
        this.viewOrders,
      );
    } else {
      this.viewOrders();
    }
  };
  onCloseTable = () => {
    const { setInNotTableOptions, setCurrentTable } = this.props.stateStore;
    setCurrentTable(-1);
    setInNotTableOptions();
  };

  onCancelOrder = () => {
    const {
      currentTable,
      queueOrigin,
      setCurrentTable,
      setViewingOrder,
    } = this.props.stateStore;
    const { defaultReceipt } = this.props.receiptStore;
    const { defaultShift } = this.props.shiftStore;
    const table = { id: currentTable };

    showAlert(
      strings.ConfirmOrderCancel,
      strings.WouldYouLikeToCancelTheOrder,
      () => {
        cancelOrder(queueOrigin, table).then(res => {
          setCurrentTable(-1);
          defaultReceipt.clear();
          setViewingOrder(false);
          defaultShift.orderVoid();
          showToast(`${strings.Order} ${res.table_no} ${strings.IsCancelled}`);
        });
      },
    );
  };

  closeOrder = () => {
    const { setCurrentTable, setViewingOrder } = this.props.stateStore;
    const { defaultReceipt } = this.props.receiptStore;

    setCurrentTable(-1);
    defaultReceipt.clear();
    setViewingOrder(false);
  };

  onCloseViewOrder = () => {
    const { currentTable } = this.props.stateStore;

    if (currentTable !== -1) {
      showAlert(
        strings.ConfirmOrderClose,
        strings.WouldYouLikeToCloseTheOrder,
        this.closeOrder,
      );
    } else {
      this.closeOrder();
    }
  };

  onTableClick = index => {
    const { orders, setCurrentTable } = this.props.stateStore;
    const { defaultReceipt } = this.props.receiptStore;
    const { id, items, type } = orders[index];
    setCurrentTable(id);
    defaultReceipt.clear();

    for (let i = 0; i < items.length; i++) {
      if (!items[i].is_voided) {
        defaultReceipt.add(orderItemToReceiptItem(items[i]));
      }
    }
    defaultReceipt.setOrderType(type);
  };

  onTableLongPress = index => {
    const {
      orders,
      setCurrentTable,
      setInTableOptions,
    } = this.props.stateStore;
    setCurrentTable(orders[index].id);
    setInTableOptions();
  };

  changeTable = () => {
    const {
      queueOrigin,
      currentTable,
      setInNotTableOptions,
      newTableNumber,
      setCurrentTable,
    } = this.props.stateStore;

    changeOrderTable(queueOrigin, {
      id: currentTable,
      table: newTableNumber,
    }).then(() => {
      showToast(strings.TableNumberChanged);
      setCurrentTable(-1);
      setInNotTableOptions();
    });
  };

  onChangeTable = () => {
    showAlert(
      strings.ConfirmTableChange,
      strings.WouldYouLikeToChangeTable,
      this.changeTable,
    );
  };
  onReprintOrder = () => {
    const { currentTable, queueOrigin } = this.props.stateStore;
    printOrder(queueOrigin, { id: currentTable });
  };

  takeAway = values => {
    const { queueOrigin } = this.props.stateStore;
    const { orderPrinting } = this.props.printerStore.companySettings[0];
    const { defaultReceipt, unselectReceiptLine } = this.props.receiptStore;
    let { orderType, tableNo } = values;

    let items = [];
    defaultReceipt.setOrderType(orderType);
    for (let i = 0; i < defaultReceipt.lines.length; i++) {
      const line = defaultReceipt.lines[i];
      items.push(tailOrderLine(line));
    }


    if (
      orderType === "Takeaway" ||
      orderType === "Online" ||
      orderType === "Delivery"
    ) {
      tableNo = null;
    }
    const order = getOrder(orderType, items, tableNo);
    sendOrder(queueOrigin, order)
      .then(res => {
        unselectReceiptLine();
        defaultReceipt.clear();
        if (orderPrinting) {
          printOrder(queueOrigin, { id: res.id });
        }
        const { hideConfirmOrderModal } = this.props.stateStore;
        hideConfirmOrderModal();
      })
      .catch(err =>
        showToastDanger(`${strings.UnableToTakeAwayOrder}. [${err}]`),
      );
  };

  onConfirmOrderDialog() {
    return (
      <ConfirmOrderModalComponent
        visibility={this.props.stateStore.sales_state[0].confirmOrder}
        onClick={this.onConfirmOrderExit}
        onConfirmOrder={this.takeAway}
      />
    );
  }

  onConfirmOrderExit = () => {
    const { hideConfirmOrderModal } = this.props.stateStore;
    hideConfirmOrderModal();
  };

  onTakeAwayClick = () => {
    this.props.stateStore.changeValue("confirmOrder", true, "Sales");
  };

  onEndReached = text => {
    this.props.stateStore.changeValue("fetching", true, "Sales");
    if (this.props.stateStore.sales_state[0].fetching) {
      if (text === "item") {
        this.props.itemStore.getFromDb(20);
        this.props.stateStore.changeValue("fetching", false, "Sales");
      } else if (text === "category") {
        this.props.categoryStore.getFromDb(20);
        this.props.stateStore.changeValue("fetching", false, "Sales");
      }
    }
  };

  removeItemAsFavorite = () => {
    const { itemStore } = this.props;
    itemStore.selectedItem.setUnfavorite();
    itemStore.detachItemFromFavorites(itemStore.selectedItem);
    itemStore.unselectItem();
  };

  setItemAsFavorite = () => {
    const { itemStore } = this.props;
    itemStore.selectedItem.setFavorite();
    itemStore.unselectItem();
  };

  onLongPressItem = item => {
    const { setItem } = this.props.itemStore;
    const { selectedCategoryIndex } = this.props.stateStore.sales_state[0];

    setItem(item);

    const alertProps = {
      text: "",
      callback: null,
    };

    if (selectedCategoryIndex === -2) {
      alertProps.text = strings.WouldYouLikeToRemoveTheItemAsFavorites;
      alertProps.callback = this.removeItemAsFavorite;
    } else {
      alertProps.text = strings.WouldYouLikeToIncludeTheItemAsFavorites;
      alertProps.callback = this.setItemAsFavorite;
    }

    showAlert(strings.ItemFavorites, alertProps.text, alertProps.callback);
  };

  sortByName = (a, b) => (a.name < b.name ? -1 : 1);
  render(){
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <Container>
        {this.discountSelectionDialog()}
        {/*{this.summaryDialog()}*/}
        {this.confirmReceiptDeleteDialog()}
        {this.quantityEditDialog()}
        {this.priceInputDialog()}
        {this.onConfirmOrderDialog()}
        {this.confirmationModal()}
        <Sales
          listStatus={"Sales"}
          company={this.props.printerStore.companySettings[0]}
          currency={
            this.props.printerStore.companySettings[0].countryCode !== undefined
              ? this.props.printerStore.companySettings[0].countryCode
              : "PHP"
          }
          categoryLengths={JSON.parse(this.props.itemStore.categoryLengths)}
          roundOff={this.props.stateStore.settings_state[0].allowRoundOff}
          itemsLength={this.props.itemStore.itemsLength}
          bluetoothStatus={
            this.props.printerStore.bluetooth.length > 0
              ? this.props.printerStore.bluetooth[0].status
              : false
          }
          onBluetoothScan={this.onBluetoothScan}
          onChangeSalesSearchText={this.onChangeSalesSearchText}
          searchStatus={this.props.stateStore.sales_state[0].searchStatus}
          barcodeScannerInput={
            this.props.stateStore.sales_state[0].barcodeScannerInput
          }
          onChangeBarcodeScannerInput={this.onChangeBarcodeScannerInput}
          onSearchClick={this.searchStatusChange}
          onBarcodeRead={this.onBarcodeRead}
          onCloseClick={this.onCloseClick}
          salesListStatus={this.props.stateStore.sales_state[0].salesListStatus}
          categoryData={this.props.categoryStore.rows
            .slice()
            .sort(this.sortByName)}
          itemData={
            this.props.stateStore.sales_state[0].categoryFilter ||
            this.props.stateStore.sales_state[0].searchStatus ||
            this.props.stateStore.sales_state[0].selectedCategoryIndex === -2
              ? this.props.itemStore.queriedRows.slice().sort(this.sortByName)
              : (this.props.itemStore.rows.slice().filter(value => value.category !== this.props.categoryStore.remarksCategory).sort(this.sortByName))
          }
          receiptDefault={this.props.receiptStore.defaultReceipt}
          onCategoryClick={this.onCategoryClick}
          navigation={this.props.navigation}
          onItemClick={this.onItemClick}
          selectedCategoryIndex={
            this.props.stateStore.sales_state[0].selectedCategoryIndex
          }
          // footer

          onDeleteClick={this.onDeleteClick}
          onBillClick={this.onBillClick}
          onBarcodeClick={this.onBarcodeClick}
          onDiscountClick={this.onDiscountClick}
          // receipt line
          onPaymentClick={this.onPaymentClick}
          onReceiptLineEdit={this.onReceiptLineEdit}
          onReceiptLineDelete={this.showConfirmationModalReceiptLine}
          // empty rows
          onEndReached={this.onEndReached}
          onLongPressItem={this.onLongPressItem}
          isDiscountsEmpty={this.props.discountStore.isEmptyRows}
          // On View Orders
          onViewOrders={this.onViewOrders}
          onTableClick={this.onTableClick}
          onCloseViewOrder={this.onCloseViewOrder}
          orders={this.props.stateStore.orders.slice()}
          isViewingOrder={this.props.stateStore.isViewingOrder}
          isLoadingOrder={this.props.stateStore.isLoadingOrder}
          onTakeAwayClick={this.onTakeAwayClick}
          // has order
          hasTailOrder={this.props.stateStore.hasTailOrder}
          useDescription={this.props.stateStore.useDescription}
          // Current Table
          currentTable={this.props.stateStore.currentTable}
          onCloseTable={this.onCloseTable}
          onCancelOrder={this.onCancelOrder}
          onTableLongPress={this.onTableLongPress}
          // Table Options
          inTableOptions={this.props.stateStore.inTableOptions}
          newTableNumber={this.props.stateStore.newTableNumber}
          setNewTableNumber={this.props.stateStore.setNewTableNumber}
          onChangeTable={this.onChangeTable}
          onReprintOrder={this.onReprintOrder}
          isCurrencyDisabled={this.props.stateStore.isCurrencyDisabled}
          enableOverallTax={this.props.stateStore.enableOverallTax}
        />
      </Container>
    );
  }
}
