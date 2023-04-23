const db = require("../database/database");
const moment = require("moment");
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://broker.mqttdashboard.com:1883");

// แสดงเฉพาะ carparking ที่เปิด
exports.listCarparking = async (req, res) => {
  const status = "Open";
  db.query(
    "SELECT * FROM carparking WHERE carparking_status = ?",
    "Open",
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

// exports.listCarparking = async (req, res) => {
//   db.query(
//     "SELECT * FROM carparking WHERE carparking_status = ?",
//     ["Open"],
//     function (err, results, fields) {
//       if (err) {
//         res.json({ status: "400", message: err });
//         return;
//       }
//       res.json({ status: "200", data: results, success: true });
//     }
//   );
// };

exports.getCarparking = async (req, res) => {
  const id = [req.params["id"]];
  db.query(
    "SELECT * FROM carparking WHERE carparking_id = ?",
    id,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

// มีselect option เลือก Owner
exports.createCarparking = async (req, res) => {
  const name = req.body.name;
  const nameTh = req.body.nameTh;
  const nameEn = req.body.nameEn;
  const quantity = req.body.quantity;
  const price = req.body.price;
  const district = req.body.district;
  const status = "Open";
  const image = null;
  const detail = req.body.detail;
  const url = req.body.url;
  const token = req.body.token;
  const owner = req.body.owner;

  //db.query(
  db.query(
    "SELECT * FROM users WHERE user_username = ?",
    [owner],
    function (err, results, fields) {
      if (err) {
        return res.json({ status: "400", message: err, success: false });
      }
      const user_owner = results[0].id;
      db.execute(
        "INSERT INTO carparking (carparking_name, carparking_name_th, carparking_name_en, carparking_quantity, carparking_price, carparking_district, carparking_status, carparking_img, carparking_detail, carparking_url, carparking_token, carparking_owner) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          name,
          nameTh,
          nameEn,
          quantity,
          price,
          district,
          status,
          image,
          detail,
          url,
          token,
          user_owner,
        ],
        function (err, results, fields) {
          if (err) {
            res.json({ status: "400", message: err, success: false });
            return;
          }
          db.query(
            "SELECT carparking_id,carparking_quantity FROM carparking WHERE carparking_name = ?",
            [name],
            function (err, results, fields) {
              if (err) {
                return res.json({
                  status: "400",
                  message: err,
                  success: false,
                });
              }
              let carparking_id = results[0].carparking_id;
              let status_lane = 0;
              for (let lane = 1; lane <= quantity; lane++) {
                db.execute(
                  "INSERT INTO carparking_lane (carparking_id, lane_id, status,user_id) VALUES (?,?,?,?)",
                  [carparking_id, lane, status_lane, null],
                  function (err, results, fields) {
                    if (err) {
                      return res.json({
                        status: "400",
                        message: err,
                        success: false,
                      });
                    }
                  }
                );
              }
            }
          );
          return res.json({ status: "200", success: "true" });
        }
      );
    }
  );
};

exports.searchCarparking = (req, res) => {
  const name = req.body.name; //ชื่อสถานที่ที่ค้นหา
  db.query(
    "SELECT * FROM carparking WHERE carparking_owner = ?",
    id,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

exports.deleteCarparking = async (req, res) => {
  const id = [req.params["id"]];
  db.query(
    "DELETE FROM carparking WHERE carparking_id = ?",
    id,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      db.query(
        "DELETE FROM carparking_lane WHERE carparking_id = ?",
        id,
        function (err, results, fields) {
          if (err) {
            res.json({ status: "400", message: err, success: false });
            return;
          }
          res.json({ status: "200", data: results, success: true });
        }
      );
    }
  );
};

// Mange
exports.showCarparkingOwner = async (req, res) => {
  const id = [req.params["id"]];
  db.query(
    "SELECT * FROM carparking WHERE carparking_owner = ?",
    id,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

exports.showCarparkingLaneOwner = async (req, res) => {
  const id = [req.params["id"]]; // carparking
  const time = [req.params["time"]]; // time

  db.query(
    "SELECT * FROM carparking WHERE carparking_owner = ?",
    id,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

exports.searchCarparking = (req, res) => {
  const name = req.body.name;
  db.query(
    "SELECT * FROM carparking WHERE carparking_name = ?",
    name,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

// ค้นหาลานจอด
