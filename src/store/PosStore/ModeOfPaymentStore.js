import { types, destroy } from "mobx-state-tree";
import { assignUUID } from "./Utils";
import {
    editFields,
    saveSnapshotToDB,
    openAndSyncDB,
    syncDB,
    deleteObject,
} from "./DbFunctions";

let db = openAndSyncDB("modeofpayment", true);
// let rowsOptions = {};

let replicationHandler = null;

export const ModeOfPayment = types
    .model("ModeOfPayment", {
        _id: types.identifier(),
        mop: types.optional(types.string, ""),
        mop_arabic: types.optional(types.string, ""),
    })
    .preProcessSnapshot(snapshot => assignUUID(snapshot, "ModeOfPayment"))
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

const ModeOfPaymentStore = types
    .model("ModeOfPaymentStore", {
        rows: types.optional(types.array(ModeOfPayment), []),
    })
    .views(self => ({}))
    .actions(self => ({
        delete(row) {
            destroy(row);
        },
        initSync(session) {
            replicationHandler = syncDB(db, "modeofpayment", session);
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
                db = openAndSyncDB("modeofpayment", true);
            });
        },
        add(data) {
            self.rows.push(data);
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
                            return ModeOfPayment.create(
                                JSON.parse(JSON.stringify(result.docs[0])),
                            );
                        } else {
                            return null;
                        }
                    });
            }
        },
        async findName(name) {
            let obj = await self.rows.find(data => {
                return data.mop === name;
            });
            if (obj) {
                return obj;
            } else {
                db
                    .find({
                        selector: {
                            mop: { $regex: `.*${name}.*` },
                        },
                    })
                    .then(result => {
                        const { docs } = result;
                        if (docs.length > 0) {
                            return ModeOfPayment.create(
                                JSON.parse(JSON.stringify(result.docs[0])),
                            );
                        } else {
                            return null;
                        }
                    });
            }
        },
        getFromDb(numberRows) {
            db.allDocs({ include_docs: true }).then(entries => {
                if (entries.total_rows > 0) {
                    const { rows } = entries;
                    for (let i = 0; i < rows.length; i++) {
                        // doc
                        const { doc } = rows[i];

                        // Attendant
                        const mop = ModeOfPayment.create({
                            _id: doc._id,
                            mop: doc.mop,
                            mop_arabic: doc.mop_arabic,

                        });

                        self.add(mop);
                    }
                }
            });
        },
    }));

const Store = ModeOfPaymentStore.create({});

export default Store;
