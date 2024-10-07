import { getOmuIndex } from './placesApi.js';
import { calculateOmuIndex } from './openaiApi.js';

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

function roundCount(count) {
  return Math.floor(count>20?10:count/2);
}

export async function omuIndexMain(stationName) {
  try {
    let point = 0;
    let messages='';

    const openaiPromise = calculateOmuIndex(stationName); // openai API 時間かかる

    const result = await getOmuIndexCountable(stationName); // Places API

    if( result ) {
      const localCafeIndex = roundCount(result.localCafe.count);
      const chineseRestaurantIndex = roundCount(result.chineseRestaurant.count);
      const westernRestaurantIndex = roundCount(result.westernRestaurantCount.count);
      const snackIndex = roundCount(result.snack.count);
      messages = `喫茶店の数: ${result.localCafe.count}件\n`;
      messages += `町中華の数: ${result.chineseRestaurant.count}件\n`;
      messages += `洋食屋の数: ${result.westernRestaurantCount.count}\n`;
      messages += `スナックの数: ${result.snack.count}\n`;
      point = localCafeIndex + chineseRestaurantIndex + westernRestaurantIndex + snackIndex;
    }

    const result2 = await openaiPromise;

    for (let key in result2 ) {
      const data = result2[key];
      point += data.index;
//      messages += `${key} - 得点: ${data.index}, 根拠: ${data.text}\n`;
      messages += `${data.index}: ${data.text}\n`;
    }
    messages += '\n' + result.cafeMessage + '\n';
    messages += result.chineseRestaurantMessage + '\n';
    return `${stationName}のオムライス指数: ${point}\n\n${messages}`;
  } catch (error) {
    console.error('Error fetching Omu Index:', error);
    return "エラー";
  }
}

// コマンドライン引数から駅名を取得

console.log("omuIndexMain Start")
const stationName = process.argv[2];

if (!stationName) {
    console.error('駅名を指定してください。');
    process.exit(1);
}

// メイン処理
(async () => {
  try {
    const result = await omuIndexMain(stationName); // 戻り値は表示する文字列
    console.log(result);
  } catch (error) {
      console.error('Error fetching Omu Index:', error);
  } finally {
    process.stdin.setRawMode(false);  // stdinのrawモードを解除
    process.stdin.pause();  // stdinを閉じる
  }
})();
