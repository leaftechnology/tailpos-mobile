import { types, destroy } from "mobx-state-tree";
import { assignUUID } from "./Utils";
import {
  editFields,
  saveSnapshotToDB,
  openAndSyncDB,
  syncDB,
  deleteObject,
} from "./DbFunctions";

let db = openAndSyncDB("attendants", true);
// let rowsOptions = {};

let replicationHandler = null;

export const Attendant = types
  .model("Attendant", {
    _id: types.identifier(),
    user_name: types.string,
    pin_code: types.string,
    canLogin: types.optional(types.boolean, false),
    canApprove: types.optional(types.boolean, false),
    role: types.optional(types.string, ""),
    dateUpdated: types.optional(types.Date, Date.now),
    syncStatus: types.optional(types.boolean, false),
    commission: types.optional(types.number, 0),
  })
  .preProcessSnapshot(snapshot => assignUUID(snapshot, "Attendant"))
  .actions(self => ({
    postProcessSnapshot(snapshot) {
      saveSnapshotToDB(db, snapshot);
    },
    edit(data) {
      editFields(self, data);
    },
    delete() {
      deleteObject(self, db);
    },
    changeStatus() {
      // self.dateUpdated = Date.now;
      self.syncStatus = true;
    },
  }));

const AttendantStore = types
  .model("AttendantStore", {
    rows: types.optional(types.array(Attendant), []),
    defaultAttendant: types.maybe(types.reference(Attendant)),
    date: "2018-08-09",
  })
  .views(self => ({
    get hasAttendant() {
      return self.defaultAttendant ? true : false;
    },
  }))
  .actions(self => ({
    delete(row) {
      destroy(row);
    },
    initSync(session) {
      replicationHandler = syncDB(db, "attendants", session);
      replicationHandler.on("complete", function() {
        if (self.rows.length === 0) {
          self.getFromDb(20);
        }
      });
    },
    destroyDb() {
      self.defaultAttendant = null;
      db.destroy().then(function() {
        self.clear();
        db = openAndSyncDB("attendants", true);
      });
    },
    add(data) {
      self.rows.push(data);
    },
    setAttendant(attendant) {
      self.defaultAttendant = attendant;
    },
    changeDate(data) {
      self.date = data;
    },
    clear() {
      self.rows.clear();
    },
    async find(id) {
      let obj = await self.rows.find(data => {
        return data._id === id;
      });
      if (obj) {
        return obj;
      } else {
        db
          .find({
            selector: {
              _id: { $regex: `.*${id}.*` },
            },
          })
          .then(result => {
            const { docs } = result;
            if (docs.length > 0) {
              return Attendant.create(
                JSON.parse(JSON.stringify(result.docs[0])),
              );
            } else {
              return null;
            }
          });
      }
    },
    getData() {
      return new Promise(function(resolve, reject) {
        db.allDocs({ include_docs: true }).then(result => {
          resolve({ result: result.total_rows, rowsLength: self.rows.length });
        });
      });
    },
    getFromDb(numberRows) {
      db.allDocs({ include_docs: true }).then(entries => {
        if (entries.total_rows > 0) {
          const { rows } = entries;
          for (let i = 0; i < rows.length; i++) {
            // doc
            const { doc } = rows[i];

            // Attendant
            const attendant = Attendant.create({
              _id: doc._id,
              user_name: doc.user_name,
              pin_code: doc.pin_code,
              role: doc.role,
              canLogin: doc.canLogin ? doc.canLogin : false,
              canApprove: doc.canApprove ? doc.canApprove : false,
              commission: doc.commission,
              dateUpdated: doc.dateUpdated,
              syncStatus: doc.syncStatus,
            });

            self.add(attendant);
          }
        }
      });
    },
    findAttendant(name) {
      return new Promise(function(resolve, reject) {
        db
          .find({
            selector: {
              user_name: { $regex: `.*${name}.*` },
            },
          })
          .then(result => {
            if (result.docs.length > 0) {
              resolve(true);
            } else {
              resolve(false);
            }
          });
      });
    },
    findAttendantId(name) {
      return new Promise(function(resolve, reject) {
        db
          .find({
            selector: {
              user_name: { $regex: `.*${name}.*` },
            },
          })
          .then(result => {
            if (result.docs.length > 0) {
              resolve(result.docs[0]);
            }
          });
      });
    },
    findAttendantBasedOnRole(pin) {
      return new Promise(function(resolve, reject) {
        db
          .find({
            selector: {
              canApprove: { $regex: true },
              pin_code: { $regex: pin },
            },
          })
          .then(result => {
            if (result.docs.length > 0) {
              resolve(true);
            } else {
              resolve(false);
            }
          });
      });
    },
  }));

const Store = AttendantStore.create({});

export default Store;
