const db = require("../database/database");
const moment = require("moment");
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://broker.mqttdashboard.com:1883");

// แสดงเฉพาะ carparking ที่เปิด
exports.listCarparking = async (req, res) => {
  const status = "Open";
  db.query(
    "SELECT * FROM carparking_detail_detail WHERE carparking_status = ?",
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
//     "SELECT * FROM carparking_detail WHERE carparking_status = ?",
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
    "SELECT * FROM carparking_detail WHERE carparking_id = ?",
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

// ต้องเช็คว่ามีชื่อซ้ำไหมก่อน
exports.createCarparking1 = async (req, res) => {
  const data = req.body;

  // Create a Promise to insert car parking details
  const createCarparking = new Promise((resolve, reject) => {
    db.execute(
      "INSERT INTO carparking_detail (carparking_name, carparking_quantity, carparking_price, carparking_detail, carparking_url,carparking_status, carparking_token, carparking_owner) VALUES (?,?,?,?,?,?,?,?)",
      [
        data.name,
        data.quantity,
        data.price,
        data.detail,
        data.url,
        "Open",
        data.token,
        data.owner,
      ],
      function (err, results, fields) {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      }
    );
  });

  try {
    const carparkingResult = await createCarparking;
    const carparking_id = carparkingResult.insertId; // Get the ID of the newly inserted car parking record
    const status_lane = 0;

    // Create an array of promises for inserting parking lanes
    const lanePromises = [];
    for (let lane = 1; lane <= data.quantity; lane++) {
      const insertLanePromise = new Promise((resolve, reject) => {
        db.execute(
          "INSERT INTO carparking_lane_detail (carparking_id, lane_id, status,status_open) VALUES (?,?,?,?)",
          [carparking_id, lane, status_lane, 0],
          function (err, results, fields) {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          }
        );
      });
      lanePromises.push(insertLanePromise);
      let timeRunning = new Date("2023-11-06T06:00:00");
      // 06.00 - 20.00
      for (let j = 1; j <= 30; j++) {
        const formattedTime = timeRunning.toTimeString().slice(0, 5);
        await new Promise((resolve, reject) => {
          db.execute(
            "INSERT INTO carparking_lane_status (carparking_id, lane_id, lane_status, time_booking) VALUES (?,?,?,?)",
            [carparking_id, lane, 0, formattedTime], // Use 'lane' instead of 'i' for the lane_id
            function (err, results, fields) {
              if (err) {
                reject(err);
              } else {
                resolve(results);
              }
            }
          );
        });

        // Increment timeRunning by 1 hour for the next insertion
        timeRunning.setMinutes(timeRunning.getMinutes() + 30);
        // timeRunning.setHours(timeRunning.getHours() + 1);
      }
    }

    // Wait for all parking lane insertions to complete
    await Promise.all(lanePromises);

    // Send a success response after both car parking and parking lanes are inserted
    return res.json({
      status: "200",
      message: "Car parking and parking lanes inserted successfully",
      success: true,
    });
  } catch (err) {
    // Handle errors
    return res.json({
      status: "400",
      message: err.message,
      success: false,
    });
  }
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

  const data = req.body;

  //db.query(
  db.query(
    "SELECT * FROM user WHERE user_username = ?",
    [owner],
    function (err, results, fields) {
      if (err) {
        return res.json({ status: "400", message: err, success: false });
      }
      const user_owner = results[0].id;
      db.execute(
        "INSERT INTO carparking_detail (carparking_name, carparking_name_th, carparking_name_en, carparking_quantity, carparking_price, carparking_district, carparking_status, carparking_img, carparking_detail, carparking_url, carparking_token, carparking_owner) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
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
            "SELECT carparking_id,carparking_quantity FROM carparking_detail WHERE carparking_name = ?",
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
                  "INSERT INTO carparking_lane_detail (carparking_id, lane_id, status,user_id) VALUES (?,?,?,?)",
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
    "SELECT * FROM carparking_detail WHERE carparking_owner = ?",
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
    "DELETE FROM carparking_detail WHERE carparking_id = ?",
    id,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      db.query(
        "DELETE FROM carparking_lane_detail WHERE carparking_id = ?",
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
    "SELECT * FROM carparking_detail WHERE carparking_owner = ?",
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
    "SELECT * FROM carparking_detail WHERE carparking_owner = ?",
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
    "SELECT * FROM carparking_detail WHERE carparking_name = ?",
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

exports.getCarparkingByOwner = async (req, res) => {
  const user = [req.params["owner"]]; // carparking
  db.query(
    "SELECT * FROM carparking_detail WHERE carparking_owner = ?",
    user,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

exports.getParkingInfo = async (req, res) => {
  // const user = [req.params["owner"]]; // carparking
  // db.query(
  //   "SELECT * FROM carparking_detail INNER JOIN carparking_lane_detail ON carparking_lane_detail.carparking_id = carparking_detail.carparking_id WHERE carparking_detail.carparking_owner = ?",
  //   user,
  //   function (err, results, fields) {
  //     if (err) {
  //       res.json({ status: "400", message: err });
  //       return;
  //     }
  //     res.json({ status: "200", data: results, success: true });
  //   }
  // );

  const id = [req.params["id"]]; // carparking
  db.query(
    "SELECT * FROM carparking_detail INNER JOIN carparking_lane_detail ON carparking_lane_detail.carparking_id = carparking_detail.carparking_id WHERE carparking_detail.carparking_id = ?",
    [id],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

exports.getParkingLaneStatus = async (req, res) => {
  const id = [req.params["id"]]; // carparking
  db.query(
    "SELECT * FROM carparking_lane_status WHERE carparking_id = ?",
    [id],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

exports.getCarParkingList = async (req, res) => {
  db.query(
    "SELECT * FROM carparking_detail WHERE carparking_status = ?",
    ["Open"],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

exports.updateCarparkingStatus = async (req, res) => {
  const data = req.body;
  const value = data.value == true ? "Open" : "Close";
  const valueStatus = data.value == true ? 0 : 1;
  db.query(
    "UPDATE carparking_lane_detail SET status_open = ? WHERE carparking_id = ?",
    [valueStatus, data.id],
    function (err, results, fields) {
      if (err) {
        return res.json({ status: "400", message: err });
      }
      db.query(
        "UPDATE carparking_lane_status SET lane_status = ? WHERE carparking_id = ?",
        [valueStatus, data.id],
        function (err, results, fields) {
          if (err) {
            return res.json({ status: "400", message: err });
          }
          db.query(
            "UPDATE carparking_detail SET carparking_status = ? WHERE carparking_id = ?",
            [value, data.id],
            function (err, results, fields) {
              if (err) {
                return res.json({ status: "400", message: err });
              }
              res.json({ status: "200", data: results, success: true });
            }
          );
        }
      );
    }
  );
};

exports.updateLaneStatus = async (req, res) => {
  const data = req.body;
  const value = data.value == true ? 0 : 1;
  db.query(
    "UPDATE carparking_lane_detail SET status_open = ? WHERE carparking_id = ? AND lane_id = ?",
    [value, data.id, data.lane],
    function (err, results, fields) {
      if (err) {
        return res.json({ status: "400", message: err });
      }
      db.query(
        "UPDATE carparking_lane_status SET lane_status = ? WHERE carparking_id = ? AND lane_id = ?",
        [value, data.id, data.lane],
        function (err, results, fields) {
          if (err) {
            return res.json({ status: "400", message: err });
          }
          res.json({ status: "200", data: results, success: true });
        }
      );
    }
  );
};

// exports.createCarParkingLaneStatus = async (req, res) => {
//   const data = req.body;
//   // timeOpen
//   // timeClose

//   // หาว่าห่างกันกี่ชั่วโมง

//   // loop
//   // จำนวนเลน
//   for (let i = 1; i <= 10; i++) {
//     for (let j = 1; j <= 10; j++) {
//       db.execute(
//         "INSERT INTO carparking_lane_status (carparking_id, lane_id, lane_status,time_booking) VALUES (?,?,?,?)",
//         [carparking_id, i, 0, null],
//         function (err, results, fields) {
//           if (err) {
//             return res.json({
//               status: "400",
//               message: err,
//               success: false,
//             });
//           }
//         }
//       );
//     }
//   }
// };
