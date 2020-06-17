/**
 * Created by jan on 4/20/18.
 */
import * as React from "react";
import {
  Container,
  Header,
  Title,
  Button,
  Left,
  Body,
  Right,
  Content,
  Card,
  CardItem,
  Text,
} from "native-base";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { currentLanguage } from "../../../translations/CurrentLanguage";

import ReceiptCardComponent from "@components/ReceiptCardComponent";
import translation from "../../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
class Receipts extends React.PureComponent {
  onReceiptClick = data => this.props.onReceiptClick(data);

  render() {
    strings.setLanguage(currentLanguage().companyLanguage);
    const ReceiptCardComponents = this.props.receipts.map((obj, index) => {
      if (
        obj.status !== "current" &&
        (obj.attendant === this.props.currentAttendant.user_name ||
          this.props.currentAttendant.role === "Owner")
      ) {
          let tax = obj.get_tax_total_based_on_each_item.toFixed(2);
          let totalPayment = parseFloat(obj.netTotal.toFixed(2)) + parseFloat(tax, 10);
          let roundOffValue = 0;

          if (obj.roundOff){
              roundOffValue = totalPayment > 0 ? parseFloat(totalPayment % parseInt(totalPayment,10),10).toFixed(2) : 0;

              if (roundOffValue <= 0.05 ){
                  totalPayment = parseInt(totalPayment,10);
              } else if (roundOffValue > 0.05 ) {

                  totalPayment = parseInt(totalPayment, 10) + 1;
              }
          }


        return (
          <ReceiptCardComponent
            isCurrencyDisabled={this.props.isCurrencyDisabled}
            role={this.props.currentAttendant.role}
            currency={this.props.currency}
            obj={obj}
            key={index}
            date={obj.date}
            status={obj.status}
            receipt={obj.receipt}
            number={obj.receiptNumber}
            amount={totalPayment}
            onPress={this.onReceiptClick}
          />
        );
      }
    });
    const ReceiptComponents =
      this.props.receipts.length === 0 ? (
        <CardItem>
          <Text>{strings.NoReceiptsAvailable}</Text>
        </CardItem>
      ) : (
        ReceiptCardComponents
      );

    return (
      <Container>
        <Header style={{ backgroundColor: "#4B4C9D" }}>
          <Left>
            <Button transparent>
              <Icon
                active
                name="menu"
                onPress={() => this.props.navigation.navigate("DrawerOpen")}
                size={24}
                color="white"
              />
            </Button>
          </Left>
          <Body style={{ flex: 3 }}>
            <Title>{strings.Receipts}</Title>
          </Body>
          <Right />
        </Header>
        <Content padder>
          <Card>
            <CardItem bordered style={{ justifyContent: "space-between" }}>
              <Text style={{ fontWeight: "bold", fontSize: 21 }}>
                <Icon name="receipt" size={21} /> {strings.Receipts}
              </Text>
            </CardItem>
            {ReceiptComponents}
          </Card>
        </Content>
      </Container>
    );
  }
}

export default Receipts;
