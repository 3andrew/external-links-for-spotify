document.addEventListener('DOMContentLoaded', function () {
    dumpSpotifyPlayers();
});

const SPOTIFY_CLIENT_ID = encodeURIComponent('1690670a4d4c44b0a0df4ba24facb1e1');
const RESPONSE_TYPE = encodeURIComponent('token');
const REDIRECT_URI = chrome.identity.getRedirectURL(); 
const SCOPE = encodeURIComponent('user-read-private user-read-email user-read-playback-state');
const SHOW_DIALOG = encodeURIComponent('false');
let STATE = '';
let ACCESS_TOKEN = '';

let user_signed_in = false;

const SPOTIFY_OAUTH2_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_PLAYER_URL = "https://api.spotify.com/v1/me/player";


function create_spotify_endpoint() {
    STATE = encodeURIComponent('meet' + Math.random().toString(36).substring(2, 15));

    let oauth2_url = SPOTIFY_OAUTH2_URL +
    "?client_id=" + SPOTIFY_CLIENT_ID + 
    "&response_type=" + RESPONSE_TYPE +
    "&redirect_uri=" + REDIRECT_URI +
    "&state=" + STATE +
    "&scope=" + SCOPE +
    "&show_dialog=" + SHOW_DIALOG;

    console.log(oauth2_url);

    return oauth2_url;
}

function makeXhrRequest(method, url, token) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token)
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                return resolve(xhr.response);
            } else {
                reject(
                    Error(
                        JSON.stringify(
                            {
                                status: xhr.status,
                                statusTextInElse: xhr.statusText
                            }
                        )
                    )
                )
            }
        }
        xhr.onerror = function () {
            reject(
                Error(
                    JSON.stringify(
                        {
                            status: xhr.status,
                            statusTextInElse: xhr.statusText
                        }
                    )
                )
            )
        }
        xhr.send()
    })
}

function dumpSpotifyPlayers(query) {

    let oauth2_url = create_spotify_endpoint();
    chrome.identity.launchWebAuthFlow({
        url: oauth2_url,
        interactive: true
    },
        function (redirect_url) {
            console.log(redirect_url);
            if (chrome.runtime.lastError) {
                console.log({ message: 'fail' });
            } else {
                if (redirect_url.includes('callback?error=access_denied')) {
                    console.log({ message: 'fail' });
                } else {
                    ACCESS_TOKEN = redirect_url.substring(redirect_url.indexOf('access_token=') + 13);
                    ACCESS_TOKEN = ACCESS_TOKEN.substring(0, ACCESS_TOKEN.indexOf('&'));
                    let state = redirect_url.substring(redirect_url.indexOf('state=') + 6);
                    console.log('ACCESS_TOKEN ' + ACCESS_TOKEN);
                    console.log('state ' + state);
                    chrome.storage.local.set({ 'ACCESS_TOKEN': ACCESS_TOKEN }, function () {
                        console.log('ACCESS_TOKEN is set to ' + ACCESS_TOKEN);
                        chrome.storage.local.get(['ACCESS_TOKEN'], function (result) {
                            console.log('ACCESS_TOKEN currently is ' + result.key);
                        });
                    });

                    let requestUrl = SPOTIFY_PLAYER_URL;
                    let token = ACCESS_TOKEN;
                    makeXhrRequest('GET', requestUrl, token)
                        .then((data) => {
                            data = JSON.parse(data)
                            console.log(data)

                            document.getElementById("album-image").src = data.item.album.images[0].url;
                            document.getElementById('song-name').innerHTML = data.item.album.artists[0].name + " - " + data.item.name;

                            data.item.album.artists[0].namehyphen = data.item.album.artists[0].name.replace(/[^\w\s]/gi, '').replaceAll(' ', '-');
                            data.item.album.artists[0].namehyphen = data.item.album.artists[0].namehyphen.toLowerCase();
                            data.item.namehyphen = data.item.name.replace(/[^\w\s]/gi, '').replaceAll(' ', '-');
                            data.item.namehyphen = data.item.namehyphen.toLowerCase();
                            data.item.album.artists[0].nameplus = data.item.album.artists[0].name.replace(/[^\w\s]/gi, '').replaceAll(' ', '+');

                            data.item.genius = "https://genius.com/"+ data.item.album.artists[0].namehyphen + '-' + data.item.namehyphen + "-lyrics";
                            data.item.rym = "https://rateyourmusic.com/artist/" + data.item.album.artists[0].namehyphen;
                            data.item.lastfm = "https://last.fm/music/" + data.item.album.artists[0].nameplus;

                            document.getElementById('genius-link').href = data.item.genius;
                            document.getElementById('rym-link').href = data.item.rym;
                            document.getElementById('lastfm-link').href = data.item.lastfm;

                            return data
                        })
                        .catch(err => console.log(err))
                }
            }
        });
}