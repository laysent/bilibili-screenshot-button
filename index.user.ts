// ==UserScript==
// @name        Bilibili Screenshot Button
// @author      LaySent
// @version     1.0.4
// @description Add a button that lets you take screenshot of current video on bilibili.
// @homepage    https://github.com/laysent/bilibili-screenshot-button
// @match       https://www.bilibili.com/*
// @downloadURL https://github.com/laysent/bilibili-screenshot-button/raw/master/index.user.js
// @updateURL   https://github.com/laysent/bilibili-screenshot-button/raw/master/index.user.js
// @supportURL  https://github.com/laysent/bilibili-screenshot-button/issues
// @run-at      document-end
// @license     MIT License
// ==/UserScript==

function createScreenshotFromVideo (video: HTMLVideoElement) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  return new Promise(function (resolve, reject) {
    function callback() {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, 1, 1);
        if (data.every(pixel => pixel === 0)) {
          requestAnimationFrame(callback);
        } else {
          resolve(canvas.toDataURL('image/png'));
        }
      }
      catch (e) {
        reject(e);
      }
    }
    requestAnimationFrame(callback);
  });
}

function openImageInNewTab (dataURI) {
  const html = `<html><body><img src="${dataURI}"/></body></html>`;
  const newTab = window.open('', `tab-${Date.now()}`);

  newTab.document.open();
  newTab.document.write(html);
  newTab.document.close();
}

function isResourceUnderSameDomain(url) {
  if (url.indexOf('blob:') === 0) return true;
  if ((new URL(url)).host === location.host) return true;
  return false;  
}

abstract class Player {
  video: HTMLVideoElement;
  button: HTMLDivElement;
  abstract styles: string;
  abstract insertButton(button: HTMLDivElement): void;
  takeScreenshot = () => {
    if (!this.video) return;
    if (this.button.classList.contains('disabled')) return;
    this.pause();
    createScreenshotFromVideo(this.video).then((image) => {
      openImageInNewTab(image);
    });
  }
  createButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'bilibili-player-video-btn bilibili-screenshot';
    buttonContainer.title = 'Screenshot';
    buttonContainer.innerHTML = [
      '<span class="bp-svgicon">',
        '<svg viewBox="64 64 896 896" xmlns="http://www.w3.org/2000/svg">',
          '<path fill-rule="evenodd"',
            'd="M864 260H728l-32.4-90.8a32.07 32.07 0 0 0-30.2-21.2H358.6c-13.5 0-25.6 8.5-30.1 21.2L296 260H160c-44.2 0-80 35.8-80 80v456c0 44.2 35.8 80 80 80h704c44.2 0 80-35.8 80-80V340c0-44.2-35.8-80-80-80zM512 716c-88.4 0-160-71.6-160-160s71.6-160 160-160 160 71.6 160 160-71.6 160-160 160zm-96-160a96 96 0 1 0 192 0 96 96 0 1 0-192 0z"',
          '></path>',
        '</svg>',
      '</span>',
      '<style>',
        this.styles,
      '</style>',
    ].join('');
    buttonContainer.addEventListener('click', this.takeScreenshot);
    return buttonContainer;
  }
  addButton() {
    if (!this.button || !document.body.contains(this.button)) {
      this.button = this.createButton();
      this.insertButton(this.button);
    }
    if (isResourceUnderSameDomain(this.video.src)) {
      this.button.classList.remove('disabled');
    } else {
      this.button.classList.add('disabled');
    }
    return this;
  }
  setVideo(video) {
    this.video = video;
    return this;
  }
  pause() {
    const videoButton: HTMLDivElement = document.querySelector('.bilibili-player-video-btn-start');
    if (videoButton.classList.contains('video-state-pause')) return;
    videoButton.click();
  }
}

class BangumiPlayer extends Player {
  styles = [
    '.bilibili-screenshot { vertical-align: top; text-align:center; }',
    '.bilibili-screenshot svg { height: 100%; width: 50%; fill: #99a2aa; }',
  ].join('');
  insertButton(button) {
    const controls = document.querySelector('.bilibili-player-video-control');
    const anchor = document.querySelector('.bilibili-player-video-btn-volume');
    controls.insertBefore(button, anchor);
  }

}

class VideoPlayer extends Player {
  observer: MutationObserver;
  styles = [
    '.bilibili-screenshot { vertical-align: top; text-align:center; }',
    '.bilibili-screenshot svg { height: 100%; width: 50%; fill: #fff; }',
  ].join('');
  insertButton(button) {
    const controls = document.querySelector('.bilibili-player-video-control-bottom-right');
    if (controls.childNodes.length > 0) {
      controls.insertBefore(button, controls.childNodes[0]);
    } else {
      if (this.observer) this.observer.disconnect();
      this.observer = new MutationObserver((mutations) => {
        if (mutations[0].addedNodes.length > 0) {
          controls.insertBefore(button, controls.childNodes[0]);
          this.observer.disconnect();
          this.observer = null;
        }
      });
      this.observer.observe(controls, { childList: true, subtree: true });
    }
  }
}

function isVideoElement(element: Node): element is HTMLVideoElement {
  return element.nodeName === 'VIDEO';
}

class VideoMonitor {
  notify: (video: HTMLVideoElement) => void;
  subscribe(callback: (video: HTMLVideoElement) => void) {
    this.notify = callback;
  }
  start() {
    const observer = new MutationObserver(this.observer);
    observer.observe(document.body, { childList: true, subtree: true });

    const existing = document.body.querySelector('video');
    if (existing) this.notify(existing);

    return () => {
      observer.disconnect();
    };
  }
  observer = (mutationsList: MutationRecord[]) => {
    for (const mutation of mutationsList) {
      for (const added of <Array<Node>>[].slice.call(mutation.addedNodes)) {
        if (isVideoElement(added) && this.notify) this.notify(added);
      }
    }
  }
}

interface Page {
  start(): void;
}

class OtherPage implements Page {
  start() {
    console.info(`Current page is ${location.href}, bilibili screenshot button will not be added.`);
  }
}

abstract class VideoContainedPage implements Page {
  abstract player: Player;
  onVideoDetect = (video: HTMLVideoElement) => {
    this.player.setVideo(video).addButton();
  }
  start() {
    const monitor = new VideoMonitor();
    monitor.subscribe(this.onVideoDetect);
    monitor.start();
  }
}

class BangumiPage extends VideoContainedPage {
  player = new BangumiPlayer();
}

class VideoPage extends VideoContainedPage {
  player = new VideoPlayer();
}

function pageFactory(): Page {
  const href = location.href;
  if (/bilibili\.com\/bangumi\/play\//.test(href)) {
    return new VideoPage();
  } else if (/bilibili\.com\/video\//.test(href)) {
    return new VideoPage();
  }
  return new OtherPage();
}

try {
  const page = pageFactory();
  page.start();
} catch (e) {
  console.error(`[ERROR]: ${e}\nIf you think it's a bug, you can create an issue on GitHub. A pull request is more than welcome.`);
}
