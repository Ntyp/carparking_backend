const db = require("../database/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const secret = process.env.SECRET_CODE;

// exports.register = (req, res) => {
//   try {
//     let { username, password } = req.body;
//     const salt = 10;
//     bcrypt.hash(password, salt, function (err, hash) {
//       db.execute(
//         "INSERT INTO user (user_username,user_password,user_status,user_cancel) VALUES (?,?,?,?)",
//         [username, hash, "user", 0],
//         function (err, results, fields) {
//           if (err) {
//             res.json({ status: "500", message: err, success: false });
//             return;
//           }
//           return res.json({ status: "201", success: true });
//         }
//       );
//     });
//   } catch (err) {
//     console.log(err);
//     res.status(500).send("Server Error!");
//   }
// };

exports.register = async (req, res) => {
  const data = req.body;
  console.log(data);
  const saltRounds = 10;
  db.execute(
    "SELECT * FROM user WHERE user_username = ? ",
    [data.username],
    function (err, results, fields) {
      if (err) {
        console.error(err);
        res.json({
          status: "500",
          success: false,
          message: "Internal server error",
        });
        return;
      }
      if (results.length > 0) {
        res.json({
          status: "404",
          success: false,
          message: "The user is already in the system.",
        });
        return;
      }
      bcrypt.genSalt(saltRounds, function (err, salt) {
        bcrypt.hash(data.password, salt, function (err, hash) {
          db.execute(
            "INSERT INTO user (user_username,user_password,user_status,user_cancel) VALUES (?,?,?,?)",
            [data.username, hash, "user", 0],
            function (err, results, fields) {
              if (err) {
                console.error(err);
                res.json({ status: "500", message: "Internal server error" });
                return;
              }
              res.json({
                status: "200",
                message: "User registered successfully",
                success: true,
              });
            }
          );
        });
      });
    }
  );
};

exports.login = async (req, res) => {
  let { username, password } = req.body;
  db.execute(
    "SELECT * FROM user WHERE user_username = ?",
    [username],
    function (err, users, fields) {
      if (err) {
        res.json({ status: "500", message: err });
        return;
      }
      if (users.length == 0) {
        res.json({ status: "404", message: "User not found" });
        return;
      }
      console.log("users", users);
      const payload = {
        id: users[0].id,
        username: users[0].user_username,
        status: users[0].user_status,
        cancel: users[0].user_cancel,
      };
      const password_db = users[0].user_password;
      bcrypt.compare(password, password_db, function (err, isLogin) {
        console.log("isLogin:", isLogin);
        if (err) {
          console.error("Bcrypt error:", err);
          res.json({
            status: "500",
            message: "Internal Server Error",
            success: false,
          });
          return;
        }
        if (isLogin) {
          let token = jwt.sign(payload, secret, { expiresIn: "1h" });
          res.json({
            status: "200",
            data: payload,
            token,
            success: true,
          });
        } else {
          res.json({ status: "401", message: "Login Failed!", success: false });
        }
      });
    }
  );
};

exports.authen = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret);
    res.json({ status: "200", decoded, success: true });
  } catch (err) {
    res.json({ status: "500", message: err, success: false });
  }
};

exports.authenUser = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    var decoded = jwt.verify(token, secret);
    res.json({ status: "200", decoded });
  } catch (err) {
    res.json({ status: "500", message: err.message });
  }
};

exports.logout = async (req, res) => {
  const authHeader = req.headers["Authorization"];
  jwt.sign(authHeader, "", { expiresIn: 1 }, (logout, err) => {
    if (logout) {
      res.send({
        status: "200",
        message: "You have been Logged Out!",
        success: true,
      });
    } else {
      res.send({ msg: "Error" });
    }
  });
};

// Get users all
exports.listUser = async (req, res) => {
  try {
    db.query("SELECT * FROM user", function (err, results, fields) {
      console.log("results => ", results);
      res.json({ status: "200", data: results, success: true });
    });
  } catch (err) {
    res.json({ status: "500", message: err.message });
  }
};

// Show data user
exports.showUser = async (req, res) => {
  const id = [req.params["id"]];
  try {
    db.query(
      "SELECT * FROM user WHERE id = ?",
      id,
      function (err, results, fields) {
        console.log("results => ", results);
        res.json({ status: "200", data: results, success: true });
      }
    );
  } catch (err) {
    res.json({ status: "500", message: err.message });
  }
};

// Change permission
exports.editUser = async (req, res) => {
  const data = req.body;
  db.query(
    "SELECT * FROM user WHERE user_username = ?",
    [data.username],
    function (err, results, fields) {
      console.log("results => ", results);
      if (results) {
        const id = results[0].id;
        db.query(
          "UPDATE user SET user_status = ? WHERE user_username = ?",
          [data.role, data.username],
          function (err, results, fields) {
            if (err) {
              res.json({ status: "500", message: err });
              return;
            }
            res.json({ status: "200", success: true });
          }
        );
      } else {
        res.json({ status: "500", message: "User not found!" });
      }
    }
  );
};

exports.deleteUser = async (req, res) => {
  const id = [req.params["id"]];
  db.query(
    "DELETE FROM user WHERE id = ?",
    id,
    function (err, results, fields) {
      if (err) {
        res.json({ status: "500", message: err });
        return;
      }
      res.json({ status: "200", data: results, success: true });
    }
  );
};
