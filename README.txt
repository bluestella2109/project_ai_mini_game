PROJECT AI ミニゲーム

構成
index.html = 管理者 / ゲーム選択
 game.html = 4ミッション
 admin.html = リアルタイム管理画面
 css/style.css = 共通デザイン
 js/firebase.js = Firebase設定
 js/core-ui.js = 背景・時計
 js/game.js = ゲーム本体
 js/admin.js = 管理画面

Firebase設定
js/firebase.js の YOUR_... を、既存PROJECT AIのFirebase Webアプリ設定に置き換えてください。
Firestore collection: gameSessions
ドキュメントID: iPad-01 ～ iPad-10（記号を除いたID）

ゲームの順番
1 SYSTEM REBOOT
2 FIREWALL BREAKER
3 NEURAL REFLEX
4 MEMORY CORE

成功・失敗どちらでも次へ進みます。4つ終了後にAI TAKEOVER画面を表示し、RETURN TO TERMINALで端末選択へ戻ります。
管理画面では端末、現在のミッション、進行、利用開始からの経過待機時間、最終通信をリアルタイム表示します。
