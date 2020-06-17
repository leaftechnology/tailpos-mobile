import * as React from "react";

import { View} from "react-native";
import { Input, CheckBox, Text} from "native-base";

export default class LoyaltyComponent extends React.Component {
    render() {
        return (
            <View style={{ backgroundColor: "white", width: "97%", height: 230, margin: 10}}>
                <View style={{height: 50}}>

                    <Input
                    style={{borderWidth: 1}}
                    value={this.props.mobile_number}

                    onChangeText={this.props.changeMobileNumber}
                    placeholder={"Mobile Number"}
                    keyboardType="numeric"

                    />
                </View>

                <View style={{flexDirection: "row", marginBottom: 10}}>
                    <CheckBox
                        checked={this.props.useLoyaltyPoints}
                        style={{margin: 10}}
                        onPress={this.props.onChangeCheckBox}
                    />
                    <Text style={{margin: 10}}>Use Loyalty Points</Text>
                </View>



                {this.props.useLoyaltyPoints ? (
                    <View style={{height: 50, marginBottom: 10}}>
                        <Input
                            style={{borderWidth: 1}}
                            value={this.props.currentPoints.toString()}
                            editable={false}
                            placeholder={"Current Points"}
                            keyboardType="numeric"

                        />
                    </View>
                ) : null}
                {this.props.useLoyaltyPoints ? (
                    <View style={{height: 50}}>
                        <Input
                            style={{borderWidth: 1}}
                            value={this.props.points}
                            onChangeText={this.props.changePoints}
                            placeholder={"Points"}
                            keyboardType="numeric"

                        />
                    </View>
                ) : null}
            </View>
        );
    }
}
