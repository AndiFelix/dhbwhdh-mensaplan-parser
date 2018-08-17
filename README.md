# Mensaplan-Parser for DHBW Heidenheim Menus
PDF Parser for the DHBW Heidenheim Menus (Studierendenwerk Ulm)

## 1. Installation

Navigate to the dhbwhdh-mensaplan-parser project folder

`$ cd [PATH]/dhbwhdh-mensaplan-parser`

Install the dependencies from package.json

`$ npm install`

## 2. Run

Run plan_check.js to get the recent menu plans

`$ node plan_check.js`

## Configuration

The parser can be configured via the `properties.json` file.
It has the following keys:

"html": The folder where the resulting json files for the api are put (out.json and weeks.json)

"food": This is the folder where the parsed food plans for each week go

"raw": This folder is for storing the original output of pdf2json

"pdf": Here the original pdf files are stored

"log": Location of a log file

"basedomain": The base domain for the plans to be downloaded