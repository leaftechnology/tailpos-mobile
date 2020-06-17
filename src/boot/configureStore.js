import AttendantStore from "@posStore/AttendantStore";
import ModeOfPaymentStore from "@posStore/ModeOfPaymentStore";
import ItemStore from "@posStore/ItemStore";
import TokenStore from "@posStore/TokenStore";
import CategoryStore from "@posStore/CategoryStore";
import DiscountStore from "@posStore/DiscountStore";
import CustomerStore from "@posStore/CustomerStore";
import ReceiptStore from "@posStore/ReceiptStore";
import PaymentStore from "@posStore/PaymentStore";
import PrinterStore from "@posStore/PrinterStore";
import LoyaltyStore from "@posStore/LoyaltyStore";
import ShiftStore from "@posStore/ShiftStore";
import TaxesStore from "@posStore/TaxesStore";
import SyncStore from "@posStore/SyncStore";
import RoleStore from "@posStore/RoleStore";
import ShiftReportsStore from "@posStore/ShiftReportsStore";
import LoginStore from "@viewStore/LoginViewStore";
import SignupStore from "@viewStore/SignupViewStore";
import LostPasswordStore from "@viewStore/LostPasswordViewStore";
import StateStore from "../store/StateStore/StateStore";
import HeadSyncStore from "../store/SyncStore/Head";

export default function() {
  const stateStore = StateStore;
  const loyaltyStore = LoyaltyStore;
  const itemStore = ItemStore;
  const attendantStore = AttendantStore;
  const modeOfPaymentStore = ModeOfPaymentStore;
  const customerStore = CustomerStore;
  const categoryStore = CategoryStore;
  const discountStore = DiscountStore;
  const loginForm = LoginStore;
  const receiptStore = ReceiptStore;
  const paymentStore = PaymentStore;
  const printerStore = PrinterStore;
  const taxesStore = TaxesStore;
  const tokenStore = TokenStore;
  const shiftStore = ShiftStore;
  const syncStore = SyncStore;
  const signupForm = SignupStore;
  const roleStore = RoleStore;
  const shiftReportsStore = ShiftReportsStore;
  const lostPasswordForm = LostPasswordStore;
  const headSyncStore = HeadSyncStore;

  return {
    loginForm,
      loyaltyStore,
      modeOfPaymentStore,
    itemStore,
    attendantStore,
    customerStore,
    categoryStore,
    discountStore,
    receiptStore,
    paymentStore,
    printerStore,
    taxesStore,
    tokenStore,
    shiftStore,
    syncStore,
    signupForm,
    shiftReportsStore,
    lostPasswordForm,
    stateStore,
    headSyncStore,
    roleStore,
  };
}
