var express = require('express');
var router = express.Router();

/* Callback */
router.post('/callback', function(req, res, next) {
    console.log(req.body.to);
    res.send(null);
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
