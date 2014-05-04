// ==UserScript==
// @name        bullshit
// @namespace   biazed.petardo.dk
// @include     http://politiken.dk/*
// @version     0.1.5
// @grant       none
// @require     http://biazed.petardo.dk/flagger/deps/jquery-2.1.1.js
// @require     http://biazed.petardo.dk/flagger/mockup/lib.js
// @require     http://biazed.petardo.dk/flagger/deps/rangy-1.3alpha.804/rangy-core.js
// @require     http://biazed.petardo.dk/flagger/deps/rangy-1.3alpha.804/rangy-cssclassapplier.js
// @require     http://biazed.petardo.dk/flagger/deps/rangy-1.3alpha.804/rangy-textrange.js
// @require     http://biazed.petardo.dk/flagger/deps/jquery-ui-1.10.4/js/jquery-ui-1.10.4.js
// ==/UserScript==

log = unsafeWindow ? unsafeWindow.console.log : console.log;

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

var buttons = jQuery(jQuery.parseHTML(
  '<div id="buttons"> <h3>Bullshit selection</h3> Make a selection in the '+
    'document on the left and hit Bullshit to mark it as bullshit: <br> <input'+
    ' title="BULLSHIT!" type="button" disabled id="bsButton" value="BULLSHIT!"'+
    ' unselectable="on" class="unselectable"><br> <input type="button" '+
    'id="allSelection" value="Sel"> </div>'));

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

function applyBullshit(bs) {
  if (bs != undefined && bs.responseJSON) {
    bs.responseJSON.map(function(x) {
      var res = document.evaluate(x.xpath, document, null, XPathResult.ANY_TYPE, null );
      var obj = res.iterateNext();
      if (x.parHash == crc32(obj.innerHTML)) {
        obj.innerHTML = '<span class="bs" title="BULLSHIT! Here\'s why:' + x.comment +'">' + obj.innerHTML + '</span>';
      }
    });
    // enable tooltips
    jQuery('span.bs').tooltip();
  }
}

(function() {
  rangy.init();

  // Enable buttons
  jQuery('body').prepend(buttons);
  bsButton = jQuery('#bsButton').get(0);

  // Get bullshit
  var bs = getBullshit();
  // Smear it all over
  // FIXME: Should we fling it instead?
  applyBullshit(bs);

  // ClassApplier is the name for the module in 1.3. CssClassApplier is for 1.2 and earlier.
  var classApplierModule = rangy.modules.ClassApplier || rangy.modules.CssClassApplier;

  // Next line is pure paranoia: it will only return false if the browser has no support for ranges,
  // selections or TextRanges. Even IE 5 would pass this test.
  if (rangy.supported && classApplierModule && classApplierModule.supported) {
    jQuery('*').mouseup(function() {
      var selection = rangy.getSelection();
      if (selection.text().length > 0) {
        log(selection.text());
      }
    });

    bsApplier = rangy.createCssClassApplier("bsSelection", {
      elementTagName: "span",
      elementProperties: {
        class: "bsSelection"
      }

    });

    bsButton.addEventListener('click', bsClick, false);
    bsButton.disabled = false;
  }

})();
