/*
 * =====================================================================================
 * Smart Fire Detection System (ESP32 - Direct Buzzer Edition + Web Dashboard Telemetry)
 * Arduino IDE Sketch
 * =====================================================================================
 * 
 * Hardware Pin Mapping:
 * -------------------------------------------------------------
 * Component          | ESP32 Pin
 * -------------------------------------------------------------
 * Buzzer (+) [Long]  | GPIO 27
 * Buzzer (-) [Short] | GND
 * 
 * IR Flame Sensor    | 
 *   - VCC            | 3V3
 *   - GND            | GND
 *   - OUT            | GPIO 18
 * 
 * DHT11 Sensor       | 
 *   - VCC            | 3V3
 *   - GND            | GND
 *   - DATA           | GPIO 4
 * -------------------------------------------------------------
 */

#include <DHT.h>

// ================= Pin Configuration =================
#define BUZZER_PIN       27
#define IR_SENSOR_PIN    18
#define DHT_PIN          4
#define DHT_TYPE         DHT11

// ================= Thresholds =================
#define TEMP_THRESHOLD   45.0  // Overheat alarm trigger (°C)
#define IR_DETECTED_VAL  LOW   // Flame sensor digital output on flame detection

DHT dht(DHT_PIN, DHT_TYPE);

bool manualMode = false;
bool manualBuzzerState = false;

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT);
  dht.begin();

  // Buzzer starts OFF
  digitalWrite(BUZZER_PIN, LOW);

  // Quick 2-beep startup confirmation
  Serial.println("\n=======================================================");
  Serial.println("  Smart Fire Detection System (ESP32 + Dashboard Ready)");
  Serial.println("=======================================================");
  digitalWrite(BUZZER_PIN, HIGH);
  delay(120);
  digitalWrite(BUZZER_PIN, LOW);
  delay(100);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(120);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("Status: System Online & Standby.");
  Serial.println("Serial Commands: '1' = Buzzer ON | '0' = Buzzer OFF | 'a' = Auto\n");
}

void loop() {
  // Check for Serial commands from user or Web Dashboard
  if (Serial.available()) {
    char c = Serial.read();
    if (c == '1') {
      manualMode = true;
      manualBuzzerState = true;
      digitalWrite(BUZZER_PIN, HIGH);
      Serial.println("[MANUAL] Buzzer ON");
    } else if (c == '0') {
      manualMode = true;
      manualBuzzerState = false;
      digitalWrite(BUZZER_PIN, LOW);
      Serial.println("[MANUAL] Buzzer OFF");
    } else if (c == 'a' || c == 'A') {
      manualMode = false;
      Serial.println("[AUTO] Resumed Automatic Sensor Mode");
    }
  }

  // --- Read Sensors ---
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  bool dhtOk = !isnan(humidity) && !isnan(temperature);

  int irState = digitalRead(IR_SENSOR_PIN);
  bool flameDetected = (irState == IR_DETECTED_VAL);
  bool overheat = dhtOk && (temperature > TEMP_THRESHOLD);
  bool isAlarm = manualMode ? manualBuzzerState : (flameDetected || overheat);

  // --- Alarm Actuation ---
  if (!manualMode) {
    if (flameDetected || overheat) {
      digitalWrite(BUZZER_PIN, HIGH);
    } else {
      digitalWrite(BUZZER_PIN, LOW);
    }
  }

  // --- 1. Machine-Readable JSON Telemetry for Web Dashboard ---
  Serial.print("DATA:{\"flame\":");
  Serial.print(flameDetected ? 1 : 0);
  Serial.print(",\"temp\":");
  Serial.print(dhtOk ? temperature : 0.0, 1);
  Serial.print(",\"humidity\":");
  Serial.print(dhtOk ? humidity : 0.0, 1);
  Serial.print(",\"alarm\":");
  Serial.print(isAlarm ? 1 : 0);
  Serial.print(",\"manual\":");
  Serial.print(manualMode ? 1 : 0);
  Serial.println("}");

  // --- 2. Human-Readable Terminal Log ---
  Serial.print("Flame: ");
  Serial.print(flameDetected ? "[ALERT: FLAME DETECTED]" : "[CLEAR]");
  if (dhtOk) {
    Serial.print(" | Temp: "); Serial.print(temperature, 1); Serial.print("C");
    Serial.print(" | Hum: "); Serial.print(humidity, 1); Serial.print("%");
  } else {
    Serial.print(" | DHT11: [WAITING]");
  }
  Serial.print(" | Alarm: ");
  Serial.println(isAlarm ? "ACTIVE" : "STANDBY");

  delay(1000); // 1-second clean update cycle
}
