// Codigo para el arduino que se encarga de grabar los datos del sensor y guardarlos en un archivo .JSN para ser procesados por el dashboard.

#include <Wire.h>
#include <MPU6050.h>
#include <SPI.h>
#include <SD.h>

MPU6050 mpu;

// --- MAPEO DE PINES ---
const int chipSelect = 10;
const int pinLED = 7;       // Estado: Fijo = Grabando
const int pinHeartbeat = 8; // Heartbeat: Anti-apagado Powerbank
const int pinStepLED = 9;   // Testigo: Flash por cada paso
const int pinInicio = 6;
const int pinFin = 5;

// --- CONFIGURACIÓN DE ZANCADA DINÁMICA ---
const float zancadaCaminando = 0.90;   // Metros si vas lento
const float zancadaCorriendo = 1.15;   // Metros si vas rápido
const float umbralTiempoCarrera = 0.6; // Segundos (Punto de cambio)

// --- CALIBRACIÓN DE SENSOR ---
const float umbralPaso = 1.05;   // Sensibilidad alta
const float umbralReposo = 1.05; 

// --- VARIABLES DE TELEMETRÍA ---
int pasos = 0;
bool grabando = false, pasoDetectado = false;
float distanciaTotal = 0, velocidadPunta = 0.0;
unsigned long tiempoInicio = 0, tiempoUltimoPaso = 0;
char nombreArchivo[] = "RUN00.JSN"; 

// --- VARIABLES PARA HEARTBEAT (SIN DELAY) ---
unsigned long prevMillisHB = 0;
const long intervalHB = 200; 
bool estadoHB = LOW;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  mpu.initialize();
  
  pinMode(pinLED, OUTPUT);
  pinMode(pinHeartbeat, OUTPUT);
  pinMode(pinStepLED, OUTPUT);
  pinMode(pinInicio, INPUT_PULLUP);
  pinMode(pinFin, INPUT_PULLUP);

  if (!SD.begin(chipSelect)) {
    // ERROR SD: Los 3 LEDs parpadean rápido
    while(1) {
      digitalWrite(pinLED, HIGH); digitalWrite(pinHeartbeat, HIGH); digitalWrite(pinStepLED, HIGH);
      delay(100);
      digitalWrite(pinLED, LOW); digitalWrite(pinHeartbeat, LOW); digitalWrite(pinStepLED, LOW);
      delay(100);
    }
  }
  
  // Señal de "Sistema Listo"
  for(int i=0; i<3; i++) { digitalWrite(pinHeartbeat, HIGH); delay(50); digitalWrite(pinHeartbeat, LOW); delay(50); }
  Serial.println(F("Listo para iniciar..."));
}

void loop() {
  unsigned long currentMillis = millis();

  // 1. HEARTBEAT CONSTANTE (Mantiene despierta la Xiaomi)
  if (currentMillis - prevMillisHB >= intervalHB) {
    prevMillisHB = currentMillis;
    estadoHB = !estadoHB;
    digitalWrite(pinHeartbeat, estadoHB);
  }

  // 2. BOTÓN DE FIN (Prioridad Alta)
  if (digitalRead(pinFin) == LOW && grabando) {
    delay(250); 
    File f = SD.open(nombreArchivo, FILE_WRITE);
    if (f) { f.print("]"); f.flush(); f.close(); }
    grabando = false;
    digitalWrite(pinLED, LOW);
    digitalWrite(pinStepLED, LOW);
    // Señal de guardado: 3 parpadeos lentos
    for(int i=0; i<3; i++) { digitalWrite(pinLED, HIGH); delay(300); digitalWrite(pinLED, LOW); delay(300); }
    Serial.println(F("Sesion Cerrada."));
  }

  // 3. BOTÓN DE INICIO
  if (digitalRead(pinInicio) == LOW && !grabando) {
    delay(250);
    for (uint8_t i = 0; i < 100; i++) {
      nombreArchivo[3] = i / 10 + '0'; nombreArchivo[4] = i % 10 + '0'; 
      if (!SD.exists(nombreArchivo)) break; 
    }
    File f = SD.open(nombreArchivo, FILE_WRITE);
    if (f) {
      f.print("["); f.close();
      grabando = true;
      pasos = 0; distanciaTotal = 0; velocidadPunta = 0.0;
      tiempoInicio = millis(); tiempoUltimoPaso = millis();
      digitalWrite(pinLED, HIGH); // Estado: Grabando
      Serial.print(F("Archivo: ")); Serial.println(nombreArchivo);
    }
  }

  // 4. LÓGICA DE PROCESAMIENTO
  if (grabando) {
    int16_t ax, ay, az;
    mpu.getAcceleration(&ax, &ay, &az);
    float accelZ = az / 16384.0; 

    if (accelZ > umbralPaso && !pasoDetectado) {
      unsigned long tActual = millis();
      if (tActual - tiempoUltimoPaso > 400) { // Filtro de rebote mecánico
        pasos++;
        pasoDetectado = true;
        digitalWrite(pinStepLED, HIGH); // Flash de paso detectado

        // CÁLCULO DE ZANCADA DINÁMICA
        float tiempoPasoSeg = (tActual - tiempoUltimoPaso) / 1000.0;
        float zancadaActual = (tiempoPasoSeg <= umbralTiempoCarrera) ? zancadaCorriendo : zancadaCaminando;
        
        distanciaTotal += zancadaActual;
        float tTotalSeg = (tActual - tiempoInicio) / 1000.0;
        float vInst = (zancadaActual / tiempoPasoSeg) * 3.6; // km/h
        if (vInst > velocidadPunta && vInst < 25.0) velocidadPunta = vInst;
        float vMed = (distanciaTotal / 1000.0) / (tTotalSeg / 3600.0);

        // ESCRITURA SEGURA (Un solo bloque String para evitar corrupción)
        File f = SD.open(nombreArchivo, FILE_WRITE);
        if (f) {
          if (pasos > 1) f.print(","); 
          String item = "{\"step\":" + String(pasos) + 
                        ",\"tm\":" + String(tTotalSeg) + 
                        ",\"dist\":" + String(distanciaTotal) + 
                        ",\"vel_i\":" + String(vInst) + 
                        ",\"vel_m\":" + String(vMed) + 
                        ",\"top\":" + String(velocidadPunta) + "}";
          f.print(item);
          f.flush();
          f.close();
        }

        tiempoUltimoPaso = tActual;
        digitalWrite(pinStepLED, LOW);
        Serial.print(F("P: ")); Serial.println(pasos);
      }
    }
    if (accelZ < umbralReposo) pasoDetectado = false;
  }
}