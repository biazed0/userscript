// ==UserScript==
// @name        bullshit
// @namespace   bullshit.petardo.dk
// @include     http://politiken.dk/*
// @version     0.1
// @grant       GM_addStyle
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// @require     http://dev.petardo.dk/flagger/mockup/lib.js
// @require     http://dev.petardo.dk/flagger/deps/rangy-1.3alpha.804/rangy-core.js
// @require     http://dev.petardo.dk/flagger/deps/rangy-1.3alpha.804/rangy-cssclassapplier.js
// @require     http://dev.petardo.dk/flagger/deps/rangy-1.3alpha.804/rangy-textrange.js
// @require     http://dev.petardo.dk/flagger/deps/jquery-ui-1.10.4/js/jquery-ui-1.10.4.js
// ==/UserScript==

this.$ = this.jQuery = jQuery.noConflict(true);

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
  document.getElementsByTagName("head")[0].appendChild(ref)
}

loadResource("http://dev.petardo.dk/flagger/mockup/mockup.css");
loadResource("http://dev.petardo.dk/flagger/deps/jquery-ui-1.10.4/css/ui-lightness/jquery-ui-1.10.4.css");

var buttons = $($.parseHTML('<div id="buttons"> <h3>Bullshit selection</h3> Make a selection in the document on the left and hit Bullshit to mark it as bullshit: '+
 ' <br> <input title="BULLSHIT!" type="button" disabled id="bsButton" value="BULLSHIT!" unselectable="on" class="unselectable">'+
 '<br> <input type="button" id="allSelection" value="Sel"> </div>'));

var bsApplier;

function toggleBsInputFields() {
  $('#extrabuttons').toggle();
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

var btnClick = function(event) {
      var sel = rangy.getSelection();
      var hash = crc32(sel.anchorNode.parentNode.innerHTML);
      toggleBsApplier();
      $.ajax({
        url: 'http://petardo.dk:8080/insert?col=bs',
        type: 'POST',
        dataType: 'JSON',
        data: "doc=" + JSON.stringify({
          "bs": sel.text(),
          "xpath": getElementXPath(sel.anchorNode.parentNode).replace(/\/span$/, ''),
          "reason": $('.bscomment').text(),
          "reference": $('.reflink').text(),
          "url": document.documentURI,
          "parHash": hash
        })
      })
        .done(function(data) {
          unsafeWindow.console.log("bullshit submitted, got this in return: " + data);
        });
      return false;

    };
//array for paragraph objects
var par =[];


// bsSelection get the current selection, the DOM path of the object
// and anything else we need in order to later find the bullshit.
function bsSelection() {
  var sel = rangy.getSelection();
  var selText = sel.text();

}

function getBullshit() {
  return $.ajax({
    url: 'http://petardo.dk:8080/query?col=bs',
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

function applyBullshit(bs) {
  if (bs != undefined && bs.responseJSON) {
    bs.responseJSON.map(function(x) {
      var res = document.evaluate(x.xpath, document, null, XPathResult.ANY_TYPE, null );
      var obj = res.iterateNext();
      // unsafeWindow.console.log(obj);
      // unsafeWindow.console.log(x.parHash, crc32(obj.innerHTML));
      if (x.parHash == crc32(obj.innerHTML)) {
        // unsafeWindow.console.log(x.reason);
        obj.innerHTML = '<span class="bs" title="BULLSHIT! Here\'s why:' + x.reason +'">' + obj.innerHTML + '</span>';
      }
    });
    // enable tooltips
    $('span.bs').tooltip();
  }
}

(function() {
  rangy.init();

  // Enable buttons
  $('body').prepend(buttons);

  // Get bullshit
  var bs = getBullshit();
  applyBullshit(bs);

  // ClassApplier is the name for the module in 1.3. CssClassApplier is for 1.2 and earlier.
  var classApplierModule = rangy.modules.ClassApplier || rangy.modules.CssClassApplier;

  var sel;
  // Next line is pure paranoia: it will only return false if the browser has no support for ranges,
  // selections or TextRanges. Even IE 5 would pass this test.
  if (rangy.supported && classApplierModule && classApplierModule.supported) {
    // Hide extra buttons
    var extrabuttons = $('#extrabuttons');
    extrabuttons.toggle();

    $('*').not('#extrabuttons').mouseup(function() {
      var selection = rangy.getSelection();
      unsafeWindow.console.log(selection.text());
      if (selection.text().length > 0) {
        extrabuttons.show();
      }
    });

    bsApplier = rangy.createCssClassApplier("bsSelection", {
      elementTagName: "span",
      elementProperties: {
        class: "bsSelection"
      }

    });

    var bsButton = $('#bsButton').get(0);
    bsButton = bsButton.wrappedJSObject;

    bsButton.addEventListener('click', btnClick, false);

    bsButton.disabled = false;
  }

  $('#allSelection').on('click', function(){
    $( '.bsSelection' ).each(function( index ) {
      unsafeWindow.console.log( index + ": " + $( this ).text() );
    });

  });
})();
