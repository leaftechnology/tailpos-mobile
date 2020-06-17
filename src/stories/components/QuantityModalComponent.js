import * as React from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import {
  Text,
  Form,
  Item,
  Button,
  Input,
  Picker,
  Grid,
  Row,
  Col,
} from "native-base";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { currentLanguage } from "../../translations/CurrentLanguage";
import EditCheckBox from "./EditCheckBoxComponent";
import ModalKeypadComponent from "./ModalKeypadComponent";
import translation from "../.././translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
export default class QuantityModalComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      quantity: "",
      status: "Qty",
      price: "",
      discount: "",
      commission: "",
      commission_amount: "",
      defaultQty: "",
      defaultPrice: "",
      attendantName: "No Attendant",
      percentageType: "percentage",
      reverse: false,
      reverse_value: "",
      tax: [],
      taxTotal: 0
    };
  }

  componentWillReceiveProps(nextProps) {
    const { price, quantity, discount_rate, tax, taxTotal } = nextProps;
    this.setState({
      price: price.toString(),
      quantity: quantity.toString(),
      defaultPrice: price.toString(),
      defaultQty: quantity.toString(),
      discount: discount_rate.toString(),
      tax: tax,
        taxTotal: taxTotal,
      reverse: false,
      reverse_value: "",
    });
  }
  onValueChange(value) {
    this.setState({
      percentageType: value,
    });
  }
  onAddCommissionAttendant() {
    if (this.state.attendantName !== "No Attendant") {
      let commissionValue = this.props.attendants.filter(
        attendant => attendant._id === this.state.attendantName,
      );
      if (commissionValue.length > 0) {
        this.props.addCommissionArray({
          commission_attendant_name: commissionValue[0].user_name,
          commission_attendant_id: this.state.attendantName,
          commission_rate: commissionValue[0].commission,
          commission_amount: this.state.commission_amount,
          status: false,
        });
      }

      this.setState({ attendantName: "No Attendant" });
    }
  }
  onChangeEditStatus(val) {
    this.setState({ status: val });
  }

  onNumberPress(text) {
    let quantity = text;

    if (this.state.quantity !== "0") {
      quantity = this.state.quantity.concat(text);
    }
    this.setState({ quantity });
  }

  onNumberDiscountPress(text) {
    if (this.state.discount === "0") {
      this.setState({ discount: text });
    } else {
      this.setState({ discount: this.state.discount.concat(text) });
    }
  }

  onNumberPricePress(text) {
    let price_var = this.state.reverse
      ? this.state.reverse_value
      : this.state.price;
    let key = this.state.reverse ? "reverse_value" : "price";
    if (price_var === "0") {
      this.setState({
        [key]: text,
        quantity: this.state.reverse
          ? (parseFloat(text) / parseFloat(this.state.price)).toString()
          : this.state.quantity,
      });
    } else {
      this.setState({
        [key]: price_var.concat(text),
        quantity: this.state.reverse
          ? (
              parseFloat(price_var.concat(text)) / parseFloat(this.state.price)
            ).toString()
          : this.state.quantity,
      });
    }
  }

  onNumberCommissionPress(text) {
    if (this.state.quantity === "0") {
      this.setState({ commission: text });
    } else {
      this.setState({
        commission: this.state.commission.concat(text),
        commission_amount: (
          parseInt(this.state.commission.concat(text), 10) /
          100 *
          (this.state.discount
            ? parseInt(this.state.discount, 10) *
              (parseInt(this.state.price, 10) *
                parseInt(this.state.quantity, 10))
            : parseInt(this.state.price, 10) *
              parseInt(this.state.quantity, 10))
        ).toString(),
      });
    }
  }
  onDeletePress() {
    this.setState({ quantity: this.state.quantity.slice(0, -1) });
  }
  onDeletePricePress() {
    let price_var = this.state.reverse
      ? this.state.reverse_value
      : this.state.price;
    let key = this.state.reverse ? "reverse_value" : "price";
    this.setState({
      [key]: price_var.slice(0, -1),
      quantity: this.state.reverse
        ? (
            parseFloat(price_var.slice(0, -1)) / parseFloat(this.state.price)
          ).toString()
        : this.state.quantity,
    });
  }

  onDeleteCommissionPress() {
    this.setState({
      commission: this.state.commission.slice(0, -1),
      commission_amount:
        this.state.commission.slice(0, -1) !== ""
          ? (
              parseInt(this.state.commission.slice(0, -1), 10) /
              100 *
              parseInt(this.state.price, 10)
            ).toString()
          : "",
    });
  }

  onDeleteDiscountPress() {
    this.setState({
      discount: this.state.discount.slice(0, -1),
    });
  }

  computeCommission(value) {
    let commissionValue = this.props.attendants.filter(
      attendant => attendant._id === value,
    );

    let priceQty =
      parseFloat(this.state.price, 10) * parseFloat(this.state.quantity, 10);
    let discountValue =
      parseFloat(this.state.discount) > 0
        ? priceQty - parseFloat(this.state.discount) / 100 * priceQty
        : priceQty;
    if (value !== "No Attendant") {
      this.setState({
        attendantName: value,
        commission_amount: (
          parseFloat(commissionValue[0].commission, 10) /
          100 *
          discountValue
        ).toString(),
      });
    } else {
      this.setState({
        attendantName: value,
        commission_amount: "0",
      });
    }
  }

  _renderItem = ({ item, index }) => {
    strings.setLanguage(currentLanguage().companyLanguage);
    if (item) {
      return (
        <Row style={{ marginBottom: 10, marginTop: index === 0 ? 10 : 0 }}>
          <Col
            style={{
              marginLeft: 10,
              alignItems: "flex-start",
              justifyContent: "center",
              height: 50,
              fontSize: 16,
            }}
          >
            <Text>{item.commission_attendant_name}</Text>
          </Col>
          <Col
            style={{
              alignItems: "center",
              justifyContent: "center",
              height: 50,
              fontSize: 16,
            }}
          >
            <Text>{item.commission_amount}</Text>
          </Col>
        </Row>
      );
    }
  };
  _renderItemTax = ({ item, index }) => {
    let tax_amount = (item.tax_rate / 100) * (parseFloat(this.state.price) * parseFloat(this.state.quantity));
      strings.setLanguage(currentLanguage().companyLanguage);
      if (item) {
          return (
              <Row style={{ marginBottom: 10  }}>
                <Col
                    style={{
                        marginLeft: 10,
                        alignItems: "flex-start",
                        height: 30,
                    }}
                >
                  <Text style={{fontSize: 16,}}>{item.tax_type}</Text>
                </Col>

                <Col
                    style={{
                        alignItems: "center",
                        height: 30,
                    }}
                >
                  <Text style={{fontSize: 16,}}>{item.tax_rate}</Text>
                </Col>

                <Col
                    style={{
                        alignItems: "center",
                        height: 30,
                    }}
                >
                  <Text style={{fontSize: 16,}}>{tax_amount}</Text>
                </Col>
              </Row>
          );
      }
  };
  render() {
    const attendants = this.props.attendants.map(attendant => (
      <Picker.Item
        label={attendant.user_name}
        value={attendant._id}
        key={attendant._id}
      />
    ));

    return (
      <Modal
        onRequestClose={() => null}
        animationType="slide"
        transparent={true}
        visible={this.props.visible}
      >
        <View style={styles.view}>
          <View style={styles.innerView}>
            <View style={styles.headerView}>
              <Text style={styles.headerText}>
                {strings.EditTransactionLine}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={this.props.onClick}
              >
                <Icon name="close" size={21} />
              </TouchableOpacity>
            </View>
            <View style={styles.options}>
              <Button
                onPress={() => this.onChangeEditStatus("Qty")}
                style={{
                  width: 120,
                  borderRadius: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    this.state.status === "Qty" ? "#4B4C9D" : "#D3D3D3",
                }}
              >
                <Text
                  style={{
                    color: this.state.status === "Qty" ? "white" : "gray",
                  }}
                >
                  {strings.Quantity}
                </Text>
              </Button>
              <Button
                onPress={() => this.onChangeEditStatus("Price")}
                style={{
                  width: 120,
                  borderRadius: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    this.state.status === "Price" ? "#4B4C9D" : "#D3D3D3",
                }}
              >
                <Text
                  style={{
                    color: this.state.status === "Price" ? "white" : "gray",
                  }}
                >
                  {strings.Price}
                </Text>
              </Button>
              <Button
                onPress={() => this.onChangeEditStatus("Discount")}
                style={{
                  width: 120,
                  borderRadius: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    this.state.status === "Discount" ? "#4B4C9D" : "#D3D3D3",
                }}
              >
                <Text
                  style={{
                    color: this.state.status === "Discount" ? "white" : "gray",
                  }}
                >
                  {strings.Discount}
                </Text>
              </Button>
              <Button
                onPress={() => this.onChangeEditStatus("Commission")}
                style={{
                  width: 120,
                  borderRadius: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    this.state.status === "Commission" ? "#4B4C9D" : "#D3D3D3",
                }}
              >
                <Text
                  style={{
                    color:
                      this.state.status === "Commission" ? "white" : "gray",
                  }}
                >
                  {strings.Commission}
                </Text>
              </Button>
              <Button
                  onPress={() => this.onChangeEditStatus("Tax")}
                  style={{
                      width: 120,
                      borderRadius: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                          this.state.status === "Tax" ? "#4B4C9D" : "#D3D3D3",
                  }}
              >
                <Text
                    style={{
                        color:
                            this.state.status === "Tax" ? "white" : "gray",
                    }}
                >
                    Tax
                </Text>
              </Button>
            </View>
            {this.state.status === "Qty" ? (
              <Form>
                <Item regular>
                  <Input
                    editable={false}
                    keyboardType="numeric"
                    value={this.state.quantity}
                  />
                </Item>
              </Form>
            ) : this.state.status === "Price" ? (
              <Form>
                <Item regular>
                  <Input
                    editable={false}
                    keyboardType="numeric"
                    value={this.state.price}
                  />
                </Item>

                <View style={{ margin: 10 }}>
                  <EditCheckBox
                    label="Reverse Computation"
                    checked={this.state.reverse}
                    onPress={() =>
                      this.setState({ reverse: !this.state.reverse })
                    }
                  />
                </View>
                {this.state.reverse ? (
                  <Item regular>
                    <Input
                      editable={false}
                      keyboardType="numeric"
                      value={this.state.reverse_value}
                    />
                  </Item>
                ) : null}
              </Form>
            ) : this.state.status === "Discount" ? (
              <Form>
                <Item regular style={{ margin: 3 }}>
                  <Input
                    editable={false}
                    keyboardType="numeric"
                    value={this.state.discount}
                  />
                </Item>
                <View>
                  <Text style={{ fontWeight: "bold", marginBottom: 8 }}>
                    {strings.DiscountType}
                  </Text>
                  <Picker
                    iosHeader="Select one"
                    mode="dropdown"
                    selectedValue={this.state.percentageType}
                    onValueChange={this.onValueChange.bind(this)}
                  >
                    <Picker.Item
                      label={strings.Percentage}
                      value="percentage"
                    />
                    <Picker.Item
                      label={strings.FixDiscount}
                      value="fixDiscount"
                    />
                  </Picker>
                </View>
              </Form>
            ) : this.state.status === "Commission" ? (
              <Form>
                <Form style={{ marginTop: 10, flexDirection: "row" }}>
                  <Picker
                    mode="dropdown"
                    style={{ width: 600 * 0.87 }}
                    textStyle={{ borderWidth: 1 }}
                    selectedValue={this.state.attendantName}
                    onValueChange={value => {
                      this.computeCommission(value);
                    }}
                  >
                    <Picker.Item label="None" value="No Attendant" />
                    {attendants}
                  </Picker>
                  <Button
                    block
                    success
                    onPress={() => this.onAddCommissionAttendant()}
                  >
                    <Text>{strings.Add}</Text>
                  </Button>
                </Form>
                {this.props.commissionArray.length > 0 ? (
                  <View style={{ marginBottom: 30 }}>
                    <Grid>
                      <Col
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                          height: 50,
                          fontSize: 16,
                        }}
                      >
                        <Text>{strings.Name}</Text>
                      </Col>
                      <Col
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                          height: 50,
                          fontSize: 16,
                        }}
                      >
                        <Text>{strings.Amount}</Text>
                      </Col>
                    </Grid>
                  </View>
                ) : null}

                <View>
                  <FlatList
                    numColumns={1}
                    data={this.props.commissionArray}
                    keyExtractor={(item, index) => index}
                    renderItem={this._renderItem}
                  />
                </View>
              </Form>
            ) : null}
            {this.state.status !== "Commission" && this.state.status !== "Tax" ? (
              <View style={styles.keypad}>
                <ModalKeypadComponent
                  onNumberPress={text =>
                    this.state.status === "Qty"
                      ? this.onNumberPress(text)
                      : this.state.status === "Price"
                        ? this.onNumberPricePress(text)
                        : this.state.status === "Commission"
                          ? this.onNumberCommissionPress(text)
                          : this.state.status === "Discount"
                            ? this.onNumberDiscountPress(text)
                            : ""
                  }
                  onDeletePress={() =>
                    this.state.status === "Qty"
                      ? this.onDeletePress()
                      : this.state.status === "Price"
                        ? this.onDeletePricePress()
                        : this.state.status === "Commission"
                          ? this.onDeleteCommissionPress()
                          : this.state.status === "Discount"
                            ? this.onDeleteDiscountPress()
                            : ""
                  }
                />
              </View>
            ) : null}

              {this.state.status === "Tax" ? (
                  this.state.tax.length > 0 ? (
                      <View style={{width: 600, marginBottom: 10, marginTop: 10, height: 300  }}>
                        <View >

                          <Grid>
                            <Row>
                              <Col
                                  style={{
                                      marginLeft: 40,
                                      alignItems: "flex-start",
                                      justifyContent: "center",
                                      height: 50,
                                      fontSize: 16,
                                  }}
                              >
                                <Text>Tax</Text>
                              </Col>
                              <Col
                                  style={{
                                      alignItems: "center",
                                      justifyContent: "center",
                                      height: 50,
                                      fontSize: 16,
                                  }}
                              >
                                <Text>Tax Rate</Text>
                              </Col>
                              <Col
                                  style={{
                                      alignItems: "center",
                                      justifyContent: "center",
                                      height: 50,
                                      fontSize: 16,
                                  }}
                              >
                                <Text>Tax Amount</Text>
                              </Col>
                            </Row>
                          </Grid>
                        </View>
                        <View style={{marginTop: 45, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
                        <FlatList
                            data={this.state.tax}
                            renderItem={(item) => this._renderItemTax(item)}
                            keyExtractor={(item, index) => index}
                        />
                        </View>
                        <View>
                          <Grid>
                            <Row>
                              <Col
                                  style={{
                                      marginLeft: 40,
                                      alignItems: "flex-start",
                                      justifyContent: "center",
                                      height: 50,
                                      fontSize: 16,
                                  }}
                               />
                              <Col
                                  style={{
                                      alignItems: "center",
                                      justifyContent: "center",
                                      height: 50,
                                      fontSize: 16,
                                  }}
                              >
                                <Text>Total</Text>
                              </Col>
                              <Col
                                  style={{
                                      alignItems: "center",
                                      justifyContent: "center",
                                      height: 50,
                                      fontSize: 16,
                                  }}
                              >
                                <Text>
                                    {this.state.taxTotal}
                                </Text>
                              </Col>
                            </Row>
                          </Grid>
                        </View>

                      </View>
                  ) : (

                      <View style={{justifyContent: "center", alignItems: "center", height: 30}}>
                        <Text>
                          No Tax for this item
                        </Text>
                      </View>
                  )

              ) : null}
            <Button
              block
              success
              style={styles.setButton}
              onPress={() => {
                this.props.onSubmit(this.state);
              }}
            >
              <Text>Edit Transaction</Text>
            </Button>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  view: {
    flex: 1,
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "center",
    backgroundColor: "#00000090",
  },
  innerView: {
    width: 600,
    backgroundColor: "white",
  },

  headerView: {
    padding: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    borderBottomColor: "#bbb",
    justifyContent: "space-between",
  },
  headerText: {
    color: "gray",
    fontWeight: "bold",
  },
  closeButton: {
    alignSelf: "flex-end",
  },
  options: {
    width: 360,
    flexDirection: "row",
  },
  setButton: {
    borderRadius: 0,
  },
  keypad: {
    alignItems: "center",
    justifyContent: "center",
  },
});
