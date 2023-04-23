const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth");

const {
  register,
  login,
  authen,
  logout,
  listUser,
  editUser,
  deleteUser,
  showUser,
} = require("../controllers/auth");

const {
  listCarparking,
  getCarparking,
  createCarparking,
  deleteCarparking,
} = require("../controllers/carkparking");

const {
  listBooking,
  getBooking,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  goOutCarparking,
  goInCarparking,
  cancelBooking,
  cronjob,
} = require("../controllers/booking");

const {
  countStatus,
  summaryToday,
  summaryDate,
  countToday,
  updateStatusCarparking,
} = require("../controllers/owner");

//@Endpoint     http://localhost:6969/api/users
//@Method       GET
//@Access       Publish
router.get("/users", listUser);

//@Endpoint     http://localhost:6969/api/user
//@Method       GET
//@Access       Publish
router.get("/user", showUser);

//@Endpoint     http://localhost:6969/api/register
//@Method       POST
//@Access       Publish
router.post("/register", register);

//@Endpoint     http://localhost:6969/api/login
//@Method       POST
//@Access       Publish
router.post("/login", login);

//@Endpoint     http://localhost:6969/api/authen
//@Method       POST
//@Access       Publish
router.get("/authen", authen);

//@Endpoint     http://localhost:6969/api/logout
//@Method       DELETE
//@Access       Publish
router.delete("/logout", logout);

//@Endpoint     http://localhost:6969/api/logout
//@Method       DELETE
//@Access       Publish
router.delete("/user/:id", deleteUser);

//@Endpoint     http://localhost:6969/api/user/:id
//@Method       PUT
//@Access       Publish
router.post("/edituser", editUser);

//@Endpoint     http://localhost:6969/api/user/:id
//@Method       DELETE
//@Access       Publish
router.delete("/user/:id", deleteUser);

// ============================================
// Carparking
// ============================================

//@Endpoint     http://localhost:6969/api/carparking
//@Method       GET
//@Access       Publish
router.get("/carparking", listCarparking); //ต้องแก้ไข Middleware

//@Endpoint     http://localhost:6969/api/carparking/:id
//@Method       GET
//@Access       Publish
router.get("/carparking/:id", getCarparking);

//@Endpoint     http://localhost:6969/api/carparking/:id
//@Method       POST
//@Access       Publish
router.post("/carparking", createCarparking);

//@Endpoint     http://localhost:6969/api/carparking/:id
//@Method       DELETE
//@Access       Publish
router.delete("/carparking/:id", deleteCarparking);

// ============================================
// Booking
// ============================================

//@Endpoint     http://localhost:6969/api/booking
//@Method       GET
//@Access       Publish
router.get("/booking", listBooking);

//@Endpoint     http://localhost:6969/api/booking/:id
//@Method       GET
//@Access       Publish
router.get("/booking/:id", getBooking);

//@Endpoint     http://localhost:6969/api/booking-user/:id
//@Method       GET
//@Access       Publish
router.get("/booking-user/:id", getBookingById);

//@Endpoint     http://localhost:6969/api/booking/:id
//@Method       POST
//@Access       Publish
router.post("/booking", createBooking);

//@Endpoint     http://localhost:6969/api/booking/:id
//@Method       PUT
//@Access       Publish
router.put("/booking/:id", updateBooking);

//@Endpoint     http://localhost:6969/api/booking/:id
//@Method       DELETE
//@Access       Publish
router.delete("/booking/:id", deleteBooking);

//@Endpoint     http://localhost:6969/api/booking/goout/:id
//@Method       PUT
//@Access       Publish
router.post("/booking/goout", goOutCarparking);

//@Endpoint     http://localhost:6969/api/booking/goin
//@Method       PUT
//@Access       Publish
router.post("/booking/goin", goInCarparking);

//@Endpoint     http://localhost:6969/api/booking/cancel
//@Method       POST
//@Access       Publish
router.post("/booking/cancel", cancelBooking);

//@Endpoint     http://localhost:6969/api/booking/cronjob
//@Method       PUT
//@Access       Publish
router.post("/booking/cronjob", cronjob);

//@Endpoint     http://localhost:6969/api/booking
//@Method       GET
//@Access       Publish
router.get("/owner-dashboard", listBooking);

//@Endpoint     http://localhost:6969/api/owner-money
//@Method       GET
//@Access       Publish
router.get("/owner-money/:id/:date", summaryToday);

//@Endpoint     http://localhost:6969/api/owner-money
//@Method       GET
//@Access       Publish
router.get("/owner-count/:id/:date", countToday);

//@Endpoint     http://localhost:6969/api/booking
//@Method       GET
//@Access       Publish
router.get("/owner-booking", listBooking);

//@Endpoint     http://localhost:6969/api/booking
//@Method       GET
//@Access       Publish
router.get("/owner-status-carparking/:id", countStatus);

//@Endpoint     http://localhost:6969/api/booking
//@Method       GET
//@Access       Publish
router.post("/owner-update-status-carparking", updateStatusCarparking);

module.exports = router;
