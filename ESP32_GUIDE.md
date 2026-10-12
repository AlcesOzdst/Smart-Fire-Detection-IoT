# Smart Fire Detection and Suppression System: ESP32 Complete Build Guide

This document is a comprehensive guide to building the **Smart Fire Detection and Suppression System** using an **ESP32** (DevKit V1 / ESP-WROOM-32 30-pin or 38-pin), ported directly from the original ESP8266 (NodeMCU) implementation.

---

## 1. ESP8266 vs ESP32 Pinout Comparison

| Function / Component | ESP8266 (Original) | ESP32 GPIO Pin | ESP32 Pin Type | Pin Notes & Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **IR Flame Sensor (OUT)** | D5 (GPIO 14) | **GPIO 18** | Digital IN | Flame detector (Active LOW) |
| **DHT11 Data** | D4 (GPIO 2) | **GPIO 4** | Digital I/O | Temperature & Humidity single-bus |
| **Buzzer (+) Direct** | D2 (GPIO 4) | **GPIO 27** | Digital OUT | Direct positive pin to Buzzer |
| **Buzzer (-) Direct** | GND | **GND** | Ground | Direct negative pin to Buzzer |
| **Power Supply (VCC)** | 3.3V | **3V3** | Power | Powers DHT11 & IR sensor |
| **Ground** | GND | **GND** | Ground | Common Ground |

> [!IMPORTANT]
> **Why GPIO 34 for LM35 on ESP32?**
> The ESP32 has two ADC units: **ADC1** (GPIO 32–39) and **ADC2** (GPIO 0, 2, 4, 12–15, 25–27). If you ever turn on Wi-Fi or Bluetooth, **ADC2 is disabled by the Wi-Fi driver**. By choosing **GPIO 34 (ADC1)**, analog temperature reading remains 100% functional even when IoT features (Wi-Fi/Blynk/MQTT) are enabled!

---

## 2. Complete Wiring & Pinout Guide

### A. Power Distribution

* Connect ESP32 `VIN` to the +5V rail of your breadboard (when powered via micro-USB, `VIN` provides ~5V from USB).
* Connect ESP32 `3V3` to the +3.3V rail (or power 3.3V modules).
* Connect ESP32 `GND` to the ground rail.
* **COMMON GROUND**: If using an external 5V/12V DC power supply for the water pump motor, the negative terminal of the external supply **must** share common ground with the ESP32 GND rail.

---

### B. Sensor Connections

#### 1. IR Flame Sensor (FC-51 / KY-026 Flame Sensor)

* **VCC** $\rightarrow$ ESP32 **3V3** (or 5V if 3.3V-compatible module)
* **GND** $\rightarrow$ ESP32 **GND**
* **DO (Digital Out)** $\rightarrow$ ESP32 **GPIO 18**
* *Calibration:* Turn the onboard blue potentiometer until the detection LED turns OFF under normal room light, and turns ON only when a flame (lighter) is presented within 30–60 cm.

#### 2. DHT11 (Temperature & Humidity)

* **Pin 1 (VCC)** $\rightarrow$ ESP32 **3V3**
* **Pin 2 (Data)** $\rightarrow$ ESP32 **GPIO 4** *(Add a 4.7kΩ–10kΩ pull-up resistor to 3V3 if using a bare 4-pin DHT11; 3-pin breakout modules usually have this built-in)*
* **Pin 3 (NC)** $\rightarrow$ Not connected
* **Pin 4 (GND)** $\rightarrow$ ESP32 **GND**

#### 3. LM35 (Precision Centigrade Temperature Sensor)

* **Pin 1 (+Vs)** $\rightarrow$ ESP32 **VIN (5V)** *(LM35 datasheet specifies $V_s \ge 4.0\text{V}$; powering from 5V yields standard linear response)*
* **Pin 2 (Vout)** $\rightarrow$ ESP32 **GPIO 34** (Analog ADC1)
* **Pin 3 (GND)** $\rightarrow$ ESP32 **GND**
* *Filter Tip:* Place a small $0.1\,\mu\text{F}$ (104) ceramic capacitor between LM35 Vout and GND to suppress high-frequency noise.

---

### C. Actuators (Relays, Pump & Buzzer)

#### 1. Water Pump Relay Module (KY-019 / Songle 5V Relay)

* **VCC (+)** $\rightarrow$ ESP32 **VIN (5V)** (Relay coil requires 5V to actuate reliably)
* **GND (-)** $\rightarrow$ ESP32 **GND**
* **IN / Signal (S)** $\rightarrow$ ESP32 **GPIO 26**
* **Relay Output Terminals:**
  * **COM (Common)** $\rightarrow$ Positive terminal (+) of External Pump Power Supply (5V/12V)
  * **NO (Normally Open)** $\rightarrow$ Positive wire of DC Water Pump
  * Negative wire of DC Water Pump $\rightarrow$ Negative terminal (-) of External Pump Power Supply
  * *Flyback Protection:* Connect a **1N4007 diode** in reverse bias across the DC pump motor terminals (Cathode/stripe to motor +, Anode to motor -) to absorb inductive back-EMF spikes that could reset the ESP32!

#### 2. Buzzer Relay / Active Buzzer

* **VCC (+)** $\rightarrow$ ESP32 **VIN (5V)**
* **GND (-)** $\rightarrow$ ESP32 **GND**
* **IN / Signal (S)** $\rightarrow$ ESP32 **GPIO 27**
* **Switching:** Can switch a 5V/12V loud siren or piezo buzzer via the relay COM & NO terminals.

---

## 3. Circuit Schematic (ASCII Diagram)

```text
                               +-----------------------------+
                               |     ESP32 DevKit (30-Pin)   |
                               +-----------------------------+
                               |                             |
     [IR Flame Sensor]         |                             |
     VCC ------------> 3V3 <---| 3V3                         |
     GND ------------> GND <---| GND                         |
     OUT --------------------->| GPIO 18                     |
                               |                             |
     [DHT11 Sensor]            |                             |
     VCC ------------> 3V3 <---| 3V3                         |
     GND ------------> GND <---| GND                         |
     DATA -------------------->| GPIO 4                      |
                               |                             |
     [LM35 Temp Sensor]        |                             |
     Vs  ------------> 5V  <---| VIN (5V USB)                |
     GND ------------> GND <---| GND                         |
     Vout -------------------->| GPIO 34 (ADC1_CH6)          |
                               |                             |
     [Pump Relay Module]       |                             |
     VCC ------------> 5V  <---| VIN                         |
     GND ------------> GND <---| GND                         |
     IN  <---------------------| GPIO 26                     |
                               |                             |
     [Buzzer Relay Module]     |                             |
     VCC ------------> 5V  <---| VIN                         |
     GND ------------> GND <---| GND                         |
     IN  <---------------------| GPIO 27                     |
                               +-----------------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    Relay Power Switching      |
                              +-------------------------------+
                              | Relay 1 (NO) ---> Water Pump  |
                              | Relay 2 (NO) ---> Buzzer/Horn |
                              +-------------------------------+
```

---

## 4. Hardware Failsafe Circuit (LM393 + 74HC32 OR Gate)

The project includes an optional hardware failsafe so that if the ESP32 hangs or loses power, an analog comparator will still trigger the pump and buzzer if temperature exceeds the danger threshold:

```text
LM35 (Vout) ───────────┐
                       ├──> LM393 Pin 3 (In+)
Potentiometer (~400mV) ───> LM393 Pin 2 (In-)
                             │
                             ▼
                        LM393 Output (Pin 1) ──┐
                        (Overheat Alert)       ├──> 74HC32 OR Gate (Pin 1)
                                               │                           ├──> Relay Trigger (Pump + Buzzer)
ESP32 Alert Out (GPIO 26/25) ──────────────────┴──> 74HC32 OR Gate (Pin 2)
```

1. **LM393:** Continuously compares LM35 voltage against a reference set by a 10k pot (400 mV = 40°C).
2. **74HC32 (Quad 2-Input OR Gate):**
   * Pin 1 (A): Signal from LM393 comparator (active HIGH with 10k pull-up).
   * Pin 2 (B): Signal from ESP32 GPIO 26.
   * Pin 3 (Y): Output directly drives the Relay driver.
3. **Behavior:** If **either** the ESP32 code fires OR the LM393 analog comparator fires, the pump and buzzer turn ON immediately!

---

## 5. Arduino IDE Setup Instructions

### Step 1: Install ESP32 Board Support

1. Open **Arduino IDE** $\rightarrow$ Go to **File > Preferences**.
2. In **Additional boards manager URLs**, add:

   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```

3. Go to **Tools > Board > Boards Manager...**, search for `esp32` by **Espressif Systems**, and click **Install**.
4. Select your board under **Tools > Board > esp32 > DOIT ESP32 DEVKIT V1** (or ESP32 Dev Module).

### Step 2: Install Libraries

Go to **Sketch > Include Library > Manage Libraries...** and install:

1. **DHT sensor library** by *Adafruit* (Version 1.4.4 or higher)
2. **Adafruit Unified Sensor** by *Adafruit*

### Step 3: Flash the Code

1. Open [`code/esp32_fire_suppression.ino`](code/esp32_fire_suppression.ino).
2. Connect your ESP32 board to your computer via USB.
3. Select your serial port under **Tools > Port**.
4. Click **Upload**.
5. Open Serial Monitor at **115200 baud** to see live telemetry!
