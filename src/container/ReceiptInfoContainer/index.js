import * as React from "react";
import { Alert } from "react-native";
import BluetoothSerial from "react-native-bluetooth-serial";
import TinyPOS from "tiny-esc-pos";
import { Toast } from "native-base";
import { formatNumber } from "accounting-js";
import { inject, observer } from "mobx-react/native";
import ReceiptInfo from "@screens/ReceiptInfo";
import { currentLanguage } from "../../translations/CurrentLanguage";
import { printReceipt } from "../../services/tailorder";
import { BluetoothStatus } from "react-native-bluetooth-status";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
const moment = require("moment");

@inject(
  "paymentStore",
  "receiptStore",
  "printerStore",
  "itemStore",
  "shiftStore",
  "attendantStore",
  "stateStore",
)
@observer
export default class ReceiptInfoContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      reasonValue: "",
      cancelStatus: false,
      editStatus: false,
      connectionStatus: "Offline",
    };
  }
  componentWillMount() {
      this.props.stateStore.changeValue("tailOrderPrinting", this.props.printerStore.companySettings[0].tailOrderPrinting, "Settings");
    for (let i = 0; i < this.props.printerStore.rows.length; i += 1) {
      if (this.props.printerStore.rows[i].defaultPrinter) {
        this.setState({ connectionStatus: "Connecting..." });
        BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
          .then(() => {
            this.setState({ connection: true });
            this.props.printerStore.setDefaultPrinter({
              _id: this.props.printerStore.rows[i]._id,
              name: this.props.printerStore.rows[i].name,
              macAddress: this.props.printerStore.rows[i].macAddress,
              defaultPrinter: this.props.printerStore.rows[i].defaultPrinter,
            });
            this.setState({ connectionStatus: "Online" });
          })
          .catch(() => {
            this.setState({ connectionStatus: "Connecting..." });
            BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
              .then(() => {
                this.setState({ connection: true });
                this.props.printerStore.setDefaultPrinter({
                  _id: this.props.printerStore.rows[i]._id,
                  name: this.props.printerStore.rows[i].name,
                  macAddress: this.props.printerStore.rows[i].macAddress,
                  defaultPrinter: this.props.printerStore.rows[i]
                    .defaultPrinter,
                });
                this.setState({ connectionStatus: "Online" });
              })
              .catch(() => {
                this.setState({ connectionStatus: "Offline" });
              });
          });
      }
    }

    const { paymentReceipt } = this.props.paymentStore;
    if (paymentReceipt) {
      this.setState({ reasonValue: paymentReceipt.reason });
    }
      this.getBluetoothState();

  }
    async getBluetoothState() {
        if (!this.props.stateStore.settings_state[0].tailOrderPrinting) {
            BluetoothStatus.enable(true);
        } else {
            BluetoothStatus.disable(true);

        }
    }
  onConfirmReprint(values) {
    Alert.alert(
      strings.Reprint, // title
      strings.AreYouSureYouWantToReprintThisReceipt,
      [
        { text: strings.Cancel, style: "cancel" },
        {
          text: strings.OK,
          onPress: () => {
              if (this.props.stateStore.settings_state[0].tailOrderPrinting){
                  this.onReprintTailorderServer(values.receipt, values.payment);
              } else {
                  this.onReprint(values);
              }
          },
        },
      ],
    );
  }
  async onReprintTailorderServer(values, payment) {
      const { defaultShift } = this.props.shiftStore

      let dataForPythonPrinting = {};
      dataForPythonPrinting.ordertype = "";
      if (values.orderType !== "None") {
          dataForPythonPrinting.ordertype = values.orderType;
      }
      dataForPythonPrinting.loyalty = 0
      if (this.props.stateStore.sales_state[0].useLoyaltyPoints && this.props.stateStore.settings_state[0].loyaltyProgram) {
          dataForPythonPrinting.loyalty = values.points
      }
      dataForPythonPrinting.company =  this.props.printerStore.companySettings.length > 0 ?
          this.props.printerStore.companySettings[0].name ?
              this.props.printerStore.companySettings[0].name.toString() : "" : "";
      dataForPythonPrinting.companyTranslation =  this.props.printerStore.companySettings.length > 0 ?
          this.props.printerStore.companySettings[0].nameTranslation ?
              this.props.printerStore.companySettings[0].nameTranslation.toString() : "" : "";
      dataForPythonPrinting.header = this.props.printerStore.companySettings.length > 0 ? this.props.printerStore.companySettings[0].header.toString() : "";
      dataForPythonPrinting.headerTranslation = this.props.printerStore.companySettings.length > 0 ? this.props.printerStore.companySettings[0].headerTranslation.toString() : "";
      dataForPythonPrinting.date = moment(defaultShift.shift_beginning).format("YYYY/MM/D hh:mm:ss SSS");
      dataForPythonPrinting.attendant = values.attendant;
      dataForPythonPrinting.lines = values.lines;
      dataForPythonPrinting.subtotal = formatNumber(parseFloat(values.subtotal, 10)).toString();
      dataForPythonPrinting.taxesvalues = values.taxesValues;
      dataForPythonPrinting.discount = formatNumber(parseFloat(values.discounts, 10)).toString();
      dataForPythonPrinting.mop =  payment.type;
      dataForPythonPrinting.ticket_number = this.props.stateStore.hasTailOrder ? this.props.printerStore.companySettings[0].ticket_number : "";
      dataForPythonPrinting.vat_number =  this.props.stateStore.hasTailOrder ? this.props.printerStore.companySettings[0].vat_number : "";


      dataForPythonPrinting.footer = this.props.printerStore.companySettings.length > 0
          ? this.props.printerStore.companySettings[0].footer.toString()
          : "";
      dataForPythonPrinting.footerTranslation = this.props.printerStore.companySettings.length > 0
          ? this.props.printerStore.companySettings[0].footerTranslation.toString()
          : "";
      let totalTax = 0;
      values.taxesValues.map(taxValue => {
          totalTax += parseFloat(taxValue.totalAmount, 10);
      });

      let totalPayment = parseFloat(values.netTotal.toFixed(2)) + parseFloat(totalTax, 10);

      if (values.roundOff){
          let roundOffValue = totalPayment > 0 ? parseFloat(totalPayment % parseInt(totalPayment,10),10).toFixed(2) : 0;

          if (roundOffValue <= 0.05 ){
              totalPayment = parseInt(totalPayment,10);
          } else if (roundOffValue > 0.05 ) {

              totalPayment = parseInt(totalPayment, 10) + 1;
          }
      }


      dataForPythonPrinting.change = formatNumber((parseFloat(payment.typeTotal) - parseFloat(totalPayment)).toFixed(2)).toString();
      dataForPythonPrinting.total_amount = parseFloat(totalPayment,10);


      const { queueOrigin } = this.props.stateStore;
      const { changeNoReceipts } = this.props.printerStore.companySettings[0];
      let changeReceiptsInt = parseInt(changeNoReceipts, 10);
      for (let pR = 0; pR < changeReceiptsInt; pR += 1) {
          await printReceipt(queueOrigin, {
              data: dataForPythonPrinting,
              type: "Reprint"
          });
      }

  }
  onReprint(values) {
      const { defaultShift } = this.props.shiftStore

      let receiptNumber = values.receipt.receiptNumber;
    let receiptNumberLength = receiptNumber.toString().length;
    let finalReceiptNumber = "";
    for (let lN = 0; lN < 15 - receiptNumberLength; lN += 1) {
      finalReceiptNumber = finalReceiptNumber + "0";
    }
    finalReceiptNumber = finalReceiptNumber + receiptNumber.toString();

    BluetoothSerial.isConnected().then(res => {
      if (res) {
        const writePromises = [];

        writePromises.push(BluetoothSerial.write(TinyPOS.init()));

        // Header
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              `${
                this.props.printerStore.companySettings.length > 0
                  ? this.props.printerStore.companySettings[0].name.toString()
                  : "Bai Web and Mobile Lab"
              }`,
              { align: "center", size: "doubleheight" },
              true,
            ),
          ),
        );

        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              `${
                this.props.printerStore.companySettings.length > 0
                  ? this.props.printerStore.companySettings[0].header.toString()
                  : ""
              }`,
              { align: "center", size: "normal" },
              true,
            ),
          ),
        );

        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              "================================================",
              { size: "normal" },
              true,
            ),
          ),
        );

          values.receipt.hasTailOrder
              ? writePromises.push(
              BluetoothSerial.write(
                  TinyPOS.bufferedText(
                      "VAT No.: " +
                      values.receipt.vatNumber,
                      { align: "left", size: "normal" },
                      true,
                  ),
              ),
          )

              : null;
        // Date
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              `${moment(defaultShift.shift_beginning).format("YYYY/MM/D hh:mm:ss SSS")}`,
                { align: "center", size: "normal" },
              true,
            ),
          ),
        );
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              "================================================",
              { size: "normal" },
              true,
            ),
          ),
        );
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              strings.Cashier +
                `${this.props.attendantStore.defaultAttendant.user_name}`,
              { align: "left", size: "normal" },
              true,
            ),
          ),
        );
          values.receipt.hasTailOrder
              ? writePromises.push(
              BluetoothSerial.write(
                  TinyPOS.bufferedText(
                      "Ticket: " +
                      values.receipt.ticketNumber.toString(),
                      { align: "left", size: "normal" },
                      true,
                  ),
              ),
          )
              : null;
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              strings.TransactionNo + `${finalReceiptNumber}`,
              { align: "left", size: "normal" },
              true,
            ),
          ),
        );
          writePromises.push(
              BluetoothSerial.write(
                  TinyPOS.bufferedText(
                      "================================================",
                      { size: "normal" },
                      true,
                  ),
              ),
          );
          writePromises.push(
              BluetoothSerial.write(
                  TinyPOS.bufferedText(
                      strings.Purchases,
                      { align: "center", size: "normal" },
                      true,
                  ),
              ),
          );
          writePromises.push(
              BluetoothSerial.write(
                  TinyPOS.bufferedText(
                      strings.Items +
                      "                    " +
                      strings.Amount +
                      " ",
                      { align: "left", size: "normal", weight: "bold" },
                      true,
                  ),
              ),
          );
        let totalPurchase = 0.0;
        values.receiptLines.map(val => {
          let finalLines = "";
          const name = val.item_name;

          if (name.length > 20) {
            let quotientValue = name.length / 20;
            for (
              let quotient = 0;
              quotient < parseInt(quotientValue, 10);
              quotient += 1
            ) {
              let currentCounter = quotient * 20;
              let nameCounter = "";
              for (let n = currentCounter; n < (quotient + 1) * 20; n += 1) {
                nameCounter = nameCounter + name[n];
              }
              writePromises.push(
                BluetoothSerial.write(
                  TinyPOS.bufferedText(
                    `${nameCounter}`,
                    { align: "left", size: "normal" },
                    true,
                  ),
                ),
              );
            }
            if (name.length - parseInt(quotientValue, 10) * 20 > 0) {
              let nameCounterOverflow = "";
              for (
                let m = parseInt(quotientValue, 10) * 20;
                m < name.length;
                m += 1
              ) {
                nameCounterOverflow = nameCounterOverflow + name[m];
              }
              writePromises.push(
                BluetoothSerial.write(
                  TinyPOS.bufferedText(
                    `${nameCounterOverflow}`,
                    { align: "left", size: "normal" },
                    true,
                  ),
                ),
              );
            }
          } else {
            writePromises.push(
              BluetoothSerial.write(
                TinyPOS.bufferedText(
                  `${name}`,
                  { align: "left", size: "normal" },
                  true,
                ),
              ),
            );
          }

          let priceString = formatNumber(parseFloat(val.price, 10)).toString();
          let qtyString = val.qty.toString();
          let amountString = (
            formatNumber(parseFloat(val.price, 10)) *
            formatNumber(parseFloat(val.qty, 10))
          )
            .toFixed(2)
            .toString();

          for (let ps = 0; ps < 18 - priceString.length; ps += 1) {
            finalLines = finalLines + " ";
          }

          finalLines = finalLines + priceString;

          for (let qt = 0; qt < 10 - qtyString.length; qt += 1) {
            finalLines = finalLines + " ";
          }
          finalLines = finalLines + qtyString;

          for (let as = 0; as < 20 - amountString.length; as += 1) {
            finalLines = finalLines + " ";
          }

          finalLines = finalLines + amountString;
          writePromises.push(
            BluetoothSerial.write(
              TinyPOS.bufferedText(
                `${finalLines}`,
                { align: "left", size: "normal" },
                true,
              ),
            ),
          );
          totalPurchase =
            parseFloat(totalPurchase, 10) +
            parseFloat(val.price, 10) * parseFloat(val.qty, 10);
        });
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              "================================================",
              { align: "left", size: "normal", weight: "bold" },
              true,
            ),
          ),
        );
        let subTotal = strings.Subtotal;
        let sub = formatNumber(
          parseFloat(values.receipt.subtotal, 10),
        ).toString();
        for (let t = 0; t < 40 - sub.length; t += 1) {
          subTotal = subTotal + " ";
        }
        subTotal = subTotal + sub;
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              `${subTotal}`,
              { align: "left", size: "normal" },
              true,
            ),
          ),
        );
          values.receipt.taxesValues.map(taxValue => {
              let taxString = taxValue.name;
              let taxValueLength = 48 - taxString.length;
              let tax = formatNumber(
                  parseFloat(taxValue.totalAmount),
              ).toString();
              for (let t = 0; t < taxValueLength - tax.length; t += 1) {
                  taxString = taxString + " ";
              }
              taxString = taxString + tax;
              writePromises.push(
                  BluetoothSerial.write(
                      TinyPOS.bufferedText(
                          `${taxString}`,
                          { align: "left", size: "normal" },
                          true,
                      ),
                  ),
              );
          });
        let discountValue = strings.Discount;
        let discount = formatNumber(
          parseFloat(values.receipt.discounts, 10),
        ).toString();
        for (let d = 0; d < 40 - discount.length; d += 1) {
          discountValue = discountValue + " ";
        }
        discountValue = discountValue + discount;
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              `${discountValue}`,
              { align: "left", size: "normal" },
              true,
            ),
          ),
        );
        let total = "";
        total = total + strings.TotalAmount;

        for (
          let totalLength = 0;
          totalLength <
          36 -
            formatNumber(parseInt(values.receipt.totalAmount, 10).toFixed(2)).toString()
              .length;
          totalLength += 1
        ) {
          total = total + " ";
        }
        total =
          total +
          formatNumber(parseInt(values.receipt.totalAmount, 10).toFixed(2)).toString();

        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              `${total}`,
              { align: "left", size: "normal", weight: "bold" },
              true,
            ),
          ),
        );
          const payment_types_json = JSON.parse(values.paymentTypes);

          for (let x = 0; x < payment_types_json.length; x += 1) {
              let mop = payment_types_json[x].type;
              let mop_length = 48 - mop.length;
              let amount = payment_types_json[x].amount;
              total += parseFloat(amount, 10);

              for (
                  let cashLength = 0;
                  cashLength <
                  mop_length - formatNumber(parseFloat(amount, 10)).toString().length;
                  cashLength += 1
              ) {
                  mop = mop + " ";
              }
              mop = mop + formatNumber(parseFloat(amount, 10)).toString();
              writePromises.push(
                  BluetoothSerial.write(
                      TinyPOS.bufferedText(
                          `${mop}`,
                          { align: "left", size: "normal", weight: "bold" },
                          true,
                      ),
                  ),
              );
          }
        let change = strings.Change;
        let changeValue = formatNumber((parseFloat(values.payment.typeTotal) - parseFloat(values.receipt.totalAmount)).toFixed(2)).toString();
        for (
          let changeLength = 0;
          changeLength < 42 - changeValue.length;
          changeLength += 1
        ) {
          change = change + " ";
        }
        change = change + changeValue;

        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              `${change}`,
              { align: "left", size: "normal", weight: "bold" },
              true,
            ),
          ),
        );
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              "================================================",
              { size: "normal" },
              true,
            ),
          ),
        );
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              strings.ThisServesAsYour,
              { align: "center", size: "doubleheight" },
              true,
            ),
          ),
        );
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              strings.OfficialReceipt,
              { align: "center", size: "doubleheight" },
              true,
            ),
          ),
        );
        writePromises.push(
          BluetoothSerial.write(
            TinyPOS.bufferedText(
              `${
                this.props.printerStore.companySettings.length > 0
                  ? this.props.printerStore.companySettings[0].footer.toString()
                  : ""
              }`,
              { align: "center", size: "normal" },
              true,
            ),
          ),
        );
        // Add 3 new lines
        writePromises.push(BluetoothSerial.write(TinyPOS.bufferedLine(3)));

        Promise.all(writePromises)
          .then(res2 => {
            // Reset payment amount
            this.setState({
              modalVisible: false,
              paymentAmount: 0,
            });
            Toast.show({
              text: strings.ReprintCompleted,
              duration: 5000,
            });
          })
          .catch(err => {
            this.setState({
              modalVisible: false,
              paymentAmount: 0,
            });
            Toast.show({
              text: err.message,
              buttonText: strings.Okay,
              position: "bottom",
              duration: 5000,
            });
          });
      } else {
        // add to row
        this.setState({
          modalVisible: false,
          paymentAmount: 0,
        });
        Toast.show({
          text: strings.UnableToConnectPrinter,
          buttonText: strings.Okay,
          position: "bottom",
          duration: 6000,
        });
      }
    });
  }

  onReceiptCancel(obj) {
    const { paymentReceipt } = this.props.paymentStore;

    // payment receipt
    if (this.state.reasonValue) {
        console.log("OBJJJJECT")
        console.log(obj)
      paymentReceipt.setCancel(this.state.reasonValue);
      // paymentReceipt.changeReason(this.state.reasonValue);
      // paymentReceipt.cancelled(paymentReceipt);
      this.props.shiftStore.setNewValues(obj);

      // Navigate to payment store
      this.props.navigation.navigate("Receipts");
    } else {
      Toast.show({
        text: strings.InputValidReason,
        buttonText: strings.Okay,
        position: "bottom",
        duration: 3000,
        type: "danger",
      });
    }
  }

  onConnectDevice() {
    for (let i = 0; i < this.props.printerStore.rows.length; i += 1) {
      if (this.props.printerStore.rows[i].defaultPrinter) {
        this.setState({ connectionStatus: "Connecting..." });
        BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
          .then(() => {
            this.setState({ connection: true });
            this.props.printerStore.setDefaultPrinter({
              _id: this.props.printerStore.rows[i]._id,
              name: this.props.printerStore.rows[i].name,
              macAddress: this.props.printerStore.rows[i].macAddress,
              defaultPrinter: this.props.printerStore.rows[i].defaultPrinter,
            });
            this.setState({ connectionStatus: "Online" });
          })
          .catch(() => {
            BluetoothSerial.connect(this.props.printerStore.rows[i].macAddress)
              .then(() => {
                this.setState({ connection: true });
                this.props.printerStore.setDefaultPrinter({
                  _id: this.props.printerStore.rows[i]._id,
                  name: this.props.printerStore.rows[i].name,
                  macAddress: this.props.printerStore.rows[i].macAddress,
                  defaultPrinter: this.props.printerStore.rows[i]
                    .defaultPrinter,
                });
                this.setState({ connectionStatus: "Online" });
              })
              .catch(() => {
                this.setState({ connectionStatus: "Offline" });
              });
          });
      }
    }
  }
  onChangeCancelStatus(text) {
    Alert.alert(
      strings.VoidReceipt, // title
      strings.AreYouSureYouWantToVoidReceipt,
      [
        { text: strings.No, style: "cancel" },
        {
          text: strings.Yes,
          onPress: () => {
            this.setState({ cancelStatus: text });
          },
        },
      ],
    );
  }

  render() {
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <ReceiptInfo
        currency={
          this.props.printerStore.companySettings[0].countryCode
            ? this.props.printerStore.companySettings[0].countryCode
            : ""
        }
        roundOff={this.props.stateStore.settings_state[0].allowRoundOff}
        connectDevice={() => this.onConnectDevice()}
        reprintStatus={this.state.connectionStatus}
        onEditReason={text => this.setState({ editStatus: text })}
        editStatus={this.state.editStatus}
        onChangeCancelStatus={text => this.onChangeCancelStatus(text)}
        cancelStatus={this.state.cancelStatus}
        onChangeReason={text => this.setState({ reasonValue: text })}
        reasonValue={this.state.reasonValue}
        paymentStore={this.props.paymentStore}
        navigation={this.props.navigation}
        receipt={this.props.paymentStore.paymentReceipt}
        onReprint={values => this.onConfirmReprint(values)}
        onReceiptCancel={obj => this.onReceiptCancel(obj)}
        isCurrencyDisabled={this.props.stateStore.isCurrencyDisabled}
        stateStore={this.props.stateStore}
      />
    );
  }
}
