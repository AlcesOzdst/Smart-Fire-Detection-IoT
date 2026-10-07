#include <DHTesp.h>

#include <DHT.h>

// ------------------ Pin Configuration ------------------
#define IR_SENSOR D5       // IR sensor OUT pin
#define RELAY_PUMP D1      // Water pump relay IN pin
#define RELAY_BUZZER D2    // Buzzer relay IN pin
#define DHTPIN D4          // DHT11 data pin
#define DHTTYPE DHT11
#define LM35_PIN A0        // LM35 analog output pin

// ------------------ Sensor Objects ------------------
DHT dht(DHTPIN, DHTTYPE);

// ------------------ Thresholds ------------------
#define TEMP_THRESHOLD 40.0   // °C
#define IR_DETECTED LOW       // depends on your IR sensor output (use LOW or HIGH)

// -----------------------------------------------------
void setup() {
  Serial.begin(9600);
  dht.begin();

  pinMode(IR_SENSOR, INPUT);
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RELAY_BUZZER, OUTPUT);

  // Start with everything OFF
  digitalWrite(RELAY_PUMP, LOW);
  digitalWrite(RELAY_BUZZER, LOW);

  Serial.println("Fire Prevention System Initialized...");
}

// -----------------------------------------------------
void loop() {
  // --- Read DHT11 values ---
  float humidity = dht.readHumidity();
  float tempDHT = dht.readTemperature(); // °C

  // --- Read LM35 value ---
  int sensorValue = analogRead(LM35_PIN);
  float voltage = sensorValue * (3.3 / 1023.0);
  float tempLM35 = voltage * 100.0; // 10mV per °C

  // --- Read IR sensor ---
  int irValue = digitalRead(IR_SENSOR);

  // --- Combine temperature sources ---
  float temperature = (tempDHT + tempLM35) / 2.0;

  // --- Print sensor values ---
  Serial.print("IR: "); Serial.print(irValue == IR_DETECTED ? "🔥 Fire Detected" : "No Fire");
  Serial.print(" | Temp: "); Serial.print(temperature); Serial.print("°C");
  Serial.print(" | Humidity: "); Serial.print(humidity); Serial.println("%");

  // --- Fire Detection Logic ---
  if (irValue == IR_DETECTED || temperature > TEMP_THRESHOLD) {
    Serial.println("ALERT! Activating Pump & Buzzer...");
    digitalWrite(RELAY_PUMP, HIGH);    // Turn ON pump
    digitalWrite(RELAY_BUZZER, HIGH);  // Turn ON buzzer
  } else {
    Serial.println("Safe: System in standby.");
    digitalWrite(RELAY_PUMP, LOW);     // Turn OFF pump
    digitalWrite(RELAY_BUZZER, LOW);   // Turn OFF buzzer
  }

  delay(2000); // Update every 2 seconds
}
