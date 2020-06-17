import * as React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Text } from "native-base";
import { formatNumber } from "accounting-js";
import translation from "../../translations/translation";
import { currentLanguage } from "../../translations/CurrentLanguage";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
let MoneyCurrency = require("money-currencies");

const TotalLineComponent = props => (
  <View style={styles.viewOuter}>
    {strings.setLanguage(currentLanguage().companyLanguage)}
    <View style={styles.viewInner}>
      <Text style={styles.text}>{strings.Subtotal}</Text>
      <Text>
        {props.isCurrencyDisabled
          ? formatNumber(props.subtotal)
          : new MoneyCurrency(
              props.currency ? props.currency : "PHP",
            ).moneyFormat(formatNumber(props.subtotal))}
      </Text>
    </View>
        {props.taxesValues.length > 0 ? (
            <FlatList
                numColumns={1}
                data={props.taxesValues}
                keyExtractor={(item, index) => index}
                renderItem={({item}) =>
                    <View style={styles.viewInner}>

                        <Text style={styles.text}>
                            {item.name}

                        </Text>
                        <Text>
                        {props.isCurrencyDisabled
                            ? formatNumber(item.totalAmount)
                            : new MoneyCurrency(
                            props.currency ? props.currency : "PHP",
                        ).moneyFormat(formatNumber(item.totalAmount))}
                        </Text>
                    </View>
                }
            />
        ) : null}


    <View style={styles.viewInner}>
      <Text style={styles.text}>
        {strings.Discounts}{" "}
        {props.receipt
          ? props.receipt.discountType === "percentage"
            ? props.receipt.discountValue > 0
              ? "(" + (props.receipt.discountValue * 100).toString()
              : ""
            : props.receipt.discountType === "fixDiscount"
              ? props.receipt.discountValue > 0
                ? "(" + props.receipt.discountValue
                : ""
              : ""
          : ""}
        {props.receipt
          ? props.receipt.discountType === "percentage"
            ? props.receipt.discountValue > 0
              ? "%)"
              : ""
            : props.receipt.discountValue > 0
              ? ")"
              : ""
          : ""}
      </Text>
      <Text>
        {props.isCurrencyDisabled
          ? formatNumber(props.discount)
          : new MoneyCurrency(
              props.currency ? props.currency : "PHP",
            ).moneyFormat(formatNumber(props.discount))}
      </Text>
    </View>

      {props.receipt.usePoints ? (
          <View style={styles.viewInner}>
              <Text style={styles.text}>
                  Loyalty Points
              </Text>
              <Text>
                  {props.isCurrencyDisabled
                      ? formatNumber(props.receipt.points)
                      : new MoneyCurrency(
                          props.currency ? props.currency : "PHP",
                      ).moneyFormat(formatNumber(props.receipt.points))}
              </Text>
          </View>
      ) : null}
      {props.roundOff ? (
          <View style={styles.viewInner}>
              <Text style={styles.text}>
                  Round Off
              </Text>
              <Text>
                  {props.isCurrencyDisabled
                      ? formatNumber(props.roundOffValue)
                      : new MoneyCurrency(
                          props.currency ? props.currency : "PHP",
                      ).moneyFormat(formatNumber(props.roundOffValue))}
              </Text>
          </View>
      ) : null}

    <View style={styles.viewInner}>
      <Text style={[styles.text, styles.totalText]}>
        {strings.TotalPayment}
      </Text>

      <Text>
        {props.isCurrencyDisabled
          ? formatNumber(props.totalPayment)
          : new MoneyCurrency(
              props.currency ? props.currency : "PHP",
            ).moneyFormat(formatNumber(props.totalPayment))}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  viewOuter: {
    paddingLeft: 30,
    paddingRight: 30,
    marginBottom: 30,
  },
  viewInner: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  text: {
    fontWeight: "bold",
  },
  totalText: {
    color: "#4b4c9d",
  },
});

export default TotalLineComponent;
