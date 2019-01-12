// ==UserScript==
// @name        Bilibili Screenshot Button
// @author      LaySent
// @version     1.0.0
// @description Add a button that lets you take screenshot of current video on bilibili.
// @homepage    https://github.com/laysent/bilibili-screenshot-button
// @match       https://www.bilibili.com/*
// @downloadURL https://github.com/laysent/bilibili-screenshot-button/index.user.js
// @updateURL   https://raw.githubusercontent.com/laysent/bilibili-screenshot-button/master/index.user.js
// @supportURL  https://github.com/laysent/bilibili-screenshot-button/issues
// @run-at      document-end
// @license     MIT License
// ==/UserScript==
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
function createScreenshotFromVideo(video) {
    var canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}
function openImageInNewTab(dataURI) {
    var html = "<html><body><img src=\"" + dataURI + "\"/></body></html>";
    var newTab = window.open('', "tab-" + Date.now());
    newTab.document.open();
    newTab.document.write(html);
    newTab.document.close();
}
function isResourceUnderSameDomain(url) {
    if (url.indexOf('blob:') === 0)
        return true;
    if ((new URL(url)).host === location.host)
        return true;
    return false;
}
var Player = /** @class */ (function () {
    function Player() {
        var _this = this;
        this.takeScreenshot = function () {
            if (!_this.video)
                return;
            if (_this.button.classList.contains('disabled'))
                return;
            _this.pause();
            var image = createScreenshotFromVideo(_this.video);
            openImageInNewTab(image);
        };
    }
    Player.prototype.createButton = function () {
        var buttonContainer = document.createElement('div');
        buttonContainer.className = 'bilibili-player-video-btn bilibili-screenshot';
        buttonContainer.title = 'Screenshot';
        buttonContainer.innerHTML = [
            '<svg viewBox="64 64 896 896" xmlns="http://www.w3.org/2000/svg">',
            '<path fill-rule="evenodd"',
            'd="M864 260H728l-32.4-90.8a32.07 32.07 0 0 0-30.2-21.2H358.6c-13.5 0-25.6 8.5-30.1 21.2L296 260H160c-44.2 0-80 35.8-80 80v456c0 44.2 35.8 80 80 80h704c44.2 0 80-35.8 80-80V340c0-44.2-35.8-80-80-80zM512 716c-88.4 0-160-71.6-160-160s71.6-160 160-160 160 71.6 160 160-71.6 160-160 160zm-96-160a96 96 0 1 0 192 0 96 96 0 1 0-192 0z"',
            '></path>',
            '</svg>',
            '<style>',
            this.styles,
            '</style>',
        ].join('');
        buttonContainer.addEventListener('click', this.takeScreenshot);
        return buttonContainer;
    };
    Player.prototype.addButton = function () {
        if (!this.button) {
            this.button = this.createButton();
            this.insertButton(this.button);
        }
        if (isResourceUnderSameDomain(this.video.src)) {
            this.button.classList.remove('disabled');
        }
        else {
            this.button.classList.add('disabled');
        }
        return this;
    };
    Player.prototype.setVideo = function (video) {
        this.video = video;
        return this;
    };
    Player.prototype.pause = function () {
        var videoButton = document.querySelector('.bilibili-player-video-btn-start');
        if (videoButton.classList.contains('video-state-pause'))
            return;
        videoButton.click();
    };
    return Player;
}());
var BangumiPlayer = /** @class */ (function (_super) {
    __extends(BangumiPlayer, _super);
    function BangumiPlayer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.styles = [
            '.bilibili-screenshot { vertical-align: top; text-align:center; }',
            '.bilibili-screenshot svg { height: 100%; width: 50%; fill: #99a2aa; }',
        ].join('');
        return _this;
    }
    BangumiPlayer.prototype.insertButton = function (button) {
        var controls = document.querySelector('.bilibili-player-video-control');
        var anchor = document.querySelector('.bilibili-player-video-btn-volume');
        controls.insertBefore(button, anchor);
    };
    return BangumiPlayer;
}(Player));
var VideoPlayer = /** @class */ (function (_super) {
    __extends(VideoPlayer, _super);
    function VideoPlayer() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.styles = [
            '.bilibili-screenshot { vertical-align: top; text-align:center; }',
            '.bilibili-screenshot svg { height: 100%; width: 50%; fill: #fff; }',
        ].join('');
        return _this;
    }
    VideoPlayer.prototype.insertButton = function (button) {
        var _this = this;
        var controls = document.querySelector('.bilibili-player-video-control-bottom-right');
        if (controls.childNodes.length > 0) {
            controls.insertBefore(button, controls.childNodes[0]);
        }
        else {
            if (this.observer)
                this.observer.disconnect();
            this.observer = new MutationObserver(function (mutations) {
                if (mutations[0].addedNodes.length > 0) {
                    controls.insertBefore(button, controls.childNodes[0]);
                    _this.observer.disconnect();
                    _this.observer = null;
                }
            });
            this.observer.observe(controls, { childList: true, subtree: true });
        }
    };
    return VideoPlayer;
}(Player));
function isVideoElement(element) {
    return element.nodeName === 'VIDEO';
}
var VideoMonitor = /** @class */ (function () {
    function VideoMonitor() {
        var _this = this;
        this.observer = function (mutationsList) {
            for (var _i = 0, mutationsList_1 = mutationsList; _i < mutationsList_1.length; _i++) {
                var mutation = mutationsList_1[_i];
                for (var _a = 0, _b = [].slice.call(mutation.addedNodes); _a < _b.length; _a++) {
                    var added = _b[_a];
                    if (isVideoElement(added) && _this.notify)
                        _this.notify(added);
                }
            }
        };
    }
    VideoMonitor.prototype.subscribe = function (callback) {
        this.notify = callback;
    };
    VideoMonitor.prototype.start = function () {
        var observer = new MutationObserver(this.observer);
        observer.observe(document.body, { childList: true, subtree: true });
        var existing = document.body.querySelector('video');
        if (existing)
            this.notify(existing);
        return function () {
            observer.disconnect();
        };
    };
    return VideoMonitor;
}());
var OtherPage = /** @class */ (function () {
    function OtherPage() {
    }
    OtherPage.prototype.start = function () {
        console.info("Current page is " + location.href + ", bilibili screenshot button will not be added.");
    };
    return OtherPage;
}());
var VideoContainedPage = /** @class */ (function () {
    function VideoContainedPage() {
        var _this = this;
        this.onVideoDetect = function (video) {
            _this.player.setVideo(video).addButton();
        };
    }
    VideoContainedPage.prototype.start = function () {
        var monitor = new VideoMonitor();
        monitor.subscribe(this.onVideoDetect);
        monitor.start();
    };
    return VideoContainedPage;
}());
var BangumiPage = /** @class */ (function (_super) {
    __extends(BangumiPage, _super);
    function BangumiPage() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.player = new BangumiPlayer();
        return _this;
    }
    return BangumiPage;
}(VideoContainedPage));
var VideoPage = /** @class */ (function (_super) {
    __extends(VideoPage, _super);
    function VideoPage() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.player = new VideoPlayer();
        return _this;
    }
    return VideoPage;
}(VideoContainedPage));
function pageFactory() {
    var href = location.href;
    if (/bilibili\.com\/bangumi\/play\//.test(href)) {
        return new BangumiPage();
    }
    else if (/bilibili\.com\/video\//.test(href)) {
        return new VideoPage();
    }
    return new OtherPage();
}
try {
    var page = pageFactory();
    page.start();
}
catch (e) {
    console.error("[ERROR]: " + e + "\nIf you think it's a bug, you can create an issue on GitHub. A pull request is more than welcome.");
}
