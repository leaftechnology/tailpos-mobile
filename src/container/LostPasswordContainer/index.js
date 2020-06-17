import * as React from "react";
import { inject, observer } from "mobx-react/native";
import { Toast } from "native-base";
import { currentLanguage } from "../../translations/CurrentLanguage";

import LostPassword from "@screens/LostPassword";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
@inject("lostPasswordForm")
@observer
export default class LostPasswordContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isRequesting: false,
    };
  }

  onBack() {
    this.props.navigation.goBack();
  }

  onSendPassword() {
    // loading spinner
    this.setState({ isRequesting: true });

    this.props.lostPasswordForm.validateForm();

    if (this.props.lostPasswordForm.isValid) {
      this.props.lostPasswordForm
        .lostPassword()
        .then(result => {
          const { resetted } = result;

          if (resetted) {
            this.props.navigation.goBack();
            this.props.navigation.state.params.onSuccess();
          } else {
            Toast.show({
              text: strings.CheckYourEmail,
              buttonText: strings.Okay,
              type: "success",
              duration: 5000,
            });
          }
        })
        .catch(error => {
          Toast.show({
            text: strings.NetworkConnectionFailed,
            buttonText: strings.Okay,
            type: "danger",
            duration: 5000,
          });
          this.setState({ isRequesting: false });
        });
    }
  }

  render() {
    strings.setLanguage(currentLanguage().companyLanguage);
    return (
      <LostPassword
        isRequesting={this.state.isRequesting}
        emailError={this.props.lostPasswordForm.emailError}
        onEmailChange={text => this.props.lostPasswordForm.emailOnChange(text)}
        onSendPassword={() => this.onSendPassword()}
        onBack={() => this.onBack()}
      />
    );
  }
}
