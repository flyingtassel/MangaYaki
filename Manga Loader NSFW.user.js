// ==UserScript==
// @name       Manga Loader NSFW
// @namespace  http://www.fuzetsu.com/MangaLoaderNSFW
// @version    1.0.28
// @description  Loads manga chapter into one page in a long strip format, supports switching chapters and works for a variety of sites, minimal script with no dependencies, easy to implement new sites, loads quickly and works on mobile devices through bookmarklet
// @copyright  2014+, fuzetsu
// @noframes
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_deleteValue
// @grant GM_registerMenuCommand
// -- NSFW START
// @match *://dynasty-scans.com/chapters/*
// @match *://hentaifr.net/*
// @match *://prismblush.com/comic/*
// @match *://www.hentairules.net/galleries*/picture.php*
// @match *://pururin.com/view/*
// @match *://hitomi.la/reader/*
// @match *://www.doujin-moe.us/*
// @match *://www.8muses.com/picture/*/*/*/*
// @match *://nowshelf.com/watch/*
// @match *://nhentai.net/g/*/*
// @match *://g.e-hentai.org/s/*/*
// @match *://exhentai.org/s/*/*
// @match *://www.fakku.net/*/*/read*
// @match *://hentaihere.com/m/*/*/*
// @match *://www.hentaihere.com/m/*/*/*
// @match *://*.tsumino.com/Read/View/*
// -- NSFW END
// -- FOOLSLIDE NSFW START
// @match *://reader.yuriproject.net/read/*
// @match *://ecchi.japanzai.com/read/*
// @match *://h.japanzai.com/read/*
// @match *://reader.japanzai.com/read/*
// @match *://yomanga.co/reader/read/*
// @match *://hentai.cafe/manga/read/*
// -- FOOLSLIDE NSFW END
// @require https://greasyfork.org/scripts/692-manga-loader/code/Manga%20Loader.user.js?19
// ==/UserScript==

var nsfwimp = [{
  name: 'geh-and-exh',
  match: "^https?://(g.e-hentai|exhentai).org/s/.*/.*",
  img: '.sni > a > img, #img',
  next: '.sni > a, #i3 a',
  numpages: 'body > div > div:nth-child(2) > div > span:nth-child(2)',
  curpage: 'body > div > div:nth-child(2) > div > span:nth-child(1)'
}, {
  name: 'fakku',
  match: "^http(s)?://www.fakku.net/.*/.*/read",
  img: '.current-page',
  next: '.current-page',
  numpages: '.drop',
  curpage: '.drop',
  pages: function(url, num, cb, ex) {
    var firstNum = url.lastIndexOf('/'),
      lastDot = url.lastIndexOf('.');
    var c = url.charAt(firstNum);
    while (c && !/[0-9]/.test(c)) {
      c = url.charAt(++firstNum);
    }
    var curPage = parseInt(url.slice(firstNum, lastDot), 10);
    url = url.slice(0, firstNum) + ('00' + (curPage + 1)).slice(-3) + url.slice(lastDot);
    cb(url, url);
  }
}, {
  name: 'nowshelf',
  match: "^https?://nowshelf.com/watch/[0-9]*",
  img: '#image',
  next: '#image',
  numpages: function() {
    return parseInt(getEl('#page').textContent.slice(3), 10);
  },
  curpage: function() {
    return parseInt(getEl('#page > input').value, 10);
  },
  pages: function(url, num, cb, ex) {
    cb(page[num], num);
  }
}, {
  name: 'nhentai',
  match: "^https?://nhentai\\.net\\/g\\/[0-9]+/[0-9]+",
  img: '#image-container > a img',
  next: '#image-container > a',
  numpages: '.num-pages',
  curpage: '.current',
  imgmod: {
    altProp: 'data-cfsrc'
  },
}, {
  name: '8muses',
  match: "^http(s)?://www.8muses.com/picture/[^/]+/[^/]+/[^/]+/.+",
  img: '#image',
  next: '#next_picture',
  numpages: '#main > aside > div.pages-row.mobile-hidden > select'
}, {
  name: 'hitomi',
  match: "^http(s)?://hitomi.la/reader/[0-9]+.html",
  img: '#comicImages > img',
  next: '#comicImages > img',
  numpages: function() {
    return W.images.length;
  },
  curpage: function() {
    return parseInt(W.curPanel);
  },
  pages: function(url, num, cb, ex) {
    cb(W.images[num - 1].path, num);
  }, 
  wait: '#comicImages > img'
}, {
  name: 'doujin-moe',
  _pages: null,
  match: "^https?://www.doujin-moe.us/.+",
  img: 'img.picture',
  next: 'img.picture',
  numpages: function() {
    if (!this._pages) {
      this._pages = getEls('#gallery djm').map(function(file) {
        return file.getAttribute('file');
      });
    }
    return this._pages.length;
  },
  curpage: function() {
    return parseInt(getEl('.counter').textContent.match(/^[0-9]+/)[0]);
  },
  pages: function(url, num, cb, ex) {
    cb(this._pages[num - 1], num);
  }
}, {
  name: 'pururin',
  match: "^https?://pururin\\.com/view/.+\\.html",
  img: '.image img',
  next: 'a.image-next',
  numpages: 'select.image-pageSelect',
  curpage: 'select.image-pageSelect'
}, {
  name: 'hentai-rules',
  match: "^https?://www\\.hentairules\\.net/galleries[0-9]*/picture\\.php.+",
  img: '#theMainImage',
  next: '#linkNext',
  imgmod: {
    altProp: 'data-src'
  },
  numpages: function(cur) {
    return parseInt(getEl('.imageNumber').textContent.replace(/([0-9]+)\/([0-9]+)/, cur ? '$1' : '$2'));
  },
  curpage: function() {
    return this.numpages(true);
  }
}, {
  name: 'ero-senmanga',
  match: "^https?://ero\\.senmanga\\.com/[^/]*/[^/]*/[0-9]*",
  img: '#picture',
  next: '#omv > table > tbody > tr:nth-child(2) > td > a',
  numpages: 'select[name=page]',
  curpage: 'select[name=page]',
  nextchap: function(prev) {
    var next = extractInfo('select[name=chapter]', {
      type: 'value',
      val: (prev ? -1 : 1)
    });
    if (next) return window.location.href.replace(/\/[^\/]*\/[0-9]+\/?$/, '') + '/' + next + '/1';
  },
  prevchap: function() {
    return this.nextchap(true);
  }
}, {
  name: 'hentaifr',
  match: "^https?://hentaifr\\.net/.+\\.php\\?id=[0-9]+",
  img: 'center > table:nth-child(11) > tbody > tr > td > a > img',
  next: 'center > table:nth-child(11) > tbody > tr > td > a',
  wait: function() {
    return getEl(this.img) && getEl(this.next);
  }
}, {
  name: 'prism-blush',
  match: "^https?://prismblush.com/comic/.+",
  img: '#comic img',
  next: '#comic a'
}, {
  name: 'hentai-here',
  match: "^https?://(www\\.)?hentaihere.com/m/[^/]+/[0-9]+/[0-9]+",
  img: '#arf-reader-img',
  next: '#arf-reader-img',
  curpage: function() {
    return parseInt(W.rff_thisIndex);
  },
  numpages: function() {
    return W.rff_imageList.length;
  },
  pages: function(url, num, cb, ex) {
    cb(W.imageCDN + W.rff_imageList[num - 1], num);
  },
  nextchap: function() {
    return W.rff_nextChapter;
  },
  prevchap: function() {
    return W.rff_previousChapter;
  },
  curchap: function() {
    var curchap;
    getEls('ul.dropdown-menu.text-left li').some(function(li, index) {
      if(getEl('a.bg-info', li)) {
        curchap = index + 1;
      };
    });
    return curchap;
  },
  numchaps: 'ul.dropdown-menu.text-left',
  wait: 'ul.dropdown-menu.text-left'
}, {
  name: 'foolslide',
  match: "^https?://(" + [
    'reader.yuriproject.net/read/.+',
    'ecchi.japanzai.com/read/.+',
    'h.japanzai.com/read/.+',
    'reader.japanzai.com/read/.+',
    'yomanga.co/reader/read/.+',
    'hentai.cafe/manga/read/.+'
  ].join('|') + ")",
  img: function() {
    return W.pages[W.current_page].url;
  },
  next: function() {
    return 'N/A';
  },
  numpages: function() {
    return W.pages.length;
  },
  curpage: function() {
    return W.current_page + 1;
  },
  nextchap: function(prev) {
    var desired;
    var dropdown = getEls('ul.dropdown')[1] || getEls('ul.uk-nav')[1];
    if(!dropdown) return;
    getEls('a', dropdown).forEach(function(chap, idx, arr) {
      if(location.href.indexOf(chap.href) === 0) desired = arr[idx + (prev ? 1 : -1)];
    });
    return desired && desired.href;
  },
  prevchap: function() {
    return this.nextchap(true);
  },
  pages: function(url, num, cb, ex) {
    cb(W.pages[num - 1].url, num);
  },
  wait: function() {
    return W.pages;
  }
}, {
  name: 'tsumino',
  match: '^https?://(www\\.)?tsumino.com/Read/View/.+',
  img: '.reader-img',
  next: '.reader-page a',
  numpages: function(curpage) {
	var info = getEl('.reader-page h1').textContent;
	return parseInt(curpage ? info.match(/Page ([0-9]+)/)[1] : info.match(/[0-9]+$/)[0]);
  },
  curpage: function() {
	return this.numpages(true);
  }
}, {
  name: 'dynasty-scans',
  match: "^https?://dynasty-scans.com/chapters/.*",
  img: '#image > img',
  next: '#image > img',
  numpages: function() {
    return W.pages.length;
  },
  curpage: function() {
    return parseInt(getEl('#image > div.pages-list > a.page.active').textContent);
  },
  nextchap: '#next_link',
  prevchap: '#prev_link',
  pages: function(url, num, cb, ex) {
    url = W.pages[num - 1].image;
    cb(url, url);
  }
}];

log('loading nsfw implementations...');
W.MLoaderLoadImps(nsfwimp);
