import * as React from "react";
import { View, StyleSheet } from "react-native";
import { Text, Input, Button, Item, Picker, CheckBox } from "native-base";
import { currentLanguage } from "../../translations/CurrentLanguage";

import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import translation from "../.././translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
class AddAttendantComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      id: "",
      attendantName: "",
      pin: "",
      confirmPin: "",
      securityPinStatus: true,
      securityConfirmPinStatus: true,
      status: "Save Attendant",
      role: "Owner",
      canLogin: false,
      canApprove: false,
      commission: "",
    };
  }

  componentWillReceiveProps(nextProps) {
    const { attendantInfo } = nextProps;
    if (attendantInfo._id) {
      this.setState({ status: "Edit Attendant" });
    }
    if (attendantInfo.user_name || attendantInfo.attendantName) {
      this.setState({
        id: attendantInfo._id
          ? attendantInfo._id
          : attendantInfo.id
            ? attendantInfo.id
            : "",
        attendantName: attendantInfo.user_name
          ? attendantInfo.user_name
          : attendantInfo.attendantName
            ? attendantInfo.attendantName
            : "",
        role: attendantInfo.role
          ? attendantInfo.role
          : attendantInfo.role
            ? attendantInfo.role
            : "Cashier",
        pin: attendantInfo.pin_code
          ? attendantInfo.pin_code
          : attendantInfo.pin
            ? attendantInfo.pin
            : "",
        confirmPin: attendantInfo.pin_code
          ? attendantInfo.pin_code
          : attendantInfo.confirmPin
            ? attendantInfo.confirmPin
            : "",
        securityPinStatus: true,
        securityConfirmPinStatus: true,
        canLogin: attendantInfo.canLogin,
        canApprove: attendantInfo.canApprove,
        commission: attendantInfo.commission.toString(),
      });
    } else {
      this.setState({
        id: "",
        attendantName: "",
        pin: "",
        confirmPin: "",
        securityPinStatus: true,
        securityConfirmPinStatus: true,
        status: "Save Attendant",
        role: "Owner",
        canLogin: false,
        canApprove: false,
        commission: "",
      });
    }
  }

  onChangeAttendantName = attendantName => {
    this.setState({ attendantName });
  };

  onChangeCommission = commission => {
    this.setState({ commission });
  };

  onChangeRole = role => {
    this.setState({ role });
  };

  onChangePin = pin => {
    this.setState({ pin });
  };

  onChangeConfirmPin = confirmPin => {
    this.setState({ confirmPin });
  };

  togglePinStatus = () => {
    const { securityPinStatus } = this.state;
    this.setState({ securityPinStatus: !securityPinStatus });
  };

  toggleConfirmPinStatus = () => {
    const { securityConfirmPinStatus } = this.state;
    this.setState({ securityConfirmPinStatus: !securityConfirmPinStatus });
  };

  toggleCanLogin = () => {
    const { canLogin } = this.state;
    this.setState({ canLogin: !canLogin });
  };
  toggleCanApprove = () => {
    const { canApprove } = this.state;
    this.setState({ canApprove: !canApprove });
  };

  onPress = () => {
    const { status } = this.state;
    const { onSave, onEdit } = this.props;

    if (status === "Save Attendant") {
      onSave(this.state);
    }
    if (status === "Edit Attendant") {
      onEdit(this.state);
    }
  };

  renderRoles = roles => (
    <Picker.Item key={roles.role} label={roles.role} value={roles.role} />
  );

  renderCommission() {
    const { commission } = this.state;
    return (
      <Item>
        <Input
          value={commission}
          keyboardType="numeric"
          placeholder={strings.Commission}
          onChangeText={this.onChangeCommission}
        />
        <Icon name="percent" size={21} />
      </Item>
    );
  }

  renderPin() {
    const { pin, securityPinStatus } = this.state;
    return (
      <Item
        regular
        style={{
          marginTop: 10,
          borderColor: pin ? "black" : "red",
        }}
      >
        <Input
          value={pin}
          keyboardType="numeric"
          onChangeText={this.onChangePin}
          placeholder={strings.Pin}
          secureTextEntry={securityPinStatus}
        />
        <Icon
          active
          size={30}
          name={securityPinStatus ? "eye-off" : "eye"}
          onPress={this.togglePinStatus}
        />
      </Item>
    );
  }

  renderConfirmPin() {
    const { confirmPin, securityConfirmPinStatus } = this.state;
    return (
      <Item
        regular
        style={{
          marginTop: 10,
          borderColor: confirmPin ? "black" : "red",
        }}
      >
        <Input
          keyboardType="numeric"
          value={confirmPin}
          placeholder={strings.ConfirmPin}
          onChangeText={this.onChangeConfirmPin}
          secureTextEntry={securityConfirmPinStatus}
        />
        <Icon
          active
          size={30}
          name={securityConfirmPinStatus ? "eye-off" : "eye"}
          onPress={this.toggleConfirmPinStatus}
        />
      </Item>
    );
  }

  render() {
    strings.setLanguage(currentLanguage().companyLanguage);

    const { rolesData } = this.props;
    const { attendantName, role, canLogin, canApprove } = this.state;

    const Roles = rolesData.map(this.renderRoles);

    return (
      <View style={styles.view}>
        <Item regular style={{ borderColor: attendantName ? "black" : "red" }}>
          <Input
            value={attendantName}
            onChangeText={this.onChangeAttendantName}
            placeholder={strings.AttendantName}
          />
        </Item>
        <Text style={styles.pickerText}>{strings.Role}</Text>
        <View style={styles.pickerView}>
          <Picker
            mode="dropdown"
            selectedValue={role}
            onValueChange={this.onChangeRole}
          >
            {Roles}
          </Picker>
        </View>
        {role !== "Owner" ? this.renderCommission() : null}
        <View style={styles.checkboxView}>
          <CheckBox
            checked={canLogin}
            style={styles.checkbox}
            onPress={this.toggleCanLogin}
            color="gray"
          />
          <Text>{strings.CanLogin}</Text>
        </View>
        <View style={styles.checkboxView}>
          <CheckBox
            checked={canApprove}
            style={styles.checkbox}
            onPress={this.toggleCanApprove}
            color="gray"
          />
          <Text>Can Approve</Text>
        </View>
        {canLogin || canApprove ? this.renderPin() : null}
        {canLogin || canApprove ? this.renderConfirmPin() : null}
        <Button block success style={styles.button} onPress={this.onPress}>
          <Text style={styles.buttonText}>{this.state.status}</Text>
        </Button>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  view: {
    width: "50%",
    paddingHorizontal: 10,
  },
  pickerView: {
    borderWidth: 1,
    borderColor: "#cfcfcf",
  },
  checkbox: {
    left: 0,
    marginRight: 10,
  },
  checkboxView: {
    flexDirection: "row",
    marginTop: 10,
  },
  pickerText: {
    marginTop: 15,
    marginBottom: 5,
    fontWeight: "bold",
  },
  button: {
    marginTop: 15,
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
  },
});

export default AddAttendantComponent;
