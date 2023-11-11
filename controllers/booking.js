const db = require("../database/database");
const moment = require("moment");
const cron = require("node-cron");
const mqtt = require("mqtt");

exports.listBooking = async (req, res) => {
  db.query("SELECT * FROM carbooking", function (err, results, fields) {
    if (err) {
      res.json({ status: "400", message: err });
      return;
    }
    res.json({ status: "200", data: results, success: true });
  });
};

exports.getBooking = async (req, res) => {
  const data = [req.params["id"]];
  const id = data[0];
  db.query(
    "SELECT * FROM carbooking INNER JOIN carparking_detail ON carparking_detail.carparking_id = carbooking.booking_place_id WHERE carbooking.booking_id = ?",
    id,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err, success: false });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

exports.getBookingById = async (req, res) => {
  const data = [req.params["id"]];
  const id = data[0];
  db.query(
    "SELECT * FROM carbooking  INNER JOIN carparking_detail ON carparking_detail.carparking_id =  carbooking.booking_place_id WHERE carbooking.booking_user = ? ORDER BY carbooking.booking_id DESC;",
    id,
    function (err, results) {
      if (err) {
        res.json({ status: "400", message: err, success: false });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};
// ต้องจองก่อน 15นาที t
// เช็คว่าลานจอดเต็มไหม t
// หาเลนที่ว่าง t
// ปรับสถานะเลนเป็นมีคนจอง t
// ถ้าไม่มาจะให้ cancel = 1
// ปรับสถานะเลนเป็นว่าง t
// ห้ามจองย้อนหลัง t
// เปิด-ปิดลานจอด
// แจ้งเตือนไลน์ว่ามีคนจอง

exports.createBooking = (req, res) => {
  const place_id = req.body.id;
  const place = req.body.place;
  const name = req.body.name;
  const tel = req.body.tel;
  const plate = req.body.plate;
  const type = req.body.type;
  const timeIn = req.body.timeIn;
  const date = req.body.date;
  const user = req.body.user;
  const status = "รอเข้าจอด";

  // timenow
  const timeNow = moment().format("HH:mm");
  const timeStart = moment(req.body.timeIn, "HH:mm");
  const timeEnd = moment(req.body.timeIn, "HH:mm").add(15, "minutes");
  // timeNow แทน
  const minutesDiff = timeEnd.diff(timeStart, "minutes");
  console.log("timeNow", timeNow);
  console.log("timeStart", timeStart);
  console.log("timeEnd", timeEnd);
  console.log("minutesDiff", minutesDiff);

  if (minutesDiff == 15) {
    db.query(
      "SELECT * FROM carparking_lane_detail WHERE  carparking_id = ? AND status = ?",
      [place_id, 0],
      function (err, results) {
        if (err) {
          return res.json({
            status: "400",
            success: false,
            message: err,
          });
        }
        if (results.length > 0) {
          const lane = results[0].lane_id;
          db.execute(
            "INSERT INTO carbooking (booking_place_id, booking_place, booking_name, booking_tel, booking_plate, booking_type,booking_lane, booking_time_in, booking_date, booking_status, booking_user) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            [
              place_id,
              place,
              name,
              tel,
              plate,
              type,
              lane,
              timeIn,
              date,
              status,
              user,
            ],
            function (err, results) {
              if (err) {
                return res.json({ status: "400", message: err });
              }
              db.query(
                "SELECT * FROM carparking WHERE carparking_id = ?",
                place_id,
                function (err, results) {
                  if (err) {
                    res.json({ status: "400", message: err, success: false });
                    return;
                  }
                  const quantity_update = results[0].carparking_quantity - 1;
                  const tokenBot = results[0].caparking_token;
                  db.query(
                    "UPDATE carparking SET carparking_quantity = ? WHERE carparking_id = ?",
                    [quantity_update, place_id],
                    function (err, results, fields) {
                      if (err) {
                        res.json({ status: "400", message: err });
                        return;
                      }
                      // เอาเลขนี้ส่งให้ cronjob
                      db.query(
                        "SELECT * FROM carbooking WHERE booking_user = ? AND booking_place_id = ? AND booking_time_in = ? AND booking_date = ?",
                        [user, place_id, timeIn, date],
                        function (err, results) {
                          if (err) {
                            res.json({
                              status: "400",
                              message: err,
                              success: false,
                            });
                            return;
                          }
                          if (tokenBot) {
                            const lineNotify =
                              require("line-notify-nodejs")(tokenBot);
                            lineNotify
                              .notify({
                                message: `แจ้งเตือนการจองที่จอดรถช่องจอด:${lane} เวลา:${timeIn}`,
                              })
                              .then(() => {
                                console.log("send completed!");
                              });
                          }
                          res.json({
                            status: "200",
                            data: results,
                            success: true,
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        } else {
          return res.json({ status: "400", message: err });
        }
      }
    );
  } else {
    return res.json({
      status: "400",
      message: "Plese booking before 15 minutes",
    });
  }
};

// SELECT * FROM `carparking_lane_status` WHERE time_booking  BETWEEN '08:00' AND '14:00' LIMIT 1;

exports.createBooking1 = async (req, res) => {
  const data = req.body;
  const status = "รอเข้าจอด";
  console.log("data", data);
  db.query(
    "SELECT * FROM carparking_lane_status INNER JOIN carparking_detail ON carparking_detail.carparking_id = carparking_lane_status.carparking_id WHERE   carparking_lane_status.lane_status = ? AND carparking_lane_status.carparking_id = ? AND carparking_lane_status.time_booking BETWEEN ? AND ? LIMIT 1",
    [0, data.id, data.timeIn, data.timeOut],
    function (err, results) {
      if (err) {
        return res.json({ status: "400", message: err, success: false });
      }
      if (results) {
        const tokenBot = results[0].carparking_token;
        const laneId = results[0].lane_id;
        const placeName = results[0].carparking_name;
        db.query(
          "INSERT INTO carbooking (booking_place_id,booking_place,booking_name,booking_tel,booking_plate,booking_lane,booking_time_in,booking_time_out,booking_date,booking_status,booking_user,is_cancel) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            data.id,
            placeName,
            data.name,
            data.tel,
            data.plate,
            laneId,
            data.timeIn,
            data.timeOut,
            data.date,
            status,
            data.user,
            0,
          ],
          function (err, results, fields) {
            if (err) {
              return res.json({ status: "400", message: err, success: false });
            }
            db.execute(
              "UPDATE carparking_lane_status SET lane_status = ? , user_booking = ? WHERE time_booking BETWEEN ? AND ? AND carparking_id = ? AND lane_id = ?",
              [1, data.user, data.timeIn, data.timeOut, data.id, laneId],
              function (err, results, fields) {
                if (err) {
                  return res.json({
                    status: "400",
                    message: err,
                    success: false,
                  });
                }
                if (tokenBot) {
                  console.log("bot111");
                  const lineNotify = require("line-notify-nodejs")(tokenBot);
                  lineNotify
                    .notify({
                      message: `แจ้งเตือนการจองที่จอดรถช่องจอด:${laneId} เวลาเข้า:${data.timeIn} เวลาออก:${data.timeOut}`,
                    })
                    .then(() => {
                      console.log("send completed!");
                    });

                  console.log("bot555");
                }
                // ต้องมี cronjob อีกอันบอกเจ้าของที่ก่อน15นาทีว่าเดี๋ยวมีรถมาจอดที่นี้นะ
                const [hoursTimeIn, minutesTimeIn] = data.timeIn.split(":");
                const cronExpression = `${minutesTimeIn} ${hoursTimeIn} * * *`;
                cron.schedule(cronExpression, () => {
                  db.execute(
                    "UPDATE carparking_lane_detail SET status = ? WHERE carparking_id = ? AND lane_id = ?",
                    [1, data.id, laneId],
                    function (err, results, fields) {
                      if (err) {
                        return res.status(400).json({
                          status: "400",
                          message: err,
                          success: false,
                        });
                      }
                      console.log("timeinnnn11324");
                    }
                  );
                });

                const minutesTime15MinBefore =
                  (parseInt(minutesTimeIn) - 15 + 60) % 60;
                const hoursTime15MinBefore =
                  minutesTimeIn === "00"
                    ? (parseInt(hoursTimeIn) - 1 + 24) % 24
                    : hoursTimeIn;

                // Create the cron expression for the new job
                const cronExpression15MinBefore = `${minutesTime15MinBefore} ${hoursTime15MinBefore} * * *`;
                cron.schedule(cronExpression, () => {
                  const lineNotify = require("line-notify-nodejs")(tokenBot);
                  lineNotify
                    .notify({
                      message: `แจ้งเตือนการเตรียมการจอดรถช่องจอด:${laneId} ป้ายทะเบียน:${data.plate} เวลาเข้า:${data.timeIn} เวลาออก:${data.timeOut}`,
                    })
                    .then(() => {
                      console.log("send completed!");
                    });
                });

                return res.json({ status: "200", success: true });
              }
            );
          }
        );
      } else {
        return res.json({
          status: "400",
          message: "Car Parking Full!!!",
          success: false,
        });
      }
      // return res.json({ status: "200", success: true });

      // return res.json({ status: "200", data: results, success: true });
    }
  );
};

// exports.createBooking1 = async (req, res) => {
//   const data = req.body;
//   const status = "รอเข้าจอด";
//   const promises = [];

//   console.log("data", data);

//   db.query(
//     // "SELECT carparking_lane_status.carparking_id,carparking_lane_status.lane_id,carparking_lane_status.lane_status,carparking_lane_status.user_booking,carparking_detail.carparking_token,carparking_lane_detail.status,carparking_lane_detail.status_open FROM carparking_lane_status INNER JOIN carparking_lane_detail ON carparking_lane_detail.carparking_id = carparking_lane_status.carparking_id INNER JOIN carparking_detail ON carparking_detail.carparking_id = carparking_lane_status.carparking_id WHERE carparking_lane_status.time_booking BETWEEN ? AND ? AND carparking_lane_detail.status_open = ? AND carparking_lane_status.carparking_id = ?  LIMIT 1",
//     "SELECT * FROM carparking_lane_status INNER JOIN carparking_detail ON carparking_detail.carparking_id = carparking_lane_status.carparking_id WHERE   carparking_lane_status.lane_status = ? AND carparking_lane_status.carparking_id = ? AND carparking_lane_status.time_booking BETWEEN ? AND ? LIMIT 1"[
//       (data.timeIn, data.timeOut, 0, data.id)
//     ],
//     function (err, results) {
//       if (err) {
//         return res.json({
//           status: "400",
//           message: err,
//           success: false,
//         });
//       }
//       console.log("results", results);
//       if (results) {
//         // CvUGKaNeeNaXwZWBFjNFSYBNU9FrGCfuZb4tltkQ775
//         const tokenBot = results[0].carparking_token;
//         const laneId = results[0].lane_id;
//         console.log("resuts", results);
//         // ตัวนี้พัง
//         // db.execute(
//         //   "INSERT INTO carbooking (booking_place_id,booking_name,booking_tel,booking_plate,booking_lane,booking_time_in,booking_time_out,booking_date,booking_status,booking_user,is_cancel) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
//         //   [
//         //     data.id,
//         //     data.name,
//         //     data.tel,
//         //     data.plate,
//         //     laneId,
//         //     data.timeIn,
//         //     data.timeOut,
//         //     data.date,
//         //     status,
//         //     data.user,
//         //     0,
//         //   ],
//         //   function (err, results, fields) {
//         //     if (err) {
//         //       return res.status(400).json({
//         //         status: "400",
//         //         message: err,
//         //         success: false,
//         //       });
//         //     }
//         // return res.status(200).json({
//         //   status: "200",
//         //   success: true,
//         // });

//         //     // อัปเดตเลน
//         //     // UPDATE carparking_lane_status SET lane_status = 1 , user_booking = "1" WHERE time_booking BETWEEN '08:00' AND '18:00' AND carparking_id = 2 AND lane_id = 1;

//         //     db.execute(
//         //       "UPDATE carparking_lane_status SET lane_status = ? , user_booking = ? WHERE time_booking BETWEEN ? AND ? AND carparking_id = ? AND lane_id = ?",
//         //       [1, data.user, data.timeIn, data.timeOut, data.id, laneId],
//         //       function (err, results, fields) {
//         //         if (err) {
//         //           return res.json({
//         //             status: "400",
//         //             message: err,
//         //             success: false,
//         //           });
//         //         }
//         //         console.log("tokenBot", tokenBot);
//         //         if (tokenBot) {
//         //           console.log("bot111");
//         //           const lineNotify = require("line-notify-nodejs")(tokenBot);
//         //           lineNotify
//         //             .notify({
//         //               message: `แจ้งเตือนการจองที่จอดรถช่องจอด:${laneId} เวลาเข้า:${data.timeIn} เวลาออก:${data.timeOut}`,
//         //             })
//         //             .then(() => {
//         //               console.log("send completed!");
//         //             });

//         //           console.log("bot555");
//         //         }
//         //         // Cronjob สำหรับเปลี่ยนสถานะตอน 4 โมง

//         //         const [hoursTimeIn, minutesTimeIn] = data.timeIn.split(":");
//         //         const cronExpression = `${minutesTimeIn} ${hoursTimeIn} * * *`;
//         //         console.log("timeinnn");
//         //         cron.schedule(cronExpression, () => {
//         //           db.execute(
//         //             "UPDATE carparking_lane_detail SET status = ? WHERE carparking_id = ? AND lane_id = ?",
//         //             [1, data.id, laneId],
//         //             function (err, results, fields) {
//         //               if (err) {
//         //                 return res.status(400).json({
//         //                   status: "400",
//         //                   message: err,
//         //                   success: false,
//         //                 });
//         //               }
//         //               console.log("timeinnnn11324");
//         //             }
//         //           );
//         //         });
//         //         return res.status(200).json({
//         //           status: "200",
//         //           success: true,
//         //         });
//         //       }
//         //     );
//         //   }
//         // );

//         return res.json({
//           status: "200",
//           data: results,
//           success: true,
//         });
//       } else {
//         return res.json({
//           status: "400",
//           message: err,
//           success: false,
//         });
//       }
//     }
//   );
// };

exports.updateBooking = (req, res) => {
  //   db.query("SELECT * FROM parking", function (err, results, fields) {
  //     res.json({ status: "ok", data: results });
  //   });
};

exports.deleteBooking = async (req, res) => {
  const id = [req.params["id"]];
  db.query(
    "DELETE FROM carbooking WHERE booking_id = ?",
    id,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", success: true });
    }
  );
};

// exports.goInCarparking1 = async (req, res) => {
//   const place = req.body.place;
//   const id = req.body.id;
//   const user = req.body.user;

//   db.query(
//     "SELECT * FROM carparking_lane WHERE carparking_id = ? AND status = ?",
//     [place, 0],
//     function (err, results, fields) {
//       if (err) {
//         res.json({ status: "400", message: err, success: false });
//         return;
//       }
//       let lane = results[0].lane_id;
//       db.query(
//         "UPDATE carparking_lane SET status = ?, user_id = ? WHERE carparking_id = ? AND lane_id = ?",
//         [1, user, place, lane],
//         function (err, results, fields) {
//           if (err) {
//             res.json({ status: "400", message: err });
//             return;
//           }
//           db.query(
//             "UPDATE booking SET booking_status = ?, booking_lane = ? WHERE booking_id = ?",
//             ["กำลังจอด", lane, id],
//             function (err, results, fields) {
//               if (err) {
//                 res.json({ status: "400", message: err });
//                 return;
//               }
//               res.json({ status: "200", success: true });
//               const client = mqtt.connect(
//                 "mqtt://broker.mqttdashboard.com:1883"
//               );
//               client.on("connect", function () {
//                 client.subscribe("alert/status", function (err) {
//                   if (err) {
//                     console.log(err);
//                   }
//                 });
//                 client.publish("barrier/status", "open");
//               });
//               client.on("message", function (topic, message) {
//                 console.log(message.toString());
//                 if (message.toString() == "true") {
//                   client.end();
//                 }
//               });
//             }
//           );
//         }
//       );
//     }
//   );
// };

// ตรวจสอบป้ายทะเบียนก่อน
// ปรับสถานะเลนเป็นไม่ว่าง
// ปรับสถานะbooking เป็นกำลังจอด
// แจ้งเตือนไลน์ว่ามีคนเข้าจอด
exports.goInCarparking = async (req, res) => {
  const { place, id, user, lane } = req.body;
  const client = mqtt.connect("mqtt://broker.mqttdashboard.com:1883");
  client.on("connect", function () {
    client.subscribe("alert/status", function (err) {
      if (err) {
        console.log(err);
      }
    });
    client.publish(`barrier/status/${place}/${lane}`, "open");
  });
  client.on("message", function (topic, message) {
    const barrier_status = message.toString();
    console.log(barrier_status);
    if (barrier_status == "true") {
      client.end();
      db.query(
        "UPDATE carparking_lane_detail SET status = ?, user_id = ? WHERE carparking_id = ? AND lane_id = ?",
        [1, user, place, lane],
        function (err, results, fields) {
          if (err) {
            res.json({ status: "400", message: err });
            return;
          }
          db.query(
            "UPDATE carbooking SET booking_status = ?, booking_lane = ? WHERE booking_id = ?",
            ["กำลังจอด", lane, id],
            function (err, results, fields) {
              if (err) {
                res.json({ status: "400", message: err });
                return;
              }
              db.query(
                "SELECT * FROM carparking WHERE carparking_id = ?",
                [place],
                function (err, results, fields) {
                  if (err) {
                    res.json({ status: "400", message: err, success: false });
                    return;
                  }
                  const tokenBot = results[0].caparking_token;
                  if (tokenBot) {
                    const lineNotify = require("line-notify-nodejs")(tokenBot);
                    lineNotify
                      .notify({
                        message: `แจ้งเตือนนำรถเข้าช่องจอดที่่:${lane}`,
                      })
                      .then(() => {
                        console.log("send completed!");
                      });
                  }
                  res.json({ status: "200", data: results, success: true });
                }
              );
            }
          );
        }
      );
    } else {
      return res.json({
        status: "400",
        message: "Fail to detect your license plate",
      });
    }
  });
};
// แจ้งเตือนไลน์ว่ามีคนออก

exports.goOutCarparking = (req, res) => {
  const id = req.body.id;
  const place = req.body.place;
  const lane = req.body.lane;
  const timeIn = req.body.timeIn;
  const timeOut = req.body.timeOut;
  const cancel = req.body.cancel;

  db.query(
    "SELECT * FROM carparking WHERE carparking_id = ?",
    [place],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err, success: false });
        return;
      }
      const price = results[0].carparking_price;
      const quantity = results[0].carparking_quantity + 1;
      const tokenBot = results[0].caparking_token;
      const timeStart = moment(timeIn, "HH:mm");
      const timeNow = moment();
      const minutesDiff = timeNow.diff(timeStart, "minutes");
      const cost = Math.ceil((minutesDiff / 60) * price);
      if (cancel > 0) {
        cost += 20;
        db.query(
          "UPDATE users SET user_cancel = ?",
          [0],
          function (err, results, fields) {
            if (err) {
              return res.json({ status: "400", message: err });
            }
          }
        );
      }

      db.query(
        "UPDATE carparking_lane_detail SET status = ? ,user_id = ?  WHERE carparking_id = ? AND lane_id = ?",
        [0, null, place, lane],
        function (err, results, fields) {
          if (err) {
            return res.json({ status: "400", message: err });
          }
          // ปรับcarparking ให้จำนวนเพิ่มขึ้น
          db.query(
            "UPDATE carparking SET carparking_quantity = ? WHERE carparking_id = ?",
            [quantity, place],
            function (err, results, fields) {
              if (err) {
                res.json({ status: "400", message: err });
                return;
              }
              db.query(
                "UPDATE carbooking SET booking_status = ? , booking_price = ? ,booking_time_out = ? WHERE booking_id = ?",
                ["จอดเสร็จสิ้น", cost, timeOut, id],
                function (err, results, fields) {
                  if (err) {
                    res.json({ status: "400", message: err });
                    return;
                  }
                }
              );
              if (tokenBot) {
                const lineNotify = require("line-notify-nodejs")(tokenBot);
                lineNotify
                  .notify({
                    message: `แจ้งเตือนนำรถออกช่องจอดที่่:${lane} จำนวนเงินที่ต้องชำระ:${cost} บาท`,
                  })
                  .then(() => {
                    console.log("send completed!");
                  });
              }
              res.json({ status: "200", success: true });
              const client = mqtt.connect(
                "mqtt://broker.mqttdashboard.com:1883"
              );
              client.on("connect", function () {
                client.publish(`barrier/status/${place}/${lane}`, "close");
              });
              client.on("message", function (topic, message) {
                console.log(message.toString());
                client.end();
              });
            }
          );
        }
      );
    }
  );
};

// ใช้ในกรณีผู้ใช้ไม่มาเกิน15 นาที
exports.cronjob = (req, res) => {
  console.log("start");
  const id = req.body.id;
  const timeIn = moment(req.body.timeIn, "HH:mm");
  const scheduledTime = timeIn.add(16, "minutes");
  cron.schedule(
    scheduledTime.format("m H D M d"),
    () => {
      //
      console.log(
        "Cron job running at:",
        moment().format("YYYY-MM-DD HH:mm:ss")
      );
      db.query(
        "SELECT * FROM carbooking WHERE booking_place_id = ?",
        [id],
        function (err, results, fields) {
          if (err) {
            res.json({ status: "400", message: err, success: false });
            return;
          }
          const status = results[0].booking_status;
          const user = results[0].booking_user;
          if (status == "รอเข้าจอด") {
            db.query(
              "DELETE FROM carbooking WHERE booking_id = ?",
              id,
              function (err, results, fields) {
                if (err) {
                  res.json({ status: "400", message: err });
                  return;
                }
                db.query(
                  "UPDATE users SET user_cancel = ? WHERE id = ?",
                  [1, user],
                  function (err, results, fields) {
                    if (err) {
                      return res.json({ status: "400", message: err });
                    }
                    return res.json({ status: "200", success: true });
                  }
                );
              }
            );
          }
        }
      );
      return;
    },
    {
      scheduled: true,
      timezone: "Asia/Bangkok",
    }
  );
};

// ใช้ในกรณีผู้ใช้ไม่มาเกินหรือต้องการยกเลิกคิว
exports.cancelBooking = (req, res) => {
  const id = req.body.id;
  const timeIn = req.body.timeIn;
  const timeStart = moment(req.body.timeIn, "HH:mm");
  const timeNow = moment();
  const minutesDiff = timeStart.diff(timeNow, "minutes");
  if (minutesDiff >= 10) {
    db.query(
      "DELETE FROM carbooking WHERE booking_id = ?",
      id,
      function (err, results, fields) {
        if (err) {
          res.json({ status: "400", message: err });
          return;
        }
        return res.json({ status: "200", success: true });
      }
    );
  }
};

exports.bookingHistoryOwner = async (req, res) => {
  const id = [req.params["id"]];

  db.query(
    "SELECT * FROM carparking_detail WHERE carparking_owner = ?",
    id,
    function (err, results) {
      if (err) {
        res.json({ status: "400", message: err, success: false });
        return;
      }
      const carparking_id = results[0].carparking_id;
      db.query(
        "SELECT * FROM carbooking WHERE booking_place_id = ? ORDER BY booking_id DESC",
        carparking_id,
        function (err, results) {
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

exports.updateCancelBooking1 = (req, res) => {
  const data = req.body;
  db.query(
    "SELECT * FROM carbooking WHERE booking_id = ?",
    [data.id],
    function (err, results) {
      if (err) {
        res.json({ status: "400", message: err, success: false });
        return;
      }
      const value = results[0];

      // const timeNow = moment().format('HH:mm')
      const timeStart = moment(value.booking_time_in, "HH:mm");
      const timeNow = moment();

      const timeDiff = timeStart.diff(timeNow, "minutes");
      // ถ้าเกิน15นาทียกเลิกไม่ได้
      if (timeDiff > 15) {
        return res.json({
          status: "400",
          message: "Time over 15 minutes",
          success: false,
        });
      }
      db.query(
        "UPDATE carparking_lane_status SET lane_status = ?,user_booking = ?  WHERE carparking_id = ? AND lane_id = ? AND time_booking BETWEEN ? AND ?",
        [
          0,
          null,
          value.booking_place_id,
          value.booking_lane,
          value.booking_time_in,
          value.booking_time_out,
        ],
        function (err, results) {
          if (err) {
            res.json({ status: "400", message: err, success: false });
            return;
          }
          db.query(
            "UPDATE user SET user_cancel = ? WHERE id = ?",
            [1, value.booking_user],
            function (err, results) {
              if (err) {
                res.json({ status: "400", message: err, success: false });
                return;
              }
              db.query(
                "DELETE FROM carbooking WHERE booking_id = ?",
                [data.id],
                function (err, results) {
                  if (err) {
                    res.json({ status: "400", message: err, success: false });
                    return;
                  }
                  res.json({ status: "200", success: true });
                }
              );
            }
          );
        }
      );

      // อัปเดตไอดีว่าเคยมีการcancel

      // res.json({ status: "200", data: results, success: true });
      // if(value.booking_status == 'รอเข้าจอด' && )
    }
  );

  // const id = req.body.id;
  // const timeIn = req.body.timeIn;
  // const timeStart = moment(req.body.timeIn, "HH:mm");
  // const timeNow = moment();
  // const minutesDiff = timeStart.diff(timeNow, "minutes");
  // if (minutesDiff >= 10) {
  //   db.query(
  //     "DELETE FROM carbooking WHERE booking_id = ?",
  //     id,
  //     function (err, results, fields) {
  //       if (err) {
  //         res.json({ status: "400", message: err });
  //         return;
  //       }
  //       return res.json({ status: "200", success: true });
  //     }
  //   );
  // }
};

// exports.updateStatusGoInCarparking = async (req, res) => {
//   const { place, id, user, lane } = req.body;
//   const client = mqtt.connect("mqtt://broker.mqttdashboard.com:1883");
//   client.on("connect", function () {
//     client.subscribe("alert/status", function (err) {
//       if (err) {
//         console.log(err);
//       }
//     });
//     client.publish(`barrier/status/${place}/${lane}`, "open");
//   });
//   client.on("message", function (topic, message) {
//     const barrier_status = message.toString();
//     console.log(barrier_status);
//     if (barrier_status == "true") {
//       client.end();
//       db.query(
//         "UPDATE carparking_lane_detail SET status = ?, user_id = ? WHERE carparking_id = ? AND lane_id = ?",
//         [1, user, place, lane],
//         function (err, results, fields) {
//           if (err) {
//             res.json({ status: "400", message: err });
//             return;
//           }
//           db.query(
//             "UPDATE carbooking SET booking_status = ?, booking_lane = ? WHERE booking_id = ?",
//             ["กำลังจอด", lane, id],
//             function (err, results, fields) {
//               if (err) {
//                 res.json({ status: "400", message: err });
//                 return;
//               }
//               db.query(
//                 "SELECT * FROM carparking_detail WHERE carparking_id = ?",
//                 [place],
//                 function (err, results, fields) {
//                   if (err) {
//                     res.json({ status: "400", message: err, success: false });
//                     return;
//                   }
//                   const tokenBot = results[0].caparking_token;
//                   if (tokenBot) {
//                     const lineNotify = require("line-notify-nodejs")(tokenBot);
//                     lineNotify
//                       .notify({
//                         message: `แจ้งเตือนนำรถเข้าช่องจอดที่่:${lane} เวลา:${moment().format(
//                           "DD/MM/YYYY HH:mm:ss"
//                         )}`,
//                       })
//                       .then(() => {
//                         console.log("send completed!");
//                       });
//                   }
//                   res.json({ status: "200", success: true });
//                 }
//               );
//             }
//           );
//         }
//       );
//     } else {
//       return res.json({
//         status: "400",
//         message: "Fail to detect your license plate",
//       });
//     }
//   });
// };

exports.updateStatusGoInCarparking = async (req, res) => {
  const { place, id, user, lane } = req.body;
  console.log(req.body);
  const client = mqtt.connect("mqtt://broker.mqttdashboard.com:1883");
  client.on("connect", function () {
    client.subscribe("alert/status", function (err) {
      if (err) {
        console.log(err);
      }
    });
    client.publish(`barrier/status/${place}/${lane}`, "open");
  });
  client.on("message", function (topic, message) {
    const barrier_status = message.toString();
    console.log(barrier_status);
    if (barrier_status == "true") {
      client.end();
      db.query(
        "UPDATE carparking_lane_detail SET status = ?, user_id = ? WHERE carparking_id = ? AND lane_id = ?",
        [1, user, place, lane],
        function (err, results, fields) {
          if (err) {
            res.json({ status: "400", message: err, success: false });
            return;
          }
          db.query(
            "UPDATE carbooking SET booking_status = ?, booking_lane = ?,booking_goin = ? WHERE booking_id = ?",
            ["กำลังจอด", lane, moment().format("HH:mm"), id],
            function (err, results, fields) {
              if (err) {
                res.json({ status: "400", message: err, success: false });
                return;
              }
              db.query(
                "SELECT * FROM carparking_detail WHERE carparking_id = ?",
                [place],
                function (err, results, fields) {
                  if (err) {
                    res.json({ status: "400", message: err, success: false });
                    return;
                  }
                  const tokenBot = results[0].caparking_token;
                  if (tokenBot) {
                    const lineNotify = require("line-notify-nodejs")(tokenBot);
                    lineNotify
                      .notify({
                        message: `แจ้งเตือนนำรถเข้าช่องจอดที่่:${lane} เวลา:${moment().format(
                          "DD/MM/YYYY HH:mm:ss"
                        )}`,
                      })
                      .then(() => {
                        console.log("send completed!");
                      });
                  }
                  res.json({ status: "200", success: true });
                }
              );
            }
          );
        }
      );
    } else {
      return res.json({
        status: "400",
        message: "Fail to detect your license plate",
        success: false,
      });
    }
  });
};

// exports.updateStatusGoOutCarparking = (req, res) => {
//   const id = req.body.id;
//   const place = req.body.place;
//   const lane = req.body.lane;
//   const timeIn = req.body.timeIn;
//   const timeOut = req.body.timeOut;
//   const cancel = req.body.cancel;

//   const data = req.body;

//   db.query(
//     "SELECT * FROM carparking WHERE carparking_id = ?",
//     [data.id],
//     function (err, results, fields) {
//       if (err) {
//         res.json({ status: "400", message: err, success: false });
//         return;
//       }
//       const value = results[0];
//       const timeStart = moment(value.booking_goin, "HH:mm");
//       const timeNow = moment();
//       const minutesDiff = timeNow.diff(timeStart, "minutes");
//       const cost =
//         Math.ceil((minutesDiff / 60) * value.booking_price) +
//           data.user.is_cancel >
//         0
//           ? 20
//           : 0;
//       if (data.user.is_cancel > 0) {
//         db.query(
//           "UPDATE users SET user_cancel = ?",
//           [0],
//           function (err, results, fields) {
//             if (err) {
//               return res.json({ status: "400", message: err });
//             }
//           }
//         );
//       }
//       db.query(
//         "UPDATE carparking_lane_status SET lane_status = ? ,user_booking = ?  WHERE carparking_id = ? AND lane_id = ?",
//         [0, null, place, lane],
//         function (err, results, fields) {
//           if (err) {
//             return res.json({ status: "400", message: err });
//           }
//           db.query(
//             "UPDATE carbooking SET booking_status = ? , booking_price = ? ,booking_goout = ? WHERE booking_id = ?",
//             ["จอดเสร็จสิ้น", cost, moment().format("HH:mm"), id],
//             function (err, results, fields) {
//               if (err) {
//                 res.json({ status: "400", message: err });
//                 return;
//               }
//               if (value.caparking_token) {
//                 const lineNotify = require("line-notify-nodejs")(
//                   value.caparking_token
//                 );
//                 lineNotify
//                   .notify({
//                     message: `แจ้งเตือนนำรถออกช่องจอดที่่:${data.lane} จำนวนเงินที่ต้องชำระ:${cost} บาท`,
//                   })
//                   .then(() => {
//                     console.log("send completed!");
//                   });
//               }
//               const client = mqtt.connect(
//                 "mqtt://broker.mqttdashboard.com:1883"
//               );
//               client.on("connect", function () {
//                 client.publish(
//                   `barrier/status/${data.place}/${data.lane}`,
//                   "close"
//                 );
//               });
//               client.on("message", function (topic, message) {
//                 console.log(message.toString());
//                 client.end();
//               });
//               res.json({ status: "200", success: true });
//             }
//           );
//         }
//         //
//       );
//     }
//   );
// };

exports.updateStatusGoOutCarparking = (req, res) => {
  const id = req.body.id;
  const place = req.body.place;
  // const place = req.body.place;
  // const lane = req.body.lane;
  // const timeIn = req.body.timeIn;
  // const timeOut = req.body.timeOut;
  // const cancel = req.body.cancel;

  const data = req.body;
  console.log("data", data);

  db.query(
    "SELECT * FROM carparking_detail WHERE carparking_id = ?",
    [place],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err, success: false });
        return;
      }
      const value = results[0];
      const timeStart = moment(value.booking_goin, "HH:mm");
      const timeNow = moment();
      const minutesDiff = timeNow.diff(timeStart, "minutes");
      const cost =
        Math.ceil((minutesDiff / 60) * value.booking_price) + data.user.cancel >
        0
          ? 20
          : 0;
      if (data.user.cancel > 0) {
        db.query(
          "UPDATE users SET user_cancel = ?",
          [0],
          function (err, results, fields) {
            if (err) {
              return res.json({ status: "400", message: err });
            }
          }
        );
      }
      db.query(
        "UPDATE carparking_lane_status SET lane_status = ? ,user_booking = ?  WHERE carparking_id = ? AND lane_id = ? and time_booking between ? and ?",
        [
          0,
          null,
          place,
          value.booking_lane,
          value.booking_time_in,
          value.booking_time_out,
        ],
        function (err, results, fields) {
          if (err) {
            return res.json({ status: "400", message: err });
          }
          db.query(
            "UPDATE carbooking SET booking_status = ? , booking_price = ? ,booking_goout = ? WHERE booking_id = ?",
            ["จอดเสร็จสิ้น", cost, moment().format("HH:mm"), id],
            function (err, results, fields) {
              if (err) {
                res.json({ status: "400", message: err });
                return;
              }
              db.query(
                "UPDATE carparking_lane_detail SET status = ? , user_id = ?,booking_id = ?  WHERE carparking_id = ? AND lane_id = ?",
                [0, null, null, place, value.booking_lane],
                function (err, results, fields) {
                  if (err) {
                    res.json({ status: "400", message: err });
                    return;
                  }
                  if (value.caparking_token) {
                    const lineNotify = require("line-notify-nodejs")(
                      value.caparking_token
                    );
                    lineNotify
                      .notify({
                        message: `แจ้งเตือนนำรถออกช่องจอดที่่:${value.booking_lane} จำนวนเงินที่ต้องชำระ:${cost} บาท`,
                      })
                      .then(() => {
                        console.log("send completed!");
                      });
                  }
                  const client = mqtt.connect(
                    "mqtt://broker.mqttdashboard.com:1883"
                  );
                  client.on("connect", function () {
                    client.publish(
                      `barrier/status/${place}/${data.booking_lane}`,
                      "close"
                    );
                  });
                  client.on("message", function (topic, message) {
                    console.log(message.toString());
                    client.end();
                  });
                  res.json({ status: "200", success: true });
                }
              );
            }
          );
        }
        //
      );
    }
  );
};
