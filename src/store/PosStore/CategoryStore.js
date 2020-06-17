import { types, destroy } from "mobx-state-tree";
import { assignUUID } from "./Utils";
import {
  openAndSyncDB,
  saveSnapshotToDB,
  editFields,
  deleteObject,
  getRows,
  syncDB,
} from "./DbFunctions";

let db = openAndSyncDB("categories", true);
let rowsOptions = {};

let replicationHandler = null;

export const Category = types
  .model("Category", {
    _id: types.identifier(),
    name: types.string,
    colorAndShape: types.optional(types.string, ""),
    dateUpdated: types.optional(types.Date, Date.now),
    syncStatus: types.optional(types.boolean, false),
  })
  .preProcessSnapshot(snapshot => assignUUID(snapshot, "Category"))
  .views(self => ({
    get color() {
      return JSON.parse(this.colorAndShape)[0].color;
    },
    get shape() {
      return JSON.parse(this.colorAndShape)[0].shape;
    },
  }))
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

const Store = types
  .model("CategoryStore", {
    rows: types.optional(types.array(Category), []),
    categories_total_amounts: types.optional(types.string, "[]"),
    selectedCat: types.maybe(types.reference(Category)),
      remarksCategory: types.optional(types.string, "")
  })
  .actions(self => ({
    initSync(session) {
      replicationHandler = syncDB(db, "categories", session);
      replicationHandler.on("complete", function() {
        if (self.rows.length === 0) {
          self.getFromDb(20);
        }
      });
    },
    destroyDb() {
      db.destroy().then(function() {
        self.clearRows();
        db = openAndSyncDB("categories", true);
        rowsOptions = {};
      });
    },
    add(data) {
      if (data._id === undefined) {
        self.rows.push(data);
      } else {
        let obj = self.rows.find(rowData => rowData._id === data._id);
        if (!obj) {
          self.rows.push(data);
        }
      }
    },
      setRemarksCategory(){
         new Promise((resolve, reject) => {
              let obj = self.rows.find(data => data.name === "Remarks");

              // If not found in rows and not no category
              if (!obj) {
                  // If category is found in the databaseeeeee
                  db
                      .find({
                          selector: {
                              name: { $regex: `.*${"Remarks"}.*` },
                          },
                      })
                      .then(result => {
                          const { docs } = result;
                          if (docs.length > 0) {
                              self.remarksCategory = result.docs[0]._id; // if found object
                          }
                      });
              } else if (obj) {
                  self.remarksCategory = obj._id; // if found object
              }

              // If no object found
          });
      },
    find(id) {
      return new Promise((resolve, reject) => {
        let obj = self.rows.find(data => data._id === id);

        // If not found in rows and not no category
        if (!obj && id !== "No Category") {
          // If category is found in the databaseeeeee
          db
            .find({
              selector: {
                _id: { $regex: `.*${id}.*` },
              },
            })
            .then(result => {
              const { docs } = result;
              if (docs.length > 0) {
                resolve(
                  Category.create(JSON.parse(JSON.stringify(result.docs[0]))),
                );
              } else {
                resolve(null);
              }
            });
        } else if (obj) {
          resolve(obj); // if found object
        }

        // If no object found
      });
    },
    setCategory(category) {
      self.selectedCat = category;
    },
    unsetCategory() {
      self.selectedCat = null;
    },
    findFromRows(id) {
      for (var i = 0; i < self.rows.length; i++) {
        if (self.rows[i]._id) {
          return self.rows[i];
        }
      }
      return null;
    },
    delete(row) {
      destroy(row);
    },
    clearRows() {
      self.rows.clear();
    },
    clear() {
      for (var i = 0; i < self.rows.length; i++) {
        self.rows[i].delete();
      }
    },
    getFromDb(numberRows) {
      return getRows(self, db, numberRows, rowsOptions);
      //   db.allDocs().then(function (result){
      //       return Promise.all(result.rows.map(function (row){
      //           return db.remove(row.id,row.value.rev)
      //       }))
      //   })
    },
    replaceRows(rows) {
      self.rows.replace(rows);
    },
    search(name) {
      db
        .find({
          selector: {
            name: { $regex: `.*${name}.*` },
          },
        })
        .then(result => {
          const { docs } = result;
          const replacement = docs.map(item =>
            JSON.parse(JSON.stringify(item)),
          );
          if (replacement) {
            self.replaceRows(replacement);
          } else {
            self.replaceRows([]);
          }
        });
    },
    searchLengthName(name) {
      return new Promise(function(resolve, reject) {
        db
          .find({
            selector: {
              name: { $regex: `.*${name}.*` },
            },
          })
          .then(result => {
            resolve(result.docs[0]);
          });
      });
    },
    addCategoriesAmounts(obj) {
      let categories_amounts = JSON.parse(self.categories_total_amounts);
      categories_amounts.push(obj);
      self.categories_total_amounts = JSON.stringify(categories_amounts);
    },
    categoriesAmounts(obj) {
      let categories_amounts = JSON.parse(self.categories_total_amounts);
      let amounts = false;
      if (categories_amounts.length > 0) {
        for (let i = 0; i < categories_amounts.length; i += 1) {
          if (obj.name === categories_amounts[i].name) {
            categories_amounts[i].total_amount += obj.total_amount;
            amounts = true;
          }
        }
      }
      if (!amounts) {
        self.addCategoriesAmounts(obj);
      } else {
        self.categories_total_amounts = JSON.stringify(categories_amounts);
      }
    },
  }));

const Categories = Store.create({});

export default Categories;
