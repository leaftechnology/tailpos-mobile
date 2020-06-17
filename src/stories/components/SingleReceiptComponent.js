import * as React from "react";
import { TouchableOpacity, View, TextInput, Dimensions, FlatList } from "react-native";
import { Card, CardItem, Text, Button } from "native-base";
import { Row, Col, Grid } from "react-native-easy-grid";
import { formatNumber } from "accounting-js";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { currentLanguage } from "../../translations/CurrentLanguage";

let MoneyCurrency = require("money-currencies");
import translation from "../.././translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
const SingleReceiptComponent = props => {
  strings.setLanguage(currentLanguage().companyLanguage);

  const Lines = props.receiptLines.map((line, index) => {
    const total = line.qty * line.price;
    return (
      <CardItem key={index} style={{ justifyContent: "space-between" }}>
        <View>
          <Text style={{ marginLeft: 30,fontWeight: "bold", color: "#294398" }}>
            {line.item_name}
          </Text>
          <Text style={{ marginLeft: 30,color: "#aaa" }}>
            {line.qty} x{" "}
            {props.isCurrencyDisabled
              ? formatNumber(line.price.toFixed(2))
              : new MoneyCurrency(
                  props.currency ? props.currency : "PHP",
                ).moneyFormat(formatNumber(line.price.toFixed(2)))}
          </Text>
        </View>
        <View style={{ alignSelf: "flex-start" }}>
          <Text style={{  color: "#294398" }}>
            {props.isCurrencyDisabled
              ? formatNumber(total.toFixed(2))
              : new MoneyCurrency(
                  props.currency ? props.currency : "PHP",
                ).moneyFormat(formatNumber(total.toFixed(2)))}
          </Text>
        </View>
      </CardItem>
    );
  });
  const PaymentTypes = JSON.parse(props.paymentTypes).map((line, index) => {
    return (
      <CardItem key={index} style={{ justifyContent: "space-between" }}>
        <View>
          <Text style={{ marginLeft: 30,fontWeight: "bold", color: "#294398" }}>
            {line.type}
          </Text>
        </View>
        <View style={{ alignSelf: "flex-start" }}>
          <Text style={{ color: "#294398" }}>
            {props.isCurrencyDisabled
              ? formatNumber(line.amount.toFixed(2))
              : new MoneyCurrency(
                  props.currency ? props.currency : "PHP",
                ).moneyFormat(formatNumber(line.amount.toFixed(2)))}
          </Text>
        </View>
      </CardItem>
    );
  });
  const Discount =
    props.discountName !== "" ? (
      <Text style={{ color: "#aaa" }}>
        {props.discountName} ({props.discountType})
      </Text>
    ) : (
      <Text style={{ color: "#aaa" }}>({strings.NoDiscount})</Text>
    );
  const PrinterColorStatus =
    props.reprintStatus === "Online" ? "green" : "#aaa";
console.log("TAILORDER PRINTING");
console.log(props.stateStore.settings_state[0].tailOrderPrinting);

  return (
    <Card>
      <CardItem header style={{ borderBottomWidth: 1, borderColor: "gray" }}>
        <Grid>
          <Col
            style={{
              flexDirection: "column",
              justifyContent: "flex-start",
              alignItems: "flex-start",
              width: Dimensions.get("window").width * 0.94 * 0.2,
            }}
          >
            <Row>
              <Text style={{ fontWeight: "bold", color: "#294398" }}>
                <Icon name="receipt" size={21} color="#294398" />{" "}
                {strings.ReceiptInformation}
              </Text>
            </Row>
            <Row>
              {props.status === "cancelled" ? (
                <Text style={{ color: "#aaa" }}>
                  <Icon name="circle" size={14} color="#aaa" />{" "}
                  {strings.Cancelled}
                </Text>
              ) : (
                <Button
                  style={{ marginTop: 5 }}
                  onPress={() => props.onChangeCancelStatus(true)}
                  disabled={props.cancelStatus}
                >
                  <Text>{strings.CancelReceipt}</Text>
                </Button>
              )}
            </Row>
          </Col>

          {props.status === "cancelled" ? (
            <Col
              style={{
                width: Dimensions.get("window").width * 0.94 * 0.53,
                borderRightWidth: 1,
                marginRight: 15,
              }}
            >
              <Row>
                <Text>{strings.Reason}: </Text>
              </Row>
              <Row
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-start",
                  alignItems: "center",
                }}
              >
                <TextInput
                  editable={props.editStatus}
                  style={{
                    marginLeft: 5,
                    borderBottomWidth: 1,
                    fontSize: 14,
                    width: Dimensions.get("window").width * 0.94 * 0.46,
                    color: "black",
                  }}
                  underlineColorAndroid="transparent"
                  value={props.reasonValue}
                  onChangeText={text => props.onChangeReason(text)}
                  multiline={true}
                />
                {props.editStatus ? (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginLeft: 10,
                    }}
                    onPress={() => props.onCancel(props)}
                  >
                    <Icon name="content-save" size={30} color="black" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginLeft: 10,
                    }}
                    onPress={() => props.onEditReason(true)}
                  >
                    <Icon name="pencil" size={30} color="black" />
                  </TouchableOpacity>
                )}
              </Row>
            </Col>
          ) : props.cancelStatus ? (
            <Col
              style={{
                width: Dimensions.get("window").width * 0.94 * 0.53,
                borderRightWidth: 1,
                marginRight: 15,
              }}
            >
              <Row>
                <Text>{strings.Reason}: </Text>
              </Row>
              <Row
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-start",
                }}
              >
                <TextInput
                  editable={true}
                  style={{
                    marginLeft: 5,
                    borderBottomWidth: 1,
                    fontSize: 14,
                    width: Dimensions.get("window").width * 0.94 * 0.46,
                    color: "black",
                  }}
                  underlineColorAndroid="transparent"
                  value={props.reasonValue}
                  onChangeText={text => props.onChangeReason(text)}
                  multiline={true}
                />
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginLeft: 10,
                  }}
                  onPress={() => props.onCancel(props)}
                >
                  <Icon name="content-save" size={40} color="black" />
                </TouchableOpacity>
              </Row>
            </Col>
          ) : (
            <Col
              style={{
                width: Dimensions.get("window").width * 0.94 * 0.53,
                borderRightWidth: 1,
                marginRight: 15,
              }}
            />
          )}
          <Col
            style={{
              width: Dimensions.get("window").width * 0.94 * 0.25,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >


            <Button
              style={{ alignSelf: "center" }}
              onPress={() => props.onReprint(props)}
              disabled={props.reprintStatus !== "Online" && !props.stateStore.settings_state[0].tailOrderPrinting}
            >
              <Text>{strings.Reprint}</Text>
            </Button>
              {!props.stateStore.settings_state[0].tailOrderPrinting ? (
                  <Icon name="printer" size={21} color={PrinterColorStatus} />
              ) : null}
              {!props.stateStore.settings_state[0].tailOrderPrinting ? (
                  <Text style={{ color: PrinterColorStatus }}>
                      {props.reprintStatus}
                  </Text>
              ) : null}
              {!props.stateStore.settings_state[0].tailOrderPrinting ? (
                  <Icon
                      name="bluetooth-connect"
                      style={{ color: "blue" }}
                      size={Dimensions.get("window").width * 0.04}
                      onPress={() => props.connectDevice()}
                  />
              ) : null}

            {/*</TouchableOpacity>*/}
          </Col>
        </Grid>
      </CardItem>
      <CardItem>
        <Text style={{ fontWeight: "bold" }}>{strings.SoldTo}: </Text>
        <Text>{props.customer}</Text>
      </CardItem>
      <CardItem>
        <Text style={{ fontWeight: "bold" }}>{strings.ReceiptItems}</Text>
      </CardItem>
      {Lines}
        <CardItem style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "bold" }}>Subtotal</Text>
            <Text>
                {props.isCurrencyDisabled
                    ? formatNumber(props.receipt.subtotal)
                    : new MoneyCurrency(
                        props.currency ? props.currency : "PHP",
                    ).moneyFormat(formatNumber(props.receipt.subtotal))}
            </Text>
        </CardItem>
        {props.receipt.taxesValues.length > 0 ? (
            <FlatList
                numColumns={1}
                data={props.receipt.taxesValues}
                keyExtractor={(item, index) => index}
                renderItem={({item}) =>
                    <CardItem style={{ justifyContent: "space-between" }}>
                        <View>
                            <Text style={{ fontWeight: "bold" }}>{item.name}</Text>
                        </View>
                        <Text>
                            {props.isCurrencyDisabled
                                ? formatNumber(item.totalAmount)
                                : new MoneyCurrency(
                                    props.currency ? props.currency : "PHP",
                                ).moneyFormat(formatNumber(item.totalAmount))}

                        </Text>
                    </CardItem>
                }
            />
            ) : null }

    <CardItem style={{ justifyContent: "space-between" }}>
        <View>
            <Text style={{ fontWeight: "bold" }}>{strings.Discount}</Text>
            {Discount}
        </View>

        <Text>
            {props.isCurrencyDisabled
                ? formatNumber(props.discount)
                : new MoneyCurrency(
                    props.currency ? props.currency : "PHP",
                ).moneyFormat(formatNumber(props.discount))}
        </Text>
    </CardItem>
        {props.receipt.roundOff ? (
            <CardItem style={{ justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "bold" }}>Roundoff</Text>
                <Text>
                    {props.isCurrencyDisabled
                        ? formatNumber(props.roundOffValue)
                        : new MoneyCurrency(
                            props.currency ? props.currency : "PHP",
                        ).moneyFormat(formatNumber(props.roundOffValue))}
                </Text>
            </CardItem>
        ) : null}

        <CardItem style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: "bold" }}>Total Payment</Text>
            <Text>
                {props.isCurrencyDisabled
                    ? formatNumber(props.total)
                    : new MoneyCurrency(
                        props.currency ? props.currency : "PHP",
                    ).moneyFormat(formatNumber(props.total))}
            </Text>
        </CardItem>
        <CardItem>
            <Text style={{ fontWeight: "bold" }}>Payment Types</Text>
        </CardItem>
        {PaymentTypes}

      <CardItem style={{ justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "bold" }}>{strings.AmountPaid}</Text>
        <Text>
          {props.isCurrencyDisabled
            ? formatNumber(props.amountPaid)
            : new MoneyCurrency(
                props.currency ? props.currency : "PHP",
              ).moneyFormat(formatNumber(props.amountPaid))}
        </Text>
      </CardItem>
      <CardItem style={{ justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "bold" }}>{strings.AmountChange}</Text>
        <Text>
          {props.isCurrencyDisabled
            ? formatNumber(props.change)
            : new MoneyCurrency(
                props.currency ? props.currency : "PHP",
              ).moneyFormat(formatNumber(props.change))}
        </Text>
      </CardItem>
      <CardItem footer style={{ justifyContent: "space-between" }}>
        <Text style={{ color: "#aaa", fontWeight: "bold" }}>
          {strings.Transaction}
        </Text>
        <Text style={{ color: "#aaa" }}>{props.date}</Text>
      </CardItem>
    </Card>
  );
};

export default SingleReceiptComponent;
