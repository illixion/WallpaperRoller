var nextUpdate;

// Failsafes for cases where Xen decides to ignore default options :/
var interval = typeof interval === 'undefined' ? 15 : interval;
var sensitivity = !(parseInt(sensitivity) > 0) ? 40 : parseInt(sensitivity);
var useOnline = typeof useOnline === 'undefined' ? false : useOnline;
var checkURL = typeof checkURL === 'undefined' ? '' : checkURL;
var remoteURL = typeof remoteURL === 'undefined' ? 'https://cors-anywhere.herokuapp.com/e621.net/posts.json?tags=id:1229885&limit=1' : remoteURL;
var blacklist = typeof blacklist === 'undefined' ? '' : blacklist;

var preventDoubleChange = false; // used for shaking compensation
var elToUpdate = "bg" // Determines which image to show as we load 2 images at once

var x1 = 0,
  y1 = 0,
  z1 = 0,
  x2 = 0,
  y2 = 0,
  z2 = 0;

window.onload = function () {
  if (!checkURL) {
    this.changeAutoWallpaper(true)
  } else {
    this.changeLocalWallpaper(true); // Xen HTML settings pane really likes to reload widgets
  }
  nextUpdate = addMinutes(new this.Date(), interval);
};

window.onresume = function () {
  if (new this.Date() > nextUpdate) {
    this.changeAutoWallpaper();
    nextUpdate = addMinutes(new this.Date(), interval);
  }
};

// Shake the device to change wallpaper
window.addEventListener(
  'devicemotion',
  function (e) {
    x1 = e.accelerationIncludingGravity.x;
    y1 = e.accelerationIncludingGravity.y;
    z1 = e.accelerationIncludingGravity.z;
  },
  false
);

setInterval(function () {
  var change = Math.abs(x1 - x2 + y1 - y2 + z1 - z2);

  if (change > sensitivity) {
    if (preventDoubleChange) {
      preventDoubleChange = false;
    } else {
      changeAutoWallpaper();
      preventDoubleChange = true;
    }
  }

  // Update new position
  x2 = x1;
  y2 = y1;
  z2 = z1;
}, 250);

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function connectWebSocket(url, timeout) {
  timeout = timeout || 250;
  return new Promise(function (resolve, reject) {
    // Create WebSocket connection.
    const socket = new WebSocket(url);

    const timer = setTimeout(function () {
      reject(new Error('timeOut'));
      done();
      socket.close();
    }, timeout);

    function done() {
      // cleanup all state here
      clearTimeout(timer);
      socket.removeEventListener('error', error);
    }

    function error(e) {
      reject(e);
      done();
    }

    socket.addEventListener('open', function () {
      resolve(socket);
      done();
    });
    socket.addEventListener('error', error);
  });
}

// Function to change the wallpaper depending on current condition type
function changeAutoWallpaper(bothSlots = false) {
  if (!useOnline) { changeLocalWallpaper(bothSlots); return; }
  if (!checkURL) { changeOnlineWallpaper(bothSlots); return; }

  // This checks if we're on WiFi or on cellular by connecting to a LAN HTTP server
  // like a router or any other device, and if we get a connection error 
  // (since it's websockets and not standard HTTP), we're on WiFi. Timeout: cellular
  try {
    connectWebSocket(`ws://{checkURL}`, 250).catch(function (err) {
      console.log(err);
      if (err == 'Error: timeOut') {
        changeLocalWallpaper(bothSlots);
      } else {
        changeOnlineWallpaper(bothSlots);
      }
    });
  } catch (timeOut) {
    changeOnlineWallpaper(bothSlots);
  }
}

// This is the online component, should be compatible with most modern Danbooru APIs
// Cors-anywhere can be used as XenHTML has no CORS proxy yet
function changeOnlineWallpaper(bothSlots) {
  flipFlop();

  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'JSWallpaper/1.0 (Manual on e621)',
  });

  fetch(remoteURL, {
    method: 'GET',
    mode: 'cors',
    headers: headers,
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (posts) {
      const good_posts = posts['posts'].filter((post) => {
        const post_tags = Object.values(post['tags']).flat();
        return post_tags.every((tag) => {
          return !blacklist.split(',').includes(tag);
        });
      });

      if (bothSlots) {
        document.getElementById("bg").src =
        good_posts[Math.floor(Math.random() * good_posts.length)]['file'][
          'url'
        ];
        document.getElementById("bg2").src =
        good_posts[Math.floor(Math.random() * good_posts.length)]['file'][
          'url'
        ];
      } else {
      document.getElementById(elToUpdate).src =
        good_posts[Math.floor(Math.random() * good_posts.length)]['file'][
          'url'
        ];}
    });
}

function changeLocalWallpaper(bothSlots) {
  flipFlop();

  // This is where the image list will be generated upon WallpaperRoller (re)installation.
  // Put files into /var/mobile/Library/WR_Pictures
  const imageList = ["wr_welcome.jpg",]

  if (bothSlots) {
    const selectBG = imageList[Math.floor(Math.random() * imageList.length)];
    document.getElementById("bg").src = 'images/' + selectBG;
    const selectBG2 = imageList[Math.floor(Math.random() * imageList.length)];
    document.getElementById("bg2").src = 'images/' + selectBG2;
  } else {
    const selectBG = imageList[Math.floor(Math.random() * imageList.length)];
    document.getElementById(elToUpdate).src = 'images/' + selectBG;
  }
}

// Switch the current image element to the hidden, pre-loaded next image
function flipFlop() {
  if (document.getElementById('bg').classList.length > 0) {
    document.getElementById('bg2').classList = ['active'];
    document.getElementById('bg').classList = [];
    elToUpdate = "bg"
  } else {
    document.getElementById('bg').classList = ['active'];
    document.getElementById('bg2').classList = [];
    elToUpdate = "bg2"
  }
  
  return elToUpdate
}
