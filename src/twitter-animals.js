const Twit = require('twit');
const TrackedAccounts = ['1340528688509554689','1134099263674359808','1338608158105886728','1426214565776224258','1426214565776224258','1315345422123180033','802480365386526720','1290041799210393603','1428150027558559751'];

var T = new Twit({
    consumer_key: '',
    consumer_secret: '',
    access_token: '',
    access_token_secret: '',
})

var Filters = false;
var console_mode = true;

global.seguidos = 0;
global.ids_seguidos = [];

var T_Followers = 0;
var T_Follows = 0;
var dif_Followers = 0;

var like_interval;
var follow_interval;
var unfollow_interval;
var stats_interval;

var delay_unfollow = 1000*60*5;
var delay_like = 1000*60*2;

var unfollow_time =  1000*60*60;
var follow_time = 1000*60*60;
var like_time = 1000*60*60;
var stats_time = 1000*60*5;
var ftf_ratio = 15;

var number_follow = 3; // 3*3 = 9 follows
var number_crossfollow = 6;
var number_unfollow = 10;

global.LastUsers = [];
global.LastTweets = [];
global.followers = [];
global.following = [];
global.not_following_back = [];
global.last_tweet = 0;

function array_to_trackable() {
    var tracking = ''
    for (i=0;i<TrackedAccounts.length-1;i++) {
        tracking += TrackedAccounts[i].toString() + ', '
    }
    tracking += TrackedAccounts[TrackedAccounts.length-1].toString()
    return tracking;
}

function deleteTweet() {
    var del = document.getElementById("delete_tweet").value
    if (del != "") {
        T.post('statuses/unretweet/:id', { id: del }, function(err) {
            if (err && console_mode == true) return logThis("ERROR: ERROR: Se intentó borrar un tweet no publicado.\n")
            document.getElementById("delete_tweet").value = ""
        })
    }
}

function logThis(message) {
  if (typeof message === 'object') {
    message = message.stack || objToString(message);
  }
  document.getElementById('logger').insertAdjacentHTML('beforebegin', message + '<br>');
  var elem = document.getElementById('logWindow');
  elem.scrollTop = elem.scrollHeight;
}

function get_stats() {
    T.get('users/show', {user_id: "1428150027558559751"}, function(err, reply) {
        if (err && console_mode == true) return logThis("ERROR en users/show\n");
        T_Followers = reply.followers_count
        T_Follows = reply.friends_count
    })
    setTimeout(function(){
        var friendtofollow = ((T_Followers/T_Follows)*100).toFixed(2) + "%" + '\n'
        var processup = format(process.uptime(), 1) + '\n'
    
        document.getElementById("followers").innerHTML = T_Followers;
        document.getElementById("following").innerHTML = T_Follows;
        document.getElementById("friendtofollow").innerHTML = friendtofollow;
        document.getElementById("processup").innerHTML = processup;
    }, 1500);
}

const logstats = document.getElementById("logstats")
    logstats.onclick = function() {
        d = new Date();
        datestring = ("0" + d.getDate()).slice(-2) + "-" + ("0"+(d.getMonth()+1)).slice(-2) + "-" + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
        logThis("————————————————————————————\n")
        logThis("[" + datestring + "]" + '\n')
        logThis("————————————————————————————\n")
        logThis("   Total followers: " + T_Followers + '\n')
        logThis("   Total follows: " + T_Follows + '\n')
        logThis("   Friend-to-follower ratio: " + ((T_Followers/T_Follows)*100).toFixed(2) + "%" + '\n')
        logThis("   Process uptime: " + format(process.uptime(), 1) + '\n')
        logThis("————————————————————————————\n")
    }

const update = document.getElementById("update");
    update.onclick = function() {
        get_stats();
    }

const debug_html = document.getElementById("debug");
    debug_html.onclick = function() {
        if (console_mode == true) {
            console_mode = false
            logThis('Debug OFF.\n');
        } else {
            console_mode = true
            logThis('Debug ON.\n');
        }
    }

    // CROSS-FOLLOW

function randIndex (arr) {
  var index = Math.floor(arr.length*Math.random());
  return arr[index];
};

function cross_follow() {
    T.get('friends/ids', {user_id: "1428150027558559751", stringify_ids: true}, function (err, reply) {
        if (err && console_mode == true) return logThis("ERROR en: friends/ids\n");
        following = reply.ids.slice();
    })

    T.get('followers/ids', {user_id: "1430475432239976451", count: 10, stringify_ids: true}, function(err, reply) {
        if (err && console_mode == true) return logThis("ERROR en: followers/ids\n")
        for (let i=0;i<number_crossfollow;i++) {
            LastUsers[i] = randIndex(reply.ids)
            if (!(following.includes(LastUsers[i]))) {
                T.post('friendships/create', {user_id: LastUsers[i]}, function(err, reply) {
                    if (err && console_mode == true) return logThis("ERROR en: friendships/create\n")
                    ids_seguidos.push(" " + LastUsers[i].toString());
                    seguidos++;
                    T.post('mutes/users/create', {user_id: LastUsers[i]})
                })
            }
        }
        setTimeout(function(){
            logThis("(CROSS-FOLLOW)" + ' Se han seguido un total de ' + seguidos + " cuentas nuevas, con IDs: " + ids_seguidos + '\n');
            ids_seguidos = []
            seguidos = 0;
        }, 5000);
    })
}

    // INTERACT

function like() {
    T.get('friends/ids', {user_id: "1428150027558559751", count: 9, stringify_ids: true}, function(err, reply) {
        if (err && console_mode == true) return logThis("ERROR en: friends/ids\n");
        for (let i=0;i<9;i++) {
            LastUsers[i] = reply.ids[i]
            T.get('statuses/user_timeline', {user_id: LastUsers[i], count: 1, exclude_replies: true}, function(err, data) {
                if (err && console_mode == true) return logThis("ERROR en: statuses/user_timeline\n")
                T.post('favorites/create', {id: data[0].id_str}, function (err) {
                    if (err && console_mode == true) return logThis("ERROR en: favorites/create\n")
                })
            })
        }
    })
    setTimeout(function(){
        logThis("(❤)" + " Se ha dado me gusta al último tweet de los usuarios que sigues.\n")
    }, 5000);
}

    // FOLLOW

// TSE: Three Smallest Elements

function tse(array) {
    var first = Number.MAX_VALUE;
    var second = Number.MAX_VALUE;
    var third = Number.MAX_VALUE;

    for (let i=1;i<array.length;i+=2) {
        let current = array[i];
        if (first>current) {
            third = second;
            second = first;
            first = current;
        } else if(second>current){
            third=second;
            second=current;
        } else if(third>current){
            third=current;
        }
    }
    let array_fin = [array.indexOf(first)-1, array.indexOf(second)-1, array.indexOf(third)-1];
    return array_fin;
}

function curated_follow() {
    T.get('friends/ids', {user_id: "1428150027558559751", stringify_ids: true}, function (err, reply) {
        if (err && console_mode == true) return logThis("ERROR en: friends/ids\n");
        following = reply.ids.slice();
    })

    // Obtenemos los últimos tweets y las cuentas que le han dado retweet, y seguimos a los usuarios.
    T.get('statuses/user_timeline', {user_id: "1428150027558559751", count: number_follow}, function(err, reply) {
        if (err && console_mode == true) return logThis("ERROR en: statuses/user_timeline\n")
        for (let i=0;i<3;i++) {
            LastTweets[i] = reply[i].retweeted_status.id_str;
        T.get('statuses/retweets', {id: LastTweets[i]}, function(err, data) {
            if (err && console_mode == true) return logThis("ERROR en: statuses/retweets\n")
            let array_min = []
            var num_rts;
            if (reply[i].retweeted_status.retweet_count > 100) {
                num_rts = 100;
            } else {
                num_rts = reply[i].retweeted_status.retweet_count
            }
            for (let j=1;j<num_rts;j++) {
                if (typeof data[j] !== 'undefined' && !(following.includes(data[j].user.id_str))) {
                    array_min.push(data[j].user.id_str)
                    array_min.push((data[j].user.followers_count/data[j].user.friends_count));
                }
            }
            let array_fin = tse(array_min)
            for (let j=0;j<array_min.length;j+=2) {
                if (array_fin.includes(j)) {
                    T.post('friendships/create', {user_id: array_min[j]}, function(err) {
                        if (err && console_mode == true) return logThis("ERROR en: 'friendships/create\n"); else {
                            ids_seguidos.push(" " + array_min[j].toString());
                            seguidos++;
                            T.post('mutes/users/create', {user_id: array_min[j]})
                        }
                    })
                }
            }
        })
        }
        setTimeout(function(){
            logThis("(!)" + ' Se han seguido un total de ' + seguidos + " cuentas nuevas, con IDs: " + ids_seguidos + '\n');
            ids_seguidos = []
            seguidos = 0;
        }, 5000);
    })
}

    // UNFOLLOW

function partial_unfollow() {
    // Siguiendo
    T.get('friends/ids', {user_id: "1428150027558559751", stringify_ids: true}, function (err, reply) {
        if (err && console_mode == true) return logThis("ERROR en: friends/ids\n");
        following = reply.ids.slice();

        // Seguidores
        T.get('followers/ids', {user_id: "1428150027558559751", stringify_ids: true}, function (err, reply) {
            if (err && console_mode == true) return logThis("ERROR en followers/ids\n");
            followers = reply.ids.slice();

            not_following_back = following.filter(x => !followers.includes(x));

            for (let i=not_following_back.length-1;i>(not_following_back.length-number_unfollow);i--) {
                if (((T_Followers/T_Follows)*100)<ftf_ratio) {
                    T.post('friendships/destroy', {user_id: not_following_back[i]});
                    ids_seguidos.push(" " + not_following_back[i].toString());
                    seguidos++;
                }
            }
        })
        setTimeout(function(){
            logThis("(✘)" + ' Se han dejado de seguir a un total de ' + seguidos + " cuentas, con IDs: " + ids_seguidos + '\n');
            ids_seguidos = []
            seguidos = 0;
        }, 5000);
    })
}

    // STATS

function stats() {
    dif_Followers = T_Followers;
    
    T.get('users/show', {user_id: "1428150027558559751"}, function(err, reply) {
        if (err && console_mode == true) return logThis("ERROR en users/show\n");
        T_Followers = reply.followers_count
        T_Follows = reply.friends_count
    })
        var friendtofollow = ((T_Followers/T_Follows)*100).toFixed(2) + "%" + '\n'
        var processup = format(process.uptime(), 1) + '\n'
        document.getElementById("followers").innerHTML = T_Followers;
        document.getElementById("following").innerHTML = T_Follows;
        document.getElementById("friendtofollow").innerHTML = friendtofollow;
        document.getElementById("processup").innerHTML = processup;
    
    setTimeout(function(){
        dif_Followers = T_Followers - dif_Followers;
        if (dif_Followers > 0) {
            logThis("————————————————————————————\n")
            logThis("Ha habido " + dif_Followers + " seguidores en los últimos 5 minutos.\n")
            logThis("Número total de seguidores: " + T_Followers + " (" + "+" + dif_Followers + ")" + '\n')
            logThis("————————————————————————————\n")
        } else if (dif_Followers < 0) {
            logThis("————————————————————————————\n")
            logThis("Ha habido " + dif_Followers + " unfollows en los últimos 5 minutos.\n")
            logThis("Número total de seguidores: " + T_Followers + " (" + "-" + dif_Followers + ")" + '\n')
            logThis("————————————————————————————\n")
        }
    }, 5000);
}

function format(seconds, mode){
    function pad(s){
      return (s < 10 ? '0' : '') + s;
    }
    var hours = Math.floor(seconds / (60*60));
    var minutes = Math.floor(seconds % (60*60) / 60);
    var seconds = Math.floor(seconds % 60);

    if(mode == 1) {
        return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
    } else if(mode == 2) {
        return pad(minutes) + ':' + pad(seconds);
    } else {
        logThis("ERROR: Parámetros incorrectos en la función format.\n")
    }
}

    // AUTOMATED

function set_loop(modo, follow_time, unfollow_time, like_time, stats_time, ftf_ratio) {
    clearInterval(stats_interval);
    clearInterval(like_interval);
    clearInterval(unfollow_interval);
    clearInterval(follow_interval);
    
    stats_interval = setInterval(stats, stats_time)
    if (modo == "standard") {
        follow_interval = setInterval(curated_follow, follow_time);
        setTimeout(function(){
            like_interval = setInterval(like, like_time)
        }, delay_like);
        setTimeout(function(){
            unfollow_interval = setInterval(function(){
                if (((T_Followers/T_Follows)*100)<ftf_ratio) {
                    partial_unfollow()
                }
            }, unfollow_time)
        }, delay_unfollow);
    } else if (modo == "purge") {
        unfollow_interval = setInterval(function(){
            if (((T_Followers/T_Follows)*100)<ftf_ratio) {
                partial_unfollow()
            }
        }, unfollow_time)
    } else if (modo == "follow") {
        follow_interval = setInterval(curated_follow, follow_time);
        setTimeout(function(){
            like_interval = setInterval(like, like_time)
        }, delay_like);
    } else if (modo == "post") {
    }
}

set_loop("standard", follow_time, unfollow_time, like_time, stats_time, ftf_ratio);

    // STREAM

var stream = T.stream('statuses/filter', { follow: array_to_trackable() });
stream.on('tweet', function (tweet) {

    // POST TWEETS

    if (TrackedAccounts.indexOf(tweet.user.id_str) !== -1) {
        var StringToCheck = tweet.text
        var StringToCheck_pos = StringToCheck.indexOf('https')
        if ((StringToCheck_pos < -1 || Filters == false) && tweet.user.id_str != "1428150027558559751" && tweet.in_reply_to_status_id == null) {
            if (tweet.retweeted == false) {
                T.post('statuses/retweet/:id', { id: tweet.id_str }, function(err) {
                    if (err && console_mode == true) return logThis("ERROR: Se intentó retuitear un tweet publicado anteriormente.\n")
                    T.get('statuses/user_timeline', {user_id: "1428150027558559751", count: 1, exclude_replies: true}, function(err, reply) {
                        last_tweet = reply[0].id_str
                        document.getElementById("link").setAttribute("href","https://twitter.com/DailyCutePic/status/"+last_tweet);
                        logThis('————————————————————————————' + '<br>' + '\n' + 'Tweet posteado' + '<br>' + '\n' + 'Autor:' + ' ' + tweet.user.screen_name + '<br>' + '\n' + 'Fecha:' + ' '  + tweet.created_at + '<br>' + '\n' + 'Contenido:' + ' ' + tweet.text+ '<br>' + "\nID del último tweet: " + last_tweet + '\n————————————————————————————')
                    })
                })
            } else ('Se detectó un tweet que ya había sido retuiteado anteriormente')
        } //else logThis('Se detecto un tweet invalido y no se posteo')
    }
});

stream.on('warning', function (item) { logThis('WARNING: ' + item + '\n'); });
stream.on('disconnect', function (item) { logThis('Stream disconnected.' + '\n'); });
stream.on('connect', function (item) { logThis('Stream connected.' + ' (' + 'twitter-animals.js' + ')' + '\n'); });
stream.on('reconnect', function (item) { logThis('Stream reconnected.' + '\n'); });


