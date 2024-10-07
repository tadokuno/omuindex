import 'dotenv/config';  // .envファイルから環境変数を読み込む

import readline from 'readline';
import keypress from 'keypress';

import { getOmuIndex } from './placesApi.js';

// キーボード入力を設定
keypress(process.stdin);
process.stdin.setRawMode(true);
process.stdin.resume();

// キーボード入力を待つ関数
function waitForKeyPress() {
    return new Promise((resolve, reject) => {
        process.stdin.once('keypress', (ch, key) => {
            if (key && key.name === 'escape') {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                reject('エスケープキーが押されたため、処理を終了します。');
            } else {
                resolve();
            }
        });
    });
}

// コマンドライン引数から駅名を取得
const stationName = process.argv[2];

if (!stationName) {
    console.error('駅名を指定してください。');
    process.exit(1);
}

// メイン処理
(async () => {
    try {
	const result = await getOmuIndex(stationName);

console.log(result);
	if( result ) {
            const replyMessage = {
                type: 'text',
                text: `${result.stationName}駅周辺500m以内にある喫茶店の数: ${result.cafeCount}件\n ${result.stationName}駅周辺500m以内にある町中華の数: ${result.chineseRestaurantCount}件\n ${result.stationName}駅のオムライスインデックス: ${result.omuIndex}\n${result.cafeMessage}`
            };
            console.log(replyMessage);
            console.log(replyMessage.text);
        }
    } catch (error) {
        console.error('Error fetching Omu Index:', error);
    } finally {
	process.stdin.setRawMode(false);  // stdinのrawモードを解除
        process.stdin.pause();  // stdinを閉じる
    }
})();

