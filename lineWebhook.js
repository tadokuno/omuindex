import * as line from '@line/bot-sdk';
import { omuIndexMain } from './script.js';

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

export async function handler(event, context) {
  const body = JSON.parse(event.body);

  const promises = body.events.map(async (singleEvent) => {
    if (singleEvent.type === 'message' && singleEvent.message.type === 'text') {
      const stationName = singleEvent.message.text;
      try {
        fetch('https://api.line.me/v2/bot/chat/loading/start', {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${config.channelAccessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({"chatId": singleEvent.source?.userId})
        })
      } catch {
        console.log("Loading Animation Error");
      }

      try {
        const result = await omuIndexMain(stationName);
	      const replyMessage = {
          type: 'text',
	        text: `${result}`
	      };
       	await client.replyMessage(singleEvent.replyToken, replyMessage);
      } catch (error) {
        console.error('Error fetching Omu Index:', error);
        const errorMessage = {
          type: 'text',
          text: 'オムライスインデックスの取得中にエラーが発生しました。'
        };
        await client.replyMessage(singleEvent.replyToken, errorMessage);
      }
    }
  });

  await Promise.all(promises);

  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'success' }),
  };
}

