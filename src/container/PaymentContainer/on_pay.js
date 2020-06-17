import { Alert } from "react-native";
import TinyPOS from "tiny-esc-pos";
import { formatNumber } from "accounting-js";
import BluetoothSerial from "react-native-bluetooth-serial";
import { Toast } from "native-base";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
import { printReceipt } from "../../services/tailorder";
let strings = new LocalizedStrings(translation);
const moment = require("moment");

export async function setOrderCompleted(props) {
  const { queueOrigin, currentTable, setCurrentTable } = props.stateStore;

  const url = `${queueOrigin}/api/v1/complete_order`;
  const fetchData = {
    method: "POST",
    body: JSON.stringify({
      id: currentTable,
    }),
  };

  fetch(url, fetchData)
    .then(res => res.json())
    .then(res => setCurrentTable(-1));
}

export async function on_pay(props) {
  const paymentValue = props.stateStore.settings_state[0].multipleMop ? parseFloat(props.stateStore.payment_amount) : parseFloat(props.stateStore.payment_value);
  const amountDue = parseFloat(props.stateStore.amount_due);

  if (paymentValue < amountDue) {
    Alert.alert(strings.Alert, "Amount Paid Must be Greater Than Or Equal To Amount Due");
  } else if (paymentValue >= amountDue) {
    const { defaultShift } = props.shiftStore
    let date = Date.parse(defaultShift.shift_beginning);
    let receiptNumber = await props.receiptStore.numberOfReceipts();
    let receiptNumberLength = receiptNumber.toString().length;
    let finalReceiptNumber = "";
    for (let lengthNumber = 0; lengthNumber < 15 - receiptNumberLength; lengthNumber += 1) {
      finalReceiptNumber = finalReceiptNumber + "0";
    }
    finalReceiptNumber = finalReceiptNumber + receiptNumber.toString();

    const receiptCurrent = props.receiptStore.defaultReceipt;
    const { deviceId } = props.stateStore;

    receiptCurrent.setRoundOff(props.stateStore.settings_state[0].allowRoundOff);
    if(!props.stateStore.sales_state[0].useLoyaltyPoints && props.stateStore.settings_state[0].loyaltyProgram){

       await props.loyaltyStore.findNumber(props.stateStore.sales_state[0].mobile_number).then(result => {

          if(result){
              let points = parseInt(parseFloat(props.stateStore.amount_due,10) / parseFloat(receiptCurrent.loyalty,10))
              props.shiftStore.defaultShift.addPoints(points)
              receiptCurrent.setPoints(points)
              result.edit({
                  points: points
              })
          }
            props.stateStore.changeValue("mobile_number", "", "Sales")
            props.stateStore.changeValue("useLoyaltyPoints", false, "Sales");
            props.stateStore.changeValue("currentPoints", 0, "Sales");
            props.stateStore.changeValue("points", 0, "Sales");
        })
    }
    else if(props.stateStore.sales_state[0].useLoyaltyPoints && props.stateStore.settings_state[0].loyaltyProgram) {
        await props.loyaltyStore.findNumber(props.stateStore.sales_state[0].mobile_number).then(result => {
            if(result){
                props.shiftStore.defaultShift.addPoints(receiptCurrent.points)

                result.edit({
                    points: result.points - receiptCurrent.points
                })
            }
            props.stateStore.changeValue("mobile_number", "", "Sales")
            props.stateStore.changeValue("useLoyaltyPoints", false, "Sales");
            props.stateStore.changeValue("currentPoints", 0, "Sales");
            props.stateStore.changeValue("points", 0, "Sales");
        })
    }

    if (deviceId) {
      receiptCurrent.setDeviceId(deviceId);
    }
    if (props.stateStore.settings_state[0].tailOrderPrinting){
        let totalPurchase = 0.0;
        Alert.alert(
            strings.ReceiptConfirmation, // title
            strings.DoYouWantToPrintReceipt,
            [
                {
                    text: strings.No,
                    style: "cancel",
                    onPress: () => {
                        setOrderCompleted(props);
                        defaultShift.addTotalDiscount(receiptCurrent.discounts);
                        defaultShift.addTotalTaxes( props.receiptStore.defaultReceipt.taxesValues);
                        defaultShift.addNumberOfTransaction();
                        receiptCurrent.setVatNumber(props.printerStore.companySettings[0].vat_number);
                        receiptCurrent.setTicketNumber(parseInt(props.printerStore.companySettings[0].ticket_number,10));
                        receiptCurrent.setHasTailOrder(props.stateStore.hasTailOrder);
                        receiptCurrent.setTotalAmount(parseFloat(props.stateStore.amount_due,10));

                        let totalAmountDue = 0.0;
                        if (props.printerStore.companySettings[0].multipleMop){
                            const { payment_types } = props.stateStore;
                            const payment_types_json = JSON.parse(payment_types);

                            for (let x = 0; x < payment_types_json.length; x += 1) {
                                let mop = payment_types_json[x].type;
                                let amount = payment_types_json[x].amount;
                                if (mop.includes("*")){
                                    var change = total_of_multiple_payment(props) - parseFloat(props.stateStore.amount_due);
                                    props.shiftStore.defaultShift.mopAmounts({
                                        name: mop,
                                        total_amount: parseFloat(parseFloat(amount, 10) - change, 10),
                                    });
                                } else {
                                    props.shiftStore.defaultShift.mopAmounts({
                                        name: mop,
                                        total_amount: parseFloat(amount, 10),
                                    });
                                }

                            }
                        } else {
                            props.shiftStore.defaultShift.mopAmounts({
                                name: props.stateStore.payment_state[0].selected,
                                total_amount: parseFloat(props.stateStore.amount_due,10),
                            });
                        }
                        props.receiptStore.defaultReceipt.lines.map(val => {
                            totalAmountDue =
                                parseFloat(totalAmountDue, 10) +
                                parseFloat(val.price.toFixed(2), 10) *
                                parseFloat(val.qty.toFixed(2), 10);
                            if (val.category && val.category !== "No Category") {
                                props.shiftStore.defaultShift.categoriesAmounts({
                                    name: val.category,
                                    total_amount:
                                    parseFloat(val.price.toFixed(2), 10) *
                                    parseFloat(val.qty.toFixed(2), 10),
                                });
                            }
                        });

                        if (props.receiptStore.defaultReceipt.orderType !== "None") {
                            props.shiftStore.defaultShift.addOrderType({
                                amount: parseFloat(props.stateStore.amount_due,10) - parseFloat(props.receiptStore.defaultReceipt.get_tax_total_based_on_each_item,10),
                                type: props.receiptStore.defaultReceipt.orderType,
                            });
                        }
                        props.shiftStore.defaultShift.addTotalSales(parseFloat(props.stateStore.amount_due, 10));
                        props.receiptStore.defaultReceipt.lines.map(val => {
                            totalPurchase =
                                parseFloat(totalPurchase, 10) +
                                parseFloat(val.price, 10) * parseFloat(val.qty, 10);
                        });

                        receiptCurrent.setDate(date);

                        receiptCurrent.completed();
                        // If shift started and shift hasn't ended
                        if (defaultShift.shiftStarted && !defaultShift.shiftEnded) {
                            // Set the default receipt
                            const { defaultReceipt } = props.receiptStore;

                            // set shift
                            defaultReceipt.setShift(defaultShift._id);

                            const { ending_cash } = defaultShift;

                            // Set the end cash
                            defaultShift.setEndCash(ending_cash + parseFloat(props.stateStore.amount_due));
                        }

                        props.receiptStore.defaultReceipt.changeTaxesAmount(
                            props.stateStore.enableOverallTax
                                ? props.receiptStore.defaultReceipt.get_tax_total
                                : props.receiptStore.defaultReceipt
                                .get_tax_total_based_on_each_item,
                        );

                        //  props.receiptStore.defaultReceipt.clear();

                        props.receiptStore.add(props.receiptStore.defaultReceipt);
                        props.receiptStore.setPreviousReceipt(
                            props.receiptStore.defaultReceipt,
                        );

                        props.receiptStore.newReceipt();
                        props.receiptStore.setLastScannedBarcode("");
                        props.receiptStore.unselectReceiptLine();
                        props.stateStore.changeValue("selected", "None", "Payment");
                        payment_add(props, date);
                        increment_ticket_number(props);
                        setTimeout(() => {props.navigation.navigate("Sales");},1000);

                    },
                },
                {
                    text: strings.Yes,
                    onPress: async () => {
                        setOrderCompleted(props);
                        defaultShift.addTotalDiscount(receiptCurrent.discounts);
                        defaultShift.addTotalTaxes(receiptCurrent.taxesValues);
                        defaultShift.addNumberOfTransaction();
                        defaultShift.addTotalSales(parseFloat(props.stateStore.amount_due, 10));

                        receiptCurrent.setVatNumber(props.printerStore.companySettings[0].vat_number);
                        receiptCurrent.setTicketNumber(parseInt(props.printerStore.companySettings[0].ticket_number,10));
                        receiptCurrent.setHasTailOrder(props.stateStore.hasTailOrder);

                        let totalAmountDue = 0.0;
                        let commission_toto = 0.0;
                        if (props.printerStore.companySettings[0].multipleMop){
                            const { payment_types } = props.stateStore;
                            const payment_types_json = JSON.parse(payment_types);

                            for (let x = 0; x < payment_types_json.length; x += 1) {
                                let mop = payment_types_json[x].type;
                                let amount = payment_types_json[x].amount;
                                if (mop.includes("*")){
                                    let change = total_of_multiple_payment(props) - parseFloat(props.stateStore.amount_due);
                                    defaultShift.mopAmounts({
                                        name: mop,
                                        total_amount: parseFloat(parseFloat(amount, 10) - change, 10),
                                    });
                                } else {
                                    defaultShift.mopAmounts({
                                        name: mop,
                                        total_amount: parseFloat(amount, 10),
                                    });
                                }
                            }
                        } else {
                            defaultShift.mopAmounts({
                                name: props.stateStore.payment_state[0].selected,
                                total_amount: parseFloat(props.stateStore.amount_due,10),
                            });
                        }
                        receiptCurrent.lines.map(val => {
                            let ComHolder = JSON.parse(val.commission_details);
                            ComHolder.map(val2 => {
                                commission_toto = commission_toto + parseInt(val2.commission_amount, 10);
                            });
                            totalAmountDue = parseFloat(totalAmountDue, 10) + parseFloat(val.price.toFixed(2), 10) * parseFloat(val.qty.toFixed(2), 10);

                            if (val.category && val.category !== "No Category") {
                                props.shiftStore.defaultShift.categoriesAmounts({
                                    name: val.category,
                                    total_amount:
                                    parseFloat(val.price.toFixed(2), 10) *
                                    parseFloat(val.qty.toFixed(2), 10),
                                });
                            }
                        });
                        let dataForPythonPrinting = {};
                        dataForPythonPrinting.ordertype = "";
                        if (receiptCurrent.orderType !== "None") {
                            dataForPythonPrinting.ordertype = props.receiptStore.defaultReceipt.orderType;
                            props.shiftStore.defaultShift.addOrderType({
                                amount: parseFloat(props.stateStore.amount_due,10) - parseFloat(props.receiptStore.defaultReceipt.get_tax_total_based_on_each_item,10),
                                type: receiptCurrent.orderType,
                            });
                        }
                        dataForPythonPrinting.loyalty = 0
                        if (props.stateStore.sales_state[0].useLoyaltyPoints && props.stateStore.settings_state[0].loyaltyProgram) {
                            dataForPythonPrinting.loyalty = receiptCurrent.points
                        }
                        dataForPythonPrinting.company =  props.printerStore.companySettings.length > 0 ?
                            props.printerStore.companySettings[0].name ?
                                props.printerStore.companySettings[0].name.toString() : "" : "";
                        dataForPythonPrinting.companyTranslation =  props.printerStore.companySettings.length > 0 ?
                            props.printerStore.companySettings[0].nameTranslation ?
                                props.printerStore.companySettings[0].nameTranslation.toString() : "" : "";
                        dataForPythonPrinting.header = props.printerStore.companySettings.length > 0 ? props.printerStore.companySettings[0].header.toString() : "";
                        dataForPythonPrinting.headerTranslation = props.printerStore.companySettings.length > 0 ? props.printerStore.companySettings[0].headerTranslation.toString() : "";
                        dataForPythonPrinting.vat_number =  props.stateStore.hasTailOrder ? props.printerStore.companySettings[0].vat_number : "";
                        dataForPythonPrinting.date = moment().format("YYYY/MM/D hh:mm:ss SSS");
                        dataForPythonPrinting.attendant = props.attendantStore.defaultAttendant.user_name;
                        dataForPythonPrinting.ticket_number = props.stateStore.hasTailOrder ? props.printerStore.companySettings[0].ticket_number : "";
                        dataForPythonPrinting.transaction_number = finalReceiptNumber;
                        dataForPythonPrinting.lines = props.receiptStore.defaultReceipt.lines;
                        dataForPythonPrinting.subtotal = formatNumber(parseFloat(props.receiptStore.defaultReceipt.subtotal, 10)).toString();
                        dataForPythonPrinting.taxesvalues = props.receiptStore.defaultReceipt.taxesValues;
                        dataForPythonPrinting.discount = formatNumber(parseFloat(props.receiptStore.defaultReceipt.discounts, 10)).toString();
                        dataForPythonPrinting.footer = props.printerStore.companySettings.length > 0 ? props.printerStore.companySettings[0].footer.toString() : "";
                        dataForPythonPrinting.footerTranslation = props.printerStore.companySettings.length > 0 ? props.printerStore.companySettings[0].footerTranslation.toString() : "";
                        dataForPythonPrinting.mop =  props.printerStore.companySettings[0].multipleMop ? props.stateStore.payment_types : props.stateStore.payment_state[0].selected;
                        let totalPayed = props.printerStore.companySettings[0].multipleMop
                            ? insert_multiple_cash(props, [])
                            : insert_cash(props, []);
                        dataForPythonPrinting.change = formatNumber(
                            parseFloat((props.stateStore.settings_state[0].multipleMop ? parseFloat(totalPayed,10) : parseFloat(props.stateStore.payment_value, 10)) - parseFloat(props.stateStore.amount_due,10), 10),).toString();
                        dataForPythonPrinting.total_amount = parseFloat(props.stateStore.amount_due,10);

                        const { queueOrigin } = props.stateStore;
                        const { changeNoReceipts } = props.printerStore.companySettings[0];
                        let changeReceiptsInt = parseInt(changeNoReceipts, 10);
                        for (let pR = 0; pR < changeReceiptsInt; pR += 1) {
                            await printReceipt(queueOrigin, {
                                data: dataForPythonPrinting,
                                type: "Receipt"
                            }).catch(() => {})
                        }

                        Toast.show({
                            text: strings.TransactionCompleted,
                            duration: 5000,
                        });
                        receiptCurrent.setDate(date);
                        receiptCurrent.completed();

                        props.receiptStore.defaultReceipt.changeTaxesAmount(
                            props.stateStore.enableOverallTax
                                ? props.receiptStore.defaultReceipt.get_tax_total
                                : props.receiptStore.defaultReceipt.get_tax_total_based_on_each_item,
                        );
                        props.stateStore.changeValue("modalVisible", false, "Payment");
                        props.stateStore.changeValue("paymentAmount", 0, "Payment");
                        if (defaultShift.shiftStarted && !defaultShift.shiftEnded) {
                            const { defaultReceipt } = props.receiptStore;
                            defaultReceipt.setShift(defaultShift._id);
                            const { ending_cash } = defaultShift;
                            defaultShift.setEndCash(ending_cash + parseFloat(props.stateStore.amount_due));
                        }


                        props.receiptStore.add(props.receiptStore.defaultReceipt);
                        props.receiptStore.setPreviousReceipt(props.receiptStore.defaultReceipt);
                        props.receiptStore.newReceipt();
                        props.receiptStore.setLastScannedBarcode("");
                        props.receiptStore.unselectReceiptLine();
                        props.stateStore.changeValue("selected", "None", "Payment");
                        increment_ticket_number(props);
                        payment_add(props,date);
                        setTimeout(() => {props.navigation.navigate("Sales");},1000);

                    },
                }
            ]);
    } else {
        BluetoothSerial.isConnected().then(res => {
            let totalPurchase = 0.0;
            Alert.alert(
                strings.ReceiptConfirmation, // title
                strings.DoYouWantToPrintReceipt,
                [
                    {
                        text: strings.No,
                        style: "cancel",
                        onPress: () => {
                            setOrderCompleted(props);
                            props.shiftStore.defaultShift.addTotalDiscount(
                                receiptCurrent.discounts,
                            );
                            props.shiftStore.defaultShift.addTotalTaxes( props.receiptStore.defaultReceipt.taxesValues);
                            props.shiftStore.defaultShift.addNumberOfTransaction();
                            receiptCurrent.setVatNumber(props.printerStore.companySettings[0].vat_number);
                            receiptCurrent.setTicketNumber(parseInt(props.printerStore.companySettings[0].ticket_number,10));
                            receiptCurrent.setHasTailOrder(props.stateStore.hasTailOrder);
                            receiptCurrent.setTotalAmount(parseFloat(props.stateStore.amount_due,10));

                            let totalAmountDue = 0.0;
                            if (props.printerStore.companySettings[0].multipleMop){
                                const { payment_types } = props.stateStore;
                                const payment_types_json = JSON.parse(payment_types);

                                for (let x = 0; x < payment_types_json.length; x += 1) {
                                    let mop = payment_types_json[x].type;
                                    let amount = payment_types_json[x].amount;
                                    if (mop.includes("*")){
                                        var change = total_of_multiple_payment(props) - parseFloat(props.stateStore.amount_due);
                                        props.shiftStore.defaultShift.mopAmounts({
                                            name: mop,
                                            total_amount: parseFloat(parseFloat(amount, 10) - change, 10),
                                        });
                                    } else {
                                        props.shiftStore.defaultShift.mopAmounts({
                                            name: mop,
                                            total_amount: parseFloat(amount, 10),
                                        });
                                    }

                                }
                            } else {
                                props.shiftStore.defaultShift.mopAmounts({
                                    name: props.stateStore.payment_state[0].selected,
                                    total_amount: parseFloat(props.stateStore.amount_due,10),
                                });
                            }
                            props.receiptStore.defaultReceipt.lines.map(val => {
                                totalAmountDue =
                                    parseFloat(totalAmountDue, 10) +
                                    parseFloat(val.price.toFixed(2), 10) *
                                    parseFloat(val.qty.toFixed(2), 10);
                                if (val.category && val.category !== "No Category") {
                                    props.shiftStore.defaultShift.categoriesAmounts({
                                        name: val.category,
                                        total_amount:
                                        parseFloat(val.price.toFixed(2), 10) *
                                        parseFloat(val.qty.toFixed(2), 10),
                                    });
                                }
                            });

                            if (props.receiptStore.defaultReceipt.orderType !== "None") {
                                props.shiftStore.defaultShift.addOrderType({
                                    amount: parseFloat(props.stateStore.amount_due,10) - parseFloat(props.receiptStore.defaultReceipt.get_tax_total_based_on_each_item,10),
                                    type: props.receiptStore.defaultReceipt.orderType,
                                });
                            }
                            props.shiftStore.defaultShift.addTotalSales(parseFloat(props.stateStore.amount_due, 10));
                            props.receiptStore.defaultReceipt.lines.map(val => {
                                totalPurchase =
                                    parseFloat(totalPurchase, 10) +
                                    parseFloat(val.price, 10) * parseFloat(val.qty, 10);
                            });

                            receiptCurrent.setDate(date);

                            receiptCurrent.completed();
                            const { defaultShift } = props.shiftStore;

                            // If shift started and shift hasn't ended
                            if (defaultShift.shiftStarted && !defaultShift.shiftEnded) {
                                // Set the default receipt
                                const { defaultReceipt } = props.receiptStore;

                                // set shift
                                defaultReceipt.setShift(defaultShift._id);

                                const { ending_cash } = defaultShift;

                                // Set the end cash
                                defaultShift.setEndCash(ending_cash + parseFloat(props.stateStore.amount_due));
                            }

                            props.receiptStore.defaultReceipt.changeTaxesAmount(
                                props.stateStore.enableOverallTax
                                    ? props.receiptStore.defaultReceipt.get_tax_total
                                    : props.receiptStore.defaultReceipt
                                    .get_tax_total_based_on_each_item,
                            );

                            //  props.receiptStore.defaultReceipt.clear();

                            props.receiptStore.add(props.receiptStore.defaultReceipt);
                            props.receiptStore.setPreviousReceipt(
                                props.receiptStore.defaultReceipt,
                            );

                            props.receiptStore.newReceipt();
                            props.receiptStore.setLastScannedBarcode("");
                            props.receiptStore.unselectReceiptLine();
                            props.stateStore.changeValue("selected", "None", "Payment");
                            payment_add(props, date);
                            increment_ticket_number(props);
                            setTimeout(() => {props.navigation.navigate("Sales");},1000);

                        },
                    },
                    {
                        text: strings.Yes,
                        onPress: async () => {

                            setOrderCompleted(props);
                            props.shiftStore.defaultShift.addTotalDiscount(receiptCurrent.discounts);
                            props.shiftStore.defaultShift.addTotalTaxes(receiptCurrent.taxesValues);
                            props.shiftStore.defaultShift.addNumberOfTransaction();
                            receiptCurrent.setVatNumber(props.printerStore.companySettings[0].vat_number);
                            receiptCurrent.setTicketNumber(parseInt(props.printerStore.companySettings[0].ticket_number,10));
                            receiptCurrent.setHasTailOrder(props.stateStore.hasTailOrder);

                            let totalAmountDue = 0.0;
                            let commission_toto = 0.0;
                            if (props.printerStore.companySettings[0].multipleMop){
                                const { payment_types } = props.stateStore;
                                const payment_types_json = JSON.parse(payment_types);

                                for (let x = 0; x < payment_types_json.length; x += 1) {
                                    let mop = payment_types_json[x].type;
                                    let amount = payment_types_json[x].amount;
                                    if (mop.includes("*")){
                                        var change = total_of_multiple_payment(props) - parseFloat(props.stateStore.amount_due);
                                        props.shiftStore.defaultShift.mopAmounts({
                                            name: mop,
                                            total_amount: parseFloat(parseFloat(amount, 10) - change, 10),
                                        });
                                    } else {
                                        props.shiftStore.defaultShift.mopAmounts({
                                            name: mop,
                                            total_amount: parseFloat(amount, 10),
                                        });
                                    }
                                }
                            } else {
                                props.shiftStore.defaultShift.mopAmounts({
                                    name: props.stateStore.payment_state[0].selected,
                                    total_amount: parseFloat(props.stateStore.amount_due,10),
                                });
                            }
                            props.receiptStore.defaultReceipt.lines.map(val => {
                                let ComHolder = JSON.parse(val.commission_details);
                                ComHolder.map(val2 => {
                                    commission_toto = commission_toto + parseInt(val2.commission_amount, 10);
                                });
                                totalAmountDue = parseFloat(totalAmountDue, 10) + parseFloat(val.price.toFixed(2), 10) * parseFloat(val.qty.toFixed(2), 10);

                                if (val.category && val.category !== "No Category") {
                                    props.shiftStore.defaultShift.categoriesAmounts({
                                        name: val.category,
                                        total_amount:
                                        parseFloat(val.price.toFixed(2), 10) *
                                        parseFloat(val.qty.toFixed(2), 10),
                                    });
                                }

                            });
                            if (props.receiptStore.defaultReceipt.orderType !== "None") {
                                props.shiftStore.defaultShift.addOrderType({
                                    amount: parseFloat(props.stateStore.amount_due,10) - parseFloat(props.receiptStore.defaultReceipt.get_tax_total_based_on_each_item,10),
                                    type: props.receiptStore.defaultReceipt.orderType,
                                });
                            }
                            props.shiftStore.defaultShift.addTotalSales(parseFloat(props.stateStore.amount_due, 10));
                            if (res) {
                                for (let printedReceipts = 0; printedReceipts < parseInt(props.printerStore.companySettings[0].changeNoReceipts,
                                    10,
                                );
                                     printedReceipts += 1
                                ) {
                                    let writePromises = [];

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
                                    //

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
                                    )
                                        : null;

                                    // // Date
                                    writePromises.push(
                                        BluetoothSerial.write(
                                            TinyPOS.bufferedText(
                                                `${moment().format("YYYY/MM/D hh:mm:ss SSS")}`,
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
                                                "                               " +
                                                strings.Amount +
                                                " ",
                                                { align: "left", size: "normal", weight: "bold" },
                                                true,
                                            ),
                                        ),
                                    );
                                    //
                                    props.receiptStore.defaultReceipt.lines.map(val => {
                                        let finalLines = "";

                                        const name = val.item_name;

                                        if (name.length > 30) {
                                            let quotientValue = name.length / 30;
                                            for (
                                                let quotient = 0;
                                                quotient < parseInt(quotientValue, 10);
                                                quotient += 1
                                            ) {
                                                let currentCounter = quotient * 30;
                                                let nameCounter = "";
                                                for (
                                                    let n = currentCounter;
                                                    n < (quotient + 1) * 30;
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
                                            if (name.length - parseInt(quotientValue, 10) * 30 > 0) {
                                                let nameCounterOverflow = "";
                                                for (
                                                    let m = parseInt(quotientValue, 10) * 30;
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
                                        if (val.category !== "Remarks") {
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
                                                        {align: "left", size: "normal"},
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
                                    props.receiptStore.defaultReceipt.taxesValues.map(taxValue => {
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
                                    let totalAmount = parseFloat(props.stateStore.amount_due,10);
                                    receiptCurrent.setTotalAmount(totalAmount);
                                    let total = "";
                                    total = total + strings.TotalAmount;
                                    for (
                                        let totalLength = 0;
                                        totalLength <
                                        36 -
                                        formatNumber(parseFloat(totalAmount, 10).toFixed(2)).toString()
                                            .length;
                                        totalLength += 1
                                    ) {
                                        total = total + " ";
                                    }
                                    total =
                                        total +
                                        parseFloat(totalAmount, 10).toFixed(2).toString();

                                    writePromises.push(
                                        BluetoothSerial.write(
                                            TinyPOS.bufferedText(
                                                `${total}`,
                                                { align: "left", size: "normal", weight: "bold" },
                                                true,
                                            ),
                                        ),
                                    );
                                    let totalPayed = props.printerStore.companySettings[0].multipleMop
                                        ? insert_multiple_cash(props, writePromises)
                                        : insert_cash(props, writePromises);


                                    let changeString = strings.Change;
                                    let changeValue = formatNumber(
                                        parseFloat(
                                            (props.stateStore.settings_state[0].multipleMop
                                                ? parseFloat(totalPayed,10)
                                                : parseFloat(props.stateStore.payment_value, 10)) - totalAmount,
                                            10,
                                        ),
                                    ).toString();

                                    for (
                                        let changeLength = 0;
                                        changeLength < 42 - changeValue.length;
                                        changeLength += 1
                                    ) {
                                        changeString = changeString + " ";
                                    }
                                    changeString = changeString + changeValue;

                                    writePromises.push(
                                        BluetoothSerial.write(
                                            TinyPOS.bufferedText(
                                                `${changeString}`,
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
                                                strings.OfficialReceipt + "\n",
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
                                    // Push drawer
                                    writePromises.push(
                                        BluetoothSerial.write(TinyPOS.kickCashDrawer()),
                                    );
                                    writePromises.push(
                                        BluetoothSerial.write(TinyPOS.kickCashDrawer()),
                                    );
                                    Promise.all(writePromises)
                                        .then(() => {
                                            Toast.show({
                                                text: strings.TransactionCompleted,
                                                duration: 5000,
                                            });
                                        })
                                        .catch(err => {
                                            Toast.show({
                                                text: err.message + strings.TransactionCompleted,
                                                buttonText: strings.Okay,
                                                position: "bottom",
                                                duration: 5000,
                                            });
                                        });

                                }
                            } else {
                                Toast.show({
                                    text: "Transaction Completed [Unable To Connect Printer]" ,
                                    buttonText: "Okay",
                                    position: "bottom",
                                    duration: 6000,
                                });
                            }
                            receiptCurrent.setDate(date);
                            receiptCurrent.completed();

                            props.receiptStore.defaultReceipt.changeTaxesAmount(
                                props.stateStore.enableOverallTax
                                    ? props.receiptStore.defaultReceipt.get_tax_total
                                    : props.receiptStore.defaultReceipt.get_tax_total_based_on_each_item,
                            );
                            props.stateStore.changeValue("modalVisible", false, "Payment");
                            props.stateStore.changeValue("paymentAmount", 0, "Payment");


                            const { defaultShift } = props.shiftStore;


                            if (defaultShift.shiftStarted && !defaultShift.shiftEnded) {
                                const { defaultReceipt } = props.receiptStore;
                                defaultReceipt.setShift(defaultShift._id);
                                const { ending_cash } = defaultShift;
                                defaultShift.setEndCash(ending_cash + parseFloat(props.stateStore.amount_due));
                            }

                            props.receiptStore.add(props.receiptStore.defaultReceipt);
                            props.receiptStore.setPreviousReceipt(props.receiptStore.defaultReceipt);

                            props.receiptStore.newReceipt();
                            props.receiptStore.setLastScannedBarcode("");
                            props.receiptStore.unselectReceiptLine();
                            props.stateStore.changeValue("selected", "None", "Payment");
                            increment_ticket_number(props);
                            payment_add(props,date);
                            setTimeout(() => {props.navigation.navigate("Sales");},1000);
                        },
                    },
                ],
            );
        });
    }

  }
}

export function increment_ticket_number(props) {
  if (props.printerStore.companySettings.length > 0) {
    let company = props.printerStore.findCompany(
      props.printerStore.companySettings[0]._id,
    );

    company.edit({
      ticket_number: (
        parseInt(props.printerStore.companySettings[0].ticket_number, 10) + 1
      ).toString(),
    });
  }
}

export function payment_add(props, date) {

  var change = parseFloat(props.stateStore.payment_value, 10) - parseFloat(props.stateStore.amount_due);
    props.paymentStore.add({
        receipt: props.receiptStore.defaultReceipt._id.toString(),
        date: date,
        paid: props.stateStore.settings_state[0].multipleMop
        ? parseFloat(props.stateStore.payment_amount)
        : (parseInt(props.stateStore.payment_value, 10) - change),
        type: props.stateStore.settings_state[0].multipleMop
        ? props.stateStore.payment_types
        : not_multiple_payment(props),
        dateUpdated: Date.now(),
        deviceId: props.stateStore.deviceId,
        syncStatus: false,
    });
}

export function total_of_multiple_payment(props) {
    const { payment_types } = props.stateStore;
    const payment_types_json = JSON.parse(payment_types);
    let total = 0;
    for (let x = 0; x < payment_types_json.length; x += 1) {
        let amount = payment_types_json[x].amount;
        total += parseFloat(amount, 10);
    }
    return total;
}
export function insert_multiple_cash(props, writePromises) {

  const { payment_types } = props.stateStore;
  const payment_types_json = JSON.parse(payment_types);
  let total = 0;
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

      if (props.stateStore.hasTailOrder){
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

  }
  return total;
}


export function insert_cash(props, writePromises) {
  let cash = props.stateStore.payment_state[0].selected;
  for (
    let cashLength = 0;
    cashLength <
    44 -
      formatNumber(
        props.stateStore.settings_state[0].multipleMop
          ? parseFloat(props.stateStore.payment_amount)
          : parseFloat(props.stateStore.payment_value, 10),
      ).toString().length;
    cashLength += 1
  ) {
    cash = cash + " ";
  }
  cash =
    cash +
    formatNumber(
      props.stateStore.settings_state[0].multipleMop
        ? parseFloat(props.stateStore.payment_amount)
        : parseFloat(props.stateStore.payment_value, 10),
    ).toString();
  writePromises.push(
    BluetoothSerial.write(
      TinyPOS.bufferedText(
        `${cash}`,
        { align: "left", size: "normal", weight: "bold" },
        true,
      ),
    ),
  );
  return formatNumber(
      props.stateStore.settings_state[0].multipleMop
          ? parseFloat(props.stateStore.payment_amount)
          : parseFloat(props.stateStore.payment_value, 10),
  );
}
export function not_multiple_payment(props) {
  let single_payment = [];

  single_payment.push({
    type: props.stateStore.payment_state[0].selected,
    amount: parseFloat(props.stateStore.amount_due, 10),
  });
  return JSON.stringify(single_payment);
}
