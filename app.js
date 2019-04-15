//GDori
const express = require('express');

// socket.ioの定義 KnwHw
// ///////↓ cf:https://qiita.com/kanjishima/items/5342eca62e8d5de30ccb  ↓//////////////////////////
// １．サーバーインスタンス作成
//Httpサーバー（サーバーサービス？）とSocket.io(サーバーサービス？)を立ち上げて、夫々を待ち受け状態にする。
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
let  browserId = '';
let piId = '';
const cnctReqByCameraStr = 'Kamera_Karano_SetuzokukyokaIrai';

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
	res.render("gdori.ejs", { title: "自撮り", content: "遠隔カメラでリモート撮影" });
});

//app.get("/gdori", function (req, res, next) { //gdoriへのアクセスで、
//	res.render("gdori.ejs", {title  : "ここは自鳥",content : "views/gdori.ejsを表示しています。"});
//});

server.listen(PORT, () => console.log('app listening on port ' + PORT));

console.log('Now Ver 0.２. 1  : "ラズパイ接続手続き(ラズパイオンリー1台のみ)" ');

////ソケットIO　関係
io.on('connection', function (socket) {
	console.log('connected!! socket.id=' + socket.id);

	//カメラからの接続要求
	socket.on('C->S:PleaseAllowConnection', (msg, piSideFnc) => {//コネクション接続継続要求なら
		console.log('(app.js:L60)：C→S: [PleaseAllowConnection]←');
		console.log('                    ' + msg + '←');
		if (cnctReqByCameraStr == msg) {//『Kamera_Karano_SetuzokukyokaIrai』なら
			if (piId == '') {//最初の接続なら
				piId = socket.id;
				console.log('(app.js:L65)：       RES: [OK! Allowed.]→');
				piSideFnc('OK! Allowed.'); //ソケット呼び出し元のファンクションを実行
			} else {//既に接続済みであるなら
				console.log('(app.js:L68)：    RES:  Already Connected [NO! DisAllowed.]→');
				piSideFnc('NO! DisAllowed.'); //ソケット呼び出し元のファンクションを実行
				console.log('(app.js:L70)：               io.sockets.connected[socket.id].disconnect()');
				io.sockets.connected[socket.id].disconnect();//切断
			}
		} else {//『Kamera_Karano_SetuzokukyokaIrai』でなければ。
			console.log('(app.js:L74)：    RES:  Incorrect RequestStr [DisAllowed!]→');
			piSideFnc('NO! DisAllowed'); //ソケット呼び出し元のファンクションを実行
			console.log('(app.js:L76)：               io.sockets.connected[socket.id].disconnect()');
			io.sockets.connected[socket.id].disconnect();//切断
		}
	});

	//ブラウザからの着信:[msg]は、'takeAPic''openTheDoor''ContinueToProcess?'の３種類のはず
	socket.on('B=>S', (msg, browserSideFnc) => {
		console.log('(app.js:L83)：B→S :[' + msg + ']←');
		if (msg === 'ContinueToProcess?') {//ブラウザからの処理継続要求、(※注！ラズパイは別)
			if ( browserId != '') { //既に接続が完了している場合、新たな接続は受け付けない
				console.log('    Already Connected! 接続不許可、切断します。');
				browserSideFnc('ContinueNG');//ブラウザ側のファンクションの呼び出し
				io.sockets.connected[socket.id].disconnect();//切断
			} else {
				 browserId = socket.id;//たった今接続してきたユーザのsocketIdをとる。
				//接続を継続し、写真を撮るを準備せよ。をブロードキャストする。
				console.log('(app.js:L92)：      RES: [ContinueOK]→');
				browserSideFnc('ContinueOK');//ブラウザ側のファンクションの呼び出し
			}
		}
	});

	socket.on('B=>S->p', (msg)=>{//ブラウザ＝＞サーバへの要求『ドアを開けて』
		if (msg === 'OpenTheDoor') {//ブラウザからの写真撮影準備要求
			console.log('(app.js:L100)：B→S→p: [OpenTheDoor]←');
			if (piId !== '') { //パイがログインしていたら
                console.log('(app.js:L102)：b→S→P: [OpenTheDoor]→');
	    		//io.to(piId).emit('B->S->P', msg, (resp) => {　io.*.emit は、コールバック関数をサポートしていない。
				io.to(piId).emit('b->S=>P', msg); //メッセージの転送なので着信確認用のコールバック関数は使えない。
				console.log('');
			}
		}
		if (msg === 'TakeAPic') {//ブラウザから写真撮影依頼
			console.log('(app.js:L109)：B→S→P:[TakeAPic】←→');
			io.to(piId).emit('b->S=>P', msg);//[takeAPic]をパイへ送信
			//コマンド送信後5秒後、リセット送信。←本番は15秒？
			setTimeout(function () {
				console.log('(app.js:L113)：*｜S→All:[Reset]→');
				io.emit('S->All', 'Reset');
				console.log('');
			}, 15000);
		}
	});

	socket.on('P=>S->b', (msg,piSideFnc) => {//パイ＝＞サーバーへのメッセージ『ドアが開きました』
		console.log('(app.js:L121)：P→S→b:['+msg+']←');
		if (msg == 'TheDoorWasOpened') {
			console.log('(app.js:L123)：p→S→B:['+msg+']→');
			io.to(browserId).emit('p->S=>B', msg);//[TheDoorWasOpened]をブラウザへ送信
			piSideFnc('Server said "I heard that TheDoorWasOpened".');
		}
	});

	//パイからの受信:[msg]は、パイ側でソケットコネクトイベントが発火した旨の通知のはず
	socket.on('Pi2Sv', function (msg) {
		console.log('(server.js:L110)Piメッセージ(' + msg + ')を転送した方がよいのでは？');
		console.log('');
	});

	//ラズパイからの、FTPアップロード完了のメッセージを受信
	socket.on('Pi2UpLoadPht', function (photUName) {//一意な写真ファイル名
		console.log("(server.js:L101)サーバーログ:ラズパイから画像転送がありました。:" + photUName);
		//サーバーから写真転送完了のお知らせをクライアントへ通知
		io.emit('Sv2FtpPht', photUName);//クライアント側ではリロード
		console.log("(server.js:L119)emit:Sv2FtpPht");
	});

	socket.on("disconnect", function () {
		if (socket.id ===  browserId) {
			console.log('[disconnect]イベントが発生(ブラウザー)');
			 browserId = ''; //ブラウザからは、誰も接続していないことにする。
			console.log(' browserIdを初期化\n');
		} else {
			if (socket.id === piId) {
				console.log("[disconnect]イベントが発生(カメラ)");
				piId = ''; //カメラ接続終了
				console.log('caneraIdを初期化\n');
			} else {
				console.log('[disconnect]発生');
			}
		}
	});
});

/* /////////////////////////参考//////////////
	io.sockets.emit("info", "全員に送信")　//送信元含む全員に送信
	io.emit("info", "省略可")　//上と同じ
	socket.broadcast.emit("info", "送信元以外に送信")　//送信元以外の全員に送信
	io.to(socket.id).emit('info', '送信元にだけ')　//特定のユーザーのみ（送信元のみに送信）

/////////////////////////////////////////////;
*/
