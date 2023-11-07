const db = require("../database/database");
const moment = require("moment");

// บอกสถานะปัจจุบันว่าว่างไม่ว่าง
// exports.countStatus = (req, res) => {
//   const carparking_id = [req.params["id"]];
//   const status = [req.params["status"]];
//   db.query(
//     "SELECT COUNT(carparking_id) FROM carparking_lane WHERE status = ? AND carparking_id = ?",
//     [carparking_id, status],
//     function (err, results, fields) {
//       if (err) {
//         res.json({ status: "400", message: err });
//         return;
//       }
//       res.json({ status: "200", data: results, success: true });
//     }
//   );
// };

exports.countStatus = (req, res) => {
  const id = [req.params["id"]]; //carparking_owner
  db.query(
    "SELECT * FROM carparking WHERE carparking_owner = ?",
    [id],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      console.log(results);
      const carparking_id = results[0].carparking_id;
      db.query(
        "SELECT * FROM carparking_lane WHERE carparking_id = ?",
        [carparking_id],
        function (err, results, fields) {
          if (err) {
            res.json({ status: "400", message: err });
            return;
          }
          res.json({ status: "200", data: results, success: true });
        }
      );
    }
  );
};

// ยอดจอง
exports.countToday = (req, res) => {
  const owner = [req.params["id"]];
  const date = [req.params["date"]];
  db.query(
    "SELECT * FROM carparking WHERE carparking_owner = ?",
    [owner],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      const carparking_id = results[0]?.carparking_id;
      db.query(
        "SELECT COUNT(booking_id) as count FROM carbooking WHERE booking_place_id = ? AND booking_date = ?",
        [carparking_id, date],
        function (err, results, fields) {
          if (err) {
            res.json({ status: "400", message: err });
            return;
          }
          res.json({ status: "200", data: results, success: true });
        }
      );
    }
  );
};

// ยอดเงิน today
exports.summaryToday = (req, res) => {
  const id = [req.params["id"]];
  const date = [req.params["date"]];
  db.query(
    "SELECT * FROM carparking WHERE carparking_owner = ?",
    [id],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      const carparking_id = results[0]?.carparking_id;
      db.query(
        "SELECT SUM(booking_price) as money FROM carbooking WHERE booking_place_id = ? AND booking_date = ?",
        [carparking_id, date],
        function (err, results, fields) {
          if (err) {
            res.json({ status: "400", message: err });
            return;
          }
          res.json({ status: "200", data: results, success: true });
        }
      );
    }
  );
};

exports.summaryDate = (req, res) => {
  const carparking_id = [req.params["id"]];
  const date = [req.params["date"]];
  db.query(
    "SELECT SUM(booking_price) FROM carbooking WHERE booking_place_id = ? AND booking_date = ?",
    [carparking_id, date],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

// อัปเดตเปิดปิดลานจอด
exports.updateStatusCarparking = async (req, res) => {
  const id = req.body.id;
  const status = req.body.status;
  db.query(
    "UPDATE carparking_detail SET carparking_status = ? WHERE carparking_owner = ?",
    [status, id],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", message: "Update Finish", success: true });
    }
  );
};

// ประวัติการจอดทั้งหมด
exports.listAllBooking = (req, res) => {
  const carparking_id = [req.params["id"]];
  db.query(
    "SELECT * FROM carbooking WHERE booking_place_id = ?",
    [carparking_id],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

exports.getParkingHistoryByPlace = async (req, res) => {
  const name = [req.params["name"]]; // carparking
  db.query(
    "SELECT * FROM carbooking WHERE booking_place = ? ORDER BY booking_id DESC",
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

exports.listOwnerOnly = async (req, res) => {
  db.query(
    "SELECT user_username FROM user WHERE user_status = ?",
    ['owner'],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};
