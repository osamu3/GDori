//GDori
const express = require('express');

// socket.ioの定義 KnwHw
// ///////↓ cf:https://qiita.com/kanjishima/items/5342eca62e8d5de30ccb  ↓//////////////////////////
  // １．サーバーインスタンス作成
const app = express();
// var server = require('http').createServer(app);
const http = require('http');
const server = http.Server(app); 
  // ２．ソケットIOと紐づけ
  //var io = require('socket.io');
  //io.listen(server);
const io = require('socket.io')(server);

const path = require('path');
//const fs      = require('fs');
const favicon = require('serve-favicon'); 

const PORT = 8080;
let userId;

app.use(favicon(__dirname + '/public/favicon.ico', { //htmlで、<link rel="shortcut icon" href="favicon.ico">　として利用可能にする。
	maxAge: 2592000000 // キャッシュの有効期限
  }));

// cssやjavascriptやイメージ等の静的ファイルを利用するためのおまじない。//////////////////////
//http://expressjs.com/ja/starter/static-files.htmlより
//express.staticミドルウエア へ静的アセットファイルを格納しているディレクトリを渡す。
app.use(express.static(path.join(__dirname, 'public')));   //←でパス文字無しで"public"に格納されている静的ファイルを利用できる。
//※↑た express.static 関数に指定するパスは、node 起動ディレクトリーからの相対パスであるから、絶対パスで定義する方が安全

//cf: app.use('/static', express.static('public'));//←別名定義例：この定義で、クライアントから、"/public"を"/static" として利用できる。
/////////////////////////////////////////////////////////////////////////////

app.set('view engin', 'ejs');

app.get("/", function (req, res, next) { //"/"へのアクセスで、
	//res.render("index.ejs", {title  : "ここはルート",content : "views/index.ejsを表示しています。"});
	res.render("gdori.ejs", {title  : "ここは自鳥",content : "views/gdori.ejsを表示しています。"});
});

//app.get("/gdori", function (req, res, next) { //gdoriへのアクセスで、
//	res.render("gdori.ejs", {title  : "ここは自鳥",content : "views/gdori.ejsを表示しています。"});
//});

server.listen(PORT,() => console.log('app listening on port '+ PORT));

console.log('Now Ver 0.0. 1  : "コーディング開始" ');

////ソケットIO　関係
io.on('connection', function (socket) {
    console.log('connected!! socket.id=' + socket.id);
    //ブラウザからの着信:[msg]は、'takeAPic''openTheDoor''ContinueToProcess?'の３種類のはず
    socket.on('Bs2Sv', function (msg) {
        console.log('(server.js:L52)：→GetMessage(Bs2Sv【'+msg+'】):Browser→Server');

        if (msg === 'ContinueToProcess?') {//ブラウザからの処理継続要求、(※注！ラズパイは別)
            if (userId != null) { //既に接続が完了している場合、新たな接続は受け付けない
                console.log('    Already Connected! 接続不許可、切断します。')
                io.to(socket.id).emit('Sv2Bs', 'Disconnnect')//着信メッセージの送り主に返信
                io.sockets.connected[socket.id].disconnect();
            } else {
                userId = socket.id;//たった今接続してきたユーザのsocketIdをとる。
                //接続を継続し、写真を撮るを準備せよ。をブロードキャストする。
                console.log('(server.js:L62)：    ←BroadCast(Sv2Bs【ContinueOK】):Browser←Server)');
                io.emit('Sv2Bs', 'ContinueOK');
            }
        }

        if (msg === 'OpenTheDoor') {//ブラウザからの写真撮影準備要求
            console.log('(server.js:L68)：    ←BroadCast(Sv2Pi【OpenTheDoor】):Pi←Server)');
            io.emit('Sv2Pi', msg);//[openTheDoor]を送信：邪魔臭いのでブロードキャスト
            console.log('');
        }

        if (msg === 'TakeAPic') {//ブラウザから写真撮影依頼
            console.log('(server.js:L74)：    ←BroadCast(Sv2Pi【TakeAPic】:Pi←Server)');
            io.emit('Sv2Pi', msg);//[takeAPic]をブロードキャスト送信
            //コマンド送信後5秒後、リセット送信。←本番は15秒？
            setTimeout(function () {
                console.log('(server.js:L78)←BroadCast(Sv2All【Reset】):Pi←Server');
                io.emit('Sv2All', 'Reset');
                console.log('');
            }, 5000);
        }
    });

    //パイからの受信:[msg]は、パイ側でソケットコネクトイベントが発火した旨の通知のはず
    socket.on('Pi2Sv', function (msg) {
        console.log('(server.js:L85)Piメッセージ('+msg+')を転送した方がよいのでは？');
        console.log('');
    });

    //ラズパイからの、FTPアップロード完了のメッセージを受信
    socket.on('Pi2UpLoadPht', function (photUName) {//一意な写真ファイル名
        console.log("(server.js:L42)サーバーログ:ラズパイから画像転送がありました。:" +photUName);
        //サーバーから写真転送完了のお知らせをクライアントへ通知
        io.emit('Sv2FtpPht', photUName);//クライアント側ではリロード
        console.log("(server.js:L45)emit:Sv2FtpPht");
    });

    socket.on("disconnect", function () {
        console.log("[disconnect]イベントが発生:   GET OUT !!   ");
        userId = null; //ブラウザからは、誰も接続していないことにする。※注！ラズパイは別
        console.log("userIdを初期化\n");
    });
});

/* /////////////////////////参考//////////////
    io.sockets.emit("info", "全員に送信")　//送信元含む全員に送信
    io.emit("info", "省略可")　//上と同じ
    socket.broadcast.emit("info", "送信元以外に送信")　//送信元以外の全員に送信
    io.to(socket.id).emit('info', '送信元にだけ')　//特定のユーザーのみ（送信元のみに送信）

/////////////////////////////////////////////;
*/
