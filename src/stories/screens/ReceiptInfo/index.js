import * as React from "react";
import {
  Container,
  Header,
  Left,
  Button,
  Body,
  Title,
  Right,
  Content,
} from "native-base";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { currentLanguage } from "../../../translations/CurrentLanguage";

import SingleReceiptComponent from "@components/SingleReceiptComponent";
import translation from "../../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
class ReceiptInfo extends React.Component {

  render() {
    strings.setLanguage(currentLanguage().companyLanguage);
    const {
      defaultPayment,
      paymentReceipt,
      paymentCustomer,
    } = this.props.paymentStore;
      let tax = this.props.receipt.get_tax_total_based_on_each_item.toFixed(2);
      let totalPayment = this.props.receipt ? parseFloat(this.props.receipt.netTotal.toFixed(2)) + parseFloat(tax, 10) : 0.00;
      let roundOffValue = 0;


      if (this.props.receipt.roundOff){
          roundOffValue = totalPayment > 0 ? parseFloat(totalPayment % parseInt(totalPayment,10),10).toFixed(2) : 0;

          if (roundOffValue <= 0.05 ){
              totalPayment = parseInt(totalPayment,10);
          } else if (roundOffValue > 0.05 ) {

              totalPayment = parseInt(totalPayment, 10) + 1;
          }
      }


    return (
      <Container>
        <Header>
          <Left>
            <Button transparent>
              <Icon
                active
                name="arrow-left"
                onPress={() => this.props.navigation.goBack()}
                size={24}
                color="white"
              />
            </Button>
          </Left>
          <Body style={{ flex: 3 }}>
            <Title>{strings.Receipt}</Title>
          </Body>
          <Right />
        </Header>
        <Content padder>
          <SingleReceiptComponent
              stateStore={this.props.stateStore}
            isCurrencyDisabled={this.props.isCurrencyDisabled}
            currency={this.props.currency}
            connectDevice={() => this.props.connectDevice()}
            reprintStatus={this.props.reprintStatus}
            onEditReason={text => this.props.onEditReason(text)}
            editStatus={this.props.editStatus}
            cancelStatus={this.props.cancelStatus}
            onChangeCancelStatus={text => this.props.onChangeCancelStatus(text)}
            onChangeReason={text => this.props.onChangeReason(text)}
            reasonValue={this.props.reasonValue}
            printer={false}
            customer={paymentCustomer ? paymentCustomer.name : "Default customer"}
            discountName={paymentReceipt.discountName}
            discountType={paymentReceipt.discountType}
            total={totalPayment}
            roundOffValue={roundOffValue}
            date={defaultPayment.date.toLocaleString()}
            status={paymentReceipt.status}
            reason={paymentReceipt.reason}
            receiptLines={paymentReceipt.lines.slice()}
            amountPaid={defaultPayment.paid.toFixed(2)}
            paymentTypes={defaultPayment.type}
            payment={defaultPayment}
            onCancel={obj => this.props.onReceiptCancel(obj)}
            discount={paymentReceipt.discounts.toFixed(2)}
            receipt={this.props.receipt}
            onReprint={values => this.props.onReprint(values)}
            change={defaultPayment.paid.toFixed(2) - totalPayment}

          />
        </Content>
      </Container>
    );
  }
}

export default ReceiptInfo;
