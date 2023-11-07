// ปรับสถานะสมาชิกให่เป็นเจ้าของ Owner


const db = require("../database/database");

exports.listUserOnly = async (req, res) => {
  db.query(
    "SELECT user_username FROM user WHERE user_status != ?",
    ["admin"],
    function (err, results, fields) {
      if (err) {
        res.json({ status: "400", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};

// exports.listOwnerOnly = async (req, res) => {
//   db.query(
//     "SELECT * FROM user WHERE user_status == ?",
//     ["owner"],
//     function (err, results, fields) {
//       if (err) {
//         res.json({ status: "400", message: err });
//         return;
//       }
//       const payload = {
//         id: "",
//         username: "",
//         role: "",
//       };
//       res.json({ status: "200", data: results, success: true });
//     }
//   );
// };
