const jwt = require('jsonwebtoken');
const secret = 'GOOGLEyahoo';

const createAccessToken = user => {
  let userCopy = {
    _id: user._id,
    username: user.username,
    role: 'admin'
  };
  return jwt.sign(userCopy, secret, {});
};

const verify = (req, res, next) => {
  // make sure token is NOT undefined
  jwt.verify(req.headers.authorization.slice(7), secret, (err, data) => {
    if (err) {
      res.send({ error: `auth failed` });
    } else {
      next();
    }
  });
};

const isAdmin = (req, res, next) => {
  jwt.verify(req.body.token, secret, (err, data) => {
    if (err) {
      res.send({ error: `auth failed` });
    } else {
      next();
    }
  });
};

const isOwner = (req, res, next) => {
  jwt.verify(req.body.token, secret, (err, data) => {
    if (err) {
      res.send({ error: `auth failed` });
    } else {
      next();
    }
  });
};

module.exports = {
  createAccessToken,
  verify,
  isAdmin,
  isOwner
};
