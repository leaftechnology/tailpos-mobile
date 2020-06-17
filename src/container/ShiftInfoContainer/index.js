import * as React from "react";
import { inject, observer } from "mobx-react/native";
import BluetoothSerial from "react-native-bluetooth-serial";
import TinyPOS from "tiny-esc-pos";
import { formatNumber } from "accounting-js";
import ShiftInfo from "@screens/ShiftInfo";
import { currentLanguage } from "../../translations/CurrentLanguage";
import { BluetoothStatus } from "react-native-bluetooth-status";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
import {printReport} from "../../services/tailorder";
let strings = new LocalizedStrings(translation);
@inject(
  "paymentStore",
  "receiptStore",
  "printerStore",
  "itemStore",
  "shiftReportsStore",
  "stateStore",
  "categoryStore",
  "shiftStore",
)
@observer
export default class ShiftInfoContainer extends React.Component {
    componentWillMount(){
        this.getBluetoothState();
    }
    async getBluetoothState() {
        if (!this.props.stateStore.settings_state[0].tailOrderPrinting) {

            BluetoothStatus.enable(true);
        } else {
            BluetoothStatus.disable(true);

        }
    }
  async onPrintReport(report) {

        if (this.props.stateStore.settings_state[0].tailOrderPrinting){
            let dataForPythonPrinting = {};
            dataForPythonPrinting.company = this.props.printerStore.companySettings.length > 0
                ? this.props.printerStore.companySettings[0].name.toString()
                : "";
            dataForPythonPrinting.header = this.props.printerStore.companySettings.length > 0
                ? this.props.printerStore.companySettings[0].headerTranslation.toString()
                : "";
            dataForPythonPrinting.loyalty = "0.00"
            if (this.props.stateStore.sales_state[0].useLoyaltyPoints && this.props.stateStore.settings_state[0].loyaltyProgram) {
                dataForPythonPrinting.loyalty = formatNumber(report.loyalty).toString()
            }
            dataForPythonPrinting.reportType = report.reportType;
            dataForPythonPrinting.opened = report.shift_beginning.toLocaleDateString();
            dataForPythonPrinting.closed = report.shift_beginning.toLocaleDateString();
            dataForPythonPrinting.transactions = report.numberOfTransaction.toString();
            dataForPythonPrinting.total_net_sales = formatNumber(report.totalNetSales);
            dataForPythonPrinting.total_net_sales_with_vat = formatNumber(report.totalNetSales + report.totalTaxes);
            dataForPythonPrinting.opening_amount = formatNumber(report.beginning_cash);
            dataForPythonPrinting.expected_drawer = formatNumber(report.ending_cash);
            dataForPythonPrinting.actual_money = formatNumber(report.actual_money);
            dataForPythonPrinting.short_or_overage = report.computeShort < 0 ? strings.Short : strings.Overage;
            dataForPythonPrinting.short_or_overage_amount = formatNumber(report.actual_money > 0 ? report.computeShort : 0.00);
            dataForPythonPrinting.cash_sales =  formatNumber(report.totalCashSales);
            dataForPythonPrinting.total_taxes = JSON.parse(report.total_taxes);
            dataForPythonPrinting.discount = formatNumber(report.total_discounts);
            dataForPythonPrinting.payouts = formatNumber(report.totalPayOut);
            dataForPythonPrinting.payins = formatNumber(report.totalPayIn);
            dataForPythonPrinting.cancelled = formatNumber(report.cancelled);
            dataForPythonPrinting.voided = formatNumber(report.voided);
            dataForPythonPrinting.transactions = formatNumber(report.numberOfTransaction);

            dataForPythonPrinting.dine_in = formatNumber(parseFloat(report.getOrderTypesTotal.dineInTotal, 10),);
            dataForPythonPrinting.takeaway = formatNumber(parseFloat(report.getOrderTypesTotal.takeawayTotal, 10),);
            dataForPythonPrinting.delivery = formatNumber(parseFloat(report.getOrderTypesTotal.deliveryTotal, 10),);
            dataForPythonPrinting.online = formatNumber(parseFloat(report.getOrderTypesTotal.onlineTotal, 10),);
            dataForPythonPrinting.family = formatNumber(parseFloat(report.getOrderTypesTotal.familyTotal, 10),);
            dataForPythonPrinting.categories_total_amounts = JSON.parse(report.categories_total_amounts);
            dataForPythonPrinting.mop_total_amounts = JSON.parse(report.mop_total_amounts);
            const datePrinted = new Date();
            dataForPythonPrinting.printed_on = datePrinted.toLocaleString();
            dataForPythonPrinting.footer = this.props.printerStore.companySettings.length > 0
                ? this.props.printerStore.companySettings[0].footerTranslation.toString()
                : "";

            const { queueOrigin } = this.props.stateStore;
            const { changeNoReceipts } = this.props.printerStore.companySettings[0];
            let changeReceiptsInt = parseInt(changeNoReceipts, 10);
            for (let pR = 0; pR < changeReceiptsInt; pR += 1) {
                await printReport(queueOrigin, {
                    data: dataForPythonPrinting,
                    type: "XReading"
                });
            }
        } else {
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
                                        : ""
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
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                `${
                                    report.reportType === "XReading"
                                        ? "XReading"
                                        : report.reportType === "ZReading"
                                        ? "ZReading"
                                        : ""
                                    }`,
                                { size: "normal" },
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

                    // Date
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                strings.Opened +
                                " " +
                                `${report.shift_beginning.toLocaleDateString()}`,
                                { size: "normal" },
                                true,
                            ),
                        ),
                    );

                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                strings.Closed +
                                " " +
                                `${report.shift_beginning.toLocaleDateString()}`,
                                { size: "normal" },
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
                                "Transactions: " +
                                report.numberOfTransaction.toString(),
                                { align: "left", size: "normal" },
                                true,
                            ),
                        ),
                    );
                    let totalNetSalesString = "Net Sales";
                    let totalNetSalesValue = formatNumber(report.totalNetSales);
                    for (let net = 0; net < 39 - totalNetSalesValue.length; net += 1) {
                        totalNetSalesString = totalNetSalesString + " ";
                    }
                    totalNetSalesString = totalNetSalesString + totalNetSalesValue;
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                `${totalNetSalesString}`,
                                { size: "normal" },
                                true,
                            ),
                        ),
                    );

                    let totalNetSalesWithVatString = "Net Sales w/ VAT";

                    let totalNetSalesWithVatValue = formatNumber(report.totalNetSales + report.totalTaxes);
                    for (let net = 0; net < 32 - totalNetSalesWithVatValue.length; net += 1) {
                        totalNetSalesWithVatString = totalNetSalesWithVatString + " ";
                    }
                    totalNetSalesWithVatString = totalNetSalesWithVatString + totalNetSalesWithVatValue;
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                `${totalNetSalesWithVatString}`,
                                { size: "normal" },
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
                    let beginningCashString = strings.OpeningAmount;
                    let beginningCashValue = formatNumber(report.beginning_cash);
                    for (let z = 0; z < 34 - beginningCashValue.length; z += 1) {
                        beginningCashString = beginningCashString + " ";
                    }
                    beginningCashString += beginningCashValue;
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                `${beginningCashString}`,
                                { size: "normal" },
                                true,
                            ),
                        ),
                    );
                    let expectedDrawerString = strings.ExpectedDrawer;
                    let expectedDrawerValue = formatNumber(report.ending_cash);
                    for (let z = 0; z < 33 - expectedDrawerValue.length; z += 1) {
                        expectedDrawerString = expectedDrawerString + " ";
                    }
                    expectedDrawerString += expectedDrawerValue;
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                `${expectedDrawerString}`,
                                { size: "normal" },
                                true,
                            ),
                        ),
                    );
                    let actualMoneyString = "Actual Money";
                    let actualMoneyValue = formatNumber(report.actual_money);
                    for (let aMon = 0; aMon < 36 - actualMoneyValue.length; aMon += 1) {
                        actualMoneyString = actualMoneyString + " ";
                    }
                    actualMoneyString += actualMoneyValue;
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                `${actualMoneyString}`,
                                { size: "normal" },
                                true,
                            ),
                        ),
                    );
                    let shortString =  report.computeShort < 0 ? strings.Short : strings.Overage;
                    let shortValue = formatNumber(report.actual_money > 0 ? report.computeShort : 0.00);
                    let stringFirst = 48 - shortString.length;
                    for (let sh = 0; sh < stringFirst - shortValue.length; sh += 1) {
                        shortString = shortString + " ";
                    }
                    shortString += shortValue;
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(`${shortString}`, { size: "normal" }, true),
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
                    let totalCashSalesString = strings.CashSales;
                    let totalCashSalesValue = formatNumber(report.totalCashSales);
                    for (
                        let tCashSales = 0;
                        tCashSales < 38 - totalCashSalesValue.length;
                        tCashSales += 1
                    ) {
                        totalCashSalesString = totalCashSalesString + " ";
                    }
                    totalCashSalesString += totalCashSalesValue;
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                `${totalCashSalesString}`,
                                { size: "normal" },
                                true,
                            ),
                        ),
                    );
                    JSON.parse(report.total_taxes).map(taxValue => {
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
                    let discount = formatNumber(report.total_discounts);
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

                    let payoutsString = strings.Payouts;
                    let payoutsValue = formatNumber(report.totalPayOut);
                    for (let pay = 0; pay < 41 - payoutsValue.length; pay += 1) {
                        payoutsString = payoutsString + " ";
                    }
                    payoutsString += payoutsValue;
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(`${payoutsString}`, { size: "normal" }, true),
                        ),
                    );
                    let payinsString = strings.Payins;
                    let payinsValue = formatNumber(report.totalPayIn);
                    for (let payI = 0; payI < 41 - payinsValue.length; payI += 1) {
                        payinsString = payinsString + " ";
                    }
                    payinsString += payinsValue;
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(`${payinsString}`, { size: "normal" }, true),
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
                    if (this.props.stateStore.hasTailOrder) {
                        let orderTypes = [
                            "Dine-in",
                            "Takeaway",
                            "Delivery",
                            "Online",
                            "Family",
                        ];
                        orderTypes.map(val => {
                            let orderString = "" + val;
                            let valueString = "";
                            if (val === "Dine-in") {
                                valueString = formatNumber(
                                    parseFloat(report.getOrderTypesTotal.dineInTotal, 10),
                                ).toString();
                            } else if (val === "Takeaway") {
                                valueString = formatNumber(
                                    parseFloat(report.getOrderTypesTotal.takeawayTotal, 10),
                                ).toString();
                            } else if (val === "Delivery") {
                                valueString = formatNumber(
                                    parseFloat(report.getOrderTypesTotal.deliveryTotal, 10),
                                ).toString();
                            } else if (val === "Online") {
                                valueString = formatNumber(
                                    parseFloat(report.getOrderTypesTotal.onlineTotal, 10),
                                ).toString();
                            } else if (val === "Family") {
                                valueString = formatNumber(
                                    parseFloat(report.getOrderTypesTotal.familyTotal, 10),
                                ).toString();
                            }
                            let totalLength = orderString.length + valueString.length;

                            for (let i = 0; i < 48 - totalLength; i += 1) {
                                orderString += " ";
                            }
                            orderString += valueString;
                            writePromises.push(
                                BluetoothSerial.write(
                                    TinyPOS.bufferedText(
                                        `${orderString}`,
                                        { size: "normal" },
                                        true,
                                    ),
                                ),
                            );
                        });
                        writePromises.push(
                            BluetoothSerial.write(
                                TinyPOS.bufferedText(
                                    "================================================",
                                    { size: "normal" },
                                    true,
                                ),
                            ),
                        );
                        JSON.parse(report.categories_total_amounts).map(val => {
                            let categoryString = "" + val.name;
                            let valueString = formatNumber(
                                parseFloat(val.total_amount, 10),
                            ).toString();
                            let totalLength = categoryString.length + valueString.length;

                            for (let i = 0; i < 48 - totalLength; i += 1) {
                                categoryString += " ";
                            }
                            categoryString += valueString;
                            writePromises.push(
                                BluetoothSerial.write(
                                    TinyPOS.bufferedText(
                                        `${categoryString}`,
                                        { size: "normal" },
                                        true,
                                    ),
                                ),
                            );
                        });
                        writePromises.push(
                            BluetoothSerial.write(
                                TinyPOS.bufferedText(
                                    "================================================",
                                    { size: "normal" },
                                    true,
                                ),
                            ),
                        );
                        JSON.parse(report.mop_total_amounts).map(val => {
                            let mopString = "" + val.name;
                            let valueString = formatNumber(
                                parseFloat(val.total_amount, 10),
                            ).toString();
                            let totalMopLength = mopString.length + valueString.length;

                            for (let i = 0; i < 48 - totalMopLength; i += 1) {
                                mopString += " ";
                            }
                            mopString += valueString;
                            writePromises.push(
                                BluetoothSerial.write(
                                    TinyPOS.bufferedText(
                                        `${mopString}`,
                                        { size: "normal" },
                                        true,
                                    ),
                                ),
                            );
                        });
                        writePromises.push(
                            BluetoothSerial.write(
                                TinyPOS.bufferedText(
                                    "================================================",
                                    { size: "normal" },
                                    true,
                                ),
                            ),
                        );
                    }


                    const datePrinted = new Date();
                    writePromises.push(
                        BluetoothSerial.write(
                            TinyPOS.bufferedText(
                                strings.PrintedOn + " " + `${datePrinted.toLocaleString()}`,
                                { align: "center", size: "normal" },
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
                }
            });
        }
  }

  render() {
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <ShiftInfo
        hasTailOrder={this.props.stateStore.hasTailOrder}
        loyaltyProgram={this.props.stateStore.settings_state[0].loyaltyProgram}
        isCurrencyDisabled={this.props.stateStore.isCurrencyDisabled}
        currency={
          this.props.printerStore.companySettings[0].countryCode
            ? this.props.printerStore.companySettings[0].countryCode
            : ""
        }
        numberOfTransaction={this.props.shiftReportsStore.numberOfTransaction}
        onPrintReport={report => this.onPrintReport(report)}
        navigation={this.props.navigation}
        // payment={this.props.paymentStore.defaultPayment}
        report={this.props.shiftReportsStore.defaultReport}
        // customer={this.props.paymentStore.paymentCustomer}
        // onReceiptCancel={() => this.onReceiptCancel()}
      />
    );
  }
}
