# Smart Fire Detection and Response System (IoT + Logic Gate Failsafe)

This project is a **smart fire detection and suppression system** built using the **ESP8266** microcontroller, designed to automatically **detect fire** and respond instantly by **activating a water pump**. The system integrates **multiple sensors**, including an **IR flame sensor** and a **temperature sensor (LM35)**, along with a **relay-driven actuator** to control external devices such as **pumps** or **buzzers**.

To ensure maximum safety and reliability, the setup also includes a hardware-based failsafe mechanism using a **LM393 comparator and logic gates**, which triggers the emergency response even if the microcontroller fails or a sensor malfunctions.

---

## Features

* Real-time fire detection using **IR sensor**
* Temperature monitoring via **LM35 sensor**
* Automatic **water pump + buzzer** activation
* **Hardware failsafe** with LM393 comparator and logic gates
* Works independently even if ESP8266 crashes
* Modular and easy to extend (IoT alerts, smoke sensors, etc.)

---

## Components Used

| Component                     | Quantity | Description                                  |
| ----------------------------- | -------- | -------------------------------------------- |
| ESP8266 (NodeMCU)             | 1        | Main microcontroller                         |
| IR Proximity Sensor           | 1        | Detects flame or fire                        |
| LM35 Temperature Sensor       | 1        | Provides analog temperature reading          |
| DHT11 Sensor                  | 1        | Monitors ambient humidity and temperature    |
| Relay Module                  | 2        | Controls pump and buzzer                     |
| Water Pump                    | 1        | Sprays water automatically on fire detection |
| Buzzer                        | 1        | Triggers alarm                               |
| LM393 Comparator              | 1        | Failsafe overheat detection circuit          |
| Logic Gates (IC 7432 or 4071) | 1        | Combines signals for failsafe trigger        |
| Misc                          | —        | Breadboard, jumper wires, resistors, etc.    |

---

## Circuit Description

1. **Fire Detection (IR Sensor):**
   When the IR sensor detects flame, it sends a LOW signal to the ESP8266.
   The microcontroller activates the relay, turning ON the pump and buzzer.

2. **Temperature Monitoring (LM35 + LM393):**
   LM35 continuously measures temperature.
   The LM393 comparator checks if it exceeds a preset threshold.

   * If it does, LM393 output goes HIGH → triggers OR gate → activates relay (pump/buzzer).

3. **Failsafe Logic (Hardware):**
   Both the ESP8266 output and LM393 output are connected to an **OR gate**.
   If either detects danger, the OR gate activates the relay.
   This ensures operation even if ESP8266 fails.

4. **System Reset:**
   Once fire and temperature levels drop to normal, outputs return LOW and relays turn off.

---

## Pin Connections (ESP8266)

| Component         | ESP8266 Pin | Description                      |
| ----------------- | ----------- | -------------------------------- |
| IR Sensor OUT     | D5 (GPIO14) | Fire detection input             |
| Relay (Pump) IN   | D1 (GPIO5)  | Controls water pump              |
| Buzzer            | D2 (GPIO4)  | Controls buzzer                  |
| DHT11 Data        | D4 (GPIO2)  | Temperature + humidity           |
| GND               | GND         | Common ground for all components |
| VCC               | 3.3V / 5V   | Power supply depending on module |

---

## Safety & Reliability Features

* Hardware-level **failsafe trigger** (works even if ESP8266 stops responding)
* Adjustable **temperature threshold** (via potentiometer on LM393)
* Automatic reset once conditions normalize
* Modular, testable design

---

## Working Flow

```text
IR Sensor detects fire  → ESP8266 → Relay ON → Pump + Buzzer ON
LM35 detects overheat   → LM393 → OR Gate → Relay ON → Pump + Buzzer ON
Both Normal → Relay OFF → Pump + Buzzer OFF
```

---

## Project Media

📷 **Images:**
Add your circuit photo under `/media/working_photo.jpg`

🎥 **Demo Video:**
Add your demo in `/media/demo_video.mp4`

---

## Future Scope

* Add Wi-Fi alerts (via Blynk, Telegram, or MQTT)
* Integrate smoke/gas sensors
* Add OLED display for live status
* Solar/battery backup integration

## Author

**Parth Doshi**
[LinkedIn](https://linkedin.com/in/parthdoshi404) • [GitHub](https://github.com/AlcesOzdst) • [Website](https://alcesozdst.com)

## License

This project is licensed under the **MIT License** — feel free to use, modify, and share with credit.
