import TinyPOS from "tiny-esc-pos";
import { formatNumber } from "accounting-js";
import BluetoothSerial from "react-native-bluetooth-serial";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
import { printReceipt } from "../../services/tailorder";

let strings = new LocalizedStrings(translation);
const moment = require("moment");

export async function on_print_bill(props) {
    if (props.stateStore.settings_state[0].tailOrderPrinting){
        print_bill_tailorder(props);
    } else {
        for (let i = 0; i < props.printerStore.rows.length; i += 1) {
            if (props.printerStore.rows[i].defaultPrinter) {
                BluetoothSerial.connect(props.printerStore.rows[i].macAddress)
                    .then(() => {
                        print_bill(props);
                    })
                    .catch(() => {

                        BluetoothSerial.connect(props.printerStore.rows[i].macAddress)
                            .then(() => { print_bill(props); })
                            .catch(() => {});
                    });
            }
        }
    }

}

export async function print_bill_tailorder(props){
    const { defaultShift } = props.shiftStore
    let dataForPythonPrinting = {};
    dataForPythonPrinting.ordertype = "";
    if (props.receiptStore.defaultReceipt.orderType !== "None") {
        dataForPythonPrinting.ordertype = props.receiptStore.defaultReceipt.orderType;
    }


    dataForPythonPrinting.company =  props.printerStore.companySettings.length > 0 ? props.printerStore.companySettings[0].name ? props.printerStore.companySettings[0].name.toString() : "" : "";
    dataForPythonPrinting.companyTranslation =  props.printerStore.companySettings.length > 0 ? props.printerStore.companySettings[0].nameTranslation ? props.printerStore.companySettings[0].nameTranslation.toString() : "" : "";
    dataForPythonPrinting.header = props.printerStore.companySettings.length > 0 ? props.printerStore.companySettings[0].header.toString() : "";
    dataForPythonPrinting.headerTranslation  = props.printerStore.companySettings.length > 0 ? props.printerStore.companySettings[0].headerTranslation.toString() : "";
    dataForPythonPrinting.date = moment(defaultShift.shift_beginning).format("YYYY/MM/D hh:mm:ss SSS");
    dataForPythonPrinting.attendant = props.attendantStore.defaultAttendant.user_name;

    dataForPythonPrinting.lines = props.receiptStore.defaultReceipt.lines;
    dataForPythonPrinting.vat_number =  props.stateStore.hasTailOrder ? props.printerStore.companySettings[0].vat_number : "";
    dataForPythonPrinting.ticket_number = props.stateStore.hasTailOrder ? props.printerStore.companySettings[0].ticket_number : "";

    dataForPythonPrinting.subtotal = formatNumber(parseFloat(props.receiptStore.defaultReceipt.subtotal, 10)).toString();
    dataForPythonPrinting.taxesvalues = props.receiptStore.defaultReceipt.taxesValues;
    dataForPythonPrinting.discount = formatNumber(parseFloat(props.receiptStore.defaultReceipt.discounts, 10)).toString();
    dataForPythonPrinting.footer = props.printerStore.companySettings.length > 0
        ? props.printerStore.companySettings[0].footer.toString()
        : "";
    dataForPythonPrinting.footerTranslation = props.printerStore.companySettings.length > 0
        ? props.printerStore.companySettings[0].footerTranslation.toString()
        : "";
    let totalTax = 0;
    props.receiptStore.defaultReceipt.taxesValues.map(taxValue => {
        totalTax += parseFloat(taxValue.totalAmount, 10);
    });
    let totalPayment = parseFloat(props.receiptStore.defaultReceipt.netTotal.toFixed(2)) + parseFloat(totalTax, 10);

    if (props.stateStore.settings_state[0].allowRoundOff){
        let roundOffValue = totalPayment > 0 ? parseFloat(totalPayment % parseInt(totalPayment,10),10).toFixed(2) : 0;

        if (roundOffValue <= 0.05 ){
            totalPayment = parseInt(totalPayment,10);
        } else if (roundOffValue > 0.05 ) {

            totalPayment = parseInt(totalPayment, 10) + 1;
        }
    }
    dataForPythonPrinting.total_amount = parseFloat(totalPayment,10);

    const { queueOrigin } = props.stateStore;
    const { changeNoReceipts } = props.printerStore.companySettings[0];
    let changeReceiptsInt = parseInt(changeNoReceipts, 10);
    for (let pR = 0; pR < changeReceiptsInt; pR += 1) {
        await printReceipt(queueOrigin, {
            data: dataForPythonPrinting,
            type: "Bill"
        });
    }
}
export async function print_bill(props){
    const { defaultShift } = props.shiftStore
    let receiptNumber = await props.receiptStore.numberOfReceipts();
    let receiptNumberLength = receiptNumber.toString().length;
    let finalReceiptNumber = "";
    for (let lN = 0; lN < 15 - receiptNumberLength; lN += 1) {
        finalReceiptNumber = finalReceiptNumber + "0";
    }
    finalReceiptNumber = finalReceiptNumber + receiptNumber.toString();
    let totalPurchase = 0.0;

        let writePromises = [];
        let noOfReceipts = 1;
        for (let printedReceipts = 0; printedReceipts < noOfReceipts; printedReceipts += 1) {
            writePromises = [];
            writePromises.push(BluetoothSerial.write(TinyPOS.init()));

            writePromises.push(
                BluetoothSerial.write(
                    TinyPOS.bufferedText(
                        `${
                            props.printerStore.companySettings.length > 0
                                ? props.printerStore.companySettings[0].name
                                ? props.printerStore.companySettings[0].name.toString()
                                : ""
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
                            props.printerStore.companySettings.length > 0
                                ? props.printerStore.companySettings[0].header.toString()
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
            props.stateStore.hasTailOrder
                ? writePromises.push(
                BluetoothSerial.write(
                    TinyPOS.bufferedText(
                        "VAT No.: " +
                        props.printerStore.companySettings[0].vat_number,
                        { align: "left", size: "normal" },
                        true,
                    ),
                ),
            ) : null;

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
                        `${props.attendantStore.defaultAttendant.user_name}`,
                        { align: "left", size: "normal" },
                        true,
                    ),
                ),
            );
            props.stateStore.hasTailOrder
                ? writePromises.push(
                BluetoothSerial.write(
                    TinyPOS.bufferedText(
                        "Ticket: " +
                        props.printerStore.companySettings[0]
                            .ticket_number,
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

            props.receiptStore.defaultReceipt.lines.map(val => {
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
                        for (
                            let n = currentCounter;
                            n < (quotient + 1) * 20;
                            n += 1
                        ) {
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
                if (val.category !== "Remarks"){
                    let priceString = formatNumber(
                        parseFloat(val.price, 10),
                    ).toString();
                    let qtyString = val.qty.toString();
                    let amountString = formatNumber(
                        parseFloat(val.price, 10) * parseFloat(val.qty, 10),
                    ).toString();

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
                    if (printedReceipts === 0) {
                        totalPurchase =
                            parseFloat(totalPurchase, 10) +
                            parseFloat(val.price, 10) * parseFloat(val.qty, 10);
                    }
                }

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
                parseFloat(props.receiptStore.defaultReceipt.subtotal, 10),
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

            let totalTax = 0;
            props.receiptStore.defaultReceipt.taxesValues.map(taxValue => {
                totalTax += parseFloat(taxValue.totalAmount,10);
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
                parseFloat(props.receiptStore.defaultReceipt.discounts, 10),
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
            let totalPayment = parseFloat(props.receiptStore.defaultReceipt.netTotal.toFixed(2)) + parseFloat(totalTax, 10);

            if (props.stateStore.settings_state[0].allowRoundOff){
                let roundOffValue = totalPayment > 0 ? parseFloat(totalPayment % parseInt(totalPayment,10),10).toFixed(2) : 0;

                if (roundOffValue <= 0.05 ){
                    totalPayment = parseInt(totalPayment,10);
                } else if (roundOffValue > 0.05 ) {

                    totalPayment = parseInt(totalPayment, 10) + 1;
                }
            }
            for (
                let totalLength = 0;
                totalLength <
                36 -
                formatNumber(parseFloat(totalPayment, 10)).toString()
                    .length;
                totalLength += 1
            ) {
                total = total + " ";
            }
            total =
                total +
                formatNumber(
                    parseFloat(totalPayment, 10) ,
                ).toString();

            writePromises.push(
                BluetoothSerial.write(
                    TinyPOS.bufferedText(
                        `${total}`,
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
                        `${
                            props.printerStore.companySettings.length > 0
                                ? props.printerStore.companySettings[0].footer.toString()
                                : ""
                            }`,
                        { align: "center", size: "normal" },
                        true,
                    ),
                ),
            );
            // Add 3 new lines
            writePromises.push(
                BluetoothSerial.write(TinyPOS.bufferedLine(3)),
            );
        }

        Promise.all(writePromises)
            .then(() => {})
            .catch(() => {});

}
