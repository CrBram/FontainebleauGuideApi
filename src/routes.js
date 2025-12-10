import express from "express";
import jsonData from "./data/hotspots.json" with { type: "json" };

const { hotspots } = jsonData;

const router = express.Router();

// Get all hotspots
router.get("/hotspots", (req, res) => {
  res.json(hotspots);
});

// Get current climbing condition (good, medium, bad)
router.get("/climbing-condition", async (req, res) => {
  try {
    const result = await getClimbingCondition();
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch climbing condition" });
  }
});

// Get current weather
router.get("/current-weather", async (req, res) => {
  try {
    const weather = await getCurrentWeather();
    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch current weather" });
  }
});

async function getClimbingCondition() {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=48.405&longitude=2.702&daily=rain_sum,temperature_2m_max,temperature_2m_min&current=temperature_2m,weather_code&past_days=2&forecast_days=1";
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Map the data to a better format
  const mappedData = data.daily.time.map((date, index) => {
    const maxTemp = data.daily.temperature_2m_max[index];
    const minTemp = data.daily.temperature_2m_min[index];
    const averageTemp = (maxTemp + minTemp) / 2;
    
    return {
      date: date,
      rainTotal: data.daily.rain_sum[index],
      averageTemp: averageTemp
    };
  });
  
  const pastDaysRain = mappedData.slice(0, 2).reduce((sum, day) => sum + day.rainTotal, 0);
  const isCurrentlyRaining = isRaining(data.current.weather_code);
  
  // Determine condition based on current rain and past days' rain total
  // Thresholds: 0mm = good, 0.1-2mm = medium, >2mm = bad
  if (isCurrentlyRaining) {
    return {
      condition: "bad",
      description: "Rocks are currently wet due to active rainfall. Climbing conditions are unsafe and should be avoided until the rain stops and surfaces have time to dry."
    };
  } else if (pastDaysRain === 0) {
    return {
      condition: "good",
      description: "No recent rainfall and low moisture levels. Perfect climbing conditions with dry rock surfaces."
    };
  } else if (pastDaysRain <= 2) {
    return {
      condition: "medium",
      description: `Even though it's currently dry, recent rainfall totaling ${pastDaysRain.toFixed(1)}mm over the past 2 days means rocks may still be wet. Exercise caution and avoid climbing on surfaces that appear damp or slippery.`
    };
  } else {
    return {
      condition: "bad",
      description: `Rocks are likely still wet from significant rainfall (${pastDaysRain.toFixed(1)}mm) over the past 2 days. Climbing should be avoided until surfaces have had sufficient time to dry completely.`
    };
  }
}

async function getCurrentWeather() {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=48.405&longitude=2.702&current=temperature_2m,weather_code";
  
  const response = await fetch(url);
  const data = await response.json();
  
  const temperature = data.current.temperature_2m;
  const weatherCode = data.current.weather_code;
  
  // Map weather code
  const condition = getWeatherCondition(weatherCode);
  
  return {
    temperature: temperature,
    condition: condition
  };
}

function isRaining(weatherCode) {
  // Check if weather code indicates rain, snow, or storm
  return (weatherCode >= 51 && weatherCode <= 67) || // Drizzle and rain
         (weatherCode >= 71 && weatherCode <= 77) || // Snow
         (weatherCode >= 80 && weatherCode <= 82) || // Rain showers
         (weatherCode >= 85 && weatherCode <= 86) || // Snow showers
         (weatherCode >= 95 && weatherCode <= 99);   // Thunderstorm
}

function getWeatherCondition(weatherCode) {
  // 0 = Clear sky --> sunny
  if (weatherCode === 0) {
    return "sunny";
  }
  
  // Rain, snow, or storm codes -> rainy
  if (isRaining(weatherCode)) {
    return "rainy";
  }
  
  // Everything else (cloudy, foggy, etc.) -> cloudy
  return "cloudy";
}

export default router;
