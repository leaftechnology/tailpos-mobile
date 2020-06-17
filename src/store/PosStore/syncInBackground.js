import { Toast } from "native-base";
import { currentLanguage } from "../../translations/CurrentLanguage";
import translation from "../../translations/translation";
import LocalizedStrings from "react-native-localization";
let strings = new LocalizedStrings(translation);
import BackgroundJob from "react-native-background-job";

export function syncObjectValues(status, store, jobStatus) {
  strings.setLanguage(currentLanguage().companyLanguage);
  store.itemStore.resetLengths();
  const { forceSync, selectedSync } = store.syncStore;

  let syncStoreMethod = "";

  if (status === "forceSync") {
    syncStoreMethod = forceSync();
  }

  if (status === "sync") {
    syncStoreMethod = selectedSync();
  }

  syncStoreMethod.then(async result => {
    const resLength = JSON.parse(result).length;
    const trashLength = JSON.parse(store.syncStore.trashRows).length;
    if (resLength > 0 || trashLength > 0) {
      const protocol = store.stateStore.isHttps ? "https://" : "http://";
      const syncInfo = {
        deviceId: store.stateStore.deviceId,
        url:
          store.printerStore.sync[0].url !== undefined
            ? protocol + store.printerStore.sync[0].url
            : "",
        user_name: store.printerStore.sync[0].user_name
          ? store.printerStore.sync[0].user_name
          : "",
        password: store.printerStore.sync[0].password
          ? store.printerStore.sync[0].password
          : "",
      };

      store.syncStore
        .syncNow(result, status, syncInfo, jobStatus, store)
        .then(async resultFromErpnext => {
          if (resultFromErpnext) {
            const data = resultFromErpnext.data;
            const deleted = resultFromErpnext.deleted_documents;

            for (let x = 0; x < data.length; x++) {
              const table = data[x].tableNames;

              if (table === "Categories") {
                await categorySync(data[x], store);
              } else if (table === "Customer") {
                await customerSync(data[x], store);
              } else if (table === "Discounts") {
                await discountSync(data[x], store);
              } else if (table === "Attendants") {
                await attendantSync(data[x], store);
              } else if (table === "Company") {
                await companySync(data[x], store);
              } else if (table === "Wallet") {
                await walletSync(data[x], store);
              } else if (table === "Device") {
                await modeOfPaymentSync(data[x], store);
              } else if (table === "Loyalt") {
                await loyaltySync(data[x], store);
              }
            }

            if (deleted.length > 0) {
              for (let x = 0; x < deleted.length; x++) {
                await deleteRecords(deleted[x], store);
              }
            }
          }

          for (let xx = 0; xx < resultFromErpnext.data.length; xx += 1) {
            if (resultFromErpnext.data[xx].tableNames === "Item") {
              await itemSync(resultFromErpnext.data[xx], store);
            }
          }
          await changeSyncStatusValue(result, store);
          await category_lengths(store);
          if (!jobStatus) {
            setTimeout(() => {
              Toast.show({
                text: strings.SyncSuccessful + ". Please restart TailPOS",
                duration: 30000,
              });
              store.stateStore.setIsNotSyncing();
            }, 10000);
          }

          BackgroundJob.cancel({ jobKey: "AutomaticSync" });
        });
    } else {
      if (!jobStatus) {
        setTimeout(() => {
          Toast.show({
            text: strings.AlreadyUpToDate,
            type: "danger",
            duration: 3000,
          });
          store.stateStore.setIsNotSyncing();
        }, 10000);
      }
      BackgroundJob.cancel({ jobKey: "AutomaticSync" });
    }
  });
}
export async function itemSync(itemObject, store) {
  let itemObjectResult = await store.itemStore.find(itemObject.syncObject.id);
  let categoryId = "";

  if (itemObject.syncObject.category !== "") {
    let categoryIds = await store.categoryStore.searchLengthName(
      itemObject.syncObject.category,
    );
    if (categoryIds) {
      categoryId = categoryIds._id;
    }
  } else {
    categoryId = "No Category";
  }

  if (itemObjectResult) {
    itemObjectResult.edit({
      _id: itemObject.syncObject.id,
      name:
        itemObject.syncObject.name !== null ? itemObject.syncObject.name : "",
      description:
        itemObject.syncObject.item_name !== null
          ? itemObject.syncObject.item_name
          : "",
      soldBy:
        itemObject.syncObject.stock_uom !== null
          ? itemObject.syncObject.stock_uom
          : "",
      price:
        itemObject.syncObject.standard_rate !== null
          ? itemObject.syncObject.standard_rate
          : 0,
      tax:
        itemObject.syncObject.item_tax_template_detail.length > 0
          ? JSON.stringify(itemObject.syncObject.item_tax_template_detail)
          : "[]",
      sku: itemObject.syncObject.sku !== null ? itemObject.syncObject.sku : "",
      barcode:
        itemObject.syncObject.barcode === null ||
        itemObject.syncObject.barcode === undefined
          ? ""
          : itemObject.syncObject.barcode,
      translation_text:
          itemObject.syncObject.arabic_text === null ||
          itemObject.syncObject.arabic_text === undefined
              ? ""
              : itemObject.syncObject.arabic_text,
      colorAndShape: JSON.stringify([
        {
          color:
            itemObject.syncObject.color !== null
              ? itemObject.syncObject.color.toLowerCase().replace(" ", "")
              : "gray",
          shape:
            itemObject.syncObject.shape !== null
              ? itemObject.syncObject.shape.toLowerCase()
              : "square",
        },
      ]),
      colorOrImage:
        itemObject.syncObject.color_or_image !== null
          ? itemObject.syncObject.color_or_image
          : "",
      imagePath:
        itemObject.syncObject.image !== null ? itemObject.syncObject.image : "",
      favorite:
        itemObject.syncObject.favorite !== null
          ? itemObject.syncObject.favorite
          : "",
      category:
        categoryId === null || categoryId === undefined ? "" : categoryId,
      taxes: "[]",
      dateUpdated: Date.now(),
      syncStatus: true,
    });
  } else {
    var objecct_to_add = {
      _id: itemObject.syncObject.id,
      name:
        itemObject.syncObject.name !== null ? itemObject.syncObject.name : "",
      description:
        itemObject.syncObject.item_name !== null
          ? itemObject.syncObject.item_name
          : "",
      soldBy:
        itemObject.syncObject.stock_uom !== null
          ? itemObject.syncObject.stock_uom === "Nos"
            ? "Each"
            : itemObject.syncObject.stock_uom
          : "",
      price:
        itemObject.syncObject.standard_rate !== null
          ? itemObject.syncObject.standard_rate
          : 0,
      tax:
          itemObject.syncObject.item_tax_template_detail.length > 0
              ? JSON.stringify(itemObject.syncObject.item_tax_template_detail)
              : "[]",
      sku: itemObject.syncObject.sku !== null ? itemObject.syncObject.sku : "",
      barcode:
        itemObject.syncObject.barcode !== null &&
        itemObject.syncObject.barcode !== undefined
          ? itemObject.syncObject.barcode
          : "",
      translation_text:
          itemObject.syncObject.arabic_text === null ||
          itemObject.syncObject.arabic_text === undefined
              ? ""
              : itemObject.syncObject.arabic_text,
      colorAndShape: JSON.stringify([
        {
          color:
            itemObject.syncObject.color !== null
              ? itemObject.syncObject.color.toLowerCase().replace(" ", "")
              : "gray",
          shape:
            itemObject.syncObject.shape !== null
              ? itemObject.syncObject.shape.toLowerCase()
              : "square",
        },
      ]),
      colorOrImage:
        itemObject.syncObject.color_or_image !== null
          ? itemObject.syncObject.color_or_image
          : "",
      imagePath:
        itemObject.syncObject.image !== null ? itemObject.syncObject.image : "",
      favorite:
        itemObject.syncObject.favorite !== null
          ? itemObject.syncObject.favorite
          : "",
      category: categoryId,
      taxes: "[]",
      dateUpdated: Date.now(),
      syncStatus: itemObject.syncObject.id !== null,
    };
    itemObject.syncObject.id !== null
      ? (objecct_to_add._id = itemObject.syncObject.id)
      : null;

    store.itemStore.add(objecct_to_add);
  }
}

export async function categorySync(categoryObject, store) {
  const { id, description, color, shape } = categoryObject.syncObject;

  await store.categoryStore.find(id).then(categoryObjectResult => {
    if (categoryObjectResult !== null) {
      categoryObjectResult.edit({
        _id: id,
        name: description !== null ? description : "",
        colorAndShape: JSON.stringify([
          {
            color: color !== null ? color.toLowerCase() : "gray",
            shape: shape !== null ? shape.toLowerCase() : "square",
          },
        ]),
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    } else {
      store.categoryStore.add({
        _id: id !== null ? id : "",
        name: description !== null ? description : "",
        colorAndShape: JSON.stringify([
          {
            color: color !== null ? color.toLowerCase() : "gray",
            shape: shape !== null ? shape.toLowerCase() : "square",
          },
        ]),
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    }
  });
}

export async function discountSync(discountObject, store) {
  let discountObjectResult = await store.discountStore.find(
    discountObject.syncObject.id,
  );
  if (discountObjectResult) {
    discountObjectResult.edit({
      _id:
        discountObject.syncObject.id !== null
          ? discountObject.syncObject.id
          : "",
      name:
        discountObject.syncObject.description !== null
          ? discountObject.syncObject.description
          : "",
      value:
        discountObject.syncObject.value !== null
          ? discountObject.syncObject.value
          : 0,
      percentageType:
        discountObject.syncObject.percentagetype !== null
          ? discountObject.syncObject.percentagetype
          : "percentage",
      dateUpdated: Date.now(),
      syncStatus: true,
    });
  } else {
    store.discountStore.add({
      _id:
        discountObject.syncObject.id !== null
          ? discountObject.syncObject.id
          : "",
      name:
        discountObject.syncObject.description !== null
          ? discountObject.syncObject.description
          : "",
      value:
        discountObject.syncObject.value !== null
          ? discountObject.syncObject.value
          : 0,
      percentageType:
        discountObject.syncObject.percentagetype !== null
          ? discountObject.syncObject.percentagetype
          : "percentage",
      dateUpdated: Date.now(),
      syncStatus: true,
    });
  }
}

export async function attendantSync(attendantObject, store) {
  let attendantObjectResult = await store.attendantStore.find(
    attendantObject.syncObject.id,
  );
  if (attendantObjectResult) {
    attendantObjectResult.edit({
      _id: attendantObject.syncObject.id,
      user_name:
        attendantObject.syncObject.user_name !== null
          ? attendantObject.syncObject.user_name
          : "",
      pin_code:
        attendantObject.syncObject.pin_code !== null
          ? attendantObject.syncObject.pin_code
          : "",
      role:
        attendantObject.syncObject.role !== null
          ? attendantObject.syncObject.role
          : "Cashier",
      dateUpdated: Date.now(),
      syncStatus: true,
    });
  } else {
    store.attendantStore.add({
      _id:
        attendantObject.syncObject.id !== null
          ? attendantObject.syncObject.id
          : "",
      user_name:
        attendantObject.syncObject.user_name !== null
          ? attendantObject.syncObject.user_name
          : "",
      pin_code:
        attendantObject.syncObject.pin_code !== null
          ? attendantObject.syncObject.pin_code
          : "",
      role:
        attendantObject.syncObject.role !== null
          ? attendantObject.syncObject.role
          : "Cashier",
      dateUpdated: Date.now(),
      syncStatus: true,
    });
  }
}
export async function modeOfPaymentSync(modeOfPaymentObject, store) {
    modeOfPaymentObject.paymentTypes.map(async mop => {
        let modeOfPaymentObjectResult = await store.modeOfPaymentStore.findName(mop.mop);

        if (modeOfPaymentObjectResult){
            modeOfPaymentObjectResult.edit({
                mop:
                    mop.mop !== null
                        ? mop.mop
                        : "",
                mop_arabic:
                    mop.mop_arabic !== null
                        ? mop.mop_arabic
                        : "",
            });

        } else {
            store.modeOfPaymentStore.add({
                mop:
                    mop.mop !== null
                        ? mop.mop
                        : "",
                mop_arabic:
                    mop.mop_arabic !== null
                        ? mop.mop_arabic
                        : "",
            });
        }
    });

}

export async function customerSync(customerObject, store) {
  if (customerObject.syncObject.id !== null) {
    const customerObjectResult = await store.customerStore.find(
      customerObject.syncObject.id,
    );

    if (customerObjectResult) {
      customerObjectResult.edit({
        _id: customerObject.syncObject.id,
        name:
          customerObject.syncObject.customer_name !== null
            ? customerObject.syncObject.customer_name
            : "",
        email:
          customerObject.syncObject.email !== null
            ? customerObject.syncObject.email
            : "",
        phoneNumber:
          customerObject.syncObject.phonenumber !== null
            ? customerObject.syncObject.phonenumber
            : "Cashier",
        note:
          customerObject.syncObject.note !== null
            ? customerObject.syncObject.note
            : "Cashier",
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    } else {
      store.customerStore.add({
        _id: customerObject.syncObject.id,
        name:
          customerObject.syncObject.customer_name !== null
            ? customerObject.syncObject.customer_name
            : "",
        email:
          customerObject.syncObject.email !== null
            ? customerObject.syncObject.email
            : "",
        phoneNumber:
          customerObject.syncObject.phonenumber !== null
            ? customerObject.syncObject.phonenumber
            : "Cashier",
        note:
          customerObject.syncObject.note !== null
            ? customerObject.syncObject.note
            : "Cashier",
        dateUpdated: Date.now(),
        syncStatus: true,
      });
    }
  }
}
export async function loyaltySync(loyaltyObject, store) {
  if ("name" in loyaltyObject.syncObject) {
    const loyaltyObjectResult = await store.loyaltyStore.findNumber(
        loyaltyObject.syncObject.name,
    );

    if (loyaltyObjectResult) {
        loyaltyObjectResult.edit({
        _id: loyaltyObject.syncObject.id,
        customer_number:
            loyaltyObject.syncObject.name !== null
            ? loyaltyObject.syncObject.name
            : "",
        points:
            loyaltyObject.syncObject.points !== null
            ? loyaltyObject.syncObject.points
            : "",
        loyaltyProgram:
            loyaltyObject.syncObject.loyaltyProgram !== null
            ? loyaltyObject.syncObject.loyaltyProgram
            : 0,
        syncStatus: false,
      });
    } else {
      store.customerStore.add({
          _id: loyaltyObject.syncObject.id,
          customer_number:
              loyaltyObject.syncObject.name !== null
                  ? loyaltyObject.syncObject.name
                  : "",
          points:
              loyaltyObject.syncObject.points !== null
                  ? loyaltyObject.syncObject.points
                  : "",
          loyaltyProgram:
              loyaltyObject.syncObject.loyaltyProgram !== null
                  ? loyaltyObject.syncObject.loyaltyProgram
                  : 0,
          syncStatus: false,
      });
    }
  }
}
export async function walletSync(walletObject, store) {
  if (walletObject.syncObject.id !== null) {
    const walletObjectResult = await store.walletStore.find(
      walletObject.syncObject.id,
    );

    if (walletObjectResult) {
      walletObjectResult.edit({
        _id: walletObjectResult.syncObject.id,
        wallet_card_number:
          walletObjectResult.syncObject.wallet_card_number !== null
            ? walletObjectResult.syncObject.wallet_card_number
            : "",
        prepaid_balance:
          walletObjectResult.syncObject.prepaid_balance !== null
            ? walletObjectResult.syncObject.prepaid_balance
            : 0,
        credit_limit:
          walletObjectResult.syncObject.credit_limit !== null
            ? walletObjectResult.syncObject.credit_limit
            : 0,
      });
    } else {
      store.walletStore.add({
        _id: walletObject.syncObject.id,
        wallet_card_number:
          walletObject.syncObject.wallet_card_number !== null
            ? walletObject.syncObject.wallet_card_number
            : "",
        prepaid_balance:
          walletObject.syncObject.prepaid_balance !== null
            ? walletObject.syncObject.prepaid_balance
            : 0,
        credit_limit:
          walletObject.syncObject.credit_limit !== null
            ? walletObject.syncObject.credit_limit
            : 0,
      });
    }
  }
}
export async function companySync(companyObject, store) {
  const companyObjectResult = await store.printerStore.findCompany(
    store.printerStore.companySettings[0]._id,
  );
  if (companyObjectResult) {
    console.log("LOYALTYYYYYYYYYYYYY")
    console.log(companyObject.loyalty)
    companyObjectResult.edit({
      _id: store.printerStore.companySettings[0]._id,
      name:
        "company_name" in companyObject.syncObject
          ? companyObject.syncObject.company_name
          : "",
        nameTranslation:"company_translation" in companyObject.device
            ? companyObject.device.company_translation
            : "",
      countryCode:
        companyObject.syncObject.default_currency !== null
          ? companyObject.syncObject.default_currency
          : store.printerStore.companySettings[0].countryCode,
      companyLanguage: store.printerStore.companySettings[0].companyLanguage,
      header:
        "header" in companyObject.device
          ? companyObject.device.header
          : store.printerStore.companySettings[0].header,
        headerTranslation:
        "header_translation" in companyObject.device
          ? companyObject.device.header_translation
          : store.printerStore.companySettings[0].header,
      footer:
        "footer" in companyObject.device
          ? companyObject.device.footer
          : store.printerStore.companySettings[0].footer,
        footerTranslation:
        "footer_translation" in companyObject.device
          ? companyObject.device.footer_translation
          : store.printerStore.companySettings[0].footer,
      tax: store.printerStore.companySettings[0].tax,
      loyalty: companyObject.loyalty,
    });
    store.stateStore.changeValue(
      "companyName",
      store.printerStore.companySettings[0].name.toString(),
      "Settings",
    );

    store.stateStore.changeValue(
      "loyalty",
        companyObject.loyalty,
      "Settings",
    );
    store.stateStore.changeValue(
      "tax",
      store.printerStore.companySettings[0].tax.toString(),
      "Settings",
    );
    store.stateStore.changeValue(
      "companyHeader",
      store.printerStore.companySettings[0].header.toString(),
      "Settings",
    );
    store.stateStore.changeValue(
      "companyFooter",
      store.printerStore.companySettings[0].footer.toString(),
      "Settings",
    );
    store.stateStore.changeValue(
      "companyLanguage",
      store.printerStore.companySettings[0].companyLanguage.toString(),
      "Settings",
    );
    store.stateStore.changeValue(
      "oldLanguage",
      store.printerStore.companySettings[0].companyLanguage.toString(),
      "Settings",
    );
    store.stateStore.changeValue(
      "companyCountry",
      store.printerStore.companySettings[0].countryCode.toString(),
      "Settings",
    );
  }
}
export async function changeSyncStatusValue(data, store) {
  let dataValue = JSON.parse(data);
  if (dataValue.length > 0) {
    for (let x = 0; x < dataValue.length; x += 1) {
      if (dataValue[x].dbName === "Item") {
        await changeValue(dataValue[x], store.itemStore, "Item");
      } else if (dataValue[x].dbName === "Categories") {
        await changeValue(dataValue[x], store.categoryStore, "Categories");
      } else if (dataValue[x].dbName === "Discounts") {
        await changeValue(dataValue[x], store.discountStore, "Discounts");
      } else if (dataValue[x].dbName === "Attendants") {
        await changeValue(dataValue[x], store.attendantStore, "Attendants");
      } else if (dataValue[x].dbName === "Receipts") {
        await changeValue(dataValue[x], store.receiptStore, "Receipts");
      } else if (dataValue[x].dbName === "Shifts") {
        await changeValue(dataValue[x], store.shiftStore, "Shifts");
      } else if (dataValue[x].dbName === "Payments") {
        await changeValue(dataValue[x], store.paymentStore, "Payments");
      } else if (dataValue[x].dbName === "Customer") {
        await changeValue(dataValue[x], store.customerStore, "Customer");
      } else if (dataValue[x].dbName === "Company") {
        await changeValue(dataValue[x], store.printerStore, "Company");
      }
    }
  }
}

export async function changeValue(changeObject, store, dbType) {
  if (changeObject) {
    let objectToBeEdit = "";

    if (dbType === "Company") {
      objectToBeEdit = await store.findCompany(changeObject.syncObject._id);
    } else if (dbType === "Receipts") {
      objectToBeEdit = await store.findReceipt(changeObject.syncObject._id);
    } else if (dbType === "Shifts") {
      objectToBeEdit = await store.findShift(changeObject.syncObject._id);
    } else if (dbType === "Payments") {
      objectToBeEdit = await store.findPayment(changeObject.syncObject._id);
    } else {
      objectToBeEdit = await store.find(changeObject.syncObject._id);
    }

    if (objectToBeEdit && dbType !== "Receipts") {
      objectToBeEdit.edit({
        syncStatus: true,
      });
    } else if (objectToBeEdit && dbType === "Receipts") {
      objectToBeEdit.changeStatus();
    }
  }
}

export async function deleteRecords(deletedObject, store) {
  if (deletedObject) {
    if (deletedObject._id !== null) {
      let objectToBeDeleted = "";
      if (deletedObject.tableNames === "Items") {
        objectToBeDeleted = await store.itemStore.find(deletedObject._id);
      } else if (deletedObject.tableNames === "Categories") {
        objectToBeDeleted = await store.categoryStore.find(deletedObject._id);
      } else if (deletedObject.tableNames === "Discounts") {
        objectToBeDeleted = await store.discountStore.find(deletedObject._id);
      } else if (deletedObject.tableNames === "Attendants") {
        objectToBeDeleted = await store.attendantStore.find(deletedObject._id);
      } else if (deletedObject.tableNames === "Customer") {
        objectToBeDeleted = await store.customerStore.find(deletedObject._id);
      }

      if (deletedObject.tableNames === "Items" && objectToBeDeleted) {
        store.itemStore.updateLengthDelete();
        store.itemStore.updateLengthObjectsDelete(objectToBeDeleted.category);
      }
      if (objectToBeDeleted) {
        objectToBeDeleted.delete();
      }
    }
  }
}
export async function category_lengths(props) {
  await props.itemStore.getLengthItemsFromDb();
}
