import PouchDB from "pouchdb-react-native";
import SQLite from "react-native-sqlite-2";
import SQLiteAdapterFactory from "pouchdb-adapter-react-native-sqlite";
import { getRoot } from "mobx-state-tree";
import FrappeFetch from "react-native-frappe-fetch";
import { NetInfo } from "react-native";
import { showToastDanger } from "../../utils";

var validUrl = require("valid-url");
import BackgroundJob from "react-native-background-job";

export function openAndSyncDB(dbName, withSync = false) {
  const SQLiteAdapter = SQLiteAdapterFactory(SQLite);
  PouchDB.plugin(SQLiteAdapter);
  const db = new PouchDB(dbName + ".db", { adapter: "react-native-sqlite" });
  PouchDB.plugin(require("pouchdb-find"));
  PouchDB.plugin(require("pouchdb-upsert"));
  return db;
}
export function syncDB(db, dbName, session) {
  // Server URL
  const url = `https://${session.db_name}:${session.token}@db.tailpos.com/${
    session.db_name
  }-${dbName}`;
  const opts = { live: true, retry: true };

  // Sync from
  return db.replicate.from(url).on("complete", function(info) {
    db.sync(url, opts);
  });
}
export function sync(
  jsonObject,
  type,
  trashObj,
  credentials,
  jobStatus,
  store,
) {
  return NetInfo.isConnected.fetch().then(async isConnected => {
    if (isConnected) {
      let site_credentials = credentials_info(credentials);
      let tailpos_object = tailpos_data(
        jsonObject,
        type,
        trashObj,
        credentials,
      );
      return sync_now(site_credentials, tailpos_object, jobStatus, store);
    } else {
      showToastDanger("No Internet Connection. Please Check");
    }
  });
}

export function sync_now(site_credentials, tailpos_object, jobStatus, store) {
  if (site_credentials.url) {
    if (validUrl.isWebUri(site_credentials.url)) {
      return FrappeFetch.createClient(site_credentials)
        .then(() => {
          const { Client } = FrappeFetch;
          return Client.postApi(
            "tailpos_sync.sync_pos.sync_data",
            tailpos_object,
          );
        })
        .catch(() => {
          store.stateStore.setIsNotSyncing();
          BackgroundJob.cancel({ jobKey: "AutomaticSync" });
          if (!jobStatus) {
            showToastDanger(
              "Unable to sync. Please check error logs in ERPNext",
            );
          }
        })
        .then(response => response.json())
        .then(responseJson => {
          if (responseJson.message.status) {
            return responseJson.message.data;
          } else {
            showToastDanger(
              "Unable to sync. Please check error logs in ERPNext",
            );
          }
        });
    } else {
      store.stateStore.setIsNotSyncing();
      showToastDanger("Invalid URL. Please input valid URL in Sync Settings");
      BackgroundJob.cancel({ jobKey: "AutomaticSync" });
    }
  } else {
    BackgroundJob.cancel({ jobKey: "AutomaticSync" });
  }
}
export function credentials_info(credentials) {
  return {
    url: credentials.url.toLowerCase(),
    username: credentials.user_name,
    password: credentials.password,
  };
}
export function tailpos_data(jsonObject, type, trashObj, credentials) {
  return {
    tailposData: JSON.parse(jsonObject),
    trashObject: JSON.parse(trashObj),
    deviceId: credentials.deviceId,
    typeOfSync: type,
  };
}

export function saveSnapshotToDB(db, snapshot) {
  let updateObj = false;
  db.upsert(snapshot._id, function(doc) {
    if (!doc._id) {
      doc = snapshot;
      updateObj = true;
    } else {
      Object.keys(snapshot).forEach(function(key) {
        if (!(key === "_rev")) {
          if (doc[key] !== snapshot[key]) {
            doc[key] = snapshot[key];
            updateObj = true;
          }
        }
      });
    }
    if (updateObj) {
      return doc;
    } else {
      return updateObj;
    }
  });
}

export function editFields(obj, data) {
  Object.keys(data).forEach(function(key) {
    if (!(key === "_id")) {
      obj[key] = data[key];
    }
  });
}

export function deleteObject(obj, db) {
  db.get(obj._id).then(doc => {
    db.remove(doc);
  });
  getRoot(obj).delete(obj);
}

export function getRows(obj, db, numberRows, rowsOptions) {

  return new Promise((resolve, reject) => {
    rowsOptions.limit = numberRows;
    rowsOptions.include_docs = true;
    db.allDocs(rowsOptions).then(entries => {
      if (entries && entries.rows.length > 0) {
        rowsOptions.startkey = entries.rows[entries.rows.length - 1].id;
        rowsOptions.skip = 1;
        for (var i = 0; i < entries.rows.length; i++) {
          if (entries.rows[i].doc.name || entries.rows[i].doc.role) {
            obj.add(JSON.parse(JSON.stringify(entries.rows[i].doc)));
          }
        }
      }
    });
    resolve(obj.rows);
  });
}
