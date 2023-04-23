const jwt = require("jsonwebtoken");
const secret = process.env.SECRET_CODE;

exports.auth = (req, res, next) => {
  let token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send("No token,Authorization denied");
  }
  try {
    let decoded = jwt.verify(token, secret);
    next();
  } catch (err) {
    console.log(err);
    res.status(401).send("Token invalid");
  }
};
