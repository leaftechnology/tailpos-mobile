import { types, destroy } from "mobx-state-tree";
import { assignUUID } from "./Utils";
import {
    editFields,
    saveSnapshotToDB,
    openAndSyncDB,
    syncDB,
    deleteObject,
} from "./DbFunctions";

let db = openAndSyncDB("loyalty", true);
// let rowsOptions = {};

let replicationHandler = null;

export const Loyalty = types
    .model("Loyalty", {
        _id: types.identifier(),
        customer_number: types.optional(types.string,""),
        points: types.optional(types.number,0),
        loyaltyProgram: types.optional(types.number,0),
        syncStatus: types.optional(types.boolean,false),
    })
    .preProcessSnapshot(snapshot => assignUUID(snapshot, "Loyalty"))
    .actions(self => ({
        postProcessSnapshot(snapshot) {
            saveSnapshotToDB(db, snapshot);
        },
        edit(data) {
            editFields(self, data);
        },
        delete() {
            deleteObject(self, db);
        }
    }));

const LoyaltyStore = types
    .model("LoyaltyStore", {
        rows: types.optional(types.array(Loyalty), []),
    })
    .actions(self => ({
        initSync(session) {
            replicationHandler = syncDB(db, "loyalty", session);
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
                db = openAndSyncDB("loyalty", true);
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
                            return Loyalty.create(
                                JSON.parse(JSON.stringify(result.docs[0])),
                            );
                        } else {
                            return null;
                        }
                    });
            }
        },
        async findNumber(number) {

            return new Promise(async (resolve, reject) => {
                let obj = await self.rows.find(data => {
                    return data.customer_number === number;
                });

                if (obj) {
                    resolve(obj);
                } else {
                    db
                        .find({
                            selector: {
                                customer_number: {$regex: `.*${number}.*`},
                            },
                        })
                        .then(result => {
                            const {docs} = result;
                            if (docs.length > 0) {
                                resolve(Loyalty.create(
                                    JSON.parse(JSON.stringify(result.docs[0])),
                                ))
                            } else {
                                resolve(null);
                            }

                        });
                }
            });


        },
        getFromDb() {

            console.log("GET FROM DB LOYALTY")
            db.allDocs({ include_docs: true }).then(entries => {
                if (entries.total_rows > 0) {
                    const { rows } = entries;
                    for (let i = 0; i < rows.length; i++) {
                        const { doc } = rows[i];
                        console.log("LOYALTY CUSTOMERS")
                        console.log(doc)
                        const loyalty = Loyalty.create({
                            _id: doc._id,
                            customer_number: doc.customer_number,
                            points: doc.points,
                            loyaltyProgram: doc.loyaltyProgram,
                        });
                        self.add(loyalty);
                    }
                }
            });
        },
    }));

const Store = LoyaltyStore.create({});

export default Store;
