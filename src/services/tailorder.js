exports.sendOrder = function(origin, order) {
  const url = `${origin}/api/v1/orders`;

  const fetchData = {
    method: "POST",
    body: JSON.stringify(order),
  };
  return fetch(url, fetchData).then(response => response.json());
};

exports.voidLine = function(origin, order) {
  const url = `${origin}/api/v1/void_line`;
  const fetchData = {
    method: "POST",
    body: JSON.stringify(order),
  };

  return fetch(url, fetchData).then(response => response.json());
};
exports.printReceipt = function(origin, order) {
  const url = `${origin}/api/v1/print_receipt`;
  const fetchData = {
    method: "POST",
    body: JSON.stringify(order),
  };

  return fetch(url, fetchData).then(response => response.json());
};
exports.printReport = function(origin, order) {
  const url = `${origin}/api/v1/print_report`;
  const fetchData = {
    method: "POST",
    body: JSON.stringify(order),
  };

  return fetch(url, fetchData).then(response => response.json());
};
exports.printBill = function(origin, order) {
  const url = `${origin}/api/v1/print_bill`;
  const fetchData = {
    method: "POST",
    body: JSON.stringify(order),
  };

  return fetch(url, fetchData).then(response => response.json());
};

exports.printOrder = function(origin, order) {
  const url = `${origin}/api/v1/print_order`;

  const fetchData = {
    method: "POST",
    body: JSON.stringify(order),
  };

  return fetch(url, fetchData).then(response => response.json());
};
exports.printOrderVoid = function(origin, order) {
  const url = `${origin}/api/v1/print_void`;

  const fetchData = {
    method: "POST",
    body: JSON.stringify(order),
  };

  return fetch(url, fetchData).then(response => response.json());
};

exports.cancelOrder = function(origin, order) {
  const url = `${origin}/api/v1/cancel_order`;

  const fetchData = {
    method: "POST",
    body: JSON.stringify(order),
  };

  return fetch(url, fetchData).then(response => response.json());
};

exports.changeOrderTable = function(origin, order) {
  const url = `${origin}/api/v1/change_table`;

  const fetchData = {
    method: "POST",
    body: JSON.stringify(order),
  };

  return fetch(url, fetchData).then(response => response.json());
};

exports.tailOrderLine = function(line) {
  return {
    item_name: line.item_name,
    item_code: line.item,
    rate: line.price,
    qty: line.qty,
    tax: line.tax,
    category: line.category,
    translation_text: line.translation_text,
  };
};

exports.orderItemToReceiptItem = function(item) {
  return {
    item: item.item_code,
    item_name: item.item_name,
    price: item.rate,
    qty: item.qty,
    tax: item.tax,
    date: item.creation,
    category: item.category,
    translation_text: item.translation_text,

  };
};

exports.getOrder = function(type, items, table_no) {
  return { type, items, table_no };
};
