// ==UserScript==
// @name        bullshit
// @namespace   biazed.petardo.dk
// @include     /^https?://politiken.dk/.*$/
// @include     /^https?://www.theguardian.com/.*$/
// @include     /^https?://www.dr.dk/.*$/
// @include     /^https?://www.bt.dk/.*$/
// @include     /^https?://ekstrabladet.dk/.*$/
// @version     0.1.5
// @grant       none
// @require     http://biazed.petardo.dk/flagger/deps/jquery-2.1.1.js
// @require     http://biazed.petardo.dk/flagger/mockup/lib.js
// @require     http://biazed.petardo.dk/biazed/js/bootstrap.min.js
// @require     http://biazed.petardo.dk/flagger/deps/rangy-1.3alpha.804/rangy-core.js
// @require     http://biazed.petardo.dk/flagger/deps/rangy-1.3alpha.804/rangy-cssclassapplier.js
// @require     http://biazed.petardo.dk/flagger/deps/rangy-1.3alpha.804/rangy-textrange.js
// @require     http://biazed.petardo.dk/flagger/deps/jquery-ui-1.10.4/js/jquery-ui-1.10.4.js
// ==/UserScript==

var log = unsafeWindow ? unsafeWindow.console.log : console.log;

function debug(s) {
  if (true)
    log(s);
}

// For jQuery -- relinquish the var '$'
jQuery.noConflict();

function loadResource(url) {
  var ref;
  if (url.match(/.*?\.css/)) {
    ref = document.createElement("link");
    ref.setAttribute("rel", "stylesheet");
    ref.setAttribute("type", "text/css");
    ref.setAttribute("href", url);
  } else {
    ref = document.createElement('script');
    ref.setAttribute("type","text/javascript");
    ref.setAttribute("src", url);
  }
  document.getElementsByTagName("head")[0].appendChild(ref);
}

loadResource("http://biazed.petardo.dk/flagger/mockup/mockup.css");
loadResource("http://biazed.petardo.dk/flagger/deps/jquery-ui-1.10.4/css/ui-lightness/jquery-ui-1.10.4.css");

var buttons = jQuery(jQuery.parseHTML(' \
<div id="buttons" class="col-md-4 jumbotron"> \
  <h3>Bullshit selection</h3> \
  Make a selection in the document on the left and hit Bullshit to mark it as bullshit: \
  <input type="text" id="commentVal" class="form-control" placeholder="Comment"> \
  <br> \
  <input title="Biaz!" type="button" disabled id="bsButton" value="BIAZED!" unselectable="on" class="btn btn-danger unselectable"> \
  <div id="sliderContainer"> \
    <div id="slider" class="col-md-6"></div> \
    <input  type="button" id="ratingButton" class="btn btn-primary" value="Rate"> \
  </div> \
</div>'));

// Ioana knows about these ones...
var stringArray=[];
var nodeArr=[];

var bsApplier;

var bsButton;
var bsClick = function(event) {
  var sel = rangy.getSelection();
  if (sel.text().length === 0) {
    return false;
  }
  var hash = crc32(sel.anchorNode.parentNode.innerHTML);
  toggleBsApplier();
  jQuery.ajax({
    url: 'http://biazed.petardo.dk:8080/insert?col=bs',
    type: 'POST',
    dataType: 'JSON',
    data: "doc=" + JSON.stringify({
      "bs": sel.text(),
      "xpath": getElementXPath(sel.anchorNode.parentNode).replace(/\/span$/, ''),
      "comment": jQuery('.bscomment').text(),
      "reference": jQuery('.reflink').text(),
      "url": document.documentURI,
      "parHash": hash
    })
  }).done(function(data) {
    log("bullshit submitted, got this in return: " + data);
  });
  return true;
};

function repositionTooltip( e, ui ) {
  var div = jQuery(ui.handle).data("tooltip").$tip[0];
  var pos = jQuery.extend({}, jQuery(ui.handle).offset(), {
    width: jQuery(ui.handle).get(0).offsetWidth,
    height: jQuery(ui.handle).get(0).offsetHeight
  });

  var actualWidth = div.offsetWidth;

  tp = {left: pos.left + pos.width / 2 - actualWidth / 2};
  jQuery(div).offset(tp);

  jQuery(div).find(".tooltip-inner").text( ui.value );
}

function toggleBsInputFields() {
  jQuery('#extrabuttons').toggle();
}

function toggleBsApplier() {
  bsApplier.toggleSelection();
}

function getSelectedNodes() {
    var selectedNodes = [];
    var sel = rangy.getSelection();
    for (var i = 0; i < sel.rangeCount; ++i) {
        selectedNodes = selectedNodes.concat( sel.getRangeAt(i).getNodes() );
    }
    return selectedNodes;
}

// bsSelection get the current selection, the DOM path of the object
// and anything else we need in order to later find the bullshit.
function bsSelection() {
  var sel = rangy.getSelection();
  var selText = sel.text();

}

function getBullshit() {
  return jQuery.ajax({
    url: 'http://biazed.petardo.dk:8080/query?col=bs',
    type: 'POST',
    async: false,
    dataType: 'JSON',
    data: "q=" + JSON.stringify([{
      "eq": document.documentURI, "in": ["url"]
    }])
  }).done(function(data) {
    return data;
  });
}

function partition(str, index) {
  return [str.substring(0, index), str.substring(index)];
}

function applyBullshit(bs) {
  if (bs.length === 0) {
    return false;
  }
  log('applyBullshit: ' + bs[0].url);

  if (bs != undefined) {
    bs.map(function(x) {
      log('applyBullshit: xpath: ' + x.xpath);
      var res = document.evaluate(x.xpath, document, null, XPathResult.ANY_TYPE, null );
      log(res);
      var obj = res.iterateNext();

      if (obj !== null) {
        log(x.parHash, crc32(obj.innerHTML));
        if (x.parHash == crc32(obj.innerHTML)) {
          var offBeg = x.offsetBegin;
          var offEnd = x.offsetEnd;
          var diff = offEnd-offBeg;
          var commentText = x.comment;
          log(obj.innerHTML)
          var myText = obj.innerHTML;
          log('here')
          var parts = partition(myText, offBeg-2);
          log('there')
          var prev = parts[0];
          myText=parts[1];
          parts = partition(myText, diff);
          myText = parts[0];
          var post = parts[1];

          if (!commentText) {
            log('no comment');
            obj.innerHTML = prev+ '<span class="bs" title="There\'s no comment">' + myText + '</span>' + post;
          } else {
            log('comment!');
            obj.innerHTML = prev+ '<span class="bs" title="BIAZED! Here\'s why: ' + commentText +'">' + myText + '</span>' + post;
          }
        }
      }
    }
                       );
    // enable tooltips
    jQuery('span.bs').tooltip();
  }
}

function getUserComment(){
  return jQuery("#commentVal").val();
}

function getUserRating(){
  return jQuery( "#slider" ).slider( "value" );
}

// send rating function
function sendUserRating(rating) {
  var date = new Date();
  jQuery.ajax({
    url: 'http://biazed.petardo.dk:8080/insert?col=rt',
    type: 'POST',
    dataType: 'JSON',
    data: "doc=" + JSON.stringify({
      "timestamp":date.getTime(),
      "rating":rating,
      "url": document.documentURI
    })
  })
    .done(function(data) {
      // console.log(data);
    });
}

function getBiasAverage(){
  var avg;
  jQuery.ajax({
    url: 'http://biazed.petardo.dk:8080/query?col=rt',
    type: 'POST',
    async: false,
    dataType: 'JSON',
    data: "q=" + JSON.stringify([{
      "eq": document.documentURI, "in": ["url"]
    }])
  }).done(function(data) {
    var ratingArr = data;
    var sum=0;
    for(i=0;i<ratingArr.length;i++){

      sum+=ratingArr[i].rating;
    }
    avg =Math.round(100*sum/ratingArr.length)/100;

    return avg;
  });

  return avg;
}

log('before init');
(function() {
  rangy.init();
  log('rangy initialized');

  // Enable buttons
  jQuery('body').prepend(buttons);
  bsButton = jQuery('#bsButton').get(0);

  var slider = jQuery("#slider");
  jQuery(function() {
    slider.slider({ max: 5  });
  });

  //SEND USER RATING
  jQuery('#ratingButton').click(function(){
    sendUserRating(slider.slider( "value" ));
    log(slider.slider( "value" ));
  });


  // Get bullshit
  var bs = getBullshit();
  log('bs gotten');
  // Smear it all over
  // FIXME: Should we fling it instead?
  applyBullshit(bs.responseJSON);
  log('bs applied');

  var bias = getBiasAverage();
  var biasPercent = (bias*100)/5;
  log('bias averages gotten');

  // PROGRESS BAR
  jQuery('.bsLevel').append(' \
<div class=""> \
  <div class="progress col-sm-6"> \
    <div class="progress-bar progress-bar-danger" role="progressbar" aria-valuenow="80" aria-valuemin="0" aria-valuemax="100" style="width: '+biasPercent+'%; background-color: rgba(255,0,0,'+(biasPercent/100)+');"> \
      <span class="sr-only">80% Complete</span> \
    </div> \
  </div> \
</div>');
  log('progress bar appended');

  // ClassApplier is the name for the module in 1.3. CssClassApplier is for 1.2 and earlier.
  var classApplierModule = rangy.modules.ClassApplier || rangy.modules.CssClassApplier;

  // Next line is pure paranoia: it will only return false if the browser has no support for ranges,
  // selections or TextRanges. Even IE 5 would pass this test.
  if (rangy.supported && classApplierModule && classApplierModule.supported) {
    // jQuery('*').mouseup(function() {
    //   var selection = rangy.getSelection();
    //   if (selection.text().length > 0) {
    //     log(selection.text());
    //   }
    // });

    bsApplier = rangy.createCssClassApplier("bsSelection", {
      elementTagName: "span",
      elementProperties: {
        class: "bsSelection"
      }

    });

    // GET THE PARENT AND OFFSET VALUES
    var bsClick = function() {
      var sel = rangy.getSelection();
      var whosYourDaddy = sel.anchorNode.parentNode;
      log(sel);

      var offset= (sel.anchorOffset);
      var endOffset = (sel.focusOffset);

      // NORMALIZE OFFSET DEPENDING ON THE USER'S SELECTION (right to left vs left to right)

      if (offset>endOffset) {
        var rep = offset;
        offset = endOffset;
        endOffset = rep;
      }

      //GET COMMENTS FROM FORM
      // Get Rating from comments

      var comm = getUserComment();
      var rate = getUserRating();
      log('comments and ratings');

      // SEND REQUEST TO THE SERVER
      var hash = crc32(sel.anchorNode.parentNode.innerHTML);
      log('hash created');
      toggleBsApplier();
      log('bsApplier toggled');
      var data = {
        "comment":comm,
        "bs": sel.text(),
        "offsetBegin": offset,
        "offsetEnd":endOffset,
        "xpath": getElementXPath(sel.anchorNode.parentNode).replace(/\/span$/, ''),
        "reason": jQuery('.bscomment').text(),
        "reference": jQuery('.reflink').text(),
        "url": document.documentURI,
        "parHash": hash
      };
      jQuery.ajax({
        url: 'http://biazed.petardo.dk:8080/insert?col=bs',
        type: 'POST',
        dataType: 'JSON',
        data: "doc=" + JSON.stringify(data)
      })
        .done(function(data) {
          // console.log(data);
        });
      log('ajax sent');
      applyBullshit([data]);
      log('new bs applied');
      return false;
    };

    bsButton.addEventListener('mousedown', bsClick, false);
    log('event listener added');
    bsButton.disabled = false;
  }

})();
