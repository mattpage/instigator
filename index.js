"use strict";

var _ = require('lodash');
var request = require('request');
var cheerio = require('cheerio');
var natural = require('natural');
var tfidf = new natural.TfIdf();
var logger = console;

var argv = require('yargs')
            .usage('Usage: node $0 <url> [options]')
            .demand(1)
            .example('node $0 http://google.com')
            .argv;

function links($, txt, meta){
  var tag = 'a';
  var $tags = $(tag);
  if ($tags.length > 0){
    meta[tag] = {
      total: 0
    };
    meta[tag].total = $tags.length;
    meta[tag].urls = [];

    $tags.each(function(){
      var $el = $(this);
      var href = $el.attr('href');
      meta[tag].urls.push(href.toLowerCase());
    });

    meta[tag].urls = _.uniq(meta[tag].urls);
  }
  return txt;
}

function removeTagBlock($, tag, txt, meta){
  var $tags = $(tag);
  if ($tags.length > 0){
    meta[tag] = {
      removed: 0,
      total: 0
    };
    meta[tag].total = $tags.length;

    $tags.each(function(){
      var $el = $(this).text();
      var index = txt.indexOf($el);
      if (index > -1){
        txt = txt.replace($el, '');
        meta[tag].removed += 1;
      }
    });
  }
  return txt;
}

function analyze(url){

  logger.info('requesting: ', url);

  request({
    "url": url,
    "method": 'get',
    "headers": {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml'
    }
  }, function(err, res, body){

    if(err || res.statusCode !== 200){
      return logger.error(err);
    }

    //logger.trace('response body:', body);
    var $ = cheerio.load(body);

    var meta = {};
    meta.tags = {};
    meta.url = url;
    meta.title = $("title").text();

    var txt = $("body").text();

    txt = removeTagBlock($, 'script', txt, meta.tags);
    txt = removeTagBlock($, 'code', txt, meta.tags);
    txt = removeTagBlock($, 'iframe', txt, meta.tags);
    txt = links($, txt, meta.tags);

    meta.text = txt.replace(/\s+/g,' ');
    meta.tfidf = [];

    tfidf.addDocument(txt);
    tfidf.listTerms(0/*document index*/).forEach(function(item) {
      meta.tfidf.push(item.term + ': ' + item.tfidf);
    });

    logger.info(JSON.stringify(meta, undefined, 2));

  });
}

analyze(argv._[0]);
