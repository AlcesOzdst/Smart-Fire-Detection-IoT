# Smart Fire Detection and Response System

A smart fire and overheat detection system engineered for the ESP32 microcontroller, featuring real-time optical flame sensing, ambient temperature and humidity tracking, direct acoustic alarm triggering, and an integrated local web telemetry dashboard over Web Serial.

## System Overview

The system monitors environmental and optical indicators to identify fire and overheating conditions. When a threat is detected, the microcontroller instantly triggers an acoustic alarm and transmits diagnostic telemetry to a connected workstation console.

### Key Capabilities

* Optical flame detection using an infrared receiver with adjustable sensitivity.
* Environmental monitoring via a DHT11 temperature and humidity sensor.
* Direct acoustic alarm actuation using a dedicated buzzer output.
* Real-time local web telemetry dashboard running directly in modern web browsers via Web Serial API.
* Dual-stream serial reporting: machine-readable JSON data for dashboards alongside human-readable diagnostic text.
* Interactive serial command interface for remote manual testing and override.

## Hardware Configuration

### Bill of Materials

| Component | Quantity | Description |
| :--- | :--- | :--- |
| ESP32 DevKit V1 | 1 | 30-pin or 38-pin dual-core microcontroller |
| IR Flame Sensor Module | 1 | Digital infrared flame receiver with LM393 comparator |
| DHT11 Sensor | 1 | Single-bus digital temperature and humidity sensor |
| Piezo / Active Buzzer | 1 | Acoustic alarm indicator driven directly from GPIO |
| Jumper Wires and Breadboard | Various | Circuit interconnects |

### Pinout Specifications

| Component | Pin | ESP32 GPIO | Logic Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| IR Flame Sensor | OUT | GPIO 18 | Digital Input | Active LOW on flame detection |
| DHT11 Sensor | DATA | GPIO 4 | Digital I/O | Temperature and humidity communication |
| Buzzer (+) | Anode | GPIO 27 | Digital Output | Active HIGH alarm trigger |
| Buzzer (-) | Cathode | GND | Ground | Ground reference |
| Sensor Power | VCC | 3V3 | Power (3.3V) | Regulated logic power rail |
| System Ground | GND | GND | Ground | Common reference |

## Circuit Schematic

```text
                        +--------------------------------+
                        |     ESP32 DEVKIT V1 (30-Pin)   |
                        +--------------------------------+
                        |                                |
   [IR Flame Sensor]    |                                |
   VCC ---------------->| 3V3                            |
   GND ---------------->| GND                            |
   OUT ---------------->| GPIO 18 (Digital Input)        |
                        |                                |
   [DHT11 Sensor]       |                                |
   VCC ---------------->| 3V3                            |
   GND ---------------->| GND                            |
   DATA --------------->| GPIO 4  (Single-Bus Data)      |
                        |                                |
   [Acoustic Buzzer]    |                                |
   (+) Anode <----------| GPIO 27 (Digital Output)       |
   (-) Cathode -------->| GND                            |
                        +--------------------------------+
                                       |
                                  [Micro-USB]
                                       |
                                       v
                        +--------------------------------+
                        | Local Web Telemetry Dashboard  |
                        | (dashboard/index.html @115200) |
                        +--------------------------------+
```

## Local Web Telemetry Dashboard

A dedicated, standalone local dashboard is provided in the `dashboard/` directory.

### Dashboard Features

* Direct Web Serial connectivity: Connects to the ESP32 via USB at 115200 baud without external servers.
* Dynamic optical flame radar and status display.
* Real-time rolling canvas chart for temperature and humidity.
* Synthesized browser emergency siren via Web Audio API.
* Manual control buttons: Force alarm, silence alarm, and auto mode.
* Raw serial diagnostic console with export capability.

### Launching the Dashboard

1. Open `dashboard/index.html` in Google Chrome, Microsoft Edge, or any Chromium-based browser.
2. Click "Connect ESP32 (COM)" in the header.
3. Select your serial port (for example, COM7) and click Connect.

## Software Architecture

### Firmware Structure

* `src/main.cpp`: Primary firmware source for PlatformIO.
* `code/esp32_fire_suppression.ino`: Arduino IDE compatible version.
* `platformio.ini`: Build configuration targeting Espressif 32.

### Serial Commands

When connected to the serial monitor at 115200 baud:

* `1`: Force buzzer alarm ON (manual override).
* `0`: Force buzzer alarm OFF (silence).
* `a`: Return to automatic sensor monitoring mode.

## Project Documentation

* Detailed engineering specifications: See `ESP32_HANDBOOK.md` or `ESP32_HANDBOOK.pdf`.
* Legacy ESP8266 and relay implementation: See `code/fire_supression.ino`.

## Author

Parth Doshi
[LinkedIn](https://linkedin.com/in/parthdoshi404) | [GitHub](https://github.com/AlcesOzdst) | [Website](https://alcesozdst.com)

## License

This project is licensed under the MIT License.
