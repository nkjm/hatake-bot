var express = require('express');
var router = express.Router();

/* Callback */
router.get('/callback', function(req, res, next) {
    console.log(req.body);
    res.send(null);
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
