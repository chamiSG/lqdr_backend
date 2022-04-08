const multer = require('multer');
const controller = require('../controllers/referer.controller');

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/getReferralURL",
    controller.getReferralURL
  );

  app.post(
    "/setReferer",
    controller.setReferer
  );
  app.post(
    "/getReferer",
    controller.getReferer
  );
};