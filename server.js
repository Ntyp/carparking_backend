const express = require("express");
const db = require("./database/database");
const cors = require("cors");
const app = express();
const cron = require("node-cron");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const moment = require("moment");
const dotenv = require("dotenv").config();

app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "20mb" }));
app.use(cors());

// Route
// http://localhost:6969/api/
app.use("/api", require("./routes/api"));

// // =============================
// // @DESC::History Booking
// // =============================

// app.post("/api/bookingcarparking", function (req, res, next) {
//   var placeId = req.body.parking_id;
//   var place = req.body.booking_place;
//   var name = req.body.booking_name;
//   var tel = req.body.booking_tel;
//   var plate = req.body.booking_plate;
//   var type = req.body.booking_type;
//   var time = req.body.booking_time;
//   var date = req.body.booking_date;
//   var user = req.body.user;

//   var formatTime = moment(time).format("HH:mm:ss");

//   var chooseLane = 0;
//   var setLane = false;
//   var min = 99;
//   // res.json(req.body);
//   console.log(req.body);

// Step1 Check bookingtime < 1HR ?
// var hourDiff = moment(time).diff(moment(), 'minute');
// console.log('hourDiff', hourDiff);
// if (hourDiff >= 60) {
//   connection.query(
//     "SELECT * FROM parking WHERE parking_id = ?",
//     [placeId],
//     function (err, results, fields) {
//       // Step2 Check full count ?
//       console.log("eiei");
//       var quantity = results[0].parking_quantity;
//       var count = results[0].parking_count;
//       // console.log(quantity);

//       if (quantity < count) {
//         //  Step3 Update Quatity +1
//         var newQuatity = results[0].parking_quantity + 1;
//         connection.execute(
//           "UPDATE parking SET parking_quantity = ? WHERE parking_id = ?",
//           [newQuatity, placeId],
//           function (err, results, fields) {
//             if (err) {
//               res.json({ status: "error", message: err });
//               return;
//             }
//             // Insert แบบไม่มีlane
//             connection.query(
//               "INSERT INTO booking (parking_id,booking_place,booking_name,booking_tel,booking_plate,booking_type,booking_time,booking_date,booking_status,booking_user) VALUES (?,?,?,?,?,?,?,?,?,?)",
//               [
//                 placeId,
//                 place,
//                 name,
//                 tel,
//                 plate,
//                 type,
//                 formatTime,
//                 date,
//                 "Waiting",
//                 user,
//               ],
//               function (err, results, fields) {
//                 if (err) {
//                   console.log(err);
//                 }
//                 var bookind_id = results.insertId;
//                 // Step4 Find lane
//                 var lane = 1;
//                 for (var lane = 1; lane <= count; lane++) {
//                   connection.query(
//                     "SELECT * FROM parking_detail WHERE parking_id = ? AND parking_lane = ?",
//                     [placeId, lane],
//                     function (err, results, fields) {
//                       if (results[0].parking_plate == null || "") {
//                         setLane = true;
//                         if (results[0].parking_lane < min) {
//                           min = results[0].parking_lane;
//                           console.log("เลือกเลนที่:", min);
//                         }
//                         //
//                         connection.query(
//                           "SELECT * FROM booking WHERE booking_id = ?",
//                           [],
//                           function (err, results, fields) {
//                             res.json(results);
//                           }
//                         );

//                         chooseLane = results[0].parking_lane;
//                         connection.query(
//                           "UPDATE parking_detail SET parking_plate = ? WHERE parking_id = ? AND parking_lane = ?",
//                           [plate, placeId, min],
//                           function (err, results, fields) {
//                             connection.query(
//                               "UPDATE booking SET booking_lane = ? WHERE booking_id = ?",
//                               [min, bookind_id],
//                               function (err, results, fields) {
//                                 // อีก15 นาทีหลังจากเวลาที่จองให้เช็คว่าเข้ามาจอดรึยีงถ้าไม่ให้ยกเลิก
//                                 console.log("laneUpdate:", min);
//                               }
//                             );
//                           }
//                         );
//                         return;
//                       }
//                     }
//                   );
//                   // หาตัวแปรนี้ไม่เจอ
//                   if (setLane == true) {
//                     console.log("หยุดที่:", chooseLane);
//                     break;
//                   }
//                 }
//                 res.json({ status: "ok" });
//               }
//             );
//           }
//         );
//       } else {
//         res.json({ status: "error", message: "Carparking Full!!" });
//       }
//     }
//   );
//   // } else {
//   //   res.json({ status: 'error', message: 'Time booking < 1Hr Or > 2Hr' });
//   // }
// });

// // History Booking
// app.get("/api/booking/:id", function (req, res, next) {
//   connection.query(
//     "SELECT * FROM booking WHERE booking_user = ? ORDER BY booking_id DESC",
//     [req.params["id"]],
//     function (err, results, fields) {
//       res.json({ status: "ok", data: results });
//     }
//   );
// });

// app.get("/api/history/:id", function (req, res, next) {
//   connection.query(
//     "SELECT * FROM booking WHERE booking_id = ?",
//     [req.params["id"]],
//     function (err, results, fields) {
//       res.json({ status: "ok", data: results });
//     }
//   );
// });

// // Update Status Goin
// app.put("/api/history/goin/:id", function (req, res, next) {
//   connection.query(
//     "UPDATE booking SET booking_status = ? WHERE booking_id = ?",
//     ["Arrive", req.params["id"]],
//     function (err, results, fields) {
//       // res.json({ status: 'ok' });
//       connection.query(
//         "SELECT * FROM booking WHERE booking_id = ?",
//         [req.params["id"]],
//         function (err, results, fields) {
//           res.json({ status: "ok", data: results });
//           var parking_id = results[0].parking_id;
//           var plate = results[0].parking_plate;
//           var tel = results[0].parking_tel;
//           var type = results[0].parking_type;
//           var lane = results[0].parking_lane;
//           connection.query(
//             "SELECT * FROM parking WHERE parking_id = ?",
//             [parking_id],
//             function (err, results, fields) {
//               // res.json({ status: 'ok' });
//               var tokenBot = results[0].parking_bot;
//               const lineNotify = require("line-notify-nodejs")(tokenBot);
//               lineNotify
//                 .notify({
//                   message: "แจ้งเตือนนำรถเข้าจอด:",
//                 })
//                 .then(() => {
//                   console.log("send completed!");
//                 });
//             }
//           );
//         }
//       );
//     }
//   );
// });

// // Update Status Goout
// app.put("/api/history/goout/:id", function (req, res, next) {
//   connection.query(
//     "SELECT * FROM booking WHERE booking_id = ?",
//     [req.params["id"]],
//     function (err, results, fields) {
//       var parking_id = results[0].parking_id;

//       // const timeBooking = moment(results.booking_time); //"2022-10-29T17:21:20.020Z"
//       function getTimeInSeconds(str) {
//         let curr_time = [];

//         curr_time = str.split(":");
//         for (let i = 0; i < curr_time.length; i++) {
//           curr_time[i] = parseInt(curr_time[i]);
//         }

//         let t = curr_time[0] * 60 * 60 + curr_time[1] * 60 + curr_time[2];

//         return t;
//       }

//       // Function to convert seconds back to hh::mm:ss
//       // format
//       function convertSecToTime(t) {
//         let hours = Math.floor(t / 3600);
//         let hh = hours < 10 ? "0" + hours.toString() : hours.toString();
//         let min = Math.floor((t % 3600) / 60);
//         let mm = min < 10 ? "0" + min.toString() : min.toString();
//         let sec = (t % 3600) % 60;
//         let ss = sec < 10 ? "0" + sec.toString() : sec.toString();
//         let ans = hh + ":" + mm + ":" + ss;
//         return ans;
//       }

//       // Function to find the time gap
//       function timeGap(st, et) {
//         let t1 = getTimeInSeconds(st);
//         let t2 = getTimeInSeconds(et);

//         let time_diff = t1 - t2 < 0 ? t2 - t1 : t1 - t2;

//         return convertSecToTime(time_diff);
//       }
//       let st = results[0].booking_time;
//       let et = moment().format("HH:mm:ss");
//       let diff = timeGap(st, et);
//       var split = diff.split(":"); // split it at the colons
//       var minutes = +split[0] * 60 + +split[1];
//       var hour = minutes / 60;

//       connection.query(
//         "SELECT * FROM parking WHERE parking_id = ?",
//         [parking_id],
//         function (err, results, fields) {
//           var price = hour * results[0].parking_price;
//           connection.query(
//             "UPDATE booking SET booking_status = ?,booking_timeout = ?,booking_price = ? WHERE booking_id = ?",
//             ["Finish", et, price, req.params["id"]],
//             function (err, results, fields) {
//               res.json({ status: "ok" });
//             }
//           );
//           var tokenBot = results[0].parking_bot;
//           const lineNotify = require("line-notify-nodejs")(tokenBot);
//           lineNotify
//             .notify({
//               message: "แจ้งเตือนนำรถออก:",
//             })
//             .then(() => {
//               console.log("send completed!");
//             });
//         }
//       );
//     }
//   );
// });

// Connect Database
db.connect((err) => {
  if (err) throw err;
  console.log("Database  Connected!!");
});

const PORT_BACKEND = process.env.PORT_BACKEND || 6969 ;
app.listen(PORT_BACKEND, function () {
  console.log(`Server is running on PORT:${PORT_BACKEND}`);
});
