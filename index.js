var awsIot = require('aws-iot-device-sdk');

var homeDir = process.env["HOME"];
var deviceName = "trombone-edison";
var deviceCredentials = {
  keyPath: homeDir+'/.aws-device/private.pem.key',
  certPath: homeDir+'/.aws-device/certificate.pem.crt',
  caPath: homeDir+'/.aws-device/root-CA.pem',
  clientId: deviceName,
  region: 'ap-southeast-1',
  reconnectPeriod: 1500
};
var mainTopic = "mozart";

var device = awsIot.device(deviceCredentials);

device.subscribe(mainTopic);

function disarm() {
  console.log("Disarm!");
  countdownInterval && clearInterval(countdownInterval);
  buzzerInterval && clearInterval(buzzerInterval);
  lcd.setColor(0, 255, 0);
  lcd.setCursor(1, 0);
  lcd.write("Congratulations!");
  device.publish(mainTopic, JSON.stringify({ event: 'disarmed', device: deviceName }));
}

function reset() {
  console.log("Reset.");
  countdownInterval && clearInterval(countdownInterval);
  buzzerInterval && clearInterval(buzzerInterval);
  lcd.setColor(255, 255, 255);
  lcd.setCursor(1, 0);
          // 1234567890123456
  lcd.write("Ready.          ");
}

function explode(){
  clearInterval(countdownInterval);
  clearInterval(buzzerInterval);
  lcd.setColor(255, 0, 0);
  lcd.setCursor(0, 0);
  lcd.write("**   XX:XX    ** \n");
  lcd.setCursor(1, 0);
  lcd.write(" BOOOOM!?!@#!@  ");

  buzzer.write(1);
  setTimeout(function(){
    buzzer.write(0);
  }, 2000);
};

device.on('message', function(topic, payload) {
    console.log('Message Received - Topic: ' + topic + ' Payload: ' + payload.toString());

    payload = JSON.parse(payload);
    switch (payload.event) {
      case "bomb-disarmed":
        disarm();
        break;
      case "reset":
        reset();
        break;
      case "boom":
        explode();
        break;
      case "start":
        startCountdown(payload.duration);
        break;
    }
});

var LCD = require('jsupm_i2clcd');
var lcd = new LCD.Jhd1313m1(0);

var messages = [
// 1234567890123456
  "It's just a bomb",
  "not dangerous   ",
  "Or is it?       ",
  "It's getting hot",
  "Stop sweating   ",
  "which wire?!?   ",
  "Hurry           ",
  "Uh-oh...        ",
  "Nice knowing you",
];

var m = require('mraa'); //require mraa

var buzzer = new m.Gpio(5);
buzzer.dir(m.DIR_OUT);

var countdownInterval, buzzerInterval;

function padZeroes(number) {
  if (number < 9) return "0"+number;
  return number;
}

var buzzerMinPeriod = 0;
var buzzerMaxPeriod = 1000;

function startCountdown(initial) {
  var timeLeft = initial;
  var buzzerPeriod = buzzerMaxPeriod;

  countdownInterval = setInterval(function() {
    var minutes = Math.floor(timeLeft / 60);
    var seconds = timeLeft % 60;
    var timeSpent = initial - timeLeft;

    if (timeLeft < 31 && timeLeft > 5 && timeLeft % 10 === 0) {
      buzzerInterval && clearInterval(buzzerInterval);
      buzzerInterval = setInterval(soundBuzzer, ((timeLeft / initial) * (buzzerMaxPeriod - buzzerMinPeriod)) + buzzerMinPeriod);
    } else if (timeLeft < 5) {
      buzzerInterval && clearInterval(buzzerInterval);
      buzzer.write(1);
    }

    lcd.setColor(Math.floor(timeSpent / initial * 255), Math.floor(timeLeft / initial * 255), 0);
    lcd.setCursor(0, 0);
    lcd.write("**   " + padZeroes(minutes, 2) + ":" + padZeroes(seconds, 2) + "    ** \n");
    if (timeLeft > 0) {
      lcd.setCursor(1, 0);
      lcd.write(messages[Math.floor(timeSpent / initial * messages.length)]);
    }

    timeLeft = timeLeft - 1;
    if (timeLeft < 0) { explode() }
  }, 1000);
}

function soundBuzzer(){
  buzzer.write(1);
  setTimeout(function(){
    buzzer.write(0);
  }, 150);
}

function exit() {
  buzzer.write(0);
  return true;
}

process.on('SIGTSTP', exit);
process.on('SIGINT', exit);
process.on('exit', exit);
process.on('uncaughtException', exit);
