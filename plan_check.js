"use strict";
const fs = require('fs');
const url = require('url');
const http = require('https');
const PDFParser = require('pdf2json/pdfparser');
const Log = require("./lib/log.js");
const _ = require('underscore');

const properties = require('./properties.json');

let parsecount = 0;
let urls = [];

const dirs = [properties.pdf, properties.food, properties.raw];
for (let dir in dirs) {
    try {
        fs.accessSync(dirs[dir], fs.R_OK | fs.W_OK)
    } catch (ex) {
        fs.mkdirSync(dirs[dir]);
    }
}
const files = fs.readdirSync(properties.pdf);

checkhtml();

function checkhtml() {
    http.get('https://studierendenwerk-ulm.de/essen-trinken/speiseplaene/', (result) => {
        let body = "";
        result.on('data', (data) => {
            body += data;
        });

        result.on('end', () => {
            let $ = require('cheerio').load(body);
            $("a").each(function () {
                let href = $(this).attr("href");
                if (href !== undefined) {
                    if (href.indexOf("DHBW") > 1) {
                        urls.push(href.replace(/.*\//gi, "").replace(".pdf", ""));
                    }
                }
            });

            if (urls.length == 0) {
                Log.w("No plans found at the website!");
            }
            else {
                urls.forEach((element) => {
                    Log.i(element + " found at the website -> processing");
                    if (files.indexOf(element + ".pdf") > -1) {
                        Log.i(element + ".pdf existing -> try to find the .json file");
                        fs.readFile(properties.raw + element + ".json", "utf-8", (err, data2) => {
                            if (err || data2.length == 0) {
                                Log.i("Not able to find " + properties.raw + element + ".json" + " -> Parse from .pdf ");
                                parsePdfToRaw(element);
                            }
                            else {
                                Log.i("Found " + properties.raw + element + ".json" + " -> Parse to .json");
                                parseRawToJson(JSON.parse(data2), element);
                            }
                        });
                    }
                    else {
                        Log.i(element + ".pdf not existing -> pull from server and parse to json");
                        downloadPlan(element);
                    }
                });
            }
        });
        result.resume();
    }).on('error', (e) => {
        Log.e(`Cannot read data from studentenwerk website: ${e.message}`);
    });
}

function downloadPlan(filename) {
    let file = fs.createWriteStream(properties.pdf + filename + ".pdf");

    http.get(properties.basedomain + filename + ".pdf", function (res) {
        res.on('data', function (data) {
            file.write(data);
        }).on('end', function () {
            file.end();
            Log.i(filename + '.pdf downloaded to ' + properties.pdf);
            parsePdfToRaw(filename);
        });
    });
}

function parsePdfToRaw(planname) {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", errData => Log.e(errData));
    pdfParser.on("pdfParser_dataReady", pdfData => {
        fs.writeFile(properties.raw + planname + ".json", JSON.stringify(pdfData), function() {
            Log.i("parsed " + planname + ".pdf to json");
            parseRawToJson(pdfData, planname);
        });
    });
    console.log(properties.pdf + planname + ".pdf");
    pdfParser.loadPDF(properties.pdf + planname + ".pdf");
}


function parseRawToJson(json, planname) {
    const elements = json["formImage"]["Pages"][0]["Texts"];

    let string = "";
    let array = [["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""], ["", "", "", "", ""]];

    const mealtypes = ["Essen 1", "Essen 2", "Beilage 1", "Beilage 2", "Salat"];

    for (let i = 0; i < elements.length; i++) {
        if (elements[i]["x"] >= 11 && elements[i]["x"] < 19 && elements[i]["y"] >= 2 && elements[i]["y"] < 6.5) {
            string = decodeURIComponent(string + " " + elements[i]["R"][0]["T"] + " ");
        }

        for (let a = 0; a < 5; a++) {
            //grab elements with text size greater than 9, i.e. no allergic information
            if (elements[i]["R"][0]["TS"][1] > 9) {
                if (elements[i]["x"] >= (a * 7.5 + 10) && elements[i]["x"] < (a * 7.5 + 17.5) && elements[i]["y"] >= 8 && elements[i]["y"] < 13.5) {
                    array[a][0] = decodeURIComponent(array[a][0] + elements[i]["R"][0]["T"] + " ");
                }
                else if (elements[i]["x"] >= (a * 7.5 + 10) && elements[i]["x"] < (a * 7.5 + 17.5) && elements[i]["y"] >= 13.5 && elements[i]["y"] < 19) {
                    array[a][1] = decodeURIComponent(array[a][1] + elements[i]["R"][0]["T"] + " ");
                }
                else if (elements[i]["x"] >= (a * 7.5 + 10) && elements[i]["x"] < (a * 7.5 + 17.5) && elements[i]["y"] >= 19 && elements[i]["y"] < 21.8) {
                    array[a][2] = decodeURIComponent(array[a][2] + elements[i]["R"][0]["T"] + " ");
                }
                else if (elements[i]["x"] >= (a * 7.5 + 10) && elements[i]["x"] < (a * 7.5 + 17.5) && elements[i]["y"] >= 21.8 && elements[i]["y"] < 24.7) {
                    array[a][3] = decodeURIComponent(array[a][3] + elements[i]["R"][0]["T"] + " ");
                }
                else if (elements[i]["x"] >= (a * 7.5 + 10) && elements[i]["x"] < (a * 7.5 + 17.5) && elements[i]["y"] >= 24.7 && elements[i]["y"] < 30) {
                    array[a][4] = decodeURIComponent(array[a][4] + elements[i]["R"][0]["T"] + " ");
                }
            }
        }
    }

    let temp = [];

    for (let c = 0; c < 5; c++) { //5 days in a week
        let temp2 = [];
        for (let b = 0; b < array[c].length; b++) {
            //Filter the price
            let pos = array[c][b].indexOf("€");
            if (pos > -1) {
                //remove whitespaces between price digits
                let price = array[c][b].substring(pos, array[c][b].length).replace(/\d.*\d/gi, function myFunction(x) {
                    return x.replace(/ /gi, "");
                });
                temp2[b] = {"mealtype": mealtypes[b], "meal": array[c][b].substring(0, pos), "price": price};
            }
            else {
                temp2[b] = {"mealtype": mealtypes[b], "meal": array[c][b], "price": ""};
            }
        }
        temp.push(temp2);
    }

    const output = {
        "Montag": temp[0],
        "Dienstag": temp[1],
        "Mittwoch": temp[2],
        "Donnerstag": temp[3],
        "Freitag": temp[4]
    };

    string = string.replace(/\d \d/gi, function myFunction(x) {
        return x.replace(/ /gi, "");
    });
    string = string.replace(/\d \./gi, function myFunction(x) {
        return x.replace(/ /gi, "");
    });
    string = string.replace(/\/W\d/gi, "");
    string = string.replace(/  /gi, " ");

    fs.writeFileSync(properties.food + planname + ".json", JSON.stringify({
        "week": parseInt(planname.replace("DHBWKW", "").replace(/W\d*/gi, ""), 10) + "",
        "content": {"name": string, "data": output}
    }, null, " "));
    Log.i(properties.food + planname + ".json created -> finalize");
    finish();
}

function finish() {
    parsecount++;
    let addNew = false;
    if (parsecount == urls.length) {
        Log.i("All plans parsed, look if they are new and write them if so");
        let existingarray = [];
        try {
            existingarray = JSON.parse(fs.readFileSync(properties.html + "out.json", "utf-8"));
        } catch (error) {
            fs.writeFileSync(properties.html + "out.json", "[]", "utf-8");
        }

        switch (existingarray.length) {
            case 0:
                existingarray.push({week: "-1"});
            //deliberate FallThrough
            case 1:
                existingarray.push({week: "-1"});
        }
        existingarray = _.sortBy(existingarray, 'week');
        //now the existingarray has a length of 2 and is sorted

        urls.forEach((element) => {
                let newdata = JSON.parse(fs.readFileSync(properties.food + element + ".json", "utf-8"));
                if (parseInt(newdata.week, 10) > existingarray[1].week) {
                    addNew = true;
                    existingarray.shift();
                    existingarray.push(newdata);
                }
            }
        );

        if (addNew) {
            fs.writeFileSync(properties.html + "out.json", JSON.stringify(existingarray));
            Log.i("wrote out.json");
        } else {
            Log.i("nothing new -> out.json not written")
        }

        fs.writeFileSync(properties.html + "weeks.json", '[' + _.pluck(existingarray, 'week').map((data) => parseInt(data, 10)) + ']');
    }
}