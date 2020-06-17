import * as React from "react";
import { Modal, View, TouchableOpacity } from "react-native";
import { Text, Button } from "native-base";

import OnTheFlyDiscountComponent from "@components/OnTheFlyDiscountComponent";
import DiscountModalComponent from "@components/DiscountModalComponent";
import LoyaltyComponent from "@components/LoyaltyComponent";
import { currentLanguage } from "../../translations/CurrentLanguage";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
export default class DiscountSelectionModalComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      percentageType: "percentage",
      onTheFlyDiscountValue: "0",
    };
  }

  onValueChange(value) {
    this.setState({
      percentageType: value,
    });
  }
  onNumberPress(text) {
    let onTheFlyDiscountValue = text;

    if (this.state.onTheFlyDiscountValue !== "0") {
      onTheFlyDiscountValue = this.state.onTheFlyDiscountValue.concat(text);
    }

    this.setState({ onTheFlyDiscountValue });
  }

  onDeletePress() {
    this.setState({
      onTheFlyDiscountValue: this.state.onTheFlyDiscountValue.slice(0, -1),
    });
  }
  render() {
    strings.setLanguage(currentLanguage().companyLanguage);

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={this.props.discountSelection}
        onRequestClose={() => {}}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#00000090",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >

          <View style={{ backgroundColor: "white", width: this.props.loyalty ? 550 : 500 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                padding: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#bbb",
              }}
            >
              <Text style={{ color: "gray", fontWeight: "bold" }}>
                {strings.Discount}
              </Text>
              <TouchableOpacity
                style={{ alignSelf: "flex-end" }}
                onPress={() => this.props.onClick()}
              >
                <Icon name="close" size={21} />
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                padding: 10,
                borderBottomWidth: 1,
                borderBottomColor: "#bbb",
              }}
            >
              <Button
                block
                success
                onPress={() => this.props.changeSelectionStatus("On The Fly Discount")}
              >
                <Text>{strings.OnTheFlyDiscount}</Text>
              </Button>
              <Button
                block
                success
                onPress={() => this.props.changeSelectionStatus("Existing Discount")}
              >
                <Text>{strings.ExistingDiscount}</Text>
              </Button>
                {this.props.loyalty ? (
                    <Button
                        block
                        success
                        onPress={() => this.props.changeSelectionStatus("Loyalty")}
                    >
                        <Text>Loyalty</Text>
                    </Button>
                ) : null}

            </View>

            {this.props.discountSelectionStatus === "On The Fly Discount" ? (
              <OnTheFlyDiscountComponent
                onTheFlyDiscountValue={this.state.onTheFlyDiscountValue}
                percentageType={this.state.percentageType}
                onValueChange={value => this.onValueChange(value)}
                onNumberPress={text => this.onNumberPress(text)}
                onDeletePress={() => this.onDeletePress()}
              />
            ) : this.props.discountSelectionStatus === "Existing Discount" ? (
              <DiscountModalComponent
                discountData={this.props.discountData}
                currentDiscount={this.props.currentDiscount}
                onCancelDiscount={value => this.props.onCancelDiscount(value)}
                onDiscountChange={(discount, index) =>
                  this.props.onDiscountChange(discount, index)
                }
                selectedDiscount={this.props.selectedDiscount}
              />
            ) : this.props.discountSelectionStatus === "Loyalty" ? (
                <LoyaltyComponent
                    mobile_number={this.props.mobile_number}
                    useLoyaltyPoints={this.props.useLoyaltyPoints}
                    currentPoints={this.props.currentPoints}
                    points={this.props.points}

                    changeMobileNumber={this.props.changeMobileNumber}
                    changePoints={this.props.changePoints}
                    onChangeCheckBox={this.props.onChangeCheckBox}
                />
            ) : null}
            <Button
              block
              success
              onPress={() => {
                const stateValue = this.state;
                this.setState({
                  percentageType: "percentage",
                  onTheFlyDiscountValue: "0",
                });
                this.props.onDiscountEdit(stateValue);
              }}
            >
              <Text>{this.props.discountSelectionStatus === "Loyalty" ? "Set Loyalty" : strings.SetDiscount}</Text>
            </Button>
          </View>
        </View>
      </Modal>
    );
  }
}
