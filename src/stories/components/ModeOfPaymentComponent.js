import * as React from "react";
import { Dimensions, View, StyleSheet, FlatList } from "react-native";
import { Text, Card, CardItem, Item } from "native-base";
import { Col, Grid } from "react-native-easy-grid";
import { currentLanguage } from "../../translations/CurrentLanguage";
import translation from "../.././translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
class ModeOfPaymentComponent extends React.PureComponent {
    _renderItem = ({ item, index }) => {
        return (
            <Item
                regular
                style={styles.item}
            >
                <Text>{item.mop}</Text>
            </Item>
        );
    };

    renderModeOfPayment() {
        const {
            modeOfPaymentData,
        } = this.props;

        return (
            <CardItem style={styles.cardItemForm}>
                <FlatList
                    numColumns={1}
                    data={modeOfPaymentData}
                    renderItem={this._renderItem}
                    keyExtractor={this._extractKey}
                />
            </CardItem>
        );
    }

    render() {
        strings.setLanguage(currentLanguage().companyLanguage);
        return (
            <View>
                <Card style={styles.card}>
                    <CardItem style={styles.cardItem}>
                        <Grid>
                            <Col>
                                <Text style={styles.titleText}>Mode of Payments</Text>
                            </Col>
                            <Col />
                        </Grid>
                    </CardItem>
                    {this.renderModeOfPayment()}
                </Card>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    card: {
        width: "100%",
        alignSelf: "center",

    },
    cardItem: {
        marginBottom: 15,
        backgroundColor: "#4b4c9d",
    },
    cardItemForm: {
        alignItems: "flex-start",
    },
    titleText: {
        color: "white",
        fontSize: Dimensions.get("window").width * 0.02,
    },
    headerButton: {
        flexDirection: "row",
        alignSelf: "flex-end",
    },
    buttonText: {
        marginLeft: 5,
        color: "white",
        textAlignVertical: "center",
    },
    item: {
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
});

export default ModeOfPaymentComponent;
