import * as React from "react";
import {
  Container,
  Header,
  Left,
  Button,
  Body,
  Title,
  Content,
  Form,
  Label,
  Item,
  Input,
  Picker,
  Textarea,
  Text,
} from "native-base";
import { View, Alert, StyleSheet } from "react-native";
import { formatNumber } from "accounting-js";
import { Col, Grid } from "react-native-easy-grid";
import Icon from "react-native-vector-icons/FontAwesome";
import { currentLanguage } from "../../../translations/CurrentLanguage";

import NumberKeys from "@components/NumberKeysComponent";
import Printer from "@components/PrinterComponent";
import SearchableDropdown from "../../../stories/components/SearchableDropdownComponent";
import AddCustomer from "../../../stories/components/AddCustomerModalComponent";
let MoneyCurrency = require("money-currencies");
import translation from "../../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);


export default class Payment extends React.PureComponent {
  onValueChange = text => {
    this.props.onValueChange(text);
  };
  payment_type = () => {
    const { paymentTypes } = this.props;
    let payment_types_values = "";
    for (let i = 0; i < paymentTypes.length; i += 1) {
      payment_types_values +=
        paymentTypes[i].type + " - " + paymentTypes[i].amount.toString() + "\n";
    }
    return payment_types_values;
  };
  onPay = () => {
    Alert.alert(
      strings.ConfirmPayment,
      strings.AreYouSure,
      [
        { text: strings.Cancel },
        { text: strings.Proceed,
            onPress: this.props.onPay
        },
      ],
      { cancelable: false },
    );
  };

  renderCustomer = () => {
    const { useDefaultCustomer } = this.props;

    if (useDefaultCustomer) {
      return null;
    }
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <View>
        <Label style={styles.viewLabel}>{strings.Customer}</Label>
        <SearchableDropdown
          searchedCustomers={this.props.searchedCustomers}
          searchCustomer={this.props.searchCustomer}
          modalVisibleChange={this.props.modalVisibleChange}
        />
        <AddCustomer
          values={this.props.values}
          modalVisible={this.props.values.modalVisible}
          onChangeCustomerName={this.props.onChangeCustomerName}
          onChangeCustomerEmail={this.props.onChangeCustomerEmail}
          onChangeCustomerPhoneNumber={this.props.onChangeCustomerPhoneNumber}
          onChangeCustomerNotes={this.props.onChangeCustomerNotes}
          onSaveCustomer={this.props.onSaveCustomer}
          onCancelAddCustomer={this.props.onCancelAddCustomer}
        />
      </View>
    );
  };
    _getPaymentItems = () => {
        return this.props.modeOfPayments.map(value => (
            <Picker.Item
                label={value.mop}
                value={value.mop}
                key={value.mop}
            />
        ));
    };
  render() {
    strings.setLanguage(currentLanguage().companyLanguage);

    let mc = new MoneyCurrency(
      this.props.currency ? this.props.currency : "PHP",
    );
    const amountValue = this.props.settings_state.multipleMop
      ? parseFloat(this.props.payment_amount_multiple)
      : parseFloat(this.props.paymentValue);

    const amountDue = parseFloat(this.props.amountDue);

    let change = 0;

    if (amountValue - amountDue > 0) {
      change = amountValue - amountDue;
    }
      const PaymentItems = this._getPaymentItems();

      let totalPayment = this.props.amountDue;
    return (
      <Container>
        <Header style={styles.header}>
          <Left>
            <Button transparent onPress={this.props.navigation}>
              <Icon name="arrow-left" style={styles.headerArrow} />
            </Button>
          </Left>
          <Body>
            <Title style={styles.headerTitle}>{strings.Payment}</Title>
          </Body>
        </Header>
        <Grid>
          <Col size={35} style={styles.contentLeft}>
            <View style={styles.leftView}>
              {this.props.settings_state.multipleMop ? (
                <View style={styles.optionView1}>

                    {this.props.values.selected !== "None" ? (
                        <Button transparent onPress={this.props.removeMop}>
                          <Icon name="close" style={styles.leftIcon} />
                        </Button>
                    ) : null}
                  <View style={{ flex: 1, width: "30%" }}>
                    <Picker
                      mode="dropdown"
                      selectedValue={this.props.values.selected}
                      onValueChange={this.props.onChangePayment}
                    >
                      <Picker.Item
                          label="None"
                          value="None"
                          key="None"
                      />
                        {PaymentItems}
                    </Picker>
                  </View>
                    {this.props.values.selected !== "None" ? (
                        <Button transparent onPress={this.props.addMultipleMop}>
                          <Icon name="arrow-right" style={styles.rightArrow}/>
                        </Button>
                    ) : null}

                </View>
              ) : null}
              <NumberKeys
                paymentType={this.props.values.selected}
                scanned_nfc={this.props.scanned_nfc}
                isCurrencyDisabled={this.props.isCurrencyDisabled}
                currency={this.props.currency}
                onPay={this.onPay}
                value={this.props.paymentValue}
                onChangeNumberKeyClick={this.onValueChange}
                mop={this.props.values.selected}
                multipleMop={this.props.settings_state.multipleMop}
              />
            </View>
          </Col>
          <Col size={65} style={styles.contentRight}>
            <Content padder>
              <Form style={styles.contentForm}>
                <View style={styles.formView}>
                  <Label style={styles.viewLabel}>{strings.AmountDue}</Label>
                  <Item regular>
                    <Input
                      editable={false}
                      keyboardType="numeric"
                      value={
                        this.props.isCurrencyDisabled
                          ? formatNumber(totalPayment)
                          : mc.moneyFormat(formatNumber(totalPayment))
                      }
                    />
                  </Item>
                </View>

                  {this.props.settings_state.allowRoundOff ? (
                      <View style={styles.formView}>
                        <Label style={styles.viewLabel}>Roundoff</Label>
                        <Item regular>
                          <Input
                              editable={false}
                              keyboardType="numeric"
                              value={
                                  this.props.isCurrencyDisabled
                                      ? formatNumber(this.props.roundOff)
                                      : mc.moneyFormat(formatNumber(this.props.roundOff))
                              }
                          />
                        </Item>
                      </View>
                  ) : null}

                <View style={styles.formView}>
                  <Label style={styles.viewLabel}>{strings.AmountChange}</Label>
                  <Item regular>
                    <Input
                      editable={false}
                      keyboardType="numeric"
                      value={
                        this.props.isCurrencyDisabled
                          ? formatNumber(change)
                          : mc.moneyFormat(formatNumber(change))
                      }
                    />
                  </Item>
                </View>
                {/*{this.renderCustomer()}*/}
                <View style={styles.optionView}>
                  {this.props.settings_state.multipleMop ? (
                    <View style={styles.paymentView}>
                      <Label>Payment Breakdown</Label>
                      <Textarea
                        editable={false}
                        style={{
                          borderColor: "#cfcfcf",
                          borderWidth: 1,
                          whiteSpace: "pre-wrap",
                        }}
                        rowSpan={5}
                        value={this.payment_type()}
                      />

                      <Label style={styles.viewLabel}>
                        Balance{" "}
                        <Text style={{ fontSize: 11 }}>
                          (Amount Due - Total Breakdown)
                        </Text>
                      </Label>
                      <Item regular>
                        <Input
                          editable={false}
                          keyboardType="numeric"
                          value={
                            this.props.isCurrencyDisabled
                              ? formatNumber(this.props.balance) > 0
                                ? formatNumber(this.props.balance)
                                : formatNumber(0)
                              : formatNumber(this.props.balance) > 0
                                ? mc.moneyFormat(
                                    formatNumber(this.props.balance),
                                  )
                                : mc.moneyFormat(formatNumber(0))
                          }
                        />
                      </Item>
                    </View>
                  ) : (
                    <View style={styles.paymentView}>
                      <Label>{strings.PaymentType}</Label>
                      <Picker
                        mode="dropdown"
                        selectedValue={this.props.values.selected}
                        onValueChange={this.props.onChangePayment}
                      >
                        <Picker.Item
                            label="None"
                            value="None"
                            key="None"
                        />
                        {PaymentItems}
                      </Picker>
                    </View>
                  )}
                  <Printer
                    connectionStatus={this.props.values.connectionStatus}
                    connectDevice={this.props.connectDevice}
                    connection={this.props.values.connection}
                    onPrinterPress={this.props.onPrinterPress}
                    style={styles.printerStyle}
                  />
                </View>
                {this.props.values.selected === "Wallet" ? (
                  "customer" in this.props.scanned_nfc ? (
                    <View>
                      <View>
                        <Label>Customers Pin</Label>
                        <Item regular>
                          <Input
                            secureTextEntry={true}
                            editable={false}
                            keyboardType="numeric"
                            value={this.props.customers_pin_value}
                          />
                        </Item>
                      </View>
                      <View style={{ flexDirection: "row" }}>
                        <Button
                          style={styles.button}
                          onPress={this.props.proceedToWalletTransaction}
                        >
                          <Text>Proceed Wallet Transaction</Text>
                        </Button>
                        <Button
                          style={styles.button1}
                          onPress={this.props.clearCustomersPin}
                        >
                          <Text>Clear</Text>
                        </Button>
                      </View>
                    </View>
                  ) : null
                ) : null}
              </Form>
            </Content>
          </Col>
        </Grid>
      </Container>
    );
  }
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#4b4c9d",
  },
  headerArrow: {
    fontSize: 24,
    color: "white",
  },
  button: {
    marginTop: 5,
  },
  button1: {
    marginTop: 5,
    marginLeft: 10,
  },
  rightArrow: {
      marginRight: 10,

      fontSize: 35,
    color: "blue",
  },
  leftIcon: {
    marginLeft: 10,
    fontSize: 35,
    color: "red",
  },
  headerTitle: {
    marginLeft: "-35%",
    fontWeight: "bold",
  },
  contentLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  leftView: {
    paddingTop: 15,
  },
  contentRight: {
    backgroundColor: "white",
  },
  contentForm: {
    margin: 10,
  },
  formView: {
    marginBottom: 15,
  },
  viewLabel: {
    marginBottom: 5,
  },
  optionView: {
    flexDirection: "row",
    marginTop: 15,
  },
    optionView1: {
    borderColor: "#3F51B5",
    borderWidth: 1,
    flexDirection: "row",
    marginTop: 15,
    marginBottom: 15,
  },
  paymentView: {
    flex: 1,
  },
  printerStyle: {
    flex: 1,
    marginBottom: 15,
    marginLeft: 30,
  },
});
