import * as line from '@line/bot-sdk';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 駅の緯度経度を取得する関数
async function getCoordinates(stationName) {
    const apiKey = process.env.GOOGLE_API_KEY;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(stationName)}&key=${apiKey}`;
console.log(geocodeUrl);    
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (data.status === 'OK') {
        const location = data.results[0].geometry.location;
        return location;
    } else {
        throw new Error('Geocoding API Error: ' + data.status);
    }
}

const exclusionCafe = ["TULLY’S COFFEE","タリーズコーヒー","カフェ・ベローチェ","椿屋カフェ","カフェ・ド・クリエ","ドトールコーヒーショップ","サンマルクカフェ","エクセルシオール"];
const exclusionRestraunt = ["日高屋","バーミヤン"];

// Nearby Search APIを使用して店舗数を取得する関数
async function getAllPlaceCount(lat, lng, tpy, kwd, radius, exclusion) {
    const apiKey = process.env.GOOGLE_API_KEY;
    let totalCount = 0;
    let nextPageToken = null;
    let places = "";

    do {
        let placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${tpy}&key=${apiKey}&language=ja&keyword=${kwd}`;
        if(nextPageToken) {
            placesUrl += `&pagetoken=${nextPageToken}`;
        }

	    let response;
console.log(placesUrl);
        try {
            response = await fetch(placesUrl);
        } catch (error) {
		    console.log(error);
		    throw new Error('Nearby Search Error');
	    }
        if( !response.ok ) {
		    throw new Error('Nearby Search Error: ' + response.status );
        }
        const data = await response.json();
//console.log(data);
        if( data.status === 'INVALID_REQUEST') {
            return {
                count: totalCount,
                message: `${places}`
            }
        }

        for(let place of data.results) {
            if( exclusion.some(substring => place.name.includes(substring)) ) {
                continue;
            }
            if( place.business_status === 'OPERATIONAL' ) {
                places += `${place.name}\n`;
                totalCount ++;
            }
//console.log(`Name:${place.name}`);
	    }
        nextPageToken = data.next_page_token;

        console.log(`現在の店舗数: ${totalCount}件`);
        if (nextPageToken) {
            await new Promise(resolve => setTimeout(resolve, 2000));  // APIに負荷をかけないように待機
        }
    } while (nextPageToken);

    return {
        count: totalCount,
        message: `${places}`
    }
}

// Nearby Search API (New)を使用して店舗数を取得する関数
async function getAllPlaceCount2(lat, lng, tpy) {
    const apiKey = process.env.GOOGLE_API_KEY;
    let totalCount = 0;
    let nextPageToken = null;

    do {
        const requestBody = {
            locationRestriction: {
		circle: {
		    center: {
			latitude: lat,
			longitude: lng
		    },
            	    radius: 500  // 500m以内
		}
	    },
            includedTypes: [`${tpy}`],  // 喫茶店,町中華
	        languageCode: "ja"
//            pagetoken: nextPageToken || null
        };

        const placesUrl = 'https://places.googleapis.com/v1/places:searchNearby';

	let response;
	try {
            response = await fetch(placesUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
		    'X-Goog-Api-Key': `${apiKey}`,
		    'X-Goog-FieldMask': 'places.displayName'
                },
                body: JSON.stringify(requestBody)
            });
	} catch (error) {
		console.log(error);
		throw new Error('Nearby Search Error');
	}
        const result = await response.json();
	for(let place of result.places) {
	    console.log(place.displayName.text);
	    totalCount ++;
	}
//      totalCount += result.places.length;
        nextPageToken = result.next_page_token;

        console.log(`現在の店舗数: ${totalCount}件`);
        if (nextPageToken) {
            await new Promise(resolve => setTimeout(resolve, 2000));  // APIに負荷をかけないように待機
        }
//        }
//	else {
//            throw new Error('Places API Error: ' + result.status);
//        }
    } while (nextPageToken);

    return totalCount;
}


//
//
//
export async function getOmuIndexCountable (stationName) {
    try {
        // 駅の緯度経度を取得
        const location = await getCoordinates(stationName);
        const lat = location.lat;
        const lng = location.lng;

        // 緯度経度から指定した範囲内の店舗数を取得
        const localCafe = await getAllPlaceCount(lat, lng, "cafe","local",300,exclusionCafe);
        const chineseRestaurant = await getAllPlaceCount(lat, lng, "restaurant",encodeURIComponent("町中華"),300,exclusionRestraunt);
        const westernRestaurant = await getAllPlaceCount(lat, lng, "restaurant",encodeURIComponent("洋食屋"),300,exclusionRestraunt);
        const snack = await getAllPlaceCount(lat, lng, "bar","Japanese",300,exclusionRestraunt);

        // 結果をオブジェクトとして返す
        return {
            stationName: stationName,
            lat: lat,
            lng: lng,
            localCafe: { count: localCafe.count, message: localCafe.message },
            chineseRestaurant: { count: chineseRestaurant.count, message: chineseRestaurant.message},
            westernRestaurant: { count: westernRestaurant.count, message: westernRestaurant.message},
            snack: { count: snack.count, message: snack.message},
        };
    } catch (error) {
        console.error(error);
        return null;
    } finally {
    }
};

// オムライスインデックスを計算する関数
const calculateOmuIndex = (cafeCount, chineseRestaurantCount) => {
    // 任意のロジックをここに記述
    // 例えば、喫茶店と町中華の数を合算して返す
    return cafeCount + chineseRestaurantCount;
};

// 関数の呼び出し例
//getOmuIndex("Shibuya").then(result => {
//    if (result) {
//        console.log(`${result.stationName}駅周辺500m以内にある喫茶店の数: ${result.cafeCount}件`);
//        console.log(`${result.stationName}駅周辺500m以内にある町中華の数: ${result.chineseRestaurantCount}件`);
//        console.log(`${result.stationName}駅のオムライスインデックス: ${result.omuIndex}`);
//    }
//});

